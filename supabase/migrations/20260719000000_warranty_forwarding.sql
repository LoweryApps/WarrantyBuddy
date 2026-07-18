-- Section 2.4b — Warranty Document Forwarding. Extends the existing
-- forwarded_receipts table (Section 2.4) so the same inbound address and
-- Review Queue also handle warranty-only and mixed receipt+warranty emails,
-- not just purchase receipts.

create type forwarded_email_kind as enum ('receipt', 'warranty', 'both');

alter table public.forwarded_receipts
  add column kind forwarded_email_kind not null default 'receipt',
  add column extracted_brand text,
  add column extracted_warranty_start_date date,
  add column extracted_warranty_end_date date,
  add column extracted_coverage_description text,
  add column extracted_exclusions text,
  add column extracted_claim_contact text;
