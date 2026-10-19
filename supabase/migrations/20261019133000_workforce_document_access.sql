-- Workforce document collection and review.
-- Files remain in the existing private documents bucket at:
-- <organisation UUID>/workforce/<person UUID>/<document UUID>/file

ALTER TABLE public.workforce_documents
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

DROP POLICY IF EXISTS "Org members can read workforce docs" ON public.workforce_documents;
CREATE POLICY "Workforce office roles can read workforce document metadata"
  ON public.workforce_documents
  FOR SELECT TO authenticated
  USING (public.has_org_role(organisation_id, ARRAY['owner','admin','project_manager','site_supervisor']));

CREATE INDEX IF NOT EXISTS workforce_documents_person_uploaded
  ON public.workforce_documents (organisation_id, person_id, uploaded_at DESC)
  WHERE archived_at IS NULL;

-- Uploads and reads are limited to the exact workforce path and active worker.
CREATE POLICY "Workforce managers can upload worker documents"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND name ~ '^[0-9a-f-]{36}/workforce/[0-9a-f-]{36}/[0-9a-f-]{36}/file$'
    AND public.has_org_role(public.extract_org_from_path(name), ARRAY['owner','admin','project_manager','site_supervisor'])
    AND public.org_has_write_access(public.extract_org_from_path(name))
    AND EXISTS (
      SELECT 1 FROM public.workforce_people p
      WHERE p.id::text = split_part(name, '/', 3)
        AND p.organisation_id = public.extract_org_from_path(name)
        AND p.archived_at IS NULL
    )
  );

CREATE POLICY "Workforce office roles can read registered worker documents"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND name ~ '^[0-9a-f-]{36}/workforce/[0-9a-f-]{36}/[0-9a-f-]{36}/file$'
    AND public.has_org_role(public.extract_org_from_path(name), ARRAY['owner','admin','project_manager','site_supervisor'])
    AND EXISTS (
      SELECT 1 FROM public.workforce_documents d
      WHERE d.organisation_id = public.extract_org_from_path(name)
        AND d.person_id::text = split_part(name, '/', 3)
        AND d.object_path = name
        AND d.archived_at IS NULL
    )
  );

CREATE FUNCTION procurement_private.workforce_document_register(
  p_org uuid, p_person uuid, p_document uuid, p_request uuid,
  p_name text, p_category text, p_filename text, p_mime text, p_size integer
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role text;
  v_path text;
  v_previous procurement_private.requests;
BEGIN
  IF v_actor IS NULL OR p_org IS NULL OR p_person IS NULL OR p_document IS NULL OR p_request IS NULL THEN
    RAISE EXCEPTION 'Sign in and provide valid document details';
  END IF;
  SELECT role INTO v_role FROM public.organisation_members
   WHERE organisation_id=p_org AND user_id=v_actor AND status='active';
  IF v_role IS NULL OR v_role NOT IN ('owner','admin','project_manager','site_supervisor')
     OR NOT public.org_has_write_access(p_org) THEN
    RAISE EXCEPTION 'Workforce document upload permission required' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workforce_people
    WHERE id=p_person AND organisation_id=p_org AND archived_at IS NULL) THEN
    RAISE EXCEPTION 'Active workforce person not found';
  END IF;
  IF length(btrim(COALESCE(p_name,''))) NOT BETWEEN 1 AND 160
     OR length(btrim(COALESCE(p_filename,''))) NOT BETWEEN 1 AND 255
     OR p_category NOT IN ('identity','business','cis','insurance','qualification','training','right_to_work','site_induction','rams','contract','bank_change','other')
     OR p_mime NOT IN ('application/pdf','image/png','image/jpeg','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/msword','application/vnd.ms-excel')
     OR p_size IS NULL OR p_size < 1 OR p_size > 20971520 THEN
    RAISE EXCEPTION 'Use a supported document under 20 MB and provide a valid name and category';
  END IF;
  v_path := p_org::text||'/workforce/'||p_person::text||'/'||p_document::text||'/file';
  PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||p_request::text,0));
  SELECT * INTO v_previous FROM procurement_private.requests
   WHERE organisation_id=p_org AND request_id=p_request;
  IF FOUND THEN
    IF v_previous.actor_id<>v_actor OR v_previous.action<>'workforce_document_register'
       OR v_previous.payload<>jsonb_build_object('person_id',p_person,'document_id',p_document,'name',btrim(p_name),'category',p_category,'filename',btrim(p_filename),'mime',p_mime,'size',p_size) THEN
      RAISE EXCEPTION 'Submission already used for different document data';
    END IF;
    RETURN v_previous.result_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects
    WHERE bucket_id='documents' AND name=v_path) THEN
    RAISE EXCEPTION 'Upload the file before registering it';
  END IF;
  INSERT INTO public.workforce_documents
    (id,organisation_id,person_id,name,category,bucket,object_path,original_filename,mime_type,size_bytes,visibility,review_status,uploaded_by)
  VALUES
    (p_document,p_org,p_person,btrim(p_name),p_category,'documents',v_path,btrim(p_filename),p_mime,p_size,'restricted','awaiting_review',v_actor);
  INSERT INTO procurement_private.requests(organisation_id,request_id,actor_id,action,payload,result_id)
  VALUES(p_org,p_request,v_actor,'workforce_document_register',
    jsonb_build_object('person_id',p_person,'document_id',p_document,'name',btrim(p_name),'category',p_category,'filename',btrim(p_filename),'mime',p_mime,'size',p_size),p_document);
  INSERT INTO public.workforce_history(organisation_id,person_id,actor_id,action,reason,before_record,after_record)
  VALUES(p_org,p_person,v_actor,'document_uploaded','Workforce document uploaded',NULL,
    jsonb_build_object('document_id',p_document,'name',btrim(p_name),'category',p_category,'review_status','awaiting_review'));
  RETURN p_document;
