import type { ReceiptDraft, ReceiptGroup } from "@/components/receipts/types";

export const HIGH_CONFIDENCE_THRESHOLD = 80;

export function thirtyDaysAgoIso(): string {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
}

export function isHighConfidence(score: number | null): boolean {
  return score !== null && score >= HIGH_CONFIDENCE_THRESHOLD;
}

// Groups drafts that came from the same forwarded email — same subject,
// sender domain, and received within a minute of each other — so a
// multi-item order confirmation shows as one card with sub-items, per spec
// 4.7 ("Multi-item emails appear as separate cards ... grouped under the
// source email"). There's no explicit batch id in the schema, so this is a
// heuristic grouping key.
export function groupReceiptDrafts(drafts: ReceiptDraft[]): ReceiptGroup[] {
  const groups = new Map<string, ReceiptGroup>();

  for (const draft of drafts) {
    const minuteBucket = draft.received_at.slice(0, 16); // YYYY-MM-DDTHH:MM
    const key = `${draft.source_email_subject ?? ""}|${draft.sender_domain ?? ""}|${minuteBucket}`;

    const existing = groups.get(key);
    if (existing) {
      existing.items.push(draft);
    } else {
      groups.set(key, {
        key,
        subject: draft.source_email_subject,
        senderDomain: draft.sender_domain,
        receivedAt: draft.received_at,
        items: [draft],
      });
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  );
}

// Strips punctuation so names that differ only by trailing detail — e.g.
// "Echo Dot (5th Gen, Charcoal)" vs "Echo Dot (5th Gen)" — still line up as
// a substring match instead of failing on a stray comma or parenthesis.
function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Light auto-match: suggests an existing product if the extracted name is a
// substring of (or contains) an existing product's name, case-insensitive.
// When a brand is also given (e.g. warranty-email matching per spec 2.4b,
// "match by brand and product name"), prefer a candidate whose brand also
// matches, but fall back to a name-only match if no brand match exists.
export function suggestMatch<T extends { name: string; brand?: string | null }>(
  extractedName: string | null,
  products: T[],
  extractedBrand?: string | null,
): T | null {
  if (!extractedName) return null;
  const needle = normalizeProductName(extractedName);
  if (!needle) return null;

  const nameMatches = products.filter((p) => {
    const hay = normalizeProductName(p.name);
    return hay.includes(needle) || needle.includes(hay);
  });

  if (nameMatches.length === 0) return null;
  if (!extractedBrand) return nameMatches[0];

  const brandNeedle = normalizeProductName(extractedBrand);
  return (
    nameMatches.find((p) => p.brand && normalizeProductName(p.brand) === brandNeedle) ??
    nameMatches[0]
  );
}
