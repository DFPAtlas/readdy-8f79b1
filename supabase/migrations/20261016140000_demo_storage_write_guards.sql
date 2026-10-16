-- Prevent direct authenticated Storage writes in demo workspaces.
-- Existing permissive bucket policies still decide which normal organisation
-- members may access objects; these restrictive policies add a demo-only veto.

CREATE POLICY "Block demo uploads to documents"
  ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id <> 'documents'
    OR NOT EXISTS (
      SELECT 1
      FROM public.organisations o
      WHERE o.id = public.extract_org_from_path(name)
        AND o.is_demo
    )
  );

CREATE POLICY "Block demo object updates to documents"
  ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    bucket_id <> 'documents'
    OR NOT EXISTS (
      SELECT 1
      FROM public.organisations o
      WHERE o.id = public.extract_org_from_path(name)
        AND o.is_demo
    )
  )
  WITH CHECK (
    bucket_id <> 'documents'
    OR NOT EXISTS (
      SELECT 1
      FROM public.organisations o
      WHERE o.id = public.extract_org_from_path(name)
        AND o.is_demo
    )
  );

CREATE POLICY "Block demo object deletes from documents"
  ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
  USING (
    bucket_id <> 'documents'
    OR NOT EXISTS (
      SELECT 1
      FROM public.organisations o
      WHERE o.id = public.extract_org_from_path(name)
        AND o.is_demo
    )
  );

CREATE POLICY "Block demo uploads to job evidence"
  ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id <> 'job-evidence'
    OR NOT EXISTS (
      SELECT 1
      FROM public.organisations o
      WHERE o.id = public.extract_org_from_path(name)
        AND o.is_demo
    )
  );

CREATE POLICY "Block demo object updates to job evidence"
  ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    bucket_id <> 'job-evidence'
    OR NOT EXISTS (
      SELECT 1
      FROM public.organisations o
      WHERE o.id = public.extract_org_from_path(name)
        AND o.is_demo
    )
  )
  WITH CHECK (
    bucket_id <> 'job-evidence'
    OR NOT EXISTS (
      SELECT 1
      FROM public.organisations o
      WHERE o.id = public.extract_org_from_path(name)
        AND o.is_demo
    )
  );

CREATE POLICY "Block demo object deletes from job evidence"
  ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
  USING (
    bucket_id <> 'job-evidence'
    OR NOT EXISTS (
      SELECT 1
      FROM public.organisations o
      WHERE o.id = public.extract_org_from_path(name)
        AND o.is_demo
    )
  );
