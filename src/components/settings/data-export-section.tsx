"use client";

import { useState } from "react";
import { Database, Download } from "lucide-react";
import { UpgradeDialog } from "@/components/paywall/upgrade-dialog";
import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { SettingsSection } from "@/components/settings/section";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { downloadCsv, toCsv } from "@/lib/csv";

interface ExportRow {
  name: string;
  brand: string | null;
  model_number: string | null;
  serial_number: string | null;
  category: string;
  purchase_date: string | null;
  purchase_price: number | null;
  retailer: string | null;
  warranties: { warranty_type: string; start_date: string | null; end_date: string | null }[];
}

export function DataExportSection({ premium }: { premium: boolean }) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  async function handleExport() {
    if (!premium) {
      setUpgradeOpen(true);
      return;
    }

    setExporting(true);
    setError(null);

    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("products")
      .select(
        "name, brand, model_number, serial_number, category, purchase_date, purchase_price, retailer, warranties(warranty_type, start_date, end_date)",
      )
      .order("created_at", { ascending: false })
      .returns<ExportRow[]>();

    setExporting(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    const csv = toCsv(
      [
        "Product name",
        "Brand",
        "Model number",
        "Serial number",
        "Category",
        "Purchase date",
        "Purchase price",
        "Retailer",
        "Warranty type",
        "Warranty start",
        "Warranty end",
      ],
      (data ?? []).map((p) => {
        const w = p.warranties[0];
        return [
          p.name,
          p.brand,
          p.model_number,
          p.serial_number,
          p.category,
          p.purchase_date,
          p.purchase_price,
          p.retailer,
          w?.warranty_type ?? "",
          w?.start_date ?? "",
          w?.end_date ?? "",
        ];
      }),
    );

    downloadCsv(`warrantybuddy-export-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <SettingsSection
      icon={Database}
      title="Data & privacy"
      subtitle="Export or delete your WarrantyBuddy data"
    >
      <div className="space-y-2.5 p-3.5">
        {error ? <p className="text-xs text-red">{error}</p> : null}
        <Button
          disabled={exporting}
          onClick={handleExport}
          variant="outline"
          className="h-10 w-full rounded-lg border-border bg-cloud text-foreground hover:bg-cloud/70"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Preparing export…" : premium ? "Export all data as CSV" : "Export all data as CSV (Premium)"}
        </Button>
        <DeleteAccountSection />
      </div>

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason="CSV data export is a Premium feature."
      />
    </SettingsSection>
  );
}
