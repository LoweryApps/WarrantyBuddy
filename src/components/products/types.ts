import type { KnownIssueRecord } from "@/components/product-intelligence/known-issue-banner";
import type { ProductCategory } from "@/lib/supabase/types";

export type InputMethod = "barcode" | "label" | "receipt" | "manual";

export type WizardStep = "method" | "capture" | "review" | "success";

export interface ProductDraft {
  name: string;
  brand: string;
  modelNumber: string;
  serialNumber: string;
  category: ProductCategory | "";
  purchaseDate: string;
  purchasePrice: string;
  retailer: string;
}

export const EMPTY_DRAFT: ProductDraft = {
  name: "",
  brand: "",
  modelNumber: "",
  serialNumber: "",
  category: "",
  purchaseDate: "",
  purchasePrice: "",
  retailer: "",
};

export interface SavedProduct {
  id: string;
  name: string;
  recallMatch: {
    description: string | null;
    remedy: string | null;
    actionUrl: string | null;
  } | null;
  knownIssue: KnownIssueRecord | null;
}
