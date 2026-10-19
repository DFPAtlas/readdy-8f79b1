import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import WorkforceDocumentsPanel from '@/components/feature/workforce/WorkforceDocumentsPanel';
import { useOrg } from '@/contexts/OrgContext';
import { relationshipName, statusName, workforceLiveService } from '@/services/workforce-live.service';
const panel = 'rounded-xl border border-border bg-white p-4';
export default function WorkforceProfile() {
    const { personId } = useParams<{
        personId: string;
    }>();
    const { organisation, role, isReadOnly } = useOrg();
    const org = organisation?.id;
    const [data, setData] = useState<Awaited<ReturnType<typeof workforceLiveService.loadProfile>>>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refresh, setRefresh] = useState(0);
    useEffect(() => { let current = true; if (!org || !personId) {
        setLoading(false);
        return;
    } setLoading(true); setError(''); workforceLiveService.loadProfile(org, personId).then(value => { if (current)
        setData(value); }).catch(e => { if (current)
        setError(e instanceof Error ? e.message : 'Could not load this workforce record.'); }).finally(() => { if (current)
        setLoading(false); }); return () => { current = false; }; }, [org, personId, refresh]);
    if (loading)
        return <main className="p-6" role="status">Loading workforce record…</main>;
    if (error)
        return <main className="p-6"><p role="alert" className="text-red-700">{error}</p><Link to="/workforce" className="text-primary-600">Back to workforce</Link></main>;
    if (!data)
        return <main className="mx-auto max-w-xl p-8 text-center"><div className={panel}><h1 className="text-xl font-semibold">Worker not found</h1><p className="my-2 text-sm text-muted">This person is not in the selected company.</p><Link className="text-primary-600" to="/workforce">Back to workforce</Link></div></main>;
    const { person, assignments, qualifications, insurance, documents, checks, history, jobs } = data;
    const jobMap = new Map(jobs.map(job => [job.id, job]));
    return <main className="mx-auto max-w-[1200px] space-y-5 p-4 md:p-6"><Link to="/workforce" className="text-sm text-primary-600">← Back to workforce</Link>
 <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">{person.first_name} {person.last_name}</h1><p className="text-muted">{relationshipName(person.relationship)} · {person.primary_trade || 'Trade not recorded'}{person.trading_name ? ` · ${person.trading_name}` : ''}</p></div><div /></header>
 <section className="grid gap-3 md:grid-cols-3"><div className={panel}><p className="text-xs text-muted">Work passport</p><p className="mt-1 font-semibold">{statusName(person.passport_status)}</p></div><div className={panel}><p className="text-xs text-muted">Availability</p><p className="mt-1 font-semibold">{person.availability ? statusName(person.availability) : 'Not recorded'}</p></div><div className={panel}><p className="text-xs text-muted">Contact</p><p className="mt-1">{person.email || 'Email not recorded'}</p><p className="text-sm">{person.phone || 'Phone not recorded'}</p></div></section>
 {person.archived_at && <p className="rounded-lg bg-amber-50 p-3">Archived {new Date(person.archived_at).toLocaleDateString('en-GB')}.</p>}
 <section className={panel}><h2 className="mb-3 text-lg font-semibold">Job history</h2>{assignments.length ? <div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Job</th><th className="p-2">Role</th><th className="p-2">Started</th><th className="p-2">Finished</th></tr></thead><tbody>{assignments.map(a => <tr className="border-t border-border" key={a.id}><td className="p-2">{jobMap.get(a.job_id)?.reference || 'Job'} · {jobMap.get(a.job_id)?.project_name || ''}</td><td className="p-2">{a.role || '—'}</td><td className="p-2">{a.start_date || '—'}</td><td className="p-2">{a.expected_finish_date || 'Current'}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted">No assignments recorded.</p>}</section>
 <section className={panel}><h2 className="mb-3 text-lg font-semibold">Passport checks</h2>{checks.length ? <ul className="grid gap-2 sm:grid-cols-2">{checks.map(c => <li className="rounded-lg bg-background-50 p-3" key={c.id}><strong>{statusName(c.check_category)}</strong><p className="text-sm text-muted">{statusName(c.status)}{c.note ? ` · ${c.note}` : ''}</p></li>)}</ul> : <p className="text-sm text-muted">No passport checks recorded.</p>}</section>
 <section className={panel}><h2 className="mb-3 text-lg font-semibold">Qualifications</h2>{qualifications.length ? <ul className="space-y-2">{qualifications.map(q => <li className="border-t border-border pt-2" key={q.id}><strong>{q.qualification_name}</strong><p className="text-sm text-muted">{q.issuer || 'Issuer not recorded'} · {statusName(q.status)} · Expires {q.expiry_date || 'not recorded'}</p>{q.review_note && <p className="text-sm">Review: {q.review_note}</p>}</li>)}</ul> : <p className="text-sm text-muted">No qualifications recorded.</p>}</section>
 <section className={panel}><h2 className="mb-3 text-lg font-semibold">Insurance</h2>{insurance.length ? <ul className="space-y-2">{insurance.map(i => <li className="border-t border-border pt-2" key={i.id}><strong>{statusName(i.policy_type)}</strong><p className="text-sm text-muted">{i.provider} · Policy {i.reference || 'not recorded'} · {statusName(i.status)} · Expires {i.expiry_date}</p></li>)}</ul> : <p className="text-sm text-muted">No insurance records.</p>}</section>
 <WorkforceDocumentsPanel orgId={org || ''} personId={person.id} role={role} isReadOnly={isReadOnly} documents={documents} onChanged={() => setRefresh(value => value + 1)} />
 <section className={panel}><h2 className="mb-3 text-lg font-semibold">Record history</h2>{history.length ? <ol className="space-y-2">{history.map(h => <li className="border-t border-border pt-2" key={h.id}><p>{new Date(h.created_at).toLocaleString('en-GB')} · {statusName(h.action)}</p><p className="text-sm text-muted">{h.reason} · Actor {h.actor_id}</p></li>)}</ol> : <p className="text-sm text-muted">No changes recorded yet.</p>}</section>
 </main>;
}
