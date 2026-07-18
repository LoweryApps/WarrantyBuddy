import Anthropic from "@anthropic-ai/sdk";

export interface NormalizedRecall {
  source: "CPSC" | "NHTSA";
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
interface CpscApiRecall {
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
  return Array.isArray(data) ? data : [];
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
