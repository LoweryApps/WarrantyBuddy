import { NextResponse } from "next/server";
import { FREE_RECEIPT_MONTHLY_LIMIT, getMonthlyConfirmedReceiptCount, isPremium } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface ConfirmBody {
  draftId: string;
  productId: string | null;
  productName: string;
  brand: string;
  retailer: string;
  orderDate: string;
  price: string;
  warrantyStart: string;
  warrantyEnd: string;
  coverage: string;
  exclusions: string;
  claimContact: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<ConfirmBody>;
  if (typeof body.draftId !== "string") {
    return NextResponse.json({ error: "Missing draftId" }, { status: 400 });
  }

  const { data: draft, error: draftError } = await supabase
    .from("forwarded_receipts")
    .select("kind, raw_email_url, source_email_subject, status")
    .eq("id", body.draftId)
    .single();

  if (draftError || !draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  if (draft.status === "Confirmed") {
    return NextResponse.json({ error: "This item was already confirmed" }, { status: 400 });
  }

  const isWarranty = draft.kind === "warranty" || draft.kind === "both";
  const isReceipt = draft.kind === "receipt" || draft.kind === "both";

  const { data: profile } = await supabase
    .from("users")
    .select("subscription_status")
    .eq("id", user.id)
    .single();
  const premium = isPremium(profile);

  // Warranty-kind drafts carry AI-extracted terms from a forwarded email —
  // same "AI warranty extraction is Premium" rule as the Warranty tab's
  // upload flow, enforced here instead of only in the confirm button's
  // disabled state (see the M3 finding in the 2026-07-20 code audit).
  if (isWarranty && !premium) {
    return NextResponse.json(
      { error: "premium_required", message: "AI warranty extraction is a Premium feature." },
      { status: 402 },
    );
  }

  if (!isWarranty && isReceipt && !premium) {
    const monthlyCount = await getMonthlyConfirmedReceiptCount(supabase, user.id);
    if (monthlyCount >= FREE_RECEIPT_MONTHLY_LIMIT) {
      return NextResponse.json(
        {
          error: "receipt_limit",
          message: "Free accounts can confirm up to 3 receipts per month. Upgrade to Premium for unlimited receipt forwarding.",
        },
        { status: 402 },
      );
    }
  }

  const productName = (body.productName ?? "").trim() || "Untitled product";
  const brand = (body.brand ?? "").trim();
  const retailer = (body.retailer ?? "").trim();

  let productId = body.productId ?? null;

  if (!productId) {
    const { data: newProduct, error: insertError } = await supabase
      .from("products")
      .insert({
        user_id: user.id,
        name: productName,
        brand: brand || null,
        retailer: retailer || null,
        purchase_date: body.orderDate || null,
        purchase_price: body.price ? Number(body.price) : null,
        category: "Other",
      })
      .select("id, brand, model_number")
      .single();

    if (insertError || !newProduct) {
      return NextResponse.json(
        { error: insertError?.message ?? "Couldn't create the product." },
        { status: 400 },
      );
    }
    productId = newProduct.id;

    if (newProduct.brand && newProduct.model_number) {
      const { data: recallMatch } = await supabase
        .from("recalls")
        .select("id, source, description, remedy")
        .ilike("brand", newProduct.brand)
        .contains("model_numbers", [newProduct.model_number])
        .limit(1)
        .maybeSingle();

      if (recallMatch) {
        await supabase.from("user_recall_alerts").insert({
          user_id: user.id,
          product_id: productId,
          recall_id: recallMatch.id,
        });

        fetch(new URL("/api/recall-alert-email", request.url), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId,
            productName,
            brand: newProduct.brand,
            modelNumber: newProduct.model_number,
            recallSource: recallMatch.source,
            recallDescription: recallMatch.description,
            recallRemedy: recallMatch.remedy,
          }),
        }).catch(() => {
          // Best-effort notification — never block the confirm flow.
        });
      }
    }
  }

  const hasWarrantyFields =
    isWarranty &&
    ((body.warrantyStart ?? "") ||
      (body.warrantyEnd ?? "") ||
      (body.coverage ?? "").trim() ||
      (body.exclusions ?? "").trim() ||
      (body.claimContact ?? "").trim());

  if (hasWarrantyFields) {
    const { error: warrantyError } = await supabase.from("warranties").insert({
      product_id: productId,
      warranty_type: "Manufacturer",
      start_date: body.warrantyStart || null,
      end_date: body.warrantyEnd || null,
      coverage_description: (body.coverage ?? "").trim() || null,
      exclusions: (body.exclusions ?? "").trim() || null,
      claim_contact: (body.claimContact ?? "").trim() || null,
      document_url: draft.raw_email_url,
      warranty_source: draft.raw_email_url ? "Uploaded" : "User-Entered",
    });
    if (warrantyError) {
      return NextResponse.json({ error: warrantyError.message }, { status: 400 });
    }
  }

  if (draft.raw_email_url) {
    const { error: documentError } = await supabase.from("documents").insert({
      product_id: productId,
      document_type: isWarranty ? "Warranty" : "Receipt",
      file_url: draft.raw_email_url,
      file_name: draft.source_email_subject ?? (isWarranty ? "Forwarded warranty document" : "Forwarded receipt"),
    });
    if (documentError) {
      return NextResponse.json({ error: documentError.message }, { status: 400 });
    }
  }

  const { error: updateError } = await supabase
    .from("forwarded_receipts")
    .update({ status: "Confirmed", product_id: productId })
    .eq("id", body.draftId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, productId });
}
