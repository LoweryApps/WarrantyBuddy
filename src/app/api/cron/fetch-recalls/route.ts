import { NextResponse } from "next/server";
import { buildRecallAlertEmail, sendEmail } from "@/lib/email";
import { aggregateNhtsaComplaints, fetchNhtsaComplaints, upsertProductIntelligence } from "@/lib/product-intelligence";
import {
  fetchCpscRecalls,
  fetchFdaRecalls,
  fetchNhtsaRecalls,
  fetchUsdaRecalls,
  normalizeCpscRecall,
  normalizeFdaRecall,
  normalizeNhtsaRecall,
  normalizeUsdaRecall,
  FDA_CENTERS,
  type CpscApiRecall,
  type FdaEnforcementCenter,
  type NormalizedRecall,
} from "@/lib/recall-sources";
import {
  checkFreshnessAndAlert,
  recordFetchAttempt,
  recordFetchFailure,
  recordFetchSuccess,
} from "@/lib/recall-watchdog";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
// Vercel Hobby hard-caps every invocation at 300s with no override (confirmed
// live — a first-time 30-day FDA backfill ran ~146 AI-extraction calls before
// being killed mid-loop at the ~300s mark, silently: no exception, no
// recordFetchFailure, just a dead invocation). Explicit here so raising it is
// a one-line change if this project ever moves to Pro (up to 800s, or 1800s
// on the extended-duration beta).
export const maxDuration = 300;

type AdminClient = ReturnType<typeof createAdminClient>;

