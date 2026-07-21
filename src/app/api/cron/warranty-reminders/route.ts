import { NextResponse } from "next/server";
import { buildWarrantyReminderEmail, sendEmail } from "@/lib/email";
import { bestPidMatches, PID_SOURCE_LABEL } from "@/lib/product-intelligence";
import { createAdminClient } from "@/lib/supabase/admin";
import { daysUntil, parseDateOnly, warrantyStatus } from "@/lib/warranty";

export const runtime = "nodejs";

interface WarrantyRow {
  id: string;
  end_date: string;
  products: {
    id: string;
    name: string;
    brand: string | null;
    model_number: string | null;
    user_id: string;
    users: { email: string; full_name: string | null; notification_email: boolean } | null;
  } | null;
}

function queryUpperBoundIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data: warranties, error } = await supabase
    .from("warranties")
    .select(
      "id, end_date, products(id, name, brand, model_number, user_id, users(email, full_name, notification_email))",
    )
    .is("expiry_notified_at", null)
    .not("end_date", "is", null)
    .lte("end_date", queryUpperBoundIso())
    .returns<WarrantyRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const warranty of warranties ?? []) {
    const product = warranty.products;
    const profile = product?.users;

    if (!product || !profile || warrantyStatus(warranty.end_date) !== "expiring") {
      continue;
    }

    if (!profile.notification_email) {
      skipped += 1;
      continue;
    }

    let knownIssue: { failureType: string; complaintCount: number; sourceLabel: string } | null = null;
    if (product.brand) {
      const { data: pidMatches } = await supabase
        .from("product_intelligence")
        .select("model_number, failure_type, complaint_count, source")
        .ilike("brand", product.brand)
        .eq("is_active", true);

      const best = bestPidMatches(pidMatches ?? [], product.model_number)[0];

      if (best) {
        knownIssue = {
          failureType: best.failure_type,
          complaintCount: best.complaint_count,
          sourceLabel: PID_SOURCE_LABEL[best.source],
        };
      }
    }

    try {
      const { subject, html } = buildWarrantyReminderEmail({
        recipientName: profile.full_name,
        productName: product.name,
        endDateLabel: parseDateOnly(warranty.end_date).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        daysRemaining: daysUntil(warranty.end_date),
        productUrl: `${appUrl}/products/${product.id}`,
        knownIssue,
      });

      await sendEmail({ to: profile.email, subject, html });
      await supabase.from("warranties").update({ expiry_notified_at: new Date().toISOString() }).eq("id", warranty.id);
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({ checked: warranties?.length ?? 0, sent, skipped, failed });
}
