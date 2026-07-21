-- Server-side enforcement of the free-tier caps (spec 6.2). Previously these
-- were only checked in the UI (add-product-wizard.tsx's atProductLimit,
-- receipts/page.tsx's atReceiptLimit) — a user could bypass them by calling
-- Supabase directly with their own session, since the actual inserts had no
-- corresponding server-side check. See the "M3" finding in the 2026-07-20
-- code audit. Enforcing at the DB layer covers every insert path (the Add
-- Product wizard, forwarded-receipt confirm, and any future one) uniformly,
-- without needing to change each client flow individually.

create or replace function public.is_premium_user(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select subscription_status in ('active', 'trialing')
     from public.users
     where id = target_user_id),
    false
  );
$$;

-- ── 5-product cap for free accounts ─────────────────────────────────────

create or replace function public.enforce_product_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if public.is_premium_user(new.user_id) then
    return new;
  end if;

  select count(*) into current_count
  from public.products
  where user_id = new.user_id;

  if current_count >= 5 then
    raise exception 'Free accounts are limited to 5 products. Upgrade to Premium for unlimited products.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger enforce_product_limit_trigger
  before insert on public.products
  for each row execute function public.enforce_product_limit();

-- ── 3-confirmed-receipts-per-month cap for free accounts ────────────────
-- Mirrors getMonthlyConfirmedReceiptCount() in src/lib/entitlements.ts:
-- only receipt-kind confirmations count against the cap (warranty-kind
-- drafts are gated separately by isPremium, not this counter).

create or replace function public.enforce_receipt_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if new.status <> 'Confirmed' or old.status = 'Confirmed' or new.kind <> 'receipt' then
    return new;
  end if;

  if public.is_premium_user(new.user_id) then
    return new;
  end if;

  select count(*) into current_count
  from public.forwarded_receipts
  where user_id = new.user_id
    and status = 'Confirmed'
    and kind = 'receipt'
    and received_at >= date_trunc('month', now());

  if current_count >= 3 then
    raise exception 'Free accounts can confirm up to 3 receipts per month. Upgrade to Premium for unlimited receipt forwarding.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger enforce_receipt_limit_trigger
  before update on public.forwarded_receipts
  for each row execute function public.enforce_receipt_limit();
