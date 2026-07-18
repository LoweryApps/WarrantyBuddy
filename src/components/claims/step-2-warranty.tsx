import { ShieldAlert, ShieldCheck } from "lucide-react";
import { StepHeader } from "@/components/claims/step-header";
import type { ClaimProduct, ClaimRecall, ClaimWarranty } from "@/components/claims/types";
import { Button } from "@/components/ui/button";
import {
  daysUntil,
  estimateStandardWarrantyEndDate,
  parseDateOnly,
  warrantyStatus,
} from "@/lib/warranty";
import { cn } from "@/lib/utils";

const PILL_CLASSES = {
  active: "bg-teal/10 text-teal",
  expiring: "bg-amber/15 text-amber",
  expired: "bg-red/10 text-red",
  none: "bg-ink/10 text-ink",
};

function formatLong(dateStr: string) {
  return parseDateOnly(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function Step2Warranty({
  product,
  warranty,
  recall,
  onContinue,
}: {
  product: ClaimProduct;
  warranty: ClaimWarranty | null;
  recall: ClaimRecall | null;
  onContinue: () => void;
}) {
  const endDate = warranty?.end_date ?? (product.purchase_date ? estimateStandardWarrantyEndDate(product.purchase_date) : null);
  const isEstimate = !warranty?.end_date && !!endDate;
  const status = endDate ? warrantyStatus(endDate) : null;
  const days = endDate ? daysUntil(endDate) : null;
  const covered = status === "active" || status === "expiring";

  return (
    <div>
      <StepHeader
        title={
          !endDate
            ? "Can't confirm your warranty window"
            : covered
              ? "You're covered"
              : "Your standard warranty has likely expired"
        }
        subtitle={
          !endDate
            ? "No purchase date or warranty document is on file for this product, so Buddy can't estimate the window. You can still continue — check any paperwork you have."
            : isEstimate
              ? "No warranty document is on file, so this is an estimate based on a standard 1-year manufacturer term and your purchase date."
              : "Buddy calculated this from the warranty document on file."
        }
      />

      {endDate ? (
        <div className="mb-3 rounded-xl border border-border bg-white p-3.5">
          <div className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
            {covered ? (
              <ShieldCheck className="h-3.5 w-3.5 text-teal" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 text-red" />
            )}
            Warranty status
            {isEstimate ? (
              <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-medium text-amber">
                Estimated
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-between border-b border-border py-1.5 text-xs">
            <span className="text-ink">Warranty type</span>
            <span className="text-foreground">
              {warranty?.warranty_type ?? "Manufacturer (standard, estimated)"}
            </span>
          </div>
          {product.purchase_date ? (
            <div className="flex items-center justify-between border-b border-border py-1.5 text-xs">
              <span className="text-ink">Purchase date</span>
              <span className="text-foreground">{formatLong(product.purchase_date)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-b border-border py-1.5 text-xs">
            <span className="text-ink">{isEstimate ? "Estimated expiration" : "Warranty expires"}</span>
            <span className="text-foreground">{formatLong(endDate)}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 text-xs">
            <span className="text-ink">Days remaining</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                status ? PILL_CLASSES[status] : "",
              )}
            >
              {days !== null && days >= 0 ? `${days} days left` : "Expired"}
            </span>
          </div>
        </div>
      ) : null}

      {recall ? (
        <div className="mb-4 rounded-xl border border-teal/40 bg-teal/10 p-3.5">
          <div className="mb-1 text-xs font-medium text-teal">
            This issue may also be covered under an active recall
          </div>
          <div className="text-[11px] leading-relaxed text-teal/90">
            {recall.source} recall #{recall.external_recall_id}
            {recall.remedy ? ` entitles you to: ${recall.remedy}` : ""} — this
            applies regardless of warranty status. You can claim under the
            warranty, the recall, or both.
          </div>
        </div>
      ) : null}

      <Button
        onClick={onContinue}
        className="h-11 w-full rounded-lg bg-navy font-medium text-white hover:bg-navy/90"
      >
        Confirmed — continue →
      </Button>
    </div>
  );
}
