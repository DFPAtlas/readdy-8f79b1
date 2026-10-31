import {PGlite} from '@electric-sql/pglite';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
test('personal report schedules enforce admin, tenant, billing, verified recipient, leases and bounded retries',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE SCHEMA procurement_private;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,banned_until timestamptz);
 CREATE TABLE organisations(id uuid PRIMARY KEY,archived_at timestamptz);
 CREATE TABLE organisation_members(organisation_id uuid,user_id uuid,status text,role text);
 CREATE TABLE organisation_subscriptions(organisation_id uuid,access_state text,status text,trial_end timestamptz);
 CREATE TABLE workspace_access(organisation_id uuid,writable boolean);
 CREATE FUNCTION org_has_write_access(p_org uuid) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT COALESCE((SELECT writable FROM public.workspace_access WHERE organisation_id=p_org),false)$$;
 CREATE TABLE saved_reports(id uuid PRIMARY KEY,organisation_id uuid,archived_at timestamptz,report_type text,visibility text,name text,selected_sections text[],filter_config jsonb);
 CREATE TABLE audit_events(organisation_id uuid,actor_id uuid,action text,entity_type text,entity_id uuid,change_summary jsonb,source text);
 CREATE TABLE jobs(id uuid PRIMARY KEY,organisation_id uuid,archived_at timestamptz,reference text,project_name text,status text,progress integer,target_completion_date date);
 GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;`);
 await db.exec(await fs.readFile(new URL('../supabase/migrations/20261031085919_scheduled_job_reports.sql',import.meta.url),'utf8'));
 const ids=Array.from({length:10},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);const [org,other,owner,worker,outsider,report,foreign,schedule,job]=ids;
 await db.query('INSERT INTO organisations(id) VALUES($1),($2)',[org,other]);await db.query('INSERT INTO workspace_access VALUES($1,true),($2,true)',[org,other]);
 await db.query("INSERT INTO auth.users VALUES($1,'owner@example.invalid',now(),null),($2,'worker@example.invalid',now(),null),($3,'outside@example.invalid',now(),null)",[owner,worker,outsider]);
 await db.query("INSERT INTO organisation_members VALUES($1,$2,'active','owner'),($1,$3,'active','employee'),($4,$5,'active','owner')",[org,owner,worker,other,outsider]);
 await db.query(`INSERT INTO saved_reports VALUES($1,$2,null,'jobs','internal_management','Jobs',ARRAY['job_status'],'{"status":"all"}'),($3,$4,null,'jobs','internal_management','Other',ARRAY['job_status'],'{"status":"all"}')`,[report,org,foreign,other]);
 await db.query("INSERT INTO jobs VALUES($1,$2,null,'J1','Real project','in_progress',50,null)",[job,org]);
 await db.exec("INSERT INTO procurement_private.job_report_worker_config VALUES('worker',repeat('a',64))");
 const data={id:schedule,report_id:report,cadence:'weekly',local_time:'08:00'};
 async function actor(id){await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('SET ROLE authenticated');}
 async function manage(action,p=data,o=org){return(await db.query('SELECT manage_job_report_schedule($1,$2,$3::jsonb) result',[o,action,JSON.stringify(p)])).rows[0].result;}
 async function work(action,p={}){await db.exec('RESET ROLE;SET ROLE service_role');return(await db.query("SELECT process_job_report_delivery(repeat('a',64),$1,$2::jsonb) result",[action,JSON.stringify(p)])).rows[0].result;}
 await actor(worker);await assert.rejects(manage('create'),/admin required/);await actor(outsider);await assert.rejects(manage('list'),/admin required/);
 await actor(owner);await assert.rejects(manage('create',{...data,report_id:foreign}),/Unsupported/);await manage('create');await manage('create');assert.equal((await manage('list')).schedules.length,1);
 await assert.rejects(db.query('SELECT * FROM procurement_private.job_report_deliveries'),/permission denied/);
 await assert.rejects(db.query("SELECT process_job_report_delivery(repeat('a',64),'claim')"),/permission denied/);
 await db.exec('RESET ROLE');await db.query('UPDATE workspace_access SET writable=false WHERE organisation_id=$1',[org]);await actor(owner);await assert.rejects(manage('pause',{id:schedule,revision:1}),/Writable/);
 await db.exec('RESET ROLE');await db.query('UPDATE workspace_access SET writable=true WHERE organisation_id=$1',[org]);await db.query("UPDATE procurement_private.job_report_schedules SET next_run=now()-interval '1 minute' WHERE id=$1",[schedule]);
 const c=await work('claim');assert.equal(c.payload.email,'owner@example.invalid');assert.equal(c.payload.jobs.length,1);
 assert.equal(await work('claim'),null,'lease prevents simultaneous send');
 await assert.rejects(work('finish',{id:c.id,lease:ids[9],status:'accepted_by_provider',provider_id:'provider'}),/Lease unavailable/);
 await work('finish',{id:c.id,lease:c.lease,status:'pending'});
 await db.exec('RESET ROLE');await db.exec("UPDATE procurement_private.job_report_deliveries SET available_at=now()-interval '1 second'");
 const retry=await work('claim');assert.equal(retry.id,c.id);assert.deepEqual(retry.payload,c.payload);
 await work('finish',{id:retry.id,lease:retry.lease,status:'accepted_by_provider',provider_id:'provider'});assert.equal(await work('claim'),null);
 await actor(owner);await manage('pause',{id:schedule,revision:1});await assert.rejects(manage('resume',{id:schedule,revision:1}),/changed/);await manage('resume',{id:schedule,revision:2});
 await db.exec('RESET ROLE');await db.exec("UPDATE procurement_private.job_report_schedules SET next_run=now()-interval '1 second'");
 const second=await work('claim');assert.notEqual(second.id,c.id);
 await db.exec('RESET ROLE');await db.query("UPDATE organisation_members SET status='removed' WHERE user_id=$1",[owner]);assert.equal(await work('claim'),null);
 await db.exec('RESET ROLE');assert.equal((await db.query('SELECT status FROM procurement_private.job_report_deliveries WHERE id=$1',[second.id])).rows[0].status,'cancelled');

 // Service calls cannot use the permissive user-session billing helper to bypass billing locks.
 await db.exec('RESET ROLE');await db.query("UPDATE organisation_members SET status='active' WHERE user_id=$1",[owner]);
 await db.query("INSERT INTO organisation_subscriptions VALUES($1,'billing_locked','active',null)",[org]);
 await actor(owner);await assert.rejects(manage('resume',{id:schedule,revision:3}),/Writable/);
 await db.exec('RESET ROLE');await db.exec("UPDATE procurement_private.job_report_schedules SET next_run=now()-interval '1 minute'");
 assert.equal(await work('claim'),null);
 await db.exec('RESET ROLE');assert.equal((await db.query('SELECT active FROM procurement_private.job_report_schedules WHERE id=$1',[schedule])).rows[0].active,false);
 await db.exec('DELETE FROM organisation_subscriptions');
 await db.exec("UPDATE procurement_private.job_report_schedules SET active=true,next_run=now()-interval '2 minutes'");
 const third=await work('claim');assert.ok(third);
 await db.exec('RESET ROLE');await db.exec("UPDATE procurement_private.job_report_deliveries SET first_attempt=now()-interval '7 hours',available_at=now()-interval '1 minute' WHERE status='pending'");
 assert.equal(await work('claim'),null);
 await db.exec('RESET ROLE');assert.equal((await db.query('SELECT status FROM procurement_private.job_report_deliveries WHERE id=$1',[third.id])).rows[0].status,'uncertain');
 // London wall time follows DST, weekly Monday and monthly day one.
 const next=async(after,cadence,time)=>(await db.query('SELECT procurement_private.next_job_report_run($1,$2,$3) n',[after,cadence,time])).rows[0].n.toISOString();
 assert.equal(await next('2026-03-28T09:00:00Z','daily','08:00'),'2026-03-29T07:00:00.000Z');
 assert.equal(await next('2026-10-24T09:00:00Z','daily','08:00'),'2026-10-25T08:00:00.000Z');
 assert.equal(await next('2026-10-31T09:00:00Z','weekly','08:00'),'2026-11-02T08:00:00.000Z');
 assert.equal(await next('2026-10-31T09:00:00Z','monthly','08:00'),'2026-11-01T08:00:00.000Z');

 // Every new table is private and RLS-protected; definer entrypoints keep a fixed search path.
 const protectedTables=await db.query("SELECT relname,relrowsecurity FROM pg_class WHERE relnamespace='procurement_private'::regnamespace AND relkind='r'");
 assert.ok(protectedTables.rows.every(r=>r.relrowsecurity));
 const privileged=await db.query("SELECT proname,proconfig FROM pg_proc WHERE pronamespace='procurement_private'::regnamespace AND prosecdef");
 assert.ok(privileged.rows.every(r=>r.proconfig.some(v=>v.startsWith('search_path='))));
 await db.exec(`CREATE SCHEMA vault;CREATE SCHEMA extensions;CREATE SCHEMA net;CREATE SCHEMA cron;
 CREATE TABLE vault.secrets(name text,decrypted_secret text);
 CREATE VIEW vault.decrypted_secrets AS SELECT * FROM vault.secrets;
 CREATE FUNCTION vault.create_secret(v text,n text,description text) RETURNS uuid LANGUAGE plpgsql AS $$BEGIN INSERT INTO vault.secrets VALUES(n,v);RETURN gen_random_uuid();END$$;
 CREATE FUNCTION extensions.gen_random_bytes(n integer) RETURNS bytea LANGUAGE sql AS $$SELECT decode(repeat('bb',n),'hex')$$;
 CREATE FUNCTION extensions.digest(v text,algorithm text) RETURNS bytea LANGUAGE sql AS $$SELECT decode(repeat('aa',32),'hex')$$;
 CREATE TABLE net.requests(url text,headers jsonb,body jsonb);
 CREATE FUNCTION net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) RETURNS bigint LANGUAGE plpgsql AS $$BEGIN INSERT INTO net.requests VALUES(url,headers,body);RETURN 1;END$$;
 CREATE TABLE cron.jobs(name text,schedule text,command text);
 CREATE FUNCTION cron.schedule(name text,schedule text,command text) RETURNS bigint LANGUAGE plpgsql AS $$BEGIN INSERT INTO cron.jobs VALUES(name,schedule,command);RETURN 1;END$$;`);
 await db.exec(await fs.readFile(new URL('../supabase/ops/enable_scheduled_job_reports.sql',import.meta.url),'utf8'));
 await db.exec('SELECT procurement_private.enqueue_job_reports()');
 const queued=(await db.query('SELECT * FROM net.requests')).rows[0];assert.match(queued.url,/scheduled-job-reports$/);assert.equal(queued.headers.Authorization,'Bearer '+'bb'.repeat(32));
 await db.exec('SET ROLE authenticated');await assert.rejects(db.exec('SELECT procurement_private.enqueue_job_reports()'),/permission denied/);await db.exec('RESET ROLE');
 await db.exec('SET ROLE anon');await assert.rejects(manage('list'),/permission denied/);
 }finally{await db.close();}
});
