-- The registered domain is mywarrantybuddy.com, not warrantybuddy.com as
-- originally hardcoded when generate_forwarding_address() was written before
-- a domain was purchased. No real users exist yet with a forwarding_address
-- on the old domain, so this is a straight function replacement — nothing to
-- backfill.

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
    candidate := base_slug || '-' || substr(md5(random()::text), 1, 6) || '@receipts.mywarrantybuddy.com';
    exit when not exists (select 1 from public.users where forwarding_address = candidate);
  end loop;

  return candidate;
end;
$$;
