import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { isPremium } from "@/lib/entitlements";
import { InsuranceExportDocument, type InsuranceExportItem } from "@/lib/insurance-export-pdf";
import { createClient } from "@/lib/supabase/server";
import type { ProductCategory } from "@/lib/supabase/types";

export const runtime = "nodejs";

interface ExportProductRow {
  id: string;
  name: string;
  brand: string | null;
  model_number: string | null;
  serial_number: string | null;
  category: ProductCategory;
  room_location: string | null;
  quantity: number;
  purchase_date: string | null;
  purchase_price: number | null;
  retailer: string | null;
  documents: { document_type: string }[];
}

function buildPath(userId: string) {
  return `${userId}/exports/${crypto.randomUUID()}.pdf`;
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
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { data: row } = await supabase
    .from("insurance_exports")
    .select("file_url")
    .eq("id", id)
    .single();

  if (!row) {
    return NextResponse.json({ error: "Export not found" }, { status: 404 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("product-documents")
    .createSignedUrl(row.file_url, 3600);

  if (signError || !signed) {
    return NextResponse.json({ error: signError?.message ?? "Couldn't sign URL" }, { status: 500 });
  }

  return NextResponse.json({ downloadUrl: signed.signedUrl });
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
      { error: "premium_required", message: "The insurance inventory export is a Premium feature." },
      { status: 402 },
    );
  }

  const body = await request.json();
  const scope = body?.scope as "vault" | "room" | "category" | undefined;
  const value = typeof body?.value === "string" ? body.value : undefined;

  if (scope !== "vault" && (!value || (scope !== "room" && scope !== "category"))) {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }

  let query = supabase
    .from("products")
    .select(
      "id, name, brand, model_number, serial_number, category, room_location, quantity, purchase_date, purchase_price, retailer, documents(document_type)",
    )
    .order("room_location", { ascending: true, nullsFirst: false });

  if (scope === "room") query = query.eq("room_location", value!);
  if (scope === "category") query = query.eq("category", value as ProductCategory);

  const { data: products, error } = await query.returns<ExportProductRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!products || products.length === 0) {
    return NextResponse.json({ error: "No products match this scope" }, { status: 400 });
  }

  const items: InsuranceExportItem[] = products.map((p) => ({
    name: p.name,
    brand: p.brand,
    modelNumber: p.model_number,
    serialNumber: p.serial_number,
    category: p.category,
    roomLocation: p.room_location,
    quantity: p.quantity,
    purchaseDate: p.purchase_date,
    purchasePrice: p.purchase_price,
    retailer: p.retailer,
    hasReceipt: p.documents.some((d) => d.document_type === "Receipt"),
    hasWarrantyDocument: p.documents.some((d) => d.document_type === "Warranty"),
  }));

  const scopeLabel = scope === "vault" ? "Full vault" : scope === "room" ? value! : `${value} (category)`;
  const generatedAt = new Date();
  const totalValue = items.reduce((sum, item) => sum + (item.purchasePrice ?? 0) * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(
      InsuranceExportDocument({ data: { generatedAt, scopeLabel, items } }),
    );
  } catch (e) {
    return NextResponse.json(
      { error: "pdf_failed", message: e instanceof Error ? e.message : "Couldn't generate the PDF." },
      { status: 500 },
    );
  }

  const path = buildPath(user.id);
  const { error: uploadError } = await supabase.storage
    .from("product-documents")
    .upload(path, buffer, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: exportRow, error: insertError } = await supabase
    .from("insurance_exports")
    .insert({
      user_id: user.id,
      scope_label: scopeLabel,
      item_count: itemCount,
      total_value: totalValue,
      file_url: path,
      generated_at: generatedAt.toISOString(),
    })
    .select("id, scope_label, item_count, total_value, file_url, generated_at")
    .single();

  if (insertError || !exportRow) {
    return NextResponse.json({ error: insertError?.message ?? "Couldn't save export record" }, { status: 500 });
  }

  const { data: signed } = await supabase.storage
    .from("product-documents")
    .createSignedUrl(path, 3600);

  return NextResponse.json({ ok: true, export: exportRow, downloadUrl: signed?.signedUrl ?? null });
}
