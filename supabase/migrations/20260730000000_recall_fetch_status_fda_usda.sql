-- FDA and USDA fetching now ships (in-app beta recall monitor), so the
-- freshness watchdog needs rows for them too — otherwise a real FDA/USDA
-- outage would never be tracked or alerted on.
--
-- Additive only (existing rows untouched) — safe to run against the shared
-- prod/local DB anytime.

insert into public.recall_fetch_status (source) values ('FDA'), ('USDA')
  on conflict (source) do nothing;
