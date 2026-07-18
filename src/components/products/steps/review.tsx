"use client";

import { useState } from "react";
import { AlertTriangle, Check, Sparkles } from "lucide-react";
import { AuthInput } from "@/components/auth/auth-input";
import { CategorySelect } from "@/components/products/category-select";
import type { InputMethod, ProductDraft, SavedProduct } from "@/components/products/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function FieldLabel({
  children,
  field,
  uncertain,
  aiFilled,
}: {
  children: React.ReactNode;
  field: keyof ProductDraft;
  uncertain: Set<keyof ProductDraft>;
  aiFilled: Set<keyof ProductDraft>;
}) {
  return (
    <Label className="flex items-center gap-1.5 text-xs font-medium text-ink">
      {children}
      {uncertain.has(field) ? (
        <span className="flex items-center gap-0.5 text-[10px] font-normal text-amber">
          <AlertTriangle className="h-2.5 w-2.5" /> check this
        </span>
      ) : aiFilled.has(field) ? (
        <span className="flex items-center gap-0.5 text-[10px] font-normal text-teal">
          <Sparkles className="h-2.5 w-2.5" /> Buddy
        </span>
      ) : null}
    </Label>
  );
}

export function Review({
  draft,
  uncertainFields,
  aiFilledFields,
  method,
  onSaved,
}: {
  draft: ProductDraft;
  uncertainFields: Set<keyof ProductDraft>;
  aiFilledFields: Set<keyof ProductDraft>;
  method: InputMethod | null;
  onSaved: (product: SavedProduct) => void;
}) {
  const [form, setForm] = useState(draft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const canSave = form.name.trim() && form.brand.trim() && form.category;
  const inputClass = (field: keyof ProductDraft) =>
    cn(uncertainFields.has(field) && "border-amber focus-visible:border-amber");

  async function handleSave() {
    setError(null);
    if (!canSave) {
      setError("Product name, brand, and category are required.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Your session expired — please sign in again.");
      setSaving(false);
      return;
    }

    const { data: product, error: insertError } = await supabase
      .from("products")
      .insert({
        user_id: user.id,
        name: form.name.trim(),
        brand: form.brand.trim(),
        model_number: form.modelNumber.trim() || null,
        serial_number: form.serialNumber.trim() || null,
        category: form.category || "Other",
        purchase_date: form.purchaseDate || null,
        purchase_price: form.purchasePrice ? Number(form.purchasePrice) : null,
        retailer: form.retailer.trim() || null,
      })
      .select("id, name")
      .single();

    if (insertError || !product) {
      setError(insertError?.message ?? "Couldn't save this product.");
      setSaving(false);
      return;
    }

    let recallMatch: SavedProduct["recallMatch"] = null;

    if (form.modelNumber.trim()) {
      const { data: recalls } = await supabase
        .from("recalls")
        .select("id, source, description, remedy, action_url")
        .ilike("brand", form.brand.trim())
        .contains("model_numbers", [form.modelNumber.trim()])
        .limit(1);

      const match = recalls?.[0];
      if (match) {
        recallMatch = {
          description: match.description,
          remedy: match.remedy,
          actionUrl: match.action_url,
        };
        await supabase.from("user_recall_alerts").insert({
          user_id: user.id,
          product_id: product.id,
          recall_id: match.id,
        });

        fetch("/api/recall-alert-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            productName: product.name,
            brand: form.brand.trim(),
            modelNumber: form.modelNumber.trim(),
            recallSource: match.source,
            recallDescription: match.description,
            recallRemedy: match.remedy,
          }),
        }).catch(() => {
          // Best-effort notification — never block the save flow.
        });
      }
    }

    let knownIssue: SavedProduct["knownIssue"] = null;
    if (form.brand.trim()) {
      const { data: brandMatches } = await supabase
        .from("product_intelligence")
        .select("model_number, failure_type, failure_description, complaint_count, severity, source, source_url")
        .ilike("brand", form.brand.trim())
        .eq("is_active", true);

      const modelLower = form.modelNumber.trim().toLowerCase();
      const best = (brandMatches ?? [])
        .filter((r) => !r.model_number || r.model_number.toLowerCase() === modelLower)
        .sort((a, b) => b.complaint_count - a.complaint_count)[0];

      if (best) {
        knownIssue = {
          failure_type: best.failure_type,
          failure_description: best.failure_description,
          complaint_count: best.complaint_count,
          severity: best.severity,
          source: best.source,
          source_url: best.source_url,
        };
      }
    }

    onSaved({ id: product.id, name: product.name, recallMatch, knownIssue });
  }

  return (
    <div className="p-4">
      {uncertainFields.size > 0 ? (
        <div className="mb-3.5 flex items-center gap-1.5 rounded-[10px] bg-amber/10 p-3 text-xs leading-snug text-amber">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {method === "label"
            ? "Buddy read this label — highlighted fields need your review"
            : "Buddy read this receipt — highlighted fields need your review"}
        </div>
      ) : null}

      {error ? (
        <Alert className="mb-3.5 border-red/30 bg-red/5 text-red">
          <AlertDescription className="text-red">{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-2.5 text-[10px] tracking-wide text-ink uppercase">Product details</div>

      <div className="mb-3.5 space-y-1.5">
        <FieldLabel field="name" uncertain={uncertainFields} aiFilled={aiFilledFields}>
          Product name <span className="text-red">*</span>
        </FieldLabel>
        <AuthInput
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className={inputClass("name")}
        />
      </div>

      <div className="mb-3.5 grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <FieldLabel field="brand" uncertain={uncertainFields} aiFilled={aiFilledFields}>
            Brand <span className="text-red">*</span>
          </FieldLabel>
          <AuthInput
            value={form.brand}
            onChange={(e) => set("brand", e.target.value)}
            className={inputClass("brand")}
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel field="modelNumber" uncertain={uncertainFields} aiFilled={aiFilledFields}>
            Model number
          </FieldLabel>
          <AuthInput
            value={form.modelNumber}
            onChange={(e) => set("modelNumber", e.target.value)}
            className={inputClass("modelNumber")}
          />
        </div>
      </div>

      <div className="mb-3.5 space-y-1.5">
        <FieldLabel field="serialNumber" uncertain={uncertainFields} aiFilled={aiFilledFields}>
          Serial number
        </FieldLabel>
        <AuthInput
          value={form.serialNumber}
          onChange={(e) => set("serialNumber", e.target.value)}
          className={inputClass("serialNumber")}
        />
      </div>

      <div className="mb-3.5 space-y-1.5">
        <FieldLabel field="category" uncertain={uncertainFields} aiFilled={aiFilledFields}>
          Category <span className="text-red">*</span>
        </FieldLabel>
        <CategorySelect value={form.category} onChange={(v) => set("category", v)} />
      </div>

      <div className="mb-2.5 mt-5 text-[10px] tracking-wide text-ink uppercase">Purchase info</div>

      <div className="mb-3.5 grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <FieldLabel field="purchaseDate" uncertain={uncertainFields} aiFilled={aiFilledFields}>
            Purchase date
          </FieldLabel>
          <AuthInput
            type="date"
            value={form.purchaseDate}
            onChange={(e) => set("purchaseDate", e.target.value)}
            className={inputClass("purchaseDate")}
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel field="purchasePrice" uncertain={uncertainFields} aiFilled={aiFilledFields}>
            Price paid
          </FieldLabel>
          <AuthInput
            type="number"
            step="0.01"
            value={form.purchasePrice}
            onChange={(e) => set("purchasePrice", e.target.value)}
            className={inputClass("purchasePrice")}
          />
        </div>
      </div>

      <div className="mb-5 space-y-1.5">
        <FieldLabel field="retailer" uncertain={uncertainFields} aiFilled={aiFilledFields}>
          Retailer
        </FieldLabel>
        <AuthInput
          value={form.retailer}
          onChange={(e) => set("retailer", e.target.value)}
          className={inputClass("retailer")}
        />
      </div>

      <Button
        disabled={!canSave || saving}
        onClick={handleSave}
        className="h-12 w-full rounded-xl bg-teal font-semibold text-navy hover:bg-teal/90"
      >
        {saving ? "Saving…" : "Save product"}
        {!saving ? <Check className="h-4 w-4" /> : null}
      </Button>
    </div>
  );
}
