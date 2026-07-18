"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  CircleCheck,
  FileCheck,
  Plus,
  TriangleAlert,
} from "lucide-react";
import { KnownIssueBanner } from "@/components/product-intelligence/known-issue-banner";
import { DocumentUploadDialog } from "@/components/products/document-upload-dialog";
import type { SavedProduct } from "@/components/products/types";
import { Button } from "@/components/ui/button";

export function Success({
  product,
  onAddAnother,
}: {
  product: SavedProduct;
  onAddAnother: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [documentAdded, setDocumentAdded] = useState(false);

  return (
    <div className="p-4">
      <div className="py-5 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-teal/10 text-teal">
          <CircleCheck className="h-6 w-6" />
        </div>
        <div className="font-display text-base font-bold text-navy">{product.name} saved</div>
        <div className="mt-1 text-xs text-ink">Added to your vault</div>
      </div>

      {product.recallMatch ? (
        <div className="mb-4 rounded-xl border border-red/30 bg-red/5 p-3.5">
          <div className="mb-1.5 flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 shrink-0 text-red" />
            <div className="text-xs font-medium text-red">Recall found on this product</div>
          </div>
          <p className="mb-2.5 text-[11px] leading-relaxed text-red/80">
            {product.recallMatch.description ?? "Buddy found a recall matching this product."}
            {product.recallMatch.remedy ? ` Remedy: ${product.recallMatch.remedy}` : ""}
          </p>
          {product.recallMatch.actionUrl ? (
            <a
              href={product.recallMatch.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-red underline underline-offset-2"
            >
              View official recall details →
            </a>
          ) : null}
        </div>
      ) : null}

      {product.knownIssue ? (
        <KnownIssueBanner record={product.knownIssue} className="mb-4" />
      ) : null}

      <div className="mb-2.5 text-[10px] tracking-wide text-ink uppercase">Next steps</div>
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex w-full items-center gap-3 border-b border-border p-3.5 text-left"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal/10 text-teal">
            <FileCheck className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-navy">
              {documentAdded ? "Document added" : "Add warranty document"}
            </div>
            <div className="text-[11px] text-ink">
              {documentAdded ? "You can add more from the product page" : "Upload your warranty card or PDF"}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-ink" />
        </button>
        <button
          type="button"
          onClick={onAddAnother}
          className="flex w-full items-center gap-3 p-3.5 text-left"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cloud text-ink">
            <Plus className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-navy">Add another product</div>
            <div className="text-[11px] text-ink">Keep building your vault</div>
          </div>
          <ChevronRight className="h-4 w-4 text-ink" />
        </button>
      </div>

      <Link href="/dashboard">
        <Button className="mt-3.5 h-12 w-full rounded-xl bg-navy font-semibold text-white hover:bg-navy/90">
          Go to dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>

      <DocumentUploadDialog
        productId={product.id}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUploaded={() => setDocumentAdded(true)}
      />
    </div>
  );
}
