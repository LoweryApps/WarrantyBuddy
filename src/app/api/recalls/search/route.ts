import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Beta-scope recall search: keyword lookup over the raw recalls table by
// brand or model number, PLUS a resolve step against the user's own
// registered products so a VIN or serial number search actually means
// something — recalls themselves only ever carry brand + model number, never
// a VIN or serial, so those two search types only work by first finding the
// matching product in the user's own vault and searching recalls with ITS
// brand/model instead. No AI, no public/anon access — recalls is already
// readable by any authenticated user (see RLS policy), no service role
// needed here.
const RECALL_FIELDS = "id, source, brand, model_numbers, description, remedy, action_url, recall_date";
// Recent-batch cap for the client-side model-number scan below. Fine at
// today's scale (dozens of rows); revisit if the recalls table grows large
// enough that this stops being a cheap in-memory filter.
const RECENT_BATCH_LIMIT = 500;

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
