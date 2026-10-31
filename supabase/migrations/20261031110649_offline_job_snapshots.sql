-- Read-only export: derives the account from auth.uid(), never caller-supplied identity.
CREATE FUNCTION procurement_private.offline_job_snapshot(p_org uuid,p_job uuid,p_validate boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_job public.jobs;v_company text;v_tasks jsonb;v_payload jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.organisation_members WHERE organisation_id=p_org AND user_id=auth.uid() AND status='active') OR NOT EXISTS(SELECT 1 FROM public.job_members WHERE organisation_id=p_org AND job_id=p_job AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Active saved job assignment required' USING ERRCODE='42501'; END IF;
 SELECT name INTO v_company FROM public.organisations WHERE id=p_org AND archived_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Company unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_job FROM public.jobs WHERE id=p_job AND organisation_id=p_org AND archived_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Job unavailable' USING ERRCODE='42501'; END IF;
 IF p_validate THEN RETURN jsonb_build_object('allowed',true,'user_id',auth.uid(),'organisation_id',p_org,'job_id',p_job); END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',x.id,'title',x.title,'details',x.details,'status',x.status,'due_date',x.due_date) ORDER BY x.id),'[]'::jsonb) INTO v_tasks FROM (
  SELECT id,title,details,status,due_date FROM procurement_private.job_tasks WHERE organisation_id=p_org AND job_id=p_job AND assignee_id=auth.uid() ORDER BY id LIMIT 1001) x;
 IF jsonb_array_length(v_tasks)>1000 THEN RAISE EXCEPTION 'This job has too many assigned tasks for an offline snapshot'; END IF;
 v_payload:=jsonb_build_object('kind','bn_offline_job_v1','user_id',auth.uid(),'organisation_id',p_org,'company_name',v_company,'generated_at',now(),'expires_at',now()+interval '24 hours',
 'job',jsonb_build_object('id',v_job.id,'reference',v_job.reference,'name',v_job.project_name,'status',v_job.status,'progress',v_job.progress,'target_date',v_job.target_completion_date),'tasks',v_tasks);
 IF octet_length(v_payload::text)>3000000 THEN RAISE EXCEPTION 'This job snapshot exceeds the offline size limit'; END IF;
 RETURN v_payload;
END $$;
REVOKE ALL ON FUNCTION procurement_private.offline_job_snapshot(uuid,uuid,boolean) FROM PUBLIC,anon,service_role;
GRANT USAGE ON SCHEMA procurement_private TO authenticated;
GRANT EXECUTE ON FUNCTION procurement_private.offline_job_snapshot(uuid,uuid,boolean) TO authenticated;
CREATE FUNCTION public.get_offline_job_snapshot(p_org uuid,p_job uuid,p_validate boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT procurement_private.offline_job_snapshot(p_org,p_job,p_validate)$$;
REVOKE ALL ON FUNCTION public.get_offline_job_snapshot(uuid,uuid,boolean) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.get_offline_job_snapshot(uuid,uuid,boolean) TO authenticated;
