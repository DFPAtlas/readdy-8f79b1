-- Opt-in personal scheduled CSV reports. Legacy schedules are never activated.
CREATE TABLE procurement_private.job_report_schedules (
 id uuid PRIMARY KEY, organisation_id uuid NOT NULL REFERENCES public.organisations(id),
 report_id uuid NOT NULL REFERENCES public.saved_reports(id), owner_id uuid NOT NULL REFERENCES auth.users(id),
 cadence text NOT NULL CHECK(cadence IN ('daily','weekly','monthly')),
 local_time time NOT NULL, active boolean NOT NULL DEFAULT true,
 next_run timestamptz NOT NULL, revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), stop_reason text
);
CREATE TABLE procurement_private.job_report_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), schedule_id uuid NOT NULL REFERENCES procurement_private.job_report_schedules(id),
 due_at timestamptz NOT NULL, revision integer NOT NULL, payload jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted_by_provider','failed','cancelled','uncertain')),
 attempts integer NOT NULL DEFAULT 0, first_attempt timestamptz, available_at timestamptz NOT NULL DEFAULT now(),
 lease uuid, provider_id text, UNIQUE(schedule_id,due_at)
);
CREATE TABLE procurement_private.job_report_worker_config (
 name text PRIMARY KEY CHECK(name='worker'), token_hash text NOT NULL CHECK(token_hash ~ '^[a-f0-9]{64}$')
);
ALTER TABLE procurement_private.job_report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_private.job_report_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_private.job_report_worker_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON procurement_private.job_report_schedules,procurement_private.job_report_deliveries,procurement_private.job_report_worker_config FROM PUBLIC,anon,authenticated,service_role;
CREATE INDEX ON procurement_private.job_report_schedules(next_run) WHERE active;
CREATE INDEX ON procurement_private.job_report_schedules(organisation_id,owner_id);
CREATE INDEX ON procurement_private.job_report_schedules(report_id);
CREATE INDEX ON procurement_private.job_report_deliveries(available_at) WHERE status='pending';

CREATE FUNCTION procurement_private.next_job_report_run(p_after timestamptz,p_cadence text,p_time time)
RETURNS timestamptz LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE d date; candidate timestamptz;
BEGIN
 IF p_after IS NULL OR p_time IS NULL OR p_cadence NOT IN ('daily','weekly','monthly') THEN RAISE EXCEPTION 'Invalid schedule'; END IF;
 FOR i IN 0..32 LOOP
  d:=(p_after AT TIME ZONE 'Europe/London')::date+i;
  candidate:=(d+p_time) AT TIME ZONE 'Europe/London';
  IF candidate>p_after AND (p_cadence='daily' OR (p_cadence='weekly' AND extract(isodow FROM d)=1) OR (p_cadence='monthly' AND extract(day FROM d)=1)) THEN RETURN candidate; END IF;
 END LOOP;
 RAISE EXCEPTION 'Could not calculate next run';
END $$;
REVOKE ALL ON FUNCTION procurement_private.next_job_report_run(timestamptz,text,time) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION procurement_private.job_report_writable(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.organisations WHERE id=p_org AND archived_at IS NULL) AND NOT EXISTS(SELECT 1 FROM public.organisation_subscriptions WHERE organisation_id=p_org AND
 (access_state IN ('read_only','billing_locked','suspended_by_platform') OR (status='trialing' AND trial_end IS NOT NULL AND trial_end<now())));
