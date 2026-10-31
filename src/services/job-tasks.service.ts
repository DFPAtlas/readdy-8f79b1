import { getSupabase } from '@/lib/supabase';
export type TaskStatus='pending'|'in_progress'|'blocked'|'completed'|'cancelled';
export type JobTask={id:string;organisation_id:string;job_id:string;title:string;details:string;assignee_id:string;due_date:string|null;status:TaskStatus;revision:number;job_reference:string;project_name:string;assignee_name:string};
export type TaskList={tasks:JobTask[];people:{id:string;name:string}[];total:number;offset:number;can_manage:boolean};
type Client={rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:unknown;error:unknown}>};
async function call(orgId:string,jobId:string|null,action:string,data:Record<string,unknown>){
 const client=getSupabase() as unknown as Client|null;if(!client)throw new Error('Connection unavailable');
 const result=await client.rpc('manage_job_tasks',{p_org:orgId,p_job:jobId,p_action:action,p_data:data});if(result.error)throw result.error;return result.data;
}
export async function loadJobTasks(orgId:string,jobId:string|null,offset:number):Promise<TaskList>{
 const data=await call(orgId,jobId,'list',{offset}) as TaskList;
 if(!data||!Array.isArray(data.tasks)||!Array.isArray(data.people)||!Number.isSafeInteger(data.total)||data.total<0||data.offset!==offset||typeof data.can_manage!=='boolean'||data.tasks.some(t=>t.organisation_id!==orgId||(jobId!==null&&t.job_id!==jobId)))throw new Error('Task list unconfirmed');return data;
}
export async function mutateJobTask(orgId:string,jobId:string,action:string,data:Record<string,unknown>){
 const receipt=await call(orgId,jobId,action,data) as {id:string;revision:number;status:TaskStatus};
 if(!receipt||receipt.id!==data.id||!Number.isSafeInteger(receipt.revision)||receipt.revision<1||!['pending','in_progress','blocked','completed','cancelled'].includes(receipt.status))throw new Error('Task save unconfirmed');
 if(action!=='create'&&(receipt.revision!==Number(data.revision)+1||receipt.status!==(action==='reassign'?'pending':data.status)))throw new Error('Task save unconfirmed');
 return receipt;
}
