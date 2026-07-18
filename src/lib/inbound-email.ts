import Anthropic from "@anthropic-ai/sdk";

export interface PostmarkAttachment {
  Name: string;
  Content: string;
  ContentType: string;
  ContentLength: number;
}

export interface PostmarkInboundPayload {
  From: string;
  FromName?: string;
  To: string;
  Subject: string;
  TextBody?: string;
  HtmlBody?: string;
  Attachments?: PostmarkAttachment[];
}

export interface ReceiptItemExtraction {
  product_name: string | null;
  brand: string | null;
  model_number: string | null;
  price: number | null;
  purchase_date: string | null;
  retailer: string | null;
  uncertain: string[];
}

export interface WarrantyExtraction {
  brand: string | null;
  product_name: string | null;
  start_date: string | null;
  end_date: string | null;
  coverage_description: string | null;
  exclusions: string | null;
  claim_contact: string | null;
  uncertain: string[];
}

export interface EmailClassification {
  has_receipt_data: boolean;
  receipt_items: ReceiptItemExtraction[];
  has_warranty_data: boolean;
  warranty: WarrantyExtraction | null;
}

export function senderDomain(fromAddress: string): string | null {
  const match = fromAddress.match(/@([^\s>]+)/);
  return match ? match[1].toLowerCase() : null;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function emailBodyText(payload: PostmarkInboundPayload): string {
  if (payload.TextBody?.trim()) return payload.TextBody.trim();
  if (payload.HtmlBody?.trim()) return stripHtml(payload.HtmlBody);
  return "";
}

const CLASSIFY_PROMPT = `You are Buddy, an AI assistant that reads emails forwarded to WarrantyBuddy (a warranty-tracking app) and classifies what's in them. A user forwards order confirmations, warranty registration emails, extended-warranty/protection-plan emails, and similar messages to one shared address.

Read the email subject and body below and extract structured data. Respond with ONLY a JSON object, no other text, in this exact shape:
{
  "has_receipt_data": boolean,
  "receipt_items": [{"product_name": string|null, "brand": string|null, "model_number": string|null, "price": number|null, "purchase_date": string|null (YYYY-MM-DD), "retailer": string|null, "uncertain": string[]}],
  "has_warranty_data": boolean,
  "warranty": {"brand": string|null, "product_name": string|null, "start_date": string|null (YYYY-MM-DD), "end_date": string|null (YYYY-MM-DD), "coverage_description": string|null, "exclusions": string|null, "claim_contact": string|null, "uncertain": string[]} | null
}

Rules:
- has_receipt_data / receipt_items: true when the email is an order confirmation or purchase receipt. If it lists multiple distinct products, include one entry per product in receipt_items. If it's not a purchase email, has_receipt_data is false and receipt_items is an empty array.
- has_warranty_data / warranty: true when the email is about warranty registration, coverage terms, an extended warranty/protection plan (e.g. Asurion, SquareTrade, Upsie, Extend, Geek Squad, Costco/Target protection plans), or otherwise states coverage dates or a claims contact. If the email is a plain purchase receipt with no warranty terms mentioned, has_warranty_data is false and warranty is null.
- A single email can be both (has_receipt_data and has_warranty_data both true) — e.g. an order confirmation that also states the manufacturer warranty terms.
- If the email is unrelated to a purchase or warranty (e.g. a shipping-only update with no product/price, a newsletter, spam), set both has_receipt_data and has_warranty_data to false.
- "uncertain" lists the keys of any field you are not confident about. Use null for fields you cannot find.`;

const ATTACHMENT_WARRANTY_PROMPT = `You are reading a warranty document — a PDF or photo of a warranty card, terms sheet, protection plan policy, or manufacturer warranty statement — that was attached to an email forwarded to WarrantyBuddy. Extract:
- brand: the product manufacturer/brand name
- product_name: the product name or description, if stated
- start_date: the warranty start date in YYYY-MM-DD format (usually the purchase date)
- end_date: the warranty expiration date in YYYY-MM-DD format
- coverage_description: a concise plain-language summary of what is covered
- exclusions: a concise plain-language summary of what is NOT covered
- claim_contact: the phone number, website, or email to use to make a claim

Respond with ONLY a JSON object, no other text, in this exact shape:
{"brand": string|null, "product_name": string|null, "start_date": string|null, "end_date": string|null, "coverage_description": string|null, "exclusions": string|null, "claim_contact": string|null, "uncertain": string[]}

"uncertain" lists the keys of any field you are not confident about. Use null for fields you cannot find.`;

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in model response");
  return JSON.parse(match[0]);
}

