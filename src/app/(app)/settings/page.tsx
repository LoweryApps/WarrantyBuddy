import { redirect } from "next/navigation";
import { SettingsView } from "@/components/settings/settings-view";
import { isPremium } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ data: profile }, { count: receiptsThisMonth }] = await Promise.all([
    supabase
      .from("users")
      .select(
        "full_name, phone, claim_email, notification_email, forwarding_address, subscription_status, plan, current_period_end, stripe_customer_id",
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("forwarded_receipts")
      .select("id", { count: "exact", head: true })
      .gte("received_at", startOfMonth.toISOString()),
  ]);

  if (!profile) {
    redirect("/login");
  }

  return (
    <SettingsView
      email={user.email ?? ""}
      profile={profile}
      receiptsThisMonth={receiptsThisMonth ?? 0}
      premium={isPremium(profile)}
    />
  );
}
