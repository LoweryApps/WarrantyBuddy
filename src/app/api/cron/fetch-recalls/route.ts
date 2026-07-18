import { NextResponse } from "next/server";
import { buildRecallAlertEmail, sendEmail } from "@/lib/email";
import { aggregateNhtsaComplaints, fetchNhtsaComplaints, upsertProductIntelligence } from "@/lib/product-intelligence";
import {
  fetchCpscRecalls,
  fetchNhtsaRecalls,
  normalizeCpscRecall,
  normalizeNhtsaRecall,
  type NormalizedRecall,
} from "@/lib/recall-sources";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function insertRecallAndAlert(
  supabase: ReturnType<typeof createAdminClient>,
  recall: NormalizedRecall,
  appUrl: string,
) {
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

  // Duplicate (source, external_recall_id) or missing brand/model — nothing
  // to match against, either way.
  if (error || !inserted || !recall.brand || recall.model_numbers.length === 0) return;

  // PostgREST's .in() is exact-match, and government sources often stem
  // model numbers in different casing than a user typed them (e.g. NHTSA's
  // "CIVIC" vs. a product's "Civic") — filter case-insensitively in JS
  // instead of relying on SQL for the model_number half of the match.
  const { data: brandMatches } = await supabase
    .from("products")
    .select("id, user_id, name, brand, model_number")
    .ilike("brand", recall.brand);

  const normalizedRecallModels = recall.model_numbers.map((m) => m.toLowerCase());
  const matches = (brandMatches ?? []).filter(
    (p) => p.model_number && normalizedRecallModels.includes(p.model_number.toLowerCase()),
  );

  for (const product of matches) {
    const { data: alreadyAlerted } = await supabase
      .from("user_recall_alerts")
      .select("id")
      .eq("user_id", product.user_id)
      .eq("product_id", product.id)
      .eq("recall_id", inserted.id)
      .maybeSingle();
    if (alreadyAlerted) continue;

    await supabase.from("user_recall_alerts").insert({
      user_id: product.user_id,
      product_id: product.id,
      recall_id: inserted.id,
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

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let cpscFetched = 0;
  let cpscNew = 0;
  let nhtsaQueried = 0;
  let nhtsaNew = 0;
  let pidPatternsUpdated = 0;

  try {
    // A week's lookback (not just "since yesterday") so a missed or delayed
    // cron run doesn't silently drop a day's recalls — dedup on
    // (source, external_recall_id) makes the overlap free.
    const raw = await fetchCpscRecalls(daysAgoIso(7));
    cpscFetched = raw.length;

    for (const r of raw) {
      const { data: existing } = await supabase
        .from("recalls")
        .select("id")
        .eq("source", "CPSC")
        .eq("external_recall_id", String(r.RecallID))
        .maybeSingle();
      if (existing) continue;

      const normalized = await normalizeCpscRecall(r);
      await insertRecallAndAlert(supabase, normalized, appUrl);
      cpscNew += 1;
    }
  } catch {
    // A source outage shouldn't block the other source's fetch below.
  }

  try {
    // NHTSA has no bulk "recent recalls" feed — it's queried per
    // make/model/year, so we look up each distinct vehicle combination
    // already registered rather than a global feed.
    const { data: vehicles } = await supabase
      .from("products")
      .select("brand, model_number, purchase_date")
      .eq("category", "Vehicle")
      .not("brand", "is", null)
      .not("model_number", "is", null)
      .not("purchase_date", "is", null);

    const seen = new Set<string>();
    for (const v of vehicles ?? []) {
      if (!v.brand || !v.model_number || !v.purchase_date) continue;
      const year = v.purchase_date.slice(0, 4);
      const key = `${v.brand.toLowerCase()}|${v.model_number.toLowerCase()}|${year}`;
      if (seen.has(key)) continue;
      seen.add(key);
      nhtsaQueried += 1;

      try {
        const raw = await fetchNhtsaRecalls(v.brand, v.model_number, year);
        for (const r of raw) {
          const { data: existing } = await supabase
            .from("recalls")
            .select("id")
            .eq("source", "NHTSA")
            .eq("external_recall_id", r.NHTSACampaignNumber)
            .maybeSingle();
          if (existing) continue;

          const normalized = normalizeNhtsaRecall(r, v.model_number);
          await insertRecallAndAlert(supabase, normalized, appUrl);
          nhtsaNew += 1;
        }
      } catch {
        // One vehicle's lookup failing shouldn't block the others.
      }

      try {
        const complaints = await fetchNhtsaComplaints(v.brand, v.model_number, year);
        const patterns = aggregateNhtsaComplaints(complaints, v.brand, v.model_number);
        for (const pattern of patterns) {
          await upsertProductIntelligence(supabase, { ...pattern, category: "Vehicle" });
          pidPatternsUpdated += 1;
        }
      } catch {
        // Product Intelligence is a bonus signal — a failure here shouldn't
        // block recall matching, which is the safety-critical half of this job.
      }
    }
  } catch {
    // best-effort
  }

  return NextResponse.json({ cpscFetched, cpscNew, nhtsaQueried, nhtsaNew, pidPatternsUpdated });
}
