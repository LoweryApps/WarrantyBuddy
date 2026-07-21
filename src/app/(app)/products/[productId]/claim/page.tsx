import { notFound } from "next/navigation";
import type { KnownIssueRecord } from "@/components/product-intelligence/known-issue-banner";
import { ClaimAssistWizard } from "@/components/claims/claim-assist-wizard";
import type { ClaimProduct, ClaimReceipt, ClaimRecall, ClaimWarranty } from "@/components/claims/types";
import { loadPremiumStatus } from "@/lib/get-entitlements";
import { bestPidMatches } from "@/lib/product-intelligence";
import { createClient } from "@/lib/supabase/server";

export default async function ClaimAssistPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    premium,
    { data: product, error },
    { data: warranties },
    { data: receipts },
    { data: alerts },
  ] = await Promise.all([
    user ? loadPremiumStatus(supabase, user.id) : Promise.resolve(false),
    supabase
      .from("products")
      .select("id, name, brand, model_number, serial_number, category, vin, purchase_date, purchase_price, retailer")
      .eq("id", productId)
      .single()
      .returns<ClaimProduct>(),
    supabase
      .from("warranties")
      .select("warranty_type, start_date, end_date, claim_contact, created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(1)
      .returns<(ClaimWarranty & { created_at: string })[]>(),
    supabase
      .from("documents")
      .select("file_name, uploaded_at")
      .eq("product_id", productId)
      .eq("document_type", "Receipt")
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .returns<ClaimReceipt[]>(),
    supabase
      .from("user_recall_alerts")
      .select("acknowledged, recalls(source, external_recall_id, description, remedy)")
      .eq("product_id", productId)
      .eq("acknowledged", false)
      .limit(1)
      .returns<{ acknowledged: boolean; recalls: ClaimRecall | null }[]>(),
  ]);

  if (error || !product) {
    notFound();
  }

  let knownIssue: KnownIssueRecord | null = null;
  if (product.brand) {
    const { data: pidMatches } = await supabase
      .from("product_intelligence")
      .select("model_number, failure_type, failure_description, complaint_count, severity, source, source_url")
      .ilike("brand", product.brand)
      .eq("is_active", true);

    knownIssue = bestPidMatches(pidMatches ?? [], product.model_number)[0] ?? null;
  }

  return (
    <ClaimAssistWizard
      premium={premium}
      product={product}
      warranty={warranties?.[0] ?? null}
      receipt={receipts?.[0] ?? null}
      recall={alerts?.[0]?.recalls ?? null}
      knownIssue={knownIssue}
    />
  );
}
