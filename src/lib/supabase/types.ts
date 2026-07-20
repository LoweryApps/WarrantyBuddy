// Hand-authored to match supabase/migrations/0001_init.sql.
// Regenerate with the Supabase CLI once the project is linked:
//   supabase gen types typescript --linked > src/lib/supabase/types.ts

export type ProductCategory =
  | "Electronics"
  | "Appliance"
  | "Tool"
  | "Vehicle"
  | "Other";

export type WarrantyType = "Manufacturer" | "Extended" | "Retailer";

export type WarrantySource = "Uploaded" | "User-Entered" | "AI-Suggested";

export type DocumentType = "Warranty" | "Receipt" | "Manual" | "Photo" | "Other";

export type ForwardedReceiptStatus = "Pending Review" | "Confirmed" | "Discarded";

export type ForwardedEmailKind = "receipt" | "warranty" | "both";

export type RecallSource = "CPSC" | "NHTSA" | "FDA" | "USDA";

export type ChatMessageRole = "user" | "assistant";

export type PidSeverity = "Safety Hazard" | "Major" | "Minor";

export type PidSource = "SaferProducts" | "NHTSA" | "UserReport" | "ReviewMining" | "ManufacturerBulletin";

export type SubscriptionPlan =
  | "founding_monthly"
  | "founding_annual"
  | "regular_monthly"
  | "regular_annual";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          claim_email: string | null;
          created_at: string;
          notification_email: boolean;
          forwarding_address: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: SubscriptionPlan | null;
          subscription_status: SubscriptionStatus | null;
          current_period_end: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          claim_email?: string | null;
          created_at?: string;
          notification_email?: boolean;
          forwarding_address?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: SubscriptionPlan | null;
          subscription_status?: SubscriptionStatus | null;
          current_period_end?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          brand: string | null;
          model_number: string | null;
          serial_number: string | null;
          category: ProductCategory;
          vin: string | null;
          model_year: number | null;
          room_location: string | null;
          quantity: number;
          purchase_date: string | null;
          purchase_price: number | null;
          retailer: string | null;
          photo_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          brand?: string | null;
          model_number?: string | null;
          serial_number?: string | null;
          category?: ProductCategory;
          vin?: string | null;
          model_year?: number | null;
          room_location?: string | null;
          quantity?: number;
          purchase_date?: string | null;
          purchase_price?: number | null;
          retailer?: string | null;
          photo_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "products_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      warranties: {
        Row: {
          id: string;
          product_id: string;
          warranty_type: WarrantyType;
          start_date: string | null;
          end_date: string | null;
          coverage_description: string | null;
          exclusions: string | null;
          claim_contact: string | null;
          document_url: string | null;
          warranty_source: WarrantySource;
          created_at: string;
          expiry_notified_at: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          warranty_type?: WarrantyType;
          start_date?: string | null;
          end_date?: string | null;
          coverage_description?: string | null;
          exclusions?: string | null;
          claim_contact?: string | null;
          document_url?: string | null;
          warranty_source?: WarrantySource;
          created_at?: string;
          expiry_notified_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["warranties"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "warranties_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          product_id: string;
          document_type: DocumentType;
          file_url: string;
          file_name: string;
          file_size_kb: number | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          document_type: DocumentType;
          file_url: string;
          file_name: string;
          file_size_kb?: number | null;
          uploaded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "documents_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      forwarded_receipts: {
        Row: {
          id: string;
          user_id: string;
          product_id: string | null;
          status: ForwardedReceiptStatus;
          kind: ForwardedEmailKind;
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
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id?: string | null;
          status?: ForwardedReceiptStatus;
          kind?: ForwardedEmailKind;
          source_email_subject?: string | null;
          sender_domain?: string | null;
          extracted_product_name?: string | null;
          extracted_brand?: string | null;
          extracted_price?: number | null;
          extracted_order_date?: string | null;
          extracted_order_number?: string | null;
          extracted_retailer?: string | null;
          extracted_warranty_start_date?: string | null;
          extracted_warranty_end_date?: string | null;
          extracted_coverage_description?: string | null;
          extracted_exclusions?: string | null;
          extracted_claim_contact?: string | null;
          confidence_score?: number | null;
          raw_email_url?: string | null;
          received_at?: string;
          discarded_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["forwarded_receipts"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "forwarded_receipts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "forwarded_receipts_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      recalls: {
        Row: {
          id: string;
          source: RecallSource;
          external_recall_id: string;
          recall_date: string | null;
          brand: string | null;
          model_numbers: string[];
          description: string | null;
          remedy: string | null;
          action_url: string | null;
          fetched_at: string;
        };
        Insert: {
          id?: string;
          source: RecallSource;
          external_recall_id: string;
          recall_date?: string | null;
          brand?: string | null;
          model_numbers?: string[];
          description?: string | null;
          remedy?: string | null;
          action_url?: string | null;
          fetched_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recalls"]["Insert"]>;
        Relationships: [];
      };
      user_recall_alerts: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          recall_id: string;
          notified_at: string;
          acknowledged: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          recall_id: string;
          notified_at?: string;
          acknowledged?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["user_recall_alerts"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "user_recall_alerts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_recall_alerts_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_recall_alerts_recall_id_fkey";
            columns: ["recall_id"];
            isOneToOne: false;
            referencedRelation: "recalls";
            referencedColumns: ["id"];
          },
        ];
      };
      product_lookup_cache: {
        Row: {
          barcode: string;
          brand: string | null;
          model_name: string | null;
          model_number: string | null;
          category: ProductCategory | null;
          source: string | null;
          fetched_at: string;
        };
        Insert: {
          barcode: string;
          brand?: string | null;
          model_name?: string | null;
          model_number?: string | null;
          category?: ProductCategory | null;
          source?: string | null;
          fetched_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["product_lookup_cache"]["Insert"]
        >;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          product_id: string | null;
          role: ChatMessageRole;
          content: string;
          source: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id?: string | null;
          role: ChatMessageRole;
          content: string;
          source?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_intelligence: {
        Row: {
          id: string;
          brand: string;
          model_number: string | null;
          category: ProductCategory;
          failure_type: string;
          failure_description: string | null;
          typical_time_to_failure: string | null;
          complaint_count: number;
          severity: PidSeverity;
          source: PidSource;
          source_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand: string;
          model_number?: string | null;
          category: ProductCategory;
          failure_type: string;
          failure_description?: string | null;
          typical_time_to_failure?: string | null;
          complaint_count?: number;
          severity?: PidSeverity;
          source: PidSource;
          source_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_intelligence"]["Insert"]>;
        Relationships: [];
      };
      insurance_exports: {
        Row: {
          id: string;
          user_id: string;
          scope_label: string;
          item_count: number;
          total_value: number | null;
          file_url: string;
          generated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          scope_label: string;
          item_count: number;
          total_value?: number | null;
          file_url: string;
          generated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["insurance_exports"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "insurance_exports_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      product_category: ProductCategory;
      warranty_type: WarrantyType;
      warranty_source: WarrantySource;
      document_type: DocumentType;
      forwarded_receipt_status: ForwardedReceiptStatus;
      forwarded_email_kind: ForwardedEmailKind;
      recall_source: RecallSource;
      chat_message_role: ChatMessageRole;
      pid_severity: PidSeverity;
      pid_source: PidSource;
      subscription_plan: SubscriptionPlan;
      subscription_status: SubscriptionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
