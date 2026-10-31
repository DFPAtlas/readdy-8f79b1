import {PGlite} from '@electric-sql/pglite';import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
test('offline exports require an active saved assignment and contain only job summary plus the caller tasks',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE SCHEMA procurement_private;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE TABLE organisation_members(organisation_id uuid,user_id uuid,status text,role text);CREATE TABLE job_members(organisation_id uuid,job_id uuid,user_id uuid);
 CREATE TABLE organisations(id uuid PRIMARY KEY,name text,archived_at timestamptz);
 CREATE TABLE jobs(id uuid PRIMARY KEY,organisation_id uuid,archived_at timestamptz,reference text,project_name text,status text,progress integer,target_completion_date date,access_notes text,estimated_value_pence integer);
 CREATE TABLE procurement_private.job_tasks(id uuid PRIMARY KEY,organisation_id uuid,job_id uuid,assignee_id uuid,title text,details text,status text,due_date date,internal_note text);
 GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;`);
 await db.exec(await fs.readFile(new URL('../supabase/migrations/20261031110649_offline_job_snapshots.sql',import.meta.url),'utf8'));
 const ids=Array.from({length:10},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);const [org,other,user,otherUser,manager,job,otherJob,task,foreignTask]=ids;
 await db.query("INSERT INTO organisations VALUES($1,'Company',null),($2,'Other',null)",[org,other]);
 await db.query("INSERT INTO organisation_members VALUES($1,$2,'active','worker'),($1,$3,'active','worker'),($1,$4,'active','owner')",[org,user,otherUser,manager]);
 await db.query("INSERT INTO jobs VALUES($1,$2,null,'J1','Project','in_progress',30,null,'secret access code',999999),($3,$4,null,'J2','Other','completed',100,null,'private',1111)",[job,org,otherJob,other]);
 await db.query('INSERT INTO job_members VALUES($1,$2,$3),($1,$2,$4)',[org,job,user,otherUser]);
 await db.query("INSERT INTO procurement_private.job_tasks VALUES($1,$2,$3,$4,'Own task','Assigned instructions','pending',null,'not exported'),($5,$2,$3,$6,'Other task','Other private instructions','pending',null,'not exported')",[task,org,job,user,foreignTask,otherUser]);
 async function actor(id){await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('SET ROLE authenticated');}
 async function snapshot(o=org,j=job,validate=false){return(await db.query('SELECT get_offline_job_snapshot($1,$2,$3) result',[o,j,validate])).rows[0].result;}
 await actor(manager);await assert.rejects(snapshot(),/assignment/);await actor(user);const data=await snapshot();assert.equal(data.user_id,user);assert.equal(data.tasks.length,1);assert.equal(data.tasks[0].title,'Own task');assert.equal(Date.parse(data.expires_at)-Date.parse(data.generated_at),86400000);
 const text=JSON.stringify(data);for(const secret of ['access_notes','estimated_value_pence','secret access code','Other private instructions','internal_note'])assert.ok(!text.includes(secret));
 assert.deepEqual(Object.keys(data.job).sort(),['id','name','progress','reference','status','target_date']);assert.equal((await snapshot(org,job,true)).allowed,true);
 await assert.rejects(snapshot(other,otherJob),/assignment/);await assert.rejects(snapshot(org,otherJob),/assignment/);await assert.rejects(db.exec('SELECT * FROM procurement_private.job_tasks'),/permission denied/);
 await db.exec('RESET ROLE');await db.query("INSERT INTO procurement_private.job_tasks(id,organisation_id,job_id,assignee_id,title,details,status) SELECT gen_random_uuid(),$1,$2,$3,'Task','Text','pending' FROM generate_series(1,1000)",[org,job,user]);await actor(user);await assert.rejects(snapshot(),/too many/);assert.equal((await snapshot(org,job,true)).allowed,true);
 await db.exec('RESET ROLE');await db.query('UPDATE jobs SET archived_at=now() WHERE id=$1',[job]);await actor(user);await assert.rejects(snapshot(),/unavailable/);
 await db.exec('RESET ROLE');await db.query('UPDATE jobs SET archived_at=null WHERE id=$1',[job]);await db.query("UPDATE organisation_members SET status='removed' WHERE user_id=$1",[user]);await actor(user);await assert.rejects(snapshot(),/assignment/);
 await db.exec('RESET ROLE;SET ROLE anon');await assert.rejects(snapshot(),/permission denied/);await db.exec('RESET ROLE;SET ROLE service_role');await assert.rejects(snapshot(),/permission denied/);
 }finally{await db.close();}
});
