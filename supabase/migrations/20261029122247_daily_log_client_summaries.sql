-- Client summaries are separate, explicitly reviewed text. Raw logs are never portal payloads.
CREATE TABLE procurement_private.daily_log_client_summaries (
 log_id uuid PRIMARY KEY REFERENCES public.daily_logs(id),
 organisation_id uuid NOT NULL REFERENCES public.organisations(id),
 job_id uuid NOT NULL REFERENCES public.jobs(id),
 client_id uuid REFERENCES public.clients(id),
 summary text NOT NULL CHECK(length(btrim(summary)) BETWEEN 1 AND 10000),
 state text NOT NULL CHECK(state IN ('draft','reviewed','published','withdrawn')),
 revision integer NOT NULL CHECK(revision>0),
 source_snapshot jsonb,
 reviewed_by uuid REFERENCES auth.users(id), reviewed_at timestamptz,
 published_by uuid REFERENCES auth.users(id), published_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(state NOT IN ('reviewed','published') OR (source_snapshot IS NOT NULL AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND client_id IS NOT NULL)),
 CHECK(state<>'published' OR (published_by IS NOT NULL AND published_at IS NOT NULL))
);
CREATE INDEX daily_log_client_summaries_job ON procurement_private.daily_log_client_summaries(organisation_id,job_id);
CREATE TABLE procurement_private.daily_log_summary_requests (
 organisation_id uuid NOT NULL REFERENCES public.organisations(id), request_id uuid NOT NULL,
 actor_id uuid NOT NULL REFERENCES auth.users(id), action text NOT NULL, payload jsonb NOT NULL,
 result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(organisation_id,request_id)
);
ALTER TABLE procurement_private.daily_log_client_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_private.daily_log_summary_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON procurement_private.daily_log_client_summaries,procurement_private.daily_log_summary_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT ON procurement_private.daily_log_client_summaries TO service_role;

