"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { AuthInput } from "@/components/auth/auth-input";
import type { ProductDraft } from "@/components/products/types";
import { Button } from "@/components/ui/button";
import { guessCategory } from "@/lib/products";

type CapturedFn = (
  partial: Partial<ProductDraft>,
  uncertain: (keyof ProductDraft)[],
  aiFilled: (keyof ProductDraft)[],
) => void;

export function BarcodeScan({ onCaptured }: { onCaptured: CapturedFn }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let controls: { stop: () => void } | undefined;
    let cancelled = false;

    import("@zxing/browser")
      .then(async ({ BrowserMultiFormatReader }) => {
        if (cancelled || !videoRef.current) return;
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result && !cancelled) {
              lookup(result.getText());
            }
          },
        );
      })
      .catch(() => {
        if (!cancelled) setCameraError("Camera unavailable — enter the barcode number below instead.");
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookup(barcode: string) {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch("/api/barcode-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      });
      const body = await res.json();

      if (!res.ok || !body.found) {
        setNotFound(true);
        return;
      }

      const partial: Partial<ProductDraft> = {
        name: body.model_name ?? "",
        brand: body.brand ?? "",
        modelNumber: body.model_number ?? "",
        category: guessCategory(body.category ?? body.model_name),
      };
      const aiFilled = (Object.keys(partial) as (keyof ProductDraft)[]).filter(
        (k) => partial[k],
      );
      onCaptured(partial, [], aiFilled);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <div className="relative mb-3.5 flex h-56 items-center justify-center overflow-hidden rounded-xl bg-navy">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-navy px-8 text-center text-xs text-white/50">
            {cameraError}
          </div>
        ) : null}
      </div>

      <div className="mb-3.5 flex items-center gap-1.5 rounded-[10px] bg-teal/10 p-3 text-xs leading-snug text-teal">
        <Sparkles className="h-4 w-4 shrink-0" />
        Buddy queries a product database by UPC/EAN — works best on consumer
        electronics and packaged goods
      </div>

      <div className="space-y-1.5">
        <div className="text-[10px] tracking-wide text-ink uppercase">
          Or enter the barcode number
        </div>
        <div className="flex gap-2">
          <AuthInput
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="e.g. 012345678905"
            inputMode="numeric"
          />
          <Button
            type="button"
            disabled={!manualCode.trim() || loading}
            onClick={() => lookup(manualCode.trim())}
            className="h-11 shrink-0 rounded-[10px] bg-navy px-3 text-white hover:bg-navy/90"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="mt-3.5 text-center text-xs text-ink">Looking that up…</div>
      ) : null}

      {notFound ? (
        <div className="mt-3.5 rounded-[10px] bg-amber/10 p-3 text-xs text-amber">
          No match found for that code. Try the label photo method instead — it
          works on nearly every product.
        </div>
      ) : null}
    </div>
  );
}
