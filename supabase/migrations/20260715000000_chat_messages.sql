-- WarrantyBuddy — Ask Buddy chat history
-- Stores the transcript for the Ask Buddy panel (spec 2.6 / 4.9). product_id
-- is null for vault-wide conversations opened from the Dashboard, and set
-- for a single product's thread — "chat history is stored per product and
-- visible when re-opening the panel from that product's page."

create type chat_message_role as enum ('user', 'assistant');

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  product_id uuid references public.products (id) on delete cascade,
  role chat_message_role not null,
  content text not null,
  source text,
  created_at timestamptz not null default now()
);

create index chat_messages_user_product_idx
  on public.chat_messages (user_id, product_id, created_at);

alter table public.chat_messages enable row level security;

create policy "Users can view their own chat messages"
  on public.chat_messages for select
  using (user_id = auth.uid());

create policy "Users can insert their own chat messages"
  on public.chat_messages for insert
  with check (user_id = auth.uid());
