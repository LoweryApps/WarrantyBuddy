import Link from "next/link";
import Image from "next/image";

// These pages read live Supabase session state (recovery links, resend
// cooldowns) — never statically prerender them.
export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-screen flex-col bg-navy"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px)",
        backgroundSize: "44px 44px",
      }}
    >
      <nav className="border-b border-white/10">
        <div className="mx-auto flex h-[66px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-display text-base font-bold text-white sm:gap-2.5 sm:text-xl">
            <Image src="/brand/buddy-soft.svg" alt="" width={20} height={25} className="sm:h-[30px] sm:w-6" />
            <span>Warranty<span className="text-teal">Buddy</span></span>
          </Link>
          <div className="hidden items-center gap-8 lg:flex">
            <Link href="/#features" className="text-sm font-medium text-[#C3CEDE] hover:text-white">
              Features
            </Link>
            <Link href="/#pricing" className="text-sm font-medium text-[#C3CEDE] hover:text-white">
              Pricing
            </Link>
            <Link href="/recall-check" className="text-sm font-medium text-[#C3CEDE] hover:text-white">
              Recall checker
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="whitespace-nowrap rounded-[10px] border border-white/20 px-2.5 py-1.5 text-xs font-bold text-white hover:border-white hover:bg-white/5 sm:px-4 sm:py-2 sm:text-sm"
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="whitespace-nowrap rounded-[10px] bg-teal px-2.5 py-1.5 text-xs font-bold text-navy hover:bg-teal/90 sm:px-4 sm:py-2 sm:text-sm"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex flex-1 items-center justify-center px-4 py-10">{children}</main>

      <footer className="border-t border-white/10 py-6 text-[12.5px] text-[#8DA0BC]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6">
          <span>© {new Date().getFullYear()} WarrantyBuddy · mywarrantybuddy.com</span>
          <span className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms of Service
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
