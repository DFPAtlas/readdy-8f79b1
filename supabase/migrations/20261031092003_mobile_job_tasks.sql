CREATE TABLE procurement_private.job_tasks (
 id uuid PRIMARY KEY,organisation_id uuid NOT NULL REFERENCES public.organisations(id),job_id uuid NOT NULL REFERENCES public.jobs(id),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 160),details text NOT NULL DEFAULT '' CHECK(length(details)<=2000),
 assignee_id uuid NOT NULL REFERENCES auth.users(id),created_by uuid NOT NULL REFERENCES auth.users(id),due_date date,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','blocked','completed','cancelled')),
 revision integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 last_request uuid,last_actor uuid,last_action text
);
ALTER TABLE procurement_private.job_tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON procurement_private.job_tasks FROM PUBLIC,anon,authenticated,service_role;
CREATE INDEX ON procurement_private.job_tasks(organisation_id,assignee_id);
CREATE INDEX ON procurement_private.job_tasks(job_id);
CREATE INDEX ON procurement_private.job_tasks(created_by);

CREATE FUNCTION procurement_private.job_task_operation(p_org uuid,p_job uuid,p_action text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_task procurement_private.job_tasks;v_job public.jobs;v_manager boolean;v_target uuid;v_status text;v_request uuid;v_offset integer;v_total integer;v_rows jsonb;v_people jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.organisation_members WHERE organisation_id=p_org AND user_id=auth.uid() AND status='active') OR NOT EXISTS(SELECT 1 FROM public.organisations WHERE id=p_org AND archived_at IS NULL) THEN RAISE EXCEPTION 'Active company membership required' USING ERRCODE='42501'; END IF;
 v_manager:=EXISTS(SELECT 1 FROM public.organisation_members WHERE organisation_id=p_org AND user_id=auth.uid() AND status='active' AND role IN ('owner','admin','project_manager'));
 IF p_job IS NOT NULL THEN
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job AND organisation_id=p_org AND archived_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job unavailable' USING ERRCODE='42501'; END IF;
 END IF;
 IF p_action='list' THEN
  v_offset:=COALESCE((p_data->>'offset')::integer,0);
  IF v_offset<0 THEN RAISE EXCEPTION 'Invalid page'; END IF;
  SELECT count(*) INTO v_total FROM procurement_private.job_tasks t JOIN public.jobs j ON j.id=t.job_id AND j.organisation_id=t.organisation_id AND j.archived_at IS NULL
   WHERE t.organisation_id=p_org AND (p_job IS NULL OR t.job_id=p_job) AND ((v_manager AND p_job IS NOT NULL) OR (t.assignee_id=auth.uid() AND EXISTS(SELECT 1 FROM public.job_members jm WHERE jm.job_id=t.job_id AND jm.organisation_id=p_org AND jm.user_id=auth.uid())));
  SELECT COALESCE(jsonb_agg(x.payload ORDER BY x.due_date NULLS LAST,x.created_at DESC,x.id),'[]'::jsonb) INTO v_rows FROM (
   SELECT t.id,t.due_date,t.created_at,(to_jsonb(t)-'last_request'-'last_actor'-'last_action')||jsonb_build_object('job_reference',j.reference,'project_name',j.project_name,'assignee_name',COALESCE(nullif(p.full_name,''),'Company account')) payload
   FROM procurement_private.job_tasks t JOIN public.jobs j ON j.id=t.job_id AND j.organisation_id=t.organisation_id AND j.archived_at IS NULL LEFT JOIN public.profiles p ON p.id=t.assignee_id
   WHERE t.organisation_id=p_org AND (p_job IS NULL OR t.job_id=p_job) AND ((v_manager AND p_job IS NOT NULL) OR (t.assignee_id=auth.uid() AND EXISTS(SELECT 1 FROM public.job_members jm WHERE jm.job_id=t.job_id AND jm.organisation_id=p_org AND jm.user_id=auth.uid())))
   ORDER BY t.due_date NULLS LAST,t.created_at DESC,t.id LIMIT 50 OFFSET v_offset) x;
  v_people:='[]'::jsonb;
  IF v_manager AND p_job IS NOT NULL THEN
   SELECT COALESCE(jsonb_agg(x.payload ORDER BY x.user_id),'[]'::jsonb) INTO v_people FROM (
    SELECT DISTINCT jm.user_id,jsonb_build_object('id',jm.user_id,'name',COALESCE(nullif(p.full_name,''),'Company account')) payload
    FROM public.job_members jm JOIN public.organisation_members m ON m.organisation_id=jm.organisation_id AND m.user_id=jm.user_id AND m.status='active'
    LEFT JOIN public.profiles p ON p.id=jm.user_id WHERE jm.organisation_id=p_org AND jm.job_id=p_job) x;
  END IF;
  RETURN jsonb_build_object('tasks',v_rows,'total',v_total,'offset',v_offset,'people',v_people,'can_manage',v_manager AND p_job IS NOT NULL);
 END IF;
 IF NOT COALESCE(public.org_has_write_access(p_org),false) OR EXISTS(SELECT 1 FROM public.organisation_subscriptions WHERE organisation_id=p_org AND (access_state IN ('read_only','billing_locked','suspended_by_platform') OR (status='trialing' AND trial_end IS NOT NULL AND trial_end<now()))) THEN RAISE EXCEPTION 'Writable company required' USING ERRCODE='42501'; END IF;
 IF p_job IS NULL THEN RAISE EXCEPTION 'Job required'; END IF;
 -- Job-first locking serializes creation limits and matches the assignment workflow.
 SELECT * INTO v_job FROM public.jobs WHERE id=p_job AND organisation_id=p_org AND archived_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Job unavailable'; END IF;
 IF p_action='create' THEN
  IF NOT v_manager THEN RAISE EXCEPTION 'Task management permission required' USING ERRCODE='42501'; END IF;
  v_target:=(p_data->>'assignee_id')::uuid;
  IF NOT EXISTS(SELECT 1 FROM public.job_members jm JOIN public.organisation_members m ON m.organisation_id=jm.organisation_id AND m.user_id=jm.user_id AND m.status='active' WHERE jm.organisation_id=p_org AND jm.job_id=p_job AND jm.user_id=v_target) THEN RAISE EXCEPTION 'Choose an active saved job-team account' USING ERRCODE='42501'; END IF;
  IF COALESCE(length(btrim(p_data->>'title')),0) NOT BETWEEN 1 AND 160 OR length(COALESCE(p_data->>'details',''))>2000 OR p_data->>'id' IS NULL THEN RAISE EXCEPTION 'Invalid task'; END IF;
  SELECT * INTO v_task FROM procurement_private.job_tasks WHERE id=(p_data->>'id')::uuid FOR UPDATE;
  IF FOUND THEN
   IF v_task.organisation_id<>p_org OR v_task.job_id<>p_job OR v_task.created_by<>auth.uid() OR v_task.title<>btrim(p_data->>'title') OR v_task.details<>COALESCE(p_data->>'details','') OR v_task.assignee_id<>v_target OR v_task.due_date IS DISTINCT FROM nullif(p_data->>'due_date','')::date THEN RAISE EXCEPTION 'Task request conflict'; END IF;
   RETURN jsonb_build_object('id',v_task.id,'revision',v_task.revision,'status',v_task.status);
  END IF;
  IF (SELECT count(*) FROM procurement_private.job_tasks WHERE job_id=p_job)>=10000 THEN RAISE EXCEPTION 'Job task limit reached'; END IF;
  INSERT INTO procurement_private.job_tasks(id,organisation_id,job_id,title,details,assignee_id,created_by,due_date)
   VALUES((p_data->>'id')::uuid,p_org,p_job,btrim(p_data->>'title'),COALESCE(p_data->>'details',''),v_target,auth.uid(),nullif(p_data->>'due_date','')::date) RETURNING * INTO v_task;
 ELSIF p_action IN ('status','reassign') THEN
  SELECT * INTO v_task FROM procurement_private.job_tasks WHERE id=(p_data->>'id')::uuid AND organisation_id=p_org AND job_id=p_job FOR UPDATE;
  IF NOT FOUND OR (NOT v_manager AND (v_task.assignee_id<>auth.uid() OR NOT EXISTS(SELECT 1 FROM public.job_members WHERE organisation_id=p_org AND job_id=p_job AND user_id=auth.uid()))) THEN RAISE EXCEPTION 'Task unavailable' USING ERRCODE='42501'; END IF;
  v_request:=(p_data->>'request_id')::uuid;v_status:=p_data->>'status';v_target:=(p_data->>'assignee_id')::uuid;
  IF v_request IS NULL THEN RAISE EXCEPTION 'Request ID required'; END IF;
  IF p_action='reassign' THEN
   IF NOT v_manager OR NOT EXISTS(SELECT 1 FROM public.job_members jm JOIN public.organisation_members m ON m.organisation_id=jm.organisation_id AND m.user_id=jm.user_id AND m.status='active' WHERE jm.organisation_id=p_org AND jm.job_id=p_job AND jm.user_id=v_target) THEN RAISE EXCEPTION 'Choose an active saved job-team account' USING ERRCODE='42501'; END IF;
   v_status:='pending';
  ELSIF COALESCE(v_status,'') NOT IN ('pending','in_progress','blocked','completed','cancelled') THEN RAISE EXCEPTION 'Invalid task status'; END IF;
  IF v_task.last_request=v_request AND v_task.last_actor=auth.uid() AND v_task.last_action=p_action AND v_task.revision=(p_data->>'revision')::integer+1 AND v_task.status=v_status AND (p_action<>'reassign' OR v_task.assignee_id=v_target) THEN RETURN jsonb_build_object('id',v_task.id,'revision',v_task.revision,'status',v_task.status); END IF;
  IF v_task.revision IS DISTINCT FROM (p_data->>'revision')::integer THEN RAISE EXCEPTION 'Task changed; refresh before saving' USING ERRCODE='40001'; END IF;
  IF NOT v_manager AND (v_task.status IN ('completed','cancelled') OR v_status NOT IN ('in_progress','blocked','completed')) THEN RAISE EXCEPTION 'Task cannot make this transition' USING ERRCODE='42501'; END IF;
  UPDATE procurement_private.job_tasks SET status=v_status,assignee_id=CASE WHEN p_action='reassign' THEN v_target ELSE assignee_id END,revision=revision+1,updated_at=now(),last_request=v_request,last_actor=auth.uid(),last_action=p_action WHERE id=v_task.id RETURNING * INTO v_task;
 ELSE RAISE EXCEPTION 'Unknown task action'; END IF;
 INSERT INTO public.audit_events(organisation_id,actor_id,action,entity_type,entity_id,change_summary,source)
  VALUES(p_org,auth.uid(),'job_task_'||p_action,'job_task',v_task.id,jsonb_build_object('job_id',p_job,'status',v_task.status,'assignee_id',v_task.assignee_id,'revision',v_task.revision),'job_tasks');
 RETURN jsonb_build_object('id',v_task.id,'revision',v_task.revision,'status',v_task.status);
END $$;
REVOKE ALL ON FUNCTION procurement_private.job_task_operation(uuid,uuid,text,jsonb) FROM PUBLIC,anon,service_role;
GRANT USAGE ON SCHEMA procurement_private TO authenticated;
GRANT EXECUTE ON FUNCTION procurement_private.job_task_operation(uuid,uuid,text,jsonb) TO authenticated;
CREATE FUNCTION public.manage_job_tasks(p_org uuid,p_job uuid,p_action text,p_data jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT procurement_private.job_task_operation(p_org,p_job,p_action,p_data)$$;
REVOKE ALL ON FUNCTION public.manage_job_tasks(uuid,uuid,text,jsonb) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.manage_job_tasks(uuid,uuid,text,jsonb) TO authenticated;
