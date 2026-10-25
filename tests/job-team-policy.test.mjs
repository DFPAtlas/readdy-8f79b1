import { PGlite } from '@electric-sql/pglite';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('job team saves enforce actor, tenancy, membership, billing, conflicts and atomic audit', async () => {
 const db=new PGlite();
 try {
 await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE TABLE public.organisation_members(organisation_id uuid,user_id uuid,status text,role text);
 CREATE TABLE public.workspace_access(organisation_id uuid,writable boolean);
 CREATE FUNCTION public.is_org_member(org_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT EXISTS(SELECT 1 FROM public.organisation_members WHERE organisation_id=org_id AND user_id=auth.uid() AND status='active')$$;
 CREATE FUNCTION public.has_org_role(org_id uuid,required_roles text[]) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT EXISTS(SELECT 1 FROM public.organisation_members WHERE organisation_id=org_id AND user_id=auth.uid() AND status='active' AND role=ANY(required_roles))$$;
 CREATE FUNCTION public.org_has_write_access(p_org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT COALESCE((SELECT writable FROM public.workspace_access WHERE organisation_id=p_org),false)$$;
 CREATE TABLE public.jobs(id uuid PRIMARY KEY,organisation_id uuid,project_manager_id uuid,archived_at timestamptz,updated_at timestamptz DEFAULT now());
 CREATE TABLE public.job_members(id uuid DEFAULT gen_random_uuid() PRIMARY KEY,job_id uuid,organisation_id uuid,user_id uuid,role text CHECK(role IN('project_manager','site_supervisor','worker','observer')),created_at timestamptz DEFAULT now(),UNIQUE(job_id,user_id,role));
 CREATE TABLE public.audit_events(id uuid DEFAULT gen_random_uuid(),organisation_id uuid,actor_id uuid,action text,entity_type text,entity_id uuid,change_summary jsonb,source text);
 ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY; ALTER TABLE public.job_members ENABLE ROW LEVEL SECURITY; ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY; ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
 CREATE POLICY members_read ON public.organisation_members FOR SELECT TO authenticated USING(public.is_org_member(organisation_id));
 CREATE POLICY jobs_read ON public.jobs FOR SELECT TO authenticated USING(public.is_org_member(organisation_id));
 CREATE POLICY jobs_update ON public.jobs FOR UPDATE TO authenticated USING(public.has_org_role(organisation_id,ARRAY['owner','admin','project_manager'])) WITH CHECK(public.has_org_role(organisation_id,ARRAY['owner','admin','project_manager']));
 CREATE POLICY assignments_read ON public.job_members FOR SELECT TO authenticated USING(public.is_org_member(organisation_id));
 CREATE POLICY assignments_insert ON public.job_members FOR INSERT TO authenticated WITH CHECK(public.has_org_role(organisation_id,ARRAY['owner','admin','project_manager']));
 CREATE POLICY assignments_update ON public.job_members FOR UPDATE TO authenticated USING(public.has_org_role(organisation_id,ARRAY['owner','admin','project_manager'])) WITH CHECK(public.has_org_role(organisation_id,ARRAY['owner','admin','project_manager']));
 CREATE POLICY audit_read ON public.audit_events FOR SELECT TO authenticated USING(public.is_org_member(organisation_id));
 CREATE POLICY audit_insert ON public.audit_events FOR INSERT TO authenticated WITH CHECK(public.is_org_member(organisation_id) AND actor_id=auth.uid());
 GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
 GRANT SELECT ON public.organisation_members TO authenticated; GRANT SELECT,UPDATE ON public.jobs TO authenticated;
 GRANT SELECT,INSERT,UPDATE,DELETE ON public.job_members TO authenticated;
 GRANT SELECT,INSERT ON public.audit_events TO authenticated;`);
 await db.exec(await fs.readFile(new URL('../supabase/migrations/20261025145210_job_team_assignment.sql',import.meta.url),'utf8'));
 const ids=Array.from({length:12},(_,i)=>`00000000-0000-0000-0000-${String(i+1).padStart(12,'0')}`);
 const [org,otherOrg,owner,worker,pm,inactive,outsider,observer,job,otherJob,archivedJob]=ids;
 await db.query("INSERT INTO organisation_members VALUES($1,$2,'active','owner'),($1,$3,'active','employee'),($1,$4,'active','project_manager'),($1,$5,'removed','employee'),($6,$7,'active','owner'),($1,$8,'active','employee')",[org,owner,worker,pm,inactive,otherOrg,outsider,observer]);
 await db.query('INSERT INTO workspace_access VALUES($1,true),($2,true)',[org,otherOrg]);
 await db.query('INSERT INTO jobs(id,organisation_id,archived_at) VALUES($1,$2,null),($3,$4,null),($5,$2,now())',[job,org,otherJob,otherOrg,archivedJob]);
 async function actor(id) {await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('SET ROLE authenticated');}
 const empty={manager_id:null,members:[]};
 const assignments=[{user_id:pm,role:'project_manager'},{user_id:worker,role:'worker'}];
 async function save(expected,members,orgId=org,jobId=job) {return (await db.query('SELECT public.replace_job_team($1,$2,$3::jsonb,$4::jsonb) AS result',[orgId,jobId,JSON.stringify(expected),JSON.stringify(members)])).rows[0].result;}
 await actor(owner);
 const saved=await save(empty,assignments);
 assert.equal(saved.manager_id,pm);assert.equal(saved.members.length,2);
 assert.equal((await db.query('SELECT project_manager_id FROM jobs WHERE id=$1',[job])).rows[0].project_manager_id,pm);
 assert.equal((await db.query('SELECT * FROM audit_events')).rows.length,1);
 await save(empty,assignments);assert.equal((await db.query('SELECT * FROM audit_events')).rows.length,1,'retry is idempotent');
 await assert.rejects(save(empty,[{user_id:worker,role:'observer'}]),/team changed/);
 for(const bad of [[{user_id:inactive,role:'worker'}],[{user_id:outsider,role:'worker'}]])await assert.rejects(save(saved,bad),/active company/);
 await assert.rejects(save(saved,[{user_id:worker,role:'admin'}]),/Invalid job role/);
 await assert.rejects(save(saved,[{user_id:worker,role:'worker'},{user_id:worker,role:'worker'}]),/Duplicate/);
 await assert.rejects(save(saved,[{user_id:worker,role:'project_manager'},{user_id:pm,role:'project_manager'}]),/one project manager/);
 await assert.rejects(save(empty,[],org,otherJob),/Job unavailable/);
 await assert.rejects(save(empty,[],org,archivedJob),/Job unavailable/);
 await assert.rejects(db.query("INSERT INTO job_members(job_id,organisation_id,user_id,role) VALUES($1,$2,$3,'worker')",[job,org,outsider]),/row-level security/,'direct insert cannot bypass membership validation');
 await actor(pm);await save(saved,assignments);
 await actor('');await assert.rejects(save(saved,[]),/permission/);
 await actor(worker);await assert.rejects(save(saved,[]),/permission/);
 await actor(outsider);await assert.rejects(save(saved,[]),/permission/);
 await actor(owner);await db.exec('RESET ROLE');await db.query('UPDATE workspace_access SET writable=false WHERE organisation_id=$1',[org]);await db.exec('SET ROLE authenticated');await assert.rejects(save(saved,[]),/writable/);
 await db.exec('RESET ROLE');await db.query('UPDATE workspace_access SET writable=true WHERE organisation_id=$1',[org]);await db.exec('SET ROLE authenticated');
 // An audit failure rolls back the team and recorded manager, not merely the audit insert.
 await db.exec('RESET ROLE');await db.exec("ALTER TABLE audit_events ADD CONSTRAINT test_audit_failure CHECK(action<>'job_team_updated') NOT VALID");await db.exec('SET ROLE authenticated');
 await assert.rejects(save(saved,[]),/test_audit_failure/);
 assert.equal((await db.query('SELECT * FROM job_members')).rows.length,2);
 assert.equal((await db.query('SELECT project_manager_id FROM jobs WHERE id=$1',[job])).rows[0].project_manager_id,pm);
 await db.exec('RESET ROLE');await db.exec('ALTER TABLE audit_events DROP CONSTRAINT test_audit_failure');await db.exec('SET ROLE authenticated');
 const cleared=await save(saved,[]);assert.deepEqual(cleared,empty);assert.equal((await db.query('SELECT * FROM job_members')).rows.length,0);
 await db.exec('RESET ROLE');await db.exec('SET ROLE anon');await assert.rejects(save(empty,[]),/permission denied/);
 } finally {await db.close();}
});
