import { sendEmail } from "@/lib/email";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { RecallSource } from "@/lib/supabase/types";

// Freshness watchdog for the recall fetch job (Product Spec 2.7). The fetch
// job records a per-agency attempt/success/failure each run; if any agency
// then hasn't had a successful fetch inside the staleness window, the owner
// is alerted (email) — not just a silent log line. A silently failing source
// is a worse risk than any cadence difference: real recalls could go unfetched
// with nobody noticing.

type AdminClient = ReturnType<typeof createAdminClient>;

// One missed twice-daily cycle (12h) plus buffer.
const STALE_AFTER_MS = 36 * 60 * 60 * 1000;
// Don't re-alert about the same ongoing outage more than this often.
const ALERT_THROTTLE_MS = 12 * 60 * 60 * 1000;

export async function recordFetchAttempt(supabase: AdminClient, source: RecallSource): Promise<void> {
  await supabase
    .from("recall_fetch_status")
    .update({ last_attempt_at: new Date().toISOString() })
    .eq("source", source);
}

export async function recordFetchSuccess(supabase: AdminClient, source: RecallSource): Promise<void> {
  await supabase
    .from("recall_fetch_status")
    .update({
      last_success_at: new Date().toISOString(),
      last_error: null,
      last_error_at: null,
      // Clear the throttle so a fresh future outage alerts immediately.
      alerted_at: null,
    })
    .eq("source", source);
}

export async function recordFetchFailure(
  supabase: AdminClient,
  source: RecallSource,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await supabase
    .from("recall_fetch_status")
    .update({ last_error: message.slice(0, 500), last_error_at: new Date().toISOString() })
    .eq("source", source);
}

// Checks every tracked agency and alerts the owner about any that are stale
// (no successful fetch within STALE_AFTER_MS), throttled per source. Returns
// the list of stale sources so the caller can include it in the run summary.
export async function checkFreshnessAndAlert(supabase: AdminClient): Promise<RecallSource[]> {
  const { data: statuses } = await supabase
    .from("recall_fetch_status")
    .select("source, last_success_at, last_error, last_error_at, alerted_at");

  if (!statuses) return [];

  const now = Date.now();
  const stale: {
    source: RecallSource;
    lastSuccessAt: string | null;
    lastError: string | null;
    alertedAt: string | null;
  }[] = [];

  for (const s of statuses) {
    const lastSuccessMs = s.last_success_at ? new Date(s.last_success_at).getTime() : 0;
    if (now - lastSuccessMs > STALE_AFTER_MS) {
      stale.push({
        source: s.source,
        lastSuccessAt: s.last_success_at,
        lastError: s.last_error,
        alertedAt: s.alerted_at,
      });
    }
  }

  if (stale.length === 0) return [];

  // Only alert about sources not alerted within the throttle window, but
  // always return the full stale set for the run summary.
  const toAlert = stale.filter(
    (s) => !s.alertedAt || now - new Date(s.alertedAt).getTime() > ALERT_THROTTLE_MS,
  );

  const alertEmail = process.env.RECALL_WATCHDOG_EMAIL;
  if (toAlert.length > 0 && alertEmail) {
    const lines = toAlert
      .map((s) => {
        const last = s.lastSuccessAt
          ? new Date(s.lastSuccessAt).toISOString()
          : "never";
        const err = s.lastError ? ` — last error: ${s.lastError}` : "";
        return `• ${s.source}: last successful fetch ${last}${err}`;
      })
      .join("\n");

    try {
      await sendEmail({
        to: alertEmail,
        subject: `⚠ WarrantyBuddy recall fetch stale: ${toAlert.map((s) => s.source).join(", ")}`,
        html: `<p>The recall fetch job has not successfully fetched the following source(s) within 36 hours:</p><pre style="font-family:monospace;font-size:13px;white-space:pre-wrap">${lines}</pre><p>Real recalls may be published while these sources go unfetched. Check the source APIs and the <code>/api/cron/fetch-recalls</code> logs.</p>`,
      });

      const nowIso = new Date().toISOString();
      await supabase
        .from("recall_fetch_status")
        .update({ alerted_at: nowIso })
        .in(
          "source",
          toAlert.map((s) => s.source),
        );
    } catch {
      // Alert delivery is best-effort; the stale state is still recorded and
      // returned in the run summary regardless.
    }
  }

  return stale.map((s) => s.source);
}
