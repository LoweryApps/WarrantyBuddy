import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Shared rate limiting for public endpoints AND the authenticated,
// cost-bearing AI routes (each Anthropic call is real money, so a single
// account can't be allowed to loop unbounded). Vercel serverless has no shared
// memory, so the counter lives in Postgres — see rate_limit_hit() in
// supabase/migrations/20260728000000_rate_limiting.sql. This module is the only
// thing that calls it.

export interface RateLimitRule {
  // Opaque bucket key. Callers namespace it, e.g. "recall-subscribe:ip:1.2.3.4".
  key: string;
  // Max hits allowed within the window before requests are denied.
  limit: number;
  // Fixed-window width in seconds.
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  // Seconds until the current window rolls over (upper bound on retry wait).
  retryAfterSeconds: number;
}

// Records one hit against a single bucket and reports whether it's within the
// limit. Fails OPEN: if the counter store is unreachable we allow the request
// rather than take the endpoint down — double opt-in and the honeypot are the
// backstops. Best-effort logging so a persistent failure is visible.
export async function rateLimit(rule: RateLimitRule): Promise<RateLimitResult> {
  const supabase = createAdminClient();
  try {
    const { data, error } = await supabase.rpc("rate_limit_hit", {
      p_bucket: rule.key,
      p_window_seconds: rule.windowSeconds,
    });
    if (error || typeof data !== "number") {
      if (error) console.error("[rate-limit] rpc error", error.message);
      return { allowed: true, retryAfterSeconds: 0 };
    }
    return {
      allowed: data <= rule.limit,
      retryAfterSeconds: rule.windowSeconds,
    };
  } catch (e) {
    console.error("[rate-limit] unexpected error", e);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

// Applies several rules and denies if ANY is exceeded. Every rule is recorded
// (they all increment) so per-IP and per-email counters both advance on a
// single request. Returns the first breached rule's retry hint.
export async function rateLimitAll(rules: RateLimitRule[]): Promise<RateLimitResult> {
  const results = await Promise.all(rules.map(rateLimit));
  const breached = results.find((r) => !r.allowed);
  return breached ?? { allowed: true, retryAfterSeconds: 0 };
}

// Best-effort client IP from the proxy headers Vercel sets (`request.ip` was
// removed in Next 15+). x-forwarded-for is a comma-separated list; the client
// is the first entry. Falls back to a constant so a missing header collapses
// all such callers into one shared bucket (fail-safe: still limited, just
// coarsely) rather than bypassing the limit.
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

// Convenience for a route: applies one rule and, if the caller is over the
// limit, returns a ready-to-send 429 (with Retry-After); returns null when the
// request is allowed to proceed. Keeps the per-user AI-route guards to a single
// line each.
export async function rateLimitResponse(
  rule: RateLimitRule,
  message = "You're doing that too fast — give it a minute and try again.",
): Promise<NextResponse | null> {
  const { allowed, retryAfterSeconds } = await rateLimit(rule);
  if (allowed) return null;
  return NextResponse.json(
    { error: "rate_limited", message },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
