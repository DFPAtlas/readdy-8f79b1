import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';

type Check = {
  organisation_id: string; business_type: string; legal_name: string;
  company_number: string | null; business_status: string;
  company_status: string | null;
  representative_status: string; representative_statement: string;
  revision: number; review_reason: string | null;
};
const client = () => {
  const value = getSupabase();
  if (!value) throw new Error('Backend unavailable');
  // New migration types are scoped here until the generated schema is refreshed.
  return value as any;
};

export default function BusinessVerification({ orgId, canEdit }: { orgId: string; canEdit: boolean }) {
  const [record, setRecord] = useState<Check | null>(null);
  const [type, setType] = useState('limited_company');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [statement, setStatement] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    setBusy(true); setRecord(null); setMessage('');
    client().from('business_verifications').select('*').eq('organisation_id', orgId).maybeSingle()
      .then(({ data, error }: any) => {
        if (!active) return;
        if (error) setMessage('Verification is unavailable. Please contact support.');
        setRecord(data);
        setType(data?.business_type ?? 'limited_company'); setName(data?.legal_name ?? '');
        setNumber(data?.company_number ?? ''); setStatement(data?.representative_statement ?? '');
        setBusy(false);
      });
    return () => { active = false; };
  }, [orgId]);
  async function submit() {
    setBusy(true); setMessage('');
    try {
      const { error } = await client().rpc('submit_business_verification', {
        p_org: orgId, p_type: type, p_name: name, p_number: number || null, p_statement: statement,
      });
      if (error) throw error;
      const { data, error: readError } = await client().from('business_verifications').select('*').eq('organisation_id', orgId).single();
      if (readError) throw readError;
      setRecord(data); setMessage('Submitted for review. Company details and your authority are checked separately.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not submit verification.'); }
    finally { setBusy(false); }
  }
  async function checkCompany() {
    setBusy(true); setMessage('');
    try {
      const { data, error } = await client().functions.invoke('business-company-check', { body: { organisation_id: orgId } });
      if (error || data?.error) throw new Error(data?.error ?? 'Company lookup unavailable. Manual review remains available.');
      const { data: current, error: readError } = await client().from('business_verifications').select('*').eq('organisation_id', orgId).single();
      if (readError) throw readError;
      setRecord(current); setMessage('Company check saved. Representative authority is reviewed separately.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Company lookup failed.'); }
    finally { setBusy(false); }
  }
  return <section className="bg-white border rounded-xl p-5 space-y-3">
    <h2 className="font-semibold">Business verification</h2>
    <p className="text-sm">Business details: {record?.business_status ?? 'unverified'} · Representative authority: {record?.representative_status ?? 'unverified'}</p>
    <p className="text-sm">These checks do not assess creditworthiness or grant HMRC authorisation. Do not enter passwords, tax references or identity documents here.</p>
    {record?.review_reason && <p className="text-sm">Review response: {record.review_reason}</p>}
    {canEdit && record?.business_type === 'limited_company' && <button type="button" disabled={busy} onClick={checkCompany} className="border rounded px-4 py-2">Check submitted details with Companies House</button>}
    {canEdit && <fieldset disabled={busy} className="space-y-3">
      <label className="block">Business type<select className="block border rounded p-2 w-full" value={type} onChange={e => setType(e.target.value)}>
        <option value="limited_company">Limited company</option><option value="sole_trader">Sole trader</option><option value="other">Other — manual review</option>
      </select></label>
      <label className="block">Legal or sole trader name<input className="block border rounded p-2 w-full" value={name} onChange={e => setName(e.target.value)} maxLength={200} /></label>
      {type === 'limited_company' && <label className="block">Companies House number<input className="block border rounded p-2 w-full" value={number} onChange={e => setNumber(e.target.value)} maxLength={8} /></label>}
      <label className="block">Your role and authority to represent this business<textarea className="block border rounded p-2 w-full" value={statement} onChange={e => setStatement(e.target.value)} maxLength={1000} /></label>
      <p className="text-sm">Submitting changed details resets both checks for review. Support will arrange any additional evidence through an approved private channel.</p>
      <button type="button" onClick={submit} className="rounded bg-teal-700 text-white px-4 py-2">{busy ? 'Please wait…' : 'Submit for review'}</button>
    </fieldset>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}

export function BusinessVerificationQueue() {
  const [rows, setRows] = useState<Check[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    const { data, error } = await client().rpc('list_business_verification_reviews');
    if (error) throw error;
    setRows(data ?? []);
  }
  useEffect(() => { load().catch(() => setMessage('Verification reviews are unavailable or you lack reviewer access.')); }, []);
  async function review(row: Check, decision: string) {
    setBusy(true); setMessage('');
    try {
      const { error } = await client().rpc('review_business_verification', {
        p_org: row.organisation_id, p_revision: row.revision,
        p_decision: decision, p_reason: reasons[row.organisation_id] ?? '',
      });
      if (error) throw error;
      await load(); setMessage('Review recorded.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Review failed.'); }
    finally { setBusy(false); }
  }
  return <section className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-white space-y-4">
    <h2 className="font-semibold">Business verification reviews</h2>
    <p className="text-sm">Approve business details and representative authority separately, after checking evidence. Self-review is prohibited.</p>
    {message && <p role="status">{message}</p>}
    {!rows.length && <p>No pending reviews available.</p>}
    {rows.map(row => <div key={row.organisation_id} className="border border-slate-700 p-4 rounded space-y-2">
      <p>{row.legal_name} · {row.business_type} · {row.company_number ?? 'No company number'}</p>
      <p>Business: {row.business_status} · Authority: {row.representative_status}</p>
      <p className="text-sm whitespace-pre-wrap">Applicant statement: {row.representative_statement}</p>
      <label className="block">Evidence checked and decision reason<textarea maxLength={1000} className="block w-full p-2 rounded text-slate-900" value={reasons[row.organisation_id] ?? ''} onChange={e => setReasons({ ...reasons, [row.organisation_id]: e.target.value })} /></label>
      <div className="flex gap-2 flex-wrap">{['approve_business', 'approve_representative', 'reject'].map(decision => <button key={decision} disabled={busy} className="border rounded px-3 py-2 disabled:opacity-50" onClick={() => review(row, decision)}>{decision.replaceAll('_', ' ')}</button>)}</div>
    </div>)}
  </section>;
}
