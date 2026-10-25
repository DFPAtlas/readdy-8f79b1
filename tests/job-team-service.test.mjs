import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source=(await fs.readFile(new URL('../src/services/job-team.service.ts',import.meta.url),'utf8'))
 .replace("import { getSupabase } from '@/lib/supabase';",'const getSupabase=()=>globalThis.__jobTeamClient;')
 .replace("import { teamService, type TeamMemberRow } from './team.service';",'const teamService={listMembers:async(org)=>{globalThis.__teamOrg=org;return globalThis.__teamCandidates;}};');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {loadJobTeam,saveJobTeam,canonicalAssignments}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
function client(results) {
 const calls=[];
 return {calls,from(table){const call={table,filters:[]};calls.push(call);const builder={select(){return builder;},eq(k,v){call.filters.push([k,v]);return builder;},is(k,v){call.filters.push([k,v]);return builder;},order(){return builder;},single(){return Promise.resolve(results[table]);},then(resolve,reject){return Promise.resolve(results[table]).then(resolve,reject);}};return builder;}};
}
test('job team reads scope both job and assignments to the company and use actual member records',async()=>{
 globalThis.__teamCandidates=[{userId:'member',status:'active',fullName:'Member'}];
 const c=client({jobs:{data:{id:'job',project_manager_id:null},error:null},job_members:{data:[{user_id:'b',role:'worker'},{user_id:'a',role:'observer'}],error:null}});globalThis.__jobTeamClient=c;
 const loaded=await loadJobTeam('org','job');assert.equal(globalThis.__teamOrg,'org');assert.equal(loaded.candidates[0].fullName,'Member');assert.deepEqual(loaded.snapshot.members,canonicalAssignments([{user_id:'b',role:'worker'},{user_id:'a',role:'observer'}]));
 assert.deepEqual(c.calls[0].filters,[['organisation_id','org'],['id','job'],['archived_at',null]]);
 assert.deepEqual(c.calls[1].filters,[['organisation_id','org'],['job_id','job']]);
});
test('job-team failures never fall back to sample people or confirm missing saves',async()=>{
 globalThis.__jobTeamClient=client({jobs:{data:null,error:new Error('denied')},job_members:{data:[],error:null}});await assert.rejects(loadJobTeam('org','job'),/denied/);
 const expected={manager_id:null,members:[]};const selected=[{user_id:'member',role:'worker'}];let args;
 globalThis.__jobTeamClient={async rpc(name,fields){assert.equal(name,'replace_job_team');args=fields;return {data:{manager_id:null,members:selected},error:null};}};
 assert.deepEqual(await saveJobTeam('org','job',expected,selected),{manager_id:null,members:selected});assert.deepEqual(args,{p_org:'org',p_job:'job',p_expected:expected,p_members:selected});
 globalThis.__jobTeamClient={async rpc(){return {data:null,error:new Error('conflict')};}};await assert.rejects(saveJobTeam('org','job',expected,selected),/conflict/);
 globalThis.__jobTeamClient={async rpc(){return {data:null,error:null};}};await assert.rejects(saveJobTeam('org','job',expected,selected),/not confirmed/);
});
