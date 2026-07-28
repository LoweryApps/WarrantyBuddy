import Link from "next/link";
import type { Metadata } from "next";
import { BuddyFlat } from "@/components/public/buddy-flat";
import { PublicRecallChecker } from "@/components/public/public-recall-checker";

export const metadata: Metadata = {
  title: "Free Recall Checker — WarrantyBuddy",
  description: "Check any product against CPSC, NHTSA, FDA, and USDA recall lists — free, no account needed.",
};

export default function RecallCheckPage() {
  return (
    <div className="flex min-h-full flex-col">
      <nav className="border-b border-white/10 bg-navy">
        <div className="mx-auto flex h-[66px] max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold text-white">
            <BuddyFlat width={24} height={28} />
            Warranty<span className="text-teal">Buddy</span>
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-teal px-4 py-2 font-display text-sm font-bold text-navy hover:opacity-90"
          >
            Protect my products
          </Link>
        </div>
      </nav>

      <main className="flex-1 bg-cloud py-14">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-8 text-center">
            <h1 className="mb-3 font-display text-3xl font-bold text-navy md:text-4xl">Free recall checker</h1>
            <p className="mx-auto max-w-xl text-lg text-ink">
              Search by brand or model — Buddy checks CPSC, NHTSA, FDA, and USDA recall records. No account needed.
            </p>
          </div>

          <PublicRecallChecker />

          <p className="mt-8 text-center text-sm text-ink">
            Want Buddy to check this automatically for everything you own?{" "}
            <Link href="/sign-up" className="font-semibold text-teal underline underline-offset-2">
              Get started free
            </Link>
          </p>
        </div>
      </main>

      <footer className="bg-navy py-7 text-[12.5px] leading-relaxed text-[#8DA0BC]">
        <div className="mx-auto max-w-3xl px-6">
          Recall information on this page is sourced from the U.S. Consumer Product Safety Commission, NHTSA, FDA, and USDA and is
          provided for convenience. WarrantyBuddy does not independently verify recall data, and this tool is not a substitute for
          official government recall resources. Product names and model numbers belong to their respective manufacturers.
        </div>
      </footer>
    </div>
  );
}
