import {PGlite} from '@electric-sql/pglite';import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
test('job tasks enforce active company/job assignment, manager actions, revisions, retry receipts and audit rollback',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE SCHEMA procurement_private;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE TABLE organisations(id uuid PRIMARY KEY,archived_at timestamptz);
 CREATE TABLE organisation_members(organisation_id uuid,user_id uuid,status text,role text);
 CREATE TABLE profiles(id uuid PRIMARY KEY,full_name text);
 CREATE TABLE organisation_subscriptions(organisation_id uuid,access_state text,status text,trial_end timestamptz);
 CREATE FUNCTION org_has_write_access(p_org uuid) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT true$$;
 CREATE TABLE jobs(id uuid PRIMARY KEY,organisation_id uuid,archived_at timestamptz,reference text,project_name text);
 CREATE TABLE job_members(job_id uuid,organisation_id uuid,user_id uuid,role text);
 CREATE TABLE audit_events(organisation_id uuid,actor_id uuid,action text,entity_type text,entity_id uuid,change_summary jsonb,source text);
 GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;`);
 await db.exec(await fs.readFile(new URL('../supabase/migrations/20261031091251_mobile_job_tasks.sql',import.meta.url),'utf8'));
 const ids=Array.from({length:15},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
 const [org,other,manager,worker,worker2,outsider,removed,job,otherJob,task,request,request2]=ids;
 await db.query('INSERT INTO auth.users SELECT unnest($1::uuid[])',[[manager,worker,worker2,outsider,removed]]);
 await db.query('INSERT INTO organisations(id) VALUES($1),($2)',[org,other]);
 await db.query("INSERT INTO organisation_members VALUES($1,$2,'active','project_manager'),($1,$3,'active','employee'),($1,$4,'active','employee'),($5,$6,'active','owner'),($1,$7,'removed','employee')",[org,manager,worker,worker2,other,outsider,removed]);
 await db.query("INSERT INTO jobs VALUES($1,$2,null,'J1','Real job'),($3,$4,null,'J2','Other company')",[job,org,otherJob,other]);
 await db.query("INSERT INTO job_members VALUES($1,$2,$3,'worker'),($1,$2,$4,'worker'),($1,$2,$5,'worker')",[job,org,worker,worker2,removed]);
 await db.query("INSERT INTO profiles VALUES($1,'Worker One'),($2,'Worker Two')",[worker,worker2]);
 const create={id:task,title:'Inspect entrance',details:'Confirm work completed',assignee_id:worker,due_date:'2026-11-03'};
 async function actor(id){await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('SET ROLE authenticated');}
 async function call(action,data={},o=org,j=job){return(await db.query('SELECT public.manage_job_tasks($1,$2,$3,$4::jsonb) r',[o,j,action,JSON.stringify(data)])).rows[0].r;}
 await actor(outsider);await assert.rejects(call('list'),/membership/);await actor(worker);await assert.rejects(call('create',create),/management/);
 await actor(manager);await assert.rejects(call('create',{...create,assignee_id:removed}),/active saved/);await assert.rejects(call('create',create,org,otherJob),/Job unavailable/);
 const first=await call('create',create);assert.equal(first.revision,1);await call('create',create);
 await db.exec('RESET ROLE');assert.equal((await db.query('SELECT * FROM audit_events')).rows.length,1);await actor(manager);
 const managerList=await call('list');assert.equal(managerList.tasks.length,1);assert.equal(managerList.people.length,2);assert.equal(managerList.tasks[0].assignee_name,'Worker One');assert.equal(managerList.can_manage,true);
 await assert.rejects(db.exec('SELECT * FROM procurement_private.job_tasks'),/permission denied/);
 await actor(worker2);assert.equal((await call('list',{},org,null)).total,0);await assert.rejects(call('status',{id:task,revision:1,request_id:request,status:'completed'}),/unavailable/);
 await actor(worker);assert.equal((await call('list',{},org,null)).total,1);
 const edit={id:task,revision:1,request_id:request,status:'in_progress'};
 const changed=await call('status',edit);assert.equal(changed.revision,2);assert.deepEqual(await call('status',edit),changed);
 await assert.rejects(call('status',{...edit,request_id:request2,status:'completed'}),/changed/);
 await assert.rejects(call('status',{...edit,revision:2,request_id:request2,status:'cancelled'}),/transition/);
 await actor(manager);const reassigned=await call('reassign',{id:task,revision:2,request_id:request2,assignee_id:worker2});assert.equal(reassigned.revision,3);assert.equal(reassigned.status,'pending');
 await actor(worker);assert.equal((await call('list',{},org,null)).total,0);await assert.rejects(call('status',{id:task,revision:3,request_id:request,status:'completed'}),/unavailable/);
 await actor(worker2);const complete=await call('status',{id:task,revision:3,request_id:request,status:'completed'});assert.equal(complete.revision,4);
 await assert.rejects(call('status',{id:task,revision:4,request_id:request2,status:'in_progress'}),/transition/);
 await actor(manager);await db.exec('RESET ROLE');await db.query("INSERT INTO organisation_subscriptions VALUES($1,'billing_locked','active',null)",[org]);await actor(manager);await assert.rejects(call('status',{id:task,revision:4,request_id:request2,status:'pending'}),/Writable/);
 await db.exec('RESET ROLE');await db.exec('DELETE FROM organisation_subscriptions');await db.exec("ALTER TABLE audit_events ADD CONSTRAINT test_audit_failure CHECK(action<>'job_task_status') NOT VALID");await actor(manager);
 await assert.rejects(call('status',{id:task,revision:4,request_id:request2,status:'pending'}),/test_audit_failure/);assert.equal((await call('list')).tasks[0].revision,4);
 await db.exec('RESET ROLE');await db.exec('ALTER TABLE audit_events DROP CONSTRAINT test_audit_failure');await db.query('DELETE FROM job_members WHERE user_id=$1',[worker2]);await actor(worker2);assert.equal((await call('list',{},org,null)).total,0);await assert.rejects(call('status',{id:task,revision:4,request_id:request2,status:'in_progress'}),/unavailable/);
 await db.exec('RESET ROLE');await db.query("UPDATE organisation_members SET status='removed' WHERE user_id=$1",[worker2]);await actor(worker2);await assert.rejects(call('list'),/membership/);
 await actor(manager);await db.exec('RESET ROLE');await db.query('UPDATE jobs SET archived_at=now() WHERE id=$1',[job]);await actor(manager);assert.equal((await call('list',{},org,null)).total,0);await assert.rejects(call('list'),/Job unavailable/);
 await db.exec('RESET ROLE;SET ROLE anon');await assert.rejects(call('list'),/permission denied/);
 }finally{await db.close();}
});
