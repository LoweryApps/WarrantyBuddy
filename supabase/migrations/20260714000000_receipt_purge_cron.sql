-- Permanently deletes forwarded_receipts that have sat in "Recently
-- Discarded" for more than 30 days, per spec Section 2.4. The Review Queue
-- page itself also filters discarded_at to the last 30 days, so this job is
-- storage hygiene, not the source of truth for what the UI shows.
--
-- pg_cron requires the extension to be enabled first. On hosted Supabase,
-- enable it via Dashboard → Database → Extensions → pg_cron if the next
-- line errors with a permissions issue, then re-run just the `select
-- cron.schedule(...)` statement below.

create extension if not exists pg_cron with schema extensions;

select
  cron.schedule(
    'purge-discarded-receipts',
    '0 3 * * *', -- daily at 03:00 UTC
    $$
    delete from public.forwarded_receipts
    where status = 'Discarded'
      and discarded_at is not null
      and discarded_at < now() - interval '30 days'
    $$
  );
