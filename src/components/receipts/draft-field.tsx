"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function DraftField({
  label,
  value,
  amber,
  onChange,
}: {
  label: string;
  value: string;
  amber: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b py-1.5",
          amber ? "border-amber" : "border-border",
        )}
      >
        <span className="shrink-0 text-[11px] text-ink">{label}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-right text-xs outline-none",
            amber ? "font-medium text-amber" : "text-foreground",
          )}
        />
      </div>
      {amber ? (
        <div className="flex items-center gap-1 py-1 text-[10px] text-amber">
          <AlertTriangle className="h-2.5 w-2.5" />
          Buddy wasn&apos;t certain — verify against your receipt
        </div>
      ) : null}
    </div>
  );
}
