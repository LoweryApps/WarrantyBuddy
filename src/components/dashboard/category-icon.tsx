import { Car, Laptop, Package, Refrigerator, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductCategory } from "@/lib/supabase/types";

const CATEGORY_MAP: Record<
  ProductCategory,
  { icon: typeof Laptop; classes: string }
> = {
  Electronics: { icon: Laptop, classes: "bg-teal/10 text-teal" },
  Appliance: { icon: Refrigerator, classes: "bg-navy/10 text-navy" },
  Tool: { icon: Wrench, classes: "bg-amber/15 text-amber" },
  Vehicle: { icon: Car, classes: "bg-ink/10 text-ink" },
  Other: { icon: Package, classes: "bg-ink/10 text-ink" },
};

export function CategoryIcon({ category }: { category: ProductCategory }) {
  const { icon: Icon, classes } = CATEGORY_MAP[category] ?? CATEGORY_MAP.Other;
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]",
        classes,
      )}
    >
      <Icon className="h-[17px] w-[17px]" />
    </div>
  );
}
