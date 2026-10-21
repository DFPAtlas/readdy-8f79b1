-- Workforce invitations are separate from staff membership invitations.
CREATE TABLE procurement_private.workforce_invitations (
 id uuid PRIMARY KEY, organisation_id uuid NOT NULL REFERENCES public.organisations(id),
 person_id uuid NOT NULL REFERENCES public.workforce_people(id), actor_id uuid NOT NULL REFERENCES auth.users(id),
 email text NOT NULL, token_hash text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','revoked')),
 delivery_status text NOT NULL DEFAULT 'pending' CHECK(delivery_status IN ('pending','accepted_by_provider','failed','unknown')),
 provider_id text, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',
 accepted_at timestamptz, revoked_at timestamptz
);
ALTER TABLE procurement_private.workforce_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON procurement_private.workforce_invitations FROM PUBLIC,anon,authenticated;
CREATE INDEX workforce_invites_person ON procurement_private.workforce_invitations(organisation_id,person_id,created_at DESC);
CREATE FUNCTION public.workforce_invitation_operation(p_action text,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_org uuid;v_actor uuid;v_person public.workforce_people;v_row procurement_private.workforce_invitations;v_id uuid;v_role text;v_company text;
BEGIN
 IF p_action IN ('create','list','revoke') THEN
  v_org:=(p_data->>'organisation_id')::uuid;v_actor:=(p_data->>'actor_id')::uuid;
  SELECT role INTO v_role FROM public.organisation_members WHERE organisation_id=v_org AND user_id=v_actor AND status='active';
  IF v_role IS NULL OR v_role NOT IN ('owner','admin','project_manager') THEN RAISE EXCEPTION 'Workforce invitation permission required' USING ERRCODE='42501';END IF;
  IF p_action='list' THEN
   RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.id,'person_id',i.person_id,'email',i.email,'status',CASE WHEN i.status='pending' AND i.expires_at<=now() THEN 'expired' ELSE i.status END,'delivery_status',i.delivery_status,'created_at',i.created_at,'expires_at',i.expires_at,'accepted_at',i.accepted_at) ORDER BY i.created_at DESC) FROM (SELECT * FROM procurement_private.workforce_invitations WHERE organisation_id=v_org ORDER BY created_at DESC LIMIT 100) i),'[]'::jsonb);
  END IF;
  IF NOT public.org_has_write_access(v_org) THEN RAISE EXCEPTION 'Workspace is read-only' USING ERRCODE='42501';END IF;
  IF p_action='revoke' THEN
   SELECT * INTO v_row FROM procurement_private.workforce_invitations WHERE id=(p_data->>'id')::uuid AND organisation_id=v_org FOR UPDATE;
   IF NOT FOUND OR v_row.status='accepted' THEN RAISE EXCEPTION 'Pending invitation not found';END IF;
   UPDATE procurement_private.workforce_invitations SET status='revoked',revoked_at=now() WHERE id=v_row.id;
   RETURN jsonb_build_object('status','revoked');
  END IF;
  v_id:=(p_data->>'id')::uuid;
  IF v_id IS NULL OR COALESCE(p_data->>'token_hash','') !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid invitation request';END IF;
  SELECT * INTO v_person FROM public.workforce_people WHERE id=(p_data->>'person_id')::uuid AND organisation_id=v_org AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND OR v_person.passport_status IN ('restricted','archived') OR COALESCE(v_person.email,'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Choose an active worker with a valid email address';END IF;
  SELECT * INTO v_row FROM procurement_private.workforce_invitations WHERE id=v_id;
  IF FOUND THEN
   IF v_row.organisation_id<>v_org OR v_row.person_id<>v_person.id OR v_row.actor_id<>v_actor OR v_row.token_hash<>p_data->>'token_hash' OR v_row.email<>lower(btrim(v_person.email)) OR v_row.status<>'pending' OR v_row.expires_at<=now() THEN RAISE EXCEPTION 'Invitation request no longer valid';END IF;
   -- Provider idempotency expires after 24h. Do not retry an uncertain send beyond that window.
   IF v_row.created_at<now()-interval '23 hours' THEN RAISE EXCEPTION 'Create a new invitation';END IF;
  ELSE
   IF EXISTS(SELECT 1 FROM procurement_private.workforce_invitations WHERE person_id=v_person.id AND created_at>now()-interval '1 minute') THEN RAISE EXCEPTION 'Wait one minute before sending another invitation';END IF;
   UPDATE procurement_private.workforce_invitations SET status='revoked',revoked_at=now() WHERE person_id=v_person.id AND status='pending';
   INSERT INTO procurement_private.workforce_invitations(id,organisation_id,person_id,actor_id,email,token_hash) VALUES(v_id,v_org,v_person.id,v_actor,lower(btrim(v_person.email)),p_data->>'token_hash') RETURNING * INTO v_row;
   UPDATE public.workforce_people SET passport_status=CASE WHEN passport_status='not_started' THEN 'invited' ELSE passport_status END,updated_at=clock_timestamp(),revision=revision+1 WHERE id=v_person.id;
   INSERT INTO public.workforce_history(organisation_id,person_id,actor_id,action,reason,after_record) VALUES(v_org,v_person.id,v_actor,'invitation_created','Workforce invitation requested',jsonb_build_object('invitation_id',v_id));
  END IF;
  SELECT name INTO v_company FROM public.organisations WHERE id=v_org;
  RETURN jsonb_build_object('id',v_row.id,'email',v_row.email,'company',v_company,'delivery_status',v_row.delivery_status);
 ELSIF p_action='delivery' THEN
  IF COALESCE(p_data->>'status','') NOT IN ('accepted_by_provider','failed','unknown') THEN RAISE EXCEPTION 'Invalid delivery result';END IF;
  UPDATE procurement_private.workforce_invitations SET delivery_status=p_data->>'status',provider_id=p_data->>'provider_id' WHERE id=(p_data->>'id')::uuid AND delivery_status<>'accepted_by_provider';
  RETURN jsonb_build_object('saved',true);
 ELSIF p_action IN ('preview','accept') THEN
  SELECT * INTO v_row FROM procurement_private.workforce_invitations WHERE token_hash=p_data->>'token_hash' FOR UPDATE;
  IF NOT FOUND OR v_row.status='revoked' OR v_row.expires_at<=now() THEN RAISE EXCEPTION 'Invitation is unavailable or expired' USING ERRCODE='42501';END IF;
  SELECT * INTO v_person FROM public.workforce_people WHERE id=v_row.person_id AND organisation_id=v_row.organisation_id AND archived_at IS NULL;
  IF NOT FOUND OR lower(btrim(COALESCE(v_person.email,'')))<>v_row.email OR v_person.passport_status='restricted' OR NOT public.org_has_write_access(v_row.organisation_id) THEN RAISE EXCEPTION 'Invitation is unavailable' USING ERRCODE='42501';END IF;
  SELECT name INTO v_company FROM public.organisations WHERE id=v_row.organisation_id;
  IF p_action='accept' AND v_row.status='pending' THEN
   UPDATE procurement_private.workforce_invitations SET status='accepted',accepted_at=now() WHERE id=v_row.id;
   UPDATE public.workforce_people SET passport_status=CASE WHEN passport_status IN ('not_started','invited') THEN 'in_progress' ELSE passport_status END,updated_at=clock_timestamp(),revision=revision+1 WHERE id=v_person.id;
   INSERT INTO public.workforce_history(organisation_id,person_id,actor_id,action,reason,after_record) VALUES(v_row.organisation_id,v_person.id,v_row.actor_id,'invitation_accepted','Recipient confirmed using the emailed invitation link',jsonb_build_object('invitation_id',v_row.id,'acceptance_method','email_link'));
   v_row.status:='accepted';
  END IF;
  RETURN jsonb_build_object('company',v_company,'status',v_row.status);
 END IF;
 RAISE EXCEPTION 'Unknown invitation action';
END;$$;
REVOKE ALL ON FUNCTION public.workforce_invitation_operation(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.workforce_invitation_operation(text,jsonb) TO service_role;