$$;
REVOKE ALL ON FUNCTION procurement_private.job_report_writable(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION procurement_private.job_report_admin(p_org uuid,p_action text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s procurement_private.job_report_schedules; r public.saved_reports; v_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.organisation_members WHERE organisation_id=p_org AND user_id=auth.uid() AND status='active' AND role IN ('owner','admin')) THEN RAISE EXCEPTION 'Active company admin required' USING ERRCODE='42501'; END IF;
 IF p_action='list' THEN
  RETURN jsonb_build_object('schedules',COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC) FROM (
    SELECT ls.id,ls.report_id,ls.cadence,ls.local_time,ls.active,ls.next_run,ls.revision,ls.created_at,ls.stop_reason,lr.name,
     (SELECT d.status FROM procurement_private.job_report_deliveries d WHERE d.schedule_id=ls.id ORDER BY d.due_at DESC LIMIT 1) last_status
    FROM procurement_private.job_report_schedules ls JOIN public.saved_reports lr ON lr.id=ls.report_id AND lr.organisation_id=ls.organisation_id
    WHERE ls.organisation_id=p_org AND ls.owner_id=auth.uid()) x),'[]'::jsonb),
    'reports',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name)) FROM public.saved_reports WHERE organisation_id=p_org AND archived_at IS NULL AND report_type='jobs' AND visibility='internal_management' AND selected_sections=ARRAY['job_status'] AND filter_config=jsonb_build_object('status',filter_config->>'status') AND filter_config->>'status' IN ('all','enquiry','quoting','quote_sent','accepted','in_progress','on_site','completed','on_hold','cancelled')),'[]'::jsonb));
 END IF;
 IF NOT COALESCE(public.org_has_write_access(p_org),false) OR NOT procurement_private.job_report_writable(p_org) THEN RAISE EXCEPTION 'Writable company required' USING ERRCODE='42501'; END IF;
 v_id:=(p_data->>'id')::uuid;
 IF p_action='create' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text,0));
  SELECT * INTO r FROM public.saved_reports WHERE id=(p_data->>'report_id')::uuid AND organisation_id=p_org AND archived_at IS NULL;
  IF NOT FOUND OR r.report_type<>'jobs' OR r.visibility<>'internal_management' OR r.selected_sections IS DISTINCT FROM ARRAY['job_status'] OR r.filter_config IS DISTINCT FROM jsonb_build_object('status',r.filter_config->>'status') OR COALESCE(r.filter_config->>'status','') NOT IN ('all','enquiry','quoting','quote_sent','accepted','in_progress','on_site','completed','on_hold','cancelled') THEN RAISE EXCEPTION 'Unsupported report'; END IF;
  IF v_id IS NULL OR COALESCE(p_data->>'cadence','') NOT IN ('daily','weekly','monthly') OR COALESCE(p_data->>'local_time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN RAISE EXCEPTION 'Invalid schedule'; END IF;
  SELECT * INTO s FROM procurement_private.job_report_schedules WHERE id=v_id;
  IF FOUND THEN
   IF s.organisation_id<>p_org OR s.owner_id<>auth.uid() OR s.report_id<>r.id OR s.cadence<>p_data->>'cadence' OR s.local_time<>(p_data->>'local_time')::time THEN RAISE EXCEPTION 'Request conflict'; END IF;
   RETURN jsonb_build_object('id',s.id);
  END IF;
  IF (SELECT count(*) FROM procurement_private.job_report_schedules WHERE organisation_id=p_org)>=100 THEN RAISE EXCEPTION 'Schedule limit reached'; END IF;
  INSERT INTO procurement_private.job_report_schedules(id,organisation_id,report_id,owner_id,cadence,local_time,next_run)
   VALUES(v_id,p_org,r.id,auth.uid(),p_data->>'cadence',(p_data->>'local_time')::time,procurement_private.next_job_report_run(now(),p_data->>'cadence',(p_data->>'local_time')::time));
 ELSIF p_action IN ('pause','resume') THEN
  SELECT * INTO s FROM procurement_private.job_report_schedules WHERE id=v_id AND organisation_id=p_org AND owner_id=auth.uid() FOR UPDATE;
  IF NOT FOUND OR s.revision IS DISTINCT FROM (p_data->>'revision')::integer THEN RAISE EXCEPTION 'Schedule changed; refresh'; END IF;
  UPDATE procurement_private.job_report_schedules SET active=p_action='resume',stop_reason=NULL,revision=revision+1,next_run=procurement_private.next_job_report_run(now(),cadence,local_time) WHERE id=s.id;
  UPDATE procurement_private.job_report_deliveries SET status='cancelled' WHERE schedule_id=s.id AND status='pending';
 ELSE RAISE EXCEPTION 'Unknown action'; END IF;
 INSERT INTO public.audit_events(organisation_id,actor_id,action,entity_type,entity_id,change_summary,source) VALUES(p_org,auth.uid(),'job_report_schedule_'||p_action,'report_schedule',v_id,jsonb_build_object('personal',true),'scheduled_reports');
 RETURN jsonb_build_object('id',v_id);
END $$;
REVOKE ALL ON FUNCTION procurement_private.job_report_admin(uuid,text,jsonb) FROM PUBLIC,anon,service_role;
GRANT USAGE ON SCHEMA procurement_private TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION procurement_private.job_report_admin(uuid,text,jsonb) TO authenticated;
CREATE FUNCTION public.manage_job_report_schedule(p_org uuid,p_action text,p_data jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT procurement_private.job_report_admin(p_org,p_action,p_data) $$;
REVOKE ALL ON FUNCTION public.manage_job_report_schedule(uuid,text,jsonb) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.manage_job_report_schedule(uuid,text,jsonb) TO authenticated;

CREATE FUNCTION procurement_private.job_report_worker(p_hash text,p_action text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s procurement_private.job_report_schedules; d procurement_private.job_report_deliveries; r public.saved_reports;
 v_email text; v_jobs jsonb; v_lease uuid; v_status text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM procurement_private.job_report_worker_config WHERE name='worker' AND token_hash=p_hash) THEN RAISE EXCEPTION 'Unauthorised worker' USING ERRCODE='42501'; END IF;
 IF p_action='claim' THEN
  -- Bound work and serialize enqueueing; concurrent sends use separate leased rows.
  IF pg_try_advisory_xact_lock(hashtextextended('job-report-enqueue',0)) THEN
   FOR s IN SELECT * FROM procurement_private.job_report_schedules WHERE active AND next_run<=now() ORDER BY next_run LIMIT 5 FOR UPDATE SKIP LOCKED LOOP
    SELECT * INTO r FROM public.saved_reports WHERE id=s.report_id AND organisation_id=s.organisation_id AND archived_at IS NULL;
    SELECT u.email INTO v_email FROM auth.users u JOIN public.organisation_members m ON m.user_id=u.id AND m.organisation_id=s.organisation_id WHERE u.id=s.owner_id AND m.status='active' AND m.role IN ('owner','admin') AND u.email_confirmed_at IS NOT NULL AND (u.banned_until IS NULL OR u.banned_until<now());
    IF r.id IS NULL OR v_email IS NULL OR NOT procurement_private.job_report_writable(s.organisation_id) OR r.report_type<>'jobs' OR r.visibility<>'internal_management' OR r.selected_sections IS DISTINCT FROM ARRAY['job_status'] OR r.filter_config IS DISTINCT FROM jsonb_build_object('status',r.filter_config->>'status') OR COALESCE(r.filter_config->>'status','') NOT IN ('all','enquiry','quoting','quote_sent','accepted','in_progress','on_site','completed','on_hold','cancelled') THEN
     UPDATE procurement_private.job_report_schedules SET active=false,stop_reason='Report, recipient or company access is no longer eligible',revision=revision+1 WHERE id=s.id; CONTINUE;
    END IF;
    SELECT COALESCE(jsonb_agg(jsonb_build_array(reference,project_name,status,progress,target_completion_date) ORDER BY id),'[]'::jsonb) INTO v_jobs FROM (SELECT id,reference,project_name,status,progress,target_completion_date FROM public.jobs WHERE organisation_id=s.organisation_id AND archived_at IS NULL AND (r.filter_config->>'status'='all' OR status=r.filter_config->>'status') ORDER BY id LIMIT 5001) j;
    IF jsonb_array_length(v_jobs)>5000 OR octet_length(v_jobs::text)>3000000 THEN
     UPDATE procurement_private.job_report_schedules SET active=false,stop_reason='Report exceeds the 5,000-job or source-size limit',revision=revision+1 WHERE id=s.id; CONTINUE;
    END IF;
    INSERT INTO procurement_private.job_report_deliveries(schedule_id,due_at,revision,payload) VALUES(s.id,s.next_run,s.revision,jsonb_build_object('email',v_email,'title',r.name,'generated_at',now(),'jobs',v_jobs)) ON CONFLICT(schedule_id,due_at) DO NOTHING;
    UPDATE procurement_private.job_report_schedules SET next_run=procurement_private.next_job_report_run(now(),cadence,local_time) WHERE id=s.id;
   END LOOP;
  END IF;
  -- Cancel pending messages if the owner loses access, email changes or schedule is paused.
  UPDATE procurement_private.job_report_deliveries q SET status=CASE WHEN first_attempt<now()-interval '6 hours' OR attempts>=8 THEN 'uncertain' ELSE 'cancelled' END
   FROM procurement_private.job_report_schedules ls WHERE q.schedule_id=ls.id AND q.status='pending' AND
    (NOT ls.active OR q.revision<>ls.revision OR NOT procurement_private.job_report_writable(ls.organisation_id) OR q.first_attempt<now()-interval '6 hours' OR q.attempts>=8 OR NOT EXISTS(SELECT 1 FROM public.saved_reports lr WHERE lr.id=ls.report_id AND lr.organisation_id=ls.organisation_id AND lr.archived_at IS NULL AND lr.visibility='internal_management') OR NOT EXISTS(SELECT 1 FROM auth.users u JOIN public.organisation_members m ON u.id=m.user_id WHERE u.id=ls.owner_id AND m.organisation_id=ls.organisation_id AND m.status='active' AND m.role IN ('owner','admin') AND u.email=q.payload->>'email' AND u.email_confirmed_at IS NOT NULL AND (u.banned_until IS NULL OR u.banned_until<now())));
  SELECT * INTO d FROM procurement_private.job_report_deliveries WHERE status='pending' AND available_at<=now() ORDER BY due_at,id LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_lease:=gen_random_uuid();
  UPDATE procurement_private.job_report_deliveries SET lease=v_lease,attempts=attempts+1,first_attempt=COALESCE(first_attempt,now()),available_at=now()+interval '2 minutes' WHERE id=d.id;
  RETURN jsonb_build_object('id',d.id,'lease',v_lease,'payload',d.payload);
 ELSIF p_action='finish' THEN
  v_status:=p_data->>'status';
  IF v_status NOT IN ('accepted_by_provider','failed','pending') OR v_status IS NULL OR (v_status='accepted_by_provider' AND COALESCE(p_data->>'provider_id','')='') THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
  UPDATE procurement_private.job_report_deliveries SET status=v_status,provider_id=p_data->>'provider_id',lease=NULL,available_at=now()+interval '5 minutes' WHERE id=(p_data->>'id')::uuid AND lease=(p_data->>'lease')::uuid AND status='pending' AND available_at>now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Lease unavailable'; END IF;
  RETURN jsonb_build_object('saved',true);
 ELSE RAISE EXCEPTION 'Unknown action'; END IF;
END $$;
REVOKE ALL ON FUNCTION procurement_private.job_report_worker(text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION procurement_private.job_report_worker(text,text,jsonb) TO service_role;
CREATE FUNCTION public.process_job_report_delivery(p_hash text,p_action text,p_data jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT procurement_private.job_report_worker(p_hash,p_action,p_data) $$;
REVOKE ALL ON FUNCTION public.process_job_report_delivery(text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.process_job_report_delivery(text,text,jsonb) TO service_role;
