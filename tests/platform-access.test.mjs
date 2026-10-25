import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source = (await fs.readFile(new URL('../src/services/platform-access.service.ts',import.meta.url),'utf8')).replace("import { getSupabase } from '@/lib/supabase';", 'const getSupabase = () => globalThis.__platformAccessClient;');
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const { loadPlatformAccess } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
function client(staff, level='aal1', error=null) {
 const filters=[]; let authCalls=0;
 const builder={select(){return builder;},eq(k,v){filters.push([k,v]);return builder;},async maybeSingle(){return {data:staff,error};}};
 const value={from(table){assert.equal(table,'platform_staff');return builder;},auth:{mfa:{async getAuthenticatorAssuranceLevel(){authCalls++; return {data:{currentLevel:level},error:null};}}}};
 return {value,filters,get authCalls(){return authCalls;}};
}
test('platform access uses active staff identity and actual session assurance, without promoting roles', async () => {
 const c=client({id:'staff',role:'platform_support',status:'active'},'aal1'); globalThis.__platformAccessClient=c.value;
 assert.deepEqual(await loadPlatformAccess('actor'),{role:'platform_support',assurance:'aal1'});
 assert.deepEqual(c.filters,[['user_id','actor'],['status','active']]);
 const verified=client({id:'staff',role:'platform_security',status:'active'},'aal2');globalThis.__platformAccessClient=verified.value;
 assert.deepEqual(await loadPlatformAccess('actor'),{role:'platform_security',assurance:'aal2'});
});
test('missing, denied or unrecognised platform staff records fail closed', async () => {
 for (const staff of [null,{id:'staff',role:'owner',status:'active'}]) {
  const c=client(staff);globalThis.__platformAccessClient=c.value;await assert.rejects(loadPlatformAccess('actor'),/staff access required/);assert.equal(c.authCalls,0);
 }
 const denied=client(null,'aal1',new Error('denied'));globalThis.__platformAccessClient=denied.value;await assert.rejects(loadPlatformAccess('actor'),/denied/);
 globalThis.__platformAccessClient=null;await assert.rejects(loadPlatformAccess('actor'),/Backend unavailable/);
});
