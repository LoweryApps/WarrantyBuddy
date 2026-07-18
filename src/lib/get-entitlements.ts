import { isPremium } from "@/lib/entitlements";
import type { createClient } from "@/lib/supabase/server";

export async function loadPremiumStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("users")
    .select("subscription_status")
    .eq("id", userId)
    .single();

  return isPremium(profile);
}
