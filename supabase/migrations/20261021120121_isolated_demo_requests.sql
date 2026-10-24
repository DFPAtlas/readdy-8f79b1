CREATE TABLE procurement_private.demo_requests (
 id uuid PRIMARY KEY, email text NOT NULL, full_name text NOT NULL, company text NOT NULL,
 token_hash text NOT NULL UNIQUE, session_hash text, created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours', redeemed_at timestamptz,
 delivery_status text NOT NULL DEFAULT 'pending' CHECK(delivery_status IN ('pending','accepted_by_provider','failed','unknown'))
);
ALTER TABLE procurement_private.demo_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON procurement_private.demo_requests FROM PUBLIC,anon,authenticated;
CREATE INDEX demo_requests_email_created ON procurement_private.demo_requests(email,created_at DESC);
CREATE FUNCTION public.demo_request_operation(p_action text,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r procurement_private.demo_requests;v_email text:=lower(btrim(p_data->>'email'));v_name text:=btrim(p_data->>'name');v_company text:=btrim(COALESCE(p_data->>'company',''));v_id uuid;
BEGIN
 IF p_action='create' THEN
  v_id:=(p_data->>'id')::uuid;
  IF v_id IS NULL OR COALESCE(v_email,'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR length(v_email)>254 OR COALESCE(length(v_name),0) NOT BETWEEN 1 AND 120 OR length(v_company)>160 OR COALESCE(p_data->>'token_hash','') !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid demo request';END IF;
  -- Global lock makes caps and request replay checks atomic across concurrent callers.
  PERFORM pg_advisory_xact_lock(hashtextextended('buildnerve-demo-requests',0));
  SELECT * INTO r FROM procurement_private.demo_requests WHERE id=v_id FOR UPDATE;
  IF FOUND THEN
   IF r.email<>v_email OR r.full_name<>v_name OR r.company<>v_company OR r.token_hash<>(p_data->>'token_hash') OR r.expires_at<=now() OR r.created_at<now()-interval '23 hours' THEN RAISE EXCEPTION 'Request is no longer available';END IF;
  ELSE
   IF (SELECT count(*) FROM procurement_private.demo_requests WHERE email=v_email AND created_at>now()-interval '1 hour')>=3 OR (SELECT count(*) FROM procurement_private.demo_requests WHERE created_at>now()-interval '1 hour')>=100 THEN RAISE EXCEPTION 'Demo request limit reached';END IF;
   INSERT INTO procurement_private.demo_requests(id,email,full_name,company,token_hash) VALUES(v_id,v_email,v_name,v_company,p_data->>'token_hash') RETURNING * INTO r;
  END IF;
  RETURN jsonb_build_object('id',r.id,'email',r.email,'name',r.full_name,'delivery_status',r.delivery_status);
 ELSIF p_action='delivery' THEN
  IF COALESCE(p_data->>'status','') NOT IN ('accepted_by_provider','failed','unknown') THEN RAISE EXCEPTION 'Invalid delivery status';END IF;
  UPDATE procurement_private.demo_requests SET delivery_status=p_data->>'status' WHERE id=(p_data->>'id')::uuid AND delivery_status<>'accepted_by_provider';
  RETURN jsonb_build_object('saved',true);
 ELSIF p_action='redeem' THEN
  IF COALESCE(p_data->>'session_hash','') !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid demo session';END IF;
  SELECT * INTO r FROM procurement_private.demo_requests WHERE token_hash=p_data->>'token_hash' FOR UPDATE;
  IF NOT FOUND OR r.expires_at<=now() OR (r.session_hash IS NOT NULL AND r.session_hash<>(p_data->>'session_hash')) THEN RAISE EXCEPTION 'Demo link is expired or already used' USING ERRCODE='42501';END IF;
  UPDATE procurement_private.demo_requests SET session_hash=p_data->>'session_hash',redeemed_at=COALESCE(redeemed_at,now()) WHERE id=r.id;
  RETURN jsonb_build_object('id',r.id,'company',CASE WHEN r.company='' THEN 'Sample Construction Ltd' ELSE r.company END,'expires_at',r.expires_at);
 END IF;
 RAISE EXCEPTION 'Unknown demo action';
END;$$;
REVOKE ALL ON FUNCTION public.demo_request_operation(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.demo_request_operation(text,jsonb) TO service_role;
-- Retain contact details for at most seven days; expired links are rejected immediately.
SELECT cron.schedule('purge-expired-demo-requests','17 3 * * *', $job$DELETE FROM procurement_private.demo_requests WHERE created_at<now()-interval '7 days'$job$);
