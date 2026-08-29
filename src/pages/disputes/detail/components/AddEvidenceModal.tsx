import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Dispute, DisputeLinkableRecord } from '@/types/disputes';
import {
  DISPUTE_EVIDENCE_CATEGORIES,
  DISPUTE_EVIDENCE_CATEGORY_LABELS,
} from '@/types/disputes';
import { disputeEvidenceService } from '@/services/dispute-evidence.service';

type SourceType = 'file_upload' | 'linked_record' | 'text_note';

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.docx', '.xlsx', '.mp4', '.mov'];
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

interface AddEvidenceModalProps {
  open: boolean;
  dispute: Dispute;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddEvidenceModal({ open, dispute, onClose, onSaved }: AddEvidenceModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [sourceType, setSourceType] = useState<SourceType>('file_upload');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [records, setRecords] = useState<DisputeLinkableRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState('');
  const [declaration, setDeclaration] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setSourceType('file_upload');
      setCategory('');
      setTitle('');
      setDescription('');
      setEventDate('');
      setFile(null);
      setFileError(null);
      setSelectedRecord('');
      setDeclaration(false);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && sourceType === 'linked_record') {
      let cancelled = false;
      setRecordsLoading(true);
      disputeEvidenceService
        .linkableRecords(dispute.id)
        .then((r) => {
          if (!cancelled) setRecords(r);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load project records');
        })
        .finally(() => {
          if (!cancelled) setRecordsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [open, sourceType, dispute.id]);

  const isFile = sourceType === 'file_upload';
  const isLink = sourceType === 'linked_record';
  const isNote = sourceType === 'text_note';

  const canProceed = useMemo(() => {
    if (!category || !title.trim()) return false;
    if (isFile) return !!file && !fileError;
    if (isLink) return !!selectedRecord;
    if (isNote) return description.trim().length > 0;
    return false;
  }, [category, title, isFile, isLink, isNote, file, fileError, selectedRecord, description]);

  const handleFileChange = (f: File | null) => {
    setFileError(null);
    setFile(f);
    if (!f) return;
    const ext = `.${(f.name.split('.').pop() ?? '').toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setFileError('This file type is not supported. Allowed: PDF, JPG, PNG, WEBP, DOCX, XLSX, MP4, MOV.');
      setFile(null);
      return;
    }
    if (f.size > MAX_SIZE) {
      setFileError('File is too large (maximum 20 MB).');
      setFile(null);
      return;
    }
    if (f.size === 0) {
      setFileError('This file is empty.');
      setFile(null);
      return;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!canProceed) return;
      setError(null);
      setStep(2);
      return;
    }

    if (!declaration) return;
    setSubmitting(true);
    setError(null);
    try {
      if (isFile && file) {
        await disputeEvidenceService.upload({
          disputeId: dispute.id,
          file,
          category,
          title: title.trim(),
          description: description.trim() || undefined,
          eventDate: eventDate || undefined,
        });
      } else if (isLink) {
        const rec = records.find((r) => r.id === selectedRecord);
        await disputeEvidenceService.submitLinkedRecord({
          disputeId: dispute.id,
          category,
          title: title.trim(),
          description: description.trim() || undefined,
          eventDate: eventDate || undefined,
          recordType: rec?.type ?? '',
          recordId: selectedRecord,
        });
      } else {
        await disputeEvidenceService.submitTextNote({
          disputeId: dispute.id,
          category,
          title: title.trim(),
          description: description.trim(),
          eventDate: eventDate || undefined,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit evidence');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-labelledby="add-evidence-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-[92vw] max-w-lg max-h-[92vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="add-evidence-title" className="text-lg font-semibold text-main">Add evidence</h2>
            <p className="text-sm text-muted mt-1">
              {step === 1 ? 'Choose a source and describe the evidence.' : 'Review and confirm before submitting.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-page text-muted transition-colors cursor-pointer flex-shrink-0"
            aria-label="Close"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {step === 1 ? (
            <>
              {/* Source type */}
              <div>
                <label className="block text-xs font-medium text-main mb-1.5">Source</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: 'file_upload', icon: 'ri-upload-cloud-2-line', label: 'Upload file' },
                      { key: 'linked_record', icon: 'ri-link', label: 'Project record' },
                      { key: 'text_note', icon: 'ri-file-text-line', label: 'Text note' },
                    ] as { key: SourceType; icon: string; label: string }[]
                  ).map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setSourceType(s.key)}
                      className={`h-16 rounded-xl border text-sm font-medium flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                        sourceType === s.key
                          ? 'border-primary-300 bg-primary-50 text-primary-700'
                          : 'border-border bg-white text-main hover:bg-page'
                      }`}
                    >
                      <i className={`${s.icon} text-lg`}></i>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {isFile && (
                <div>
                  <label className="block text-xs font-medium text-main mb-1.5">File</label>
                  <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border border-dashed border-border bg-page/50 cursor-pointer hover:bg-page transition-colors px-4 text-center">
                    <input
                      type="file"
                      accept={ALLOWED_EXTENSIONS.join(',')}
                      className="hidden"
                      onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                    />
                    <i className="ri-upload-cloud-2-line text-2xl text-muted"></i>
                    {file ? (
                      <span className="text-sm font-medium text-main mt-1 truncate max-w-full">{file.name}</span>
                    ) : (
                      <span className="text-sm text-muted mt-1">Click to choose a file</span>
                    )}
                  </label>
                  <p className="text-[11px] text-muted mt-1.5">
                    Allowed: {ALLOWED_EXTENSIONS.join(', ')} · up to 20 MB. Files are stored privately and served via short-lived signed links.
                  </p>
                  {fileError && <p className="text-xs text-status-red mt-1">{fileError}</p>}
                </div>
              )}

              {isLink && (
                <div>
                  <label className="block text-xs font-medium text-main mb-1.5">Project record</label>
                  <div className="relative">
                    <select
                      value={selectedRecord}
                      onChange={(e) => setSelectedRecord(e.target.value)}
                      className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm text-main appearance-none focus:outline-none focus:border-primary-300 pr-9 cursor-pointer"
                    >
                      <option value="">{recordsLoading ? 'Loading records…' : 'Select a record from this project'}</option>
                      {records.map((r) => (
                        <option key={`${r.type}:${r.id}`} value={r.id}>
                          {r.reference ? `${r.reference} — ` : ''}{r.label}
                        </option>
                      ))}
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"></i>
                  </div>
                  <p className="text-[11px] text-muted mt-1.5">
                    Only records belonging to this dispute&apos;s project can be linked.
                  </p>
                </div>
              )}

              {isNote && (
                <p className="text-xs text-muted bg-page/60 rounded-lg px-3 py-2">
                  A text note records a statement without attaching a file. Use the description field below.
                </p>
              )}

              <div>
                <label className="block text-xs font-medium text-main mb-1.5">Category</label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm text-main appearance-none focus:outline-none focus:border-primary-300 pr-9 cursor-pointer"
                  >
                    <option value="">Select category</option>
                    {DISPUTE_EVIDENCE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{DISPUTE_EVIDENCE_CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                  <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"></i>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-main mb-1.5">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={120}
                  className="w-full h-10 px-3.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300"
                  placeholder="A short, clear title"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-main mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required={isNote}
                  maxLength={500}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
                  placeholder="What does this evidence show?"
                />
                <p className="text-[11px] text-muted text-right mt-1">{description.length}/500</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-main mb-1.5">Date connected to the evidence</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="h-10 px-3.5 bg-page border border-border rounded-xl text-sm text-main focus:outline-none focus:border-primary-300"
                />
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-status-amber/30 bg-status-amber-pale/50 p-4 space-y-2">
                <p className="text-sm font-semibold text-main flex items-center gap-2">
                  <i className="ri-error-warning-line text-status-amber"></i>
                  Before you submit
                </p>
                <ul className="text-xs text-muted space-y-1.5">
                  <li>This item will be visible to the other dispute party.</li>
                  <li>It will become part of the permanent case history.</li>
                  <li>Remove personal information that is not relevant to the dispute.</li>
                  <li>BuildNerve does not decide whether this evidence proves the claim.</li>
                </ul>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={declaration}
                  onChange={(e) => setDeclaration(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-primary-600 border-border rounded cursor-pointer"
                />
                <span className="text-sm text-main">
                  I confirm this evidence is accurate to the best of my knowledge and relevant to this dispute.
                </span>
              </label>
            </>
          )}

          {error && (
            <p className="text-sm text-status-red bg-status-red-pale rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={step === 2 ? () => setStep(1) : onClose}
              className="flex-1 h-10 border border-border bg-white text-main rounded-xl text-sm font-semibold hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
            >
              {step === 2 ? 'Back' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={step === 1 ? !canProceed : (!declaration || submitting)}
              className="flex-1 h-10 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            >
              {submitting && <i className="ri-loader-4-line animate-spin"></i>}
              {step === 1 ? 'Continue' : 'Submit evidence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}