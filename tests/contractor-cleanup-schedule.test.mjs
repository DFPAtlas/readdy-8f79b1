import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

test('cleanup schedule keeps credentials private and restricts authorisation and enqueue operations',async()=>{
 const db=new PGlite();
 try {
  // Hosted extensions are replaced with local test doubles; execute the migration's real SQL and grants.
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
   CREATE SCHEMA procurement_private;GRANT USAGE ON SCHEMA procurement_private TO service_role;
   CREATE SCHEMA net;CREATE TABLE net.requests(id bigint GENERATED ALWAYS AS IDENTITY,url text,headers jsonb,body jsonb);
   CREATE FUNCTION net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) RETURNS bigint LANGUAGE sql AS $$INSERT INTO net.requests(url,headers,body) VALUES(url,headers,body) RETURNING id$$;
   CREATE SCHEMA vault;CREATE TABLE vault.secrets(name text UNIQUE,decrypted_secret text);
   CREATE VIEW vault.decrypted_secrets AS SELECT * FROM vault.secrets;
   CREATE FUNCTION vault.create_secret(secret text,name text,description text) RETURNS void LANGUAGE sql AS $$INSERT INTO vault.secrets VALUES(name,secret)$$;
   CREATE SCHEMA extensions;
   CREATE FUNCTION extensions.gen_random_bytes(n integer) RETURNS bytea LANGUAGE sql AS $$SELECT decode(repeat('ef',n),'hex')$$;
   CREATE FUNCTION extensions.digest(value text,algorithm text) RETURNS bytea LANGUAGE sql AS $$SELECT decode(md5(value)||md5(value),'hex')$$;
   CREATE SCHEMA cron;CREATE TABLE cron.job(jobname text UNIQUE,schedule text,command text);
   CREATE FUNCTION cron.schedule(name text,schedule text,command text) RETURNS bigint LANGUAGE sql AS $$INSERT INTO cron.job VALUES(name,schedule,command);SELECT 1::bigint$$;`);
  const migration=await fs.readFile(new URL('../supabase/migrations/20261029090015_contractor_cleanup_schedule.sql',import.meta.url),'utf8');
  await db.exec(migration.replace('CREATE EXTENSION IF NOT EXISTS pg_net;',''));
  const job=(await db.query('SELECT * FROM cron.job')).rows[0];
  assert.equal(job.schedule,'23 * * * *');assert.equal(job.command,'SELECT procurement_private.enqueue_contractor_document_cleanup();');
  const token=(await db.query("SELECT decrypted_secret FROM vault.secrets WHERE name='contractor_cleanup_token'")).rows[0].decrypted_secret;
  assert.ok(!job.command.includes(token));
  const hash=(await db.query('SELECT token_hash FROM procurement_private.contractor_cleanup_config')).rows[0].token_hash;
  for(const role of ['anon','authenticated']) {
   await db.exec(`SET ROLE ${role}`);
   await assert.rejects(db.query('SELECT public.authorize_contractor_cleanup($1)',[hash]),/permission denied/);
   await assert.rejects(db.exec('SELECT procurement_private.enqueue_contractor_document_cleanup()'),/permission denied/);
   await db.exec('RESET ROLE');
  }
  await db.exec('SET ROLE service_role');
  assert.equal((await db.query('SELECT public.authorize_contractor_cleanup($1) AS ok',[hash])).rows[0].ok,true);
  assert.equal((await db.query('SELECT public.authorize_contractor_cleanup($1) AS ok',['a'.repeat(64)])).rows[0].ok,false);
  await assert.rejects(db.exec('SELECT procurement_private.enqueue_contractor_document_cleanup()'),/permission denied/);
  await assert.rejects(db.exec('SELECT * FROM vault.decrypted_secrets'),/permission denied/);
  await db.exec('RESET ROLE');
  await db.exec(job.command);
  const request=(await db.query('SELECT * FROM net.requests')).rows[0];
  assert.deepEqual(request.body,{action:'cleanup'});assert.equal(request.headers.Authorization,`Bearer ${token}`);
  assert.equal(request.url,'https://lsykbzphjotkelqarnfc.supabase.co/functions/v1/contractor-documents');
  await db.exec("UPDATE vault.secrets SET decrypted_secret='https://untrusted.invalid' WHERE name='contractor_cleanup_project_url'");
  await assert.rejects(db.exec(job.command),/Invalid contractor cleanup configuration/);
 }finally{await db.close();}
});
