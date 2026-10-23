-- Minimal, permission-scoped dashboard metadata. No customer payloads or secrets.
CREATE FUNCTION public.platform_dashboard_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  permissions text[];
  metrics jsonb := '{}'::jsonb;
  organisations jsonb := NULL;
  audit_events jsonb := NULL;
  support_cases jsonb := NULL;
  directory jsonb;
  trials jsonb;
BEGIN
  SELECT array_agg(DISTINCT pd.permission_key) INTO permissions
  FROM public.platform_staff s
  JOIN public.platform_role_permissions rp ON rp.role=s.role
  JOIN public.platform_permission_definitions pd ON pd.id=rp.permission_id
  WHERE s.user_id=auth.uid() AND s.status='active';
  IF auth.uid() IS NULL OR NOT COALESCE('platform.view_dashboard'=ANY(permissions),false) THEN
    RAISE EXCEPTION 'Platform dashboard permission required' USING ERRCODE='42501';
  END IF;
  IF 'platform.manage_organisations'=ANY(permissions) THEN
    directory := public.platform_organisation_directory('','all',5,0);
    trials := public.platform_organisation_directory('','trial',1,0);
    -- Return only panel fields, excluding owner email and other directory details.
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id',r->>'id','name',r->>'name',
      'status',r->>'status','plan_name',r->>'plan_name','created_at',r->>'created_at') ORDER BY ord),'[]'::jsonb)
      INTO organisations FROM jsonb_array_elements(directory->'items') WITH ORDINALITY AS items(r,ord);
    metrics := metrics || jsonb_build_object('organisations_total',(directory->>'total')::bigint,
      'trial_organisations',(trials->>'total')::bigint,
      'pending_verifications',(SELECT count(*) FROM public.business_verifications
        WHERE business_status='pending_review' OR representative_status='pending_review'));
  END IF;
  IF 'platform.manage_users'=ANY(permissions) THEN
    metrics := metrics || jsonb_build_object(
      'active_member_users',(SELECT count(DISTINCT m.user_id) FROM public.organisation_members m
        JOIN public.organisations o ON o.id=m.organisation_id WHERE m.status='active' AND o.archived_at IS NULL),
      'new_accounts_7d',(SELECT count(*) FROM auth.users WHERE created_at>=now()-interval '7 days'));
  END IF;
  IF 'platform.manage_communications'=ANY(permissions) THEN
    metrics := metrics || jsonb_build_object('failed_notification_jobs',
      (SELECT count(*) FROM public.notification_outbox WHERE status='failed'));
  END IF;
  IF 'platform.manage_support_cases'=ANY(permissions) THEN
    metrics := metrics || jsonb_build_object('open_support_cases',
      (SELECT count(*) FROM public.platform_support_cases WHERE status NOT IN ('resolved','closed')));
    SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC,r.id),'[]'::jsonb) INTO support_cases FROM (
      SELECT c.id,c.title,c.priority,c.status,c.created_at,o.name AS organisation_name
      FROM public.platform_support_cases c LEFT JOIN public.organisations o ON o.id=c.organisation_id
      WHERE c.status NOT IN ('resolved','closed') ORDER BY c.created_at DESC,c.id LIMIT 4
    ) r;
  END IF;
  IF 'platform.view_audit_log'=ANY(permissions) THEN
    metrics := metrics || jsonb_build_object('privileged_actions_30d',
      (SELECT count(*) FROM public.platform_privileged_actions WHERE created_at>=now()-interval '30 days'));
    SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC,r.id),'[]'::jsonb) INTO audit_events FROM (
      SELECT a.id,a.event_type,a.created_at,p.full_name AS actor_name,o.name AS organisation_name
      FROM public.platform_audit_events a LEFT JOIN public.profiles p ON p.id=a.actor_id
      LEFT JOIN public.organisations o ON o.id=a.target_org_id ORDER BY a.created_at DESC,a.id LIMIT 5
    ) r;
  END IF;
  RETURN jsonb_build_object('metrics',metrics,'organisations',organisations,'audit_events',audit_events,
    'support_cases',support_cases,'generated_at',now());
END $$;
REVOKE ALL ON FUNCTION public.platform_dashboard_summary() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.platform_dashboard_summary() TO authenticated;
