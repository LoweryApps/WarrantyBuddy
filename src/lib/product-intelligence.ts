import Anthropic from "@anthropic-ai/sdk";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { PidSeverity, PidSource, ProductCategory } from "@/lib/supabase/types";

type AdminClient = ReturnType<typeof createAdminClient>;

// Language kept observational and always source-attributed per spec 7.4:
// never call a product "dangerous"/"defective" outside a direct recall
// quote, and always cite counts to their source rather than presenting them
// as WarrantyBuddy's own conclusion. Shared between the UI banner and
// server-side email copy so the attribution wording stays consistent.
export const PID_SOURCE_LABEL: Record<PidSource, string> = {
  SaferProducts: "SaferProducts.gov reports",
  NHTSA: "NHTSA complaints",
  UserReport: "WarrantyBuddy user reports",
  ReviewMining: "product review mentions",
  ManufacturerBulletin: "manufacturer bulletin",
};

export interface PidRecord {
  brand: string;
  model_number: string | null;
  category: ProductCategory;
  failure_type: string;
  failure_description: string | null;
  typical_time_to_failure: string | null;
  complaint_count: number;
  severity: PidSeverity;
  source: PidSource;
  source_url: string | null;
}

// Upserts by the natural (source, brand, model_number, failure_type) key.
// NHTSA records recompute their full complaint_count each fetch (the API
// returns the current total every time), so an update there SETS the count;
// a UserReport update means exactly one more report came in, so it
// INCREMENTS instead.
export async function upsertProductIntelligence(
  supabase: AdminClient,
  record: PidRecord,
): Promise<void> {
  let query = supabase
    .from("product_intelligence")
    .select("id, complaint_count")
    .eq("source", record.source)
    .ilike("brand", record.brand)
    .eq("failure_type", record.failure_type);
  query = record.model_number
    ? query.eq("model_number", record.model_number)
    : query.is("model_number", null);

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    await supabase
      .from("product_intelligence")
      .update({
        complaint_count:
          record.source === "UserReport" ? existing.complaint_count + 1 : record.complaint_count,
        failure_description: record.failure_description ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("product_intelligence").insert(record);
  }
}

// ── NHTSA complaints ─────────────────────────────────────────────────────
// Same per-make/model/year query shape as NHTSA's recalls endpoint (see
// recall-sources.ts) — no bulk feed exists. Individual complaints are far
// too granular to store one row each, so they're aggregated here by NHTSA's
// own `components` taxonomy into failure-pattern records, matching spec
// 7.1's "typical_time_to_failure" / "complaint_count" pattern-record shape.
interface NhtsaComplaint {
  odiNumber: number;
  crash: boolean;
  fire: boolean;
  numberOfInjuries: number;
  numberOfDeaths: number;
  components: string;
  summary: string;
}

const MIN_COMPLAINTS_FOR_PATTERN = 3;

export async function fetchNhtsaComplaints(
  make: string,
  model: string,
  modelYear: string,
): Promise<NhtsaComplaint[]> {
  const url = `https://api.nhtsa.gov/complaints/complaintsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${encodeURIComponent(modelYear)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`NHTSA complaints API error: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
}

function componentLabel(raw: string): string {
  const top = raw.split(":")[0] ?? raw;
  return top
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function aggregateNhtsaComplaints(
  complaints: NhtsaComplaint[],
  brand: string,
  modelNumber: string,
): Omit<PidRecord, "category">[] {
  const groups = new Map<string, NhtsaComplaint[]>();

  for (const c of complaints) {
    const key = componentLabel(c.components || "Other");
    const list = groups.get(key) ?? [];
    list.push(c);
    groups.set(key, list);
  }

  const patterns: Omit<PidRecord, "category">[] = [];

  for (const [label, group] of groups) {
    if (group.length < MIN_COMPLAINTS_FOR_PATTERN) continue;

    const hasHazard = group.some(
      (c) => c.crash || c.fire || c.numberOfInjuries > 0 || c.numberOfDeaths > 0,
    );

    patterns.push({
      brand,
      model_number: modelNumber,
      failure_type: label,
      failure_description: `Owners have reported issues with ${label.toLowerCase()} on this model.`,
      typical_time_to_failure: null,
      complaint_count: group.length,
      severity: hasHazard ? "Safety Hazard" : "Minor",
      source: "NHTSA",
      // Spec 7.4: Safety Hazard severity "always link to the official
      // government source, do not editorialize." NHTSA doesn't expose a
      // reliable deep link per aggregated complaint group, so this points
      // to their own official complaints-database entry point rather than
      // a guessed/unverified URL.
      source_url: hasHazard ? "https://www.nhtsa.gov/nhtsa-datasets-and-apis" : null,
    });
  }

  return patterns;
}

// ── User-generated failure reports (Claim Assist) ───────────────────────
// Classifies a user's free-text issue description from Claim Assist Step 5
// into a structured, anonymized failure record. The caller must never pass
// user_id or product_id through to storage — only brand/model/category and
// what's derived here, per spec 7.2's anonymization requirement.
const CLASSIFY_PROMPT = `You are helping build an anonymized database of product failure patterns from user-submitted warranty claim descriptions. Read the user's description of what went wrong with their product and classify it.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"is_failure_report": boolean, "failure_type": string|null, "failure_description": string|null, "severity": "Safety Hazard"|"Major"|"Minor"|null}

- is_failure_report: false if the description isn't actually about a product defect or failure (e.g. "lost my receipt", "just checking my coverage", a cosmetic preference) — true only for genuine failure/defect reports.
- failure_type: a short, general label for the failure mode (e.g. "Compressor failure", "Screen cracking", "Battery not holding charge"). Use consistent, general terminology so similar reports end up with the same label.
- failure_description: a brief, neutral, third-person rephrasing (e.g. "Compressor stops cooling after approximately one year of use") — never quote the user's exact words or retain any personal or identifying detail.
- severity: "Safety Hazard" only for a real safety/injury risk (fire, shock, burn, sharp parts, etc). "Major" if the product becomes unusable. "Minor" if function is degraded but the product still works.

Use null for every field when is_failure_report is false.`;

export interface ClassifiedReport {
  is_failure_report: boolean;
  failure_type: string | null;
  failure_description: string | null;
  severity: PidSeverity | null;
}

export async function classifyUserReport(params: {
  issue: string;
  brand: string;
  category: string;
}): Promise<ClassifiedReport> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const fallback: ClassifiedReport = {
    is_failure_report: false,
    failure_type: null,
    failure_description: null,
    severity: null,
  };
  if (!apiKey) return fallback;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `${CLASSIFY_PROMPT}\n\nProduct: ${params.brand} (${params.category})\nUser's description: "${params.issue}"`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return fallback;

    const match = textBlock.text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;

    const parsed = JSON.parse(match[0]);
    return {
      is_failure_report: !!parsed.is_failure_report,
      failure_type: typeof parsed.failure_type === "string" ? parsed.failure_type : null,
      failure_description:
        typeof parsed.failure_description === "string" ? parsed.failure_description : null,
      severity: ["Safety Hazard", "Major", "Minor"].includes(parsed.severity)
        ? parsed.severity
        : null,
    };
  } catch {
    return fallback;
  }
}
