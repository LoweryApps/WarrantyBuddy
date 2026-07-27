import Anthropic from "@anthropic-ai/sdk";

export interface NormalizedRecall {
  source: "CPSC" | "NHTSA" | "FDA" | "USDA";
  external_recall_id: string;
  recall_date: string | null;
  brand: string | null;
  model_numbers: string[];
  description: string | null;
  remedy: string | null;
  action_url: string | null;
}

// ── CPSC (SaferProducts.gov) ────────────────────────────────────────────
// CPSC's structured Manufacturers[] and Products[].Model fields are almost
// always blank in practice (confirmed against live data: 0/63 recalls in a
// recent sample had a populated Model field) — the brand and model numbers
// only appear in the free-text Title/Description. So brand/model here is
// filled in by extractBrandModel() below, not read directly off the API.
export interface CpscApiRecall {
  RecallID: number;
  RecallNumber: string | null;
  RecallDate: string | null;
  Description: string | null;
  Title: string | null;
  URL: string | null;
  Products?: { Name?: string; Model?: string }[];
  Manufacturers?: { Name?: string }[];
  Hazards?: { Name?: string }[];
  Remedies?: { Name?: string }[];
}

export async function fetchCpscRecalls(sinceIsoDate: string): Promise<CpscApiRecall[]> {
  const url = `https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallDateStart=${sinceIsoDate}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`CPSC API error: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("CPSC API returned a non-array response");

  // The SaferProducts API signals a server-side failure with a 200 body of
  // [{ "RecallID": 0, "Description": "Error retrieving Recalls: ..." }] rather
  // than an HTTP error. Ingesting that as a recall is exactly how the junk
  // "recall-0" row was created. Detect the sentinel and throw so the run is
  // recorded as a failed CPSC fetch (surfaced by the freshness watchdog),
  // never stored as a recall.
  if (isCpscErrorSentinel(data)) {
    const msg = data[0]?.Description ?? "unknown CPSC error";
    throw new Error(`CPSC API error response: ${msg}`);
  }

  return data;
}

function isCpscErrorSentinel(data: CpscApiRecall[]): boolean {
  return (
    data.length > 0 &&
    data.every(
      (r) => !r.RecallID || /error retrieving/i.test(r.Description ?? ""),
    )
  );
}

const BRAND_MODEL_EXTRACT_PROMPT = `You are reading a government product recall notice. Extract the manufacturer/brand of the recalled product itself (not the retailer that sold it, if a retailer is also named) and any model numbers or product identifiers mentioned.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"brand": string|null, "model_numbers": string[]}

Example: for a notice titled "Best Buy Recalls Insignia Gas Ranges", the brand is "Insignia" (the product's brand), not "Best Buy" (the retailer). Use null/[] if nothing can be confidently identified.`;

export async function extractBrandModel(params: {
  title: string;
  description: string;
  productNames: string[];
}): Promise<{ brand: string | null; model_numbers: string[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { brand: null, model_numbers: [] };

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `${BRAND_MODEL_EXTRACT_PROMPT}\n\nTitle: ${params.title}\nDescription: ${params.description}\nProduct names listed: ${params.productNames.join(", ") || "none"}`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return { brand: null, model_numbers: [] };

    const match = textBlock.text.match(/\{[\s\S]*\}/);
    if (!match) return { brand: null, model_numbers: [] };

    const parsed = JSON.parse(match[0]);
    return {
      brand: typeof parsed.brand === "string" ? parsed.brand : null,
      model_numbers: Array.isArray(parsed.model_numbers)
        ? parsed.model_numbers.filter((m: unknown) => typeof m === "string")
        : [],
    };
  } catch {
    return { brand: null, model_numbers: [] };
  }
}

export async function normalizeCpscRecall(raw: CpscApiRecall): Promise<NormalizedRecall> {
  const productNames = (raw.Products ?? []).map((p) => p.Name).filter((n): n is string => !!n);
  const { brand, model_numbers } = await extractBrandModel({
    title: raw.Title ?? "",
    description: raw.Description ?? "",
    productNames,
  });

  return {
    source: "CPSC",
    external_recall_id: String(raw.RecallID),
    recall_date: raw.RecallDate ? raw.RecallDate.slice(0, 10) : null,
    brand,
    model_numbers,
    description: raw.Description ?? raw.Title ?? null,
    remedy: (raw.Remedies ?? []).map((r) => r.Name).filter(Boolean).join(" ") || null,
    action_url: raw.URL ?? null,
  };
}

// ── NHTSA (vehicle recalls) ──────────────────────────────────────────────
// NHTSA's recallsByVehicle endpoint requires make + model + modelYear (no
// bulk "recent recalls" feed exists), so the daily job queries it once per
// distinct (brand, model, purchase-year) combination among the user's own
// registered Vehicle-category products, rather than fetching a global feed
// the way CPSC's API allows.
interface NhtsaApiRecall {
  Manufacturer: string;
  NHTSACampaignNumber: string;
  Component: string;
  Summary: string;
  Consequence: string;
  Remedy: string;
  ReportReceivedDate: string; // DD/MM/YYYY
  ModelYear: string;
  Make: string;
  Model: string;
}

