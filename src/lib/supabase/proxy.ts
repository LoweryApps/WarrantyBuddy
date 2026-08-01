import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/confirm",
  // Public, no-login SEO surface (Public Recall Pages module). The whole
  // /recalls/* tree is anonymous, cached, and indexable — the authenticated
  // personal recall-alerts view lives at /alerts instead.
  "/recalls",
  // Public legal pages (linked from the recall-pages footer).
  "/terms",
  "/privacy",
  // Public recall-digest signup (anonymous, double opt-in) — not app users.
  "/api/recall-subscribe",
  // Public, no-login recall checker on the marketing site (brand/model
  // search only) — and its API route.
  "/recall-check",
  "/api/recall-check",
  // Crawler-facing generated files — must be reachable without a session.
  "/robots.txt",
  "/sitemap.xml",
  // Server-to-server routes with their own bearer-token auth (checked inside
  // the route handler) — these are called by Vercel Cron / curl, never by a
  // logged-in browser, so they carry no session cookie to check here.
  "/api/cron",
  // Stripe's webhook — authenticated via its own signature check inside the
  // route handler, never carries a browser session cookie.
  "/api/stripe/webhook",
  // Postmark's inbound-email webhook — authenticated via its own Basic Auth
  // check inside the route handler, never carries a browser session cookie.
  "/api/inbound-email",
  // Called by both the browser (session cookie) and the native iOS app (no
  // cookie jar — sends an Authorization: Bearer header instead). This
  // middleware only ever checks cookies, so a bearer-only request would be
  // redirected to /login before reaching the route; getUserFromRequest()
  // inside the handler enforces auth for both cases instead.
  "/api/extract",
  "/api/insurance-export",
  "/api/account/delete",
  "/api/forwarded-receipts/confirm",
];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Exact match, not startsWith: every pathname begins with "/", so treating
  // it as a prefix would make the whole app public.
  const isRoot = request.nextUrl.pathname === "/";
  const isPublicPath =
    isRoot || PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
