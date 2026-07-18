import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyVault() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-white px-6 py-16 text-center">
      <Image src="/brand/buddy-soft-happy.svg" alt="" width={64} height={79} />
      <div>
        <div className="font-display text-base font-bold text-navy">
          Your vault is empty
        </div>
        <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-ink">
          Register your first product to start tracking warranties, storing
          documents, and watching for recalls.
        </p>
      </div>
      <Link href="/products/new">
        <Button className="h-10 rounded-lg bg-teal px-5 font-semibold text-navy hover:bg-teal/90">
          + Add your first product
        </Button>
      </Link>
    </div>
  );
}
