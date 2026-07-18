import { ChevronLeft } from "lucide-react";

export function WizardTopbar({
  title,
  onBack,
  backLabel = "Back",
}: {
  title: string;
  onBack?: () => void;
  backLabel?: string;
}) {
  return (
    <div className="flex h-12 items-center gap-2 bg-navy px-4">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-[13px] text-white/60 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </button>
      ) : (
        <div className="w-14" />
      )}
      <div className="flex-1 text-center text-[13px] font-medium text-white">{title}</div>
      <div className="w-14" />
    </div>
  );
}
