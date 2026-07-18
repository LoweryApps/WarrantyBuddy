-- WarrantyBuddy — Row Level Security
-- Every table is scoped to the owning user via auth.uid(). Tables without a
-- direct user_id column (warranties, documents) are scoped through their
-- parent product. Global reference tables (recalls, product_lookup_cache)
-- are readable by any authenticated user but only writable by the service
-- role (which bypasses RLS entirely), so they carry no write policies here.

alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.warranties enable row level security;
alter table public.documents enable row level security;
alter table public.forwarded_receipts enable row level security;
alter table public.recalls enable row level security;
alter table public.user_recall_alerts enable row level security;
alter table public.product_lookup_cache enable row level security;

-- ── users ────────────────────────────────────────────────────────────
-- Row is created by the handle_new_user trigger (security definer), so no
-- insert policy is granted to end users.

create policy "Users can view their own profile"
  on public.users for select
  using (id = auth.uid());

create policy "Users can update their own profile"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── products ─────────────────────────────────────────────────────────

create policy "Users can view their own products"
  on public.products for select
  using (user_id = auth.uid());

create policy "Users can insert their own products"
  on public.products for insert
  with check (user_id = auth.uid());

create policy "Users can update their own products"
  on public.products for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own products"
  on public.products for delete
  using (user_id = auth.uid());

-- ── warranties (scoped via parent product) ──────────────────────────

create policy "Users can view warranties for their own products"
  on public.warranties for select
  using (
    exists (
      select 1 from public.products
      where products.id = warranties.product_id
        and products.user_id = auth.uid()
    )
  );

create policy "Users can insert warranties for their own products"
  on public.warranties for insert
  with check (
    exists (
      select 1 from public.products
      where products.id = warranties.product_id
        and products.user_id = auth.uid()
    )
  );

create policy "Users can update warranties for their own products"
  on public.warranties for update
  using (
    exists (
      select 1 from public.products
      where products.id = warranties.product_id
        and products.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products
      where products.id = warranties.product_id
        and products.user_id = auth.uid()
    )
  );

create policy "Users can delete warranties for their own products"
  on public.warranties for delete
  using (
    exists (
      select 1 from public.products
      where products.id = warranties.product_id
        and products.user_id = auth.uid()
    )
  );

-- ── documents (scoped via parent product) ───────────────────────────

create policy "Users can view documents for their own products"
  on public.documents for select
  using (
    exists (
      select 1 from public.products
      where products.id = documents.product_id
        and products.user_id = auth.uid()
    )
  );

create policy "Users can insert documents for their own products"
  on public.documents for insert
  with check (
    exists (
      select 1 from public.products
      where products.id = documents.product_id
        and products.user_id = auth.uid()
    )
  );

create policy "Users can update documents for their own products"
  on public.documents for update
  using (
    exists (
      select 1 from public.products
      where products.id = documents.product_id
        and products.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.products
      where products.id = documents.product_id
        and products.user_id = auth.uid()
    )
  );

create policy "Users can delete documents for their own products"
  on public.documents for delete
  using (
    exists (
      select 1 from public.products
      where products.id = documents.product_id
        and products.user_id = auth.uid()
    )
  );

-- ── forwarded_receipts ───────────────────────────────────────────────
-- Rows are created by the inbound-email webhook via the service role, so
-- end users only need select/update (to confirm, edit, or discard) and
-- delete (to purge a discarded item early if desired).

create policy "Users can view their own forwarded receipts"
  on public.forwarded_receipts for select
  using (user_id = auth.uid());

create policy "Users can update their own forwarded receipts"
  on public.forwarded_receipts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own forwarded receipts"
  on public.forwarded_receipts for delete
  using (user_id = auth.uid());

-- ── recalls ──────────────────────────────────────────────────────────
-- Global, read-only reference data fetched daily by the service role.

create policy "Authenticated users can view recalls"
  on public.recalls for select
  to authenticated
  using (true);

-- ── user_recall_alerts ───────────────────────────────────────────────
-- Rows are created by the recall-matching job via the service role; end
-- users can view and acknowledge their own alerts.

create policy "Users can view their own recall alerts"
  on public.user_recall_alerts for select
  using (user_id = auth.uid());

create policy "Users can acknowledge their own recall alerts"
  on public.user_recall_alerts for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── product_lookup_cache ─────────────────────────────────────────────
-- Global cache, populated by the service role on barcode-lookup misses.

create policy "Authenticated users can read the lookup cache"
  on public.product_lookup_cache for select
  to authenticated
  using (true);
