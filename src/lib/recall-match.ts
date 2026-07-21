import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, RecallSource } from "@/lib/supabase/types";

export interface RecallMatch {
  id: string;
  source: RecallSource;
  description: string | null;
  remedy: string | null;
  action_url: string | null;
}

// Mirrors the case-insensitive matching already used by the daily recall
// cron (insertRecallAndAlert in cron/fetch-recalls/route.ts): government
// recall feeds often stem model numbers in different casing than a user
// typed them (e.g. "CIVIC" vs "Civic"), and Postgres .contains() on an
// array column is exact-match, so the model half of the match is filtered
// in JS instead of relying on SQL for it.
export async function findRecallMatch(
  supabase: SupabaseClient<Database>,
  brand: string,
  modelNumber: string,
): Promise<RecallMatch | null> {
  const { data: matches } = await supabase
    .from("recalls")
    .select("id, source, description, remedy, action_url, model_numbers")
    .ilike("brand", brand);

  const modelLower = modelNumber.toLowerCase();
  const match = (matches ?? []).find((r) =>
    r.model_numbers.some((m) => m.toLowerCase() === modelLower),
  );

  if (!match) return null;

  return {
    id: match.id,
    source: match.source,
    description: match.description,
    remedy: match.remedy,
    action_url: match.action_url,
  };
}
