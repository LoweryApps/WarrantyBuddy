import { AccountSection } from "@/components/settings/account-section";
import { ClaimProfileSection } from "@/components/settings/claim-profile-section";
import { DataExportSection } from "@/components/settings/data-export-section";
import { ForwardingSection } from "@/components/settings/forwarding-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { PlanSection } from "@/components/settings/plan-section";
import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/supabase/types";

interface Profile {
  full_name: string | null;
  phone: string | null;
  claim_email: string | null;
  notification_email: boolean;
  forwarding_address: string;
  plan: SubscriptionPlan | null;
  subscription_status: SubscriptionStatus | null;
  current_period_end: string | null;
}

export function SettingsView({
  email,
  profile,
  receiptsThisMonth,
  premium,
}: {
  email: string;
  profile: Profile;
  receiptsThisMonth: number;
  premium: boolean;
}) {
  return (
    <div className="mx-auto max-w-xl p-4 pb-16">
      <AccountSection fullName={profile.full_name} email={email} />
      <PlanSection
        premium={premium}
        plan={profile.plan}
        subscriptionStatus={profile.subscription_status}
        currentPeriodEnd={profile.current_period_end}
      />
      <ClaimProfileSection
        fullName={profile.full_name}
        phone={profile.phone}
        claimEmail={profile.claim_email}
      />
      <ForwardingSection
        forwardingAddress={profile.forwarding_address}
        receiptsThisMonth={receiptsThisMonth}
        premium={premium}
      />
      <NotificationsSection initialEnabled={profile.notification_email} />
      <DataExportSection premium={premium} />

      <div className="pt-2 pb-6 text-center text-[11px] leading-relaxed text-ink">
        WarrantyBuddy v1.0.0
        <br />
        mywarrantybuddy.com
      </div>
    </div>
  );
}
