-- Preserve existing role policies while requiring a daily log's job to belong
-- to the same company. No existing rows are deleted or rewritten.
CREATE POLICY "Daily log job must belong to its company"
ON public.daily_logs AS RESTRICTIVE FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.jobs j
  WHERE j.id = daily_logs.job_id AND j.organisation_id = daily_logs.organisation_id
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.jobs j
  WHERE j.id = daily_logs.job_id AND j.organisation_id = daily_logs.organisation_id
    AND j.archived_at IS NULL
));

CREATE POLICY "Daily log inserts record the authenticated author"
ON public.daily_logs AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (created_by = (SELECT auth.uid()));
