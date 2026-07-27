"use client";

import { useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { parseDateOnly } from "@/lib/warranty";
import type { RecallSearchResult } from "@/components/recalls/types";

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

export function RecallSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RecallSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recalls/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) throw new Error("Search failed — try again.");
      const data = await res.json();
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed — try again.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-white p-3.5">
      <div className="mb-2.5 flex items-center gap-2 text-[10px] tracking-wide text-ink uppercase">
        Search all recalls
      </div>
      <form onSubmit={runSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Brand, model number, VIN, or serial number"
          className="h-9 flex-1 rounded-lg border border-border bg-cloud px-3 text-[12px] text-foreground placeholder:text-ink/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-navy px-3.5 text-[11px] font-medium text-white disabled:opacity-50"
        >
          <Search className="h-3.5 w-3.5" />
          {loading ? "Searching…" : "Search"}
        </button>
      </form>
      <p className="mt-2 text-[10px] leading-relaxed text-ink">
        Searches every recall Buddy has fetched so far — not just ones matching your
        vault. A VIN or serial number is matched against your own registered products
        first, then searched by that product&apos;s brand and model.
      </p>

      {error ? <p className="mt-2.5 text-[11px] text-red">{error}</p> : null}

      {results !== null ? (
        <div className="mt-3">
          {results.length === 0 ? (
            <p className="text-[11px] text-ink">No recalls found for &quot;{query}&quot;.</p>
          ) : (
            <>
              <div className="mb-2 text-[10px] text-ink">
                {results.length} result{results.length === 1 ? "" : "s"}
              </div>
              {results.map((r) => (
                <div key={r.id} className="mb-2 rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-cloud px-2 py-0.5 text-[10px] font-medium text-ink">
                          {r.source}
                        </span>
                        {r.brand ? (
                          <span className="text-[11px] font-medium text-foreground">{r.brand}</span>
                        ) : null}
                        {r.model_numbers.length > 0 ? (
                          <span className="text-[10px] text-ink">{r.model_numbers.join(", ")}</span>
                        ) : null}
                      </div>
                    </div>
                    {r.recall_date ? (
                      <div className="shrink-0 text-[10px] text-ink">{formatDate(r.recall_date)}</div>
                    ) : null}
                  </div>

                  {r.description ? (
                    <p className="mt-2 text-[11px] leading-relaxed text-ink">{r.description}</p>
                  ) : null}

                  {r.remedy ? (
                    <div className="mt-2 rounded-lg border border-amber/40 bg-amber/10 p-2">
                      <div className="mb-0.5 text-[9px] font-medium tracking-wide text-amber uppercase">
                        Remedy
                      </div>
                      <div className="text-[11px] leading-relaxed text-foreground">{r.remedy}</div>
                    </div>
                  ) : null}

                  {r.action_url ? (
                    <a
                      href={r.action_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex w-fit items-center gap-1.5 text-[11px] text-ink underline underline-offset-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {AGENCY_PAGE_LABEL[r.source] ?? "Official page"}
                    </a>
                  ) : null}
                </div>
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
