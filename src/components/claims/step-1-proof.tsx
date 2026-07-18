import { Check, Info, Receipt } from "lucide-react";
import { StepHeader } from "@/components/claims/step-header";
import type { ClaimProduct, ClaimReceipt } from "@/components/claims/types";
import { Button } from "@/components/ui/button";
import { parseDateOnly } from "@/lib/warranty";

export function Step1Proof({
  product,
  receipt,
  onContinue,
}: {
  product: ClaimProduct;
  receipt: ClaimReceipt | null;
  onContinue: () => void;
}) {
  return (
    <div>
      <StepHeader
        title={receipt ? "Let's check your proof of purchase" : "You'll need proof of purchase"}
        subtitle={
          receipt
            ? "Manufacturers require a dated itemized receipt — not just a card statement. Buddy found your receipt on file."
            : "Manufacturers require a dated itemized receipt — not just a card statement. Buddy didn't find one on file for this product."
        }
      />

      <div className="mb-3 rounded-xl border border-border bg-white p-3.5">
        <div className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Receipt className="h-3.5 w-3.5" />
          {receipt ? "Receipt on file" : "No receipt on file"}
        </div>

        {receipt ? (
          <>
            <div className="flex items-start gap-2.5 border-b border-border py-2">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal/15 text-teal">
                <Check className="h-3 w-3" />
              </div>
              <div>
                <div className="text-xs font-medium text-foreground">
                  {receipt.file_name}
                  {product.purchase_date
                    ? ` — ${parseDateOnly(product.purchase_date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}`
                    : ""}
                </div>
                <div className="text-[11px] text-ink">
                  Itemized receipt on file. Most manufacturers require this exact format.
                </div>
              </div>
            </div>
            {product.purchase_price !== null ? (
              <div className="flex items-start gap-2.5 py-2">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal/15 text-teal">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <div className="text-xs font-medium text-foreground">
                    Purchase price confirmed —{" "}
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
                      product.purchase_price,
                    )}
                  </div>
                  <div className="text-[11px] text-ink">Matches your product record.</div>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-[11px] leading-relaxed text-ink">
            Check your email for an order confirmation, or look up the purchase
            on your credit or debit card statement. You can also upload a
            receipt from the product&apos;s Documents tab before starting a
            claim — most manufacturers won&apos;t proceed without one.
          </p>
        )}
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-lg bg-cloud p-2.5 text-[11px] leading-relaxed text-ink">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Tip: credit card statements alone usually aren&apos;t accepted — most
        manufacturers want an itemized, dated receipt showing the product.
      </div>

      <Button
        onClick={onContinue}
        className="h-11 w-full rounded-lg bg-navy font-medium text-white hover:bg-navy/90"
      >
        {receipt ? "Proof confirmed — continue" : "I have it another way — continue"} →
      </Button>
    </div>
  );
}
