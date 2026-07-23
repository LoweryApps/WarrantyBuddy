import type { ProductCategory } from "@/lib/supabase/types";
import type { WarrantyStatus } from "@/lib/warranty";

export const VAULT_SUGGESTIONS = [
  "Which warranties expire soon?",
  "Do I have any active recalls?",
  "Which products are missing warranty documents?",
];

export const PRODUCT_SUGGESTIONS = [
  "Does this cover accidental damage?",
  "How do I make a claim?",
  "Is this a known problem?",
];

export interface ProductContext {
  name: string;
  brand: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  category: ProductCategory;
  purchaseDate: string | null;
  purchasePrice: number | null;
  retailer: string | null;
  warranty: {
    type: string;
    startDate: string | null;
    endDate: string | null;
    status: WarrantyStatus;
    coverageDescription: string | null;
    exclusions: string | null;
    claimContact: string | null;
  } | null;
  recall: { source: string; description: string | null; remedy: string | null } | null;
  knownIssues: {
    failureType: string;
    failureDescription: string | null;
    complaintCount: number;
    severity: string;
    source: string;
  }[];
}

export interface VaultProductSummary {
  id: string;
  name: string;
  brand: string | null;
  modelNumber: string | null;
  warrantyEndDate: string | null;
  warrantyStatus: WarrantyStatus;
  hasWarranty: boolean;
  hasDocument: boolean;
  hasRecall: boolean;
  purchasePrice: number | null;
}

const SOURCE_MARKER = "\nSource:";

