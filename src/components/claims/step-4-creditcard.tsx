import { CreditCard, FileSearch, Info } from "lucide-react";
import { StepHeader } from "@/components/claims/step-header";
import { Button } from "@/components/ui/button";

export function Step4CreditCard({ onContinue }: { onContinue: () => void }) {
  return (
    <div>
      <StepHeader
        title="One more protection you may have"
        subtitle="Many credit cards automatically extend manufacturer warranties. Worth checking even if you're already covered."
      />

      <div className="mb-4 rounded-xl border border-border bg-white p-3.5">
        <div className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
          <CreditCard className="h-3.5 w-3.5" />
          Credit card extended warranty
        </div>

        <div className="flex items-start gap-2.5 border-b border-border py-2.5">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy/10 text-navy">
            <Info className="h-3 w-3" />
          </div>
          <div>
            <div className="text-xs font-medium text-foreground">Cards that commonly offer this</div>
            <div className="text-[11px] leading-relaxed text-ink">
              Visa Signature, Mastercard World, Chase Sapphire, Amex Platinum,
              Citi Double Cash, and many others typically add a year to
              manufacturer warranties.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 py-2.5">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy/10 text-navy">
            <FileSearch className="h-3 w-3" />
          </div>
          <div>
            <div className="text-xs font-medium text-foreground">How to check</div>
            <div className="text-[11px] leading-relaxed text-ink">
              Call the number on the back of the card you used for this
              purchase, or search your card&apos;s benefits guide for
              &quot;extended warranty&quot; or &quot;purchase protection.&quot;
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          onClick={onContinue}
          className="h-11 w-full rounded-lg bg-navy font-medium text-white hover:bg-navy/90"
        >
          Got it — draft my claim email →
        </Button>
        <Button
          onClick={onContinue}
          variant="outline"
          className="h-10 w-full rounded-lg border-border text-ink hover:bg-cloud"
        >
          Skip — go to email draft
        </Button>
      </div>
    </div>
  );
}
