import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import { unzipSync, strFromU8 } from 'fflate';
import { PDFDocument } from 'pdf-lib';
const compile = source => ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
let generator=compile(await fs.readFile(new URL('../src/lib/evidence-pack.ts',import.meta.url),'utf8'));
for(const name of ['pdf-lib','fflate']) generator=generator.replace(`from '${name}'`,`from '${import.meta.resolve(name)}'`);
const generatorUrl=url(generator),{buildEvidenceArchive}=await import(generatorUrl);
const register=compile((await fs.readFile(new URL('../src/services/evidence-register.service.ts',import.meta.url),'utf8')).replace("import { getSupabase } from '@/lib/supabase';",'const getSupabase=()=>globalThis.__packClient;'));
let source=compile((await fs.readFile(new URL('../src/services/evidence-pack.service.ts',import.meta.url),'utf8')).replace("import { getSupabase } from '@/lib/supabase';",'const getSupabase=()=>globalThis.__packClient;'));
source=source.replace("'./evidence-register.service'",JSON.stringify(url(register))).replace("'@/lib/evidence-pack'",JSON.stringify(generatorUrl));
const {prepareEvidencePack}=await import(url(source));
const record={id:'record-1',organisation_id:'org',job_id:'job',evidence_type:'photo',caption:'Site proof',project_stage:null,captured_at:null,captured_by:'user',visibility:'internal_only',review_status:'submitted',location_label:null,internal_note:'Private note'};
const payload=new TextEncoder().encode('%PDF-1.7 original evidence');
const file={id:'file-1',evidence_id:record.id,organisation_id:'org',bucket:'job-evidence',object_path:`org/job/${record.id}/file-1-proof.pdf`,original_filename:'../../proof.pdf',mime_type:'application/pdf',size_bytes:payload.length};
const page={rows:[record],total:1,offset:0},job={id:'job',reference:'J1',project_name:'Project'};
function fixture(options={}) {
 const calls=[],downloads=[];let checks=0;
 globalThis.__packClient={auth:{async getUser(){checks++;return {data:{user:{id:options.switchAfter && checks>=options.switchAfter?'other':'user'}},error:null};}},from(table){const call={table,filters:[]};calls.push(call);const q={select(){return q;},eq(k,v){call.filters.push([k,v]);return q;},is(k,v){call.filters.push([k,v]);return q;},in(k,v){call.filters.push([k,v]);return q;},order(){return q;},limit(){const data=table==='evidence_records'?(options.records ?? [record]):(options.files ?? [file]);return Promise.resolve({data,count:options.count ?? data.length,error:options.denied?new Error('private database error'):null});}};return q;},storage:{from(bucket){return {async download(path){downloads.push({bucket,path});return {data:new Blob([options.bytes ?? payload]),error:options.failDownload?new Error('private storage error'):null};}};}}};
 return {calls,downloads};
}
test('internal packs contain a readable PDF index, exact original bytes and a checksum manifest without storage paths',async()=>{
 const f=fixture();const bytes=await prepareEvidencePack('org','user',job,[record.id],page);const entries=unzipSync(bytes);
 const manifest=JSON.parse(strFromU8(entries['register.json']));assert.equal(manifest.audience,'internal');assert.equal(manifest.scope.completeJobExport,false);assert.equal(manifest.scope.accessibleFilesOnly,true);
 assert.deepEqual(entries[manifest.files[0].archivePath],payload);assert.equal(manifest.files[0].sha256,Buffer.from(await crypto.subtle.digest('SHA-256',payload)).toString('hex'));
 assert.ok(!Object.keys(entries).some(path=>path.split('/').includes('..')));assert.ok(!JSON.stringify(manifest).includes(file.object_path));assert.equal(manifest.records[0].internalNote,'Private note');
 const pdf=await PDFDocument.load(entries['index.pdf']);assert.ok(pdf.getPageCount()>=1);assert.equal(pdf.getTitle(),'BuildNerve evidence pack - J1');
 assert.equal(f.downloads.length,1);assert.deepEqual(f.calls[0].filters,[['organisation_id','org'],['job_id','job'],['archived_at',null],['id',[record.id]]]);
 assert.deepEqual(f.calls[1].filters,[['organisation_id','org'],['evidence_id',[record.id]],['archived_at',null]]);
});
test('packs stop on missing records, foreign storage, denied reads, oversized or incomplete files and account changes',async()=>{
 for(const options of [{records:[]},{denied:true},{files:[{...file,bucket:'documents'}]},{files:[{...file,object_path:'other/job/record/file'}]},{files:[{...file,size_bytes:51*1024*1024}]},{failDownload:true},{bytes:new Uint8Array(1)},{switchAfter:3}]) {
  fixture(options);await assert.rejects(prepareEvidencePack('org','user',job,[record.id],page));
 }
 fixture();await assert.rejects(prepareEvidencePack('org','user',job,[record.id],page,()=>true),/cancelled/);
 fixture({files:Array.from({length:101},(_,n)=>({...file,id:`file-${n}`}))});await assert.rejects(prepareEvidencePack('org','user',job,[record.id],page),/100 files/);
});
test('PDF indexes paginate long notes, preserve source Unicode in JSON and support records with no accessible files',async()=>{
 const records=[{id:'r',caption:'Long project (test) \\ Ω',evidenceType:'written_note',capturedAt:null,capturedByUserId:null,projectStage:null,visibility:'internal_only',reviewStatus:'submitted',locationLabel:null,internalNote:'Long note '.repeat(1500)}];
 const bytes=await buildEvidenceArchive({organisationId:'org',job:{id:'job',reference:'J1',project:'Project'},generatedAt:'2026-10-29T09:20:00Z',selectionPage:1,records,files:[]});
 const entries=unzipSync(bytes),pdf=await PDFDocument.load(entries['index.pdf']);assert.ok(pdf.getPageCount()>1);assert.equal(JSON.parse(strFromU8(entries['register.json'])).records[0].caption,records[0].caption);
});
