-- In-app feedback widget (beta-readiness). Lets a logged-in user submit a
-- short message from anywhere in the app; the server route auto-attaches
-- which page they were on for triage context. Read only by the owner via the
-- service role — this is a support inbox, not user-facing data.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  page_path text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index feedback_created_at_idx on public.feedback (created_at desc);
create index feedback_user_id_idx on public.feedback (user_id);

comment on table public.feedback is
  'In-app feedback submissions. Written only by /api/feedback (authenticated user, server-side insert with their own user_id). Read only by the owner via the service role — no anon/authenticated select policy is defined, so RLS denies all client reads by default.';

-- A user may insert their own feedback row (user_id must match their own auth
-- id), but there is no select/update/delete policy for anon or authenticated
-- roles — submissions are write-only from the client's perspective, exactly
-- like a support inbox. The owner reads this table via the Supabase dashboard
-- or the service role, never through the app's own client.
alter table public.feedback enable row level security;

create policy "users insert their own feedback"
  on public.feedback
  for insert
  to authenticated
  with check (user_id = auth.uid());
