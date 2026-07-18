export type WarrantyStatus = "active" | "expiring" | "expired" | "none";

const EXPIRING_SOON_WINDOW_DAYS = 60;

// Date-only strings (YYYY-MM-DD) from Postgres `date` columns must be parsed
// as local calendar dates, not UTC-midnight instants — otherwise any
// negative-UTC-offset timezone renders them a day early.
export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseDateOnly(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function warrantyStatus(endDate: string | null): WarrantyStatus {
  if (!endDate) return "active";
  const days = daysUntil(endDate);
  if (days < 0) return "expired";
  if (days <= EXPIRING_SOON_WINDOW_DAYS) return "expiring";
  return "active";
}

export function formatDateLabel(status: WarrantyStatus, endDate: string | null): string {
  if (!endDate) return "No expiration on file";
  const formatted = parseDateOnly(endDate).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
  if (status === "expired") return `Expired ${formatted}`;
  return `Expires ${formatted}`;
}

// Fallback used by Claim Assist when no warranty record exists on file — a
// standard 1-year manufacturer term estimated from purchase date, per spec
// 2.5 Step 2 ("using the purchase date and known brand/category terms").
// Always disclosed to the user as an estimate, never presented as fact.
const STANDARD_WARRANTY_YEARS = 1;

export function estimateStandardWarrantyEndDate(purchaseDate: string): string {
  const date = parseDateOnly(purchaseDate);
  date.setFullYear(date.getFullYear() + STANDARD_WARRANTY_YEARS);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