const EMPTY_CLASSIFICATION: EmailClassification = {
  has_receipt_data: false,
  receipt_items: [],
  has_warranty_data: false,
  warranty: null,
};

export async function classifyInboundEmail(params: {
  subject: string;
  bodyText: string;
}): Promise<EmailClassification> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return EMPTY_CLASSIFICATION;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `${CLASSIFY_PROMPT}\n\nSubject: ${params.subject}\n\nBody:\n${params.bodyText.slice(0, 12000)}`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return EMPTY_CLASSIFICATION;

    const parsed = extractJson(textBlock.text) as Partial<EmailClassification>;
    return {
      has_receipt_data: !!parsed.has_receipt_data,
      receipt_items: Array.isArray(parsed.receipt_items) ? parsed.receipt_items : [],
      has_warranty_data: !!parsed.has_warranty_data,
      warranty: parsed.warranty ?? null,
    };
  } catch {
    return EMPTY_CLASSIFICATION;
  }
}

export async function extractWarrantyFromAttachment(params: {
  base64: string;
  mediaType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
}): Promise<WarrantyExtraction | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });
    const { mediaType, base64 } = params;
    const fileBlock =
      mediaType === "application/pdf"
        ? ({ type: "document", source: { type: "base64", media_type: mediaType, data: base64 } } as const)
        : ({ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } } as const);

    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [fileBlock, { type: "text", text: ATTACHMENT_WARRANTY_PROMPT }],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const parsed = extractJson(textBlock.text) as Partial<WarrantyExtraction>;
    return {
      brand: parsed.brand ?? null,
      product_name: parsed.product_name ?? null,
      start_date: parsed.start_date ?? null,
      end_date: parsed.end_date ?? null,
      coverage_description: parsed.coverage_description ?? null,
      exclusions: parsed.exclusions ?? null,
      claim_contact: parsed.claim_contact ?? null,
      uncertain: Array.isArray(parsed.uncertain) ? parsed.uncertain : [],
    };
  } catch {
    return null;
  }
}

// Attachment fields win over body-text fields when both are present — a
// scanned/attached warranty document is more authoritative than terms
// paraphrased in the email body.
export function mergeWarrantyExtraction(
  fromBody: WarrantyExtraction | null,
  fromAttachment: WarrantyExtraction | null,
): WarrantyExtraction | null {
  if (!fromBody && !fromAttachment) return null;
  if (!fromAttachment) return fromBody;
  if (!fromBody) return fromAttachment;

  return {
    brand: fromAttachment.brand ?? fromBody.brand,
    product_name: fromAttachment.product_name ?? fromBody.product_name,
    start_date: fromAttachment.start_date ?? fromBody.start_date,
    end_date: fromAttachment.end_date ?? fromBody.end_date,
    coverage_description: fromAttachment.coverage_description ?? fromBody.coverage_description,
    exclusions: fromAttachment.exclusions ?? fromBody.exclusions,
    claim_contact: fromAttachment.claim_contact ?? fromBody.claim_contact,
    uncertain: [...new Set([...fromBody.uncertain, ...fromAttachment.uncertain])],
  };
}

export function guessAttachmentMediaType(
  contentType: string,
): "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | null {
  const type = contentType.split(";")[0].trim().toLowerCase();
  if (type === "application/pdf") return "application/pdf";
  if (type === "image/jpeg" || type === "image/jpg") return "image/jpeg";
  if (type === "image/png") return "image/png";
  if (type === "image/webp") return "image/webp";
  return null;
}
