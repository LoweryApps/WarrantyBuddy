import type { NextConfig } from "next";

// Supabase project origin — needed in the CSP connect/img-src so the browser
// client (auth, storage, realtime) and any stored product photos aren't
// blocked.
const SUPABASE_ORIGIN = "https://qveiksuskpyqkfcnfbtw.supabase.co";
const SUPABASE_WS_ORIGIN = "wss://qveiksuskpyqkfcnfbtw.supabase.co";

const CSP = [
  "default-src 'self'",
  // Next.js ships inline hydration/bootstrap scripts and styles that aren't
  // nonce-tagged in this setup, so 'unsafe-inline' is required here for the
  // app to render at all — this is a known tradeoff without a full
  // per-request nonce wired through middleware. 'unsafe-eval' is added only
  // in dev, where React's debug tooling uses eval() for call-stack
  // reconstruction — React never calls eval() in a production build.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SUPABASE_ORIGIN}`,
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS_ORIGIN}`,
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
