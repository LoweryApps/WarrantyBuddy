import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildClaimEmailTemplate,
  resolveSignatureField,
  type ClaimEmailContext,
} from "@/lib/claim-email";
import { guessMediaType } from "@/lib/document-media-type";
import { isPremium } from "@/lib/entitlements";
import { classifyUserReport, upsertProductIntelligence } from "@/lib/product-intelligence";
import { createAdminClient } from "@/lib/supabase/admin";
import { downloadProductFile } from "@/lib/supabase/storage";
import { createClient } from "@/lib/supabase/server";
import type { ProductCategory } from "@/lib/supabase/types";

// Best-effort: classifies the user's free-text issue description into an
// anonymized failure-pattern record for the Product Intelligence Database
// (spec 7.2 Phase 2). Deliberately takes only brand/model/category — never
// user_id or product_id — so the stored record can't be traced back to the
// reporting user, per spec's anonymization requirement.
async function recordFailureReport(params: {
  issue: string;
  brand: string | null;
  modelNumber: string | null;
  category: ProductCategory | null;
}) {
  if (!params.brand || !params.category) return;
  try {
    const classified = await classifyUserReport({
      issue: params.issue,
      brand: params.brand,
      category: params.category,
    });
    if (!classified.is_failure_report || !classified.failure_type || !classified.severity) return;

    const admin = createAdminClient();
    await upsertProductIntelligence(admin, {
      brand: params.brand,
      model_number: params.modelNumber,
      category: params.category,
      failure_type: classified.failure_type,
      failure_description: classified.failure_description,
      typical_time_to_failure: null,
      complaint_count: 1,
      severity: classified.severity,
      source: "UserReport",
      source_url: null,
    });
  } catch {
    // Product Intelligence is a bonus signal — never let this affect the
    // claim-email response.
  }
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: premiumProfile } = await supabase
    .from("users")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  if (!isPremium(premiumProfile)) {
    return NextResponse.json(
      { error: "premium_required", message: "Claim Assist's AI email draft is a Premium feature." },
      { status: 402 },
    );
  }

  const { productId, issue } = await request.json();
  if (!productId || typeof issue !== "string" || !issue.trim()) {
    return NextResponse.json({ error: "Missing productId or issue" }, { status: 400 });
  }

  const [{ data: product }, { data: receiptDocuments }, { data: warranty }, { data: warrantyDocuments }, { data: alerts }, { data: profile }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "name, brand, model_number, serial_number, category, purchase_date, purchase_price, retailer",
        )
        .eq("id", productId)
        .single(),
      supabase
        .from("documents")
        .select("id")
        .eq("product_id", productId)
        .eq("document_type", "Receipt")
        .limit(1),
      supabase
        .from("warranties")
        .select("document_url")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("documents")
        .select("file_url, file_name")
        .eq("product_id", productId)
        .eq("document_type", "Warranty")
        .limit(1),
      supabase
        .from("user_recall_alerts")
        .select("acknowledged, recalls(source, external_recall_id, remedy)")
        .eq("product_id", productId)
        .eq("acknowledged", false)
        .limit(1),
      supabase.from("users").select("full_name, phone, claim_email").eq("id", user.id).single(),
    ]);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  await recordFailureReport({
    issue: issue.trim(),
    brand: product.brand,
    modelNumber: product.model_number,
    category: product.category,
  });

  const recall = alerts?.[0]?.recalls as
    | { source: string; external_recall_id: string; remedy: string | null }
    | null
    | undefined;

  const ctx: ClaimEmailContext = {
    productName: product.name,
    brand: product.brand,
    modelNumber: product.model_number,
    serialNumber: product.serial_number,
    purchaseDate: product.purchase_date,
    purchasePrice: product.purchase_price,
    retailer: product.retailer,
    hasReceipt: (receiptDocuments?.length ?? 0) > 0,
    recallText: recall
      ? `I understand this model is also subject to ${recall.source} Recall #${recall.external_recall_id}${recall.remedy ? ` (remedy: ${recall.remedy})` : ""}, and I would like to have both the warranty claim and the recall remedy addressed during the same service visit if possible.`
      : null,
    issue: issue.trim(),
    signatureName: resolveSignatureField(profile?.full_name, "name"),
    signaturePhone: resolveSignatureField(profile?.phone, "phone number"),
    signatureEmail: resolveSignatureField(profile?.claim_email ?? user.email, "claim email address"),
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ email: buildClaimEmailTemplate(ctx), source: "template" });
  }

  // Ground the draft in the actual warranty document's coverage terms when
  // one is on file — same technique as Ask Buddy (downloadProductFile +
  // document/image content block) — instead of relying only on metadata.
  const warrantyDoc = warrantyDocuments?.[0];
  const docPath = warranty?.document_url ?? warrantyDoc?.file_url ?? null;
  const docName = warrantyDoc?.file_name ?? docPath ?? "";

  let documentBlock:
    | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
    | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/webp"; data: string } }
    | null = null;

  if (docPath) {
    try {
      const mediaType = guessMediaType(docName || docPath);
      if (mediaType) {
        const blob = await downloadProductFile(supabase, docPath);
        const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
        documentBlock =
          mediaType === "application/pdf"
            ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
            : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };
      }
    } catch {
      // Document couldn't be downloaded — fall back to metadata-only grounding below.
      documentBlock = null;
    }
  }

  const instructions = `Write a professional warranty claim request email using exactly these facts — do not invent or omit any of them, and do not add a "Purchase details" or "My contact details" list beyond what's given below since I'll display those separately. Just write the email body: greeting, the request, the issue description, and a closing. Keep it concise and professional, 150-250 words. Respond with ONLY the email text (a Subject line, then the body), no other commentary.

${
  documentBlock
    ? "A copy of this product's actual warranty document is attached. Read its coverage terms and exclusions, and where the customer's issue is addressed by a specific clause, reference it directly (e.g. cite the coverage that applies). Do not reference the document if it turns out unrelated to this claim."
    : "No warranty document is on file for this product — do not claim to have read one. If useful, you may reference standard, widely-known manufacturer warranty terms for this brand and category, clearly as general knowledge rather than as something read from a document."
}

Product: ${ctx.productName}
Brand: ${ctx.brand ?? "unknown"}
Model number: ${ctx.modelNumber ?? "unknown"}
Serial number: ${ctx.serialNumber ?? "unknown"}
Purchase date: ${ctx.purchaseDate ?? "unknown"}
Purchase price: ${ctx.purchasePrice ?? "unknown"}
Retailer: ${ctx.retailer ?? "unknown"}
Customer's issue description: ${ctx.issue}
${ctx.recallText ? `Relevant recall: ${ctx.recallText}` : ""}
Sign the email as: ${ctx.signatureName}`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: documentBlock ? [documentBlock, { type: "text", text: instructions }] : instructions,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (textBlock && textBlock.type === "text") {
      return NextResponse.json({ email: textBlock.text.trim(), source: "ai" });
    }
  } catch {
    // Fall through to the deterministic template below.
  }

  return NextResponse.json({ email: buildClaimEmailTemplate(ctx), source: "template" });
}
