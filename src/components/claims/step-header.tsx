import Image from "next/image";

export function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <Image src="/brand/buddy-soft.svg" alt="" width={36} height={44} className="shrink-0" />
      <div>
        <div className="mb-1 text-base font-medium text-foreground">{title}</div>
        <div className="text-xs leading-relaxed text-ink">{subtitle}</div>
      </div>
    </div>
  );
}
