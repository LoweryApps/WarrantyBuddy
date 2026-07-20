-- Section 2.2b (v2.5) — replaces the ai_extracted boolean with a
-- three-way source enum so the UI can distinguish a real uploaded
-- document from an unverified AI-suggested warranty (Warranty Search).

create type public.warranty_source as enum ('Uploaded', 'User-Entered', 'AI-Suggested');

alter table public.warranties
  add column warranty_source public.warranty_source;

update public.warranties
  set warranty_source = case
    when document_url is not null then 'Uploaded'::public.warranty_source
    else 'User-Entered'::public.warranty_source
  end;

alter table public.warranties
  alter column warranty_source set not null,
  alter column warranty_source set default 'User-Entered';

alter table public.warranties
  drop column ai_extracted;
