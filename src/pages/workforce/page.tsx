import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import { relationshipName, statusName, workforceLiveService } from '@/services/workforce-live.service';
import type { WorkforceJob, WorkforceRow } from '@/services/workforce-live.service';

const field = 'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm';
const button = 'rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium disabled:opacity-50';
interface PersonForm { first_name: string; last_name: string; relationship: string; primary_trade: string; email: string; phone: string; trading_name: string; current_job_id: string; reason: string }
const defaultPersonForm: PersonForm = { first_name: '', last_name: '', relationship: 'employee', primary_trade: '', email: '', phone: '', trading_name: '', current_job_id: '', reason: '' };
function csvCell(value: string) { let safe=value.replace(/[\r\n]+/g,' '); if (/^[=+\-@\t]/.test(safe)) safe=`'${safe}`; return `"${safe.replace(/"/g,'""')}"`; }

export default function WorkforceWorkspace() {
  const { organisation, role, isReadOnly } = useOrg();
  const org = organisation?.id;
  const [people, setPeople] = useState<WorkforceRow[]>([]);
  const [jobs, setJobs] = useState<WorkforceJob[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('active');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [editor, setEditor] = useState<WorkforceRow | true | false>(false);
  const [archive, setArchive] = useState<WorkforceRow | null>(null);
  const [reason, setReason] = useState('');
  const pendingRequest=useRef<{fingerprint:string;id:string}|null>(null);
  const canCreate = ['owner','admin','project_manager'].includes(role || '');
  const canEdit = ['owner','admin','project_manager','site_supervisor'].includes(role || '');
  const canArchive = canCreate;

  useEffect(() => {
    let current=true;
    if (!org) { setLoading(false); return; }
    setLoading(true); setError('');
    workforceLiveService.load(org).then(result => { if(current){setPeople(result.people);setJobs(result.jobs);} })
      .catch(e => { if(current)setError(e instanceof Error?e.message:'Could not load workforce records.'); })
      .finally(() => { if(current)setLoading(false); });
    return () => { current=false; };
  }, [org,refresh]);

  const jobMap=useMemo(()=>new Map(jobs.map(job=>[job.id,job])),[jobs]);
  const filtered=useMemo(()=>people.filter(person=>{
    const archived=Boolean(person.archived_at);
    if(filter==='active'&&archived)return false;
    if(filter==='archived'&&!archived)return false;
    if(filter==='ready'&&person.passport_status!=='ready_for_site')return false;
    if(filter==='action'&&!['action_required','review_needed','restricted','expired'].includes(person.passport_status))return false;
    if(filter==='employees'&&person.relationship!=='employee')return false;
    if(filter==='subcontractors'&&!['subcontractor_individual','subcontractor_company'].includes(person.relationship))return false;
    const term=query.trim().toLowerCase();
    return !term||`${person.first_name} ${person.last_name} ${person.trading_name||''} ${person.primary_trade||''} ${person.email||''}`.toLowerCase().includes(term);
  }),[people,filter,query]);
  const counts=useMemo(()=>({
    total:people.filter(p=>!p.archived_at).length,
    ready:people.filter(p=>!p.archived_at&&p.passport_status==='ready_for_site').length,
    action:people.filter(p=>!p.archived_at&&['action_required','review_needed','restricted','expired'].includes(p.passport_status)).length,
    archived:people.filter(p=>p.archived_at).length,
  }),[people]);
  const reload=useCallback(()=>setRefresh(value=>value+1),[]);
  async function saveOnce(action:string,payload:Record<string,string|number|boolean|null>){
    if(!org)throw new Error('Choose a company first.');
    const fingerprint=JSON.stringify({org,action,payload});
    if(pendingRequest.current?.fingerprint!==fingerprint)pendingRequest.current={fingerprint,id:crypto.randomUUID()};
    const id=pendingRequest.current.id;
    try{const result=await workforceLiveService.write(org,action,payload,id);pendingRequest.current=null;return result;}
    catch(error){throw error;}
  }

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!org||busy||isReadOnly)return;
    const form=new FormData(event.currentTarget);
    const payload={
      first_name:String(form.get('first_name')).trim(),last_name:String(form.get('last_name')).trim(),
      relationship:String(form.get('relationship')),primary_trade:String(form.get('primary_trade')).trim(),
      email:String(form.get('email')).trim(),phone:String(form.get('phone')).trim(),trading_name:String(form.get('trading_name')).trim(),
      reason:String(form.get('reason')).trim(),current_job_id:String(form.get('current_job_id')||''),effective_date:new Date().toISOString().slice(0,10),
    };
    setBusy(true);setError('');
    try {
      if(editor&&editor!==true) await saveOnce('update',{...payload,person_id:editor.id,revision:editor.revision});
      else await saveOnce('create',payload);
      setEditor(false);reload();
    } catch(e) { setError(e instanceof Error?e.message:'The workforce record could not be saved.'); }
    finally { setBusy(false); }
  }
  async function archivePerson() {
    if(!org||!archive||!reason.trim()||busy)return;
    setBusy(true);setError('');
    try { await saveOnce('archive',{person_id:archive.id,revision:archive.revision,reason:reason.trim()});setArchive(null);setReason('');reload(); }
    catch(e) { setError(e instanceof Error?e.message:'The record could not be archived.'); }
    finally { setBusy(false); }
  }
  function exportCsv() {
    const rows=[['Name','Relationship','Trade','Status','Availability','Current job','Expiry date','Email','Phone'],...filtered.map(p=>[
      `${p.first_name} ${p.last_name}`,relationshipName(p.relationship),p.primary_trade||'',statusName(p.passport_status),p.availability||'',
      jobMap.get(p.current_job_id||'')?.project_name||'',p.next_expiry_date||'',p.email||'',p.phone||'',
    ])];
    const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='workforce.csv';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const editValues=editor&&editor!==true?editor:null;

  return <main className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">Workforce</h1><p className="text-sm text-muted mt-1">Company workforce records and job assignments.</p></div><div className="flex gap-2">{canCreate&&!isReadOnly&&<button className="rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white" onClick={()=>setEditor(true)}>Add worker</button>}<button className={button} onClick={reload} disabled={loading||busy}>Refresh</button></div></header>
    {isReadOnly&&<p role="status" className="rounded-lg bg-amber-50 p-3">This workspace is read-only. Workforce records remain available to view.</p>}
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Active workforce',counts.total],['Ready for site',counts.ready],['Needs attention',counts.action],['Archived',counts.archived]].map(([label,value])=><div className="rounded-xl border border-border bg-white p-4" key={String(label)}><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted mt-1">{label}</p></div>)}</section>
    <div className="flex flex-wrap gap-2"><input className={`${field} min-w-56 flex-1`} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search names, trade, company or email" aria-label="Search workforce"/><select className={`${field} w-auto`} value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter workforce"><option value="active">Active</option><option value="ready">Ready for site</option><option value="action">Needs attention</option><option value="employees">Employees</option><option value="subcontractors">Subcontractors</option><option value="archived">Archived</option><option value="all">Everyone</option></select><button className={button} onClick={exportCsv} disabled={loading||!!error}>Export CSV</button></div>
    {loading?<p role="status">Loading workforce…</p>:filtered.length===0?<div className="rounded-xl border border-border bg-white p-10 text-center"><h2 className="font-semibold">{people.length?'No matching people':'No workforce records yet'}</h2><p className="mt-1 text-sm text-muted">{people.length?'Adjust your filters or search term.':'Add a worker to start a company workforce register.'}</p></div>:<div className="overflow-auto rounded-xl border border-border bg-white"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border bg-background-50">{['Person','Trade','Status','Current job','Next expiry','Actions'].map(h=><th className="px-4 py-3 font-medium text-muted" key={h}>{h}</th>)}</tr></thead><tbody>{filtered.map(person=>{const job=jobMap.get(person.current_job_id||'');return <tr className="border-b border-border last:border-0" key={person.id}><td className="px-4 py-3"><Link className="font-medium text-primary-600 hover:underline" to={`/workforce/${person.id}`}>{person.first_name} {person.last_name}</Link><div className="text-xs text-muted">{relationshipName(person.relationship)}{person.trading_name?` · ${person.trading_name}`:''}</div></td><td className="px-4 py-3">{person.primary_trade||'—'}</td><td className="px-4 py-3">{statusName(person.passport_status)}</td><td className="px-4 py-3">{job?`${job.reference} · ${job.project_name}`:'—'}</td><td className="px-4 py-3">{person.next_expiry_date||'—'}</td><td className="px-4 py-3"><div className="flex gap-2">{canEdit&&!isReadOnly&&!person.archived_at&&<button className={button} onClick={()=>setEditor(person)}>Edit / assign</button>}{canArchive&&!isReadOnly&&!person.archived_at&&<button className="rounded-lg border border-border px-3 py-2 text-sm text-red-700" onClick={()=>{setArchive(person);setReason('');}}>Archive</button>}</div></td></tr>})}</tbody></table></div>}
    <section className="rounded-xl border border-border bg-white p-4"><h2 className="font-semibold">Invitations and documents</h2><p className="mt-1 text-sm text-muted">Worker document upload and review are available on each profile. Invitation sending is still being built.</p></section>
    {editor!==false&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form role="dialog" aria-modal="true" aria-labelledby="workforce-editor-title" className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-auto rounded-xl bg-white p-5" onSubmit={e=>void submit(e)}><h2 id="workforce-editor-title" className="text-lg font-semibold">{editValues?'Edit worker':'Add worker'}</h2><fieldset disabled={busy||isReadOnly} className="grid gap-3 sm:grid-cols-2"><label className="text-sm">First name<input name="first_name" className={field} required maxLength={100} defaultValue={editValues?.first_name||''}/></label><label className="text-sm">Last name<input name="last_name" className={field} required maxLength={100} defaultValue={editValues?.last_name||''}/></label><label className="text-sm">Relationship<select name="relationship" className={field} defaultValue={editValues?.relationship||defaultPersonForm.relationship}><option value="employee">Employee</option><option value="subcontractor_individual">Individual subcontractor</option><option value="subcontractor_company">Subcontractor company</option><option value="agency">Agency</option><option value="consultant">Consultant</option></select></label><label className="text-sm">Primary trade<input name="primary_trade" className={field} required maxLength={150} defaultValue={editValues?.primary_trade||''}/></label><label className="text-sm">Trading name<input name="trading_name" className={field} maxLength={200} defaultValue={editValues?.trading_name||''}/></label><label className="text-sm">Email<input name="email" type="email" className={field} maxLength={254} defaultValue={editValues?.email||''}/></label><label className="text-sm">Phone<input name="phone" type="tel" className={field} maxLength={60} defaultValue={editValues?.phone||''}/></label><label className="text-sm">Current job<select name="current_job_id" className={field} defaultValue={editValues?.current_job_id||''}><option value="">Unassigned</option>{jobs.map(job=><option value={job.id} key={job.id}>{job.reference} · {job.project_name}</option>)}</select></label><label className="text-sm sm:col-span-2">Reason<textarea name="reason" className={field} required maxLength={2000} defaultValue={editValues?'Update worker details':'New workforce record'}/></label></fieldset><div className="flex justify-end gap-2"><button className={button} type="button" disabled={busy} onClick={()=>{setEditor(false);setError('');}}>Cancel</button><button className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white" disabled={busy||isReadOnly}>{busy?'Saving…':'Save'}</button></div></form></div>}
    {archive&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form role="dialog" aria-modal="true" className="w-full max-w-md space-y-4 rounded-xl bg-white p-5" onSubmit={e=>{e.preventDefault();void archivePerson();}}><h2 className="text-lg font-semibold">Archive {archive.first_name} {archive.last_name}?</h2><p className="text-sm text-muted">This removes the worker from active lists and closes any current assignment. The record stays in company history.</p><label className="block text-sm">Reason<textarea className={field} value={reason} onChange={e=>setReason(e.target.value)} required maxLength={2000}/></label><div className="flex justify-end gap-2"><button type="button" className={button} onClick={()=>setArchive(null)} disabled={busy}>Cancel</button><button className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white" disabled={busy}>{busy?'Archiving…':'Confirm archive'}</button></div></form></div>}
  </main>;
}
