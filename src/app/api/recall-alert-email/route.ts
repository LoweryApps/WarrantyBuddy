import { NextResponse } from "next/server";
import { buildRecallAlertEmail, sendEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const {
    productId,
    productName,
    brand,
    modelNumber,
    recallSource,
    recallDescription,
    recallRemedy,
  } = await request.json();

  if (!productId || !productName || !recallSource) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Confirm the product belongs to this user — RLS scopes the row to
  // auth.uid(), so a mismatched productId simply returns no rows.
  const { data: product } = await supabase.from("products").select("id").eq("id", productId).maybeSingle();
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, notification_email")
    .eq("id", user.id)
    .single();

  if (profile && !profile.notification_email) {
    return NextResponse.json({ sent: false, reason: "notifications_disabled" });
  }

  try {
    const { subject, html } = buildRecallAlertEmail({
      recipientName: profile?.full_name ?? null,
      productName,
      brand: brand ?? null,
      modelNumber: modelNumber ?? null,
      recallSource,
      recallDescription: recallDescription ?? null,
      recallRemedy: recallRemedy ?? null,
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    });

    await sendEmail({ to: user.email, subject, html });
    return NextResponse.json({ sent: true });
  } catch (error) {
    // Email delivery is best-effort — never block the product-save flow.
    return NextResponse.json({
      sent: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
