import { useRef,useState,type FormEvent } from 'react';
import { useScopedResource } from '@/hooks/useScopedResource';
import LoadState from '@/components/live/LoadState';
import { listContractorDocuments,uploadContractorDocument } from '@/services/contractor-documents.service';
const categories=[['identity','Identity'],['business','Business details'],['cis','CIS'],['insurance','Insurance'],['qualification','Qualification'],['training','Training'],['right_to_work','Right to work'],['site_induction','Site induction'],['rams','RAMS'],['contract','Contract'],['other','Other']];
export default function ContractorDocuments({token}:{token:string}) {
  const state=useScopedResource(token,()=>listContractorDocuments(token));
  const [name,setName]=useState('');const [category,setCategory]=useState('insurance');const [file,setFile]=useState<File|null>(null);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const locked=useRef(false);const input=useRef<HTMLInputElement>(null);
  async function submit(event:FormEvent) {
    event.preventDefault();if(!file || locked.current || !state.data || state.error)return;
    locked.current=true;setBusy(true);setError('');setNotice('');
    try {
      const result=await uploadContractorDocument(token,name,category,file);
      setNotice(result.status==='saved'?'This document was already received; its review status has not been changed.':'Document received and awaiting company review. This does not approve you for site work.');
      setName('');setFile(null);if(input.current)input.current.value='';state.retry();
    } catch(e) {setError(e instanceof Error?e.message:'Upload could not be confirmed. Keep the same file selected and retry.');}
    finally {locked.current=false;setBusy(false);}
  }
  return <section className="space-y-4 border-t pt-5"><h2 className="text-xl font-semibold">Submit your documents</h2><p className="text-sm">Send the documents requested by the company. Files stay private for authorised company reviewers. Uploading does not verify identity, insurance, qualifications or permission to work on site. Do not upload bank details here.</p><LoadState {...state}/>{notice&&<p role="status" className="rounded border p-3">{notice}</p>}{error&&<p role="alert" className="text-red-700">{error}</p>}{state.data&&<><p className="text-sm">Link expires {new Date(state.data.expires_at).toLocaleString('en-GB')}. Up to 20 files per invitation; PDF, PNG, JPEG or WebP, maximum 5 MB each.</p><form onSubmit={submit}><fieldset disabled={busy || Boolean(state.error)} className="space-y-3"><label className="block text-sm">Document name<input className="block w-full rounded border p-3" value={name} maxLength={160} required onChange={event=>setName(event.target.value)}/></label><label className="block text-sm">Category<select className="block w-full rounded border p-3" value={category} onChange={event=>setCategory(event.target.value)}>{categories.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="block text-sm">File<input ref={input} className="block w-full rounded border p-3" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" required onChange={event=>setFile(event.target.files?.[0] ?? null)}/></label><button className="rounded border px-4 py-3" disabled={!file || busy}>{busy?'Uploading and recording…':'Submit document for review'}</button></fieldset></form><div className="flex justify-between gap-3"><h3 className="font-semibold">Documents submitted through this invitation</h3><button className="underline" disabled={busy} onClick={state.retry}>Refresh</button></div>{state.data.documents.length===0&&<p>No completed document submissions recorded through this link.</p>}{state.data.documents.map(document=><article key={document.id} className="rounded border p-4"><p className="font-semibold">{document.name}</p><p className="text-sm">{document.filename} · {document.category.replaceAll('_',' ')} · {(document.size/(1024*1024)).toFixed(2)} MB</p><p className="text-sm">Recorded review status: {document.status.replaceAll('_',' ')}</p></article>)}</>}</section>;
}
