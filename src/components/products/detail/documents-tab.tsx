"use client";

import { useState } from "react";
import { BookOpen, Download, FileText, Image as ImageIcon, Receipt, Trash2, Upload } from "lucide-react";
import { DocumentUploadDialog } from "@/components/products/document-upload-dialog";
import type { DocumentRecord } from "@/components/products/detail/types";
import { createClient } from "@/lib/supabase/client";
import { getSignedUrl, removeProductFile } from "@/lib/supabase/storage";
import type { DocumentType } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<DocumentType, typeof FileText> = {
  Warranty: FileText,
  Receipt: Receipt,
  Manual: BookOpen,
  Photo: ImageIcon,
  Other: FileText,
};

const TYPE_CLASSES: Record<DocumentType, string> = {
  Warranty: "bg-teal/10 text-teal",
  Receipt: "bg-amber/15 text-amber",
  Manual: "bg-navy/10 text-navy",
  Photo: "bg-ink/10 text-ink",
  Other: "bg-ink/10 text-ink",
};

function formatMeta(doc: DocumentRecord) {
  const sizeLabel = doc.file_size_kb
    ? doc.file_size_kb >= 1024
      ? `${(doc.file_size_kb / 1024).toFixed(1)} MB`
      : `${doc.file_size_kb} KB`
    : null;
  const dateLabel = new Date(doc.uploaded_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return [doc.document_type, sizeLabel, `Added ${dateLabel}`].filter(Boolean).join(" · ");
}

export function DocumentsTab({
  productId,
  documents,
  onChanged,
}: {
  productId: string;
  documents: DocumentRecord[];
  onChanged: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDownload(doc: DocumentRecord) {
    const supabase = createClient();
    const url = await getSignedUrl(supabase, doc.file_url);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleDelete(doc: DocumentRecord) {
    setBusyId(doc.id);
    const supabase = createClient();
    try {
      await removeProductFile(supabase, doc.file_url);
      await supabase.from("documents").delete().eq("id", doc.id);
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {documents.length === 0 ? (
        <div className="mb-3.5 rounded-lg border border-dashed border-border bg-cloud p-6 text-center text-xs text-ink">
          No documents yet
        </div>
      ) : (
        <div className="mb-3.5 space-y-2">
          {documents.map((doc) => {
            const Icon = TYPE_ICON[doc.document_type];
            return (
              <div
                key={doc.id}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-white p-2.5"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    TYPE_CLASSES[doc.document_type],
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-foreground">{doc.file_name}</div>
                  <div className="text-[10px] text-ink">{formatMeta(doc)}</div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDownload(doc)}
                    aria-label="Download"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-cloud text-ink hover:text-navy"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={busyId === doc.id}
                    onClick={() => handleDelete(doc)}
                    aria-label="Delete"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-cloud text-ink hover:text-red"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-cloud py-2.5 text-xs text-ink hover:border-ink/40"
      >
        <Upload className="h-3.5 w-3.5" />
        Upload a document
      </button>

      <DocumentUploadDialog
        productId={productId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUploaded={onChanged}
      />
    </div>
  );
}
