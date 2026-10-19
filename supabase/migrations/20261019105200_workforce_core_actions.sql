-- Keep workforce writes behind a company-scoped, idempotent server operation.
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON public.workforce_people,public.workforce_assignments FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.workforce_people,public.workforce_assignments TO authenticated;
ALTER TABLE public.workforce_people ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
CREATE TABLE public.workforce_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organisation_id uuid NOT NULL REFERENCES public.organisations(id),person_id uuid NOT NULL REFERENCES public.workforce_people(id),actor_id uuid NOT NULL REFERENCES auth.users(id),action text NOT NULL,reason text NOT NULL,before_record jsonb,after_record jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workforce_history_person ON public.workforce_history(organisation_id,person_id,created_at DESC);
ALTER TABLE public.workforce_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY workforce_history_read ON public.workforce_history FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.organisation_members m WHERE m.organisation_id=workforce_history.organisation_id AND m.user_id=(SELECT auth.uid()) AND m.status='active' AND m.role IN ('owner','admin','project_manager','site_supervisor')));
REVOKE ALL ON public.workforce_history FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.workforce_history TO authenticated;
CREATE FUNCTION procurement_private.workforce_operation(p_org uuid,p_request uuid,p_action text,p_data jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_actor uuid:=auth.uid();v_role text;v_previous procurement_private.requests;v_person public.workforce_people;v_id uuid;v_job uuid;v_old_job uuid;v_reason text:=NULLIF(btrim(p_data->>'reason'),'');v_after jsonb;v_before jsonb;
BEGIN
 IF v_actor IS NULL OR p_org IS NULL OR p_request IS NULL OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Sign in and provide a valid workforce action';END IF;
 SELECT role INTO v_role FROM public.organisation_members WHERE organisation_id=p_org AND user_id=v_actor AND status='active';
 IF v_role IS NULL OR v_role NOT IN ('owner','admin','project_manager','site_supervisor','finance') THEN RAISE EXCEPTION 'Workforce access required' USING ERRCODE='42501';END IF;
 IF NOT public.org_has_write_access(p_org) THEN RAISE EXCEPTION 'Upgrade to make changes' USING ERRCODE='42501';END IF;
 IF p_action NOT IN ('create','update','archive','assign','restrict','unrestrict') THEN RAISE EXCEPTION 'Unknown workforce action';END IF;
 IF p_action='create' AND v_role NOT IN ('owner','admin','project_manager') THEN RAISE EXCEPTION 'Owner, admin or project manager permission required' USING ERRCODE='42501';END IF;
 IF p_action IN ('archive','restrict','unrestrict') AND v_role NOT IN ('owner','admin','project_manager') THEN RAISE EXCEPTION 'Owner, admin or project manager permission required' USING ERRCODE='42501';END IF;
 IF p_action='update' AND v_role NOT IN ('owner','admin','project_manager','site_supervisor') THEN RAISE EXCEPTION 'Workforce update permission required' USING ERRCODE='42501';END IF;
 IF v_reason IS NULL OR length(v_reason)>2000 THEN RAISE EXCEPTION 'Add a reason for this workforce change';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||p_request::text,0));
 SELECT * INTO v_previous FROM procurement_private.requests WHERE organisation_id=p_org AND request_id=p_request;
 IF FOUND THEN
  IF v_previous.actor_id<>v_actor OR v_previous.action<>'workforce_'||p_action OR v_previous.payload<>p_data THEN RAISE EXCEPTION 'Submission already used for different workforce data';END IF;
  RETURN v_previous.result_id;
 END IF;
 IF p_action='create' THEN
  IF length(btrim(COALESCE(p_data->>'first_name',''))) NOT BETWEEN 1 AND 100 OR length(btrim(COALESCE(p_data->>'last_name',''))) NOT BETWEEN 1 AND 100 OR length(btrim(COALESCE(p_data->>'primary_trade',''))) NOT BETWEEN 1 AND 150 OR COALESCE(p_data->>'relationship','') NOT IN ('employee','subcontractor_individual','subcontractor_company','agency','consultant') OR (NULLIF(p_data->>'email','') IS NOT NULL AND length(p_data->>'email')>254) OR length(COALESCE(p_data->>'phone',''))>60 THEN RAISE EXCEPTION 'Enter a name, workforce relationship and primary trade';END IF;
  v_job:=NULLIF(p_data->>'current_job_id','')::uuid;
  IF v_job IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.jobs WHERE id=v_job AND organisation_id=p_org AND archived_at IS NULL) THEN RAISE EXCEPTION 'Choose an active job in this company';END IF;
  INSERT INTO public.workforce_people(organisation_id,first_name,last_name,initials,relationship,primary_trade,secondary_trades,passport_status,availability,current_job_id,email,phone,trading_name,business_type)
  VALUES(p_org,btrim(p_data->>'first_name'),btrim(p_data->>'last_name'),upper(left(btrim(p_data->>'first_name'),1)||left(btrim(p_data->>'last_name'),1)),p_data->>'relationship',btrim(p_data->>'primary_trade'),ARRAY[]::text[],COALESCE(NULLIF(p_data->>'passport_status',''),'not_started'),CASE WHEN v_job IS NULL THEN 'available' ELSE 'assigned' END,v_job,NULLIF(btrim(p_data->>'email'),''),NULLIF(btrim(p_data->>'phone'),''),NULLIF(btrim(p_data->>'trading_name'),''),CASE WHEN p_data->>'business_type' IN ('sole_trader','limited_company','partnership','llp','other') THEN p_data->>'business_type' END) RETURNING * INTO v_person;
  IF v_job IS NOT NULL THEN INSERT INTO public.workforce_assignments(organisation_id,person_id,job_id,role,start_date) VALUES(p_org,v_person.id,v_job,v_person.primary_trade,current_date);END IF;
 ELSIF p_action='update' THEN
  SELECT * INTO v_person FROM public.workforce_people WHERE id=(p_data->>'person_id')::uuid AND organisation_id=p_org FOR UPDATE;
  IF NOT FOUND OR v_person.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Active workforce person not found';END IF;
  IF (p_data->>'revision')::integer IS DISTINCT FROM v_person.revision THEN RAISE EXCEPTION 'Workforce record changed. Refresh before saving';END IF;
  IF length(btrim(COALESCE(p_data->>'first_name',''))) NOT BETWEEN 1 AND 100 OR length(btrim(COALESCE(p_data->>'last_name',''))) NOT BETWEEN 1 AND 100 OR length(btrim(COALESCE(p_data->>'primary_trade',''))) NOT BETWEEN 1 AND 150 OR COALESCE(p_data->>'relationship','') NOT IN ('employee','subcontractor_individual','subcontractor_company','agency','consultant') OR (NULLIF(p_data->>'email','') IS NOT NULL AND length(p_data->>'email')>254) OR length(COALESCE(p_data->>'phone',''))>60 THEN RAISE EXCEPTION 'Enter a name, workforce relationship and primary trade';END IF;
  v_before:=to_jsonb(v_person);v_job:=NULLIF(p_data->>'current_job_id','')::uuid;v_old_job:=v_person.current_job_id;
  IF v_job IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.jobs WHERE id=v_job AND organisation_id=p_org AND archived_at IS NULL) THEN RAISE EXCEPTION 'Choose an active job in this company';END IF;
  IF v_job IS DISTINCT FROM v_old_job THEN
   IF v_old_job IS NOT NULL THEN UPDATE public.workforce_assignments SET expected_finish_date=COALESCE(NULLIF(p_data->>'effective_date','')::date,current_date),updated_at=clock_timestamp() WHERE id=(SELECT a.id FROM public.workforce_assignments a WHERE a.organisation_id=p_org AND a.person_id=v_person.id AND a.job_id=v_old_job AND a.expected_finish_date IS NULL ORDER BY a.created_at DESC LIMIT 1);END IF;
   IF v_job IS NOT NULL THEN INSERT INTO public.workforce_assignments(organisation_id,person_id,job_id,role,start_date) VALUES(p_org,v_person.id,v_job,btrim(p_data->>'primary_trade'),COALESCE(NULLIF(p_data->>'effective_date','')::date,current_date));END IF;
  END IF;
  UPDATE public.workforce_people SET first_name=btrim(p_data->>'first_name'),last_name=btrim(p_data->>'last_name'),initials=upper(left(btrim(p_data->>'first_name'),1)||left(btrim(p_data->>'last_name'),1)),relationship=p_data->>'relationship',primary_trade=btrim(p_data->>'primary_trade'),email=NULLIF(btrim(p_data->>'email'),''),phone=NULLIF(btrim(p_data->>'phone'),''),trading_name=NULLIF(btrim(p_data->>'trading_name'),''),current_job_id=v_job,availability=CASE WHEN v_job IS NULL AND v_person.availability='assigned' THEN 'available' WHEN v_job IS NULL THEN v_person.availability ELSE 'assigned' END,revision=revision+1,updated_at=clock_timestamp() WHERE id=v_person.id RETURNING * INTO v_person;
 ELSIF p_action='assign' THEN
  SELECT * INTO v_person FROM public.workforce_people WHERE id=(p_data->>'person_id')::uuid AND organisation_id=p_org FOR UPDATE;
  IF NOT FOUND OR v_person.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Active workforce person not found';END IF;
  IF (p_data->>'revision')::integer IS DISTINCT FROM v_person.revision THEN RAISE EXCEPTION 'Workforce record changed. Refresh before saving';END IF;
  v_before:=to_jsonb(v_person);v_job:=NULLIF(p_data->>'job_id','')::uuid;v_old_job:=v_person.current_job_id;
  IF v_job IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.jobs WHERE id=v_job AND organisation_id=p_org AND archived_at IS NULL) THEN RAISE EXCEPTION 'Choose an active job in this company';END IF;
  IF v_job IS DISTINCT FROM v_old_job THEN
   IF v_old_job IS NOT NULL THEN UPDATE public.workforce_assignments SET expected_finish_date=COALESCE(NULLIF(p_data->>'effective_date','')::date,current_date),updated_at=clock_timestamp() WHERE id=(SELECT a.id FROM public.workforce_assignments a WHERE a.organisation_id=p_org AND a.person_id=v_person.id AND a.job_id=v_old_job AND a.expected_finish_date IS NULL ORDER BY a.created_at DESC LIMIT 1);END IF;
   IF v_job IS NOT NULL THEN INSERT INTO public.workforce_assignments(organisation_id,person_id,job_id,role,start_date) VALUES(p_org,v_person.id,v_job,v_person.primary_trade,COALESCE(NULLIF(p_data->>'effective_date','')::date,current_date));END IF;
   UPDATE public.workforce_people SET current_job_id=v_job,availability=CASE WHEN v_job IS NULL AND v_person.availability='assigned' THEN 'available' WHEN v_job IS NULL THEN v_person.availability ELSE 'assigned' END,revision=revision+1,updated_at=clock_timestamp() WHERE id=v_person.id RETURNING * INTO v_person;
  END IF;
 ELSIF p_action='archive' THEN
  SELECT * INTO v_person FROM public.workforce_people WHERE id=(p_data->>'person_id')::uuid AND organisation_id=p_org FOR UPDATE;
  IF NOT FOUND OR v_person.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Active workforce person not found';END IF;
  IF (p_data->>'revision')::integer IS DISTINCT FROM v_person.revision THEN RAISE EXCEPTION 'Workforce record changed. Refresh before saving';END IF;
  v_before:=to_jsonb(v_person);
  UPDATE public.workforce_people SET archived_at=clock_timestamp(),passport_status='archived',availability='unavailable',current_job_id=NULL,revision=revision+1,updated_at=clock_timestamp() WHERE id=v_person.id RETURNING * INTO v_person;
  UPDATE public.workforce_assignments SET expected_finish_date=current_date,updated_at=clock_timestamp() WHERE organisation_id=p_org AND person_id=v_person.id AND expected_finish_date IS NULL;
 ELSIF p_action IN ('restrict','unrestrict') THEN
  SELECT * INTO v_person FROM public.workforce_people WHERE id=(p_data->>'person_id')::uuid AND organisation_id=p_org FOR UPDATE;
  IF NOT FOUND OR v_person.archived_at IS NOT NULL THEN RAISE EXCEPTION 'Active workforce person not found';END IF;
  IF (p_data->>'revision')::integer IS DISTINCT FROM v_person.revision THEN RAISE EXCEPTION 'Workforce record changed. Refresh before saving';END IF;
  v_before:=to_jsonb(v_person);
  UPDATE public.workforce_people SET passport_status=CASE WHEN p_action='restrict' THEN 'restricted' ELSE 'review_needed' END,revision=revision+1,updated_at=clock_timestamp() WHERE id=v_person.id RETURNING * INTO v_person;
 END IF;
 v_id:=v_person.id;v_after:=jsonb_build_object('id',v_person.id,'first_name',v_person.first_name,'last_name',v_person.last_name,'relationship',v_person.relationship,'primary_trade',v_person.primary_trade,'passport_status',v_person.passport_status,'availability',v_person.availability,'current_job_id',v_person.current_job_id,'revision',v_person.revision,'archived_at',v_person.archived_at);
 INSERT INTO public.workforce_history(organisation_id,person_id,actor_id,action,reason,before_record,after_record) VALUES(p_org,v_id,v_actor,p_action,v_reason,v_before,v_after);
 INSERT INTO public.audit_events(organisation_id,actor_id,action,entity_type,entity_id,change_summary,note,source) VALUES(p_org,v_actor,'workforce_'||p_action,'workforce_person',v_id,jsonb_build_object('record',v_after),NULL,'workforce');
 INSERT INTO procurement_private.requests(organisation_id,request_id,actor_id,action,payload,result_id) VALUES(p_org,p_request,v_actor,'workforce_'||p_action,p_data,v_id);
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION procurement_private.workforce_operation(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION procurement_private.workforce_operation(uuid,uuid,text,jsonb) TO authenticated;
CREATE FUNCTION public.workforce_write(p_org uuid,p_request uuid,p_action text,p_data jsonb) RETURNS uuid
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT procurement_private.workforce_operation(p_org,p_request,p_action,p_data) $$;
REVOKE ALL ON FUNCTION public.workforce_write(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.workforce_write(uuid,uuid,text,jsonb) TO authenticated;
