import { getSupabase } from '@/lib/supabase';
import { EVIDENCE_REGISTER_COLUMNS, evidenceRegisterJson, type EvidenceRegisterPage } from './evidence-register.service';
import type { PackFile, PackRecord } from '@/lib/evidence-pack';

export async function prepareEvidencePack(orgId: string, userId: string, job: {id:string;reference:string;project_name:string}, selected: string[], page: EvidenceRegisterPage, cancelled: () => boolean = () => false): Promise<Uint8Array> {
  if (!selected.length || selected.length > 50 || new Set(selected).size !== selected.length || selected.some(id => !page.rows.some(row => row.id===id))) throw new Error('Select records from this page');
  const client = getSupabase(); if (!client) throw new Error('Backend not connected');
  async function checkAccount() { if (cancelled()) throw new Error('Export cancelled'); const {data,error} = await client!.auth.getUser(); if (error || data.user?.id !== userId || cancelled()) throw new Error('Your account changed or access expired. Start the export again.'); }
  await checkAccount();
  const records = await client.from('evidence_records').select(EVIDENCE_REGISTER_COLUMNS,{count:'exact'})
    .eq('organisation_id',orgId).eq('job_id',job.id).is('archived_at',null).in('id',selected).order('id').limit(50);
  if (records.error || records.count !== selected.length || !records.data || records.data.length !== selected.length) throw new Error('Some selected records are no longer available. Refresh and select again.');
  const register = JSON.parse(evidenceRegisterJson({...page,rows:records.data},selected,orgId,job)) as {records:PackRecord[]};
  const files = await client.from('evidence_files').select('id,evidence_id,organisation_id,bucket,object_path,original_filename,mime_type,size_bytes',{count:'exact'})
    .eq('organisation_id',orgId).in('evidence_id',selected).is('archived_at',null).order('id').limit(101);
  if (files.error || files.count === null || !files.data || files.data.length !== files.count) throw new Error('The evidence file list could not be confirmed.');
  if (files.count > 100) throw new Error('Pack limit is 100 files. Select fewer records.');
  let expectedBytes = 0;
  for (const file of files.data) {
    expectedBytes += file.size_bytes;
    if (!selected.includes(file.evidence_id) || file.organisation_id !== orgId || file.bucket !== 'job-evidence'
      || !file.object_path.startsWith(`${orgId}/${job.id}/${file.evidence_id}/`) || file.object_path.includes('..')
      || !Number.isSafeInteger(file.size_bytes) || file.size_bytes < 0 || expectedBytes > 50*1024*1024) throw new Error('File scope or pack size could not be confirmed. Maximum pack size is 50 MB.');
  }
  const downloaded: PackFile[] = [];
  for (const file of files.data) {
    await checkAccount();
    const result = await client.storage.from(file.bucket).download(file.object_path);
    if (result.error || !result.data || result.data.size !== file.size_bytes) throw new Error('An evidence file could not be downloaded completely. No pack was created.');
    downloaded.push({id:file.id,recordId:file.evidence_id,filename:file.original_filename,mimeType:file.mime_type,bytes:new Uint8Array(await result.data.arrayBuffer())});
  }
  await checkAccount();
  const {buildEvidenceArchive} = await import('@/lib/evidence-pack');
  const archive = await buildEvidenceArchive({organisationId:orgId,job:{id:job.id,reference:job.reference,project:job.project_name},
    generatedAt:new Date().toISOString(),selectionPage:page.offset/50+1,records:register.records,files:downloaded});
  await checkAccount();
  return archive;
}
