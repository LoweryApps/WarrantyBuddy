import type { ProductCategory, RecallSource } from "@/lib/supabase/types";

export interface RecallAlertWithProduct {
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
  products: {
    id: string;
    name: string;
    brand: string | null;
    model_number: string | null;
    category: ProductCategory;
  } | null;
}

export interface RecallSearchResult {
  id: string;
  source: RecallSource;
  brand: string | null;
  model_numbers: string[];
  description: string | null;
  remedy: string | null;
  action_url: string | null;
  recall_date: string | null;
}
