import { useState } from 'react';
import JobRecordScope, { type JobRecordContext } from '@/components/live/JobRecordScope';
import LoadState from '@/components/live/LoadState';
import { useScopedResource } from '@/hooks/useScopedResource';
import { evidenceService } from '@/services/evidence.service';

export default function EvidencePackPage() { return <JobRecordScope>{context => <EvidencePack {...context}/>}</JobRecordScope>; }
function EvidencePack({ orgId, job }: JobRecordContext) {
  const state = useScopedResource(`${orgId}:${job.id}`, () => evidenceService.listByJob(orgId, job.id));
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  function download() {
    if (!state.data) return;
    setError('');
    try {
      // Do not persist expiring signed URLs or imply that the evidence binaries are included.
      const records = state.data.filter(record => selected.includes(record.id)).map(({ previewUrl: _previewUrl, ...record }) => record);
      const blob = new Blob([JSON.stringify({ format: 'buildnerve-evidence-register-v1', audience: 'internal', generatedAt: new Date().toISOString(), job: { id: job.id, reference: job.reference, project: job.project_name }, records }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `evidence-register-${job.id}.json`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError('The evidence register could not be prepared.'); }
  }
  return <section className="space-y-4"><h1 className="text-2xl font-bold">Evidence register export · {job.project_name}</h1><p>Select saved records for an internal JSON register. This includes record descriptions and internal notes, not evidence files. It is not a client-safe PDF pack and does not send anything to the client.</p><LoadState {...state}/>{error && <p role="alert">{error}</p>}{state.data && <><p>{state.data.length} records loaded</p>{state.data.length === 0 && <p>No saved evidence was returned for this job.</p>}{state.data.map(record => <label className="flex gap-3 border rounded-xl p-4" key={record.id}><input type="checkbox" checked={selected.includes(record.id)} onChange={event => setSelected(ids => event.target.checked ? [...ids, record.id] : ids.filter(id => id !== record.id))}/><span>{record.caption || record.evidenceType}<span className="block text-sm">{record.capturedAt || 'No capture date'} · {record.visibility} · {record.reviewStatus}</span></span></label>)}<button className="border rounded px-4 py-2" disabled={!state.data.some(record => selected.includes(record.id))} onClick={download}>Download selected register (JSON)</button></>}</section>;
}
