-- Apply only AFTER the reviewed migration and scheduled-job-reports function are deployed.
-- Uses a dedicated credential; never place a service-role key in pg_net headers.
DO $$
DECLARE token text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='job_report_worker_token') THEN
  PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'job_report_worker_token','Scheduled job reports only');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM vault.secrets WHERE name='job_report_project_url') THEN
  PERFORM vault.create_secret('https://lsykbzphjotkelqarnfc.supabase.co','job_report_project_url','Change this URL for a different environment');
 END IF;
 SELECT decrypted_secret INTO STRICT token FROM vault.decrypted_secrets WHERE name='job_report_worker_token';
 INSERT INTO procurement_private.job_report_worker_config(name,token_hash) VALUES('worker',encode(extensions.digest(token,'sha256'),'hex'))
 ON CONFLICT(name) DO UPDATE SET token_hash=excluded.token_hash;
END $$;
CREATE OR REPLACE FUNCTION procurement_private.enqueue_job_reports()
RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE token text; url text;
BEGIN
 SELECT decrypted_secret INTO STRICT token FROM vault.decrypted_secrets WHERE name='job_report_worker_token';
 SELECT decrypted_secret INTO STRICT url FROM vault.decrypted_secrets WHERE name='job_report_project_url';
 IF token !~ '^[a-f0-9]{64}$' OR url !~ '^https://[a-z0-9]+[.]supabase[.]co$' THEN RAISE EXCEPTION 'Invalid report worker configuration'; END IF;
 -- Payload retention is bounded without removing uncertain retry receipts prematurely.
 DELETE FROM procurement_private.job_report_deliveries WHERE due_at<now()-interval '30 days';
 RETURN net.http_post(url:=url||'/functions/v1/scheduled-job-reports',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),body:='{}'::jsonb,timeout_milliseconds:=30000);
END $$;
REVOKE ALL ON FUNCTION procurement_private.enqueue_job_reports() FROM PUBLIC,anon,authenticated,service_role;
SELECT cron.schedule('scheduled-job-report-delivery','* * * * *','SELECT procurement_private.enqueue_job_reports();');
