import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { CategoryIcon } from "@/components/dashboard/category-icon";
import { WarrantyBadge } from "@/components/dashboard/warranty-badge";
import { cn } from "@/lib/utils";
import { formatDateLabel, warrantyStatus } from "@/lib/warranty";
import type { ProductCategory } from "@/lib/supabase/types";

export interface DashboardProduct {
  id: string;
  name: string;
  brand: string | null;
  model_number: string | null;
  category: ProductCategory;
  warrantyEndDate: string | null;
  hasWarranty: boolean;
  hasRecall: boolean;
}

export function ProductCard({ product }: { product: DashboardProduct }) {
  const status = product.hasWarranty
    ? warrantyStatus(product.warrantyEndDate)
    : "none";
  const dateLabel = product.hasWarranty
    ? formatDateLabel(status, product.warrantyEndDate)
    : "Added manually";

  return (
    <Link
      href={`/products/${product.id}`}
      className={cn(
        "block rounded-xl border bg-white p-3.5 transition-colors hover:border-ink/40",
        product.hasRecall ? "border-red/40" : "border-border",
      )}
    >
      <div className="mb-2.5 flex items-start justify-between">
        <CategoryIcon category={product.category} />
        <WarrantyBadge status={status} />
      </div>
      <div className="mb-0.5 text-xs leading-snug font-medium text-foreground">
        {product.name}
      </div>
      <div className="text-[10px] text-ink">
        {[product.brand, product.model_number].filter(Boolean).join(" · ") || "—"}
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5">
        <div className="text-[10px] text-ink">{dateLabel}</div>
        {product.hasRecall ? (
          <div className="flex items-center gap-1 text-[10px] font-medium text-red">
            <TriangleAlert className="h-2.5 w-2.5" />
            Recall
          </div>
        ) : status === "expiring" ? (
          <div className="text-[10px] text-amber">Expiring soon</div>
        ) : null}
      </div>
    </Link>
  );
}
