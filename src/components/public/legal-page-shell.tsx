import Link from "next/link";
import Image from "next/image";

export function LegalPageShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <nav className="border-b border-white/10 bg-navy">
        <div className="mx-auto flex h-[66px] max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold text-white">
            <Image src="/brand/buddy-soft.svg" alt="" width={24} height={30} />
            <span>Warranty<span className="text-teal">Buddy</span></span>
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
          <h1 className="mb-2 font-display text-3xl font-bold text-navy md:text-4xl">{title}</h1>
          <p className="mb-10 text-sm text-ink">Last updated {updated}</p>
          <div className="space-y-7 rounded-2xl border border-border bg-white p-7 text-[15px] leading-relaxed text-ink md:p-10">
            {children}
          </div>
        </div>
      </main>

      <footer className="bg-navy py-7 text-[12.5px] leading-relaxed text-[#8DA0BC]">
        <div className="mx-auto max-w-3xl px-6">
          <Link href="/privacy" className="mr-4 hover:text-white">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-white">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}
