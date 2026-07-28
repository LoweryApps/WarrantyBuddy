"use client";

import { useState } from "react";
import { ExternalLink, Search } from "lucide-react";

interface RecallSearchResult {
  id: string;
  source: string;
  brand: string | null;
  model_numbers: string[];
  description: string | null;
  remedy: string | null;
  action_url: string | null;
  recall_date: string | null;
}

function formatDate(dateStr: string) {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
  const date = isDateOnly ? new Date(dateStr + "T00:00:00") : new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const AGENCY_PAGE_LABEL: Record<string, string> = {
  CPSC: "CPSC page",
  NHTSA: "NHTSA page",
  FDA: "FDA page",
  USDA: "USDA page",
};

export function PublicRecallChecker() {
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
      const res = await fetch("/api/recall-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (res.status === 429) {
        const body = await res.json();
        throw new Error(body.message ?? "Too many searches — try again in a bit.");
      }
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
    <div className="rounded-2xl border border-border bg-white p-5">
      <form onSubmit={runSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Brand and model — e.g. &quot;Ford Bronco&quot; or &quot;Whirlpool&quot;"
          className="h-11 flex-1 rounded-lg border border-border bg-cloud px-3.5 text-sm text-foreground placeholder:text-ink/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex h-11 items-center gap-2 rounded-lg bg-navy px-5 text-sm font-bold text-white disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-red">{error}</p> : null}

      {results !== null ? (
        <div className="mt-4">
          {results.length === 0 ? (
            <p className="text-sm text-ink">No recalls found for &quot;{query}&quot;.</p>
          ) : (
            <>
              <div className="mb-2.5 text-xs text-ink">
                {results.length} result{results.length === 1 ? "" : "s"}
              </div>
              {results.map((r) => (
                <div key={r.id} className="mb-2.5 rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-cloud px-2.5 py-1 text-[11px] font-medium text-ink">{r.source}</span>
                        {r.brand ? <span className="text-sm font-medium text-foreground">{r.brand}</span> : null}
                        {r.model_numbers.length > 0 ? (
                          <span className="text-xs text-ink">{r.model_numbers.join(", ")}</span>
                        ) : null}
                      </div>
                    </div>
                    {r.recall_date ? <div className="shrink-0 text-xs text-ink">{formatDate(r.recall_date)}</div> : null}
                  </div>

                  {r.description ? <p className="mt-2.5 text-sm leading-relaxed text-ink">{r.description}</p> : null}

                  {r.remedy ? (
                    <div className="mt-2.5 rounded-lg border border-amber/40 bg-amber/10 p-2.5">
                      <div className="mb-1 text-[10px] font-medium tracking-wide text-amber uppercase">Remedy</div>
                      <div className="text-sm leading-relaxed text-foreground">{r.remedy}</div>
                    </div>
                  ) : null}

                  {r.action_url ? (
                    <a
                      href={r.action_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 flex w-fit items-center gap-1.5 text-sm text-ink underline underline-offset-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
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
