"use client";

import { Mail } from "lucide-react";
import { ReceiptCard } from "@/components/receipts/receipt-card";
import type { ExistingProduct, ReceiptGroup } from "@/components/receipts/types";
import { isHighConfidence } from "@/lib/receipts";

function formatMeta(group: ReceiptGroup) {
  const dateLabel = new Date(group.receivedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return group.senderDomain ? `Forwarded from ${group.senderDomain} · ${dateLabel}` : dateLabel;
}

export function ReceiptGroupCard({
  group,
  products,
  onResolved,
  atReceiptLimit,
  premium,
}: {
  group: ReceiptGroup;
  products: ExistingProduct[];
  onResolved: () => void;
  atReceiptLimit: boolean;
  premium: boolean;
}) {
  if (group.items.length === 1) {
    return (
      <ReceiptCard
        draft={group.items[0]}
        products={products}
        onResolved={onResolved}
        atReceiptLimit={atReceiptLimit}
        premium={premium}
      />
    );
  }

  const allHighConfidence = group.items.every((i) => isHighConfidence(i.confidence_score));

  return (
    <div className="mb-2.5 overflow-hidden rounded-xl border border-border bg-white">
      <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy/10 text-navy">
          <Mail className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-foreground">
            {group.subject ?? `Order of ${group.items.length} items`}
          </div>
          <div className="mt-0.5 text-[10px] text-ink">{formatMeta(group)}</div>
        </div>
        <span
          className={
            allHighConfidence
              ? "shrink-0 rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-medium text-teal"
              : "shrink-0 rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-medium text-amber"
          }
        >
          {allHighConfidence ? "Buddy is confident" : "⚠ Check these fields"}
        </span>
      </div>

      <div className="border-b border-border px-3.5 py-2 text-[11px] text-ink">
        Buddy found {group.items.length} items in this email — confirm each one separately
      </div>

      <div className="space-y-3 p-3.5">
        {group.items.map((item, i) => (
          <div key={item.id}>
            <div className="mb-1.5 text-[10px] text-ink">
              Item {i + 1} of {group.items.length}
            </div>
            <ReceiptCard
              draft={item}
              products={products}
              onResolved={onResolved}
              compact
              atReceiptLimit={atReceiptLimit}
              premium={premium}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
