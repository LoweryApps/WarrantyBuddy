"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ExternalLink, FileText } from "lucide-react";
import { CategoryIcon } from "@/components/dashboard/category-icon";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { parseDateOnly } from "@/lib/warranty";
import { cn } from "@/lib/utils";
import type { RecallAlertWithProduct } from "@/components/recalls/types";

function formatDate(dateStr: string) {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  const date = isDateOnly ? parseDateOnly(dateStr) : new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const AGENCY_PAGE_LABEL: Record<string, string> = {
  CPSC: "CPSC page",
  NHTSA: "NHTSA page",
  FDA: "FDA page",
  USDA: "USDA page",
};

export function RecallCard({ alert, onChanged }: { alert: RecallAlertWithProduct; onChanged: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const recall = alert.recalls;
  const product = alert.products;

  if (!recall) return null;

  async function toggleResolved(acknowledged: boolean) {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("user_recall_alerts").update({ acknowledged }).eq("id", alert.id);
    setBusy(false);
    onChanged();
  }

  return (
    <div
      className={cn(
        "mb-2.5 overflow-hidden rounded-xl border bg-white",
        alert.acknowledged ? "opacity-65" : "border-red/40",
      )}
    >
      <div className="flex items-start gap-2.5 p-3.5">
        {product ? <CategoryIcon category={product.category} /> : null}
        <div className="min-w-0 flex-1">
          {product ? (
            <Link href={`/products/${product.id}`} className="text-xs font-medium text-foreground hover:underline">
              {product.name}
            </Link>
          ) : (
            <div className="text-xs font-medium text-foreground">Product removed</div>
          )}
          {product ? (
            <div className="mt-0.5 text-[10px] text-ink">
              {[product.brand, product.model_number].filter(Boolean).join(" · ")}
            </div>
          ) : null}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-cloud px-2 py-0.5 text-[10px] font-medium text-ink">
              {recall.source}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                alert.acknowledged ? "bg-teal/10 text-teal" : "bg-red/15 text-red",
              )}
            >
              {alert.acknowledged ? "✓ Resolved" : "● Active"}
            </span>
          </div>
        </div>
        {recall.recall_date ? (
          <div className="shrink-0 text-[10px] text-ink">{formatDate(recall.recall_date)}</div>
        ) : null}
      </div>

      <div className="border-t border-border p-3.5">
        <p className="mb-2.5 text-[11px] leading-relaxed text-ink">{recall.description}</p>

        {!alert.acknowledged && recall.remedy ? (
          <div className="mb-2.5 rounded-lg border border-amber/40 bg-amber/10 p-2.5">
            <div className="mb-1 text-[10px] font-medium tracking-wide text-amber uppercase">Remedy</div>
            <div className="text-[11px] leading-relaxed text-foreground">{recall.remedy}</div>
          </div>
        ) : null}

        {alert.acknowledged ? (
          <div className="mb-2.5 flex items-center gap-2 rounded-lg bg-cloud p-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal/15 text-teal">
              <Check className="h-3 w-3" />
            </div>
            <div className="text-[11px] text-ink">Marked as resolved</div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {recall.action_url ? (
            <a
              href={recall.action_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-cloud px-3 text-[11px] text-ink"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {AGENCY_PAGE_LABEL[recall.source] ?? "Official page"}
            </a>
          ) : null}
          {!alert.acknowledged ? (
            <>
              {product ? (
                <Button
                  onClick={() => router.push(`/products/${product.id}/claim`)}
                  className="h-9 flex-1 rounded-lg bg-navy text-[11px] font-medium text-white hover:bg-navy/90"
                >
                  <FileText className="h-3.5 w-3.5" />
                  File a claim
                </Button>
              ) : null}
              <Button
                disabled={busy}
                onClick={() => toggleResolved(true)}
                className="h-9 rounded-lg bg-teal/10 text-[11px] font-medium text-teal hover:bg-teal/20"
                variant="ghost"
              >
                Mark resolved
              </Button>
            </>
          ) : (
            <Button
              disabled={busy}
              onClick={() => toggleResolved(false)}
              variant="outline"
              className="h-9 rounded-lg border-border text-[11px] text-ink hover:bg-cloud"
            >
              Undo resolved
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
