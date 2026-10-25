import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
test('daily-log policy rejects cross-company jobs and spoofed authors without rewriting existing rows', async () => {
 const db = new PGlite();
 try {
 await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE TABLE public.jobs(id uuid PRIMARY KEY,organisation_id uuid,archived_at timestamptz);
 CREATE TABLE public.daily_logs(id uuid PRIMARY KEY,organisation_id uuid,job_id uuid,created_by uuid);
 ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY; ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
 CREATE POLICY jobs_read ON public.jobs FOR SELECT TO authenticated USING (true);
 CREATE POLICY logs_read ON public.daily_logs FOR SELECT TO authenticated USING (true);
 CREATE POLICY logs_write ON public.daily_logs FOR INSERT TO authenticated WITH CHECK (true);
 GRANT USAGE ON SCHEMA public,auth TO authenticated; GRANT SELECT ON public.jobs,public.daily_logs TO authenticated; GRANT INSERT ON public.daily_logs TO authenticated;`);
 const migration = await fs.readFile(new URL('../supabase/migrations/20261025134733_daily_log_company_boundary.sql',import.meta.url),'utf8');
 await db.exec(migration);
 const ids = Array.from({length: 9}, (_,i) => `00000000-0000-0000-0000-${String(i+1).padStart(12,'0')}`);
 const [actor, other, orgA, orgB, jobA, jobB, archivedJob] = ids;
 await db.query('INSERT INTO jobs VALUES ($1,$2,null),($3,$4,null),($5,$2,now())',[jobA,orgA,jobB,orgB,archivedJob]);
 await db.exec('SET ROLE authenticated'); await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[actor]);
 let n=20;
 const insert = (org,job,author=actor) => db.query('INSERT INTO daily_logs VALUES($1,$2,$3,$4)',[`00000000-0000-0000-0000-${String(n++).padStart(12,'0')}`,org,job,author]);
 await insert(orgA,jobA);
 await assert.rejects(insert(orgA,jobB),/row-level security/);
 await assert.rejects(insert(orgA,jobA,other),/row-level security/);
 await assert.rejects(insert(orgA,archivedJob),/row-level security/);
 assert.equal((await db.query('SELECT * FROM daily_logs')).rows.length,1);
 } finally { await db.close(); }
});
