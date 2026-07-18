"use client";

import { useState } from "react";
import { AlertTriangle, Sparkles, Upload } from "lucide-react";
import { AuthInput } from "@/components/auth/auth-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { uploadProductFile } from "@/lib/supabase/storage";
import type { WarrantyRecord } from "@/components/products/detail/types";
import type { WarrantyType } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const WARRANTY_TYPES: WarrantyType[] = ["Manufacturer", "Extended", "Retailer"];

type WarrantyField =
  | "start_date"
  | "end_date"
  | "coverage_description"
  | "exclusions"
  | "claim_contact";

const WARRANTY_FIELDS: WarrantyField[] = [
  "start_date",
  "end_date",
  "coverage_description",
  "exclusions",
  "claim_contact",
];

interface WarrantyExtraction {
  start_date: string | null;
  end_date: string | null;
  coverage_description: string | null;
  exclusions: string | null;
  claim_contact: string | null;
  uncertain: string[];
}

function FieldLabel({
  children,
  field,
  uncertain,
  aiFilled,
}: {
  children: React.ReactNode;
  field: WarrantyField;
  uncertain: Set<WarrantyField>;
  aiFilled: Set<WarrantyField>;
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

export function WarrantyForm({
  productId,
  existing,
  onSaved,
  onCancel,
}: {
  productId: string;
  existing: WarrantyRecord | null;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [warrantyType, setWarrantyType] = useState<WarrantyType>(
    existing?.warranty_type ?? "Manufacturer",
  );
  const [startDate, setStartDate] = useState(existing?.start_date ?? "");
  const [endDate, setEndDate] = useState(existing?.end_date ?? "");
  const [coverage, setCoverage] = useState(existing?.coverage_description ?? "");
  const [exclusions, setExclusions] = useState(existing?.exclusions ?? "");
  const [claimContact, setClaimContact] = useState(existing?.claim_contact ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [documentPath, setDocumentPath] = useState<string | null>(existing?.document_url ?? null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<{ tone: "error" | "info"; message: string } | null>(
    null,
  );
  const [uncertainFields, setUncertainFields] = useState<Set<WarrantyField>>(new Set());
  const [aiFilledFields, setAiFilledFields] = useState<Set<WarrantyField>>(new Set());
  const [usedAi, setUsedAi] = useState(existing?.ai_extracted ?? false);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadNotice(null);
    setUncertainFields(new Set());
    setAiFilledFields(new Set());

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUploadNotice({ tone: "error", message: "Your session expired — please sign in again." });
      setUploading(false);
      return;
    }

    try {
      const path = await uploadProductFile(supabase, { userId: user.id, productId, file });
      await supabase.from("documents").insert({
        product_id: productId,
        document_type: "Warranty",
        file_url: path,
        file_name: file.name,
        file_size_kb: Math.round(file.size / 1024),
      });
      setDocumentPath(path);
      setDocumentName(file.name);
    } catch (e) {
      setUploading(false);
      setUploadNotice({
        tone: "error",
        message: e instanceof Error ? e.message : "Couldn't upload that file.",
      });
      return;
    }

    const formData = new FormData();
    formData.append("kind", "warranty");
    formData.append("image", file);

    try {
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      const body = await res.json();

      if (res.status === 503) {
        setUploadNotice({
          tone: "info",
          message: `Document saved. ${body.message} Fill in the fields below manually.`,
        });
        return;
      }
      if (!res.ok) {
        setUploadNotice({
          tone: "info",
          message: "Document saved, but Buddy couldn't read it automatically — fill in the fields below.",
        });
        return;
      }

      const data: WarrantyExtraction = body.data;
      const filled = new Set<WarrantyField>();
      if (data.start_date) {
        setStartDate(data.start_date);
        filled.add("start_date");
      }
      if (data.end_date) {
        setEndDate(data.end_date);
        filled.add("end_date");
      }
      if (data.coverage_description) {
        setCoverage(data.coverage_description);
        filled.add("coverage_description");
      }
      if (data.exclusions) {
        setExclusions(data.exclusions);
        filled.add("exclusions");
      }
      if (data.claim_contact) {
        setClaimContact(data.claim_contact);
        filled.add("claim_contact");
      }

      const uncertain = new Set(
        (data.uncertain ?? []).filter((k): k is WarrantyField =>
          WARRANTY_FIELDS.includes(k as WarrantyField),
        ),
      );

      setAiFilledFields(filled);
      setUncertainFields(uncertain);
      setUsedAi(filled.size > 0);

      if (filled.size === 0) {
        setUploadNotice({
          tone: "info",
          message: "Document saved, but Buddy couldn't find warranty terms in it — fill in the fields below.",
        });
      }
    } catch {
      setUploadNotice({
        tone: "info",
        message: "Document saved, but Buddy couldn't read it automatically — fill in the fields below.",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const payload = {
      product_id: productId,
      warranty_type: warrantyType,
      start_date: startDate || null,
      end_date: endDate || null,
      coverage_description: coverage.trim() || null,
      exclusions: exclusions.trim() || null,
      claim_contact: claimContact.trim() || null,
      document_url: documentPath,
      ai_extracted: usedAi,
    };

    const { error: dbError } = existing
      ? await supabase.from("warranties").update(payload).eq("id", existing.id)
      : await supabase.from("warranties").insert(payload);

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    onSaved();
  }

  const inputClass = (field: WarrantyField) =>
    cn(uncertainFields.has(field) && "border-amber focus-visible:border-amber");

  return (
    <div className="space-y-3.5">
      {error ? (
        <Alert className="border-red/30 bg-red/5 text-red">
          <AlertDescription className="text-red">{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-ink">Warranty document</Label>
        <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-cloud py-2.5 text-center text-xs text-ink hover:border-ink/40">
          <Upload className="h-3.5 w-3.5 shrink-0" />
          {documentName ?? (documentPath ? "Replace document" : "Upload PDF or photo — Buddy will read it")}
          <input
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

        {uploading ? (
          <div className="flex items-center gap-2 rounded-[10px] bg-teal/10 p-3 text-xs text-teal">
            <Sparkles className="h-4 w-4 animate-pulse" />
            Buddy is reading your warranty document…
          </div>
        ) : uploadNotice ? (
          <div
            className={cn(
              "rounded-[10px] p-3 text-xs leading-relaxed",
              uploadNotice.tone === "error" ? "bg-red/5 text-red" : "bg-amber/10 text-amber",
            )}
          >
            {uploadNotice.message}
          </div>
        ) : usedAi ? (
          <div className="flex items-center gap-1.5 rounded-[10px] bg-teal/10 p-3 text-xs leading-snug text-teal">
            <Sparkles className="h-4 w-4 shrink-0" />
            Buddy read this document — review the highlighted fields below
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-ink">Warranty type</Label>
        <Select value={warrantyType} onValueChange={(v) => setWarrantyType(v as WarrantyType)}>
          <SelectTrigger className="h-11 w-full rounded-[10px] border-border bg-white px-3 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WARRANTY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <FieldLabel field="start_date" uncertain={uncertainFields} aiFilled={aiFilledFields}>
            Start date
          </FieldLabel>
          <AuthInput
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass("start_date")}
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel field="end_date" uncertain={uncertainFields} aiFilled={aiFilledFields}>
            End date
          </FieldLabel>
          <AuthInput
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass("end_date")}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel field="coverage_description" uncertain={uncertainFields} aiFilled={aiFilledFields}>
          What&apos;s covered
        </FieldLabel>
        <Textarea
          value={coverage}
          onChange={(e) => setCoverage(e.target.value)}
          placeholder="Parts and labor for manufacturing defects…"
          className={cn(
            "min-h-20 rounded-[10px] border-border bg-white text-sm",
            inputClass("coverage_description"),
          )}
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel field="exclusions" uncertain={uncertainFields} aiFilled={aiFilledFields}>
          What&apos;s not covered
        </FieldLabel>
        <Textarea
          value={exclusions}
          onChange={(e) => setExclusions(e.target.value)}
          placeholder="Cosmetic damage, improper installation…"
          className={cn(
            "min-h-20 rounded-[10px] border-border bg-white text-sm",
            inputClass("exclusions"),
          )}
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel field="claim_contact" uncertain={uncertainFields} aiFilled={aiFilledFields}>
          Claim contact
        </FieldLabel>
        <AuthInput
          value={claimContact}
          onChange={(e) => setClaimContact(e.target.value)}
          placeholder="Phone number, website, or email"
          className={inputClass("claim_contact")}
        />
      </div>

      <div className="flex gap-2 pt-1">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-11 flex-1 rounded-[10px] border-border text-foreground hover:bg-cloud"
          >
            Cancel
          </Button>
        ) : null}
        <Button
          disabled={saving || uploading}
          onClick={handleSave}
          className="h-11 flex-1 rounded-[10px] bg-teal font-semibold text-navy hover:bg-teal/90"
        >
          {saving ? "Saving…" : "Save warranty"}
        </Button>
      </div>
    </div>
  );
}
