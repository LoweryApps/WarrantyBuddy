import type { ProductCategory, RecallSource } from "@/lib/supabase/types";

export interface ClaimProduct {
  id: string;
  name: string;
  brand: string | null;
  model_number: string | null;
  serial_number: string | null;
  category: ProductCategory;
  vin: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  retailer: string | null;
}

export interface ClaimWarranty {
  warranty_type: string;
  start_date: string | null;
  end_date: string | null;
  claim_contact: string | null;
}

export interface ClaimReceipt {
  file_name: string;
  uploaded_at: string;
}

export interface ClaimRecall {
  source: RecallSource;
  external_recall_id: string;
  description: string | null;
  remedy: string | null;
}