// Shared across CPSC/FDA/USDA below — each of their normalize functions makes
// one sequential Claude call to extract brand/model from free text. A large
// backlog (a first backfill, or catching up after several missed days) could
// otherwise run long enough to hit the platform's duration limit above,
// killing the invocation mid-run with no error recorded. Capping the total
// AI-call count per invocation keeps runs comfortably inside that limit;
// anything left over is simply not yet in `recalls`, so the next day's run
// picks it up the same way a delayed run already does today (dedup on
// (source, external_recall_id) makes deferring free, nothing is lost).
const MAX_AI_CALLS_PER_RUN = 60;

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Order-insensitive array equality for the model-number amendment check.
function sameModels(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

// Matches a stored recall against registered products and fires per-user
// alerts + emails.
async function matchAndAlert(
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
async function insertNewRecall(
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
async function applyAmendment(supabase: AdminClient, recallId: string, recall: NormalizedRecall): Promise<void> {
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

// Raw comparable fields for a CPSC recall, computed WITHOUT the AI brand/model
// extraction so an unchanged recall never triggers a Claude call. These mirror
// the formulas normalizeCpscRecall() stores, so the comparison is apples to
// apples against the persisted row.
function cpscRawComparable(r: CpscApiRecall): { description: string | null; remedy: string | null } {
  return {
    description: r.Description ?? r.Title ?? null,
    remedy: (r.Remedies ?? []).map((x) => x.Name).filter(Boolean).join(" ") || null,
  };
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
  let cpscAmended = 0;
  let nhtsaQueried = 0;
  let nhtsaNew = 0;
  let nhtsaAmended = 0;
  let fdaFetched = 0;
  let fdaNew = 0;
  let fdaAmended = 0;
  let usdaFetched = 0;
  let usdaNew = 0;
  let usdaAmended = 0;
  let pidPatternsUpdated = 0;
  let aiCallsRemaining = MAX_AI_CALLS_PER_RUN;
  let cpscBudgetExhausted = false;
  let fdaBudgetExhausted = false;
  let usdaBudgetExhausted = false;

  // ── CPSC ────────────────────────────────────────────────────────────────
  await recordFetchAttempt(supabase, "CPSC");
  try {
    // A week's lookback (not just "since yesterday") so a missed or delayed
    // run doesn't silently drop a day's recalls — dedup on
    // (source, external_recall_id) makes the overlap free.
    const raw = await fetchCpscRecalls(daysAgoIso(7));
    cpscFetched = raw.length;

    for (const r of raw) {
      if (aiCallsRemaining <= 0) {
        cpscBudgetExhausted = true;
        break;
      }

      const externalId = String(r.RecallID);
      const { data: existing } = await supabase
        .from("recalls")
        .select("id, description, remedy")
        .eq("source", "CPSC")
        .eq("external_recall_id", externalId)
        .maybeSingle();

      if (!existing) {
        const normalized = await normalizeCpscRecall(r);
        aiCallsRemaining -= 1;
        if (await insertNewRecall(supabase, normalized, appUrl)) cpscNew += 1;
        continue;
      }

      // Compare raw agency text first — no AI call unless it actually
      // changed, so re-fetching an unchanged recall on the next run is free.
      const rawCmp = cpscRawComparable(r);
      const changed =
        (rawCmp.description ?? "") !== (existing.description ?? "") ||
        (rawCmp.remedy ?? "") !== (existing.remedy ?? "");
      if (!changed) continue;

      const normalized = await normalizeCpscRecall(r);
      aiCallsRemaining -= 1;
      await applyAmendment(supabase, existing.id, normalized);
      cpscAmended += 1;
    }
    await recordFetchSuccess(supabase, "CPSC");
  } catch (err) {
    // A source outage shouldn't block the other sources below, and the
    // failure is recorded (not swallowed) so the freshness watchdog can
    // surface it.
    await recordFetchFailure(supabase, "CPSC", err);
  }

  // ── NHTSA ─────────────────────────────────────────────────────────────────
  await recordFetchAttempt(supabase, "NHTSA");
  try {
    // NHTSA has no bulk feed — queried per make/model/year, so we look up each
    // distinct registered vehicle combination rather than a global feed.
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
          const normalized = normalizeNhtsaRecall(r, v.model_number);
          const { data: existing } = await supabase
            .from("recalls")
            .select("id, description, remedy, model_numbers")
            .eq("source", "NHTSA")
            .eq("external_recall_id", normalized.external_recall_id)
            .maybeSingle();

          if (!existing) {
            if (await insertNewRecall(supabase, normalized, appUrl)) nhtsaNew += 1;
            continue;
          }

          const changed =
            (normalized.description ?? "") !== (existing.description ?? "") ||
            (normalized.remedy ?? "") !== (existing.remedy ?? "") ||
            !sameModels(normalized.model_numbers, existing.model_numbers);
          if (!changed) continue;

          await applyAmendment(supabase, existing.id, normalized);
          nhtsaAmended += 1;
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
        // block recall matching, the safety-critical half of this job.
      }
    }
    await recordFetchSuccess(supabase, "NHTSA");
  } catch (err) {
    await recordFetchFailure(supabase, "NHTSA", err);
  }

  // ── FDA ───────────────────────────────────────────────────────────────────
  // Covers three openFDA endpoints (food/drug/device) under one "FDA" bucket.
  // A single center's outage shouldn't block the other two, but if all three
  // fail the whole fetch is recorded as failed so the watchdog can see it.
  //
  // 30-day lookback (not 7, like CPSC/NHTSA): openFDA's own dataset lags its
  // "current" date by 1-2+ weeks in practice (confirmed live — its metadata
  // reported last_updated 12 days behind "today" during testing), so a
  // report_date from this week may not actually be queryable for a while.
  // A 7-day window would permanently miss anything that arrives late; dedup
  // on (source, external_recall_id) makes the wider overlap free.
  await recordFetchAttempt(supabase, "FDA");
  try {
    const centerErrors: FdaEnforcementCenter[] = [];
    for (const center of FDA_CENTERS) {
      try {
        const raw = await fetchFdaRecalls(center, daysAgoIso(30));
        fdaFetched += raw.length;

        for (const r of raw) {
          if (aiCallsRemaining <= 0) {
            fdaBudgetExhausted = true;
            break;
          }

          const externalId = `${center}-${r.recall_number}`;
          const { data: existing } = await supabase
            .from("recalls")
            .select("id, description")
            .eq("source", "FDA")
            .eq("external_recall_id", externalId)
            .maybeSingle();

          if (!existing) {
            const normalized = await normalizeFdaRecall(r, center);
            aiCallsRemaining -= 1;
            if (await insertNewRecall(supabase, normalized, appUrl)) fdaNew += 1;
            continue;
          }

          // openFDA enforcement text is effectively immutable once published
          // (unlike CPSC), so compare on description alone before paying for
          // an AI extraction call on an amendment.
          const rawDescription = [r.product_description, r.reason_for_recall].filter(Boolean).join(" — ");
          if (rawDescription === (existing.description ?? "")) continue;

          const normalized = await normalizeFdaRecall(r, center);
          aiCallsRemaining -= 1;
          await applyAmendment(supabase, existing.id, normalized);
          fdaAmended += 1;
        }
      } catch {
        centerErrors.push(center);
      }
    }
    if (centerErrors.length === FDA_CENTERS.length) {
      throw new Error(`All FDA enforcement endpoints failed: ${centerErrors.join(", ")}`);
    }
    await recordFetchSuccess(supabase, "FDA");
  } catch (err) {
    await recordFetchFailure(supabase, "FDA", err);
  }

  // ── USDA (FSIS) ───────────────────────────────────────────────────────────
  await recordFetchAttempt(supabase, "USDA");
  try {
    const raw = await fetchUsdaRecalls();
    usdaFetched = raw.length;

    for (const item of raw) {
      if (aiCallsRemaining <= 0) {
        usdaBudgetExhausted = true;
        break;
      }

      const externalId = item.guid || item.link;
      if (!externalId) continue;

      const { data: existing } = await supabase
        .from("recalls")
        .select("id, description")
        .eq("source", "USDA")
        .eq("external_recall_id", externalId)
        .maybeSingle();

      if (!existing) {
        const normalized = await normalizeUsdaRecall(item);
        aiCallsRemaining -= 1;
        if (await insertNewRecall(supabase, normalized, appUrl)) usdaNew += 1;
        continue;
      }

      const rawDescription = item.description || item.title || "";
      if (rawDescription === (existing.description ?? "")) continue;

      const normalized = await normalizeUsdaRecall(item);
      aiCallsRemaining -= 1;
      await applyAmendment(supabase, existing.id, normalized);
      usdaAmended += 1;
    }
    await recordFetchSuccess(supabase, "USDA");
  } catch (err) {
    await recordFetchFailure(supabase, "USDA", err);
  }

  // ── Freshness watchdog ────────────────────────────────────────────────────
  // Runs after all sources so a source that's been failing for >36h alerts
  // the owner even while the others keep succeeding.
  const staleSources = await checkFreshnessAndAlert(supabase);

  return NextResponse.json({
    cpscFetched,
    cpscNew,
    cpscAmended,
    nhtsaQueried,
    nhtsaNew,
    nhtsaAmended,
    fdaFetched,
    fdaNew,
    fdaAmended,
    usdaFetched,
    usdaNew,
    usdaAmended,
    pidPatternsUpdated,
    staleSources,
    aiCallsRemaining,
    cpscBudgetExhausted,
    fdaBudgetExhausted,
    usdaBudgetExhausted,
  });
}
