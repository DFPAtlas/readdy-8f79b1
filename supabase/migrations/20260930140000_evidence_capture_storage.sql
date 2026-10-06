-- Site evidence capture: private storage bucket + org-scoped storage policies.
--
-- The evidence_files + evidence_records tables already exist (migration 005) and
-- carry org-scoped RLS. This migration adds the missing protected storage area the
-- evidence capture workflow uploads into, and locks it down by organisation path.
--
-- Object path convention (read by public.extract_org_from_path):
--   {organisation_id}/{job_id}/{evidence_record_id}/{file_key}-{filename}
--
-- Non-destructive: creates one private bucket and two additive policies. No existing
-- data is touched and nothing is made public.

-- Private bucket for site evidence (photos, video, audio, documents).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-evidence',
  'job-evidence',
  false,
  52428800,
  ARRAY['image/*', 'video/*', 'audio/*', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Org members may read only objects whose leading path segment is their organisation.
CREATE POLICY "Org members can read job-evidence objects"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'job-evidence'
    AND public.is_org_member(public.extract_org_from_path(name))
  );

-- Org members may upload only into their own organisation's folder.
CREATE POLICY "Org members can upload job-evidence objects"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'job-evidence'
    AND public.is_org_member(public.extract_org_from_path(name))
  );

-- Org members may overwrite their own organisation's objects (needed when a
-- partially-uploaded capture is retried with storage upsert).
CREATE POLICY "Org members can update job-evidence objects"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'job-evidence'
    AND public.is_org_member(public.extract_org_from_path(name))
  )
  WITH CHECK (
    bucket_id = 'job-evidence'
    AND public.is_org_member(public.extract_org_from_path(name))
  );