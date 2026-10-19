import { useState } from 'react';
import { workforceDocumentsService, type WorkforceDocumentCategory } from '@/services/workforce-documents.service';

interface DocumentRow {
  id: string;
  name: string;
  category: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  review_status: string;
  review_note?: string | null;
  reviewed_at?: string | null;
  uploaded_at: string;
}
interface Props {
  orgId: string;
  personId: string;
  role: string | null;
  isReadOnly: boolean;
  documents: DocumentRow[];
  onChanged: () => void;
}
const categories: Array<[WorkforceDocumentCategory, string]> = [
  ['identity', 'Identity'], ['business', 'Business details'], ['cis', 'CIS'],
  ['insurance', 'Insurance'], ['qualification', 'Qualification'], ['training', 'Training'],
  ['right_to_work', 'Right to work'], ['site_induction', 'Site induction'],
  ['rams', 'RAMS'], ['contract', 'Contract'], ['bank_change', 'Bank change'], ['other', 'Other'],
];
const inputClass = 'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm';
const buttonClass = 'rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium disabled:opacity-50';
function label(value: string) { return value.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase()); }
function formatSize(size: number) { return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`; }

export default function WorkforceDocumentsPanel({ orgId, personId, role, isReadOnly, documents, onChanged }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<WorkforceDocumentCategory>('qualification');
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canUpload = !isReadOnly && ['owner', 'admin', 'project_manager', 'site_supervisor'].includes(role || '');
  const canReview = !isReadOnly && ['owner', 'admin', 'project_manager'].includes(role || '');

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true); setError('');
    try {
      await workforceDocumentsService.upload(orgId, personId, name, category, file);
      setName(''); setFile(null);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The document could not be saved.');
    } finally { setBusy(false); }
  }
  async function review(documentId: string, status: 'accepted' | 'rejected') {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await workforceDocumentsService.review(orgId, documentId, status, notes[documentId] || '');
      setNotes(value => ({ ...value, [documentId]: '' }));
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The review could not be saved.');
    } finally { setBusy(false); }
  }
  async function openDocument(documentId: string) {
    setError('');
    try {
      const url = await workforceDocumentsService.signedUrl(orgId, personId, documentId);
      setLinks(value => ({ ...value, [documentId]: url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The document could not be opened.');
    }
  }

  return <section className="rounded-xl border border-border bg-white p-4">
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <div><h2 className="text-lg font-semibold">Documents</h2><p className="text-xs text-muted">Private files; access is limited to authorised workforce office roles.</p></div>
      <span className="text-sm text-muted">{documents.length} saved</span>
    </div>
    {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {canUpload && <form className="mb-4 grid gap-3 rounded-lg bg-background-50 p-3 md:grid-cols-2" onSubmit={event => void upload(event)}>
      <label className="text-sm">Document name<input className={inputClass} value={name} maxLength={160} onChange={event => setName(event.target.value)} required placeholder="e.g. ECS card" /></label>
      <label className="text-sm">Category<select className={inputClass} value={category} onChange={event => setCategory(event.target.value as WorkforceDocumentCategory)}>{categories.map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
      <label className="text-sm">File<input className={inputClass} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx" onChange={event => setFile(event.target.files?.[0] || null)} required /></label>
      <div className="flex items-end"><button className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={busy || !file}>{busy ? 'Saving…' : 'Upload for review'}</button></div>
      <p className="text-xs text-muted md:col-span-2">PDF, image, Word or Excel · maximum 20 MB. New uploads are marked awaiting review.</p>
    </form>}
    {documents.length === 0 ? <p className="py-5 text-sm text-muted">No documents recorded.</p> : <ul className="space-y-3">
      {documents.map(document => <li className="rounded-lg border border-border p-3" key={document.id}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><strong>{document.name}</strong><p className="text-sm text-muted">{label(document.category)} · {label(document.review_status)} · {formatSize(document.size_bytes)} · Uploaded {new Date(document.uploaded_at).toLocaleDateString('en-GB')}</p><p className="text-xs text-muted">{document.original_filename}</p>{document.review_note && <p className="mt-1 text-sm">Review note: {document.review_note}</p>}</div>
          <div className="flex flex-wrap items-center gap-2"><button type="button" className={buttonClass} onClick={() => void openDocument(document.id)}>Prepare secure view</button>{links[document.id] && <a className="rounded-lg bg-primary-500 px-3 py-2 text-sm font-medium text-white" href={links[document.id]} target="_blank" rel="noreferrer">Open file</a>}</div>
        </div>
        {canReview && ['submitted', 'awaiting_review', 'rejected'].includes(document.review_status) && <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto]"><label className="text-sm">Review note<textarea className={inputClass} value={notes[document.id] || ''} onChange={event => setNotes(value => ({ ...value, [document.id]: event.target.value }))} maxLength={2000} placeholder="A reason is required when rejecting" /></label><button type="button" className={buttonClass} disabled={busy} onClick={() => void review(document.id, 'accepted')}>Accept</button><button type="button" className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50" disabled={busy || !(notes[document.id] || '').trim()} onClick={() => void review(document.id, 'rejected')}>Reject</button></div>}
      </li>)}
    </ul>}
  </section>;
}
