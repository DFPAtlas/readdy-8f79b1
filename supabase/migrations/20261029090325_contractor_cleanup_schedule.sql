-- A dedicated maintenance credential, not a service-role key, authorises cleanup only.
CREATE EXTENSION IF NOT EXISTS pg_net;
-- Hosted pg_net owns its queue and exposes pending headers to database-login roles.
-- Use only the dedicated cleanup credential here, never a project service key.

CREATE TABLE procurement_private.contractor_cleanup_config (
 name text PRIMARY KEY CHECK (name = 'contractor_documents'),
 token_hash text NOT NULL CHECK (token_hash ~ '^[a-f0-9]{64}$')
);
ALTER TABLE procurement_private.contractor_cleanup_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON procurement_private.contractor_cleanup_config FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON procurement_private.contractor_cleanup_config TO service_role;

DO $setup$
DECLARE v_token text;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name='contractor_cleanup_token') THEN
  PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'), 'contractor_cleanup_token', 'Dedicated contractor staging cleanup credential');
 END IF;
 IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name='contractor_cleanup_project_url') THEN
  PERFORM vault.create_secret('https://lsykbzphjotkelqarnfc.supabase.co', 'contractor_cleanup_project_url', 'BuildNerve cleanup target; change for another environment');
 END IF;
 SELECT decrypted_secret INTO STRICT v_token FROM vault.decrypted_secrets WHERE name='contractor_cleanup_token';
 INSERT INTO procurement_private.contractor_cleanup_config(name,token_hash)
 VALUES('contractor_documents',encode(extensions.digest(v_token,'sha256'),'hex'));
END;
$setup$;

CREATE FUNCTION public.authorize_contractor_cleanup(p_token_hash text) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $auth$
 SELECT COALESCE(p_token_hash ~ '^[a-f0-9]{64}$',false) AND EXISTS (
  SELECT 1 FROM procurement_private.contractor_cleanup_config
  WHERE name='contractor_documents' AND token_hash=p_token_hash
 );
$auth$;
REVOKE ALL ON FUNCTION public.authorize_contractor_cleanup(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_contractor_cleanup(text) TO service_role;

-- Runs as the cron job's database owner. No public caller can enqueue maintenance.
CREATE FUNCTION procurement_private.enqueue_contractor_document_cleanup() RETURNS bigint
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $enqueue$
DECLARE v_token text; v_url text;
BEGIN
 SELECT decrypted_secret INTO STRICT v_token FROM vault.decrypted_secrets WHERE name='contractor_cleanup_token';
 SELECT decrypted_secret INTO STRICT v_url FROM vault.decrypted_secrets WHERE name='contractor_cleanup_project_url';
 IF v_token !~ '^[a-f0-9]{64}$' OR v_url !~ '^https://[a-z0-9]+[.]supabase[.]co$' THEN
  RAISE EXCEPTION 'Invalid contractor cleanup configuration';
 END IF;
 RETURN net.http_post(
  url:=v_url||'/functions/v1/contractor-documents',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_token),
  body:='{"action":"cleanup"}'::jsonb,
  timeout_milliseconds:=30000
 );
END;
$enqueue$;
REVOKE ALL ON FUNCTION procurement_private.enqueue_contractor_document_cleanup() FROM PUBLIC,anon,authenticated,service_role;

-- Deploy the updated handler before applying this migration. Hourly, 23 minutes past.
SELECT cron.schedule('contractor-document-staging-cleanup','23 * * * *',
 'SELECT procurement_private.enqueue_contractor_document_cleanup();');
