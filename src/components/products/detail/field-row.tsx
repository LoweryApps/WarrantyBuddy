import type { LucideIcon } from "lucide-react";

export function FieldRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-b-0">
      <span className="flex items-center gap-1.5 text-xs text-ink">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="flex items-center gap-2 text-xs text-foreground">{children}</span>
    </div>
  );
}
