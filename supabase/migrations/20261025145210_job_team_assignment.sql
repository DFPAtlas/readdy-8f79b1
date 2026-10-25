-- Job assignments stay inside the caller's organisation and billing access.
CREATE POLICY "Job member rows match their job and active company member"
ON public.job_members AS RESTRICTIVE FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.jobs j WHERE j.id=job_members.job_id
    AND j.organisation_id=job_members.organisation_id
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.jobs j WHERE j.id=job_members.job_id
    AND j.organisation_id=job_members.organisation_id AND j.archived_at IS NULL
) AND EXISTS (
  SELECT 1 FROM public.organisation_members om WHERE om.organisation_id=job_members.organisation_id
    AND om.user_id=job_members.user_id AND om.status='active'
));

CREATE POLICY "Job managers can remove company job assignments"
ON public.job_members FOR DELETE TO authenticated
USING (public.has_org_role(organisation_id, ARRAY['owner','admin','project_manager'])
  AND public.org_has_write_access(organisation_id));

CREATE FUNCTION public.replace_job_team(p_org uuid,p_job uuid,p_expected jsonb,p_members jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  v_job public.jobs%ROWTYPE;
  v_before jsonb;
  v_after jsonb;
  v_members jsonb;
  v_manager uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_org_role(p_org, ARRAY['owner','admin','project_manager'])
    OR NOT public.org_has_write_access(p_org) THEN
    RAISE EXCEPTION 'Job management permission and writable workspace required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job AND organisation_id=p_org AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job unavailable' USING ERRCODE='42501'; END IF;
  IF p_members IS NULL OR jsonb_typeof(p_members)<>'array' OR jsonb_array_length(p_members)>100 THEN
    RAISE EXCEPTION 'Choose at most 100 job roles' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_members) e WHERE jsonb_typeof(e)<>'object'
    OR e->>'user_id' IS NULL OR e->>'role' IS NULL
    OR e->>'role' NOT IN ('project_manager','site_supervisor','worker','observer')) THEN
    RAISE EXCEPTION 'Invalid job role' USING ERRCODE='22023';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id',x.user_id,'role',x.role) ORDER BY x.user_id,x.role),'[]'::jsonb)
    INTO v_members FROM (SELECT (e->>'user_id')::uuid user_id,e->>'role' role FROM jsonb_array_elements(p_members) e) x;
  IF (SELECT count(*) FROM jsonb_array_elements(v_members))<>(SELECT count(*) FROM (SELECT DISTINCT e FROM jsonb_array_elements(v_members) e) d) THEN
    RAISE EXCEPTION 'Duplicate job role' USING ERRCODE='22023';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(v_members) e WHERE e->>'role'='project_manager')>1 THEN
    RAISE EXCEPTION 'Choose one project manager' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_members) e WHERE NOT EXISTS (
    SELECT 1 FROM public.organisation_members om WHERE om.organisation_id=p_org
      AND om.user_id=(e->>'user_id')::uuid AND om.status='active'
  )) THEN RAISE EXCEPTION 'Only active company members can be assigned' USING ERRCODE='42501'; END IF;
  SELECT (e->>'user_id')::uuid INTO v_manager FROM jsonb_array_elements(v_members) e WHERE e->>'role'='project_manager';
  SELECT jsonb_build_object('manager_id',v_job.project_manager_id,'members',COALESCE(jsonb_agg(
    jsonb_build_object('user_id',jm.user_id,'role',jm.role) ORDER BY jm.user_id,jm.role),'[]'::jsonb))
    INTO v_before FROM public.job_members jm WHERE jm.organisation_id=p_org AND jm.job_id=p_job;
  v_after:=jsonb_build_object('manager_id',v_manager,'members',v_members);
  -- Recover a lost response without repeating writes/audit or overwriting intervening changes.
  IF v_before=v_after THEN RETURN v_after; END IF;
  IF p_expected IS NULL OR p_expected<>v_before THEN
    RAISE EXCEPTION 'The job team changed. Reload before saving.' USING ERRCODE='40001';
  END IF;
  DELETE FROM public.job_members WHERE organisation_id=p_org AND job_id=p_job
    AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_members) e
      WHERE (e->>'user_id')::uuid=job_members.user_id AND e->>'role'=job_members.role);
  INSERT INTO public.job_members(organisation_id,job_id,user_id,role)
    SELECT p_org,p_job,(e->>'user_id')::uuid,e->>'role' FROM jsonb_array_elements(v_members) e
    ON CONFLICT(job_id,user_id,role) DO NOTHING;
  UPDATE public.jobs SET project_manager_id=v_manager,updated_at=now() WHERE id=p_job AND organisation_id=p_org;
  INSERT INTO public.audit_events(organisation_id,actor_id,action,entity_type,entity_id,change_summary,source)
    VALUES(p_org,auth.uid(),'job_team_updated','job',p_job,jsonb_build_object('before',v_before,'after',v_after),'job_team');
  RETURN v_after;
END $$;
REVOKE ALL ON FUNCTION public.replace_job_team(uuid,uuid,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.replace_job_team(uuid,uuid,jsonb,jsonb) TO authenticated;
