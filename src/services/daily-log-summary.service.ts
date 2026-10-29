import { getSupabase } from '@/lib/supabase';
import type { DailyLog } from './daily-logs.service';
export type SummaryAction = 'save' | 'review' | 'publish' | 'withdraw';
export interface ClientLogSummary { log_id: string; summary: string; state: 'draft' | 'reviewed' | 'published' | 'withdrawn'; revision: number; reviewed_at: string | null; published_at: string | null }
export interface DailySummaryState { source: DailyLog; summary: ClientLogSummary | null; stale: boolean; can_edit: boolean; can_review: boolean; client_name: string | null; client_id: string | null }
function backend() { const client=getSupabase();if(!client)throw new Error('Backend unavailable');return client; }
export async function loadDailySummary(orgId: string,jobId: string,logId: string): Promise<DailySummaryState> {
 const {data,error}=await backend().rpc('daily_log_summary',{p_org:orgId,p_job:jobId,p_log:logId,p_request:null,p_action:'read',p_data:{}});
 if(error)throw new Error('This summary could not be loaded. Check your staff access and try again.');
 const result=data as unknown as DailySummaryState | null;
 if(!result || !('summary' in result) || result.source?.id!==logId || result.source.organisation_id!==orgId || result.source.job_id!==jobId || typeof result.source.updated_at!=='string'
  || typeof result.can_edit!=='boolean' || typeof result.can_review!=='boolean' || typeof result.stale!=='boolean'
  || (result.summary && (result.summary.log_id!==logId || typeof result.summary.summary!=='string' || !Number.isSafeInteger(result.summary.revision) || result.summary.revision<1 || !['draft','reviewed','published','withdrawn'].includes(result.summary.state))))throw new Error('Saved summary state could not be confirmed');
 return result;
}
export async function changeDailySummary(orgId: string,jobId: string,logId: string,requestId: string,action: SummaryAction,state: DailySummaryState,summary: string,reviewConfirmed: boolean) {
 const {data,error}=await backend().rpc('daily_log_summary',{p_org:orgId,p_job:jobId,p_log:logId,p_request:requestId,p_action:action,
  p_data:{expected_revision:state.summary?.revision ?? 0,source_updated_at:state.source.updated_at,summary,review_confirmed:reviewConfirmed}});
 if(error)throw new Error(error.code==='42501'?'Your staff access or workspace write permission no longer allows this change.':error.code==='P0001'?error.message:'The change could not be confirmed. Keep your text and retry, or reload the saved version.');
 const receipt=data as {request_id?:string;action?:string;log_id?:string;revision?:number} | null;
 if(receipt?.request_id!==requestId || receipt.action!==action || receipt.log_id!==logId || receipt.revision!==(state.summary?.revision ?? 0)+1)throw new Error('The change was not confirmed. Retry with the same entries.');
 return receipt;
}
