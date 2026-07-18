import type {
  DocumentType,
  ProductCategory,
  RecallSource,
  WarrantyType,
} from "@/lib/supabase/types";

export interface ProductRecord {
  id: string;
  name: string;
  brand: string | null;
  model_number: string | null;
  serial_number: string | null;
  category: ProductCategory;
  purchase_date: string | null;
  purchase_price: number | null;
  retailer: string | null;
  photo_url: string | null;
}

export interface WarrantyRecord {
  id: string;
  warranty_type: WarrantyType;
  start_date: string | null;
  end_date: string | null;
  coverage_description: string | null;
  exclusions: string | null;
  claim_contact: string | null;
  document_url: string | null;
  ai_extracted: boolean;
  created_at: string;
}

export interface DocumentRecord {
  id: string;
  document_type: DocumentType;
  file_url: string;
  file_name: string;
  file_size_kb: number | null;
  uploaded_at: string;
}

export interface RecallAlertRecord {
  id: string;
  acknowledged: boolean;
  notified_at: string;
  recalls: {
    id: string;
    source: RecallSource;
    recall_date: string | null;
    description: string | null;
    remedy: string | null;
    action_url: string | null;
  } | null;
}
