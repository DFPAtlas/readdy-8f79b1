CREATE TABLE procurement_private.portal_requests(access_id uuid NOT NULL REFERENCES public.portal_access(id),request_id uuid NOT NULL,action text NOT NULL,payload jsonb NOT NULL,result_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(access_id,request_id));
ALTER TABLE procurement_private.portal_requests ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA procurement_private TO service_role;
GRANT SELECT,INSERT ON procurement_private.portal_requests TO service_role;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON public.variation_responses FROM PUBLIC,anon,authenticated;
REVOKE ALL ON procurement_private.portal_requests FROM PUBLIC,anon,authenticated;
ALTER TABLE public.portal_access ADD COLUMN revision integer NOT NULL DEFAULT 1;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON public.portal_access FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.client_portal_write(p_hash text,p_request uuid,p_action text,p_data jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE a public.portal_access;overview jsonb;allowed_jobs uuid[];existing procurement_private.portal_requests;v public.variations;v_id uuid;conv uuid;job uuid;name text:=NULLIF(btrim(p_data->>'name'),'');message text:=NULLIF(btrim(p_data->>'message'),'');old_status text;
BEGIN
 overview:=public.client_portal_overview(p_hash);
 SELECT * INTO STRICT a FROM public.portal_access WHERE token_hash=p_hash AND status='active' AND access_type='client' FOR SHARE;
 IF a.expires_at<=clock_timestamp() OR NOT public.org_has_write_access(a.organisation_id) THEN RAISE EXCEPTION 'Responses are temporarily unavailable' USING ERRCODE='42501';END IF;
 SELECT array_agg((x->>'id')::uuid) INTO allowed_jobs FROM jsonb_array_elements(overview->'projects') x;
 IF p_request IS NULL OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' OR p_action IS NULL OR p_action NOT IN ('approved','declined','question','message') THEN RAISE EXCEPTION 'Invalid response';END IF;
 IF name IS NULL OR length(name)>200 OR length(COALESCE(message,''))>4000 OR (p_action<>'approved' AND message IS NULL) THEN RAISE EXCEPTION 'Enter your name and a valid response';END IF;
 IF p_action='message' AND NOT a.permissions&&ARRAY['messages','perm-messages'] THEN RAISE EXCEPTION 'Messaging permission required' USING ERRCODE='42501';END IF;
 IF p_action<>'message' AND (NOT a.permissions&&ARRAY['variations','perm-variations'] OR NOT a.permissions&&ARRAY['decisions','perm-decisions']) THEN RAISE EXCEPTION 'Variation decision permission required' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(a.id::text||p_request::text,0));
 SELECT * INTO existing FROM procurement_private.portal_requests WHERE access_id=a.id AND request_id=p_request;
 IF FOUND THEN IF existing.action<>p_action OR existing.payload<>p_data THEN RAISE EXCEPTION 'Submission was already used for different data';END IF;RETURN existing.result_id;END IF;
 IF p_action='message' THEN
  job:=(p_data->>'job_id')::uuid;IF job IS NULL OR NOT job=ANY(COALESCE(allowed_jobs,'{}')) THEN RAISE EXCEPTION 'Project unavailable' USING ERRCODE='42501';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('portal-conversation:'||a.client_id::text||job::text,0));
  SELECT id INTO conv FROM public.conversations WHERE organisation_id=a.organisation_id AND client_id=a.client_id AND job_id=job AND conversation_type='client' AND archived_at IS NULL ORDER BY created_at LIMIT 1;
  IF conv IS NULL THEN
   INSERT INTO public.conversations(organisation_id,job_id,client_id,conversation_type,title) VALUES(a.organisation_id,job,a.client_id,'client','Client project messages') RETURNING id INTO conv;
   INSERT INTO public.conversation_participants(conversation_id,user_id,participant_type) SELECT conv,m.user_id,'user' FROM public.organisation_members m WHERE m.organisation_id=a.organisation_id AND m.status='active' AND m.role IN ('owner','admin','project_manager') ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.messages(organisation_id,conversation_id,sender_id,sender_type,body,client_visible,idempotency_key) VALUES(a.organisation_id,conv,a.id::text,'client',name||E'\n'||message,true,'portal:'||a.id||':'||p_request) RETURNING id INTO v_id;
  UPDATE public.conversations SET last_message_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=conv;
 ELSE
  SELECT * INTO v FROM public.variations WHERE id=(p_data->>'variation_id')::uuid AND organisation_id=a.organisation_id AND job_id=ANY(allowed_jobs) AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND OR v.status NOT IN ('sent','viewed','question_received') THEN RAISE EXCEPTION 'Variation is no longer awaiting a response';END IF;
  IF (p_data->>'version')::integer IS DISTINCT FROM v.current_version OR (p_data->>'updated_at')::timestamptz IS DISTINCT FROM v.updated_at OR (p_data->>'total_pence')::bigint IS DISTINCT FROM v.total_pence THEN RAISE EXCEPTION 'Variation changed. Reload and review the latest version';END IF;
  IF p_action='approved' AND (p_data->'price_confirmed' IS DISTINCT FROM 'true'::jsonb OR p_data->'authority_confirmed' IS DISTINCT FROM 'true'::jsonb) THEN RAISE EXCEPTION 'Confirm the price and authority before approving';END IF;
  old_status:=v.status;
  INSERT INTO public.variation_responses(variation_id,organisation_id,variation_version,response_type,respondent_name,message,portal_session_ref,confirmation_text) VALUES(v.id,a.organisation_id,v.current_version,p_action,name,message,a.id::text,CASE WHEN p_action='approved' THEN 'Client confirmed authority and accepted version '||v.current_version||' with total '||v.total_pence||' minor currency units, including VAT' ELSE NULL END) RETURNING id INTO v_id;
  UPDATE public.variations SET status=CASE WHEN p_action='question' THEN 'question_received' ELSE p_action END,updated_at=clock_timestamp() WHERE id=v.id;
  INSERT INTO public.audit_events(organisation_id,action,entity_type,entity_id,old_status,new_status,change_summary,source,reference) VALUES(a.organisation_id,'client_variation_'||p_action,'variation',v.id,old_status,CASE WHEN p_action='question' THEN 'question_received' ELSE p_action END,jsonb_build_object('response_id',v_id,'grant_id',a.id,'respondent_name',name,'version',v.current_version,'net_pence',v.client_price_pence,'vat_pence',v.vat_pence,'total_pence',v.total_pence,'programme_days',v.programme_days,'revised_completion',v.revised_completion),'client_portal',a.id::text);
  INSERT INTO public.timeline_events(organisation_id,job_id,event_type,title,visibility,related_record_type,related_record_id,event_date) VALUES(a.organisation_id,v.job_id,'decision','Client response: '||p_action||' — '||v.reference,'client_visible','variation',v.id,clock_timestamp());
 END IF;
 INSERT INTO procurement_private.portal_requests(access_id,request_id,action,payload,result_id) VALUES(a.id,p_request,p_action,p_data,v_id);RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.client_portal_write(text,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.client_portal_write(text,uuid,text,jsonb) TO service_role;
CREATE FUNCTION public.client_portal_asset(p_hash text,p_kind text,p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE a public.portal_access;overview jsonb;allowed_jobs uuid[];asset record;
BEGIN
 overview:=public.client_portal_overview(p_hash);SELECT * INTO STRICT a FROM public.portal_access WHERE token_hash=p_hash AND status='active' AND access_type='client';SELECT array_agg((x->>'id')::uuid) INTO allowed_jobs FROM jsonb_array_elements(overview->'projects') x;
 IF p_kind='document' AND a.permissions&&ARRAY['documents','perm-docs'] THEN
  SELECT d.bucket,d.object_path,d.original_filename,d.mime_type,d.job_id INTO asset FROM public.project_documents d WHERE d.id=p_id AND d.organisation_id=a.organisation_id AND d.job_id=ANY(allowed_jobs) AND d.visibility='client_visible' AND d.archived_at IS NULL;
 ELSIF p_kind='photo' AND a.permissions&&ARRAY['photos','perm-photos'] THEN
  SELECT f.bucket,f.object_path,f.original_filename,f.mime_type,e.job_id INTO asset FROM public.evidence_files f JOIN public.evidence_records e ON e.id=f.evidence_id WHERE f.id=p_id AND f.organisation_id=a.organisation_id AND e.organisation_id=a.organisation_id AND e.job_id=ANY(allowed_jobs) AND e.visibility='client_visible' AND e.review_status='accepted' AND e.archived_at IS NULL AND f.visibility='client_visible' AND f.archived_at IS NULL AND f.mime_type IN ('image/jpeg','image/png','image/webp','image/avif','image/gif');
 ELSE RAISE EXCEPTION 'File permission required' USING ERRCODE='42501';END IF;
 IF NOT FOUND OR asset.object_path NOT LIKE a.organisation_id::text||'/'||asset.job_id::text||'/%' OR asset.object_path ~ '(^|/)\.\.(/|$)' THEN RAISE EXCEPTION 'File unavailable' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('bucket',asset.bucket,'path',asset.object_path,'filename',asset.original_filename,'mime_type',asset.mime_type);
END $$;
REVOKE ALL ON FUNCTION public.client_portal_asset(text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.client_portal_asset(text,text,uuid) TO service_role;

-- Called only by the token-authenticating Edge Function, never by browser roles.
CREATE OR REPLACE FUNCTION public.client_portal_overview(p_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE a public.portal_access;jobs uuid[];projects jsonb;events jsonb:='[]';variations jsonb:='[]';payments jsonb:='[]';can_progress boolean;can_schedule boolean;can_variations boolean;can_financials boolean;currency text;client_name text;extra jsonb;
BEGIN
 IF p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid portal link' USING ERRCODE='42501';END IF;
 SELECT * INTO a FROM public.portal_access WHERE token_hash=p_hash AND status='active' AND access_type='client';
 IF NOT FOUND OR a.client_id IS NULL OR a.expires_at IS NULL OR a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'Invalid or expired portal link' USING ERRCODE='42501';END IF;
 SELECT COALESCE(NULLIF(company_name,''),NULLIF(btrim(COALESCE(first_name,'')||' '||COALESCE(last_name,'')),''),'Client') INTO client_name FROM public.clients WHERE id=a.client_id AND organisation_id=a.organisation_id AND archived_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invalid portal link' USING ERRCODE='42501';END IF;
 can_progress:=a.permissions && ARRAY['progress','perm-progress'];can_schedule:=a.permissions && ARRAY['schedule','perm-schedule'];can_variations:=a.permissions && ARRAY['variations','perm-variations'];can_financials:=a.permissions && ARRAY['financials','perm-financials'];
 IF NOT(can_progress OR can_schedule OR can_variations OR can_financials) THEN RAISE EXCEPTION 'This portal link has no viewing permissions' USING ERRCODE='42501';END IF;
 SELECT COALESCE(array_agg(id),'{}'::uuid[]),COALESCE(jsonb_agg(jsonb_build_object('id',id,'reference',reference,'project_name',project_name)||CASE WHEN can_progress THEN jsonb_build_object('status',status,'progress',progress,'proposed_start_date',proposed_start_date,'target_completion_date',target_completion_date,'short_description',short_description,'project_manager_name',(SELECT p.full_name FROM public.profiles p JOIN public.organisation_members m ON m.user_id=p.id WHERE p.id=public.jobs.project_manager_id AND m.organisation_id=a.organisation_id AND m.status='active' LIMIT 1)) ELSE '{}'::jsonb END ORDER BY reference),'[]'::jsonb) INTO jobs,projects FROM public.jobs WHERE organisation_id=a.organisation_id AND client_id=a.client_id AND archived_at IS NULL AND (COALESCE(cardinality(a.job_scope),0)=0 OR id=ANY(a.job_scope));
 SELECT COALESCE(NULLIF(upper(default_currency),''),'GBP') INTO currency FROM public.organisations WHERE id=a.organisation_id;
 IF can_schedule THEN
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',e.id,'job_id',e.job_id,'title',e.title,'event_date',e.event_date,'event_type',CASE WHEN e.metadata->>'portal_event_type' IN ('site_visit','milestone','payment','meeting','handover') THEN e.metadata->>'portal_event_type' WHEN e.event_type='inspection' THEN 'site_visit' WHEN e.event_type='completion' THEN 'handover' WHEN e.event_type='payment' THEN 'payment' ELSE 'meeting' END,'event_time',e.metadata->>'event_time','location',e.metadata->>'location') ORDER BY e.event_date,e.id),'[]'::jsonb) INTO events FROM public.timeline_events e WHERE e.organisation_id=a.organisation_id AND e.job_id=ANY(jobs) AND e.visibility='client_visible';
 END IF;
 IF can_variations THEN
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',v.id,'job_id',v.job_id,'reference',v.reference,'title',v.title,'description',v.description,'included_work',v.included_work,'excluded_work',v.excluded_work,'assumptions',v.assumptions,'client_price_pence',v.client_price_pence,'vat_pence',v.vat_pence,'total_pence',v.total_pence,'programme_days',v.programme_days,'revised_completion',v.revised_completion,'approval_deadline',v.approval_deadline,'status',v.status,'current_version',v.current_version,'updated_at',v.updated_at) ORDER BY v.created_at DESC),'[]'::jsonb) INTO variations FROM public.variations v WHERE v.organisation_id=a.organisation_id AND v.job_id=ANY(jobs) AND v.archived_at IS NULL AND v.status IN ('sent','viewed','question_received','approved','declined','invoiced');
 END IF;
 IF can_financials THEN
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',p.id,'job_id',p.job_id,'reference',p.reference,'application_date',p.application_date,'valuation_pence',p.valuation_pence,'previous_certified_pence',p.previous_certified_pence,'amount_due_pence',p.amount_due_pence,'retention_pence',p.retention_pence,'status',p.status) ORDER BY p.application_date DESC,p.id),'[]'::jsonb) INTO payments FROM public.payment_applications p WHERE p.organisation_id=a.organisation_id AND p.job_id=ANY(jobs) AND p.status IN ('submitted','certified','paid','disputed');
 END IF;
 SELECT jsonb_build_object(
  'can_respond',public.org_has_write_access(a.organisation_id) AND a.permissions&&ARRAY['decisions','perm-decisions'] AND can_variations,
  'can_message',public.org_has_write_access(a.organisation_id) AND a.permissions&&ARRAY['messages','perm-messages'],
  'documents',CASE WHEN a.permissions&&ARRAY['documents','perm-docs'] THEN (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',d.id,'job_id',d.job_id,'name',d.name,'filename',d.original_filename,'mime_type',d.mime_type,'version',d.version,'uploaded_at',d.uploaded_at) ORDER BY d.uploaded_at DESC),'[]') FROM public.project_documents d WHERE d.organisation_id=a.organisation_id AND d.job_id=ANY(jobs) AND d.visibility='client_visible' AND d.archived_at IS NULL) ELSE '[]'::jsonb END,
  'photos',CASE WHEN a.permissions&&ARRAY['photos','perm-photos'] THEN (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',f.id,'job_id',e.job_id,'caption',e.caption,'filename',f.original_filename,'captured_at',e.captured_at) ORDER BY e.captured_at DESC),'[]') FROM public.evidence_files f JOIN public.evidence_records e ON e.id=f.evidence_id WHERE f.organisation_id=a.organisation_id AND e.organisation_id=a.organisation_id AND e.job_id=ANY(jobs) AND e.visibility='client_visible' AND f.visibility='client_visible' AND e.review_status='accepted' AND e.archived_at IS NULL AND f.archived_at IS NULL AND f.mime_type IN ('image/jpeg','image/png','image/webp','image/avif','image/gif')) ELSE '[]'::jsonb END,
  'messages',CASE WHEN a.permissions&&ARRAY['messages','perm-messages'] THEN (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',m.id,'job_id',c.job_id,'body',m.body,'sender_type',m.sender_type,'created_at',m.created_at) ORDER BY m.created_at),'[]') FROM public.messages m JOIN public.conversations c ON c.id=m.conversation_id WHERE m.organisation_id=a.organisation_id AND c.organisation_id=a.organisation_id AND c.client_id=a.client_id AND c.job_id=ANY(jobs) AND c.conversation_type='client' AND c.archived_at IS NULL AND m.client_visible AND m.withdrawn_at IS NULL) ELSE '[]'::jsonb END,
  'responses',CASE WHEN can_variations THEN (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',r.id,'variation_id',r.variation_id,'version',r.variation_version,'type',r.response_type,'name',r.respondent_name,'message',r.message,'created_at',r.created_at) ORDER BY r.created_at),'[]') FROM public.variation_responses r JOIN public.variations v ON v.id=r.variation_id JOIN public.portal_access g ON g.id::text=r.portal_session_ref WHERE r.organisation_id=a.organisation_id AND v.organisation_id=a.organisation_id AND v.job_id=ANY(jobs) AND v.archived_at IS NULL AND v.status IN ('sent','viewed','question_received','approved','declined','invoiced') AND g.organisation_id=a.organisation_id AND g.client_id=a.client_id) ELSE '[]'::jsonb END
 ) INTO extra;
 RETURN extra||jsonb_build_object('client_name',client_name,'currency',currency,'expires_at',a.expires_at,'permissions',jsonb_build_object('progress',can_progress,'schedule',can_schedule,'variations',can_variations,'financials',can_financials),'projects',projects,'events',events,'variations',variations,'payments',payments);
END $$;

CREATE FUNCTION procurement_private.portal_manage(p_org uuid,p_request uuid,p_action text,p_data jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid();role text;existing procurement_private.requests;a public.portal_access;client uuid;v_id uuid;scope uuid[];perms text[];email text;hours integer;conv public.conversations;
BEGIN
 SELECT m.role INTO role FROM public.organisation_members m WHERE m.organisation_id=p_org AND m.user_id=actor AND m.status='active';
 IF actor IS NULL OR role IS NULL OR role NOT IN ('owner','admin') THEN RAISE EXCEPTION 'Owner or admin permission required' USING ERRCODE='42501';END IF;
 IF NOT public.org_has_write_access(p_org) THEN RAISE EXCEPTION 'Upgrade to make changes' USING ERRCODE='42501';END IF;
 IF p_request IS NULL OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' OR p_action IS NULL OR p_action NOT IN ('create_link','revoke_link','create_client','reply_message') THEN RAISE EXCEPTION 'Invalid portal management action';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||p_request::text,0));
 SELECT * INTO existing FROM procurement_private.requests WHERE organisation_id=p_org AND request_id=p_request;
 IF FOUND THEN IF existing.actor_id<>actor OR existing.action<>'portal_'||p_action OR existing.payload<>p_data THEN RAISE EXCEPTION 'Submission already used for different data';END IF;RETURN existing.result_id;END IF;
 IF p_action='create_client' THEN
  IF COALESCE(p_data->>'type','') NOT IN ('individual','business') OR length(btrim(COALESCE(p_data->>'name',''))) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Enter a client name';END IF;
  INSERT INTO public.clients(organisation_id,client_type,company_name,first_name) VALUES(p_org,CASE WHEN p_data->>'type'='business' THEN 'business' ELSE 'individual' END,CASE WHEN p_data->>'type'='business' THEN btrim(p_data->>'name') END,CASE WHEN p_data->>'type'<>'business' THEN btrim(p_data->>'name') END) RETURNING id INTO v_id;
 ELSIF p_action='create_link' THEN
  client:=(p_data->>'client_id')::uuid;email:=lower(btrim(p_data->>'email'));hours:=(p_data->>'hours')::integer;
  IF NOT EXISTS(SELECT 1 FROM public.clients WHERE id=client AND organisation_id=p_org AND archived_at IS NULL) THEN RAISE EXCEPTION 'Select an active company client';END IF;
  IF email IS NULL OR email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR length(email)>320 OR hours IS NULL OR hours NOT BETWEEN 1 AND 720 OR COALESCE(p_data->>'token_hash','') !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Enter a valid recipient, expiry and secure token hash';END IF;
  IF jsonb_typeof(p_data->'job_ids') IS DISTINCT FROM 'array' OR jsonb_typeof(p_data->'permissions') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Choose projects and permissions';END IF;
  SELECT array_agg(DISTINCT value::uuid) INTO scope FROM jsonb_array_elements_text(p_data->'job_ids');SELECT array_agg(DISTINCT value) INTO perms FROM jsonb_array_elements_text(p_data->'permissions');
  IF COALESCE(cardinality(scope),0) NOT BETWEEN 1 AND 100 OR EXISTS(SELECT 1 FROM unnest(scope) j WHERE j IS NULL OR NOT EXISTS(SELECT 1 FROM public.jobs WHERE id=j AND organisation_id=p_org AND client_id=client AND archived_at IS NULL)) THEN RAISE EXCEPTION 'Choose active projects belonging to this client';END IF;
  IF COALESCE(cardinality(perms),0) NOT BETWEEN 1 AND 8 OR NOT 'progress'=ANY(perms) OR EXISTS(SELECT 1 FROM unnest(perms) p WHERE p IS NULL OR p NOT IN ('progress','schedule','financials','variations','decisions','documents','photos','messages')) OR ('decisions'=ANY(perms) AND NOT 'variations'=ANY(perms)) THEN RAISE EXCEPTION 'Choose valid viewing and response permissions';END IF;
  IF EXISTS(SELECT 1 FROM public.portal_access WHERE token_hash=p_data->>'token_hash') THEN RAISE EXCEPTION 'Generate a new secure link';END IF;
  INSERT INTO public.portal_access(organisation_id,client_id,email,access_type,token_hash,job_scope,permissions,invited_by,expires_at) VALUES(p_org,client,email,'client',p_data->>'token_hash',scope,perms,actor,clock_timestamp()+make_interval(hours=>hours)) RETURNING id INTO v_id;
 ELSIF p_action='revoke_link' THEN
  SELECT * INTO a FROM public.portal_access WHERE id=(p_data->>'access_id')::uuid AND organisation_id=p_org AND access_type='client' FOR UPDATE;
  IF NOT FOUND OR a.revision IS DISTINCT FROM (p_data->>'revision')::integer THEN RAISE EXCEPTION 'Link changed. Reload before revoking';END IF;
  IF length(btrim(COALESCE(p_data->>'reason',''))) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Enter the revocation reason';END IF;
  UPDATE public.portal_access SET status='revoked',revoked_at=clock_timestamp(),revision=revision+1 WHERE id=a.id;v_id:=a.id;
 ELSE
  SELECT * INTO conv FROM public.conversations WHERE id=(p_data->>'conversation_id')::uuid AND organisation_id=p_org AND conversation_type='client' AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND OR length(btrim(COALESCE(p_data->>'message',''))) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Choose a client conversation and enter a message';END IF;
  INSERT INTO public.messages(organisation_id,conversation_id,sender_id,sender_type,body,client_visible,idempotency_key) VALUES(p_org,conv.id,actor::text,'user',btrim(p_data->>'message'),true,'portal-reply:'||p_org||':'||p_request) RETURNING id INTO v_id;
  UPDATE public.conversations SET last_message_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=conv.id;
 END IF;
 INSERT INTO public.audit_events(organisation_id,actor_id,action,entity_type,entity_id,note,source) VALUES(p_org,actor,'portal_'||p_action,CASE WHEN p_action='create_client' THEN 'client' WHEN p_action='reply_message' THEN 'message' ELSE 'portal_access' END,v_id,NULLIF(btrim(p_data->>'reason'),''),'client_portal_management');
 INSERT INTO procurement_private.requests(organisation_id,request_id,actor_id,action,payload,result_id) VALUES(p_org,p_request,actor,'portal_'||p_action,p_data,v_id);RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION procurement_private.portal_manage(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION procurement_private.portal_manage(uuid,uuid,text,jsonb) TO authenticated;
CREATE FUNCTION public.client_portal_manage(p_org uuid,p_request uuid,p_action text,p_data jsonb) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT procurement_private.portal_manage(p_org,p_request,p_action,p_data) $$;
REVOKE ALL ON FUNCTION public.client_portal_manage(uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.client_portal_manage(uuid,uuid,text,jsonb) TO authenticated;
CREATE FUNCTION procurement_private.portal_inbox(p_org uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.organisation_members WHERE organisation_id=p_org AND user_id=auth.uid() AND status='active' AND role IN ('owner','admin')) THEN RAISE EXCEPTION 'Owner or admin permission required' USING ERRCODE='42501';END IF;
 RETURN (SELECT COALESCE(jsonb_agg(jsonb_build_object('id',m.id,'conversation_id',c.id,'client_id',c.client_id,'job_id',c.job_id,'body',m.body,'sender_type',m.sender_type,'created_at',m.created_at) ORDER BY m.created_at DESC),'[]') FROM public.messages m JOIN public.conversations c ON c.id=m.conversation_id WHERE m.organisation_id=p_org AND c.organisation_id=p_org AND c.conversation_type='client' AND c.archived_at IS NULL AND m.client_visible AND m.withdrawn_at IS NULL);
END $$;
REVOKE ALL ON FUNCTION procurement_private.portal_inbox(uuid) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION procurement_private.portal_inbox(uuid) TO authenticated;
CREATE FUNCTION public.client_portal_inbox(p_org uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT procurement_private.portal_inbox(p_org) $$;
REVOKE ALL ON FUNCTION public.client_portal_inbox(uuid) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION public.client_portal_inbox(uuid) TO authenticated;
