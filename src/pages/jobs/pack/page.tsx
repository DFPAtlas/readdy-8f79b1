import { useEffect, useRef, useState } from 'react';
import JobRecordScope, { type JobRecordContext } from '@/components/live/JobRecordScope';
import LoadState from '@/components/live/LoadState';
import { prepareEvidencePack } from '@/services/evidence-pack.service';
import { useScopedResource } from '@/hooks/useScopedResource';
import { EVIDENCE_REGISTER_PAGE_SIZE, evidenceRegisterJson, loadEvidenceRegisterPage } from '@/services/evidence-register.service';

export default function EvidencePackPage() { return <JobRecordScope>{context => <EvidencePack {...context}/>}</JobRecordScope>; }
function EvidencePack({ orgId, job, userId }: JobRecordContext) {
  const [offset, setOffset] = useState(0);
  const state = useScopedResource(`${userId}:${orgId}:${job.id}:${offset}`, () => loadEvidenceRegisterPage(orgId, job.id, offset));
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [packing, setPacking] = useState(false);
  const packLocked = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function downloadPack() {
    if (!state.data || state.loading || packLocked.current) return;
    packLocked.current = true; setPacking(true); setError('');
    try {
      const bytes = await prepareEvidencePack(orgId, userId, job, [...selected], state.data, () => !mounted.current);
      if (!mounted.current) return;
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer], { type: 'application/zip' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `evidence-pack-${job.id}-page-${offset / EVIDENCE_REGISTER_PAGE_SIZE + 1}.zip`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'The evidence pack could not be prepared.'); }
    finally { packLocked.current = false; if (mounted.current) setPacking(false); }
  }
  function changePage(next: number) { setSelected([]); setError(''); setOffset(next); }
  function refresh() { setSelected([]); setError(''); state.retry(); }
  function download() {
    if (!state.data || state.loading || state.error) return;
    setError('');
    try {
      const blob = new Blob([evidenceRegisterJson(state.data, selected, orgId, job)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `evidence-register-${job.id}-page-${offset / EVIDENCE_REGISTER_PAGE_SIZE + 1}.json`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError('The evidence register could not be prepared.'); }
  }
  return <section className="space-y-4"><h1 className="text-2xl font-bold">Evidence register export · {job.project_name}</h1><p>Select saved records from one page for an internal JSON register. This includes record descriptions and internal notes, not evidence files. The internal ZIP pack adds a PDF index and accessible original files. It contains private notes: review before sharing. It does not send anything to clients. Maximum 100 files and 50 MB per pack.</p><LoadState {...state}/><div className="flex flex-wrap items-center gap-3"><button className="border rounded px-4 py-2" disabled={packing || offset === 0} onClick={() => changePage(Math.max(0, offset - EVIDENCE_REGISTER_PAGE_SIZE))}>Previous page</button><span>Page {offset / EVIDENCE_REGISTER_PAGE_SIZE + 1}</span><button className="border rounded px-4 py-2" disabled={packing || !state.data || offset + EVIDENCE_REGISTER_PAGE_SIZE >= state.data.total} onClick={() => changePage(offset + EVIDENCE_REGISTER_PAGE_SIZE)}>Next page</button><button className="border rounded px-4 py-2" disabled={packing || state.loading} onClick={refresh}>Refresh</button></div>{error && <p role="alert">{error}</p>}{state.data && <><p>{state.data.rows.length} records on this page · {state.data.total} accessible records at load time. Selection resets when changing or refreshing pages.</p>{state.data.rows.length === 0 && <p>No evidence records on this page. Refresh or return to the previous page if records have changed.</p>}{state.data.rows.map(record => <label className="flex gap-3 border rounded-xl p-4" key={record.id}><input type="checkbox" disabled={packing} checked={selected.includes(record.id)} onChange={event => setSelected(ids => event.target.checked ? [...ids, record.id] : ids.filter(id => id !== record.id))}/><span>{record.caption || record.evidence_type}<span className="block text-sm">{record.captured_at || 'No capture date'} · {record.visibility} · {record.review_status}</span></span></label>)}<button className="border rounded px-4 py-2" disabled={packing || selected.length === 0} onClick={download}>Download selected records from this page (JSON)</button><button className="border rounded px-4 py-2" disabled={packing || selected.length === 0} onClick={downloadPack}>{packing ? 'Preparing PDF and evidence files…' : 'Download internal pack (ZIP)'}</button></>}</section>;
}