export async function fetchNhtsaRecalls(
  make: string,
  model: string,
  modelYear: string,
): Promise<NhtsaApiRecall[]> {
  const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${encodeURIComponent(modelYear)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`NHTSA API error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
}

function parseNhtsaDate(ddmmyyyy: string): string | null {
  const match = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

export function normalizeNhtsaRecall(raw: NhtsaApiRecall, requestedModel: string): NormalizedRecall {
  return {
    source: "NHTSA",
    external_recall_id: raw.NHTSACampaignNumber,
    recall_date: parseNhtsaDate(raw.ReportReceivedDate),
    brand: raw.Make || raw.Manufacturer || null,
    model_numbers: [raw.Model || requestedModel],
    description: [raw.Summary, raw.Consequence].filter(Boolean).join(" "),
    remedy: raw.Remedy || null,
    action_url: `https://www.nhtsa.gov/recalls?nhtsaId=${raw.NHTSACampaignNumber}`,
  };
}

// ── FDA (openFDA enforcement reports) ───────────────────────────────────
// openFDA's structured fields (recalling_firm, code_info) rarely carry a
// clean consumer-facing brand/model the way NHTSA's vehicle recalls do — same
// situation as CPSC — so brand/model are extracted from the free-text
// description via extractBrandModel() rather than read directly off the API.
// "FDA" per the spec covers three separate openFDA endpoints (food, drug,
// device); all three feed the same "FDA" recall_source bucket.
export type FdaEnforcementCenter = "food" | "drug" | "device";
export const FDA_CENTERS: FdaEnforcementCenter[] = ["food", "drug", "device"];

export interface FdaApiRecall {
  recall_number: string;
  report_date: string; // YYYYMMDD
  recalling_firm: string | null;
  product_description: string | null;
  reason_for_recall: string | null;
}

export async function fetchFdaRecalls(
  center: FdaEnforcementCenter,
  sinceIsoDate: string,
): Promise<FdaApiRecall[]> {
  const since = sinceIsoDate.replace(/-/g, "");
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  // openFDA's range syntax uses a literal "+" (not a URL-encoded space) —
  // do not run this through encodeURIComponent.
  const url = `https://api.fda.gov/${center}/enforcement.json?search=report_date:[${since}+TO+${today}]&limit=100`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  // openFDA 404s (with a JSON error body) when a search matches zero records —
  // an empty result set, not a failure.
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`FDA ${center} API error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
}

export async function normalizeFdaRecall(
  raw: FdaApiRecall,
  center: FdaEnforcementCenter,
): Promise<NormalizedRecall> {
  const description = [raw.product_description, raw.reason_for_recall].filter(Boolean).join(" — ");
  const { brand, model_numbers } = await extractBrandModel({
    title: raw.recalling_firm ?? "",
    description,
    productNames: raw.product_description ? [raw.product_description] : [],
  });

  return {
    source: "FDA",
    // Namespaced by center: recall_number is only unique within one openFDA
    // endpoint, and food/drug/device share the "FDA" recall_source bucket.
    external_recall_id: `${center}-${raw.recall_number}`,
    recall_date: raw.report_date
      ? `${raw.report_date.slice(0, 4)}-${raw.report_date.slice(4, 6)}-${raw.report_date.slice(6, 8)}`
      : null,
    brand,
    model_numbers,
    description: description || null,
    // openFDA enforcement records don't carry a structured remedy field.
    remedy: null,
    // openFDA has no per-recall public page — link to FDA's general recalls
    // index rather than a dead/nonexistent deep link.
    action_url: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
  };
}

// ── USDA FSIS (meat & poultry recalls) ──────────────────────────────────
// No structured JSON API exists (per spec — "web scrape or RSS feed"); FSIS
// publishes an RSS feed instead. Same free-text extraction as CPSC/FDA since
// the feed carries only a title/summary, no structured brand/model fields.
export interface UsdaFeedItem {
  guid: string;
  title: string;
  description: string;
  link: string;
  pubDate: string; // RFC 822
}

function xmlUnescape(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractTag(itemXml: string, tag: string): string {
  const match = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? xmlUnescape(match[1]) : "";
}

// Minimal hand-rolled RSS parser — no XML/DOM library in this runtime, and the
// feed's shape is stable and simple enough that regex-per-<item> is reliable
// without adding a dependency for one feed.
function parseUsdaRss(xml: string): UsdaFeedItem[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.map((item) => ({
    guid: extractTag(item, "guid"),
    title: extractTag(item, "title"),
    description: extractTag(item, "description"),
    link: extractTag(item, "link"),
    pubDate: extractTag(item, "pubDate"),
  }));
}

export async function fetchUsdaRecalls(): Promise<UsdaFeedItem[]> {
  const res = await fetch("https://www.fsis.usda.gov/fsis-content/rss/recalls.xml", {
    headers: { Accept: "application/rss+xml, application/xml, text/xml" },
  });
  if (!res.ok) throw new Error(`USDA FSIS feed error: ${res.status}`);
  const xml = await res.text();
  return parseUsdaRss(xml);
}

export async function normalizeUsdaRecall(raw: UsdaFeedItem): Promise<NormalizedRecall> {
  const { brand, model_numbers } = await extractBrandModel({
    title: raw.title,
    description: raw.description,
    productNames: [],
  });

  const parsedDate = raw.pubDate ? new Date(raw.pubDate) : null;
  const recall_date = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString().slice(0, 10) : null;

  return {
    source: "USDA",
    // FSIS's RSS guid is a stable per-recall identifier; fall back to the
    // link in the rare case a feed item omits guid.
    external_recall_id: raw.guid || raw.link,
    recall_date,
    brand,
    model_numbers,
    description: raw.description || raw.title || null,
    remedy: null,
    action_url: raw.link || null,
  };
}
