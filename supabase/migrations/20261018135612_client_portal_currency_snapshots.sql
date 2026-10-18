ALTER TABLE public.variations ADD COLUMN currency text NOT NULL DEFAULT '';
ALTER TABLE public.payment_applications ADD COLUMN currency text NOT NULL DEFAULT '';
UPDATE public.variations v SET currency=COALESCE(NULLIF(upper(o.default_currency),''),'GBP') FROM public.organisations o WHERE o.id=v.organisation_id;
UPDATE public.payment_applications p SET currency=COALESCE(NULLIF(upper(o.default_currency),''),'GBP') FROM public.organisations o WHERE o.id=p.organisation_id;
CREATE FUNCTION procurement_private.record_currency() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' THEN IF NEW.currency IS DISTINCT FROM OLD.currency THEN RAISE EXCEPTION 'The recorded currency cannot be changed';END IF;
 ELSE
  IF COALESCE(NEW.currency,'')='' THEN SELECT COALESCE(NULLIF(upper(default_currency),''),'GBP') INTO NEW.currency FROM public.organisations WHERE id=NEW.organisation_id;END IF;
  IF NEW.currency IS NULL OR NEW.currency !~ '^[A-Z]{3}$' THEN RAISE EXCEPTION 'Valid record currency required';END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION procurement_private.record_currency() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER variation_record_currency BEFORE INSERT OR UPDATE OF currency ON public.variations FOR EACH ROW EXECUTE FUNCTION procurement_private.record_currency();
CREATE TRIGGER payment_record_currency BEFORE INSERT OR UPDATE OF currency ON public.payment_applications FOR EACH ROW EXECUTE FUNCTION procurement_private.record_currency();

CREATE OR REPLACE FUNCTION public.client_portal_write(p_hash text,p_request uuid,p_action text,p_data jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
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
  IF (p_data->>'version')::integer IS DISTINCT FROM v.current_version OR (p_data->>'updated_at')::timestamptz IS DISTINCT FROM v.updated_at OR (p_data->>'total_pence')::bigint IS DISTINCT FROM v.total_pence OR p_data->>'currency' IS DISTINCT FROM v.currency THEN RAISE EXCEPTION 'Variation changed. Reload and review the latest version';END IF;
  IF p_action='approved' AND (p_data->'price_confirmed' IS DISTINCT FROM 'true'::jsonb OR p_data->'authority_confirmed' IS DISTINCT FROM 'true'::jsonb) THEN RAISE EXCEPTION 'Confirm the price and authority before approving';END IF;
  old_status:=v.status;
  INSERT INTO public.variation_responses(variation_id,organisation_id,variation_version,response_type,respondent_name,message,portal_session_ref,confirmation_text) VALUES(v.id,a.organisation_id,v.current_version,p_action,name,message,a.id::text,CASE WHEN p_action='approved' THEN 'Client confirmed authority and accepted version '||v.current_version||' with total '||v.total_pence||' '||v.currency||' minor currency units, including VAT' ELSE NULL END) RETURNING id INTO v_id;
  UPDATE public.variations SET status=CASE WHEN p_action='question' THEN 'question_received' ELSE p_action END,updated_at=clock_timestamp() WHERE id=v.id;
  INSERT INTO public.audit_events(organisation_id,action,entity_type,entity_id,old_status,new_status,change_summary,source,reference) VALUES(a.organisation_id,'client_variation_'||p_action,'variation',v.id,old_status,CASE WHEN p_action='question' THEN 'question_received' ELSE p_action END,jsonb_build_object('response_id',v_id,'grant_id',a.id,'respondent_name',name,'version',v.current_version,'net_pence',v.client_price_pence,'vat_pence',v.vat_pence,'total_pence',v.total_pence,'currency',v.currency,'programme_days',v.programme_days,'revised_completion',v.revised_completion),'client_portal',a.id::text);
  INSERT INTO public.timeline_events(organisation_id,job_id,event_type,title,visibility,related_record_type,related_record_id,event_date) VALUES(a.organisation_id,v.job_id,'decision','Client response: '||p_action||' — '||v.reference,'client_visible','variation',v.id,clock_timestamp());
 END IF;
 INSERT INTO procurement_private.portal_requests(access_id,request_id,action,payload,result_id) VALUES(a.id,p_request,p_action,p_data,v_id);RETURN v_id;
END $$;

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
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',v.id,'job_id',v.job_id,'reference',v.reference,'title',v.title,'description',v.description,'included_work',v.included_work,'excluded_work',v.excluded_work,'assumptions',v.assumptions,'client_price_pence',v.client_price_pence,'vat_pence',v.vat_pence,'total_pence',v.total_pence,'currency',v.currency,'programme_days',v.programme_days,'revised_completion',v.revised_completion,'approval_deadline',v.approval_deadline,'status',v.status,'current_version',v.current_version,'updated_at',v.updated_at) ORDER BY v.created_at DESC),'[]'::jsonb) INTO variations FROM public.variations v WHERE v.organisation_id=a.organisation_id AND v.job_id=ANY(jobs) AND v.archived_at IS NULL AND v.status IN ('sent','viewed','question_received','approved','declined','invoiced');
 END IF;
 IF can_financials THEN
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',p.id,'job_id',p.job_id,'reference',p.reference,'application_date',p.application_date,'valuation_pence',p.valuation_pence,'previous_certified_pence',p.previous_certified_pence,'amount_due_pence',p.amount_due_pence,'currency',p.currency,'retention_pence',p.retention_pence,'status',p.status) ORDER BY p.application_date DESC,p.id),'[]'::jsonb) INTO payments FROM public.payment_applications p WHERE p.organisation_id=a.organisation_id AND p.job_id=ANY(jobs) AND p.status IN ('submitted','certified','paid','disputed');
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
