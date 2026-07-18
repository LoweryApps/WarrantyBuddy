import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductCategory } from "@/lib/supabase/types";

const CATEGORIES: ProductCategory[] = [
  "Electronics",
  "Appliance",
  "Tool",
  "Vehicle",
  "Other",
];

export function CategorySelect({
  value,
  onChange,
}: {
  value: ProductCategory | "";
  onChange: (value: ProductCategory) => void;
}) {
  return (
    <Select
      value={value || null}
      onValueChange={(v) => onChange(v as ProductCategory)}
    >
      <SelectTrigger className="h-11 w-full rounded-[10px] border-border bg-white px-3 text-sm data-placeholder:text-muted-foreground">
        <SelectValue placeholder="Select a category" />
      </SelectTrigger>
      <SelectContent>
        {CATEGORIES.map((category) => (
          <SelectItem key={category} value={category}>
            {category}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
