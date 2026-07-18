create type subscription_plan as enum (
  'founding_monthly', 'founding_annual', 'regular_monthly', 'regular_annual'
);

create type subscription_status as enum (
  'active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid'
);

alter table public.users
  add column stripe_customer_id text unique,
  add column stripe_subscription_id text unique,
  add column plan subscription_plan,
  add column subscription_status subscription_status,
  add column current_period_end timestamptz;

create index users_stripe_customer_id_idx on public.users (stripe_customer_id);
