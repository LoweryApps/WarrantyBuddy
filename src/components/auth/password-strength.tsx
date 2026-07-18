import { cn } from "@/lib/utils";

function scorePassword(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score++;
  return score;
}

const LABELS = ["Too short", "Weak password", "Okay password", "Strong password", "Very strong"];
const BAR_COLOR = ["bg-border", "bg-red", "bg-amber", "bg-teal", "bg-teal"];
const LABEL_COLOR = ["text-muted-foreground", "text-red", "text-amber", "text-teal", "text-teal"];

export function PasswordStrength({ password }: { password: string }) {
  const score = scorePassword(password);

  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-[3px] flex-1 rounded-full bg-border",
              i < score && BAR_COLOR[score],
            )}
          />
        ))}
      </div>
      {password ? (
        <p className={cn("mt-1 text-[11px]", LABEL_COLOR[score])}>{LABELS[score]}</p>
      ) : null}
    </div>
  );
}
