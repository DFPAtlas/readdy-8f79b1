import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LiveClientScope from '@/pages/clients/LiveClientScope';
import { variationPage, variationMoney, type Variation } from '@/services/live-variations.service';
export default function VariationsWorkspace() {
  return <LiveClientScope>{({ userId, orgId }) => <Register key={userId + ':' + orgId} orgId={orgId} />}</LiveClientScope>;
}
function Register({ orgId }: { orgId: string }) {
  const [offset, setOffset] = useState(0); const [retry, setRetry] = useState(0); const [search, setSearch] = useState('');
  const [state, setState] = useState<{ items: Variation[]; total: number; loading: boolean; error: boolean }>({ items: [], total: 0, loading: true, error: false });
  useEffect(() => { const controller = new AbortController(); setState({ items: [], total: 0, loading: true, error: false });
    void variationPage(orgId, offset, controller.signal).then(result => { if (!controller.signal.aborted) setState({ ...result, loading: false, error: false }); }).catch(() => { if (!controller.signal.aborted) setState({ items: [], total: 0, loading: false, error: true }); });
    return () => controller.abort();
  }, [orgId, offset, retry]);
  const rows = state.items.filter(v => [v.reference, v.title, v.status].some(value => value.toLowerCase().includes(search.trim().toLowerCase())));
  return <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5"><header className="flex justify-between gap-3"><h1 className="text-2xl font-semibold">Variations</h1><Link className="border rounded-lg p-2" to="/variations/new">New variation</Link></header>
    <p className="text-sm text-muted">Saved variations for your selected company. Values use each record’s saved currency.</p>
    <label className="block text-sm">Search this page<input className="block border rounded-lg p-2 mt-1 w-full max-w-lg" value={search} onChange={e => setSearch(e.target.value)} /></label>
    {state.loading ? <p role="status">Loading variations…</p> : state.error ? <div role="alert">Variations could not be loaded. <button className="underline" onClick={() => setRetry(v => v + 1)}>Retry</button></div> : <><p className="text-sm">{state.total} saved variations · page {offset / 50 + 1}</p>{!rows.length ? <p>No variations match this page.</p> : rows.map(v => <Link className="block bg-white border rounded-xl p-5" key={v.id} to={'/variations/' + v.id}><p className="text-xs text-muted">{v.reference} · {v.status.replace(/_/g, ' ')}</p><h2 className="font-semibold">{v.title}</h2><p>{variationMoney(v.total_pence, v.currency)}</p>{v.approval_deadline && <p className="text-sm">Approval deadline: {v.approval_deadline}</p>}</Link>)}<div className="flex gap-3"><button className="border rounded-lg p-2 disabled:opacity-50" disabled={!offset} onClick={() => setOffset(v => Math.max(0, v - 50))}>Previous</button><button className="border rounded-lg p-2 disabled:opacity-50" disabled={offset + 50 >= state.total} onClick={() => setOffset(v => v + 50)}>Next</button></div></>}
  </div>;
}
