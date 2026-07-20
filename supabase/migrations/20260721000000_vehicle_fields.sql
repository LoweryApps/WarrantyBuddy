-- Section 2.1 (v2.5) — vehicle-specific fields. Populated only when
-- category = 'Vehicle'; null otherwise. "Brand" is reused/relabeled "Make"
-- for vehicles in the UI, no separate column needed.

alter table public.products
  add column vin text,
  add column model_year integer;
