import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

test('contractor submissions bind accepted links to private unapproved records, expiry and revocation',async()=>{
 const db=new PGlite();
 try {
 await db.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE SCHEMA procurement_private;CREATE SCHEMA storage;
 CREATE TABLE public.organisations(id uuid PRIMARY KEY,name text);
 CREATE TABLE public.organisation_members(organisation_id uuid,user_id uuid,status text,role text);
 CREATE TABLE public.workspace_access(organisation_id uuid PRIMARY KEY,writable boolean);
 CREATE FUNCTION public.org_has_write_access(p_org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT COALESCE((SELECT writable FROM public.workspace_access WHERE organisation_id=p_org),false)$$;
 CREATE TABLE public.workforce_people(id uuid PRIMARY KEY,organisation_id uuid,email text,passport_status text,archived_at timestamptz,updated_at timestamptz DEFAULT now(),revision integer DEFAULT 1);
 CREATE TABLE public.workforce_history(organisation_id uuid,person_id uuid,actor_id uuid NOT NULL,action text,reason text,after_record jsonb);
 CREATE TABLE public.workforce_documents(id uuid PRIMARY KEY,organisation_id uuid,person_id uuid,name text,category text,bucket text,object_path text,original_filename text,mime_type text,size_bytes integer,visibility text,review_status text,uploaded_by uuid,uploaded_at timestamptz DEFAULT now(),archived_at timestamptz);
 CREATE TABLE public.audit_events(organisation_id uuid,actor_id uuid,action text,entity_type text,entity_id uuid,change_summary jsonb,note text,source text);
 CREATE TABLE storage.buckets(id text PRIMARY KEY,public boolean);CREATE TABLE storage.objects(bucket_id text,name text,metadata jsonb);
 INSERT INTO storage.buckets VALUES('documents',false);
 GRANT USAGE ON SCHEMA public,auth,storage TO service_role;
 GRANT SELECT ON public.organisations,public.organisation_members,public.workforce_people,storage.buckets,storage.objects TO service_role;
 GRANT SELECT,INSERT ON public.workforce_documents,public.audit_events TO service_role;
 ALTER TABLE public.workforce_documents ENABLE ROW LEVEL SECURITY;`);
 await db.exec(await fs.readFile(new URL('../supabase/migrations/20261021114650_workforce_invitations.sql',import.meta.url),'utf8'));
 await db.exec(await fs.readFile(new URL('../supabase/migrations/20261025155351_contractor_document_submission.sql',import.meta.url),'utf8'));
 const uid=n=>`00000000-0000-4000-a000-${String(n).padStart(12,'0')}`;
 const org=uid(1),actor=uid(2),person=uid(3),invite=uid(4),otherInvite=uid(5),otherPerson=uid(6),pending=uid(7),docId=uid(8);const token='a'.repeat(64),otherToken='b'.repeat(64),pendingToken='c'.repeat(64);
 await db.query('INSERT INTO auth.users VALUES($1)',[actor]);
 await db.query("INSERT INTO organisations VALUES($1,'Company')",[org]);
 await db.query("INSERT INTO organisation_members VALUES($1,$2,'active','owner')",[org,actor]);await db.query('INSERT INTO workspace_access VALUES($1,true)',[org]);
 await db.query("INSERT INTO workforce_people(id,organisation_id,email,passport_status) VALUES($1,$2,'worker@example.invalid','in_progress'),($3,$2,'other@example.invalid','in_progress')",[person,org,otherPerson]);
 await db.query("INSERT INTO procurement_private.workforce_invitations(id,organisation_id,person_id,actor_id,email,token_hash,status) VALUES($1,$2,$3,$4,'worker@example.invalid',$5,'accepted'),($6,$2,$7,$4,'other@example.invalid',$8,'accepted'),($9,$2,$3,$4,'worker@example.invalid',$10,'pending')",[invite,org,person,actor,token,otherInvite,otherPerson,otherToken,pending,pendingToken]);
 const document={name:'Insurance',category:'insurance',filename:'insurance.pdf',mime:'application/pdf',size:20,sha256:'d'.repeat(64)};
 const call=async(action,data)=> (await db.query('SELECT public.contractor_document_operation($1,$2::jsonb) AS result',[action,JSON.stringify(data)])).rows[0].result;
 async function service(){await db.exec('SET ROLE service_role');}async function admin(){await db.exec('RESET ROLE');}
 await service();await assert.rejects(call('list',{token_hash:pendingToken}),/unavailable/);
 const prepared=await call('prepare',{token_hash:token,id:docId,document});assert.match(prepared.path,new RegExp(`${org}/workforce/${person}/${docId}/file`));assert.equal(prepared.registered,false);
 await assert.rejects(call('complete',{token_hash:token,id:docId}),/Verified private file/);
 await assert.rejects(call('prepare',{token_hash:otherToken,id:docId,document}),/does not match/);
 await admin();await db.query('INSERT INTO storage.objects VALUES($1,$2,$3::jsonb)',['documents',prepared.path,JSON.stringify({size:20,mimetype:'application/pdf'})]);await service();
 await call('complete',{token_hash:token,id:docId});await call('complete',{token_hash:token,id:docId});
 const stored=(await db.query('SELECT * FROM public.workforce_documents')).rows;assert.equal(stored.length,1);assert.equal(stored[0].visibility,'restricted');assert.equal(stored[0].review_status,'awaiting_review');assert.equal(stored[0].uploaded_by,null);assert.equal(stored[0].submission_source,'contractor_invitation');
 const audits=(await db.query('SELECT * FROM audit_events')).rows;assert.equal(audits.length,1);assert.equal(audits[0].actor_id,null,'do not falsely attribute the contractor upload to the inviter');
 const own=await call('list',{token_hash:token});assert.equal(own.documents.length,1);assert.ok(!JSON.stringify(own).includes(prepared.path));assert.ok(!JSON.stringify(own).includes(token));
 assert.equal((await call('list',{token_hash:otherToken})).documents.length,0,'another accepted link cannot see the first recipient documents');
 await assert.rejects(call('prepare',{token_hash:token,id:uid(9),document:{...document,category:'bank_change'}}),/Invalid document/);
 for(let n=20;n<39;n++)await call('prepare',{token_hash:token,id:uid(n),document});
 await assert.rejects(call('prepare',{token_hash:token,id:uid(39),document}),/upload limit/);
 await admin();await db.query("UPDATE workforce_people SET passport_status='restricted' WHERE id=$1",[person]);await service();await assert.rejects(call('list',{token_hash:token}),/unavailable/);
 await admin();await db.query("UPDATE workforce_people SET passport_status='in_progress',email='changed@example.invalid' WHERE id=$1",[person]);await service();await assert.rejects(call('list',{token_hash:token}),/unavailable/);
 await admin();await db.query("UPDATE workforce_people SET email='worker@example.invalid' WHERE id=$1",[person]);await db.query('UPDATE workspace_access SET writable=false WHERE organisation_id=$1',[org]);await service();await assert.rejects(call('list',{token_hash:token}),/unavailable/);
 await admin();await db.query('UPDATE workspace_access SET writable=true WHERE organisation_id=$1',[org]);await db.query("UPDATE organisation_members SET status='removed' WHERE user_id=$1",[actor]);await service();await assert.rejects(call('list',{token_hash:token}),/unavailable/);
 await admin();await db.query("UPDATE organisation_members SET status='active' WHERE user_id=$1",[actor]);await service();
 await admin();await db.query("UPDATE procurement_private.contractor_document_submissions SET created_at=now()-interval '2 days' WHERE invitation_id=$1",[invite]);await service();
 assert.deepEqual(await call('cleanup_list',{}),[],'old reservations on valid invitations remain resumable');
 // Accepted links can be revoked by the company; registered documents are retained.
 await db.query('SELECT public.workforce_invitation_operation($1,$2::jsonb)',['revoke',JSON.stringify({organisation_id:org,actor_id:actor,id:invite})]);
 await assert.rejects(call('list',{token_hash:token}),/unavailable/);
 await admin();await db.query("UPDATE procurement_private.contractor_document_submissions SET created_at=now()-interval '2 days' WHERE invitation_id=$1",[invite]);await service();
 const expired=await call('cleanup_list',{});assert.equal(expired.length,19);assert.ok(!expired.some(row=>row.id===docId));await call('cleanup_complete',{id:expired[0].id});
 assert.equal((await db.query('SELECT * FROM workforce_documents')).rows.length,1,'cleanup never removes registered worker documents');
 await admin();await db.query("UPDATE procurement_private.workforce_invitations SET expires_at=now()-interval '1 second' WHERE id=$1",[otherInvite]);await service();await assert.rejects(call('list',{token_hash:otherToken}),/unavailable/);
 await admin();await db.exec('SET ROLE authenticated');await assert.rejects(call('list',{token_hash:token}),/permission denied/);await admin();await db.exec('SET ROLE anon');await assert.rejects(call('list',{token_hash:token}),/permission denied/);
 }finally{await db.close();}
});
