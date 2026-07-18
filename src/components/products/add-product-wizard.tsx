"use client";

import { useState } from "react";
import { PaywallBlock } from "@/components/paywall/paywall-block";
import { UpgradeDialog } from "@/components/paywall/upgrade-dialog";
import { BarcodeScan } from "@/components/products/steps/barcode-scan";
import { ChooseMethod } from "@/components/products/steps/choose-method";
import { LabelPhoto } from "@/components/products/steps/label-photo";
import { ManualEntry } from "@/components/products/steps/manual-entry";
import { ReceiptPhoto } from "@/components/products/steps/receipt-photo";
import { Review } from "@/components/products/steps/review";
import { Success } from "@/components/products/steps/success";
import {
  EMPTY_DRAFT,
  type InputMethod,
  type ProductDraft,
  type SavedProduct,
  type WizardStep,
} from "@/components/products/types";
import { WizardTopbar } from "@/components/products/wizard-topbar";
import { FREE_PRODUCT_LIMIT } from "@/lib/entitlements";

const METHOD_TITLES: Record<InputMethod, string> = {
  barcode: "Scan barcode",
  label: "Label photo",
  receipt: "Receipt photo",
  manual: "Add manually",
};

export function AddProductWizard({
  premium = false,
  initialProductCount = 0,
}: {
  premium?: boolean;
  initialProductCount?: number;
}) {
  const [step, setStep] = useState<WizardStep>("method");
  const [method, setMethod] = useState<InputMethod | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_DRAFT);
  const [uncertainFields, setUncertainFields] = useState<Set<keyof ProductDraft>>(new Set());
  const [aiFilledFields, setAiFilledFields] = useState<Set<keyof ProductDraft>>(new Set());
  const [saved, setSaved] = useState<SavedProduct | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [productCount, setProductCount] = useState(initialProductCount);

  const atProductLimit = !premium && productCount >= FREE_PRODUCT_LIMIT;

  function handleSelectMethod(m: InputMethod) {
    setMethod(m);
    setStep("capture");
  }

  function handleCaptured(
    partial: Partial<ProductDraft>,
    uncertain: (keyof ProductDraft)[] = [],
    aiFilled: (keyof ProductDraft)[] = [],
  ) {
    setDraft((prev) => ({ ...prev, ...partial }));
    setUncertainFields(new Set(uncertain));
    setAiFilledFields(new Set(aiFilled));
    setStep("review");
  }

  function handleSaved(product: SavedProduct) {
    setSaved(product);
    setProductCount((c) => c + 1);
    setStep("success");
  }

  function handleAddAnother() {
    setMethod(null);
    setDraft(EMPTY_DRAFT);
    setUncertainFields(new Set());
    setAiFilledFields(new Set());
    setSaved(null);
    setStep("method");
  }

  return (
    <div className="mx-auto min-h-[calc(100vh-98px)] max-w-md bg-cloud">
      {step === "method" && (
        <>
          <WizardTopbar title="Add product" onBack={undefined} backLabel="Dashboard" />
          {atProductLimit ? (
            <PaywallBlock
              title={`You've reached the ${FREE_PRODUCT_LIMIT}-product free limit`}
              message="Upgrade to Premium for unlimited registered products, unlimited receipt forwarding, Buddy AI extraction, Claim Assist, and Ask Buddy."
              onUpgrade={() => setUpgradeOpen(true)}
            />
          ) : (
            <ChooseMethod onSelect={handleSelectMethod} />
          )}
        </>
      )}

      {step === "capture" && method && (
        <>
          <WizardTopbar title={METHOD_TITLES[method]} onBack={() => setStep("method")} />
          {method === "barcode" && <BarcodeScan onCaptured={handleCaptured} />}
          {method === "label" && <LabelPhoto onCaptured={handleCaptured} />}
          {method === "receipt" && <ReceiptPhoto onCaptured={handleCaptured} />}
          {method === "manual" && <ManualEntry draft={draft} onContinue={handleCaptured} />}
        </>
      )}

      {step === "review" && (
        <>
          <WizardTopbar title="Review & confirm" onBack={() => setStep("capture")} />
          <Review
            draft={draft}
            uncertainFields={uncertainFields}
            aiFilledFields={aiFilledFields}
            method={method}
            onSaved={handleSaved}
          />
        </>
      )}

      {step === "success" && saved && (
        <>
          <WizardTopbar title="Product saved" />
          <Success product={saved} onAddAnother={handleAddAnother} />
        </>
      )}

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason={`Free accounts can register up to ${FREE_PRODUCT_LIMIT} products.`}
      />
    </div>
  );
}
