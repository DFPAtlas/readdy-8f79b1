import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BNWordmarkLight } from '@/components/base/BuildNerveLogo';
import type { PortalOverview } from '@/services/client-portal.service';
import { formatPence } from '@/lib/money';
export function PortalShell({ children, token, name }: {
    children: ReactNode;
    token?: string;
    name?: string;
}) { return <div className="min-h-screen bg-slate-50 text-slate-900"><meta name="referrer" content="no-referrer"/><header className="bg-slate-900 text-white"><div className="max-w-6xl mx-auto px-4 py-5 flex justify-between gap-4"><BNWordmarkLight height={26}/><span className="text-sm">{name ?? 'Client project portal'}</span></div></header><main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">{token && <Link className="text-sm underline" to={`/client/${encodeURIComponent(token)}`}>Project overview</Link>}{children}</main><footer className="p-5 text-center text-xs text-slate-500">BuildNerve · Only share your project link with authorised people.</footer></div>; }
export function PortalState({ loading, error, reload }: {
    loading: boolean;
    error: string;
    reload: () => void;
}) { return <div className="bg-white border rounded-xl p-8" role={error ? 'alert' : 'status'}>{loading ? <p>Loading your project…</p> : <><h1 className="font-semibold text-xl">Unable to open your project</h1><p className="mt-2">{error}</p><button className="mt-4 underline" onClick={reload}>Try again</button></>}</div>; }
export function PaymentRecords({ data }: {
    data: PortalOverview;
}) { return <div className="overflow-x-auto bg-white border rounded-xl"><table className="w-full text-sm"><caption className="p-4 text-left">Payment applications. Each record retains its own currency. Amounts are recorded applications; status “paid” reflects the contractor’s record.</caption><thead><tr>{['Project / reference', 'Date', 'Valuation', 'Previously certified', 'Retention', 'Application amount due', 'Status'].map(h => <th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{data.payments.map(p => <tr key={p.id} className="border-t"><td className="p-3">{data.projects.find(j => j.id === p.job_id)?.project_name} · {p.reference}</td><td className="p-3">{p.application_date}</td><td className="p-3">{formatPence(p.valuation_pence, p.currency)}</td><td className="p-3">{formatPence(p.previous_certified_pence, p.currency)}</td><td className="p-3">{formatPence(p.retention_pence, p.currency)}</td><td className="p-3">{formatPence(p.amount_due_pence, p.currency)}</td><td className="p-3 capitalize">{p.status.replaceAll('_', ' ')}</td></tr>)}</tbody></table>{!data.payments.length && <p className="p-5">No payment applications have been shared for these projects.</p>}</div>; }
