// Small presentational pieces for the marketing homepage — the hero's "vault
// card" illustration (mirrors the in-app dashboard's look, but with fixed
// sample data since there's no logged-in user here) and a shared checkmark
// icon for the pricing list.

export function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00A991" strokeWidth="2.5" className="mt-0.5 shrink-0">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function HeroVault() {
  return (
    <div className="relative flex min-h-[340px] items-center justify-center md:min-h-[400px]">
      <div className="relative z-[2] w-full max-w-[340px] rounded-[22px] border border-white/10 bg-gradient-to-br from-[#1B2F52] to-[#132444] p-6 shadow-2xl">
        <div className="mb-5 flex items-center gap-3">
          <svg width="30" height="35" viewBox="0 0 100 118" aria-hidden="true">
            <path
              d="M50 4 C63 11 79 15 93 15 C93 48 89 80 50 114 C11 80 7 48 7 15 C21 15 37 11 50 4 Z"
              fill="#00C2A8"
            />
            <circle cx="36" cy="47" r="6.5" fill="#0F1F3D" />
            <circle cx="38.2" cy="44.8" r="2" fill="#fff" />
            <circle cx="64" cy="47" r="6.5" fill="#0F1F3D" />
            <circle cx="66.2" cy="44.8" r="2" fill="#fff" />
            <path d="M36 63 Q50 74 64 63" fill="none" stroke="#0F1F3D" strokeWidth="5" strokeLinecap="round" />
          </svg>
          <div>
            <div className="font-display text-[15px] font-semibold text-white">Your vault</div>
            <div className="text-xs text-[#8DA0BC]">8 products protected</div>
          </div>
          <div className="relative ml-auto h-[46px] w-[46px] shrink-0">
            <svg width="46" height="46" className="-rotate-90">
              <circle cx="23" cy="23" r="19" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="5" />
              <circle
                cx="23"
                cy="23"
                r="19"
                fill="none"
                stroke="#00C2A8"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="119"
                strokeDashoffset="18"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-display text-[15px] font-bold text-teal">
              85
            </span>
          </div>
        </div>

        <VaultRow
          stroke="#00C2A8"
          icon={
            <>
              <rect x="3" y="4" width="18" height="14" rx="2" />
              <path d="M8 21h8" />
            </>
          }
          title="Samsung 65&quot; QLED TV"
          sub="Warranty active · 187 days left"
          pillLabel="Active"
          pillTone="ok"
        />
        <VaultRow
          stroke="#F59E0B"
          icon={
            <>
              <path d="M3 7h18v13H3z" />
              <path d="M8 7V4h8v3" />
            </>
          }
          title="DeWalt Drill Kit"
          sub="Expires in 42 days"
          pillLabel="Expiring"
          pillTone="warn"
        />
        <VaultRow
          stroke="#E24B4A"
          icon={
            <>
              <path d="M12 3l9 16H3z" />
              <path d="M12 10v4M12 17h.01" />
            </>
          }
          title="Northwind Refrigerator"
          sub="Safety recall matched"
          pillLabel="Recall"
          pillTone="alert"
        />
      </div>

      <div className="absolute right-0 bottom-11 z-[3] hidden w-[250px] items-start gap-2.5 rounded-2xl bg-white p-3.5 text-navy shadow-2xl sm:flex md:-right-3.5">
        <svg width="30" height="34" viewBox="0 0 100 118" className="shrink-0" aria-hidden="true">
          <path
            d="M50 4 C63 11 79 15 93 15 C93 48 89 80 50 114 C11 80 7 48 7 15 C21 15 37 11 50 4 Z"
            fill="#00C2A8"
          />
          <circle cx="36" cy="47" r="6.5" fill="#0F1F3D" />
          <circle cx="38.2" cy="44.8" r="2" fill="#fff" />
          <circle cx="64" cy="47" r="6.5" fill="#0F1F3D" />
          <circle cx="66.2" cy="44.8" r="2" fill="#fff" />
          <path d="M36 63 Q50 74 64 63" fill="none" stroke="#0F1F3D" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <div>
          <div className="text-[13px] leading-tight font-bold">Heads up — a product you own was recalled.</div>
          <div className="mt-0.5 text-xs text-ink">Tap to see the remedy →</div>
        </div>
      </div>
    </div>
  );
}

function VaultRow({
  stroke,
  icon,
  title,
  sub,
  pillLabel,
  pillTone,
}: {
  stroke: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  pillLabel: string;
  pillTone: "ok" | "warn" | "alert";
}) {
  const pillClass =
    pillTone === "ok"
      ? "bg-teal/15 text-teal"
      : pillTone === "warn"
        ? "bg-amber/15 text-amber"
        : "bg-red/15 text-[#F08A89]";

  return (
    <div className="flex items-center gap-3 border-t border-white/10 py-3">
      <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[9px] bg-white/[0.06]">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
          {icon}
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-white">{title}</div>
        <div className="text-xs text-[#8DA0BC]">{sub}</div>
      </div>
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${pillClass}`}>{pillLabel}</span>
    </div>
  );
}
