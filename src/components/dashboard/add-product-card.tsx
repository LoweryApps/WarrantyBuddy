import Link from "next/link";
import { Plus } from "lucide-react";

export function AddProductCard() {
  return (
    <Link
      href="/products/new"
      className="flex min-h-[120px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-white p-3.5 text-ink transition-colors hover:border-ink/40"
    >
      <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-border bg-cloud">
        <Plus className="h-4 w-4" />
      </div>
      <div className="text-[11px]">Add product</div>
    </Link>
  );
}
