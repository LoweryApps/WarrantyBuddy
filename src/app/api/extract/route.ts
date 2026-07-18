import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isPremium } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const LABEL_PROMPT = `You are reading a photo of a product's identification label (the sticker usually found on the back or bottom of a physical product). Extract:
- brand: the manufacturer/brand name
- model_number: the model number (distinguish from part numbers, FCC IDs, or other codes on the label)
- serial_number: the serial number if present

Respond with ONLY a JSON object, no other text, in this exact shape:
{"brand": string|null, "model_number": string|null, "serial_number": string|null, "uncertain": string[]}

"uncertain" lists the keys of any field you are not confident about (e.g. text was blurry, ambiguous, or you had to guess between two candidate values). Use null for fields you cannot find at all.`;

const RECEIPT_PROMPT = `You are reading a photo or screenshot of a purchase receipt or order confirmation. Extract:
- product_name: the name of the purchased product (if multiple items, pick the main/first one)
- brand: the brand/manufacturer if identifiable from the product name
- model_number: a model number if printed on the receipt
- price: the price paid for that item, as a number (no currency symbol)
- purchase_date: the purchase/order date in YYYY-MM-DD format
- retailer: the store or retailer name

Respond with ONLY a JSON object, no other text, in this exact shape:
{"product_name": string|null, "brand": string|null, "model_number": string|null, "price": number|null, "purchase_date": string|null, "retailer": string|null, "uncertain": string[]}

"uncertain" lists the keys of any field you are not confident about. Use null for fields you cannot find at all.`;

const WARRANTY_PROMPT = `You are reading a warranty document — a PDF or photo of a warranty card, terms sheet, or manufacturer warranty statement. Extract:
- start_date: the warranty start date in YYYY-MM-DD format (usually the purchase date — use it if the document states warranty coverage begins at purchase)
- end_date: the warranty expiration date in YYYY-MM-DD format
- coverage_description: a concise plain-language summary of what is covered (parts, labor, specific components, duration)
- exclusions: a concise plain-language summary of what is NOT covered
- claim_contact: the phone number, website, or email to use to make a claim

Respond with ONLY a JSON object, no other text, in this exact shape:
{"start_date": string|null, "end_date": string|null, "coverage_description": string|null, "exclusions": string|null, "claim_contact": string|null, "uncertain": string[]}

"uncertain" lists the keys of any field you are not confident about. Use null for fields you cannot find at all.`;

const PROMPTS = { label: LABEL_PROMPT, receipt: RECEIPT_PROMPT, warranty: WARRANTY_PROMPT } as const;

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in model response");
  return JSON.parse(match[0]);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "not_configured", message: "AI extraction isn't set up yet — add ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  const formData = await request.formData();
  const kind = formData.get("kind");
  const file = formData.get("image");

  if (
    (kind !== "label" && kind !== "receipt" && kind !== "warranty") ||
    !(file instanceof File)
  ) {
    return NextResponse.json({ error: "Expected 'kind' and 'image' fields" }, { status: 400 });
  }

  // Only the Warranty tab's "upload & AI-extract" flow is Premium-gated (spec
  // 6.3/6.4 — it's the one with a real variable AI cost outside product
  // registration). Label/receipt extraction during Add Product stays free.
  if (kind === "warranty") {
    const { data: profile } = await supabase
      .from("users")
      .select("subscription_status")
      .eq("id", user.id)
      .single();

    if (!isPremium(profile)) {
      return NextResponse.json(
        { error: "premium_required", message: "AI warranty extraction is a Premium feature." },
        { status: 402 },
      );
    }
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");
  const mediaType = file.type || "image/jpeg";
  const isPdf = mediaType === "application/pdf";

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            isPdf
              ? {
                  type: "document",
                  source: { type: "base64", media_type: "application/pdf", data: base64 },
                }
              : {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType as "image/jpeg" | "image/png" | "image/webp",
                    data: base64,
                  },
                },
            {
              type: "text",
              text: PROMPTS[kind],
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from model");
    }

    const parsed = extractJson(textBlock.text);
    return NextResponse.json({ ok: true, data: parsed });
  } catch (error) {
    return NextResponse.json(
      { error: "extraction_failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 },
    );
  }
}
