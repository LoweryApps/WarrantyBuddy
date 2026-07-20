"use client";

import { useRef, useState, type ReactNode } from "react";
import { Calendar, Check, Receipt as ReceiptIcon, ScanLine } from "lucide-react";
import {
  CLAIM_READINESS_LABEL,
  computeClaimReadiness,
  type ClaimReadinessFactor,
} from "@/lib/claim-readiness";
import { createClient } from "@/lib/supabase/client";
import { uploadProductFile } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";

const RING_COLOR = {
  "needs-attention": "border-red bg-red/5",
  "almost-there": "border-amber bg-amber/5",
  "claim-ready": "border-teal bg-teal/5",
};

function PurchaseDateFix({ productId, onSaved }: { productId: string; onSaved: () => void }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!value) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("products").update({ purchase_date: value }).eq("id", productId);
    setSaving(false);
    onSaved();
  }

  return (
    <div className="mb-2 flex items-center gap-2 rounded-lg bg-cloud p-2.5">
      <Calendar className="h-4 w-4 shrink-0 text-ink" />
      <div className="flex-1 text-xs text-foreground">Add purchase date</div>
      <input
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 rounded-md border border-border bg-white px-2 text-[11px]"
      />
      <button
        type="button"
        disabled={!value || saving}
        onClick={save}
        className="rounded-md bg-teal px-2.5 py-1.5 text-[11px] font-medium text-navy disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

function SerialNumberFix({ productId, onSaved }: { productId: string; onSaved: () => void }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!value.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("products").update({ serial_number: value.trim() }).eq("id", productId);
    setSaving(false);
    onSaved();
  }

  return (
    <div className="mb-2 flex items-center gap-2 rounded-lg bg-cloud p-2.5">
      <ScanLine className="h-4 w-4 shrink-0 text-ink" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
        }}
        placeholder="Add serial number"
        className="h-8 flex-1 rounded-md border border-border bg-white px-2 text-[11px]"
      />
      <button
        type="button"
        disabled={!value.trim() || saving}
        onClick={save}
        className="rounded-md bg-teal px-2.5 py-1.5 text-[11px] font-medium text-navy disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

function ReceiptFix({ productId, onSaved }: { productId: string; onSaved: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Your session expired — please sign in again.");
      setUploading(false);
      return;
    }

    try {
      const path = await uploadProductFile(supabase, { userId: user.id, productId, file });
      const { error: insertError } = await supabase.from("documents").insert({
        product_id: productId,
        document_type: "Receipt",
        file_url: path,
        file_name: file.name,
        file_size_kb: Math.round(file.size / 1024),
      });
      if (insertError) throw insertError;
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mb-2 flex items-center gap-2 rounded-lg bg-cloud p-2.5">
      <ReceiptIcon className="h-4 w-4 shrink-0 text-ink" />
      <div className="flex-1 text-xs text-foreground">{error ?? "Upload proof of purchase"}</div>
      <label className="cursor-pointer rounded-md bg-teal px-2.5 py-1.5 text-[11px] font-medium text-navy">
        {uploading ? "Uploading…" : "Upload"}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </label>
    </div>
  );
}

const FIX_COMPONENTS: Record<ClaimReadinessFactor, typeof PurchaseDateFix> = {
  purchaseDate: PurchaseDateFix,
  serialNumber: SerialNumberFix,
  receipt: ReceiptFix,
};

export function ClaimReadiness({
  productId,
  hasReceipt,
  purchaseDate,
  serialNumber,
  onChanged,
  children,
}: {
  productId: string;
  hasReceipt: boolean;
  purchaseDate: string | null;
  serialNumber: string | null;
  onChanged: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { score, missing, band } = computeClaimReadiness({ hasReceipt, purchaseDate, serialNumber });

  return (
    <div className="mb-4">
      <div className="flex items-start justify-between gap-3">
        {children}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={`Claim-readiness score ${score} out of 100 — ${CLAIM_READINESS_LABEL[band]}`}
          className={cn(
            "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-[3px] transition-colors",
            RING_COLOR[band],
          )}
        >
          <span className="text-sm font-semibold text-navy">{score}</span>
          <span className="text-[8px] text-ink">/100</span>
        </button>
      </div>

      {open ? (
        <div className="mt-3 rounded-xl border border-border bg-white p-3.5">
          <div className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-navy">
            {band === "claim-ready" ? <Check className="h-3.5 w-3.5 text-teal" /> : null}
            {CLAIM_READINESS_LABEL[band]}
            {missing.length > 0 ? (
              <span className="font-normal text-ink">
                — {missing.length} thing{missing.length === 1 ? "" : "s"} left for a claim-ready score
              </span>
            ) : null}
          </div>

          {missing.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-ink">
              Claim Assist has everything it needs to run for this product right now.
            </p>
          ) : (
            missing.map((factor) => {
              const Fix = FIX_COMPONENTS[factor];
              return <Fix key={factor} productId={productId} onSaved={onChanged} />;
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
