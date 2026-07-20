"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronLeft, Download, FileText, Sparkles } from "lucide-react";
import { UpgradeDialog } from "@/components/paywall/upgrade-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DISCLAIMER =
  "This document is a supporting record of registered items and is not a substitute for a police report or fire report, which most insurers require separately.";

export interface ExportableProduct {
  id: string;
  category: string;
  room_location: string | null;
  quantity: number;
  purchase_price: number | null;
}

export interface PastExport {
  id: string;
  scope_label: string;
  item_count: number;
  total_value: number | null;
  generated_at: string;
}

type ScopeType = "vault" | "room" | "category";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function InsuranceExportView({
  premium,
  products,
  pastExports,
}: {
  premium: boolean;
  products: ExportableProduct[];
  pastExports: PastExport[];
}) {
  const router = useRouter();
  const [scopeType, setScopeType] = useState<ScopeType>("vault");
  const [scopeValue, setScopeValue] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exports, setExports] = useState(pastExports);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const rooms = useMemo(
    () => [...new Set(products.map((p) => p.room_location).filter((r): r is string => !!r))].sort(),
    [products],
  );
  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products],
  );

  const scoped = useMemo(() => {
    if (scopeType === "vault") return products;
    if (scopeType === "room") return products.filter((p) => p.room_location === scopeValue);
    return products.filter((p) => p.category === scopeValue);
  }, [products, scopeType, scopeValue]);

  const itemCount = scoped.reduce((sum, p) => sum + p.quantity, 0);
  const totalValue = scoped.reduce((sum, p) => sum + (p.purchase_price ?? 0) * p.quantity, 0);
  const canGenerate = scopeType === "vault" || !!scopeValue;

  async function handleGenerate() {
    if (!canGenerate || scoped.length === 0) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/insurance-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: scopeType, value: scopeType === "vault" ? undefined : scopeValue }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.message ?? "Couldn't generate the export.");
        return;
      }

      setExports((prev) => [body.export, ...prev]);
      if (body.downloadUrl) {
        window.open(body.downloadUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      setError("Couldn't generate the export — try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(id: string) {
    setDownloadingId(id);
    try {
      const res = await fetch(`/api/insurance-export?id=${id}`);
      const body = await res.json();
      if (res.ok && body.downloadUrl) {
        window.open(body.downloadUrl, "_blank", "noopener,noreferrer");
      }
    } finally {
      setDownloadingId(null);
    }
  }

  if (!premium) {
    return (
      <div className="mx-auto max-w-2xl pb-16">
        <div className="flex h-12 items-center gap-2 bg-navy px-4">
          <Link href="/settings" className="flex items-center gap-1 text-[13px] text-white/60 hover:text-white">
            <ChevronLeft className="h-4 w-4" />
            Settings
          </Link>
          <div className="flex-1 text-center text-[13px] font-medium text-white">Insurance export</div>
          <div className="w-14" />
        </div>
        <UpgradeDialog
          open
          onOpenChange={(open) => {
            if (!open) router.push("/settings");
          }}
          reason="The insurance-ready inventory export is a Premium feature."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <div className="flex h-12 items-center gap-2 bg-navy px-4">
        <Link href="/settings" className="flex items-center gap-1 text-[13px] text-white/60 hover:text-white">
          <ChevronLeft className="h-4 w-4" />
          Settings
        </Link>
        <div className="flex-1 text-center text-[13px] font-medium text-white">Insurance export</div>
        <div className="w-14" />
      </div>

      <div className="p-4">
        <div className="mb-4">
          <div className="font-display text-base font-bold text-navy">Insurance-ready inventory</div>
          <p className="mt-1 text-xs leading-relaxed text-ink">
            Generate a formatted PDF of your vault to hand to an insurance adjuster after a theft, fire, or
            water damage claim.
          </p>
        </div>

        <div className="mb-2.5 text-[10px] tracking-wide text-ink uppercase">Scope</div>
        <div className="mb-3.5 grid grid-cols-3 gap-2">
          {(["vault", "room", "category"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setScopeType(type);
                setScopeValue("");
              }}
              className={cn(
                "rounded-[10px] border p-2.5 text-center text-xs font-medium transition-colors",
                scopeType === type ? "border-teal bg-teal/5 text-navy" : "border-border bg-white text-ink",
              )}
            >
              {type === "vault" ? "Full vault" : type === "room" ? "One room" : "One category"}
            </button>
          ))}
        </div>

        {scopeType === "room" ? (
          <div className="mb-3.5">
            <Select value={scopeValue || null} onValueChange={(v) => setScopeValue(v ?? "")}>
              <SelectTrigger className="h-11 w-full rounded-[10px] border-border bg-white px-3 text-sm data-placeholder:text-muted-foreground">
                <SelectValue placeholder="Select a room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.length === 0 ? (
                  <div className="p-2 text-xs text-ink">No products have a room assigned yet</div>
                ) : (
                  rooms.map((room) => (
                    <SelectItem key={room} value={room}>
                      {room}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {scopeType === "category" ? (
          <div className="mb-3.5">
            <Select value={scopeValue || null} onValueChange={(v) => setScopeValue(v ?? "")}>
              <SelectTrigger className="h-11 w-full rounded-[10px] border-border bg-white px-3 text-sm data-placeholder:text-muted-foreground">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="mb-3.5 rounded-xl border border-border bg-white p-3.5">
          <div className="mb-2 text-[10px] tracking-wide text-ink uppercase">Preview</div>
          <div className="flex items-center justify-between text-xs text-foreground">
            <span>Items included</span>
            <span className="font-medium">{itemCount}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-foreground">
            <span>Total combined value</span>
            <span className="font-medium">{formatMoney(totalValue)}</span>
          </div>
        </div>

        <div className="mb-3.5 rounded-[10px] bg-cloud p-3 text-[11px] leading-relaxed text-ink">
          {DISCLAIMER}
        </div>

        {error ? (
          <Alert className="mb-3.5 border-red/30 bg-red/5 text-red">
            <AlertDescription className="text-red">{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          disabled={!canGenerate || scoped.length === 0 || generating}
          onClick={handleGenerate}
          className="mb-6 h-12 w-full rounded-xl bg-teal font-semibold text-navy hover:bg-teal/90"
        >
          <Sparkles className="h-4 w-4" />
          {generating ? "Generating…" : "Generate PDF"}
        </Button>

        <div className="mb-2.5 text-[10px] tracking-wide text-ink uppercase">Past exports</div>
        {exports.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-cloud p-6 text-center text-xs text-ink">
            No exports generated yet
          </div>
        ) : (
          <div className="space-y-2">
            {exports.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-white p-2.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal/10 text-teal">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-foreground">{exp.scope_label}</div>
                  <div className="text-[10px] text-ink">
                    {formatDate(exp.generated_at)} · {exp.item_count} items
                    {exp.total_value !== null ? ` · ${formatMoney(exp.total_value)}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={downloadingId === exp.id}
                  onClick={() => handleDownload(exp.id)}
                  aria-label="Download"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-cloud text-ink hover:text-navy"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
