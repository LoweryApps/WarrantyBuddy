import { NextResponse } from "next/server";
import {
  classifyInboundEmail,
  emailBodyText,
  extractWarrantyFromAttachment,
  guessAttachmentMediaType,
  mergeWarrantyExtraction,
  senderDomain,
  type PostmarkInboundPayload,
  type ReceiptItemExtraction,
  type WarrantyExtraction,
} from "@/lib/inbound-email";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { uploadInboxFile } from "@/lib/supabase/storage";

export const runtime = "nodejs";

function checkAuth(request: Request): boolean {
  const secret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return false;

  const decoded = Buffer.from(encoded, "base64").toString("utf-8");
  const password = decoded.split(":").slice(1).join(":");
  return password === secret;
}

function extractAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

function confidenceFromUncertain(uncertainCount: number, totalFields: number): number {
  if (totalFields === 0) return 50;
  const ratio = uncertainCount / totalFields;
  return Math.round(Math.max(30, 95 - ratio * 65));
}

type InsertRow = Database["public"]["Tables"]["forwarded_receipts"]["Insert"];

export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as PostmarkInboundPayload;
  const supabase = createAdminClient();

  const toAddress = extractAddress(payload.To ?? "");
  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .ilike("forwarding_address", toAddress)
    .maybeSingle();

  if (!profile) {
    // Unknown recipient — acknowledge so the provider doesn't retry, but
    // there's nothing to route this to.
    return NextResponse.json({ received: true, routed: false });
  }

  const userId = profile.id;
  const subject = payload.Subject ?? "";
  const bodyText = emailBodyText(payload);
  const sender = senderDomain(payload.From ?? "");
  const receivedAt = new Date().toISOString();

  const attachment = (payload.Attachments ?? []).find((a) => guessAttachmentMediaType(a.ContentType));

  const [classification, attachmentWarranty] = await Promise.all([
    classifyInboundEmail({ subject, bodyText }),
    attachment
      ? extractWarrantyFromAttachment({
          base64: attachment.Content,
          mediaType: guessAttachmentMediaType(attachment.ContentType)!,
        })
      : Promise.resolve(null),
  ]);

  const warranty = mergeWarrantyExtraction(classification.warranty, attachmentWarranty);
  const hasWarrantyData = classification.has_warranty_data || !!attachmentWarranty;
  const receiptItems = classification.receipt_items;

  if (!classification.has_receipt_data && !hasWarrantyData) {
    return NextResponse.json({ received: true, routed: false, reason: "no_relevant_data" });
  }

  let attachmentPath: string | null = null;
  if (attachment && hasWarrantyData) {
    try {
      attachmentPath = await uploadInboxFile(supabase, {
        userId,
        fileName: attachment.Name,
        contentType: guessAttachmentMediaType(attachment.ContentType)!,
        data: Buffer.from(attachment.Content, "base64"),
      });
    } catch {
      attachmentPath = null;
    }
  }

  const rows: InsertRow[] = [];

  // Exactly one receipt item + warranty data on the same email — spec 2.4b:
  // "product record and warranty record are created or updated together".
  // Multiple receipt items alongside warranty data is rare enough (a
  // multi-item order confirmation that also states warranty terms) that we
  // attach the warranty fields to the first item and let the rest ride as
  // plain receipt items, rather than guessing which item the warranty
  // belongs to.
  const warrantyItemIndex = hasWarrantyData && receiptItems.length > 0 ? 0 : -1;

  receiptItems.forEach((item: ReceiptItemExtraction, i: number) => {
    const attachWarranty = i === warrantyItemIndex ? warranty : null;
    rows.push({
      user_id: userId,
      status: "Pending Review",
      kind: attachWarranty ? "both" : "receipt",
      source_email_subject: subject || null,
      sender_domain: sender,
      extracted_product_name: item.product_name,
      extracted_brand: item.brand ?? attachWarranty?.brand ?? null,
      extracted_price: item.price,
      extracted_order_date: item.purchase_date,
      extracted_retailer: item.retailer,
      extracted_warranty_start_date: attachWarranty?.start_date ?? null,
      extracted_warranty_end_date: attachWarranty?.end_date ?? null,
      extracted_coverage_description: attachWarranty?.coverage_description ?? null,
      extracted_exclusions: attachWarranty?.exclusions ?? null,
      extracted_claim_contact: attachWarranty?.claim_contact ?? null,
      confidence_score: confidenceFromUncertain(item.uncertain.length, 5),
      raw_email_url: attachWarranty ? attachmentPath : null,
      received_at: receivedAt,
    });
  });

  if (hasWarrantyData && warrantyItemIndex === -1 && warranty) {
    const w = warranty as WarrantyExtraction;
    rows.push({
      user_id: userId,
      status: "Pending Review",
      kind: "warranty",
      source_email_subject: subject || null,
      sender_domain: sender,
      extracted_product_name: w.product_name,
      extracted_brand: w.brand,
      extracted_warranty_start_date: w.start_date,
      extracted_warranty_end_date: w.end_date,
      extracted_coverage_description: w.coverage_description,
      extracted_exclusions: w.exclusions,
      extracted_claim_contact: w.claim_contact,
      confidence_score: confidenceFromUncertain(w.uncertain.length, 7),
      raw_email_url: attachmentPath,
      received_at: receivedAt,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ received: true, routed: false, reason: "no_rows" });
  }

  const { error } = await supabase.from("forwarded_receipts").insert(rows);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ received: true, routed: true, rows: rows.length });
}
