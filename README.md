# WarrantyBuddy

Personal product management app: register what you own, store warranty and receipt documents, and get alerted the moment one of your products is recalled.

Stack: Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Auth, Postgres, Storage) · Resend · Claude API · Vercel.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in real values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See `.env.local.example` for the full list (Supabase, Resend, Anthropic, Stripe, UPCitemdb).

## Database & Auth

See [`supabase/README.md`](./supabase/README.md) for creating the Supabase project, pushing the schema in `supabase/migrations/`, and connecting Resend for auth emails.

## Project structure

```
src/app/(auth)/        sign-up, login, forgot/reset password, verify email
src/app/(app)/          dashboard, products, receipts, recalls, settings
src/components/ui/      shadcn/ui primitives
src/components/         feature components, grouped by domain
src/lib/supabase/       browser / server / admin Supabase clients + middleware
src/lib/ai/             Claude API helpers (label/receipt/warranty extraction, Ask Buddy)
src/lib/recalls/        CPSC / NHTSA / FDA recall-matching logic
supabase/migrations/    schema + RLS policies
supabase/templates/     branded auth emails
```

Brand colors and fonts are defined once in [`tailwind.config.ts`](./tailwind.config.ts) — change a value there to change it everywhere.
