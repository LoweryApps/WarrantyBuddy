import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: number;
  note: string;
  tone?: "default" | "teal" | "amber" | "red";
}) {
  const toneClasses = {
    default: "text-navy",
    teal: "text-teal",
    amber: "text-amber",
    red: "text-red",
  }[tone];

  return (
    <div className="rounded-[10px] border border-border bg-white p-3">
      <div className="text-[10px] tracking-wide text-ink uppercase">{label}</div>
      <div className={cn("text-[22px] leading-none font-medium", toneClasses)}>
        {value}
      </div>
      <div className="mt-1 text-[10px] text-ink">{note}</div>
    </div>
  );
}
