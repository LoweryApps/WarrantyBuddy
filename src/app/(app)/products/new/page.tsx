import { AddProductWizard } from "@/components/products/add-product-wizard";
import { loadPremiumStatus } from "@/lib/get-entitlements";
import { createClient } from "@/lib/supabase/server";

export default async function NewProductPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [premium, { count: productCount }] = await Promise.all([
    user ? loadPremiumStatus(supabase, user.id) : Promise.resolve(false),
    supabase.from("products").select("id", { count: "exact", head: true }),
  ]);

  return <AddProductWizard premium={premium} initialProductCount={productCount ?? 0} />;
}
