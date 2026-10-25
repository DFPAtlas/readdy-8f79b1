import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LiveClientScope from './LiveClientScope';
import { clientName, loadClientsPage, type Client } from '@/services/live-clients.service';

export default function ClientsWorkspace() {
  return <LiveClientScope>{({ userId, orgId }) => <ClientDirectory key={userId + ':' + orgId} orgId={orgId} />}</LiveClientScope>;
}
function ClientDirectory({ orgId }: { orgId: string }) {
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [state, setState] = useState<{ items: Client[]; total: number; loading: boolean; error: string | null }>({ items: [], total: 0, loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    setState({ items: [], total: 0, loading: true, error: null });
    void loadClientsPage(orgId, offset, controller.signal).then(result => {
      if (!controller.signal.aborted) setState({ ...result, loading: false, error: null });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ items: [], total: 0, loading: false, error: 'Clients could not be loaded. Please retry.' });
    });
    return () => controller.abort();
  }, [orgId, offset, refresh]);
  const rows = state.items.filter(c => [clientName(c), c.email, c.phone].some(value => value?.toLowerCase().includes(search.trim().toLowerCase())));
  return <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
    <div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-semibold text-main">Clients</h1><button className="rounded-lg border px-3 py-2 text-sm" onClick={() => setRefresh(v => v + 1)}>Refresh</button></div>
    <p className="text-sm text-muted">Client records for your selected company.</p>
    <label className="block text-sm text-main">Search this page<input className="block mt-1 w-full max-w-lg rounded-lg border p-3" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, email or phone" /></label>
    {state.loading ? <p role="status">Loading clients…</p> : state.error ? <div role="alert"><p>{state.error}</p><button className="underline" onClick={() => setRefresh(v => v + 1)}>Retry</button></div> : <>
      <p className="text-sm text-muted">{state.total} saved clients · page {offset / 50 + 1}</p>
      {!state.items.length ? <p>No clients on this page.</p> : !rows.length ? <p>No matches on this page.</p> : <div className="grid gap-3 md:grid-cols-2">{rows.map(c => <Link key={c.id} to={'/clients/' + c.id} className="block rounded-xl border bg-white p-5 hover:border-primary-300">
        <h2 className="font-semibold text-main">{clientName(c)}</h2><p className="text-sm text-muted">{c.client_type} · {c.account_status}</p>
        {c.email && <p className="text-sm break-all">{c.email}</p>}{c.phone && <p className="text-sm">{c.phone}</p>}
      </Link>)}</div>}
      <div className="flex gap-3"><button className="rounded-lg border px-3 py-2 disabled:opacity-50" disabled={offset === 0} onClick={() => setOffset(v => Math.max(0, v - 50))}>Previous</button><button className="rounded-lg border px-3 py-2 disabled:opacity-50" disabled={offset + 50 >= state.total} onClick={() => setOffset(v => v + 50)}>Next</button></div>
    </>}
  </div>;
}
