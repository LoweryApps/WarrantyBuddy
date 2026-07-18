"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { KnownIssueBanner, type KnownIssueRecord } from "@/components/product-intelligence/known-issue-banner";
import { PaywallBlock } from "@/components/paywall/paywall-block";
import { UpgradeDialog } from "@/components/paywall/upgrade-dialog";
import { ClaimProgressBar } from "@/components/claims/progress-bar";
import { Step1Proof } from "@/components/claims/step-1-proof";
import { Step2Warranty } from "@/components/claims/step-2-warranty";
import { Step3Contact } from "@/components/claims/step-3-contact";
import { Step4CreditCard } from "@/components/claims/step-4-creditcard";
import { Step5Email } from "@/components/claims/step-5-email";
import type { ClaimProduct, ClaimReceipt, ClaimRecall, ClaimWarranty } from "@/components/claims/types";

export function ClaimAssistWizard({
  premium,
  product,
  warranty,
  receipt,
  recall,
  knownIssue,
}: {
  premium: boolean;
  product: ClaimProduct;
  warranty: ClaimWarranty | null;
  receipt: ClaimReceipt | null;
  recall: ClaimRecall | null;
  knownIssue: KnownIssueRecord | null;
}) {
  const [step, setStep] = useState(1);
  const [upgradeOpen, setUpgradeOpen] = useState(premium ? false : true);

  if (!premium) {
    return (
      <div className="mx-auto max-w-xl pb-16">
        <div className="flex h-12 items-center gap-2 bg-navy px-4">
          <Link
            href={`/products/${product.id}`}
            className="flex items-center gap-1 text-[13px] text-white/60 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Product
          </Link>
          <div className="flex-1 text-center text-[13px] font-medium text-white">Claim Assist</div>
          <div className="w-14" />
        </div>
        <PaywallBlock
          title="Claim Assist is a Premium feature"
          message="Upgrade to Premium to get a guided claim flow with an AI-drafted claim email for this product."
          onUpgrade={() => setUpgradeOpen(true)}
        />
        <UpgradeDialog
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          reason="Claim Assist is a Premium feature."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl pb-16">
      <div className="flex h-12 items-center gap-2 bg-navy px-4">
        <Link
          href={`/products/${product.id}`}
          className="flex items-center gap-1 text-[13px] text-white/60 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Product
        </Link>
        <div className="flex-1 text-center text-[13px] font-medium text-white">Claim Assist</div>
        <div className="w-14" />
      </div>

      <div className="p-4">
        <ClaimProgressBar step={step} />

        {knownIssue ? <KnownIssueBanner record={knownIssue} className="mb-4" /> : null}

        {step === 1 ? (
          <Step1Proof product={product} receipt={receipt} onContinue={() => setStep(2)} />
        ) : null}
        {step === 2 ? (
          <Step2Warranty
            product={product}
            warranty={warranty}
            recall={recall}
            onContinue={() => setStep(3)}
          />
        ) : null}
        {step === 3 ? (
          <Step3Contact
            product={product}
            warranty={warranty}
            recall={recall}
            onContinue={() => setStep(4)}
          />
        ) : null}
        {step === 4 ? <Step4CreditCard onContinue={() => setStep(5)} /> : null}
        {step === 5 ? <Step5Email productId={product.id} /> : null}
      </div>
    </div>
  );
}
