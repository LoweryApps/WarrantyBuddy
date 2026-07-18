# Supabase setup

## 1. Create the project

Create a project at [supabase.com](https://supabase.com), then copy its URL and keys into `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API).

## 2. Link the CLI and push the schema

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

This applies `supabase/migrations/` — the 8 tables from Product Spec Section 3 and their RLS policies.

## 3. Point Auth at your app

Dashboard → **Authentication → URL Configuration**:

- Site URL: your production URL (e.g. `https://warrantybuddy.com`), or `http://localhost:3000` while developing
- Redirect URLs: add `/reset-password` and `/auth/confirm` under that origin

Dashboard → **Authentication → Sign In / Providers → Email**: turn on **Confirm email**, so new accounts must verify before signing in (matches the Sign Up → Verify Email flow in the mockup).

## 4. Connect Resend as the SMTP provider

By default Supabase's built-in email sender is rate-limited and only meant for testing. For real delivery, connect Resend as custom SMTP:

1. In [Resend](https://resend.com), create an API key (Dashboard → Authentication → Emails → SMTP Settings needs it below). Verify a sending domain when you're ready for production — until then, Resend's shared `onboarding@resend.dev` address works but only delivers to the inbox on your Resend account, not arbitrary users.
2. Dashboard → **Authentication → Emails → SMTP Settings** → enable custom SMTP:
   - Host: `smtp.resend.com`
   - Port: `465` (or `587`)
   - Username: `resend`
   - Password: your Resend API key
   - Sender email: `onboarding@resend.dev` for now, or an address on your verified domain once you add one (e.g. `notifications@warrantybuddy.com`)
   - Sender name: `WarrantyBuddy`

`supabase/config.toml` mirrors these same settings for local development via `npx supabase start` (reads `RESEND_API_KEY` from your shell env).

## 5. Branded email templates

`supabase/templates/confirmation.html` and `recovery.html` are the branded emails for sign-up verification and password reset. They're wired up automatically for local dev via `config.toml`. For the hosted project, paste their contents into Dashboard → **Authentication → Emails → Templates** (Confirm signup / Reset password).

- **Confirm signup** sends a 6-digit code (`{{ .Token }}`) — the app's Verify Email screen collects it via `supabase.auth.verifyOtp({ email, token, type: 'signup' })`.
- **Reset password** sends a link (`{{ .ConfirmationURL }}`) that lands on `/reset-password`, per the spec.

## 6. Storage

`supabase/migrations/20260712000200_storage.sql` creates a private `product-documents` bucket (20MB file limit, images + PDF only) and RLS policies on `storage.objects` scoping access to the owning user's `auth.uid()` folder prefix. Objects are stored at `{user_id}/{product_id}/{uuid}-{filename}` — see `src/lib/supabase/storage.ts` for the upload/signed-URL helpers that follow this convention. Run it the same way as the other migrations (paste into SQL Editor, or `supabase db push` if linked).
