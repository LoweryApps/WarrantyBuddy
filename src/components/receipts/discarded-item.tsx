"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import type { ReceiptDraft } from "@/components/receipts/types";
import { createClient } from "@/lib/supabase/client";

function daysAgo(dateStr: string) {
  const days = Math.round((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function DiscardedItem({
  draft,
  onRestored,
}: {
  draft: ReceiptDraft;
  onRestored: () => void;
}) {
  const [restoring, setRestoring] = useState(false);
  const [restored, setRestored] = useState(false);

  async function handleRestore() {
    setRestoring(true);
    const supabase = createClient();
    await supabase
      .from("forwarded_receipts")
      .update({ status: "Pending Review", discarded_at: null })
      .eq("id", draft.id);
    setRestoring(false);
    setRestored(true);
    onRestored();
  }

  const priceLabel =
    draft.extracted_price !== null
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
          draft.extracted_price,
        )
      : null;

  return (
    <div className="mb-2 flex items-center gap-2.5 rounded-lg border border-border bg-white p-2.5 opacity-70">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cloud text-ink">
        <Mail className="h-3 w-3" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-foreground">
          {draft.extracted_product_name ?? draft.source_email_subject ?? "Forwarded receipt"}
        </div>
        <div className="mt-0.5 text-[10px] text-ink">
          {[priceLabel, draft.discarded_at ? `Discarded ${new Date(draft.discarded_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : null]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      <span className="shrink-0 text-[10px] text-ink">
        {draft.discarded_at ? daysAgo(draft.discarded_at) : ""}
      </span>
      {restored ? (
        <span className="shrink-0 text-[11px] text-teal">Restored ✓</span>
      ) : (
        <button
          type="button"
          disabled={restoring}
          onClick={handleRestore}
          className="shrink-0 text-[11px] font-medium text-teal underline underline-offset-2"
        >
          Restore
        </button>
      )}
    </div>
  );
}
