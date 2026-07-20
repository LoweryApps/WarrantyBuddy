export type ClaimReadinessFactor = "receipt" | "purchaseDate" | "serialNumber";

export type ClaimReadinessBand = "needs-attention" | "almost-there" | "claim-ready";

export interface ClaimReadinessResult {
  score: number;
  missing: ClaimReadinessFactor[];
  band: ClaimReadinessBand;
}

const WEIGHTS: Record<ClaimReadinessFactor, number> = {
  receipt: 40,
  purchaseDate: 30,
  serialNumber: 30,
};

// Spec 2.9 — deliberately just the three fields Claim Assist (2.5) needs to
// run without stalling. Model number is excluded since every product has
// one by definition; warranty doc/photo/price are excluded since they
// matter elsewhere but aren't blockers to Claim Assist completing.
export function computeClaimReadiness(input: {
  hasReceipt: boolean;
  purchaseDate: string | null;
  serialNumber: string | null;
}): ClaimReadinessResult {
  const missing: ClaimReadinessFactor[] = [];
  let score = 0;

  if (input.hasReceipt) score += WEIGHTS.receipt;
  else missing.push("receipt");

  if (input.purchaseDate) score += WEIGHTS.purchaseDate;
  else missing.push("purchaseDate");

  if (input.serialNumber) score += WEIGHTS.serialNumber;
  else missing.push("serialNumber");

  const band: ClaimReadinessBand = score >= 80 ? "claim-ready" : score >= 40 ? "almost-there" : "needs-attention";

  return { score, missing, band };
}

export const CLAIM_READINESS_LABEL: Record<ClaimReadinessBand, string> = {
  "needs-attention": "Needs attention",
  "almost-there": "Almost there",
  "claim-ready": "Claim ready",
};
