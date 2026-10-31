export type OfflineJobSnapshot={kind:'bn_offline_job_v1';user_id:string;organisation_id:string;company_name:string;generated_at:string;expires_at:string;job:{id:string;reference:string;name:string;status:string;progress:number|null;target_date:string|null};tasks:{id:string;title:string;details:string;status:string;due_date:string|null}[]};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function object(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Invalid snapshot');return v as Record<string,unknown>;}
function text(v:unknown,max:number):string{if(typeof v!=='string'||v.length>max)throw new Error('Invalid snapshot text');return v;}
function id(v:unknown):string{const s=text(v,36);if(!uuid.test(s))throw new Error('Invalid snapshot identity');return s;}
function date(v:unknown):string|null{if(v===null)return null;const s=text(v,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s)))throw new Error('Invalid snapshot date');return s;}
export function snapshotId(user:string,org:string,job:string){return `bn-job-pack:${user}:${org}:${job}`;}
/** Pick an explicit allowlist again before putting data on the device. */
export function decodeOfflineSnapshot(value:unknown,user:string,org:string,jobId:string,now=Date.now()):OfflineJobSnapshot{
 const v=object(value),j=object(v.job);const generated=Date.parse(text(v.generated_at,40)),expires=Date.parse(text(v.expires_at,40));
 if(v.kind!=='bn_offline_job_v1'||id(v.user_id)!==user||id(v.organisation_id)!==org||id(j.id)!==jobId||!Number.isFinite(generated)||!Number.isFinite(expires)||expires-generated!==86400000||generated>now+300000||expires<=now)throw new Error('Snapshot is invalid or expired');
 if(j.progress!==null&&(typeof j.progress!=='number'||!Number.isFinite(j.progress)||j.progress<0||j.progress>100))throw new Error('Invalid progress');
 if(!Array.isArray(v.tasks)||v.tasks.length>1000)throw new Error('Invalid task count');
 const tasks=v.tasks.map(value=>{const t=object(value);const status=text(t.status,30);if(!['pending','in_progress','blocked','completed','cancelled'].includes(status))throw new Error('Invalid task status');return {id:id(t.id),title:text(t.title,160),details:text(t.details,2000),status,due_date:date(t.due_date)};});
 if(new Set(tasks.map(t=>t.id)).size!==tasks.length)throw new Error('Duplicate snapshot tasks');
 const result:OfflineJobSnapshot={kind:'bn_offline_job_v1',user_id:user,organisation_id:org,company_name:text(v.company_name,1000),generated_at:new Date(generated).toISOString(),expires_at:new Date(expires).toISOString(),job:{id:jobId,reference:text(j.reference,200),name:text(j.name,1000),status:text(j.status,80),progress:j.progress as number|null,target_date:date(j.target_date)},tasks};
 if(new TextEncoder().encode(JSON.stringify(result)).length>3000000)throw new Error('Snapshot too large');return result;
}
