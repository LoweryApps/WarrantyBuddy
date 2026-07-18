"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { AuthInput } from "@/components/auth/auth-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { uploadProductFile } from "@/lib/supabase/storage";
import type { DocumentType } from "@/lib/supabase/types";

const DOCUMENT_TYPES: DocumentType[] = ["Warranty", "Receipt", "Manual", "Photo", "Other"];

export function DocumentUploadDialog({
  productId,
  open,
  onOpenChange,
  onUploaded,
}: {
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
}) {
  const [documentType, setDocumentType] = useState<DocumentType>("Warranty");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
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
        document_type: documentType,
        file_url: path,
        file_name: file.name,
        file_size_kb: Math.round(file.size / 1024),
      });
      if (insertError) throw insertError;

      setFile(null);
      onOpenChange(false);
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-base font-bold text-navy">
            Add a document
          </DialogTitle>
          <DialogDescription className="text-xs text-ink">
            Upload a warranty card, receipt, manual, or photo. PDF or image, up
            to 20MB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-ink">Document type</Label>
            <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
              <SelectTrigger className="h-11 w-full rounded-[10px] border-border bg-white px-3 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-ink">File</Label>
            <AuthInput
              type="file"
              accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="pt-2"
            />
          </div>

          {error ? <p className="text-xs text-red">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            disabled={!file || uploading}
            onClick={handleUpload}
            className="h-11 w-full rounded-[10px] bg-teal font-semibold text-navy hover:bg-teal/90"
          >
            <FileText className="h-4 w-4" />
            {uploading ? "Uploading…" : "Upload document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
