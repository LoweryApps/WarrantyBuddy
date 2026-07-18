-- WarrantyBuddy — initial schema
-- 8 tables from Product Spec v2.3 Section 3.

create extension if not exists "pgcrypto";

-- ── Enums ──────────────────────────────────────────────────────────────

create type product_category as enum (
  'Electronics', 'Appliance', 'Tool', 'Vehicle', 'Other'
);

create type warranty_type as enum (
  'Manufacturer', 'Extended', 'Retailer'
);

create type document_type as enum (
  'Warranty', 'Receipt', 'Manual', 'Photo', 'Other'
);

create type forwarded_receipt_status as enum (
  'Pending Review', 'Confirmed', 'Discarded'
);

create type recall_source as enum (
  'CPSC', 'NHTSA', 'FDA', 'USDA'
);

-- ── 3.1 Users ──────────────────────────────────────────────────────────
-- Profile row extending auth.users, created automatically on sign-up
-- (see handle_new_user trigger below).

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  claim_email text,
  created_at timestamptz not null default now(),
  notification_email boolean not null default true,
  forwarding_address text not null unique
);

-- ── 3.2 Products ───────────────────────────────────────────────────────

create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  brand text,
  model_number text,
  serial_number text,
  category product_category not null default 'Other',
  purchase_date date,
  purchase_price numeric(12, 2),
  retailer text,
  photo_url text,
  created_at timestamptz not null default now()
);

create index products_user_id_idx on public.products (user_id);
create index products_brand_model_idx on public.products (brand, model_number);

-- ── 3.3 Warranties ─────────────────────────────────────────────────────

create table public.warranties (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  warranty_type warranty_type not null default 'Manufacturer',
  start_date date,
  end_date date,
  coverage_description text,
  exclusions text,
  claim_contact text,
  document_url text,
  ai_extracted boolean not null default false,
  created_at timestamptz not null default now()
);

create index warranties_product_id_idx on public.warranties (product_id);
create index warranties_end_date_idx on public.warranties (end_date);

-- ── 3.4 Documents ──────────────────────────────────────────────────────

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  document_type document_type not null default 'Other',
  file_url text not null,
  file_name text not null,
  file_size_kb integer,
  uploaded_at timestamptz not null default now()
);

create index documents_product_id_idx on public.documents (product_id);

-- ── 3.5 Forwarded Receipts ─────────────────────────────────────────────
-- discarded_at drives the 30-day permanent-delete rule for the "Recently
-- Discarded" collection described in spec Section 2.4 / 4.7.

create table public.forwarded_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  status forwarded_receipt_status not null default 'Pending Review',
  source_email_subject text,
  sender_domain text,
  extracted_product_name text,
  extracted_price numeric(12, 2),
  extracted_order_date date,
  extracted_order_number text,
  extracted_retailer text,
  confidence_score integer check (confidence_score between 0 and 100),
  raw_email_url text,
  received_at timestamptz not null default now(),
  discarded_at timestamptz
);

create index forwarded_receipts_user_id_idx on public.forwarded_receipts (user_id);
create index forwarded_receipts_status_idx on public.forwarded_receipts (status);

-- ── 3.6 Recalls ────────────────────────────────────────────────────────
-- Global table, populated by a scheduled job (service role), not user-scoped.

create table public.recalls (
  id uuid primary key default gen_random_uuid(),
  source recall_source not null,
  external_recall_id text not null,
  recall_date date,
  brand text,
  model_numbers text[] not null default '{}',
  description text,
  remedy text,
  action_url text,
  fetched_at timestamptz not null default now(),
  unique (source, external_recall_id)
);

create index recalls_brand_idx on public.recalls (brand);
create index recalls_model_numbers_idx on public.recalls using gin (model_numbers);

-- ── 3.7 User Recall Alerts ─────────────────────────────────────────────

create table public.user_recall_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  recall_id uuid not null references public.recalls (id) on delete cascade,
  notified_at timestamptz not null default now(),
  acknowledged boolean not null default false,
  unique (user_id, product_id, recall_id)
);

create index user_recall_alerts_user_id_idx on public.user_recall_alerts (user_id);

-- ── 3.8 Product Lookup Cache ───────────────────────────────────────────
-- Global cache, populated by barcode-lookup calls (service role).

create table public.product_lookup_cache (
  barcode text primary key,
  brand text,
  model_name text,
  model_number text,
  category product_category,
  source text,
  fetched_at timestamptz not null default now()
);

-- ── Auto-create a public.users row when someone signs up ────────────────

create or replace function public.generate_forwarding_address(p_full_name text, p_email text)
returns text
language plpgsql
as $$
declare
  base_slug text;
  candidate text;
begin
  base_slug := lower(regexp_replace(coalesce(nullif(split_part(p_full_name, ' ', 1), ''), split_part(p_email, '@', 1)), '[^a-z0-9]', '', 'gi'));
  if base_slug = '' then
    base_slug := 'user';
  end if;

  loop
    candidate := base_slug || '-' || substr(md5(random()::text), 1, 6) || '@receipts.warrantybuddy.com';
    exit when not exists (select 1 from public.users where forwarding_address = candidate);
  end loop;

  return candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, forwarding_address)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    public.generate_forwarding_address(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
