-- WarrantyBuddy — Product Intelligence Database (spec Section 7)
-- A structured knowledge base of known product failure patterns, surfaced
-- at product registration, warranty-expiring-soon, Claim Assist, and Ask
-- Buddy. Global reference table, same access pattern as `recalls`: readable
-- by any authenticated user, writable only by the service role.
--
-- Populated from two sources for v1 (see spec 7.2 Phase 1 + Phase 2):
--   - NHTSA complaints, aggregated by component into failure patterns
--   - Anonymized user failure reports from Claim Assist — the link back to
--     the reporting user/product is never stored here, only the resulting
--     brand/model/failure classification (privacy requirement, spec 7.2).
-- CPSC/SaferProducts incident data, review mining, and manufacturer
-- bulletins are out of scope for this pass — see project memory for why.

create type pid_severity as enum ('Safety Hazard', 'Major', 'Minor');

create type pid_source as enum (
  'SaferProducts', 'NHTSA', 'UserReport', 'ReviewMining', 'ManufacturerBulletin'
);

create table public.product_intelligence (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model_number text,
  category product_category not null,
  failure_type text not null,
  failure_description text,
  typical_time_to_failure text,
  complaint_count integer not null default 1,
  severity pid_severity not null default 'Minor',
  source pid_source not null,
  source_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, brand, model_number, failure_type)
);

create index product_intelligence_brand_model_idx
  on public.product_intelligence (brand, model_number);

alter table public.product_intelligence enable row level security;

create policy "Authenticated users can view product intelligence"
  on public.product_intelligence for select
  to authenticated
  using (true);
