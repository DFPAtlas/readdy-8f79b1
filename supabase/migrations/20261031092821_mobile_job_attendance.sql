CREATE TABLE procurement_private.job_attendance (
 id uuid PRIMARY KEY,organisation_id uuid NOT NULL REFERENCES public.organisations(id),job_id uuid NOT NULL REFERENCES public.jobs(id),user_id uuid NOT NULL REFERENCES auth.users(id),
 started_at timestamptz NOT NULL DEFAULT now(),ended_at timestamptz CHECK(ended_at IS NULL OR ended_at>=started_at),
 end_request uuid,end_actor uuid,close_reason text CHECK(close_reason IS NULL OR length(close_reason) BETWEEN 1 AND 500)
);
CREATE UNIQUE INDEX job_attendance_one_open ON procurement_private.job_attendance(organisation_id,user_id) WHERE ended_at IS NULL;
CREATE INDEX ON procurement_private.job_attendance(organisation_id,user_id,started_at DESC);
CREATE INDEX ON procurement_private.job_attendance(job_id);
ALTER TABLE procurement_private.job_attendance ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON procurement_private.job_attendance FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION procurement_private.job_attendance_operation(p_org uuid,p_job uuid,p_action text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_manager boolean;v_rows jsonb;v_jobs jsonb;v_current jsonb;v_count integer;v_offset integer;v_record procurement_private.job_attendance;v_id uuid;v_request uuid;v_reason text;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.organisation_members WHERE organisation_id=p_org AND user_id=auth.uid() AND status='active') THEN RAISE EXCEPTION 'Active company membership required' USING ERRCODE='42501'; END IF;
 v_manager:=EXISTS(SELECT 1 FROM public.organisation_members WHERE organisation_id=p_org AND user_id=auth.uid() AND status='active' AND role IN ('owner','admin','project_manager'));
 IF p_action='list' THEN
  IF p_job IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.jobs WHERE id=p_job AND organisation_id=p_org) THEN RAISE EXCEPTION 'Job unavailable' USING ERRCODE='42501'; END IF;
  v_offset:=COALESCE((p_data->>'offset')::integer,0);IF v_offset<0 THEN RAISE EXCEPTION 'Invalid page'; END IF;
  SELECT count(*) INTO v_count FROM procurement_private.job_attendance a WHERE a.organisation_id=p_org AND (p_job IS NULL OR a.job_id=p_job) AND ((v_manager AND p_job IS NOT NULL) OR a.user_id=auth.uid());
  SELECT COALESCE(jsonb_agg(x.payload ORDER BY x.started_at DESC,x.id),'[]'::jsonb) INTO v_rows FROM (
   SELECT a.id,a.started_at,(to_jsonb(a)-'end_request'-'end_actor')||jsonb_build_object('job_reference',j.reference,'project_name',j.project_name,'person_name',COALESCE(nullif(p.full_name,''),'Company account'),'elapsed_seconds',CASE WHEN a.ended_at IS NULL THEN NULL ELSE floor(extract(epoch FROM a.ended_at-a.started_at)) END) payload
   FROM procurement_private.job_attendance a JOIN public.jobs j ON j.id=a.job_id AND j.organisation_id=a.organisation_id LEFT JOIN public.profiles p ON p.id=a.user_id
   WHERE a.organisation_id=p_org AND (p_job IS NULL OR a.job_id=p_job) AND ((v_manager AND p_job IS NOT NULL) OR a.user_id=auth.uid()) ORDER BY a.started_at DESC,a.id LIMIT 50 OFFSET v_offset) x;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',x.id,'name',x.project_name,'reference',x.reference) ORDER BY x.reference,x.id),'[]'::jsonb) INTO v_jobs FROM (
   SELECT j.id,j.project_name,j.reference FROM public.jobs j WHERE j.organisation_id=p_org AND j.archived_at IS NULL AND (p_job IS NULL OR j.id=p_job) AND EXISTS(SELECT 1 FROM public.job_members jm WHERE jm.job_id=j.id AND jm.organisation_id=p_org AND jm.user_id=auth.uid()) ORDER BY j.reference,j.id LIMIT 500) x;
  SELECT (to_jsonb(a)-'end_request'-'end_actor')||jsonb_build_object('job_reference',j.reference,'project_name',j.project_name) INTO v_current FROM procurement_private.job_attendance a JOIN public.jobs j ON j.id=a.job_id AND j.organisation_id=a.organisation_id WHERE a.organisation_id=p_org AND a.user_id=auth.uid() AND a.ended_at IS NULL;
  RETURN jsonb_build_object('rows',v_rows,'total',v_count,'offset',v_offset,'jobs',v_jobs,'current',v_current,'can_manage',v_manager AND p_job IS NOT NULL);
 END IF;
 v_id:=(p_data->>'id')::uuid;IF v_id IS NULL THEN RAISE EXCEPTION 'Record ID required'; END IF;
 IF p_action='start' THEN
  IF p_job IS NULL OR NOT EXISTS(SELECT 1 FROM public.organisations WHERE id=p_org AND archived_at IS NULL) OR NOT COALESCE(public.org_has_write_access(p_org),false) OR EXISTS(SELECT 1 FROM public.organisation_subscriptions WHERE organisation_id=p_org AND (access_state IN ('read_only','billing_locked','suspended_by_platform') OR (status='trialing' AND trial_end IS NOT NULL AND trial_end<now()))) THEN RAISE EXCEPTION 'Writable company required' USING ERRCODE='42501'; END IF;
  -- Lock job consistently with assignment changes; use server timestamps only.
  PERFORM 1 FROM public.jobs WHERE id=p_job AND organisation_id=p_org AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.job_members WHERE job_id=p_job AND organisation_id=p_org AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Active saved job assignment required' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||':'||auth.uid()::text,0));
  SELECT * INTO v_record FROM procurement_private.job_attendance WHERE id=v_id;
  IF FOUND THEN
   IF v_record.organisation_id<>p_org OR v_record.job_id<>p_job OR v_record.user_id<>auth.uid() THEN RAISE EXCEPTION 'Attendance request conflict'; END IF;
   RETURN jsonb_build_object('id',v_record.id,'started_at',v_record.started_at,'ended_at',v_record.ended_at);
  END IF;
  IF EXISTS(SELECT 1 FROM procurement_private.job_attendance WHERE organisation_id=p_org AND user_id=auth.uid() AND ended_at IS NULL) THEN RAISE EXCEPTION 'Finish your open attendance record first'; END IF;
  INSERT INTO procurement_private.job_attendance(id,organisation_id,job_id,user_id) VALUES(v_id,p_org,p_job,auth.uid()) RETURNING * INTO v_record;
 ELSIF p_action='finish' THEN
  SELECT * INTO v_record FROM procurement_private.job_attendance WHERE id=v_id AND organisation_id=p_org AND (p_job IS NULL OR job_id=p_job) FOR UPDATE;
  IF NOT FOUND OR (v_record.user_id<>auth.uid() AND NOT v_manager) THEN RAISE EXCEPTION 'Attendance record unavailable' USING ERRCODE='42501'; END IF;
  v_request:=(p_data->>'request_id')::uuid;v_reason:=nullif(btrim(p_data->>'reason'),'');
  IF v_request IS NULL OR (v_record.user_id<>auth.uid() AND v_reason IS NULL) OR length(COALESCE(v_reason,''))>500 THEN RAISE EXCEPTION 'A request ID and a reason for manager closure are required'; END IF;
  IF v_record.ended_at IS NOT NULL THEN
   IF v_record.end_request=v_request AND v_record.end_actor=auth.uid() AND v_record.close_reason IS NOT DISTINCT FROM v_reason THEN RETURN jsonb_build_object('id',v_record.id,'started_at',v_record.started_at,'ended_at',v_record.ended_at); END IF;
   RAISE EXCEPTION 'Attendance already finished; refresh';
  END IF;
  -- Finishing an existing record remains possible after job archival/team removal or billing lock.
  UPDATE procurement_private.job_attendance SET ended_at=clock_timestamp(),end_request=v_request,end_actor=auth.uid(),close_reason=v_reason WHERE id=v_id RETURNING * INTO v_record;
 ELSE RAISE EXCEPTION 'Unknown attendance action'; END IF;
 INSERT INTO public.audit_events(organisation_id,actor_id,action,entity_type,entity_id,change_summary,source) VALUES(p_org,auth.uid(),'job_attendance_'||p_action,'job_attendance',v_id,jsonb_build_object('job_id',v_record.job_id,'user_id',v_record.user_id,'started_at',v_record.started_at,'ended_at',v_record.ended_at,'reason',v_reason),'attendance');
 RETURN jsonb_build_object('id',v_record.id,'started_at',v_record.started_at,'ended_at',v_record.ended_at);
END $$;
REVOKE ALL ON FUNCTION procurement_private.job_attendance_operation(uuid,uuid,text,jsonb) FROM PUBLIC,anon,service_role;
GRANT USAGE ON SCHEMA procurement_private TO authenticated;
GRANT EXECUTE ON FUNCTION procurement_private.job_attendance_operation(uuid,uuid,text,jsonb) TO authenticated;
CREATE FUNCTION public.manage_job_attendance(p_org uuid,p_job uuid,p_action text,p_data jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT procurement_private.job_attendance_operation(p_org,p_job,p_action,p_data)$$;
REVOKE ALL ON FUNCTION public.manage_job_attendance(uuid,uuid,text,jsonb) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.manage_job_attendance(uuid,uuid,text,jsonb) TO authenticated;
