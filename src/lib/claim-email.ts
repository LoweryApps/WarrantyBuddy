interface ClaimEmailContext {
  productName: string;
  brand: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  retailer: string | null;
  hasReceipt: boolean;
  recallText: string | null;
  issue: string;
  signatureName: string;
  signaturePhone: string;
  signatureEmail: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "an unknown date";
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatPrice(price: number | null): string {
  if (price === null) return "an unknown amount";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
}

export function resolveSignatureField(value: string | null | undefined, fieldLabel: string): string {
  return value?.trim() || `[Add your ${fieldLabel} in Settings]`;
}

export function buildClaimEmailTemplate(ctx: ClaimEmailContext): string {
  const identifiers = [
    ctx.modelNumber ? `Model: ${ctx.modelNumber}` : null,
    ctx.serialNumber ? `Serial: ${ctx.serialNumber}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const subject = `Warranty Claim Request — ${[ctx.brand, ctx.modelNumber].filter(Boolean).join(" ") || ctx.productName}`;

  const lines = [
    `Subject: ${subject}`,
    "",
    `Dear ${ctx.brand ?? "Manufacturer"} Support,`,
    "",
    `I am writing to request a warranty repair for my ${ctx.productName}${identifiers ? ` (${identifiers})` : ""}, purchased on ${formatDate(ctx.purchaseDate)}${ctx.retailer ? ` from ${ctx.retailer}` : ""} for ${formatPrice(ctx.purchasePrice)}.`,
    "",
    "Issue description:",
    ctx.issue,
  ];

  if (ctx.recallText) {
    lines.push("", ctx.recallText);
  }

  lines.push(
    "",
    "Purchase details:",
    `  Retailer: ${ctx.retailer ?? "Not on file"}`,
    `  Purchase date: ${formatDate(ctx.purchaseDate)}`,
    `  Purchase price: ${formatPrice(ctx.purchasePrice)}`,
    `  Proof of purchase: ${ctx.hasReceipt ? "Available on request" : "Not on file — will provide separately"}`,
    "",
    "My contact details:",
    `  Name: ${ctx.signatureName}`,
    `  Phone: ${ctx.signaturePhone}`,
    `  Email: ${ctx.signatureEmail}`,
    "",
    "I would appreciate confirmation of receipt and information on next steps for scheduling a service appointment. Thank you for your assistance.",
    "",
    "Sincerely,",
    ctx.signatureName,
    new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  );

  return lines.join("\n");
}

export type { ClaimEmailContext };
