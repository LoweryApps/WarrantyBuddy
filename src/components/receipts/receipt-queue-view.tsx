"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Inbox } from "lucide-react";
import { DiscardedItem } from "@/components/receipts/discarded-item";
import { ReceiptGroupCard } from "@/components/receipts/receipt-group-card";
import type { ExistingProduct, ReceiptDraft } from "@/components/receipts/types";
import { groupReceiptDrafts } from "@/lib/receipts";

export function ReceiptQueueView({
  pending,
  discarded,
  products,
  atReceiptLimit,
  premium,
}: {
  pending: ReceiptDraft[];
  discarded: ReceiptDraft[];
  products: ExistingProduct[];
  atReceiptLimit: boolean;
  premium: boolean;
}) {
  const router = useRouter();
  const groups = groupReceiptDrafts(pending);

  function refresh() {
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl pb-16">
      <div className="flex h-12 items-center gap-2 bg-navy px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-[13px] text-white/60 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <div className="flex flex-1 items-center justify-center gap-1.5 text-[13px] font-medium text-white">
          Review queue
          {pending.length > 0 ? (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red px-1 text-[10px] font-medium text-white">
              {pending.length}
            </span>
          ) : null}
        </div>
        <div className="w-16" />
      </div>

      <div className="p-4">
        <div className="mb-2.5 text-[10px] tracking-wide text-ink uppercase">Pending review</div>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center">
            <Inbox className="h-7 w-7 text-ink" />
            <p className="text-xs leading-relaxed text-ink">
              Nothing waiting for review.
              <br />
              Forward an order confirmation or warranty email to your
              WarrantyBuddy address and Buddy will read it automatically.
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <ReceiptGroupCard
              key={group.key}
              group={group}
              products={products}
              onResolved={refresh}
              atReceiptLimit={atReceiptLimit}
              premium={premium}
            />
          ))
        )}

        {discarded.length > 0 ? (
          <>
            <div className="mt-6 mb-2.5 text-[10px] tracking-wide text-ink uppercase">
              Recently discarded{" "}
              <span className="normal-case">— restore within 30 days</span>
            </div>
            {discarded.map((draft) => (
              <DiscardedItem key={draft.id} draft={draft} onRestored={refresh} />
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}