END $$;

CREATE FUNCTION public.workforce_document_register(
  p_org uuid, p_person uuid, p_document uuid, p_request uuid,
  p_name text, p_category text, p_filename text, p_mime text, p_size integer
) RETURNS uuid
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT procurement_private.workforce_document_register(
    p_org,p_person,p_document,p_request,p_name,p_category,p_filename,p_mime,p_size
  )
$$;
REVOKE ALL ON FUNCTION procurement_private.workforce_document_register(uuid,uuid,uuid,uuid,text,text,text,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION procurement_private.workforce_document_register(uuid,uuid,uuid,uuid,text,text,text,text,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.workforce_document_register(uuid,uuid,uuid,uuid,text,text,text,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workforce_document_register(uuid,uuid,uuid,uuid,text,text,text,text,integer) TO authenticated;

CREATE FUNCTION procurement_private.workforce_document_review(
  p_org uuid, p_document uuid, p_request uuid, p_status text, p_note text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_role text;
  v_doc public.workforce_documents;
  v_previous procurement_private.requests;
  v_payload jsonb;
BEGIN
  IF v_actor IS NULL OR p_org IS NULL OR p_document IS NULL OR p_request IS NULL THEN
    RAISE EXCEPTION 'Sign in and provide valid review details';
  END IF;
  SELECT role INTO v_role FROM public.organisation_members
   WHERE organisation_id=p_org AND user_id=v_actor AND status='active';
  IF v_role IS NULL OR v_role NOT IN ('owner','admin','project_manager')
     OR NOT public.org_has_write_access(p_org) THEN
    RAISE EXCEPTION 'Workforce document review permission required' USING ERRCODE='42501';
  END IF;
  IF p_status NOT IN ('accepted','rejected') OR length(COALESCE(p_note,''))>2000
     OR (p_status='rejected' AND length(btrim(COALESCE(p_note,'')))=0) THEN
    RAISE EXCEPTION 'Choose accept or reject; a reason is required when rejecting';
  END IF;
  v_payload:=jsonb_build_object('document_id',p_document,'status',p_status,'note',btrim(COALESCE(p_note,'')));
  PERFORM pg_advisory_xact_lock(hashtextextended(p_org::text||p_request::text,0));
  SELECT * INTO v_previous FROM procurement_private.requests
   WHERE organisation_id=p_org AND request_id=p_request;
  IF FOUND THEN
    IF v_previous.actor_id<>v_actor OR v_previous.action<>'workforce_document_review' OR v_previous.payload<>v_payload THEN
      RAISE EXCEPTION 'Submission already used for different review data';
    END IF;
    RETURN v_previous.result_id;
  END IF;
  SELECT * INTO v_doc FROM public.workforce_documents
   WHERE id=p_document AND organisation_id=p_org AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active workforce document not found'; END IF;
  IF v_doc.review_status NOT IN ('submitted','awaiting_review','rejected') THEN
    RAISE EXCEPTION 'This document is not awaiting review';
  END IF;
  UPDATE public.workforce_documents SET review_status=p_status,review_note=NULLIF(btrim(COALESCE(p_note,'')), ''),
    reviewed_by=v_actor,reviewed_at=clock_timestamp()
   WHERE id=p_document;
  INSERT INTO public.workforce_history(organisation_id,person_id,actor_id,action,reason,before_record,after_record)
  VALUES(p_org,v_doc.person_id,v_actor,'document_'||p_status,
    COALESCE(NULLIF(btrim(p_note),''),'Document '||p_status),
    jsonb_build_object('document_id',p_document,'review_status',v_doc.review_status),
    jsonb_build_object('document_id',p_document,'review_status',p_status,'review_note',NULLIF(btrim(COALESCE(p_note,'')),'')));
  INSERT INTO procurement_private.requests(organisation_id,request_id,actor_id,action,payload,result_id)
  VALUES(p_org,p_request,v_actor,'workforce_document_review',v_payload,p_document);
  RETURN p_document;
END $$;

CREATE FUNCTION public.workforce_document_review(
  p_org uuid, p_document uuid, p_request uuid, p_status text, p_note text
) RETURNS uuid
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT procurement_private.workforce_document_review(p_org,p_document,p_request,p_status,p_note)
$$;
REVOKE ALL ON FUNCTION procurement_private.workforce_document_review(uuid,uuid,uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION procurement_private.workforce_document_review(uuid,uuid,uuid,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.workforce_document_review(uuid,uuid,uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workforce_document_review(uuid,uuid,uuid,text,text) TO authenticated;
