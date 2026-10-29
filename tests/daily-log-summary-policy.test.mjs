import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

test('daily summaries require staff review, preserve internal text and enforce client and source boundaries',async()=>{
 const db=new PGlite();
 try {
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE SCHEMA procurement_private;GRANT USAGE ON SCHEMA public,auth,procurement_private TO authenticated,service_role;
 CREATE TABLE public.organisations(id uuid PRIMARY KEY,writable boolean);
 CREATE FUNCTION public.org_has_write_access(p_org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT writable FROM public.organisations WHERE id=p_org$$;
 CREATE TABLE public.organisation_members(organisation_id uuid,user_id uuid,status text,role text);
 CREATE TABLE public.clients(id uuid PRIMARY KEY,organisation_id uuid,company_name text,first_name text,last_name text,archived_at timestamptz);
 CREATE TABLE public.jobs(id uuid PRIMARY KEY,organisation_id uuid,client_id uuid,archived_at timestamptz);
 CREATE TABLE public.daily_logs(id uuid PRIMARY KEY,organisation_id uuid,job_id uuid,log_date date,status text,client_summary_published boolean,version integer,updated_at timestamptz,archived_at timestamptz,work_completed text,welfare_status text);
 CREATE TABLE public.portal_access(id uuid PRIMARY KEY,organisation_id uuid,client_id uuid,token_hash text,status text,access_type text,expires_at timestamptz,revoked_at timestamptz,permissions text[],job_scope uuid[]);
 CREATE TABLE public.audit_events(organisation_id uuid,actor_id uuid,action text,entity_type text,entity_id uuid,change_summary jsonb,source text);
 GRANT SELECT ON public.clients,public.jobs,public.daily_logs,public.portal_access TO service_role;`);
 const migration=await fs.readFile(new URL('../supabase/migrations/20261029122247_daily_log_client_summaries.sql',import.meta.url),'utf8');await db.exec(migration);
 const id=n=>`00000000-0000-4000-a000-${String(n).padStart(12,'0')}`;
 const [org,otherOrg,owner,supervisor,employee,client,otherClient,job,otherJob,log,otherLog,grant]=Array.from({length:12},(_,n)=>id(n+1));
 await db.query('INSERT INTO auth.users VALUES($1),($2),($3)',[owner,supervisor,employee]);
 await db.query('INSERT INTO organisations VALUES($1,true),($2,true)',[org,otherOrg]);
 await db.query("INSERT INTO organisation_members VALUES($1,$2,'active','owner'),($1,$3,'active','site_supervisor'),($1,$4,'active','employee')",[org,owner,supervisor,employee]);
 await db.query("INSERT INTO clients VALUES($1,$2,'Client',null,null,null),($3,$2,'Other client',null,null,null)",[client,org,otherClient]);
 await db.query('INSERT INTO jobs VALUES($1,$2,$3,null),($4,$5,$3,null)',[job,org,client,otherJob,otherOrg]);
 await db.query("INSERT INTO daily_logs VALUES($1,$2,$3,'2026-10-29','draft',false,1,clock_timestamp(),null,'INTERNAL work details','PRIVATE welfare details'),($4,$5,$6,'2026-10-29','draft',false,1,clock_timestamp(),null,'Other org',null)",[log,org,job,otherLog,otherOrg,otherJob]);
 await db.query("INSERT INTO portal_access VALUES($1,$2,$3,$4,'active','client',now()+interval '1 day',null,ARRAY['progress'],ARRAY[$5]::uuid[])",[grant,org,client,'a'.repeat(64),job]);
 async function as(user){await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('SET ROLE authenticated');}
 const rpc=async(action,data={},request=id(50),logId=log,jobId=job,orgId=org)=>(await db.query('SELECT public.daily_log_summary($1,$2,$3,$4,$5,$6::jsonb) AS value',[orgId,jobId,logId,request,action,JSON.stringify(data)])).rows[0].value;
 async function state(){return rpc('read');}
 async function args(summary){const s=await state();return {expected_revision:s.summary?.revision ?? 0,source_updated_at:s.source.updated_at,summary:summary ?? s.summary?.summary ?? 'Client-safe update',review_confirmed:true};}
 async function portal(){await db.exec('RESET ROLE;SET ROLE service_role');return (await db.query('SELECT public.client_portal_daily_summaries($1) AS value',['a'.repeat(64)])).rows[0].value;}
 await as(employee);await assert.rejects(state(),/staff permission/);
 await as(supervisor);assert.equal((await state()).can_review,false);
 const savedArgs=await args();const saved=await rpc('save',savedArgs,id(51));assert.equal(saved.revision,1);
 assert.deepEqual(await rpc('save',savedArgs,id(51)),saved,'identical retry returns its receipt');
 await assert.rejects(rpc('save',{...savedArgs,summary:'changed'},id(51)),/different data/);
 await assert.rejects(rpc('review',await args(),id(52)),/authorised reviewer/);
 assert.deepEqual((await portal()).items,[],'draft is never visible');
 await as(owner);await assert.rejects(rpc('publish',await args(),id(53)),/Review/);
 await assert.rejects(rpc('review',{...await args(),review_confirmed:false},id(63)),/Confirm review/);
 await assert.rejects(rpc('review',{...await args(),summary:'Different from saved text'},id(64)),/exact saved/);
 await rpc('review',await args(),id(54));assert.equal((await state()).summary.state,'reviewed');
 assert.deepEqual((await portal()).items,[],'review alone does not publish');
 await db.exec('RESET ROLE');await db.query("UPDATE daily_logs SET welfare_status='PRIVATE revised welfare',updated_at=clock_timestamp() WHERE id=$1",[log]);
 await as(owner);await assert.rejects(rpc('publish',await args(),id(68)),/Review/);
 await rpc('save',await args(),id(69));await rpc('review',await args(),id(70));
 await as(owner);await rpc('publish',await args(),id(55));const published=await portal();
 assert.equal(published.total,1);assert.equal(published.items[0].summary,'Client-safe update');
 assert.ok(!JSON.stringify(published).includes('INTERNAL'));assert.ok(!JSON.stringify(published).includes('PRIVATE'));assert.ok(!JSON.stringify(published).includes('reviewed_by'));
 await db.exec('RESET ROLE');assert.equal((await db.query('SELECT count(*) AS n FROM audit_events')).rows[0].n,5);
 await db.query("UPDATE daily_logs SET work_completed='Changed internal source',updated_at=clock_timestamp() WHERE id=$1",[log]);
 assert.deepEqual((await portal()).items,[],'source edits hide a previously published snapshot');
 await as(owner);assert.equal((await state()).stale,true);
 await rpc('save',await args('Revised safe summary'),id(56));assert.deepEqual((await portal()).items,[],'saving a revision withdraws the old published version');await as(owner);await rpc('review',await args(),id(57));
 await db.exec('RESET ROLE');await db.query('UPDATE jobs SET client_id=$1 WHERE id=$2',[otherClient,job]);
 await as(owner);await assert.rejects(rpc('publish',await args(),id(58)),/Review/);
 await db.exec('RESET ROLE');await db.query('UPDATE jobs SET client_id=$1 WHERE id=$2',[client,job]);
 await as(owner);await rpc('publish',await args(),id(59));
 await db.exec('RESET ROLE');await db.query("UPDATE portal_access SET permissions=ARRAY['schedule'] WHERE id=$1",[grant]);assert.deepEqual((await portal()).items,[]);
 await db.exec('RESET ROLE');await db.query("UPDATE portal_access SET permissions=ARRAY['progress'],job_scope=ARRAY[$1]::uuid[] WHERE id=$2",[otherJob,grant]);assert.deepEqual((await portal()).items,[]);
 await db.exec('RESET ROLE');await db.query('UPDATE portal_access SET job_scope=ARRAY[$1]::uuid[] WHERE id=$2',[job,grant]);
 await as(owner);await rpc('withdraw',await args(),id(60));assert.deepEqual((await portal()).items,[]);
 await as(owner);await assert.rejects(rpc('save',await args(),id(61),otherLog,otherJob,org),/company job/);
 await db.exec('RESET ROLE');await db.query('UPDATE organisations SET writable=false WHERE id=$1',[org]);
 await as(owner);assert.equal((await state()).can_edit,false);await assert.rejects(rpc('save',await args(),id(62)),/Writable workspace/);
 await db.exec('RESET ROLE');await db.query('UPDATE organisations SET writable=true WHERE id=$1',[org]);
 await as(owner);await rpc('save',await args(),id(71));await rpc('review',await args(),id(72));const publishArgs=await args();
 await db.exec(`RESET ROLE;CREATE FUNCTION public.fail_summary_audit() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'audit unavailable';END$$;CREATE TRIGGER fail_summary_audit BEFORE INSERT ON public.audit_events FOR EACH ROW EXECUTE FUNCTION public.fail_summary_audit();`);
 await as(owner);await assert.rejects(rpc('publish',publishArgs,id(73)),/audit unavailable/);assert.equal((await state()).summary.state,'reviewed');assert.equal((await state()).source.client_summary_published,false);
 await db.exec('RESET ROLE;DROP TRIGGER fail_summary_audit ON public.audit_events');await as(owner);await rpc('publish',publishArgs,id(73));assert.equal((await portal()).total,1,'same request recovers after transaction rollback');
 await db.exec('RESET ROLE');await db.query("UPDATE daily_logs SET status='locked' WHERE id=$1",[log]);await as(owner);assert.equal((await state()).can_edit,false);await assert.rejects(rpc('save',await args(),id(74)),/Writable workspace/);
 await db.exec('RESET ROLE');await db.query("UPDATE organisation_members SET status='removed' WHERE user_id=$1",[owner]);await as(owner);await assert.rejects(state(),/staff permission/);
 await db.exec('RESET ROLE');await db.query("UPDATE portal_access SET expires_at=now()-interval '1 second' WHERE id=$1",[grant]);await assert.rejects(portal(),/Invalid portal/);
 await db.exec('RESET ROLE');await db.query("UPDATE portal_access SET expires_at=now()+interval '1 day' WHERE id=$1",[grant]);
 await db.exec('RESET ROLE');await db.query('UPDATE portal_access SET revoked_at=now() WHERE id=$1',[grant]);await assert.rejects(portal(),/Invalid portal/);
 await db.exec('RESET ROLE;SET ROLE authenticated');await assert.rejects(db.query('SELECT public.client_portal_daily_summaries($1)',['a'.repeat(64)]),/permission denied/);
 await assert.rejects(db.exec('SELECT * FROM procurement_private.daily_log_client_summaries'),/permission denied/);
 }finally{await db.close();}
});