const STATUS_TEXT: Record<WarrantyStatus, string> = {
  active: "active, not expiring soon",
  expiring: "EXPIRING SOON (within 60 days)",
  expired: "EXPIRED",
  none: "no warranty on file",
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function buildSystemPrompt(params: {
  mode: "product" | "vault";
  productId: string | null;
  product: ProductContext | null;
  hasDocumentBytes: boolean;
  vaultSummary: VaultProductSummary[];
}): string {
  const { mode, productId, product, hasDocumentBytes, vaultSummary } = params;

  const vaultLines = vaultSummary.length
    ? vaultSummary
        .map((p) => {
          const bits = [
            p.brand ? `${p.brand} ${p.name}` : p.name,
            p.modelNumber ? `model ${p.modelNumber}` : null,
            p.purchasePrice != null ? `$${p.purchasePrice}` : null,
            p.hasWarranty
              ? `warranty ${p.warrantyEndDate ? `ends ${p.warrantyEndDate}` : "on file, no end date"} — ${STATUS_TEXT[p.warrantyStatus]}`
              : "no warranty on file",
            p.hasDocument ? "has warranty document" : "no warranty document uploaded",
            p.hasRecall ? "HAS AN ACTIVE RECALL" : null,
          ].filter(Boolean);
          return `- [id: ${p.id}] ${bits.join(" · ")}`;
        })
        .join("\n")
    : "(vault is empty — no products yet)";

  const productBlock = product
    ? `
Current product context:
- id: ${productId}
- Name: ${product.name}
- Brand: ${product.brand ?? "unknown"}
- Model number: ${product.modelNumber ?? "unknown"}
- Serial number: ${product.serialNumber ?? "unknown"}
- Category: ${product.category}
- Purchase date: ${product.purchaseDate ?? "unknown"}
- Purchase price: ${product.purchasePrice ?? "unknown"}
- Retailer: ${product.retailer ?? "unknown"}
- Warranty on file: ${
        product.warranty
          ? `${product.warranty.type}, ${product.warranty.startDate ?? "?"} to ${product.warranty.endDate ?? "?"} — ${STATUS_TEXT[product.warranty.status]}. Coverage: ${product.warranty.coverageDescription ?? "not specified"}. Exclusions: ${product.warranty.exclusions ?? "not specified"}. Claim contact: ${product.warranty.claimContact ?? "not specified"}.`
          : "none on file"
      }
- Warranty document: ${hasDocumentBytes ? "attached below as an image/PDF — read it and ground your answer in its actual text" : "none uploaded for this product"}
- Active recall: ${product.recall ? `${product.recall.source} recall — ${product.recall.description ?? "see details"}. Remedy: ${product.recall.remedy ?? "unknown"}.` : "none"}
- Known issues on this model (from WarrantyBuddy's Product Intelligence Database, separate from formal recalls): ${
        product.knownIssues.length
          ? product.knownIssues
              .map(
                (k) =>
                  `${k.failureType} (${k.complaintCount} ${k.source}, severity: ${k.severity})${k.failureDescription ? ` — ${k.failureDescription}` : ""}`,
              )
              .join("; ")
          : "none on file"
      }
`
    : "";

  return `You are Buddy, the AI assistant inside WarrantyBuddy, a personal product and warranty tracking app. You are warm, concise, and precise — never invent facts.

Today's date is ${todayIso()}. Each product's warranty status below (active / expiring soon / expired) has already been computed for you against today's date and the app's "expiring soon" = within 60 days rule — trust that label rather than doing your own date math, and make sure your answer doesn't contradict it (e.g. don't say "nothing expiring soon" if a product is flagged EXPIRING SOON).

You were opened from the ${mode === "product" ? "product detail page for a specific product" : "Dashboard"}. ${
    mode === "product"
      ? 'Answer about that product by default, but if the question is clearly about the user\'s whole vault (e.g. comparing across products, "which of my products..."), answer using the vault summary instead — don\'t refuse just because you were opened from a product page.'
      : "Answer using the vault summary below."
  }
${productBlock}
Full vault summary (${vaultSummary.length} product${vaultSummary.length === 1 ? "" : "s"}):
${vaultLines}

Rules:
- When you reference a specific product, its warranty, or its documents, link to it inline with markdown link syntax instead of describing where to find it in prose — e.g. write "your [Sony Bravia](/products/abc123) is covered until March" or "check [its Documents tab](/products/abc123?tab=documents) for the receipt", never "you can find this on the product page." Use only these route patterns, filled in with a real id from the "id:" fields given to you above (the current product's id, or a vault-item's [id: ...] tag) — never invent an id or link a product you have no id for:
  - /products/{id} — that product's overview
  - /products/{id}?tab=warranty — its Warranty tab
  - /products/{id}?tab=documents — its Documents tab
- Ground answers in the warranty document text when one is attached, or in the structured warranty/recall/vault facts above. Never fabricate coverage terms, dates, phone numbers, or dollar amounts that aren't given to you.
- If a product-specific question has no warranty document and no warranty record, say so plainly, then answer using well-known standard manufacturer terms for that brand/category if you can, and clearly label that as a general assumption, not this user's actual coverage.
- Keep answers short — a few sentences or a tight list. This is a chat panel, not an essay.
- When discussing "known issues" (Product Intelligence data, not a formal recall): always attribute the count to its source exactly as given (e.g. "12 NHTSA complaints report...", "3 WarrantyBuddy users have reported..."), never present it as WarrantyBuddy's own finding or conclusion. Use observational language — "owners have reported X" — never conclusive language like "this product is defective" or "this is dangerous." Only use words like "dangerous" or "defective" if directly quoting an official government recall record, never for Product Intelligence data. If asked "is this a known problem?" and there's no known-issues data on file, say so plainly rather than guessing.
- When your answer is grounded in a specific piece of evidence (the warranty document, a specific warranty field, or a recall record), end your reply with one final line in exactly this format: "${SOURCE_MARKER} <short source label>" (e.g. "${SOURCE_MARKER} Warranty document" or "${SOURCE_MARKER} CPSC Recall #25-053"). Omit this line entirely when you're answering from general knowledge or vault-wide facts with no single clear source.`;
}

export function splitSource(raw: string): { content: string; source: string | null } {
  const idx = raw.lastIndexOf(SOURCE_MARKER);
  if (idx === -1) return { content: raw.trim(), source: null };
  const content = raw.slice(0, idx).trim();
  const source = raw.slice(idx + SOURCE_MARKER.length).trim();
  if (!content || !source) return { content: raw.trim(), source: null };
  return { content, source };
}

export function hasWarrantyDocument(params: {
  warrantyDocumentUrl: string | null | undefined;
  documents: { document_type: string }[];
}): boolean {
  return !!params.warrantyDocumentUrl || params.documents.some((d) => d.document_type === "Warranty");
}
