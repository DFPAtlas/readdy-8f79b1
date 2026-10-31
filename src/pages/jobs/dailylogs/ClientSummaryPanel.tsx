import { dailyLogPrimaryAction, dailyLogSecondaryAction, dailyLogCautionAction } from '@/lib/action-styles';
import { useRef, useState } from 'react';
import LoadState from '@/components/live/LoadState';
import { useScopedResource } from '@/hooks/useScopedResource';
import { changeDailySummary,loadDailySummary,type DailySummaryState,type SummaryAction } from '@/services/daily-log-summary.service';

export default function ClientSummaryPanel({orgId,jobId,logId,userId,open,onToggle,onSaved}:{orgId:string;jobId:string;logId:string;userId:string;open:boolean;onToggle:()=>void;onSaved:()=>void}) {
 const state=useScopedResource(open?`${userId}:${orgId}:${jobId}:${logId}`:null,()=>loadDailySummary(orgId,jobId,logId));
 return <section className="border-t pt-3"><button type="button" className={dailyLogSecondaryAction} aria-expanded={open} onClick={onToggle}>{open?'Close client summary':'Review client summary'}</button>{open&&<><LoadState {...state}/>{state.data&&<SummaryEditor key={`${state.data.summary?.revision ?? 0}:${state.data.source.updated_at}`} data={state.data} orgId={orgId} jobId={jobId} logId={logId} reload={state.retry} onSaved={onSaved}/>}</>}</section>;
}
function SummaryEditor({data,orgId,jobId,logId,reload,onSaved}:{data:DailySummaryState;orgId:string;jobId:string;logId:string;reload:()=>void;onSaved:()=>void}) {
 const [text,setText]=useState(data.summary?.summary ?? ''),[reviewed,setReviewed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef<{signature:string;id:string}|null>(null),locked=useRef(false);
 const dirty=text!==(data.summary?.summary ?? '');
 async function action(kind:SummaryAction) {
  if(locked.current)return;
  const signature=JSON.stringify([kind,text,reviewed,data.summary?.revision ?? 0,data.source.updated_at]);
  if(pending.current?.signature!==signature)pending.current={signature,id:crypto.randomUUID()};
  locked.current=true;setBusy(true);setError('');
  try {await changeDailySummary(orgId,jobId,logId,pending.current.id,kind,data,text,reviewed);onSaved();}
  catch(cause){setError(cause instanceof Error?cause.message:'The summary change could not be confirmed.');}
  finally{locked.current=false;setBusy(false);}
 }
 return <div className="space-y-3 py-3">
  <p className="font-semibold">Client: {data.client_name || 'No active client assigned'}</p>
  <p>Summary status: {data.summary?.state ?? 'Not prepared'}{data.stale?' · Source or client changed; hidden from the portal until reviewed again.':''}</p>
  <p className="text-sm">Only the separate summary below is shared. Publishing makes it available through active client links with progress permission; no email is sent. Saving changes to a published summary withdraws its previous version.</p>
  <details className="border rounded p-3"><summary className="cursor-pointer font-semibold">Internal source log for staff review</summary><p>Log date: {data.source.log_date} · Status: {data.source.status}</p>{[['Work completed',data.source.work_completed],['Planned work',data.source.planned_work_tomorrow],['Weather',data.source.weather_desc],['Site conditions',data.source.site_conditions],['Access issues',data.source.access_issues],['Welfare observations',data.source.welfare_status],['Progress',data.source.progress_estimate]].map(([label,value])=><p className="whitespace-pre-wrap text-sm mt-2" key={String(label)}><strong>{label}:</strong> {value ?? 'Not recorded'}</p>)}</details>
  <label className="block font-medium">Separate client summary<textarea className="block w-full border rounded p-3 font-normal" rows={5} maxLength={10000} value={text} disabled={!data.can_edit||busy} onChange={event=>{setText(event.target.value);setReviewed(false);}}/></label>
  {error&&<p role="alert" className="text-red-700">{error}</p>}
  {data.can_review&&data.summary?.state==='draft'&&!dirty&&<label className="flex items-start gap-2"><input type="checkbox" checked={reviewed} disabled={busy} onChange={event=>setReviewed(event.target.checked)}/>I reviewed the internal source log and this exact client summary for sharing.</label>}
  <div className="flex flex-wrap gap-3">
   {data.can_edit&&<button type="button" className={dailyLogPrimaryAction} disabled={busy||!text.trim()} onClick={()=>action('save')}>Save summary draft{data.summary?.state==='published'?' and withdraw old version':''}</button>}
   {data.can_review&&data.summary?.state==='draft'&&<button type="button" className={dailyLogPrimaryAction} disabled={busy||dirty||!reviewed||!data.client_name} onClick={()=>action('review')}>Mark reviewed</button>}
   {data.can_review&&data.summary?.state==='reviewed'&&<button type="button" className={dailyLogPrimaryAction} disabled={busy||dirty||data.stale||!data.client_name} onClick={()=>action('publish')}>Publish to {data.client_name || 'client'}</button>}
   {data.can_review&&data.summary?.state==='published'&&<button type="button" className={dailyLogCautionAction} disabled={busy||dirty} onClick={()=>action('withdraw')}>Withdraw from portal</button>}
   <button type="button" className={dailyLogSecondaryAction} disabled={busy} onClick={reload}>Reload saved version</button>
  </div>{!data.can_edit&&<p className="text-sm">This log or workspace is read-only.</p>}{busy&&<p role="status">Recording summary change…</p>}
 </div>;
}
