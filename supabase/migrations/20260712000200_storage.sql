-- WarrantyBuddy — Storage
-- Single private bucket for everything in the Document Collector (Section
-- 2.3): warranty docs, receipts, manuals, product photos, other files.
-- Object paths follow {user_id}/{product_id}/{uuid}-{filename}, so RLS can
-- scope access by checking the first path segment against auth.uid().

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-documents',
  'product-documents',
  false,
  20971520, -- 20MB, per spec Section 2.3
  array['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do nothing;

create policy "Users can view their own documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'product-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can upload their own documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own documents"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'product-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'product-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'product-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
