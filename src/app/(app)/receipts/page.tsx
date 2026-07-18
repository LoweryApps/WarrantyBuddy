import { ReceiptQueueView } from "@/components/receipts/receipt-queue-view";
import type { ExistingProduct, ReceiptDraft } from "@/components/receipts/types";
import { FREE_RECEIPT_MONTHLY_LIMIT, getMonthlyConfirmedReceiptCount } from "@/lib/entitlements";
import { loadPremiumStatus } from "@/lib/get-entitlements";
import { thirtyDaysAgoIso } from "@/lib/receipts";
import { createClient } from "@/lib/supabase/server";

export default async function ReceiptsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const thirtyDaysAgo = thirtyDaysAgoIso();

  const [premium, monthlyCount, { data: pending }, { data: discarded }, { data: products }] =
    await Promise.all([
      user ? loadPremiumStatus(supabase, user.id) : Promise.resolve(false),
      user ? getMonthlyConfirmedReceiptCount(supabase, user.id) : Promise.resolve(0),
      supabase
        .from("forwarded_receipts")
        .select(
          "id, kind, source_email_subject, sender_domain, extracted_product_name, extracted_brand, extracted_price, extracted_order_date, extracted_order_number, extracted_retailer, extracted_warranty_start_date, extracted_warranty_end_date, extracted_coverage_description, extracted_exclusions, extracted_claim_contact, confidence_score, raw_email_url, received_at, discarded_at",
        )
        .eq("status", "Pending Review")
        .order("received_at", { ascending: false })
        .returns<ReceiptDraft[]>(),
      supabase
        .from("forwarded_receipts")
        .select(
          "id, kind, source_email_subject, sender_domain, extracted_product_name, extracted_brand, extracted_price, extracted_order_date, extracted_order_number, extracted_retailer, extracted_warranty_start_date, extracted_warranty_end_date, extracted_coverage_description, extracted_exclusions, extracted_claim_contact, confidence_score, raw_email_url, received_at, discarded_at",
        )
        .eq("status", "Discarded")
        .gte("discarded_at", thirtyDaysAgo)
        .order("discarded_at", { ascending: false })
        .returns<ReceiptDraft[]>(),
      supabase
        .from("products")
        .select("id, name, brand, retailer")
        .order("created_at", { ascending: false })
        .returns<ExistingProduct[]>(),
    ]);

  const atReceiptLimit = !premium && monthlyCount >= FREE_RECEIPT_MONTHLY_LIMIT;

  return (
    <ReceiptQueueView
      pending={pending ?? []}
      discarded={discarded ?? []}
      products={products ?? []}
      atReceiptLimit={atReceiptLimit}
      premium={premium}
    />
  );
}
