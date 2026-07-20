import Link from "next/link";
import { AddProductCard } from "@/components/dashboard/add-product-card";
import { AskBuddyFab } from "@/components/dashboard/ask-buddy-fab";
import { EmptyVault } from "@/components/dashboard/empty-vault";
import { ProductCard, type DashboardProduct } from "@/components/dashboard/product-card";
import { RecallBanner } from "@/components/dashboard/recall-banner";
import { ReceiptBanner } from "@/components/dashboard/receipt-banner";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { warrantyStatus } from "@/lib/warranty";
import type { ProductCategory } from "@/lib/supabase/types";

interface ProductRow {
  id: string;
  name: string;
  brand: string | null;
  model_number: string | null;
  category: ProductCategory;
  created_at: string;
  warranties: { end_date: string | null; created_at: string }[];
}

interface RecallAlertRow {
  id: string;
  product_id: string;
  products: { name: string } | null;
  recalls: { description: string | null; remedy: string | null } | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: products }, { data: recallAlerts }, { count: pendingReceiptsCount }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, name, brand, model_number, category, created_at, warranties(end_date, created_at)")
        .order("created_at", { ascending: false })
        .returns<ProductRow[]>(),
      supabase
        .from("user_recall_alerts")
        .select("id, product_id, products(name), recalls(description, remedy)")
        .eq("acknowledged", false)
        .order("notified_at", { ascending: false })
        .returns<RecallAlertRow[]>(),
      supabase
        .from("forwarded_receipts")
        .select("id", { count: "exact", head: true })
        .eq("status", "Pending Review"),
    ]);

  const productList = products ?? [];
  const alerts = recallAlerts ?? [];
  const recalledProductIds = new Set(alerts.map((a) => a.product_id));

  const dashboardProducts: DashboardProduct[] = productList.map((p) => {
    const latestWarranty = [...p.warranties].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];

    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      model_number: p.model_number,
      category: p.category,
      warrantyEndDate: latestWarranty?.end_date ?? null,
      hasWarranty: !!latestWarranty,
      hasRecall: recalledProductIds.has(p.id),
    };
  });

  const activeCount = dashboardProducts.filter(
    (p) => p.hasWarranty && warrantyStatus(p.warrantyEndDate) === "active",
  ).length;
  const expiringCount = dashboardProducts.filter(
    (p) => p.hasWarranty && warrantyStatus(p.warrantyEndDate) === "expiring",
  ).length;

  const firstAlert = alerts[0];

  return (
    <div className="mx-auto max-w-[900px] px-5 py-5">
      {firstAlert ? (
        <RecallBanner
          productName={firstAlert.products?.name ?? "a product"}
          description={firstAlert.recalls?.description ?? "See details for remedy and next steps."}
          totalCount={alerts.length}
        />
      ) : null}

      {pendingReceiptsCount ? <ReceiptBanner count={pendingReceiptsCount} /> : null}

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard label="Products" value={productList.length} note="in your vault" />
        <StatCard label="Active warranties" value={activeCount} note="covered" tone="teal" />
        <StatCard label="Expiring soon" value={expiringCount} note="within 60 days" tone="amber" />
        <StatCard label="Recall alerts" value={alerts.length} note="needs action" tone="red" />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="text-[13px] font-medium text-foreground">Your vault</div>
        {productList.length > 0 ? (
          <div className="flex gap-1.5">
            <Link href="/insurance-export">
              <Button
                variant="outline"
                className="h-8 rounded-lg border-border bg-white px-3 text-[11px] font-medium text-foreground hover:bg-cloud"
              >
                Export for insurance
              </Button>
            </Link>
            <Link href="/products/new">
              <Button className="h-8 rounded-lg bg-navy px-3 text-[11px] font-medium text-white hover:bg-navy/90">
                + Add product
              </Button>
            </Link>
          </div>
        ) : null}
      </div>

      {productList.length === 0 ? (
        <EmptyVault />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {dashboardProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          <AddProductCard />
        </div>
      )}

      <AskBuddyFab productCount={productList.length} />
    </div>
  );
}
