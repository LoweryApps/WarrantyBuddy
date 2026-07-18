import { notFound } from "next/navigation";
import { ProductDetailView } from "@/components/products/detail/product-detail-view";
import type {
  DocumentRecord,
  ProductRecord,
  RecallAlertRecord,
  WarrantyRecord,
} from "@/components/products/detail/types";
import { createClient } from "@/lib/supabase/server";

interface ProductWithRelations extends ProductRecord {
  warranties: WarrantyRecord[];
  documents: DocumentRecord[];
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const supabase = await createClient();

  const [{ data: product, error }, { data: recallAlerts }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, brand, model_number, serial_number, category, purchase_date, purchase_price, retailer, photo_url, warranties(id, warranty_type, start_date, end_date, coverage_description, exclusions, claim_contact, document_url, ai_extracted, created_at), documents(id, document_type, file_url, file_name, file_size_kb, uploaded_at)",
      )
      .eq("id", productId)
      .single()
      .returns<ProductWithRelations>(),
    supabase
      .from("user_recall_alerts")
      .select("id, acknowledged, notified_at, recalls(id, source, recall_date, description, remedy, action_url)")
      .eq("product_id", productId)
      .order("notified_at", { ascending: false })
      .returns<RecallAlertRecord[]>(),
  ]);

  if (error || !product) {
    notFound();
  }

  const latestWarranty =
    [...product.warranties].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0] ?? null;

  return (
    <ProductDetailView
      product={product}
      warranty={latestWarranty}
      documents={product.documents}
      recallAlerts={recallAlerts ?? []}
    />
  );
}
