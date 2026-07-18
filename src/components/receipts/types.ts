export interface ReceiptDraft {
  id: string;
  kind: "receipt" | "warranty" | "both";
  source_email_subject: string | null;
  sender_domain: string | null;
  extracted_product_name: string | null;
  extracted_brand: string | null;
  extracted_price: number | null;
  extracted_order_date: string | null;
  extracted_order_number: string | null;
  extracted_retailer: string | null;
  extracted_warranty_start_date: string | null;
  extracted_warranty_end_date: string | null;
  extracted_coverage_description: string | null;
  extracted_exclusions: string | null;
  extracted_claim_contact: string | null;
  confidence_score: number | null;
  raw_email_url: string | null;
  received_at: string;
  discarded_at: string | null;
}

export interface ExistingProduct {
  id: string;
  name: string;
  brand: string | null;
  retailer: string | null;
}

export interface ReceiptGroup {
  key: string;
  subject: string | null;
  senderDomain: string | null;
  receivedAt: string;
  items: ReceiptDraft[];
}
