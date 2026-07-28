import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { CheckIcon, HeroVault } from "@/components/public/homepage-art";

export const metadata: Metadata = {
  title: "WarrantyBuddy — Claim-ready in 5 minutes",
  description:
    "Snap a photo of any product and its receipt — Buddy files the details, tracks your warranty, and watches government recall lists so you don't have to.",
};

const FEATURES = [
  {
    title: "Recall monitoring",
    body: "Buddy checks CPSC, NHTSA, FDA and USDA recall lists once a day and matches them against what you own. If something you have is recalled, you'll know — with the remedy spelled out.",
    tag: "The thing nobody else does",
    tone: "teal" as const,
  },
  {
    title: "Snap and register",
    body: "Photograph a product label or receipt and Buddy reads the details — brand, model, serial, purchase date — and fills them in. No typing, no manuals, no digging.",
    tag: "Under 5 minutes per item",
    tone: "blue" as const,
  },
  {
    title: "Ask Buddy anything",
    body: '"Is my cracked screen covered?" "Which warranties expire soon?" Ask in plain words and Buddy answers from your actual documents — or drafts the claim email for you.',
    tag: "Your warranties, explained",
    tone: "purple" as const,
  },
];

const STEPS = [
  {
    n: 1,
    title: "Snap it",
    body: "Take a photo of the product label and receipt — or forward the order confirmation email. Buddy pulls out everything it needs automatically.",
  },
  {
    n: 2,
    title: "Buddy files it",
    body: "Your product, warranty terms, and proof of purchase land in one place. Buddy tracks the coverage window and flags what's missing to be claim-ready.",
  },
  {
    n: 3,
    title: "Relax",
    body: "Buddy watches for recalls and expiring warranties in the background. When something needs you, it reaches out — you don't have to remember to check.",
  },
];

const PLANS = [
  {
    name: "Free",
    desc: "Everything you need to get protected and stay recall-aware.",
    price: "$0",
    per: "/forever",
    sub: null,
    features: ["Up to 5 products", "Recall monitoring, always free", "Warranty & receipt storage", "Claim-readiness score"],
    cta: { label: "Get started free", href: "/sign-up" },
    featured: false,
  },
  {
    name: "Premium Annual",
    desc: "The full vault — AI, claim help, and unlimited everything.",
    price: "$44.99",
    per: "/year",
    sub: "Founding members get a discount for life",
    features: [
      "Everything in Free, unlimited",
      "Snap-to-register & document AI",
      "Ask Buddy + Claim Assist",
      "Receipt forwarding & insurance export",
    ],
    cta: { label: "Start free trial", href: "/sign-up" },
    featured: true,
  },
  {
    name: "Premium Monthly",
    desc: "Same full vault, billed month to month.",
    price: "$4.99",
    per: "/month",
    sub: "Founding members get a discount for life",
    features: ["Everything in Free, unlimited", "Snap-to-register & document AI", "Ask Buddy + Claim Assist", "Cancel anytime"],
    cta: { label: "Start free trial", href: "/sign-up" },
    featured: false,
  },
];

