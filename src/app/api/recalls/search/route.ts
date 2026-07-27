import { NextResponse } from "next/server";
import { insertNewRecall } from "@/lib/recall-ingest";
import { rateLimit } from "@/lib/rate-limit";
import { fetchNhtsaRecalls, normalizeNhtsaRecall } from "@/lib/recall-sources";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Beta-scope recall search: keyword lookup over the raw recalls table by
// brand or model number, PLUS a resolve step against the user's own
// registered products so a VIN or serial number search actually means
// something — recalls themselves only ever carry brand + model number, never
// a VIN or serial, so those two search types only work by first finding the
// matching product in the user's own vault and searching recalls with ITS
// brand/model instead. No AI, no public/anon access — recalls is already
// readable by any authenticated user (see RLS policy), no service role
// needed for the read paths (only the live NHTSA cache-write below).
const RECALL_FIELDS = "id, source, brand, model_numbers, description, remedy, action_url, recall_date";
// Recent-batch cap for the client-side model-number scan below. Fine at
// today's scale (dozens of rows); revisit if the recalls table grows large
// enough that this stops being a cheap in-memory filter.
const RECENT_BATCH_LIMIT = 500;

// NHTSA has no bulk feed and no "search by make/model across all years"
// endpoint — a query is always make+model+one specific year. A search for a
// vehicle nobody has registered (e.g. "Ford Bronco") therefore has nothing
// cached in `recalls` yet (the daily cron only ever queries vehicles someone
// owns). So: when a search looks vehicle-shaped (2+ words — a naive
// make/model split), fetch NHTSA live across a span of recent model years
// and cache anything found into `recalls` before running the normal DB
// search below — the same insertNewRecall() the daily cron uses, so it also
// runs alert-matching in case it happens to match a registered vehicle the
// cron hasn't caught up to yet.
const VEHICLE_LOOKUP_YEAR_SPAN = 15; // current year and this many years back
// Guards NHTSA call volume (up to 16 parallel calls per trigger) rather than
// cost — NHTSA's API is free, this is an abuse/volume guard only.
const VEHICLE_LOOKUP_LIMIT_PER_HOUR = 20;

interface RecallRow {
  id: string;
  source: string;
  brand: string | null;
  model_numbers: string[];
  description: string | null;
  remedy: string | null;
  action_url: string | null;
  recall_date: string | null;
}

function escapeForOrFilter(value: string): string {
  // PostgREST's .or() filter syntax splits on "," and treats "%"/"*" as
  // pattern wildcards inside ilike — strip characters that would let user
  // input escape the intended single-field ilike clause.
  return value.replace(/[,()%*]/g, "");
}

// Best-effort: fetches NHTSA recalls for (make, model) across a span of
// recent model years and caches any new ones. Failures are swallowed —
// this is a bonus, on-demand widening of coverage, not the primary search
// path, so a live NHTSA outage should never break the search itself.
async function liveNhtsaLookup(make: string, model: string, appUrl: string): Promise<void> {
  const admin = createAdminClient();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: VEHICLE_LOOKUP_YEAR_SPAN + 1 }, (_, i) => String(currentYear - i));

  const perYear = await Promise.all(
    years.map((year) => fetchNhtsaRecalls(make, model, year).catch(() => [])),
  );

  for (const raw of perYear) {
    for (const r of raw) {
      const normalized = normalizeNhtsaRecall(r, model);
      try {
        const { data: existing } = await admin
          .from("recalls")
          .select("id")
          .eq("source", "NHTSA")
          .eq("external_recall_id", normalized.external_recall_id)
          .maybeSingle();
        if (existing) continue;
        await insertNewRecall(admin, normalized, appUrl);
      } catch {
        // One campaign failing to cache shouldn't block the others.
      }
    }
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { query } = await request.json();
  const q = typeof query === "string" ? query.trim() : "";
  if (!q) {
    return NextResponse.json({ results: [] });
  }
  const safeQ = escapeForOrFilter(q);

  // Vehicle-shaped query ("Ford Bronco", "Ford F-150") — naive first-word-is-
  // make split. Wrong guesses (e.g. a two-word appliance brand) just return
  // nothing from NHTSA and cost nothing beyond the API round trip.
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const { allowed } = await rateLimit({
      key: `recall-vehicle-lookup:user:${user.id}`,
      limit: VEHICLE_LOOKUP_LIMIT_PER_HOUR,
      windowSeconds: 3600,
    });
    // Rate-limited: skip the live lookup silently and fall back to whatever's
    // already cached — never fail the whole search over this bonus step.
    if (allowed) {
      const make = words[0];
      const model = words.slice(1).join(" ");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      await liveNhtsaLookup(make, model, appUrl);
    }
  }

  // Resolve against the user's own products: a VIN or serial number typed in
  // only becomes useful once it's traced back to that product's brand/model.
  const { data: ownProducts } = await supabase
    .from("products")
    .select("brand, model_number")
    .or(
      [
        `vin.ilike.%${safeQ}%`,
        `serial_number.ilike.%${safeQ}%`,
        `model_number.ilike.%${safeQ}%`,
        `brand.ilike.%${safeQ}%`,
      ].join(","),
    );

  const terms = new Set<string>([q.toLowerCase()]);
  // A "make model" query (e.g. "Ford Bronco") never matches as one atomic
  // string — recalls store brand ("FORD") and model_numbers (["Bronco"]) as
  // separate fields — so also search the individual make/model split, the
  // same one used above to drive the live NHTSA lookup.
  if (words.length >= 2) {
    terms.add(words[0].toLowerCase());
    terms.add(words.slice(1).join(" ").toLowerCase());
  }
  for (const p of ownProducts ?? []) {
    if (p.brand) terms.add(p.brand.toLowerCase());
    if (p.model_number) terms.add(p.model_number.toLowerCase());
  }
  const termList = [...terms];

  // Brand-match path: catches the raw query and any resolved product brand.
  const brandOrFilter = termList.map((t) => `brand.ilike.%${escapeForOrFilter(t)}%`).join(",");
  const { data: brandMatches } = await supabase
    .from("recalls")
    .select(RECALL_FIELDS)
    .or(brandOrFilter)
    .order("recall_date", { ascending: false })
    .limit(100)
    .returns<RecallRow[]>();

  // Model-number path: PostgREST can't ilike-match inside a text[] column, so
  // scan a recent batch in JS for any array element containing a search term
  // — the same technique the fetch job's own product-matching logic uses.
  const { data: recent } = await supabase
    .from("recalls")
    .select(RECALL_FIELDS)
    .order("recall_date", { ascending: false })
    .limit(RECENT_BATCH_LIMIT)
    .returns<RecallRow[]>();

  const modelMatches = (recent ?? []).filter((r) =>
    r.model_numbers.some((m) => termList.some((t) => m.toLowerCase().includes(t))),
  );

  const byId = new Map<string, RecallRow>();
  for (const r of [...(brandMatches ?? []), ...modelMatches]) byId.set(r.id, r);

  const results = [...byId.values()].sort((a, b) => (b.recall_date ?? "").localeCompare(a.recall_date ?? ""));

  return NextResponse.json({ results });
}
