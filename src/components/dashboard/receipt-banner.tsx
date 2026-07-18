import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function ReceiptBanner({ count }: { count: number }) {
  return (
    <Link
      href="/receipts"
      className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-teal/40 bg-teal/10 p-2.5 transition-colors hover:border-teal/60"
    >
      <Image src="/brand/buddy-soft-thinking.svg" alt="" width={28} height={35} />
      <div className="flex-1 text-xs text-teal">
        <span className="font-medium">
          {count} receipt{count === 1 ? "" : "s"} waiting for review
        </span>{" "}
        — Buddy read your forwarded emails and is ready to confirm
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-teal" />
    </Link>
  );
}
