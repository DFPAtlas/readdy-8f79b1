import { useEffect, useState, useCallback } from 'react';
import type { Dispute } from '@/types/disputes';
import {
  DISPUTE_EVIDENCE_CATEGORY_LABELS,
  DISPUTE_EVIDENCE_SOURCE_LABELS,
  DISPUTE_EVIDENCE_STATUS_LABELS,
} from '@/types/disputes';
import { disputeEvidenceService, type EvidenceDetailResponse } from '@/services/dispute-evidence.service';
import { formatDate, formatDateTime, formatFileSize } from '@/pages/disputes/helpers';
import { useToast } from '@/components/base/Toast';

interface EvidenceDetailModalProps {
  evidenceId: string | null;
  dispute: Dispute;
  nameByUser: Map<string, string>;
  myRole: 'claimant' | 'respondent' | null;
  onClose: () => void;
  onChanged: () => void;
  onViewProject: () => void;
}

function isImage(mime: string | null): boolean {
  return !!mime && ['image/jpeg', 'image/png', 'image/webp'].includes(mime);
}
function isVideo(mime: string | null): boolean {
  return !!mime && ['video/mp4', 'video/quicktime'].includes(mime);
}

export default function EvidenceDetailModal({
  evidenceId,
  dispute,
  nameByUser,
  myRole,
  onClose,
  onChanged,
  onViewProject,
}: EvidenceDetailModalProps) {
  const { showToast } = useToast();
  const [data, setData] = useState<EvidenceDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async () => {
    if (!evidenceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await disputeEvidenceService.detail(evidenceId);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load evidence');
    } finally {
      setLoading(false);
    }
  }, [evidenceId]);

  useEffect(() => {
    setData(null);
    setWithdrawOpen(false);
    setWithdrawReason('');
    if (evidenceId) load();
  }, [evidenceId, load]);

  if (!evidenceId) return null;

  const evidence = data?.evidence;
  const isMine = evidence?.submitted_by_user_id === dispute.claimant_user_id
    ? myRole === 'claimant'
    : evidence?.submitted_by_user_id === dispute.respondent_user_id
      ? myRole === 'respondent'
      : false;
  const canWithdraw = isMine && evidence?.submission_status !== 'withdrawn';

  const handleWithdraw = async () => {
    if (!evidence) return;
    setWithdrawing(true);
    try {
      await disputeEvidenceService.withdraw(evidence.id, withdrawReason.trim() || undefined);
      showToast('Evidence withdrawn. The record is retained for audit.', 'warning');
      setWithdrawOpen(false);
      setWithdrawReason('');
      onChanged();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw evidence');
      setWithdrawOpen(false);
    } finally {
      setWithdrawing(false);
    }
  };

  const handleDownload = () => {
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank', 'noopener');
    }
  };

  return (
    <div className="fixed inset-0 z-[85]" role="dialog" aria-modal="true" aria-labelledby="evidence-detail-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-[92vw] max-w-2xl max-h-[92vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                {evidence?.evidence_reference ?? '…'}
              </span>
              {evidence && (
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  evidence.submission_status === 'validated'
                    ? 'bg-status-green-pale text-status-green'
                    : evidence.submission_status === 'withdrawn'
                      ? 'bg-page text-muted'
                      : 'bg-status-amber-pale text-status-amber'
                }`}>
                  {DISPUTE_EVIDENCE_STATUS_LABELS[evidence.submission_status]}
                </span>
              )}
            </div>
            <h2 id="evidence-detail-title" className="text-lg font-semibold text-main mt-2">
              {evidence?.title ?? 'Loading…'}
            </h2>
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

        {loading && (
          <div className="py-16 text-center">
            <i className="ri-loader-4-line text-2xl text-primary-500 animate-spin"></i>
          </div>
        )}

        {error && !loading && (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-status-red-pale flex items-center justify-center mx-auto mb-3">
              <i className="ri-error-warning-line text-xl text-status-red"></i>
            </div>
            <p className="text-sm text-muted">{error}</p>
          </div>
        )}

        {evidence && data && (
          <div className="mt-4 space-y-4">
            {/* Safe preview — only inert image/video elements, never active content */}
            {data.signedUrl && isImage(evidence.mime_type) && (
              <div className="rounded-xl overflow-hidden border border-border bg-page/50 flex items-center justify-center">
                <img
                  src={data.signedUrl}
                  alt={evidence.title}
                  className="max-h-[420px] w-full object-contain"
                />
              </div>
            )}
            {data.signedUrl && isVideo(evidence.mime_type) && (
              <div className="rounded-xl overflow-hidden border border-border bg-black">
                <video src={data.signedUrl} controls className="w-full max-h-[420px]" />
              </div>
            )}

            {/* Withdrawn banner */}
            {evidence.submission_status === 'withdrawn' && (
              <div className="rounded-xl border border-border bg-page/60 px-4 py-3 text-sm text-muted flex items-center gap-2">
                <i className="ri-eye-off-line"></i>
                This item was withdrawn and is hidden from active evidence lists. The record is retained for audit.
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <Meta label="Category" value={DISPUTE_EVIDENCE_CATEGORY_LABELS[evidence.evidence_category] ?? evidence.evidence_category} />
              <Meta label="Source" value={DISPUTE_EVIDENCE_SOURCE_LABELS[evidence.source_type]} />
              <Meta label="Submitted by" value={evidence.submitted_by_name ?? 'Party'} />
              <Meta label="Event date" value={formatDate(evidence.event_date)} />
              <Meta label="Submitted" value={formatDateTime(evidence.submitted_at)} />
              {evidence.file_size != null && <Meta label="Size" value={formatFileSize(evidence.file_size)} />}
            </div>

            {/* Description */}
            {evidence.description && (
              <div className="rounded-xl border border-border p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Description</p>
                <p className="text-sm text-main mt-1.5 whitespace-pre-wrap">{evidence.description}</p>
              </div>
            )}

            {/* Linked record */}
            {evidence.source_type === 'linked_record' && (
              <div className="rounded-xl border border-border p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Linked project record</p>
                  <p className="text-sm text-main mt-1">{evidence.linked_record_label ?? '—'}</p>
                </div>
                <button
                  type="button"
                  onClick={onViewProject}
                  className="h-9 px-3.5 text-xs font-medium border border-border rounded-lg hover:bg-page cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                >
                  <i className="ri-external-link-line"></i>
                  View project
                </button>
              </div>
            )}

            {/* File integrity */}
            {evidence.file_hash && (
              <div className="rounded-xl border border-border p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">File integrity (SHA-256)</p>
                <p className="text-xs font-mono text-main mt-1.5 break-all">{evidence.file_hash}</p>
                <p className="text-xs text-muted mt-2 flex items-center gap-1">
                  <i className="ri-information-line"></i>
                  This hash helps show whether the stored file later changed. It does not prove the underlying statement is true.
                </p>
                {evidence.original_filename && (
                  <p className="text-xs text-muted mt-1">Original filename: {evidence.original_filename}</p>
                )}
              </div>
            )}

            {/* Validation state */}
            {evidence.submission_status === 'pending_validation' && (
              <div className="rounded-xl border border-status-amber/30 bg-status-amber-pale/50 p-4 text-xs text-muted flex items-start gap-2">
                <i className="ri-shield-check-line text-status-amber text-base mt-0.5"></i>
                <span>
                  This file is pending validation. No malware scan has been performed, so it has not been described as
                  malware-scanned. Exercise normal caution before opening.
                </span>
              </div>
            )}

            {/* Version history */}
            {evidence.versions && evidence.versions.length > 1 && (
              <div className="rounded-xl border border-border p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-3">Version history</p>
                <div className="space-y-2">
                  {evidence.versions.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 text-sm">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${v.is_current ? 'bg-status-green' : 'bg-border'}`}></span>
                      <span className="text-main font-medium">{v.evidence_reference}</span>
                      <span className="text-xs text-muted">{formatDateTime(v.submitted_at)}</span>
                      <span className="text-xs text-muted truncate">{v.submitted_by_name ?? 'Party'}</span>
                      {v.is_current && (
                        <span className="text-[10px] font-medium text-status-green bg-status-green-pale px-2 py-0.5 rounded-full whitespace-nowrap">
                          Current
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted mt-3">
                  Corrections create new versions; the original is preserved and never edited.
                </p>
              </div>
            )}

            {/* Audit summary */}
            {data.audit.length > 0 && (
              <div className="rounded-xl border border-border p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2">Audit summary</p>
                <ul className="space-y-1.5">
                  {data.audit.slice(0, 5).map((a, i) => (
                    <li key={i} className="text-xs text-muted flex items-center gap-2">
                      <i className="ri-history-line"></i>
                      {formatDateTime(a.created_at)} — {a.action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 flex-wrap pt-1">
              {data.signedUrl && evidence.submission_status !== 'withdrawn' && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="h-10 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
                >
                  <i className="ri-download-2-line"></i>
                  Download
                </button>
              )}
              {canWithdraw && (
                <button
                  type="button"
                  onClick={() => setWithdrawOpen(true)}
                  className="h-10 px-4 border border-border bg-white hover:bg-status-red-pale text-status-red text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
                >
                  <i className="ri-close-circle-line"></i>
                  Request withdrawal
                </button>
              )}
            </div>
          </div>
        )}

        {/* Withdraw confirmation — inline to stay above the modal overlay */}
        {withdrawOpen && (
          <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-labelledby="withdraw-title">
            <div className="absolute inset-0 bg-black/40" onClick={() => setWithdrawOpen(false)}></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-[90vw] max-w-md p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-status-amber/10 text-status-amber">
                  <i className="ri-alert-line text-lg"></i>
                </div>
                <div>
                  <h2 id="withdraw-title" className="text-lg font-semibold text-main">Withdraw this evidence?</h2>
                  <p className="text-sm text-muted mt-1">
                    The item will be hidden from active evidence lists but retained in the case record and audit history. This cannot be undone.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-main mb-1.5">Reason (optional)</label>
                <textarea
                  value={withdrawReason}
                  onChange={(e) => setWithdrawReason(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
                  placeholder="Why is this being withdrawn?"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawOpen(false);
                    setWithdrawReason('');
                  }}
                  className="flex-1 h-10 border border-border bg-white text-main rounded-xl text-sm font-semibold hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={withdrawing}
                  className="flex-1 h-10 bg-status-amber hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                >
                  {withdrawing && <i className="ri-loader-4-line animate-spin"></i>}
                  Withdraw evidence
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted">{label}</p>
      <p className="text-main font-medium mt-0.5 break-words">{value}</p>
    </div>
  );
}