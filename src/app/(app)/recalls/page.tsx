import { RecallsView } from "@/components/recalls/recalls-view";
import type { RecallAlertWithProduct } from "@/components/recalls/types";
import { createClient } from "@/lib/supabase/server";

export default async function RecallsPage() {
  const supabase = await createClient();

  const [{ data: alerts }, { count: productCount }] = await Promise.all([
    supabase
      .from("user_recall_alerts")
      .select(
        "id, acknowledged, notified_at, recalls(id, source, recall_date, description, remedy, action_url), products(id, name, brand, model_number, category)",
      )
      .order("notified_at", { ascending: false })
      .returns<RecallAlertWithProduct[]>(),
    supabase.from("products").select("id", { count: "exact", head: true }),
  ]);

  const allAlerts = alerts ?? [];

  const active = allAlerts
    .filter((a) => !a.acknowledged)
    .sort((a, b) => {
      const dateA = a.recalls?.recall_date ?? a.notified_at;
      const dateB = b.recalls?.recall_date ?? b.notified_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

  const resolved = allAlerts
    .filter((a) => a.acknowledged)
    .sort((a, b) => {
      const dateA = a.recalls?.recall_date ?? a.notified_at;
      const dateB = b.recalls?.recall_date ?? b.notified_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

  return <RecallsView active={active} resolved={resolved} productCount={productCount ?? 0} />;
}
