"use client";

import { useState } from "react";
import { Crown, Sparkles } from "lucide-react";
import { UpgradeDialog } from "@/components/paywall/upgrade-dialog";
import { SettingsRow, SettingsSection } from "@/components/settings/section";
import { Button } from "@/components/ui/button";
import { PLAN_LABELS } from "@/lib/stripe";
import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/supabase/types";

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Payment past due",
  canceled: "Canceled",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
  unpaid: "Unpaid",
};

export function PlanSection({
  premium,
  plan,
  subscriptionStatus,
  currentPeriodEnd,
}: {
  premium: boolean;
  plan: SubscriptionPlan | null;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodEnd: string | null;
}) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleManage() {
    setPortalLoading(true);
    setError(null);

    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.message ?? "Couldn't open the billing portal — try again.");
      setPortalLoading(false);
      return;
    }

    window.location.href = data.url;
  }

  return (
    <SettingsSection
      icon={premium ? Crown : Sparkles}
      iconTone={premium ? "teal" : "navy"}
      title="Plan"
      subtitle={premium ? "You're on Premium" : "Free plan"}
    >
      <SettingsRow
        label={plan ? PLAN_LABELS[plan] : "Free"}
        sublabel={
          premium && subscriptionStatus
            ? `${STATUS_LABEL[subscriptionStatus]}${currentPeriodEnd ? ` · renews ${new Date(currentPeriodEnd).toLocaleDateString()}` : ""}`
            : "Up to 5 products, 3 receipts/month"
        }
      >
        {premium ? (
          <Button
            disabled={portalLoading}
            onClick={handleManage}
            variant="outline"
            className="h-8 rounded-lg border-border text-[11px] text-foreground hover:bg-cloud"
          >
            {portalLoading ? "Opening…" : "Manage subscription"}
          </Button>
        ) : (
          <Button
            onClick={() => setUpgradeOpen(true)}
            className="h-8 rounded-lg bg-teal px-3 text-[11px] font-medium text-navy hover:bg-teal/90"
          >
            Upgrade
          </Button>
        )}
      </SettingsRow>

      {error ? <p className="px-3.5 pb-3 text-[11px] text-red">{error}</p> : null}

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </SettingsSection>
  );
}
