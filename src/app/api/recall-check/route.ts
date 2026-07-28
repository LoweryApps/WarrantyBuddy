import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { liveNhtsaLookup, searchRecallsByTerms } from "@/lib/recall-search";
import { createAdminClient } from "@/lib/supabase/admin";

// Public, no-login recall checker for the marketing site — brand/model
// keyword search only, no VIN/serial resolution (there's no signed-in user
// to resolve those against). Reads `recalls` via the admin client rather
// than the anon client: it's non-sensitive, global government reference
// data (no PII), and recalls has no anon-read RLS policy today — this is a
// deliberate, narrow use of service role for a read that's intentionally
// public, not a broadening of what's exposed. Rate-limited by IP since there
// is no user id to key on.
const SEARCH_LIMIT_PER_HOUR = 30;
const VEHICLE_LOOKUP_LIMIT_PER_HOUR = 10;

export async function POST(request: Request) {
  const ip = clientIp(request.headers);

  const { allowed, retryAfterSeconds } = await rateLimit({
    key: `recall-check:ip:${ip}`,
    limit: SEARCH_LIMIT_PER_HOUR,
    windowSeconds: 3600,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many searches — try again in a bit." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const { query } = await request.json();
  const q = typeof query === "string" ? query.trim().slice(0, 200) : "";
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const admin = createAdminClient();

  // Vehicle-shaped query ("Ford Bronco") — naive first-word-is-make split,
  // same technique as the in-app search. A lower, IP-keyed limit here since
  // this branch fans out to up to 16 NHTSA calls and is reachable with no
  // account at all.
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const vehicleLimit = await rateLimit({
      key: `recall-check-vehicle:ip:${ip}`,
      limit: VEHICLE_LOOKUP_LIMIT_PER_HOUR,
      windowSeconds: 3600,
    });
    if (vehicleLimit.allowed) {
      const make = words[0];
      const model = words.slice(1).join(" ");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      await liveNhtsaLookup(make, model, appUrl);
    }
  }

  const terms = new Set<string>([q.toLowerCase()]);
  if (words.length >= 2) {
    terms.add(words[0].toLowerCase());
    terms.add(words.slice(1).join(" ").toLowerCase());
  }

  const results = await searchRecallsByTerms(admin, [...terms]);
  return NextResponse.json({ results });
}
