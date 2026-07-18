"use client";

import { useState } from "react";
import { CircleCheck, Info, Mail, Trash2 } from "lucide-react";
import { UpgradeDialog } from "@/components/paywall/upgrade-dialog";
import { DraftField } from "@/components/receipts/draft-field";
import type { ExistingProduct, ReceiptDraft } from "@/components/receipts/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { isHighConfidence, suggestMatch } from "@/lib/receipts";
import { cn } from "@/lib/utils";

const NEW_PRODUCT_VALUE = "__new__";

function formatMeta(draft: ReceiptDraft) {
  const dateLabel = new Date(draft.received_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return draft.sender_domain
    ? `Forwarded from ${draft.sender_domain} · ${dateLabel}`
    : dateLabel;
}

const KIND_LABEL: Record<ReceiptDraft["kind"], string> = {
  receipt: "Receipt",
  warranty: "Warranty",
  both: "Receipt + Warranty",
};

export function ReceiptCard({
  draft,
  products,
  onResolved,
  compact = false,
  atReceiptLimit = false,
  premium = false,
}: {
  draft: ReceiptDraft;
  products: ExistingProduct[];
  onResolved: () => void;
  compact?: boolean;
  atReceiptLimit?: boolean;
  premium?: boolean;
}) {
  const suggested = suggestMatch(draft.extracted_product_name, products, draft.extracted_brand);
  const highConfidence = isHighConfidence(draft.confidence_score);
  const isWarranty = draft.kind === "warranty" || draft.kind === "both";
  const isReceipt = draft.kind === "receipt" || draft.kind === "both";
  const needsUpgrade = (isWarranty && !premium) || (!isWarranty && atReceiptLimit);

  const [productName, setProductName] = useState(draft.extracted_product_name ?? "");
  const [brand, setBrand] = useState(draft.extracted_brand ?? "");
  const [price, setPrice] = useState(draft.extracted_price?.toString() ?? "");
  const [orderDate, setOrderDate] = useState(draft.extracted_order_date ?? "");
  const [orderNumber, setOrderNumber] = useState(draft.extracted_order_number ?? "");
  const [retailer, setRetailer] = useState(draft.extracted_retailer ?? "");
  const [warrantyStart, setWarrantyStart] = useState(draft.extracted_warranty_start_date ?? "");
  const [warrantyEnd, setWarrantyEnd] = useState(draft.extracted_warranty_end_date ?? "");
  const [coverage, setCoverage] = useState(draft.extracted_coverage_description ?? "");
  const [exclusions, setExclusions] = useState(draft.extracted_exclusions ?? "");
  const [claimContact, setClaimContact] = useState(draft.extracted_claim_contact ?? "");
  const [matchId, setMatchId] = useState(suggested?.id ?? NEW_PRODUCT_VALUE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const matchedProduct = products.find((p) => p.id === matchId) ?? null;

  if (done) return null;

  async function handleDiscard() {
    setBusy(true);
    const supabase = createClient();
    await supabase
      .from("forwarded_receipts")
      .update({ status: "Discarded", discarded_at: new Date().toISOString() })
      .eq("id", draft.id);
    setBusy(false);
    setDone(true);
    onResolved();
  }

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Your session expired — please sign in again.");
      setBusy(false);
      return;
    }

    let productId = matchId === NEW_PRODUCT_VALUE ? null : matchId;

    if (!productId) {
      const { data: newProduct, error: insertError } = await supabase
        .from("products")
        .insert({
          user_id: user.id,
          name: productName.trim() || "Untitled product",
          brand: brand.trim() || null,
          retailer: retailer.trim() || null,
          purchase_date: orderDate || null,
          purchase_price: price ? Number(price) : null,
          category: "Other",
        })
        .select("id, brand, model_number")
        .single();

      if (insertError || !newProduct) {
        setError(insertError?.message ?? "Couldn't create the product.");
        setBusy(false);
        return;
      }
      productId = newProduct.id;

      if (newProduct.brand && newProduct.model_number) {
        const { data: recallMatch } = await supabase
          .from("recalls")
          .select("id, source, description, remedy")
          .ilike("brand", newProduct.brand)
          .contains("model_numbers", [newProduct.model_number])
          .limit(1)
          .maybeSingle();
        if (recallMatch) {
          await supabase.from("user_recall_alerts").insert({
            user_id: user.id,
            product_id: productId,
            recall_id: recallMatch.id,
          });

          fetch("/api/recall-alert-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId,
              productName: productName.trim() || "Untitled product",
              brand: newProduct.brand,
              modelNumber: newProduct.model_number,
              recallSource: recallMatch.source,
              recallDescription: recallMatch.description,
              recallRemedy: recallMatch.remedy,
            }),
          }).catch(() => {
            // Best-effort notification — never block the confirm flow.
          });
        }
      }
    }

    const hasWarrantyFields =
      isWarranty && (warrantyStart || warrantyEnd || coverage.trim() || exclusions.trim() || claimContact.trim());

    if (hasWarrantyFields) {
      await supabase.from("warranties").insert({
        product_id: productId,
        warranty_type: "Manufacturer",
        start_date: warrantyStart || null,
        end_date: warrantyEnd || null,
        coverage_description: coverage.trim() || null,
        exclusions: exclusions.trim() || null,
        claim_contact: claimContact.trim() || null,
        document_url: draft.raw_email_url,
        ai_extracted: true,
      });
    }

    if (draft.raw_email_url) {
      await supabase.from("documents").insert({
        product_id: productId,
        document_type: isWarranty ? "Warranty" : "Receipt",
        file_url: draft.raw_email_url,
        file_name:
          draft.source_email_subject ?? (isWarranty ? "Forwarded warranty document" : "Forwarded receipt"),
      });
    }

    const { error: updateError } = await supabase
      .from("forwarded_receipts")
      .update({ status: "Confirmed", product_id: productId })
      .eq("id", draft.id);

    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    onResolved();
  }

  return (
    <div className={compact ? "border-l-2 border-teal pl-3" : ""}>
      {!compact ? (
        <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-2.5">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              highConfidence ? "bg-navy/10 text-navy" : "bg-amber/15 text-amber",
            )}
          >
            <Mail className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-foreground">
              {draft.source_email_subject ?? "Forwarded email"}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink">
              {formatMeta(draft)}
              <span className="rounded-full bg-navy/10 px-1.5 py-0.5 text-[9px] font-medium text-navy">
                {KIND_LABEL[draft.kind]}
              </span>
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
              highConfidence ? "bg-teal/10 text-teal" : "bg-amber/15 text-amber",
            )}
          >
            {highConfidence ? "Buddy is confident" : "⚠ Check these fields"}
          </span>
        </div>
      ) : null}

      <div className={compact ? "" : "px-3.5"}>
        {!compact ? (
          <div className="flex items-center gap-1.5 border-b border-border py-2 text-[11px] text-ink">
            <CircleCheck className="h-3 w-3 shrink-0" />
            {highConfidence
              ? "Buddy read this email and filled in the details below"
              : "Buddy was less certain on highlighted fields — double-check before saving"}
          </div>
        ) : null}

        {error ? <p className="pt-2 text-[11px] text-red">{error}</p> : null}

        <div className="py-1.5">
          {matchedProduct ? (
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-2.5 py-1 text-[11px] text-teal">
              <CircleCheck className="h-3 w-3" />
              Matches &quot;{matchedProduct.name}&quot; already in your vault
            </div>
          ) : (
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-ink">
              <Info className="h-3 w-3 shrink-0" />
              No matching product found — confirming will create a new entry
            </div>
          )}

          {products.length > 0 ? (
            <Select value={matchId} onValueChange={(v) => setMatchId(v ?? NEW_PRODUCT_VALUE)}>
              <SelectTrigger className="mb-1 h-8 w-full rounded-md border-border bg-white px-2.5 text-[11px]">
                <SelectValue>
                  {(value: string) =>
                    value === NEW_PRODUCT_VALUE
                      ? "Create new product"
                      : (products.find((p) => p.id === value)?.name ?? "Create new product")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NEW_PRODUCT_VALUE}>Create new product</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <DraftField
          label="Product"
          value={productName}
          amber={!highConfidence}
          onChange={setProductName}
        />
        <DraftField label="Brand" value={brand} amber={!highConfidence} onChange={setBrand} />

        {isReceipt ? (
          <>
            <DraftField label="Price" value={price} amber={!highConfidence} onChange={setPrice} />
            <DraftField
              label="Order date"
              value={orderDate}
              amber={!highConfidence}
              onChange={setOrderDate}
            />
            <DraftField
              label="Order number"
              value={orderNumber}
              amber={false}
              onChange={setOrderNumber}
            />
            <DraftField label="Retailer" value={retailer} amber={!highConfidence} onChange={setRetailer} />
          </>
        ) : null}

        {isWarranty ? (
          <>
            <DraftField
              label="Warranty start"
              value={warrantyStart}
              amber={!highConfidence}
              onChange={setWarrantyStart}
            />
            <DraftField
              label="Warranty end"
              value={warrantyEnd}
              amber={!highConfidence}
              onChange={setWarrantyEnd}
            />
            <DraftField
              label="What's covered"
              value={coverage}
              amber={!highConfidence}
              onChange={setCoverage}
            />
            <DraftField
              label="What's not covered"
              value={exclusions}
              amber={!highConfidence}
              onChange={setExclusions}
            />
            <DraftField
              label="Claim contact"
              value={claimContact}
              amber={!highConfidence}
              onChange={setClaimContact}
            />
          </>
        ) : null}

        {isWarranty && !premium ? (
          <div className="mb-2 rounded-[10px] bg-amber/10 p-2.5 text-[11px] leading-relaxed text-amber">
            AI warranty extraction is a Premium feature. Upgrade to auto-fill and save the warranty details
            Buddy found in this email.
          </div>
        ) : atReceiptLimit ? (
          <div className="mb-2 rounded-[10px] bg-amber/10 p-2.5 text-[11px] leading-relaxed text-amber">
            You&apos;ve used your 3 free receipts this month. Upgrade to Premium for unlimited receipt
            forwarding.
          </div>
        ) : null}

        <div className="flex gap-2 py-3">
          <button
            type="button"
            disabled={busy}
            onClick={handleDiscard}
            aria-label="Discard"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-cloud text-ink"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={needsUpgrade ? () => setUpgradeOpen(true) : handleConfirm}
            className={cn(
              "h-9 flex-1 rounded-lg text-xs font-medium",
              needsUpgrade ? "bg-teal text-navy" : matchedProduct ? "bg-teal text-navy" : "bg-navy text-white",
            )}
          >
            {needsUpgrade
              ? "Upgrade to confirm"
              : busy
                ? "Saving…"
                : matchedProduct
                  ? `Looks good — attach to ${matchedProduct.name}`
                  : "Confirm and create new product"}
          </button>
        </div>
      </div>

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason={
          isWarranty
            ? "AI warranty extraction is a Premium feature."
            : "Free accounts can forward up to 3 receipts per month."
        }
      />
    </div>
  );
}
