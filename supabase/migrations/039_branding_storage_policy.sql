-- Branding storage policies for the private `documents` bucket.
--
-- The `documents` bucket is intentionally locked down to Edge Functions only
-- (see 20260923002922_documents_storage_bucket.sql). Company logo uploads are the
-- one browser-driven exception, so we add a tightly scoped policy that only covers
-- the `<organisation_id>/branding/` prefix:
--   * owners and admins may insert/replace the logo
--   * any active org member may read it (needed to render a signed preview URL)
-- Everything else in the bucket stays accessible only through the service role.

create policy "Org owners and admins can upload branding documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documents'
  and split_part(name, '/', 2) = 'branding'
  and public.has_org_role(public.extract_org_from_path(name), array['owner', 'admin'])
);

create policy "Org owners and admins can update branding documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'documents'
  and split_part(name, '/', 2) = 'branding'
  and public.has_org_role(public.extract_org_from_path(name), array['owner', 'admin'])
)
with check (
  bucket_id = 'documents'
  and split_part(name, '/', 2) = 'branding'
  and public.has_org_role(public.extract_org_from_path(name), array['owner', 'admin'])
);

create policy "Org members can read branding documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents'
  and split_part(name, '/', 2) = 'branding'
  and public.is_org_member(public.extract_org_from_path(name))
);