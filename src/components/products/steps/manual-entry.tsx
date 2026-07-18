"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { AuthInput } from "@/components/auth/auth-input";
import { CategorySelect } from "@/components/products/category-select";
import type { ProductDraft } from "@/components/products/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ManualEntry({
  draft,
  onContinue,
}: {
  draft: ProductDraft;
  onContinue: (partial: Partial<ProductDraft>) => void;
}) {
  const [form, setForm] = useState(draft);

  function set<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const canContinue = form.name.trim() && form.brand.trim() && form.category;

  return (
    <div className="p-4">
      <div className="mb-2.5 text-[10px] tracking-wide text-ink uppercase">
        Product details
      </div>

      <div className="mb-3.5 space-y-1.5">
        <Label className="text-xs font-medium text-ink">
          Product name <span className="text-red">*</span>
        </Label>
        <AuthInput
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder='e.g. LG OLED TV C3 65"'
        />
      </div>

      <div className="mb-3.5 grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-ink">
            Brand <span className="text-red">*</span>
          </Label>
          <AuthInput
            value={form.brand}
            onChange={(e) => set("brand", e.target.value)}
            placeholder="LG"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-ink">Model number</Label>
          <AuthInput
            value={form.modelNumber}
            onChange={(e) => set("modelNumber", e.target.value)}
            placeholder="OLED65C3PUA"
          />
        </div>
      </div>

      <div className="mb-3.5 space-y-1.5">
        <Label className="text-xs font-medium text-ink">Serial number</Label>
        <AuthInput
          value={form.serialNumber}
          onChange={(e) => set("serialNumber", e.target.value)}
          placeholder="e.g. SN123456789"
        />
      </div>

      <div className="mb-3.5 space-y-1.5">
        <Label className="text-xs font-medium text-ink">
          Category <span className="text-red">*</span>
        </Label>
        <CategorySelect value={form.category} onChange={(v) => set("category", v)} />
      </div>

      <div className="mb-2.5 mt-5 text-[10px] tracking-wide text-ink uppercase">
        Purchase info
      </div>

      <div className="mb-3.5 grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-ink">Purchase date</Label>
          <AuthInput
            type="date"
            value={form.purchaseDate}
            onChange={(e) => set("purchaseDate", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-ink">Price paid</Label>
          <AuthInput
            type="number"
            step="0.01"
            value={form.purchasePrice}
            onChange={(e) => set("purchasePrice", e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="mb-5 space-y-1.5">
        <Label className="text-xs font-medium text-ink">Retailer</Label>
        <AuthInput
          value={form.retailer}
          onChange={(e) => set("retailer", e.target.value)}
          placeholder="Best Buy"
        />
      </div>

      <Button
        disabled={!canContinue}
        onClick={() => onContinue(form)}
        className="h-12 w-full rounded-xl bg-teal font-semibold text-navy hover:bg-teal/90"
      >
        Continue
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
