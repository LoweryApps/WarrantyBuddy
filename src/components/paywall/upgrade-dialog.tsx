"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PRICING_COPY, type CheckoutInterval } from "@/lib/stripe";
import { cn } from "@/lib/utils";

const PREMIUM_PERKS = [
  "Unlimited registered products",
  "Unlimited receipt forwarding",
  "Buddy AI warranty extraction",
  "Claim Assist + AI email draft",
  "Ask Buddy chat",
  "Data export (CSV)",
];

export function UpgradeDialog({
  open,
  onOpenChange,
  reason,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
}) {
  const [interval, setInterval] = useState<CheckoutInterval>("annual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.message ?? "Couldn't start checkout — try again.");
      setLoading(false);
      return;
    }

    window.location.href = data.url;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5 font-display text-base font-bold text-navy">
            <Sparkles className="h-4 w-4 text-teal" />
            Upgrade to Premium
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          {reason ? <p className="text-[13px] leading-relaxed text-ink">{reason}</p> : null}

          {error ? (
            <Alert className="border-red/30 bg-red/5 text-red">
              <AlertDescription className="text-red">{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            {(["monthly", "annual"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setInterval(option)}
                className={cn(
                  "rounded-[10px] border p-3 text-left transition-colors",
                  interval === option ? "border-teal bg-teal/5" : "border-border bg-white",
                )}
              >
                <div className="text-[11px] font-medium text-ink">{PRICING_COPY[option].label}</div>
                <div className="text-sm font-bold text-navy">{PRICING_COPY[option].price}</div>
                <div className="text-[10px] text-ink">{PRICING_COPY[option].sub}</div>
              </button>
            ))}
          </div>

          <ul className="space-y-1.5">
            {PREMIUM_PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-2 text-[12px] text-foreground">
                <Check className="h-3.5 w-3.5 shrink-0 text-teal" />
                {perk}
              </li>
            ))}
          </ul>

          <p className="text-[10px] leading-relaxed text-ink">
            Have a founding-member code? Enter it at checkout on the next screen.
          </p>

          <Button
            disabled={loading}
            onClick={handleUpgrade}
            className="h-11 w-full rounded-[10px] bg-teal font-semibold text-navy hover:bg-teal/90"
          >
            {loading ? "Redirecting…" : "Continue to checkout"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
