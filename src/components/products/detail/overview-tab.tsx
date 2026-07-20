import {
  Calendar,
  DollarSign,
  ExternalLink,
  Hash,
  LayoutGrid,
  MapPin,
  ScanLine,
  Store,
  Tag,
} from "lucide-react";
import { CopyButton } from "@/components/products/detail/copy-button";
import { FieldRow } from "@/components/products/detail/field-row";
import type { ProductRecord } from "@/components/products/detail/types";
import { Button } from "@/components/ui/button";
import { parseDateOnly } from "@/lib/warranty";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return parseDateOnly(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatPrice(price: number | null) {
  if (price === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
}

export function OverviewTab({
  product,
  onFileClaim,
  onAskBuddy,
}: {
  product: ProductRecord;
  onFileClaim: () => void;
  onAskBuddy: () => void;
}) {
  return (
    <div>
      <div className="mb-2 text-[10px] tracking-wide text-ink uppercase">Product details</div>
      <div className="mb-4">
        <FieldRow icon={Tag} label={product.category === "Vehicle" ? "Make" : "Brand"}>
          {product.brand || "—"}
        </FieldRow>
        <FieldRow icon={ScanLine} label="Model number">
          {product.model_number ? (
            <>
              <span className="font-mono text-[11px]">{product.model_number}</span>
              <CopyButton value={product.model_number} label="Copy model number" />
            </>
          ) : (
            "—"
          )}
        </FieldRow>
        <FieldRow icon={ScanLine} label="Serial number">
          {product.serial_number ? (
            <>
              <span className="font-mono text-[11px]">{product.serial_number}</span>
              <CopyButton value={product.serial_number} label="Copy serial number" />
            </>
          ) : (
            "—"
          )}
        </FieldRow>
        {product.category === "Vehicle" ? (
          <FieldRow icon={ScanLine} label="VIN">
            {product.vin ? (
              <>
                <span className="font-mono text-[11px]">{product.vin}</span>
                <CopyButton value={product.vin} label="Copy VIN" />
              </>
            ) : (
              "—"
            )}
          </FieldRow>
        ) : null}
        {product.category === "Vehicle" ? (
          <FieldRow icon={Calendar} label="Model year">
            {product.model_year ?? "—"}
          </FieldRow>
        ) : null}
        <FieldRow icon={LayoutGrid} label="Category">
          {product.category}
        </FieldRow>
        <FieldRow icon={MapPin} label="Room / location">
          {product.room_location || "—"}
        </FieldRow>
        <FieldRow icon={Hash} label="Quantity">
          {product.quantity}
        </FieldRow>
      </div>

      <div className="mb-2 text-[10px] tracking-wide text-ink uppercase">Purchase details</div>
      <div className="mb-4">
        <FieldRow icon={Calendar} label="Purchase date">
          {formatDate(product.purchase_date)}
        </FieldRow>
        <FieldRow icon={DollarSign} label="Purchase price">
          {formatPrice(product.purchase_price)}
        </FieldRow>
        <FieldRow icon={Store} label="Retailer">
          {product.retailer || "—"}
        </FieldRow>
      </div>

      {product.brand ? (
        <a
          href={`https://www.google.com/search?q=${encodeURIComponent(`${product.brand} product registration`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 flex items-center justify-between rounded-lg border border-border bg-cloud p-3 transition-colors hover:border-ink/40"
        >
          <div>
            <div className="text-xs text-foreground">Register with {product.brand}</div>
            <div className="mt-0.5 text-[11px] text-ink">Find the official registration page</div>
          </div>
          <ExternalLink className="h-4 w-4 text-ink" />
        </a>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Button
          onClick={onFileClaim}
          className="h-10 flex-1 rounded-lg bg-teal font-medium text-navy hover:bg-teal/90"
        >
          File a claim
        </Button>
        <Button
          onClick={onAskBuddy}
          variant="outline"
          className="h-10 flex-1 rounded-lg border-border text-foreground hover:bg-cloud"
        >
          Ask Buddy
        </Button>
      </div>
    </div>
  );
}
