import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import {
  buildSystemPrompt,
  hasWarrantyDocument,
  splitSource,
  type ProductContext,
  type VaultProductSummary,
} from "@/lib/ask-buddy";
import { isPremium } from "@/lib/entitlements";
import { PID_SOURCE_LABEL } from "@/lib/product-intelligence";
import { downloadProductFile } from "@/lib/supabase/storage";
import { createClient } from "@/lib/supabase/server";
import type { ProductCategory } from "@/lib/supabase/types";
import { warrantyStatus } from "@/lib/warranty";

export const runtime = "nodejs";

const HISTORY_LIMIT = 20;

function guessMediaType(fileName: string): "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | null {
  const ext = fileName.toLowerCase().split(".").pop();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return null;
  }
}

interface VaultProductRow {
  id: string;
  name: string;
  brand: string | null;
  model_number: string | null;
  purchase_price: number | null;
  warranties: { end_date: string | null; created_at: string }[];
  documents: { document_type: string }[];
}

async function loadVaultSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<VaultProductSummary[]> {
  const [{ data: products }, { data: alerts }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, brand, model_number, purchase_price, warranties(end_date, created_at), documents(document_type)")
      .returns<VaultProductRow[]>(),
    supabase.from("user_recall_alerts").select("product_id").eq("acknowledged", false),
  ]);

  const recalledIds = new Set((alerts ?? []).map((a) => a.product_id));

  return (products ?? []).map((p) => {
    const latestWarranty = [...p.warranties].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
    const endDate = latestWarranty?.end_date ?? null;
    return {
      name: p.name,
      brand: p.brand,
      modelNumber: p.model_number,
      warrantyEndDate: endDate,
      warrantyStatus: latestWarranty ? warrantyStatus(endDate) : "none",
      hasWarranty: !!latestWarranty,
      hasDocument: p.documents.some((d) => d.document_type === "Warranty"),
      hasRecall: recalledIds.has(p.id),
      purchasePrice: p.purchase_price,
    };
  });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");

  let historyQuery = supabase
    .from("chat_messages")
    .select("id, role, content, source, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  historyQuery = productId ? historyQuery.eq("product_id", productId) : historyQuery.is("product_id", null);

  let hasDocument = false;
  if (productId) {
    const [{ data: warranty }, { data: documents }] = await Promise.all([
      supabase
        .from("warranties")
        .select("document_url")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("documents").select("document_type").eq("product_id", productId),
    ]);
    hasDocument = hasWarrantyDocument({
      warrantyDocumentUrl: warranty?.document_url,
      documents: documents ?? [],
    });
  }

  const { data: messages, error } = await historyQuery;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: messages ?? [], hasDocument });
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
      { error: "premium_required", message: "Ask Buddy is a Premium feature." },
      { status: 402 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "not_configured", message: "Ask Buddy isn't set up yet — add ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  const { productId, message } = await request.json();
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  const { data: userRow, error: insertUserError } = await supabase
    .from("chat_messages")
    .insert({ user_id: user.id, product_id: productId ?? null, role: "user", content: message.trim() })
    .select("id, role, content, source, created_at")
    .single();

  if (insertUserError || !userRow) {
    return NextResponse.json({ error: insertUserError?.message ?? "Couldn't save message" }, { status: 500 });
  }

  let historyQuery = supabase
    .from("chat_messages")
    .select("id, role, content, source, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  historyQuery = productId ? historyQuery.eq("product_id", productId) : historyQuery.is("product_id", null);

  const [{ data: historyDesc }, vaultSummary] = await Promise.all([
    historyQuery,
    loadVaultSummary(supabase),
  ]);
  const history = [...(historyDesc ?? [])].reverse();

  let productContext: ProductContext | null = null;
  let documentBlock: { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } } | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/webp"; data: string } } | null = null;

  if (productId) {
    const [{ data: product }, { data: warranty }, { data: documents }, { data: alerts }] = await Promise.all([
      supabase
        .from("products")
        .select("name, brand, model_number, serial_number, category, purchase_date, purchase_price, retailer")
        .eq("id", productId)
        .single(),
      supabase
        .from("warranties")
        .select("warranty_type, start_date, end_date, coverage_description, exclusions, claim_contact, document_url")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("documents").select("document_type, file_url, file_name").eq("product_id", productId),
      supabase
        .from("user_recall_alerts")
        .select("acknowledged, recalls(source, description, remedy)")
        .eq("product_id", productId)
        .eq("acknowledged", false)
        .limit(1),
    ]);

    if (product) {
      const recall = alerts?.[0]?.recalls as
        | { source: string; description: string | null; remedy: string | null }
        | null
        | undefined;

      let knownIssues: ProductContext["knownIssues"] = [];
      if (product.brand) {
        const { data: pidMatches } = await supabase
          .from("product_intelligence")
          .select("model_number, failure_type, failure_description, complaint_count, severity, source")
          .ilike("brand", product.brand)
          .eq("is_active", true);

        const modelLower = (product.model_number ?? "").toLowerCase();
        knownIssues = (pidMatches ?? [])
          .filter((r) => !r.model_number || r.model_number.toLowerCase() === modelLower)
          .sort((a, b) => b.complaint_count - a.complaint_count)
          .slice(0, 3)
          .map((r) => ({
            failureType: r.failure_type,
            failureDescription: r.failure_description,
            complaintCount: r.complaint_count,
            severity: r.severity,
            source: PID_SOURCE_LABEL[r.source],
          }));
      }

      productContext = {
        name: product.name,
        brand: product.brand,
        modelNumber: product.model_number,
        serialNumber: product.serial_number,
        category: product.category as ProductCategory,
        purchaseDate: product.purchase_date,
        purchasePrice: product.purchase_price,
        retailer: product.retailer,
        warranty: warranty
          ? {
              type: warranty.warranty_type,
              startDate: warranty.start_date,
              endDate: warranty.end_date,
              status: warrantyStatus(warranty.end_date),
              coverageDescription: warranty.coverage_description,
              exclusions: warranty.exclusions,
              claimContact: warranty.claim_contact,
            }
          : null,
        recall: recall ? { source: recall.source, description: recall.description, remedy: recall.remedy } : null,
        knownIssues,
      };

      const warrantyDoc = documents?.find((d) => d.document_type === "Warranty");
      const docPath = warranty?.document_url ?? warrantyDoc?.file_url ?? null;
      const docName = warrantyDoc?.file_name ?? docPath ?? "";

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
          // Document couldn't be downloaded — proceed without grounding, the
          // system prompt already tells Buddy to disclose the fallback.
          documentBlock = null;
        }
      }
    }
  }

  const systemPrompt = buildSystemPrompt({
    mode: productId ? "product" : "vault",
    product: productContext,
    hasDocumentBytes: !!documentBlock,
    vaultSummary,
  });

  const anthropicMessages: MessageParam[] = history.map((m, i) => {
    const isLast = i === history.length - 1;
    if (isLast && m.role === "user" && documentBlock) {
      return { role: "user", content: [documentBlock, { type: "text", text: m.content }] };
    }
    return { role: m.role, content: m.content };
  });

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from model");
    }

    const { content, source } = splitSource(textBlock.text);

    const { data: assistantRow, error: insertAssistantError } = await supabase
      .from("chat_messages")
      .insert({
        user_id: user.id,
        product_id: productId ?? null,
        role: "assistant",
        content,
        source,
      })
      .select("id, role, content, source, created_at")
      .single();

    if (insertAssistantError || !assistantRow) {
      return NextResponse.json({ error: insertAssistantError?.message ?? "Couldn't save reply" }, { status: 500 });
    }

    return NextResponse.json({ userMessage: userRow, reply: assistantRow });
  } catch (error) {
    return NextResponse.json(
      {
        error: "reply_failed",
        message: error instanceof Error ? error.message : "Buddy couldn't respond — try again.",
        userMessage: userRow,
      },
      { status: 502 },
    );
  }
}
