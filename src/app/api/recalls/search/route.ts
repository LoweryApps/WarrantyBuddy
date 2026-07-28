import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { escapeForOrFilter, liveNhtsaLookup, searchRecallsByTerms } from "@/lib/recall-search";
import { createClient } from "@/lib/supabase/server";

// Beta-scope recall search: keyword lookup over the raw recalls table by
// brand or model number, PLUS a resolve step against the user's own
// registered products so a VIN or serial number search actually means
// something — recalls themselves only ever carry brand + model number, never
// a VIN or serial, so those two search types only work by first finding the
// matching product in the user's own vault and searching recalls with ITS
// brand/model instead. No AI, no public/anon access — recalls is already
// readable by any authenticated user (see RLS policy), no service role
// needed for the read paths (only the live NHTSA cache-write, in
// @/lib/recall-search). See src/app/api/recall-check/route.ts for the public,
// no-login equivalent (brand/model only, no own-products resolution).
// Guards NHTSA call volume (up to 16 parallel calls per trigger) rather than
// cost — NHTSA's API is free, this is an abuse/volume guard only.
const VEHICLE_LOOKUP_LIMIT_PER_HOUR = 20;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { query } = await request.json();
  const q = typeof query === "string" ? query.trim() : "";
  if (!q) {
    return NextResponse.json({ results: [] });
  }
  const safeQ = escapeForOrFilter(q);

  // Vehicle-shaped query ("Ford Bronco", "Ford F-150") — naive first-word-is-
  // make split. Wrong guesses (e.g. a two-word appliance brand) just return
  // nothing from NHTSA and cost nothing beyond the API round trip.
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const { allowed } = await rateLimit({
      key: `recall-vehicle-lookup:user:${user.id}`,
      limit: VEHICLE_LOOKUP_LIMIT_PER_HOUR,
      windowSeconds: 3600,
    });
    // Rate-limited: skip the live lookup silently and fall back to whatever's
    // already cached — never fail the whole search over this bonus step.
    if (allowed) {
      const make = words[0];
      const model = words.slice(1).join(" ");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      await liveNhtsaLookup(make, model, appUrl);
    }
  }

  // Resolve against the user's own products: a VIN or serial number typed in
  // only becomes useful once it's traced back to that product's brand/model.
  const { data: ownProducts } = await supabase
    .from("products")
    .select("brand, model_number")
    .or(
      [
        `vin.ilike.%${safeQ}%`,
        `serial_number.ilike.%${safeQ}%`,
        `model_number.ilike.%${safeQ}%`,
        `brand.ilike.%${safeQ}%`,
      ].join(","),
    );

  const terms = new Set<string>([q.toLowerCase()]);
  // A "make model" query (e.g. "Ford Bronco") never matches as one atomic
  // string — recalls store brand ("FORD") and model_numbers (["Bronco"]) as
  // separate fields — so also search the individual make/model split, the
  // same one used above to drive the live NHTSA lookup.
  if (words.length >= 2) {
    terms.add(words[0].toLowerCase());
    terms.add(words.slice(1).join(" ").toLowerCase());
  }
  for (const p of ownProducts ?? []) {
    if (p.brand) terms.add(p.brand.toLowerCase());
    if (p.model_number) terms.add(p.model_number.toLowerCase());
  }

  const results = await searchRecallsByTerms(supabase, [...terms]);
  return NextResponse.json({ results });
}
