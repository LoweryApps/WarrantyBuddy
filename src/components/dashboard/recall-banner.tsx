import Image from "next/image";
import Link from "next/link";

export function RecallBanner({
  productName,
  description,
  totalCount,
}: {
  productName: string;
  description: string;
  totalCount: number;
}) {
  return (
    <Link
      href="/recalls"
      className="mb-2.5 flex items-center gap-2.5 rounded-[10px] border border-red/30 bg-red/5 p-3 transition-colors hover:border-red/50"
    >
      <Image src="/brand/buddy-soft-alert.svg" alt="" width={34} height={42} />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-xs font-medium text-red">
          Recall alert — Buddy found a match on your {productName}
          {totalCount > 1 ? ` and ${totalCount - 1} other product${totalCount > 2 ? "s" : ""}` : ""}
        </div>
        <div className="line-clamp-1 text-[11px] leading-relaxed text-red/80">
          {description}
        </div>
      </div>
      <div className="shrink-0 text-[11px] font-medium whitespace-nowrap text-red underline underline-offset-2">
        View details →
      </div>
    </Link>
  );
}
