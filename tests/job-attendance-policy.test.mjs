import {PGlite} from '@electric-sql/pglite';import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
test('attendance uses server times, prevents overlapping company records and protects closures and retries',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE SCHEMA procurement_private;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE TABLE organisations(id uuid PRIMARY KEY,archived_at timestamptz);
 CREATE TABLE organisation_members(organisation_id uuid,user_id uuid,status text,role text);CREATE TABLE profiles(id uuid PRIMARY KEY,full_name text);
 CREATE TABLE organisation_subscriptions(organisation_id uuid,access_state text,status text,trial_end timestamptz);
 CREATE FUNCTION org_has_write_access(p_org uuid) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT true$$;
 CREATE TABLE jobs(id uuid PRIMARY KEY,organisation_id uuid,archived_at timestamptz,reference text,project_name text);
 CREATE TABLE job_members(job_id uuid,organisation_id uuid,user_id uuid,role text);
 CREATE TABLE audit_events(organisation_id uuid,actor_id uuid,action text,entity_type text,entity_id uuid,change_summary jsonb,source text);
 GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;`);
 await db.exec(await fs.readFile(new URL('../supabase/migrations/20261031092821_mobile_job_attendance.sql',import.meta.url),'utf8'));
 const ids=Array.from({length:16},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
 const [org,other,manager,worker,worker2,outsider,job,job2,foreignJob,record,start2,request,request2,record2]=ids;
 await db.query('INSERT INTO auth.users SELECT unnest($1::uuid[])',[[manager,worker,worker2,outsider]]);await db.query('INSERT INTO organisations(id) VALUES($1),($2)',[org,other]);
 await db.query("INSERT INTO organisation_members VALUES($1,$2,'active','project_manager'),($1,$3,'active','employee'),($1,$4,'active','employee'),($5,$6,'active','owner')",[org,manager,worker,worker2,other,outsider]);
 await db.query("INSERT INTO jobs VALUES($1,$2,null,'J1','Job One'),($3,$2,null,'J2','Job Two'),($4,$5,null,'J3','Foreign')",[job,org,job2,foreignJob,other]);
 await db.query("INSERT INTO job_members VALUES($1,$2,$3,'worker'),($4,$2,$3,'worker'),($1,$2,$5,'worker')",[job,org,worker,job2,worker2]);
 async function actor(id){await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('SET ROLE authenticated');}
 async function call(action,data={},j=job,o=org){return(await db.query('SELECT public.manage_job_attendance($1,$2,$3,$4::jsonb) r',[o,j,action,JSON.stringify(data)])).rows[0].r;}
 await actor(outsider);await assert.rejects(call('list'),/membership/);await actor(manager);await assert.rejects(call('start',{id:record}),/assignment/);
 await actor(worker);await assert.rejects(call('start',{id:record},foreignJob),/assignment/);
 const first=await call('start',{id:record,started_at:'2000-01-01T00:00:00Z'});assert.ok(Date.parse(first.started_at)>Date.parse('2020-01-01'));assert.equal(first.ended_at,null);assert.deepEqual(await call('start',{id:record}),first);
 await assert.rejects(call('start',{id:start2},job2),/open attendance/);assert.equal((await call('list',{},null)).current.id,record);
 await assert.rejects(db.exec('SELECT * FROM procurement_private.job_attendance'),/permission denied/);
 await actor(worker2);assert.equal((await call('list',{},null)).total,0);await assert.rejects(call('finish',{id:record,request_id:request}),/unavailable/);
 await actor(manager);assert.equal((await call('list')).total,1);await assert.rejects(call('finish',{id:record,request_id:request}),/reason/);
 await db.exec('RESET ROLE');await db.query("INSERT INTO organisation_subscriptions VALUES($1,'billing_locked','active',null)",[org]);await db.query('DELETE FROM job_members WHERE user_id=$1',[worker]);await db.query('UPDATE jobs SET archived_at=now() WHERE id=$1',[job]);
 await actor(worker);const finished=await call('finish',{id:record,request_id:request});assert.ok(Date.parse(finished.ended_at)>=Date.parse(first.started_at));assert.deepEqual(await call('finish',{id:record,request_id:request}),finished);await assert.rejects(call('finish',{id:record,request_id:request2}),/already finished/);await assert.rejects(call('start',{id:start2},job2),/Writable/);
 await db.exec('RESET ROLE');assert.equal((await db.query('SELECT * FROM audit_events')).rows.length,2);await db.exec('DELETE FROM organisation_subscriptions');await db.query('UPDATE jobs SET archived_at=null WHERE id=$1',[job]);await db.query("INSERT INTO job_members VALUES($1,$2,$3,'worker')",[job,org,worker]);
 await actor(worker);await call('start',{id:record2});await db.exec('RESET ROLE');await db.query("UPDATE organisation_members SET status='removed' WHERE user_id=$1",[worker]);await actor(worker);await assert.rejects(call('finish',{id:record2,request_id:request2}),/membership/);
 await actor(manager);await db.exec('RESET ROLE');await db.exec("ALTER TABLE audit_events ADD CONSTRAINT test_audit_failure CHECK(action<>'job_attendance_finish') NOT VALID");await actor(manager);await assert.rejects(call('finish',{id:record2,request_id:request2,reason:'Account removed'}),/test_audit_failure/);assert.equal((await call('list')).rows.find(r=>r.id===record2).ended_at,null);
 await db.exec('RESET ROLE');await db.exec('ALTER TABLE audit_events DROP CONSTRAINT test_audit_failure');await actor(manager);const closed=await call('finish',{id:record2,request_id:request2,reason:'Account removed'});assert.ok(closed.ended_at);assert.deepEqual(await call('finish',{id:record2,request_id:request2,reason:'Account removed'}),closed);
 await db.exec('RESET ROLE;SET ROLE anon');await assert.rejects(call('list'),/permission denied/);
 }finally{await db.close();}
});
