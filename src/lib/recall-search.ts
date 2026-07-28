import type { SupabaseClient } from "@supabase/supabase-js";
import { insertNewRecall } from "@/lib/recall-ingest";
import { fetchNhtsaRecalls, normalizeNhtsaRecall } from "@/lib/recall-sources";
import { createAdminClient } from "@/lib/supabase/admin";

// Shared recall-search primitives — used by both the in-app authenticated
// search (which additionally resolves a VIN/serial against the user's own
// products) and the public, no-login recall checker on the marketing site
// (brand/model only, no user context to resolve against).

export const RECALL_FIELDS = "id, source, brand, model_numbers, description, remedy, action_url, recall_date";
// Recent-batch cap for the client-side model-number scan below. Fine at
// today's scale (dozens of rows); revisit if the recalls table grows large
// enough that this stops being a cheap in-memory filter.
const RECENT_BATCH_LIMIT = 500;

// NHTSA has no bulk feed and no "search by make/model across all years"
// endpoint — a query is always make+model+one specific year. A search for a
// vehicle nobody has registered (e.g. "Ford Bronco") therefore has nothing
// cached in `recalls` yet (the daily cron only ever queries vehicles someone
// owns). So: when a search looks vehicle-shaped, fetch NHTSA live across a
// span of recent model years and cache anything found into `recalls` before
// running the normal DB search — the same insertNewRecall() the daily cron
// uses, so it also runs alert-matching in case it happens to match a
// registered vehicle the cron hasn't caught up to yet.
export const VEHICLE_LOOKUP_YEAR_SPAN = 15; // current year and this many years back

export interface RecallRow {
  id: string;
  source: string;
  brand: string | null;
  model_numbers: string[];
  description: string | null;
  remedy: string | null;
  action_url: string | null;
  recall_date: string | null;
}

export function escapeForOrFilter(value: string): string {
  // PostgREST's .or() filter syntax splits on "," and treats "%"/"*" as
  // pattern wildcards inside ilike — strip characters that would let user
  // input escape the intended single-field ilike clause.
  return value.replace(/[,()%*]/g, "");
}

// Best-effort: fetches NHTSA recalls for (make, model) across a span of
// recent model years and caches any new ones. Failures are swallowed —
// this is a bonus, on-demand widening of coverage, not the primary search
// path, so a live NHTSA outage should never break the search itself. Always
// uses the admin client to write, regardless of which client the caller
// searches with — inserting a globally-shared recall row isn't a per-user
// operation.
export async function liveNhtsaLookup(make: string, model: string, appUrl: string): Promise<void> {
  const admin = createAdminClient();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: VEHICLE_LOOKUP_YEAR_SPAN + 1 }, (_, i) => String(currentYear - i));

  const perYear = await Promise.all(years.map((year) => fetchNhtsaRecalls(make, model, year).catch(() => [])));

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

// Searches `recalls` by brand (a direct ILIKE OR-filter) and by model number
// (PostgREST can't ILIKE-match inside a text[] column, so a recent batch is
// scanned in JS for any array element containing a search term — the same
// technique the fetch job's own product-matching logic uses). `terms` should
// already be lowercased. Works with either an authenticated client (recalls
// is readable by any authenticated user) or the admin client (the public
// checker route — recalls has no anon-read RLS policy, and this is
// non-sensitive global reference data, so reading it via service role here
// is the deliberate, correct choice rather than widening RLS).
export async function searchRecallsByTerms(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  terms: string[],
): Promise<RecallRow[]> {
  if (terms.length === 0) return [];

  const brandOrFilter = terms.map((t) => `brand.ilike.%${escapeForOrFilter(t)}%`).join(",");
  const { data: brandMatches } = await supabase
    .from("recalls")
    .select(RECALL_FIELDS)
    .or(brandOrFilter)
    .order("recall_date", { ascending: false })
    .limit(100)
    .returns<RecallRow[]>();

  const { data: recent } = await supabase
    .from("recalls")
    .select(RECALL_FIELDS)
    .order("recall_date", { ascending: false })
    .limit(RECENT_BATCH_LIMIT)
    .returns<RecallRow[]>();

  const modelMatches = (recent ?? []).filter((r) => r.model_numbers.some((m) => terms.some((t) => m.toLowerCase().includes(t))));

  const byId = new Map<string, RecallRow>();
  for (const r of [...(brandMatches ?? []), ...modelMatches]) byId.set(r.id, r);

  return [...byId.values()].sort((a, b) => (b.recall_date ?? "").localeCompare(a.recall_date ?? ""));
}
