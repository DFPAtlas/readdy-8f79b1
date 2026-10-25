import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LiveClientScope from '@/pages/clients/LiveClientScope';
import { loadLiveReport, type LiveReport, type ReportKind } from '@/services/live-reports.service';
import { reportCsv } from '@/lib/report-output';
const reportLinks = [['', 'Overview'], ['jobs', 'Jobs'], ['commercial', 'Commercial'], ['cash-flow', 'Payments'], ['clients', 'Clients'], ['workforce', 'Workforce'], ['site-activity', 'Site activity'], ['compliance', 'Passport status'], ['builder', 'Builder'], ['saved', 'Saved'], ['scheduled', 'Scheduled']];
export default function LiveReportPage({ kind }: { kind: ReportKind }) {
  return <LiveClientScope>{({ userId, orgId }) => <CompanyReport key={userId + ':' + orgId + ':' + kind} orgId={orgId} kind={kind} />}</LiveClientScope>;
}
function CompanyReport({ orgId, kind }: { orgId: string; kind: ReportKind }) {
  const [offset, setOffset] = useState(0); const [retry, setRetry] = useState(0); const [search, setSearch] = useState('');
  const [state, setState] = useState<{ data: LiveReport | null; loading: boolean; error: boolean; loadedAt: string }>({ data: null, loading: true, error: false, loadedAt: '' });
  useEffect(() => { const controller = new AbortController(); setState({ data: null, loading: true, error: false, loadedAt: '' });
    void loadLiveReport(kind, orgId, offset, controller.signal).then(data => { if (!controller.signal.aborted) setState({ data, loading: false, error: false, loadedAt: new Date().toISOString() }); }).catch(() => { if (!controller.signal.aborted) setState({ data: null, loading: false, error: true, loadedAt: '' }); }); return () => controller.abort();
  }, [orgId, kind, offset, retry]);
  const data = state.data; const rows = data?.rows.filter(r => r.cells.some(c => String(c).toLowerCase().includes(search.trim().toLowerCase()))) ?? [];
  function download() { if (!data) return; const csv = reportCsv([[data.title], ['Company ID', orgId], ['Loaded at', state.loadedAt], ['Page', offset / 50 + 1], ['Search on page', search], [], data.columns, ...rows.map(r => r.cells)]); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'buildnerve-' + kind + '-page.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  return <div className="p-4 md:p-6 space-y-5"><nav className="flex flex-wrap gap-3 text-sm">{reportLinks.map(([path, label]) => <Link className="underline" key={path} to={'/reports' + (path ? '/' + path : '')}>{label}</Link>)}</nav>
    {state.loading ? <p role="status">Loading company report…</p> : state.error ? <p role="alert">The report could not be loaded. <button className="underline" onClick={() => setRetry(v => v + 1)}>Retry</button></p> : data && <><header><h1 className="text-2xl font-semibold">{data.title}</h1><p className="text-sm text-muted mt-2">{data.description}</p><p className="text-xs text-muted mt-2">Loaded {new Date(state.loadedAt).toLocaleString('en-GB')} · {data.total} records · page {offset / 50 + 1}</p></header>
    <div className="flex flex-wrap items-end gap-3"><label className="text-sm">Search this page<input className="block border rounded-lg p-2" value={search} onChange={e => setSearch(e.target.value)} /></label><button className="border rounded-lg p-2" onClick={() => setRetry(v => v + 1)}>Refresh</button><button className="border rounded-lg p-2" onClick={download}>Download this page as CSV</button></div>
    {!rows.length ? <p>No records match this page.</p> : <div className="overflow-auto bg-white rounded-xl border"><table className="w-full text-sm"><thead><tr>{data.columns.map(c => <th key={c} className="text-left p-3 border-b">{c}</th>)}<th className="p-3"><span className="sr-only">Open record</span></th></tr></thead><tbody>{rows.map(r => <tr key={r.id}>{r.cells.map((c, i) => <td key={i} className="p-3 border-b">{c}</td>)}<td className="p-3">{r.route && <Link className="underline" to={r.route}>Open</Link>}</td></tr>)}</tbody></table></div>}
    <div className="flex gap-3"><button className="border rounded-lg p-2 disabled:opacity-50" disabled={!offset} onClick={() => setOffset(v => Math.max(0, v - 50))}>Previous</button><button className="border rounded-lg p-2 disabled:opacity-50" disabled={offset + 50 >= data.total} onClick={() => setOffset(v => v + 50)}>Next</button></div></>}
  </div>;
}
