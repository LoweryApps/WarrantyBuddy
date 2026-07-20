"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, TriangleAlert } from "lucide-react";
import { AskBuddyPanel } from "@/components/ask-buddy/ask-buddy-panel";
import { CategoryIcon } from "@/components/dashboard/category-icon";
import { WarrantyBadge } from "@/components/dashboard/warranty-badge";
import { ClaimReadiness } from "@/components/products/detail/claim-readiness";
import { DocumentsTab } from "@/components/products/detail/documents-tab";
import { EditProductDialog } from "@/components/products/detail/edit-product-dialog";
import { OverviewTab } from "@/components/products/detail/overview-tab";
import { RecallsTab } from "@/components/products/detail/recalls-tab";
import type {
  DocumentRecord,
  ProductRecord,
  RecallAlertRecord,
  WarrantyRecord,
} from "@/components/products/detail/types";
import { WarrantyTab } from "@/components/products/detail/warranty-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { warrantyStatus } from "@/lib/warranty";

export function ProductDetailView({
  product,
  warranty,
  documents,
  recallAlerts,
  premium,
}: {
  product: ProductRecord;
  warranty: WarrantyRecord | null;
  documents: DocumentRecord[];
  recallAlerts: RecallAlertRecord[];
  premium: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [buddyOpen, setBuddyOpen] = useState(false);

  const activeAlerts = recallAlerts.filter((a) => !a.acknowledged);
  const status = warranty ? warrantyStatus(warranty.end_date) : "none";

  function refresh() {
    router.refresh();
  }

  function handleFileClaim() {
    router.push(`/products/${product.id}/claim`);
  }

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <div className="flex h-12 items-center gap-2 bg-navy px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-[13px] text-white/60 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Vault
        </Link>
        <div className="flex-1 text-center text-[13px] font-medium text-white">
          Product detail
        </div>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="w-14 text-right text-[13px] text-teal"
        >
          Edit
        </button>
      </div>

      <div className="p-4">
        {activeAlerts.length > 0 ? (
          <button
            type="button"
            onClick={() => setTab("recalls")}
            className="mb-3.5 flex w-full items-start gap-2.5 rounded-[10px] border border-red/30 bg-red/5 p-3 text-left"
          >
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red" />
            <div>
              <div className="text-xs font-medium text-red">Recall on this product</div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-red/80">
                {activeAlerts[0].recalls?.description ?? "Buddy found a recall matching this product."}
              </div>
              <div className="mt-1 text-[11px] font-medium text-red underline underline-offset-2">
                View recall details →
              </div>
            </div>
          </button>
        ) : null}

        <ClaimReadiness
          productId={product.id}
          hasReceipt={documents.some((d) => d.document_type === "Receipt")}
          purchaseDate={product.purchase_date}
          serialNumber={product.serial_number}
          onChanged={refresh}
        >
          <div className="flex items-center gap-3">
            <CategoryIcon category={product.category} />
            <div>
              <div className="text-base font-medium text-foreground">{product.name}</div>
              <div className="text-xs text-ink">
                {[product.brand, product.model_number].filter(Boolean).join(" · ")}
              </div>
              <div className="mt-1">
                <WarrantyBadge status={status} />
              </div>
            </div>
          </div>
        </ClaimReadiness>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 w-full justify-start gap-1 border-b border-border bg-transparent p-0">
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-teal data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="warranty"
              className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-teal data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Warranty
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-teal data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Documents
            </TabsTrigger>
            <TabsTrigger
              value="recalls"
              className="rounded-none border-b-2 border-transparent px-3 py-2 text-xs data-[state=active]:border-teal data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Recalls
              {activeAlerts.length > 0 ? (
                <span className="ml-1 rounded-full bg-red px-1.5 py-0.5 text-[9px] text-white">
                  {activeAlerts.length}
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              product={product}
              onFileClaim={handleFileClaim}
              onAskBuddy={() => setBuddyOpen(true)}
            />
          </TabsContent>
          <TabsContent value="warranty">
            <WarrantyTab
              productId={product.id}
              brand={product.brand}
              modelNumber={product.model_number}
              purchaseDate={product.purchase_date}
              warranty={warranty}
              premium={premium}
              onFileClaim={handleFileClaim}
              onAskBuddy={() => setBuddyOpen(true)}
              onChanged={refresh}
            />
          </TabsContent>
          <TabsContent value="documents">
            <DocumentsTab productId={product.id} documents={documents} onChanged={refresh} />
          </TabsContent>
          <TabsContent value="recalls">
            <RecallsTab alerts={recallAlerts} onFileClaim={handleFileClaim} onChanged={refresh} />
          </TabsContent>
        </Tabs>
      </div>

      <EditProductDialog
        product={product}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={refresh}
      />

      {buddyOpen ? (
        <AskBuddyPanel
          mode="product"
          productId={product.id}
          productName={product.name}
          status={status}
          onUploadDocument={() => {
            setTab("documents");
            setBuddyOpen(false);
          }}
          onClose={() => setBuddyOpen(false)}
        />
      ) : null}
    </div>
  );
}
