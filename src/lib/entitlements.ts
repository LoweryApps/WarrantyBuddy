import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SubscriptionStatus } from "@/lib/supabase/types";

export const FREE_PRODUCT_LIMIT = 5;
export const FREE_RECEIPT_MONTHLY_LIMIT = 3;

const PREMIUM_STATUSES: SubscriptionStatus[] = ["active", "trialing"];

export interface SubscriptionFields {
  subscription_status: SubscriptionStatus | null;
}

export function isPremium(user: SubscriptionFields | null | undefined): boolean {
  return !!user?.subscription_status && PREMIUM_STATUSES.includes(user.subscription_status);
}

// Exported so every "since the start of this month" query in the app shares
// one UTC definition of "this month" — a local-time Date().setDate(1) here
// and a Date.UTC() there would quietly disagree near month boundaries on
// any non-UTC runtime.
export function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString();
}

// Quota-consuming count for the free-tier cap — only receipts the user has
// actually confirmed count against their 3/month allotment. Counting
// pending/unconfirmed receipts here would block a user from confirming any
// of a 3-item batch the moment it arrives, before they've used their quota.
// Warranty-kind drafts (kind 'warranty' or 'both') are excluded — those are
// gated by isPremium() directly, the same as the Warranty tab's AI-extract
// upload, not by this monthly counter.
export async function getMonthlyConfirmedReceiptCount(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { count } = await supabase
    .from("forwarded_receipts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "Confirmed")
    .eq("kind", "receipt")
    .gte("received_at", monthStartIso());

  return count ?? 0;
}
