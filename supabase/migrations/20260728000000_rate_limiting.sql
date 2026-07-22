-- DB-backed rate limiting for the public, unauthenticated endpoints
-- (SEO addendum §7: rate-limit the /recalls search; pre-launch list:
-- rate-limit /api/recall-subscribe against confirmation-email abuse).
--
-- The app runs on Vercel serverless with no shared memory between invocations,
-- so an in-process counter can't work; the shared Postgres is the natural
-- coordination point. This is a simple fixed-window counter: one row per
-- (bucket, window_start), incremented atomically. Buckets are opaque strings
-- chosen by the caller (e.g. "recall-subscribe:ip:1.2.3.4").
--
-- Additive only (new table + new function) — safe to run against the shared
-- prod/local Supabase before the calling code is deployed; nothing else reads
-- these objects.

create table public.rate_limit_counters (
  bucket text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (bucket, window_start)
);

comment on table public.rate_limit_counters is
  'Fixed-window rate-limit counters for public endpoints. One row per (bucket, window_start); written only via rate_limit_hit(). Rows are ephemeral and purged daily.';

-- Atomically record one hit against a bucket and return the running count
-- within the current fixed window. The caller compares the returned count to
-- its own limit — the function is limit-agnostic so a single table/function
-- serves every endpoint with its own limit + window.
--
-- Atomicity: the INSERT ... ON CONFLICT DO UPDATE is a single statement, so
-- concurrent serverless invocations racing on the same bucket are serialized
-- by the row lock and each sees a distinct, correct count. window_start is
-- snapped to the start of the current p_window_seconds-wide window so all hits
-- in that window share one row.
create or replace function public.rate_limit_hit(
  p_bucket text,
  p_window_seconds integer
) returns integer
language plpgsql
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit_counters (bucket, window_start, count)
  values (p_bucket, v_window_start, 1)
  on conflict (bucket, window_start)
    do update set count = public.rate_limit_counters.count + 1
  returning count into v_count;

  return v_count;
end;
$$;

-- Service-role only. The counters are written exclusively by server routes
-- using the service role (which bypasses RLS); no anon/auth client ever touches
-- this table. RLS on with no policies = deny-all for anon/authenticated.
alter table public.rate_limit_counters enable row level security;

-- Lock the function down to the service role. Postgres grants EXECUTE to PUBLIC
-- by default; without this revoke, anyone holding the public anon key could call
-- rate_limit_hit() directly to inflate an arbitrary bucket and grief a victim
-- (e.g. lock out their IP). Only trusted server code (service role) may call it.
revoke execute on function public.rate_limit_hit(text, integer) from public;
grant execute on function public.rate_limit_hit(text, integer) to service_role;

-- Storage hygiene: fixed-window rows are only useful for the duration of their
-- window. Purge anything older than a day so the table stays tiny.
--
-- pg_cron requires the extension to be enabled first. On hosted Supabase,
-- enable it via Dashboard → Database → Extensions → pg_cron if the next line
-- errors with a permissions issue, then re-run just the cron.schedule(...) call.
create extension if not exists pg_cron with schema extensions;

select
  cron.schedule(
    'purge-rate-limit-counters',
    '17 * * * *', -- hourly at :17
    $$
    delete from public.rate_limit_counters
    where window_start < now() - interval '1 day'
    $$
  );
