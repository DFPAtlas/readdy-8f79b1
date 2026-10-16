-- Allow finance roles to maintain organisation-scoped CIS register notes.
-- HMRC verification, filing and payment calculations remain outside this migration.

CREATE UNIQUE INDEX IF NOT EXISTS idx_cis_records_org_person_unique
  ON public.cis_records(organisation_id, person_id);

DROP POLICY IF EXISTS "Org members can read CIS records" ON public.cis_records;

CREATE POLICY "Active organisation members can read CIS records"
  ON public.cis_records FOR SELECT TO authenticated
  USING (public.is_org_member(organisation_id));

CREATE POLICY "Finance roles can add CIS records"
  ON public.cis_records FOR INSERT TO authenticated
  WITH CHECK (
    public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'finance'])
    AND public.org_has_write_access(organisation_id)
    AND EXISTS (
      SELECT 1
      FROM public.workforce_people person
      WHERE person.id = person_id
        AND person.organisation_id = organisation_id
        AND person.archived_at IS NULL
        AND person.relationship IN ('subcontractor_individual', 'subcontractor_company')
    )
  );

CREATE POLICY "Finance roles can update CIS records"
  ON public.cis_records FOR UPDATE TO authenticated
  USING (
    public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'finance'])
    AND public.org_has_write_access(organisation_id)
  )
  WITH CHECK (
    public.has_org_role(organisation_id, ARRAY['owner', 'admin', 'finance'])
    AND public.org_has_write_access(organisation_id)
    AND EXISTS (
      SELECT 1
      FROM public.workforce_people person
      WHERE person.id = person_id
        AND person.organisation_id = organisation_id
        AND person.archived_at IS NULL
        AND person.relationship IN ('subcontractor_individual', 'subcontractor_company')
    )
  );

GRANT SELECT, INSERT, UPDATE ON TABLE public.cis_records TO authenticated;
REVOKE ALL ON TABLE public.cis_records FROM anon;
REVOKE DELETE ON TABLE public.cis_records FROM authenticated;
