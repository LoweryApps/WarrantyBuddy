import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isPremium } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import type { ProductCategory } from "@/lib/supabase/types";

export const runtime = "nodejs";

interface SearchableProduct {
  name: string;
  brand: string | null;
  model_number: string | null;
  category: ProductCategory;
  model_year: number | null;
}

function buildPrompt(product: SearchableProduct): string {
  const facts = [
    `- Brand/Make: ${product.brand}`,
    `- Product name: ${product.name}`,
    `- Category: ${product.category}`,
    product.model_number ? `- Model number: ${product.model_number}` : null,
    product.model_year ? `- Model year: ${product.model_year}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `You are researching the standard, publicly published manufacturer warranty terms for a specific product using web search. You do not have access to any document the user has — only what you find on the web.

Product details:
${facts}

Search the web for this manufacturer's standard published warranty terms for this product (for vehicles, search by make, model, and model year). Look for the manufacturer's official warranty page or a reliable, specific summary of it. Do not guess or fabricate terms — only report success if you found an actual published source.

If you find reliable, specific terms, your FINAL message must be ONLY a JSON object in this exact shape, with no other text before or after it and no markdown code fences:
{"found": true, "warranty_type": "Manufacturer"|"Extended"|"Retailer", "duration_months": number|null, "coverage_description": string, "exclusions": string|null, "claim_contact": string|null, "source_note": string}

"duration_months" is the length of the standard warranty in whole months (e.g. 12 for one year), or null if you found terms but couldn't determine a specific duration. "source_note" is one short plain-language sentence on where this came from (e.g. "Based on Whirlpool's published 1-year limited warranty for major appliances").

If you cannot find reliable, specific terms for this product, your FINAL message must instead be ONLY:
{"found": false, "reason": string}

"reason" is a short, plain-language explanation for the user (e.g. "Buddy couldn't find published warranty terms for this brand and category online.").`;
}

interface WarrantySearchResult {
  found: boolean;
  warranty_type?: string;
  duration_months?: number | null;
  coverage_description?: string | null;
  exclusions?: string | null;
  claim_contact?: string | null;
  source_note?: string | null;
  reason?: string;
}

function extractJson(text: string): WarrantySearchResult {
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

  const { data: profile } = await supabase
    .from("users")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  if (!isPremium(profile)) {
    return NextResponse.json(
      { error: "premium_required", message: "Warranty Search is a Premium feature." },
      { status: 402 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "not_configured", message: "Warranty Search isn't set up yet — add ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  const { productId } = await request.json();
  if (typeof productId !== "string" || !productId) {
    return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  }

  const { data: product, error } = await supabase
    .from("products")
    .select("name, brand, model_number, category, model_year")
    .eq("id", productId)
    .single()
    .returns<SearchableProduct>();

  if (error || !product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (!product.brand) {
    return NextResponse.json(
      { error: "missing_brand", message: "Add a brand to this product before searching for warranty terms." },
      { status: 400 },
    );
  }

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      messages: [{ role: "user", content: buildPrompt(product) }],
    });

    const textBlocks = message.content.filter((block) => block.type === "text");
    const lastText = textBlocks[textBlocks.length - 1];
    if (!lastText || lastText.type !== "text") {
      throw new Error("No text response from model");
    }

    const parsed = extractJson(lastText.text);
    return NextResponse.json({ ok: true, data: parsed });
  } catch (error) {
    return NextResponse.json(
      {
        error: "search_failed",
        message: error instanceof Error ? error.message : "Buddy couldn't search for warranty terms right now.",
      },
      { status: 502 },
    );
  }
}