function FeatureIcon({ tone }: { tone: "teal" | "blue" | "purple" }) {
  const bg = tone === "teal" ? "bg-teal/10" : tone === "blue" ? "bg-[#EAF0FB]" : "bg-[#F1ECFB]";
  const stroke = tone === "teal" ? "#00A991" : tone === "blue" ? "#2E5AAC" : "#7C4DBE";
  return (
    <div className={`flex h-13 w-13 items-center justify-center rounded-[13px] ${bg}`}>
      {tone === "teal" ? (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      ) : tone === "blue" ? (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <rect x="3" y="6" width="18" height="14" rx="2" />
          <circle cx="12" cy="13" r="3.5" />
          <path d="M8 6l1.5-2h5L16 6" />
        </svg>
      ) : (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          <path d="M8 10h8M8 13h5" />
        </svg>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-navy/95 backdrop-blur">
        <div className="mx-auto flex h-[66px] max-w-6xl items-center justify-between px-6">
          <Link href="#top" className="flex items-center gap-2.5 font-display text-xl font-bold text-white">
            <Image src="/brand/buddy-soft.svg" alt="" width={26} height={32} />
            Warranty<span className="text-teal">Buddy</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#how" className="text-sm font-medium text-[#C3CEDE] hover:text-white">
              How it works
            </a>
            <a href="#features" className="text-sm font-medium text-[#C3CEDE] hover:text-white">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-[#C3CEDE] hover:text-white">
              Pricing
            </a>
            <a href="#recalls" className="text-sm font-medium text-[#C3CEDE] hover:text-white">
              Recall checker
            </a>
          </div>
          <div className="flex items-center gap-3.5">
            <Link
              href="/login"
              className="hidden rounded-[10px] border border-white/20 px-4.5 py-2.5 text-sm font-bold text-white hover:border-white hover:bg-white/5 sm:inline-flex"
            >
              Log in
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-[10px] bg-teal px-4.5 py-2.5 text-sm font-bold text-navy hover:bg-teal/90"
            >
              See how it works
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header
        id="top"
        className="bg-navy text-white"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-6 pt-16 pb-20 md:grid-cols-[1.05fr_.95fr] md:items-center md:pt-20 md:pb-24">
          <div>
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal/30 bg-teal/[0.13] px-3.5 py-1.5 text-xs font-semibold tracking-wide text-teal uppercase">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal" />
              Recall monitoring · works while you sleep
            </span>
            <h1 className="mb-5 font-display text-4xl leading-[1.05] font-bold md:text-[54px]">
              Everything you own, <span className="text-teal">claim-ready</span> in 5 minutes.
            </h1>
            <p className="mb-8 max-w-[480px] text-lg leading-relaxed text-[#C3CEDE]">
              Snap a photo of any product and its receipt — Buddy files the details, tracks your warranty, and watches government
              recall lists so you don&apos;t have to.
            </p>
            <div className="mb-6 flex flex-wrap gap-3.5">
              <a
                href="#how"
                className="rounded-xl bg-teal px-6.5 py-3.5 text-base font-bold text-navy hover:bg-teal/90"
              >
                See how it works
              </a>
              <a
                href="#recalls"
                className="rounded-xl border border-white/20 px-6.5 py-3.5 text-base font-bold text-white hover:border-white hover:bg-white/5"
              >
                Try the free recall checker
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#8DA0BC]">
              <span>Free to start</span>
              <span className="h-1 w-1 rounded-full bg-[#4A5D7E]" />
              <span>No card required</span>
              <span className="h-1 w-1 rounded-full bg-[#4A5D7E]" />
              <span>Set up in minutes</span>
            </div>
          </div>

          <HeroVault />
        </div>
      </header>

      {/* TRUST STRIP */}
      <div className="border-b border-border bg-cloud">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3.5 px-6 py-5 text-center">
          <span className="text-[13.5px] font-medium text-ink">Buddy checks these government recall sources once a day:</span>
          <div className="flex flex-wrap justify-center gap-2.5">
            {["CPSC", "NHTSA", "FDA", "USDA"].map((a) => (
              <span key={a} className="rounded-lg border border-border bg-white px-3 py-1.5 font-display text-[13px] font-semibold">
                {a}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" className="py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <div className="mb-3.5 font-display text-[13px] font-semibold tracking-widest text-teal-deep uppercase" style={{ color: "#00A991" }}>
              What Buddy does
            </div>
            <h2 className="mb-4 font-display text-3xl font-bold md:text-[38px]">Protection that works whether you&apos;re looking or not.</h2>
            <p className="text-lg text-ink">Three things that turn a drawer full of receipts into a vault that has your back.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-white p-7.5 transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-5">
                  <FeatureIcon tone={f.tone} />
                </div>
                <h3 className="mb-2.5 font-display text-xl font-semibold">{f.title}</h3>
                <p className="text-[15px] leading-relaxed text-ink">{f.body}</p>
                <span className="mt-4 inline-block rounded-full bg-teal/10 px-2.5 py-1 text-xs font-bold" style={{ color: "#00A991" }}>
                  {f.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-cloud py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <div className="mb-3.5 font-display text-[13px] font-semibold tracking-widest uppercase" style={{ color: "#00A991" }}>
              How it works
            </div>
            <h2 className="mb-4 font-display text-3xl font-bold md:text-[38px]">Three steps to claim-ready.</h2>
            <p className="text-lg text-ink">The whole point is that the hard part happens once, quickly — then Buddy takes it from there.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n}>
                <div className="mb-4.5 flex h-9.5 w-9.5 items-center justify-center rounded-[11px] border border-border bg-white font-display text-[15px] font-bold" style={{ color: "#00A991" }}>
                  {s.n}
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold">{s.title}</h3>
                <p className="text-[15px] leading-relaxed text-ink">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-13 text-center">
            <p className="font-display text-xl font-semibold text-navy md:text-[22px]">
              When something breaks, is stolen, or gets recalled —{" "}
              <span style={{ color: "#00A991" }}>you&apos;re already ready.</span>
            </p>
          </div>
        </div>
      </section>

      {/* RECALL CTA BAND */}
      <section id="recalls" className="py-5">
        <div className="mx-auto max-w-6xl px-6">
          <div className="relative grid gap-7 overflow-hidden rounded-3xl bg-navy p-9 md:grid-cols-[1.3fr_.7fr] md:items-center md:p-13">
            <div
              className="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(0,194,168,.22), transparent 70%)" }}
            />
            <div className="relative">
              <h2 className="mb-3.5 font-display text-2xl font-bold text-white md:text-[32px]">
                Not sure if something you own was recalled?
              </h2>
              <p className="max-w-[460px] text-base text-[#C3CEDE] md:text-[17px]">
                Check any product against every government recall list in one place — free, no account needed. It&apos;s the same
                watchlist Buddy runs for you automatically once you sign up.
              </p>
            </div>
            <div className="relative flex justify-center">
              <Link
                href="/recall-check"
                className="rounded-xl bg-teal px-6.5 py-3.5 text-base font-bold text-navy hover:bg-teal/90"
              >
                Try the free recall checker
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-cloud py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <div className="mb-3.5 font-display text-[13px] font-semibold tracking-widest uppercase" style={{ color: "#00A991" }}>
              Simple pricing
            </div>
            <h2 className="mb-4 font-display text-3xl font-bold md:text-[38px]">Start free. Upgrade when it saves you.</h2>
            <p className="text-lg text-ink">Recall monitoring is free for everyone — because safety shouldn&apos;t sit behind a paywall.</p>
          </div>
          <div className="grid items-stretch gap-5 md:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`relative flex flex-col rounded-[20px] border bg-white p-8 ${
                  p.featured ? "border-2 border-teal shadow-2xl" : "border-border"
                }`}
              >
                {p.featured ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-teal px-3.5 py-1 text-xs font-bold tracking-wide text-navy uppercase">
                    Best value
                  </div>
                ) : null}
                <div className="mb-1.5 font-display text-lg font-semibold">{p.name}</div>
                <div className="mb-5.5 min-h-10 text-sm text-ink">{p.desc}</div>
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="font-display text-xl font-semibold">{p.price}</span>
                  <span className="text-[15px] text-ink">{p.per}</span>
                </div>
                <div className="mb-6 min-h-5 text-[13px] font-semibold" style={{ color: "#00A991" }}>
                  {p.sub ?? " "}
                </div>
                <ul className="mb-7 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 py-1.5 text-[14.5px]">
                      <CheckIcon />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.cta.href}
                  className={`w-full rounded-[10px] py-3 text-center text-sm font-bold ${
                    p.featured ? "bg-teal text-navy hover:bg-teal/90" : "border border-border hover:bg-cloud"
                  }`}
                >
                  {p.cta.label}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6.5 text-center text-sm text-ink">
            First 100 members lock in founding pricing for life. Free 14-day trial of Premium — no charge if you cancel.
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 text-center">
        <div className="mx-auto max-w-6xl px-6">
          <Image src="/brand/buddy-soft.svg" alt="" width={64} height={79} className="mx-auto mb-6.5" />
          <h2 className="mx-auto mb-4.5 max-w-2xl font-display text-3xl font-bold md:text-[42px]">
            The best time to organize a warranty is <span style={{ color: "#00A991" }}>before</span> you need it.
          </h2>
          <p className="mx-auto mb-8.5 max-w-[520px] text-lg text-ink">
            Set up your first product in the next five minutes and let Buddy watch your back from here.
          </p>
          <div className="flex flex-wrap justify-center gap-3.5">
            <Link href="/sign-up" className="rounded-xl bg-navy px-6.5 py-3.5 text-base font-bold text-white hover:bg-navy/90">
              Get started free
            </Link>
            <Link
              href="/recall-check"
              className="rounded-xl border border-border px-6.5 py-3.5 text-base font-bold hover:bg-cloud"
            >
              Try the recall checker
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto bg-navy py-14 text-[#8DA0BC]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 border-b border-white/10 pb-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <div className="mb-3.5 flex items-center gap-2.5 font-display text-xl font-bold text-white">
                <Image src="/brand/buddy-soft.svg" alt="" width={26} height={32} />
                Warranty<span className="text-teal">Buddy</span>
              </div>
              <p className="max-w-[260px] text-sm leading-relaxed">
                The friendly shield who reads the fine print, tracks your coverage, and files the claim — so you don&apos;t have to.
              </p>
            </div>
            <div>
              <h4 className="mb-3.5 font-display text-sm font-semibold text-white">Product</h4>
              <a href="#features" className="mb-2.5 block text-sm hover:text-white">
                Features
              </a>
              <a href="#how" className="mb-2.5 block text-sm hover:text-white">
                How it works
              </a>
              <a href="#pricing" className="mb-2.5 block text-sm hover:text-white">
                Pricing
              </a>
              <Link href="/recall-check" className="mb-2.5 block text-sm hover:text-white">
                Recall checker
              </Link>
            </div>
            <div>
              <h4 className="mb-3.5 font-display text-sm font-semibold text-white">Get started</h4>
              <Link href="/sign-up" className="mb-2.5 block text-sm hover:text-white">
                Sign up
              </Link>
              <Link href="/login" className="mb-2.5 block text-sm hover:text-white">
                Log in
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-5 text-[13px]">
            <span>© {new Date().getFullYear()} WarrantyBuddy · mywarrantybuddy.com</span>
            <span className="max-w-[640px] leading-relaxed">
              Recall data is sourced from public U.S. government agencies and provided for convenience. WarrantyBuddy checks these
              sources once daily but does not guarantee every recall is captured, and is not a substitute for official government
              recall resources.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
