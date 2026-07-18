"use client";

import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { KnownIssueBanner, type KnownIssueRecord } from "@/components/product-intelligence/known-issue-banner";
import { WarrantyForm } from "@/components/products/detail/warranty-form";
import type { WarrantyRecord } from "@/components/products/detail/types";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { daysUntil, warrantyStatus } from "@/lib/warranty";

const RING_COLOR = {
  active: "border-teal",
  expiring: "border-amber",
  expired: "border-red",
  none: "border-border",
};

const STATUS_LABEL = {
  active: "active",
  expiring: "expiring soon",
  expired: "expired",
  none: "—",
};

export function WarrantyTab({
  productId,
  brand,
  modelNumber,
  warranty,
  onFileClaim,
  onAskBuddy,
  onChanged,
}: {
  productId: string;
  brand: string | null;
  modelNumber: string | null;
  warranty: WarrantyRecord | null;
  onFileClaim: () => void;
  onAskBuddy: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [knownIssue, setKnownIssue] = useState<KnownIssueRecord | null>(null);

  const status = warranty ? warrantyStatus(warranty.end_date) : "none";

  useEffect(() => {
    // No fetch needed — the JSX below already gates rendering on
    // `status === "expiring"`, so a stale non-null value from a previous
    // render simply won't show once status moves on.
    if (status !== "expiring" || !brand) return;

    let cancelled = false;
    const supabase = createClient();

    supabase
      .from("product_intelligence")
      .select("model_number, failure_type, failure_description, complaint_count, severity, source, source_url")
      .ilike("brand", brand)
      .eq("is_active", true)
      .then(({ data }) => {
        if (cancelled) return;
        const modelLower = (modelNumber ?? "").toLowerCase();
        const best = (data ?? [])
          .filter((r) => !r.model_number || r.model_number.toLowerCase() === modelLower)
          .sort((a, b) => b.complaint_count - a.complaint_count)[0];
        setKnownIssue(best ?? null);
      });

    return () => {
      cancelled = true;
    };
  }, [status, brand, modelNumber]);

  if (!warranty || editing) {
    return (
      <div>
        <div className="mb-2.5 text-[10px] tracking-wide text-ink uppercase">
          {warranty ? "Edit warranty" : "No warranty on file yet"}
        </div>
        <WarrantyForm
          productId={productId}
          existing={warranty}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
          onCancel={warranty ? () => setEditing(false) : undefined}
        />
      </div>
    );
  }

  const days = warranty.end_date ? daysUntil(warranty.end_date) : null;

  return (
    <div>
      <div className="mb-3.5 flex items-center gap-3 rounded-[10px] bg-cloud p-3.5">
        <div
          className={cn(
            "flex h-13 w-13 shrink-0 flex-col items-center justify-center rounded-full border-[3px]",
            RING_COLOR[status],
          )}
        >
          {days !== null ? (
            <>
              <span className="text-sm font-medium text-navy">{Math.abs(days)}</span>
              <span className="text-[8px] text-ink">{days < 0 ? "days ago" : "days left"}</span>
            </>
          ) : (
            <span className="text-[9px] text-ink">No date</span>
          )}
        </div>
        <div>
          <div className="text-[13px] font-medium text-foreground">
            {warranty.warranty_type} warranty — {STATUS_LABEL[status]}
          </div>
          <div className="text-[11px] text-ink">
            {warranty.start_date ? `Started ${warranty.start_date}` : ""}
            {warranty.start_date && warranty.end_date ? " · " : ""}
            {warranty.end_date ? `Expires ${warranty.end_date}` : ""}
          </div>
        </div>
      </div>

      {status === "expiring" && knownIssue ? (
        <KnownIssueBanner record={knownIssue} className="mb-3.5" />
      ) : null}

      {warranty.coverage_description ? (
        <div className="mb-2.5 rounded-lg bg-cloud p-3">
          <div className="mb-1.5 text-[11px] font-medium text-foreground">What&apos;s covered</div>
          <div className="text-[11px] leading-relaxed whitespace-pre-line text-ink">
            {warranty.coverage_description}
          </div>
        </div>
      ) : null}

      {warranty.exclusions ? (
        <div className="mb-3.5 rounded-lg bg-cloud p-3">
          <div className="mb-1.5 text-[11px] font-medium text-foreground">What&apos;s not covered</div>
          <div className="text-[11px] leading-relaxed whitespace-pre-line text-ink">
            {warranty.exclusions}
          </div>
        </div>
      ) : null}

      {warranty.claim_contact ? (
        <div className="mb-3.5 rounded-lg border border-border bg-white p-3">
          <div className="mb-1 text-xs font-medium text-navy">How to make a claim</div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-navy">
            <Phone className="h-3 w-3" />
            {warranty.claim_contact}
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button
          onClick={onFileClaim}
          className="h-10 flex-1 rounded-lg bg-navy font-medium text-white hover:bg-navy/90"
        >
          File a claim
        </Button>
        <Button
          onClick={onAskBuddy}
          className="h-10 flex-1 rounded-lg bg-teal font-medium text-navy hover:bg-teal/90"
        >
          Ask Buddy
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-3 w-full text-center text-[11px] text-ink underline underline-offset-2"
      >
        Edit warranty details
      </button>
    </div>
  );
}
