import { redirect } from "next/navigation";
import { InsuranceExportView } from "@/components/insurance-export/insurance-export-view";
import { loadPremiumStatus } from "@/lib/get-entitlements";
import { createClient } from "@/lib/supabase/server";

export default async function InsuranceExportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [premium, { data: products }, { data: exports }] = await Promise.all([
    loadPremiumStatus(supabase, user.id),
    supabase
      .from("products")
      .select("id, category, room_location, quantity, purchase_price")
      .order("name", { ascending: true }),
    supabase
      .from("insurance_exports")
      .select("id, scope_label, item_count, total_value, generated_at")
      .order("generated_at", { ascending: false }),
  ]);

  return (
    <InsuranceExportView premium={premium} products={products ?? []} pastExports={exports ?? []} />
  );
}
