-- Section 2.8 (v2.6) — Insurance-Ready Inventory Export.
-- room_location and quantity power grouping/quantities in the export;
-- both optional and available for any category, filled in at Add/Edit
-- Product or later. insurance_exports records each generated PDF so it
-- can be re-downloaded from the "Past Exports" list without regenerating.

alter table public.products
  add column room_location text,
  add column quantity integer not null default 1;

create table public.insurance_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  scope_label text not null,
  item_count integer not null,
  total_value numeric,
  file_url text not null,
  generated_at timestamptz not null default now()
);

alter table public.insurance_exports enable row level security;

create policy "Users can view their own insurance exports"
  on public.insurance_exports for select
  using (user_id = auth.uid());

create policy "Users can insert their own insurance exports"
  on public.insurance_exports for insert
  with check (user_id = auth.uid());

create policy "Users can delete their own insurance exports"
  on public.insurance_exports for delete
  using (user_id = auth.uid());
