import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { guessCategory } from "@/lib/products";

interface UpcItemDbItem {
  brand?: string;
  title?: string;
  model?: string;
  category?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { barcode } = await request.json();
  if (!barcode || typeof barcode !== "string") {
    return NextResponse.json({ error: "Missing barcode" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: cached } = await admin
    .from("product_lookup_cache")
    .select("*")
    .eq("barcode", barcode)
    .maybeSingle();

  if (cached) {
    return NextResponse.json({ found: true, origin: "cache", ...cached });
  }

  const apiKey = process.env.UPCITEMDB_API_KEY;
  const url = apiKey
    ? `https://api.upcitemdb.com/prod/v1/lookup?upc=${encodeURIComponent(barcode)}`
    : `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) {
    headers.user_key = apiKey;
    headers.key_type = "3scale";
  }

  let item: UpcItemDbItem | undefined;
  try {
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      item = data.items?.[0];
    }
  } catch {
    // Network failure — fall through to "not found" below.
  }

  if (!item) {
    return NextResponse.json({ found: false });
  }

  const result = {
    barcode,
    brand: item.brand ?? null,
    model_name: item.title ?? null,
    model_number: item.model ?? null,
    category: guessCategory(`${item.category ?? ""} ${item.title ?? ""}`),
    source: "UPCitemdb",
  };

  // Two concurrent lookups of the same uncached barcode can both reach here;
  // upsert with ignoreDuplicates so the second insert's primary-key
  // collision is a no-op instead of an unchecked/unhandled error.
  await admin
    .from("product_lookup_cache")
    .upsert(result, { onConflict: "barcode", ignoreDuplicates: true });

  return NextResponse.json({ found: true, origin: "live", ...result });
}
