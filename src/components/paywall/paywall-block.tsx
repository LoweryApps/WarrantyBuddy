"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PaywallBlock({
  title,
  message,
  onUpgrade,
}: {
  title: string;
  message: string;
  onUpgrade: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal/10">
        <Lock className="h-5 w-5 text-teal" />
      </div>
      <div className="text-sm font-semibold text-navy">{title}</div>
      <p className="max-w-xs text-[12px] leading-relaxed text-ink">{message}</p>
      <Button
        onClick={onUpgrade}
        className="h-10 rounded-lg bg-teal px-5 font-medium text-navy hover:bg-teal/90"
      >
        Upgrade to Premium
      </Button>
    </div>
  );
}
