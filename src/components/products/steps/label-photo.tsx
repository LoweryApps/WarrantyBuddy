"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { PhotoCaptureArea } from "@/components/products/photo-capture-area";
import type { ProductDraft } from "@/components/products/types";
import { Button } from "@/components/ui/button";

interface LabelExtraction {
  brand: string | null;
  model_number: string | null;
  serial_number: string | null;
  uncertain: string[];
}

const FIELD_MAP: Record<string, keyof ProductDraft> = {
  brand: "brand",
  model_number: "modelNumber",
  serial_number: "serialNumber",
};

export function LabelPhoto({
  onCaptured,
}: {
  onCaptured: (
    partial: Partial<ProductDraft>,
    uncertain: (keyof ProductDraft)[],
    aiFilled: (keyof ProductDraft)[],
  ) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ notConfigured: boolean; message: string } | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("kind", "label");
    formData.append("image", file);

    try {
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      const body = await res.json();

      if (res.status === 503) {
        setError({ notConfigured: true, message: body.message });
        return;
      }
      if (!res.ok) {
        setError({ notConfigured: false, message: body.message ?? "Couldn't read that label." });
        return;
      }

      const data: LabelExtraction = body.data;
      const partial: Partial<ProductDraft> = {};
      const aiFilled: (keyof ProductDraft)[] = [];

      for (const [apiKey, draftKey] of Object.entries(FIELD_MAP)) {
        const value = data[apiKey as keyof LabelExtraction];
        if (typeof value === "string" && value) {
          (partial as Record<keyof ProductDraft, string>)[draftKey] = value;
          aiFilled.push(draftKey);
        }
      }

      const uncertain = (data.uncertain ?? [])
        .map((k) => FIELD_MAP[k])
        .filter((k): k is keyof ProductDraft => !!k);

      onCaptured(partial, uncertain, aiFilled);
    } catch {
      setError({ notConfigured: false, message: "Something went wrong reading that photo." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <PhotoCaptureArea
        hint={"Photograph the label on the back\nor bottom of the product"}
        onFileSelected={handleFile}
        disabled={loading}
      />

      {loading ? (
        <div className="mt-3.5 flex items-center gap-2 rounded-[10px] bg-teal/10 p-3 text-xs text-teal">
          <Sparkles className="h-4 w-4 animate-pulse" />
          Buddy is reading your label…
        </div>
      ) : error ? (
        <div className="mt-3.5 rounded-[10px] bg-red/5 p-3 text-xs text-red">
          {error.message}
          {error.notConfigured ? (
            <Button
              type="button"
              onClick={() => onCaptured({}, [], [])}
              className="mt-2.5 h-9 w-full rounded-lg bg-navy text-xs font-medium text-white hover:bg-navy/90"
            >
              Continue and fill in manually
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="mt-3.5 flex items-center gap-1.5 rounded-[10px] bg-teal/10 p-3 text-xs leading-snug text-teal">
          <Sparkles className="h-4 w-4 shrink-0" />
          Buddy will read the make, model, and serial number automatically
        </div>
      )}
    </div>
  );
}
