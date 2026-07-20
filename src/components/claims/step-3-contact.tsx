import { Check, ExternalLink, Phone } from "lucide-react";
import { StepHeader } from "@/components/claims/step-header";
import type { ClaimProduct, ClaimRecall, ClaimWarranty } from "@/components/claims/types";
import { CopyButton } from "@/components/products/detail/copy-button";
import { Button } from "@/components/ui/button";
import { parseDateOnly } from "@/lib/warranty";

export function Step3Contact({
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
  return (
    <div>
      <StepHeader
        title={product.brand ? `Here's how to reach ${product.brand}` : "Here's what you'll need"}
        subtitle="Have your model number and serial number ready. Buddy added copy buttons for both."
      />

      {warranty?.claim_contact ? (
        <div className="mb-3 rounded-xl border border-navy/15 bg-navy/5 p-3.5">
          <div className="mb-2 text-[11px] font-medium text-navy">
            {product.brand ?? "Manufacturer"} support contact
          </div>
          <div className="flex items-center justify-between gap-2 py-1 text-xs text-navy">
            <span className="flex items-center gap-1.5">
              <Phone className="h-3 w-3" />
              {warranty.claim_contact}
            </span>
            <CopyButton value={warranty.claim_contact} label="Copy claim contact" />
          </div>
        </div>
      ) : product.brand ? (
        <a
          href={`https://www.google.com/search?q=${encodeURIComponent(`${product.brand} customer support warranty claim`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 flex items-center justify-between rounded-xl border border-border bg-white p-3.5"
        >
          <div>
            <div className="text-xs text-foreground">Find {product.brand} support</div>
            <div className="mt-0.5 text-[11px] text-ink">
              No claim contact on file yet — search for it
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-ink" />
        </a>
      ) : null}

      <div className="mb-4 rounded-xl border border-border bg-white p-3.5">
        <div className="mb-2 text-[11px] font-medium text-foreground">
          Have these ready when you call
        </div>
        <div className="space-y-2">
          {product.model_number ? (
            <div className="flex items-center gap-2 text-[11px] text-ink">
              <Check className="h-3 w-3 shrink-0 text-teal" />
              Model number
              <CopyButton value={product.model_number} label="Copy model number" />
              <span className="font-mono text-foreground">{product.model_number}</span>
            </div>
          ) : null}
          {product.serial_number ? (
            <div className="flex items-center gap-2 text-[11px] text-ink">
              <Check className="h-3 w-3 shrink-0 text-teal" />
              Serial number
              <CopyButton value={product.serial_number} label="Copy serial number" />
              <span className="font-mono text-foreground">{product.serial_number}</span>
            </div>
          ) : null}
          {product.category === "Vehicle" && product.vin ? (
            <div className="flex items-center gap-2 text-[11px] text-ink">
              <Check className="h-3 w-3 shrink-0 text-teal" />
              VIN
              <CopyButton value={product.vin} label="Copy VIN" />
              <span className="font-mono text-foreground">{product.vin}</span>
            </div>
          ) : null}
          {product.purchase_date ? (
            <div className="flex items-center gap-2 text-[11px] text-ink">
              <Check className="h-3 w-3 shrink-0 text-teal" />
              Purchase date —{" "}
              <span className="text-foreground">
                {parseDateOnly(product.purchase_date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          ) : null}
          {recall ? (
            <div className="flex items-center gap-2 text-[11px] text-ink">
              <Check className="h-3 w-3 shrink-0 text-teal" />
              {recall.source} recall number —{" "}
              <span className="text-foreground">{recall.external_recall_id}</span>
            </div>
          ) : null}
        </div>
      </div>

      <Button
        onClick={onContinue}
        className="h-11 w-full rounded-lg bg-navy font-medium text-white hover:bg-navy/90"
      >
        Got it — continue to credit card check →
      </Button>
    </div>
  );
}
