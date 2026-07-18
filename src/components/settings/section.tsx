import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function SettingsSection({
  icon: Icon,
  iconTone = "navy",
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  iconTone?: "navy" | "teal" | "amber";
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const toneClasses = {
    navy: "bg-navy/10 text-navy",
    teal: "bg-teal/10 text-teal",
    amber: "bg-amber/15 text-amber",
  }[iconTone];

  return (
    <div className="mb-3.5 overflow-hidden rounded-xl border border-border bg-white">
      <div className="flex items-center gap-2.5 border-b border-border p-3.5">
        <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", toneClasses)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div>
          <div className="text-[13px] font-medium text-foreground">{title}</div>
          <div className="text-[11px] text-ink">{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function SettingsRow({
  label,
  sublabel,
  children,
  className,
}: {
  label: string;
  sublabel?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 border-b border-border p-3.5 last:border-b-0", className)}>
      <div className="flex-1">
        <div className="text-xs text-foreground">{label}</div>
        {sublabel ? <div className="mt-0.5 text-[11px] text-ink">{sublabel}</div> : null}
      </div>
      {children}
    </div>
  );
}
