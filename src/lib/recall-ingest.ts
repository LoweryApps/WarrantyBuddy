import { buildRecallAlertEmail, sendEmail } from "@/lib/email";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { NormalizedRecall } from "@/lib/recall-sources";

// Shared recall-ingest primitives — used by the daily fetch cron AND the
// in-app recall search's on-demand NHTSA lookup, so a vehicle a user searches
// for gets cached into `recalls` and matched against their own vault exactly
// the same way a cron-fetched recall would be.

export type AdminClient = ReturnType<typeof createAdminClient>;

// Matches a stored recall against registered products and fires per-user
// alerts + emails.
export async function matchAndAlert(
  supabase: AdminClient,
  recall: NormalizedRecall,
  recallId: string,
  appUrl: string,
) {
  if (!recall.brand || recall.model_numbers.length === 0) return;

  // PostgREST's .in() is exact-match, and government sources often stem model
  // numbers in different casing than a user typed them (e.g. NHTSA's "CIVIC"
  // vs. a product's "Civic") — filter case-insensitively in JS instead.
  const { data: brandMatches } = await supabase
    .from("products")
    .select("id, user_id, name, brand, model_number, category")
    .ilike("brand", recall.brand);

  const normalizedRecallModels = recall.model_numbers.map((m) => m.toLowerCase());
  const matches = (brandMatches ?? []).filter((p) => {
    if (p.model_number && normalizedRecallModels.includes(p.model_number.toLowerCase())) return true;
    // NHTSA's model_numbers are the vehicle's model NAME (e.g. "F-150"), not a
    // model_number field — vehicles are commonly registered with model_number
    // left blank, so also match on the product's name for vehicle recalls.
    // Scoped to NHTSA + category=Vehicle so a CPSC/FDA/USDA extracted model
    // string can't coincidentally match an unrelated product's display name.
    if (recall.source === "NHTSA" && p.category === "Vehicle" && p.name) {
      return normalizedRecallModels.includes(p.name.toLowerCase());
    }
    return false;
  });

  for (const product of matches) {
    const { data: alreadyAlerted } = await supabase
      .from("user_recall_alerts")
      .select("id")
      .eq("user_id", product.user_id)
      .eq("product_id", product.id)
      .eq("recall_id", recallId)
      .maybeSingle();
    if (alreadyAlerted) continue;

    await supabase.from("user_recall_alerts").insert({
      user_id: product.user_id,
      product_id: product.id,
      recall_id: recallId,
    });

    const { data: profile } = await supabase
      .from("users")
      .select("email, full_name, notification_email")
      .eq("id", product.user_id)
      .single();

    if (!profile || !profile.notification_email) continue;

    try {
      const { subject, html } = buildRecallAlertEmail({
        recipientName: profile.full_name,
        productName: product.name,
        brand: product.brand,
        modelNumber: product.model_number,
        recallSource: recall.source,
        recallDescription: recall.description,
        recallRemedy: recall.remedy,
        appUrl,
      });
      await sendEmail({ to: profile.email, subject, html });
    } catch {
      // Email delivery is best-effort — the alert itself is already saved.
    }
  }
}

// Inserts a brand-new recall (raw agency fields only — no slug, no AI
// summary, no public-page revalidation; those belong to the tabled public
// recall pages module, not the in-app beta monitor), then runs alert
// matching.
export async function insertNewRecall(
  supabase: AdminClient,
  recall: NormalizedRecall,
  appUrl: string,
): Promise<boolean> {
  const { data: inserted, error } = await supabase
    .from("recalls")
    .insert({
      source: recall.source,
      external_recall_id: recall.external_recall_id,
      recall_date: recall.recall_date,
      brand: recall.brand,
      model_numbers: recall.model_numbers,
      description: recall.description,
      remedy: recall.remedy,
      action_url: recall.action_url,
    })
    .select("id")
    .single();

  // A concurrent run may have inserted the same (source, external_recall_id)
  // between our existence check and this insert — the unique constraint makes
  // that a no-op rather than a duplicate row.
  if (error || !inserted) return false;

  await matchAndAlert(supabase, recall, inserted.id, appUrl);
  return true;
}

// Applies a material amendment: overwrites the raw fields only. No AI content
// to clear/regenerate and no page to revalidate in the beta-scope monitor.
export async function applyAmendment(supabase: AdminClient, recallId: string, recall: NormalizedRecall): Promise<void> {
  await supabase
    .from("recalls")
    .update({
      recall_date: recall.recall_date,
      brand: recall.brand,
      model_numbers: recall.model_numbers,
      description: recall.description,
      remedy: recall.remedy,
      action_url: recall.action_url,
    })
    .eq("id", recallId);
}
