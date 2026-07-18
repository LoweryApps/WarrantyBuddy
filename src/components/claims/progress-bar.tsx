import { cn } from "@/lib/utils";

const STEP_LABELS = [
  "Proof of purchase",
  "Warranty window check",
  "Claim path",
  "Credit card coverage check",
  "Buddy's claim email draft",
];

export function ClaimProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-5">
      <div className="mb-1.5 flex gap-1">
        {STEP_LABELS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-[3px] flex-1 rounded-full bg-border",
              i + 1 < step && "bg-teal",
              i + 1 === step && "bg-navy",
            )}
          />
        ))}
      </div>
      <div className="text-[10px] text-ink">
        Step {step} of 5 — {STEP_LABELS[step - 1]}
      </div>
    </div>
  );
}