CREATE FUNCTION procurement_private.daily_log_summary(p_org uuid,p_job uuid,p_log uuid,p_request uuid,p_action text,p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $summary$
DECLARE
 v_actor uuid:=auth.uid(); v_role text; v_job public.jobs; v_log public.daily_logs;
 v_summary procurement_private.daily_log_client_summaries;
 v_request procurement_private.daily_log_summary_requests;
 v_payload jsonb; v_result jsonb; v_expected integer; v_text text; v_revision integer;
 v_client_name text; v_writable boolean; v_can_review boolean; v_stale boolean;
BEGIN
 SELECT role INTO v_role FROM public.organisation_members WHERE organisation_id=p_org AND user_id=v_actor AND status='active';
 IF v_actor IS NULL OR v_role IS NULL OR v_role NOT IN ('owner','admin','project_manager','site_supervisor') THEN
  RAISE EXCEPTION 'Daily log staff permission required' USING ERRCODE='42501';
 END IF;
 IF p_action IS NULL OR p_action NOT IN ('read','save','review','publish','withdraw') OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid summary action'; END IF;
 SELECT * INTO v_job FROM public.jobs WHERE id=p_job AND organisation_id=p_org AND archived_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Active company job required' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_log FROM public.daily_logs WHERE id=p_log AND job_id=p_job AND organisation_id=p_org AND archived_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Daily log unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_summary FROM procurement_private.daily_log_client_summaries WHERE log_id=p_log FOR UPDATE;
 v_revision:=COALESCE(v_summary.revision,0);
 v_writable:=COALESCE(public.org_has_write_access(p_org),false) AND v_log.status NOT IN ('locked','archived');
 v_can_review:=v_writable AND v_role IN ('owner','admin','project_manager');
 SELECT COALESCE(NULLIF(company_name,''),NULLIF(btrim(COALESCE(first_name,'')||' '||COALESCE(last_name,'')),''),'Client')
 INTO v_client_name FROM public.clients WHERE id=v_job.client_id AND organisation_id=p_org AND archived_at IS NULL;
 v_stale:=v_summary.state IN ('reviewed','published') AND (v_summary.source_snapshot IS DISTINCT FROM to_jsonb(v_log) OR v_summary.client_id IS DISTINCT FROM v_job.client_id OR v_client_name IS NULL);
 IF p_action='read' THEN
  RETURN jsonb_build_object('source',to_jsonb(v_log),'summary',CASE WHEN v_summary.log_id IS NULL THEN NULL ELSE to_jsonb(v_summary)-'source_snapshot' END,
   'stale',COALESCE(v_stale,false),'can_edit',v_writable,'can_review',v_can_review,'client_name',v_client_name,'client_id',v_job.client_id);
 END IF;
 IF NOT v_writable OR (p_action IN ('review','publish','withdraw') AND NOT v_can_review) THEN RAISE EXCEPTION 'Writable workspace and authorised reviewer required' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL THEN RAISE EXCEPTION 'A stable request id is required'; END IF;
 v_payload:=jsonb_build_object('job_id',p_job,'log_id',p_log,'data',p_data);
 PERFORM pg_advisory_xact_lock(hashtextextended('daily-summary:'||p_org::text||p_request::text,0));
 SELECT * INTO v_request FROM procurement_private.daily_log_summary_requests WHERE organisation_id=p_org AND request_id=p_request;
 IF FOUND THEN
  IF v_request.actor_id<>v_actor OR v_request.action<>p_action OR v_request.payload<>v_payload THEN RAISE EXCEPTION 'Request id was already used for different data'; END IF;
  RETURN v_request.result;
 END IF;
 v_expected:=(p_data->>'expected_revision')::integer;
 IF v_expected IS NULL OR v_expected<>v_revision OR v_log.updated_at IS DISTINCT FROM (p_data->>'source_updated_at')::timestamptz THEN RAISE EXCEPTION 'Log or summary changed. Reload before continuing'; END IF;
 IF p_action IN ('review','publish') AND p_data->>'summary' IS DISTINCT FROM v_summary.summary THEN RAISE EXCEPTION 'Review the exact saved client summary before continuing'; END IF;
 IF p_action='save' THEN
  IF jsonb_typeof(p_data->'summary') IS DISTINCT FROM 'string' OR length(btrim(COALESCE(p_data->>'summary',''))) NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Enter a client summary of 1 to 10000 characters'; END IF;
  v_text:=btrim(p_data->>'summary');
  -- Editing a published summary explicitly withdraws its old version immediately.
  IF v_log.client_summary_published THEN
   UPDATE public.daily_logs SET client_summary_published=false,status=CASE WHEN status='client_summary_published' THEN 'complete' ELSE status END,
    version=version+1,updated_at=clock_timestamp() WHERE id=p_log RETURNING * INTO v_log;
  END IF;
  INSERT INTO procurement_private.daily_log_client_summaries(log_id,organisation_id,job_id,client_id,summary,state,revision)
  VALUES(p_log,p_org,p_job,v_job.client_id,v_text,'draft',v_revision+1)
  ON CONFLICT(log_id) DO UPDATE SET client_id=EXCLUDED.client_id,summary=EXCLUDED.summary,state='draft',revision=EXCLUDED.revision,
   source_snapshot=NULL,reviewed_by=NULL,reviewed_at=NULL,published_by=NULL,published_at=NULL,updated_at=clock_timestamp();
 ELSIF p_action='review' THEN
  IF p_data->'review_confirmed' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Confirm review of the source log and exact client summary'; END IF;
  IF v_summary.log_id IS NULL OR v_summary.state<>'draft' OR v_client_name IS NULL THEN RAISE EXCEPTION 'A saved draft summary and an active company client are required'; END IF;
  UPDATE public.daily_logs SET status='complete',client_summary_published=false,version=version+1,updated_at=clock_timestamp() WHERE id=p_log RETURNING * INTO v_log;
  UPDATE procurement_private.daily_log_client_summaries SET state='reviewed',client_id=v_job.client_id,source_snapshot=to_jsonb(v_log),
   reviewed_by=v_actor,reviewed_at=clock_timestamp(),revision=v_revision+1,updated_at=clock_timestamp() WHERE log_id=p_log;
 ELSIF p_action='publish' THEN
  IF v_summary.log_id IS NULL OR v_summary.state<>'reviewed' OR v_stale OR v_client_name IS NULL THEN RAISE EXCEPTION 'Review the current source and summary before publishing'; END IF;
  UPDATE public.daily_logs SET status='client_summary_published',client_summary_published=true,version=version+1,updated_at=clock_timestamp() WHERE id=p_log RETURNING * INTO v_log;
  UPDATE procurement_private.daily_log_client_summaries SET state='published',source_snapshot=to_jsonb(v_log),published_by=v_actor,
   published_at=clock_timestamp(),revision=v_revision+1,updated_at=clock_timestamp() WHERE log_id=p_log;
 ELSE
  IF v_summary.log_id IS NULL OR v_summary.state<>'published' THEN RAISE EXCEPTION 'Only a published summary can be withdrawn'; END IF;
  UPDATE public.daily_logs SET client_summary_published=false,status=CASE WHEN status='client_summary_published' THEN 'complete' ELSE status END,
   version=version+1,updated_at=clock_timestamp() WHERE id=p_log;
  UPDATE procurement_private.daily_log_client_summaries SET state='withdrawn',source_snapshot=NULL,revision=v_revision+1,updated_at=clock_timestamp() WHERE log_id=p_log;
 END IF;
 INSERT INTO public.audit_events(organisation_id,actor_id,action,entity_type,entity_id,change_summary,source)
 VALUES(p_org,v_actor,'daily_log_summary_'||p_action,'daily_log',p_log,jsonb_build_object('summary_revision',v_revision+1,'client_id',v_job.client_id),'daily_log_review');
 v_result:=jsonb_build_object('request_id',p_request,'action',p_action,'log_id',p_log,'revision',v_revision+1);
 INSERT INTO procurement_private.daily_log_summary_requests(organisation_id,request_id,actor_id,action,payload,result) VALUES(p_org,p_request,v_actor,p_action,v_payload,v_result);
 RETURN v_result;
END;
$summary$;
REVOKE ALL ON FUNCTION procurement_private.daily_log_summary(uuid,uuid,uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA procurement_private TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION procurement_private.daily_log_summary(uuid,uuid,uuid,uuid,text,jsonb) TO authenticated;

CREATE FUNCTION public.daily_log_summary(p_org uuid,p_job uuid,p_log uuid,p_request uuid,p_action text,p_data jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $wrapper$
 SELECT procurement_private.daily_log_summary(p_org,p_job,p_log,p_request,p_action,p_data);
$wrapper$;
REVOKE ALL ON FUNCTION public.daily_log_summary(uuid,uuid,uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.daily_log_summary(uuid,uuid,uuid,uuid,text,jsonb) TO authenticated;

-- Service-only endpoint used after the portal gateway has authenticated the same token hash.
CREATE FUNCTION public.client_portal_daily_summaries(p_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $portal$
DECLARE v_grant public.portal_access; v_items jsonb; v_total bigint;
BEGIN
 IF p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid portal link' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_grant FROM public.portal_access WHERE token_hash=p_hash AND status='active' AND access_type='client';
 IF NOT FOUND OR v_grant.revoked_at IS NOT NULL OR v_grant.expires_at IS NULL OR v_grant.expires_at<=clock_timestamp()
  OR NOT EXISTS(SELECT 1 FROM public.clients WHERE id=v_grant.client_id AND organisation_id=v_grant.organisation_id AND archived_at IS NULL) THEN
  RAISE EXCEPTION 'Invalid portal link' USING ERRCODE='42501';
 END IF;
 IF NOT v_grant.permissions&&ARRAY['progress','perm-progress'] THEN RETURN jsonb_build_object('items','[]'::jsonb,'total',0); END IF;
 WITH visible AS (
  SELECT s.log_id,s.job_id,l.log_date,s.summary,s.revision,s.published_at
  FROM procurement_private.daily_log_client_summaries s
  JOIN public.daily_logs l ON l.id=s.log_id AND l.organisation_id=s.organisation_id AND l.job_id=s.job_id
  JOIN public.jobs j ON j.id=s.job_id AND j.organisation_id=s.organisation_id
  WHERE s.organisation_id=v_grant.organisation_id AND s.client_id=v_grant.client_id AND j.client_id=s.client_id
   AND j.archived_at IS NULL AND l.archived_at IS NULL AND s.state='published' AND l.client_summary_published
   AND s.source_snapshot=to_jsonb(l)
   AND (COALESCE(cardinality(v_grant.job_scope),0)=0 OR s.job_id=ANY(v_grant.job_scope))
 ), latest AS (SELECT * FROM visible ORDER BY log_date DESC,log_id LIMIT 100)
 SELECT COALESCE((SELECT jsonb_agg(jsonb_build_object('id',log_id,'job_id',job_id,'log_date',log_date,'summary',summary,'revision',revision,'published_at',published_at) ORDER BY log_date DESC,log_id) FROM latest),'[]'::jsonb),
  (SELECT count(*) FROM visible) INTO v_items,v_total;
 RETURN jsonb_build_object('items',v_items,'total',v_total);
END;
$portal$;
REVOKE ALL ON FUNCTION public.client_portal_daily_summaries(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.client_portal_daily_summaries(text) TO service_role;
