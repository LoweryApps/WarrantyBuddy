"use client";

import { useState } from "react";
import { Check, Copy, Forward } from "lucide-react";
import { SettingsRow, SettingsSection } from "@/components/settings/section";
import { FREE_RECEIPT_MONTHLY_LIMIT } from "@/lib/entitlements";
import { cn } from "@/lib/utils";

export function ForwardingSection({
  forwardingAddress,
  receiptsThisMonth,
  premium,
}: {
  forwardingAddress: string;
  receiptsThisMonth: number;
  premium: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(forwardingAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied — nothing more we can do.
    }
  }

  return (
    <SettingsSection
      icon={Forward}
      iconTone="teal"
      title="Email forwarding"
      subtitle="Forward order confirmations and warranty emails here"
    >
      <SettingsRow
        label="Your forwarding address"
        sublabel="One address for receipts and warranty documents — Buddy sorts them out"
      />
      <div className="flex items-center gap-2 border-b border-border p-3.5">
        <span className="flex-1 truncate rounded-lg bg-cloud px-3 py-2 font-mono text-[11px] text-foreground">
          {forwardingAddress}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1.5 text-[10px] text-ink",
            copied && "border-teal/40 bg-teal/10 text-teal",
          )}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SettingsRow
        label="Receipts forwarded this month"
        sublabel={premium ? "Across all your products" : `Free plan limit: ${FREE_RECEIPT_MONTHLY_LIMIT}/month`}
      >
        <span
          className={cn(
            "text-xs font-medium",
            !premium && receiptsThisMonth >= FREE_RECEIPT_MONTHLY_LIMIT ? "text-amber" : "text-teal",
          )}
        >
          {premium ? receiptsThisMonth : `${receiptsThisMonth}/${FREE_RECEIPT_MONTHLY_LIMIT}`}
        </span>
      </SettingsRow>
    </SettingsSection>
  );
}
