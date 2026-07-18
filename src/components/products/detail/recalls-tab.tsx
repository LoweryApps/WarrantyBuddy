"use client";

import { useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import type { RecallAlertRecord } from "@/components/products/detail/types";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { parseDateOnly } from "@/lib/warranty";
import { cn } from "@/lib/utils";

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return parseDateOnly(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function RecallsTab({
  alerts,
  onFileClaim,
  onChanged,
}: {
  alerts: RecallAlertRecord[];
  onFileClaim: () => void;
  onChanged: () => void;
}) {
  const [resolving, setResolving] = useState<string | null>(null);

  async function handleResolve(alertId: string) {
    setResolving(alertId);
    const supabase = createClient();
    await supabase.from("user_recall_alerts").update({ acknowledged: true }).eq("id", alertId);
    setResolving(null);
    onChanged();
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-cloud p-6 text-center text-xs text-ink">
        No recalls found for this product
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const recall = alert.recalls;
        if (!recall) return null;
        return (
          <div
            key={alert.id}
            className={cn(
              "rounded-[10px] border p-3.5 transition-opacity",
              alert.acknowledged ? "border-border bg-cloud opacity-60" : "border-red/30 bg-red/5",
            )}
          >
            <div className="mb-2 flex items-start gap-2">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  alert.acknowledged ? "bg-ink/10 text-ink" : "bg-red/15 text-red",
                )}
              >
                {alert.acknowledged ? "Resolved" : "Active recall"}
              </span>
              {formatDate(recall.recall_date) ? (
                <span className="ml-auto text-[10px] text-ink">{formatDate(recall.recall_date)}</span>
              ) : null}
            </div>
            <div className={cn("mb-1.5 text-[13px] font-medium", alert.acknowledged ? "text-foreground" : "text-red")}>
              {recall.source} recall
            </div>
            <p className={cn("mb-2.5 text-[11px] leading-relaxed", alert.acknowledged ? "text-ink" : "text-red/80")}>
              {recall.description}
            </p>
            {recall.remedy ? (
              <div className="mb-2.5 rounded-md bg-white p-2.5 text-[11px] leading-relaxed text-foreground">
                <div className="mb-1 text-[10px] font-medium tracking-wide text-ink uppercase">Remedy</div>
                {recall.remedy}
              </div>
            ) : null}
            <div className="flex gap-2">
              {!alert.acknowledged ? (
                <Button
                  onClick={onFileClaim}
                  className="h-8 flex-1 rounded-md bg-white text-[11px] font-medium text-red hover:bg-white/80"
                  variant="outline"
                >
                  <FileText className="h-3 w-3" />
                  File a claim
                </Button>
              ) : null}
              {recall.action_url ? (
                <a
                  href={recall.action_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 flex-1 items-center justify-center gap-1 rounded-md border border-red/30 bg-white text-[11px] font-medium text-red"
                >
                  <ExternalLink className="h-3 w-3" />
                  Official recall page
                </a>
              ) : null}
            </div>
            {!alert.acknowledged ? (
              <button
                type="button"
                disabled={resolving === alert.id}
                onClick={() => handleResolve(alert.id)}
                className="mt-2 w-full rounded-md border border-border bg-white py-1.5 text-[11px] text-ink"
              >
                {resolving === alert.id ? "Marking…" : "Mark as resolved"}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
