-- SiteLedger Phase 7: Storage bucket setup
-- Private storage for evidence, documents, workforce files and organisation assets

-- Note: Storage buckets must be created via the Supabase dashboard or Management API.
-- These SQL statements set up the RLS policies for the storage.objects and storage.buckets tables
-- once the buckets have been created with the following names:
--
-- - job-evidence      (private — site photos, videos, voice notes)
-- - project-documents (private — contracts, RAMS, drawings, certificates)
-- - workforce-documents (private — passports, qualifications, insurance, right-to-work)
-- - organisation-assets (private — logos, branding)

-- Storage RLS: allow authenticated org members to read objects in their org's path
-- Object paths follow the convention: organisation_id/job_id/record_id/file_id-filename

-- This function extracts the organisation UUID from a storage object path
CREATE OR REPLACE FUNCTION public.extract_org_from_path(object_path TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT (regexp_match(object_path, '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/'))[1]::UUID;
$$;

-- Storage SELECT policy: users must be org members for the bucket's organisation
-- This is a template — actual policies must be applied via the dashboard or API
-- Example policy (apply per bucket):
-- CREATE POLICY "Org members can read job-evidence objects"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'job-evidence'
--     AND public.is_org_member(public.extract_org_from_path(name))
--   );

-- Storage INSERT policy template:
-- CREATE POLICY "Org members can upload to job-evidence"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'job-evidence'
--     AND public.is_org_member(public.extract_org_from_path(name))
--   );

-- Bucket-level notes:
-- All four buckets should be set as private (not public).
-- File size limits:
--   job-evidence:       50 MB per file
--   project-documents:  25 MB per file
--   workforce-documents: 10 MB per file
--   organisation-assets: 5 MB per file
-- Allowed MIME types per bucket:
--   job-evidence:       image/*, video/*, audio/*, application/pdf
--   project-documents:  application/pdf, image/*, application/vnd.openxmlformats-officedocument.*, text/plain
--   workforce-documents: application/pdf, image/*
--   organisation-assets: image/*

-- Revoke public access from storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;