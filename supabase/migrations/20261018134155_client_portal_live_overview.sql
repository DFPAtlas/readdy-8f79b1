-- Called only by the token-authenticating Edge Function, never by browser roles.
CREATE FUNCTION public.client_portal_overview(p_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE a public.portal_access;jobs uuid[];projects jsonb;events jsonb:='[]';variations jsonb:='[]';payments jsonb:='[]';can_progress boolean;can_schedule boolean;can_variations boolean;can_financials boolean;currency text;client_name text;
BEGIN
 IF p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid portal link' USING ERRCODE='42501';END IF;
 SELECT * INTO a FROM public.portal_access WHERE token_hash=p_hash AND status='active' AND access_type='client';
 IF NOT FOUND OR a.client_id IS NULL OR a.expires_at IS NULL OR a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'Invalid or expired portal link' USING ERRCODE='42501';END IF;
 SELECT COALESCE(NULLIF(company_name,''),NULLIF(btrim(COALESCE(first_name,'')||' '||COALESCE(last_name,'')),''),'Client') INTO client_name FROM public.clients WHERE id=a.client_id AND organisation_id=a.organisation_id AND archived_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invalid portal link' USING ERRCODE='42501';END IF;
 can_progress:=a.permissions && ARRAY['progress','perm-progress'];can_schedule:=a.permissions && ARRAY['schedule','perm-schedule'];can_variations:=a.permissions && ARRAY['variations','perm-variations'];can_financials:=a.permissions && ARRAY['financials','perm-financials'];
 IF NOT(can_progress OR can_schedule OR can_variations OR can_financials) THEN RAISE EXCEPTION 'This portal link has no viewing permissions' USING ERRCODE='42501';END IF;
 SELECT COALESCE(array_agg(id),'{}'::uuid[]),COALESCE(jsonb_agg(jsonb_build_object('id',id,'reference',reference,'project_name',project_name)||CASE WHEN can_progress THEN jsonb_build_object('status',status,'progress',progress,'proposed_start_date',proposed_start_date,'target_completion_date',target_completion_date,'short_description',short_description) ELSE '{}'::jsonb END ORDER BY reference),'[]'::jsonb) INTO jobs,projects FROM public.jobs WHERE organisation_id=a.organisation_id AND client_id=a.client_id AND archived_at IS NULL AND (COALESCE(cardinality(a.job_scope),0)=0 OR id=ANY(a.job_scope));
 SELECT COALESCE(NULLIF(upper(default_currency),''),'GBP') INTO currency FROM public.organisations WHERE id=a.organisation_id;
 IF can_schedule THEN
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',e.id,'job_id',e.job_id,'title',e.title,'event_date',e.event_date,'event_type',CASE WHEN e.metadata->>'portal_event_type' IN ('site_visit','milestone','payment','meeting','handover') THEN e.metadata->>'portal_event_type' WHEN e.event_type='inspection' THEN 'site_visit' WHEN e.event_type='completion' THEN 'handover' WHEN e.event_type='payment' THEN 'payment' ELSE 'meeting' END,'event_time',e.metadata->>'event_time','location',e.metadata->>'location') ORDER BY e.event_date,e.id),'[]'::jsonb) INTO events FROM public.timeline_events e WHERE e.organisation_id=a.organisation_id AND e.job_id=ANY(jobs) AND e.visibility='client_visible';
 END IF;
 IF can_variations THEN
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',v.id,'job_id',v.job_id,'reference',v.reference,'title',v.title,'description',v.description,'included_work',v.included_work,'excluded_work',v.excluded_work,'assumptions',v.assumptions,'client_price_pence',v.client_price_pence,'vat_pence',v.vat_pence,'total_pence',v.total_pence,'programme_days',v.programme_days,'revised_completion',v.revised_completion,'approval_deadline',v.approval_deadline,'status',v.status,'current_version',v.current_version) ORDER BY v.created_at DESC),'[]'::jsonb) INTO variations FROM public.variations v WHERE v.organisation_id=a.organisation_id AND v.job_id=ANY(jobs) AND v.archived_at IS NULL AND v.status IN ('sent','viewed','question_received','approved','declined','invoiced');
 END IF;
 IF can_financials THEN
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',p.id,'job_id',p.job_id,'reference',p.reference,'application_date',p.application_date,'valuation_pence',p.valuation_pence,'previous_certified_pence',p.previous_certified_pence,'amount_due_pence',p.amount_due_pence,'retention_pence',p.retention_pence,'status',p.status) ORDER BY p.application_date DESC,p.id),'[]'::jsonb) INTO payments FROM public.payment_applications p WHERE p.organisation_id=a.organisation_id AND p.job_id=ANY(jobs) AND p.status IN ('submitted','certified','paid','disputed');
 END IF;
 RETURN jsonb_build_object('client_name',client_name,'currency',currency,'expires_at',a.expires_at,'permissions',jsonb_build_object('progress',can_progress,'schedule',can_schedule,'variations',can_variations,'financials',can_financials),'projects',projects,'events',events,'variations',variations,'payments',payments);
END $$;
REVOKE ALL ON FUNCTION public.client_portal_overview(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.client_portal_overview(text) TO service_role;
