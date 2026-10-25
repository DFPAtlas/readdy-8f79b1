ALTER TABLE public.workforce_documents ADD COLUMN submission_source text NOT NULL DEFAULT 'office' CHECK(submission_source IN ('office','contractor_invitation'));

-- No recipient gets database, bucket or workspace credentials.
CREATE TABLE procurement_private.contractor_document_submissions (
 id uuid PRIMARY KEY, invitation_id uuid NOT NULL REFERENCES procurement_private.workforce_invitations(id),
 organisation_id uuid NOT NULL REFERENCES public.organisations(id), person_id uuid NOT NULL REFERENCES public.workforce_people(id),
 payload jsonb NOT NULL, object_path text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','registered','cleanup_pending')),
 created_at timestamptz NOT NULL DEFAULT now(), registered_at timestamptz
);
ALTER TABLE procurement_private.contractor_document_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON procurement_private.contractor_document_submissions FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA procurement_private TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON procurement_private.contractor_document_submissions TO service_role;
GRANT SELECT,UPDATE ON procurement_private.workforce_invitations TO service_role;
CREATE INDEX contractor_submissions_invitation ON procurement_private.contractor_document_submissions(invitation_id);

CREATE FUNCTION public.contractor_document_operation(p_action text,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
 v_inv procurement_private.workforce_invitations;
 v_person public.workforce_people;
 v_submission procurement_private.contractor_document_submissions;
 v_id uuid; v_payload jsonb; v_company text; v_path text; v_result jsonb;
BEGIN
 IF p_action='cleanup_list' THEN
  WITH expired AS (
    SELECT s.id FROM procurement_private.contractor_document_submissions s
    JOIN procurement_private.workforce_invitations i ON i.id=s.invitation_id
    WHERE s.status IN ('reserved','cleanup_pending') AND s.created_at<now()-interval '1 day'
      AND (i.expires_at<=now() OR i.status='revoked')
    ORDER BY s.created_at LIMIT 100 FOR UPDATE OF s SKIP LOCKED
  ), marked AS (
    UPDATE procurement_private.contractor_document_submissions s SET status='cleanup_pending'
    FROM expired e WHERE s.id=e.id RETURNING s.id,s.object_path
  ) SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'path',object_path)),'[]'::jsonb) INTO v_result FROM marked;
  RETURN v_result;
 ELSIF p_action='cleanup_complete' THEN
  DELETE FROM procurement_private.contractor_document_submissions WHERE id=(p_data->>'id')::uuid AND status='cleanup_pending';
  RETURN jsonb_build_object('removed',FOUND);
 END IF;
 IF COALESCE(p_data->>'token_hash','') !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501';END IF;
 SELECT * INTO v_inv FROM procurement_private.workforce_invitations WHERE token_hash=p_data->>'token_hash' FOR UPDATE;
 IF NOT FOUND OR v_inv.status<>'accepted' OR v_inv.revoked_at IS NOT NULL OR v_inv.expires_at<=now() THEN
  RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501';
 END IF;
 SELECT * INTO v_person FROM public.workforce_people WHERE id=v_inv.person_id AND organisation_id=v_inv.organisation_id AND archived_at IS NULL;
 IF NOT FOUND OR v_person.passport_status IN ('restricted','archived')
   OR lower(btrim(COALESCE(v_person.email,'')))<>v_inv.email
   OR NOT public.org_has_write_access(v_inv.organisation_id)
   OR NOT EXISTS(SELECT 1 FROM public.organisation_members WHERE organisation_id=v_inv.organisation_id
      AND user_id=v_inv.actor_id AND status='active' AND role IN ('owner','admin','project_manager')) THEN
  RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501';
 END IF;
 SELECT name INTO v_company FROM public.organisations WHERE id=v_inv.organisation_id;
 IF p_action='list' THEN
  RETURN jsonb_build_object('company',v_company,'expires_at',v_inv.expires_at,'documents',COALESCE((
   SELECT jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'category',d.category,'filename',d.original_filename,
     'size',d.size_bytes,'status',d.review_status,'uploaded_at',d.uploaded_at) ORDER BY d.uploaded_at DESC)
   FROM procurement_private.contractor_document_submissions s JOIN public.workforce_documents d ON d.id=s.id
   WHERE s.invitation_id=v_inv.id AND s.status='registered' AND d.archived_at IS NULL
  ),'[]'::jsonb));
 END IF;
 IF p_action NOT IN ('prepare','complete') THEN RAISE EXCEPTION 'Unknown document action'; END IF;
 v_id:=(p_data->>'id')::uuid;
 IF v_id IS NULL THEN RAISE EXCEPTION 'Invalid document request';END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='documents' AND public=false) THEN
  RAISE EXCEPTION 'Private document storage unavailable';
 END IF;
 IF p_action='prepare' THEN
  v_payload:=p_data->'document';
  IF jsonb_typeof(v_payload) IS DISTINCT FROM 'object'
    OR length(btrim(COALESCE(v_payload->>'name',''))) NOT BETWEEN 1 AND 160
    OR length(btrim(COALESCE(v_payload->>'filename',''))) NOT BETWEEN 1 AND 255
    OR COALESCE(v_payload->>'category','') NOT IN ('identity','business','cis','insurance','qualification','training','right_to_work','site_induction','rams','contract','other')
    OR COALESCE(v_payload->>'mime','') NOT IN ('application/pdf','image/png','image/jpeg','image/webp')
    OR COALESCE(v_payload->>'sha256','') !~ '^[a-f0-9]{64}$'
    OR COALESCE((v_payload->>'size')::integer,0) NOT BETWEEN 1 AND 5242880 THEN
   RAISE EXCEPTION 'Invalid document details';
  END IF;
  SELECT * INTO v_submission FROM procurement_private.contractor_document_submissions WHERE id=v_id;
  IF FOUND THEN
   IF v_submission.invitation_id<>v_inv.id OR v_submission.payload<>v_payload OR v_submission.status='cleanup_pending' THEN
    RAISE EXCEPTION 'Submission does not match this invitation' USING ERRCODE='42501';
   END IF;
  ELSE
   IF (SELECT count(*) FROM procurement_private.contractor_document_submissions WHERE invitation_id=v_inv.id)>=20 THEN
    RAISE EXCEPTION 'Invitation upload limit reached' USING ERRCODE='54000';
   END IF;
   v_path:=v_inv.organisation_id::text||'/workforce/'||v_inv.person_id::text||'/'||v_id::text||'/file';
   INSERT INTO procurement_private.contractor_document_submissions(id,invitation_id,organisation_id,person_id,payload,object_path)
    VALUES(v_id,v_inv.id,v_inv.organisation_id,v_inv.person_id,v_payload,v_path) RETURNING * INTO v_submission;
  END IF;
  RETURN jsonb_build_object('id',v_submission.id,'path',v_submission.object_path,'registered',v_submission.status='registered');
 END IF;
 SELECT * INTO v_submission FROM procurement_private.contractor_document_submissions WHERE id=v_id AND invitation_id=v_inv.id FOR UPDATE;
 IF NOT FOUND OR v_submission.status='cleanup_pending' THEN RAISE EXCEPTION 'Document submission unavailable';END IF;
 IF v_submission.status='registered' THEN RETURN jsonb_build_object('id',v_id,'status','awaiting_review'); END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='documents' AND name=v_submission.object_path
   AND COALESCE(metadata->>'size',metadata->>'contentLength')::bigint=(v_submission.payload->>'size')::bigint
   AND metadata->>'mimetype'=v_submission.payload->>'mime') THEN
  RAISE EXCEPTION 'Verified private file required before registration';
 END IF;
 INSERT INTO public.workforce_documents(id,organisation_id,person_id,name,category,bucket,object_path,original_filename,mime_type,size_bytes,visibility,review_status,uploaded_by,submission_source)
 VALUES(v_id,v_inv.organisation_id,v_inv.person_id,v_submission.payload->>'name',v_submission.payload->>'category',
  'documents',v_submission.object_path,v_submission.payload->>'filename',v_submission.payload->>'mime',(v_submission.payload->>'size')::integer,'restricted','awaiting_review',NULL,'contractor_invitation');
 INSERT INTO public.audit_events(organisation_id,actor_id,action,entity_type,entity_id,change_summary,note,source)
 VALUES(v_inv.organisation_id,NULL,'contractor_document_submitted','workforce_document',v_id,
  jsonb_build_object('person_id',v_inv.person_id,'invitation_id',v_inv.id,'submission_method','email_link','review_status','awaiting_review'),
  'Submitted using an accepted invitation link; identity and document validity require company review','contractor_invitation');
 UPDATE procurement_private.contractor_document_submissions SET status='registered',registered_at=now() WHERE id=v_id;
 RETURN jsonb_build_object('id',v_id,'status','awaiting_review');
END $$;
REVOKE ALL ON FUNCTION public.contractor_document_operation(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.contractor_document_operation(text,jsonb) TO service_role;

-- Company managers can revoke accepted links, and a new invitation supersedes old links.
CREATE OR REPLACE FUNCTION public.workforce_invitation_operation(p_action text,p_data jsonb) RETURNS jsonb
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
   IF NOT FOUND OR v_row.status='revoked' THEN RAISE EXCEPTION 'Active invitation not found';END IF;
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
   UPDATE procurement_private.workforce_invitations SET status='revoked',revoked_at=now() WHERE person_id=v_person.id AND status IN ('pending','accepted');
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
