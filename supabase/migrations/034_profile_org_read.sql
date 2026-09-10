-- SiteLedger: allow organisation members to read the profiles of users
-- who share an active organisation membership with them. Needed so the Jobs
-- workspace can show real team-member initials from job_members -> profiles.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Org members can read shared-org member profiles'
  ) THEN
    CREATE POLICY "Org members can read shared-org member profiles"
      ON public.profiles FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.organisation_members AS viewer
          JOIN public.organisation_members AS target
            ON target.organisation_id = viewer.organisation_id
          WHERE viewer.user_id = auth.uid()
            AND viewer.status = 'active'
            AND target.user_id = profiles.id
            AND target.status = 'active'
        )
      );
  END IF;
END $$;