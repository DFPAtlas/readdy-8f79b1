import { useState } from 'react';
import type { Dispute } from '@/types/disputes';
import type { LetterOfClaim } from '@/types/dispute-preaction';
import { LETTER_STATUS_LABELS } from '@/types/dispute-preaction';
import { disputePreactionService } from '@/services/dispute-preaction.service';
import { useToast } from '@/components/base/Toast';
import { formatPence, formatDateTime, formatDate } from '@/pages/disputes/helpers';

function statusTone(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-page text-muted';
    case 'ready_for_review':
      return 'bg-status-amber-pale text-status-amber';
    case 'finalised':
      return 'bg-primary-100 text-primary-700';
    case 'sent_external':
    case 'sent_buildnerve':
      return 'bg-status-green-pale text-status-green';
    case 'superseded':
      return 'bg-page text-muted line-through';
    default:
      return 'bg-page text-muted';
  }
}

interface LetterListProps {
  dispute: Dispute;
  letters: LetterOfClaim[];
  currentUserId: string | null;
  canGenerate: boolean;
  onEdit: (letter: LetterOfClaim | null) => void;
  onChanged: () => void;
}

export default function LetterList({
  dispute,
  letters,
  currentUserId,
  canGenerate,
  onEdit,
  onChanged,
}: LetterListProps) {
  const { showToast } = useToast();
  const [sending, setSending] = useState(false);
  const [sendTarget, setSendTarget] = useState<LetterOfClaim | null>(null);
  const [method, setMethod] = useState('');
  const [sentDate, setSentDate] = useState('');
  const [recipient, setRecipient] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const sorted = [...letters].sort((a, b) => b.version - a.version);

  const finalise = async (letter: LetterOfClaim) => {
    setError(null);
    try {
      await disputePreactionService.finaliseLetter(letter.id);
      showToast('Letter finalised — now read-only.', 'success');
      onChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to finalise', 'error');
    }
  };

  const download = async (letter: LetterOfClaim) => {
    const body = letter.letter_body ?? 'Letter of Claim — no body available.';
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dispute.case_reference}-letter-of-claim-v${letter.version}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    try {
      await disputePreactionService.recordDownload(letter.id);
      onChanged();
    } catch {
      // Download still succeeded; recording is best-effort.
    }
  };

  const newVersion = async (letter: LetterOfClaim) => {
    setError(null);
    try {
      const res = await disputePreactionService.createLetterVersion(letter.id);
      showToast('New draft version created.', 'success');
      onChanged();
      onEdit(res.letter);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create version', 'error');
    }
  };

  const submitSending = async () => {
    if (!sendTarget || !method.trim() || !sentDate) {
      setError('Please provide a sending method and date.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await disputePreactionService.recordSending({
        letterId: sendTarget.id,
        method: method.trim(),
        sentDate,
        recipient: recipient.trim() || null,
      });
      showToast('Sending recorded. BuildNerve does not confirm legal service.', 'success');
      setSendTarget(null);
      setMethod('');
      setSentDate('');
      setRecipient('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record sending');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-main">Letter of Claim</h3>
          <p className="text-xs text-muted mt-0.5">
            A draft uses only verified dispute data and your own input. Finalised letters are read-only.
          </p>
        </div>
        {canGenerate && (
          <button
            type="button"
            onClick={() => onEdit(null)}
            className="h-10 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 flex-shrink-0"
          >
            <i className="ri-add-line text-lg"></i>
            Draft letter
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted mt-4">
          No Letter of Claim drafted yet. Only the claimant can generate a draft.
        </p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {sorted.map((letter) => {
            const isMine = letter.created_by_user_id === currentUserId;
            const editable = isMine && (letter.status === 'draft' || letter.status === 'ready_for_review');
            const finalisable = isMine && (letter.status === 'draft' || letter.status === 'ready_for_review');
            const canDownload = letter.status === 'finalised' || letter.status === 'sent_external' || letter.status === 'sent_buildnerve';
            const canSend = isMine && (letter.status === 'finalised' || letter.status === 'sent_external');
            const canVersion = isMine && (letter.status === 'finalised' || letter.status === 'sent_external' || letter.status === 'sent_buildnerve');
            return (
              <div key={letter.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-main">v{letter.version}</span>
                      <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${statusTone(letter.status)}`}>
                        {LETTER_STATUS_LABELS[letter.status]}
                      </span>
                      {letter.supersedes_letter_id && (
                        <span className="text-[11px] text-status-amber flex items-center gap-1">
                          <i className="ri-git-branch-line"></i> Corrects v{(letter.version - 1)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {letter.created_by_name ?? 'Claimant'} · created {formatDateTime(letter.created_at)}
                    </p>
                    {letter.amount_pence != null && (
                      <p className="text-sm font-semibold text-main mt-1">Amount: {formatPence(letter.amount_pence, dispute.currency)}</p>
                    )}
                    {letter.finalised_at && <p className="text-[11px] text-muted mt-0.5">Finalised {formatDateTime(letter.finalised_at)}</p>}
                    {letter.sent_method && (
                      <p className="text-[11px] text-muted mt-0.5">
                        Recorded sent via {letter.sent_method}{letter.sent_date ? ` on ${formatDate(letter.sent_date)}` : ''}{letter.recipient ? ` to ${letter.recipient}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setPreviewId(previewId === letter.id ? null : letter.id)}
                      className="h-8 px-3 border border-border text-xs font-medium rounded-lg hover:bg-page cursor-pointer whitespace-nowrap"
                    >
                      {previewId === letter.id ? 'Hide' : 'View'}
                    </button>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => onEdit(letter)}
                        className="h-8 px-3 border border-border text-xs font-medium rounded-lg hover:bg-page cursor-pointer whitespace-nowrap"
                      >
                        Edit
                      </button>
                    )}
                    {finalisable && (
                      <button
                        type="button"
                        onClick={() => finalise(letter)}
                        className="h-8 px-3 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        Finalise
                      </button>
                    )}
                    {canDownload && (
                      <button
                        type="button"
                        onClick={() => download(letter)}
                        className="h-8 px-3 border border-border text-xs font-medium rounded-lg hover:bg-page cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                      >
                        <i className="ri-download-line"></i> Download
                      </button>
                    )}
                    {canSend && (
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setSendTarget(letter);
                        }}
                        className="h-8 px-3 border border-border text-xs font-medium rounded-lg hover:bg-page cursor-pointer whitespace-nowrap"
                      >
                        Record sending
                      </button>
                    )}
                    {canVersion && (
                      <button
                        type="button"
                        onClick={() => newVersion(letter)}
                        className="h-8 px-3 border border-border text-xs font-medium rounded-lg hover:bg-page cursor-pointer whitespace-nowrap"
                      >
                        New version
                      </button>
                    )}
                  </div>
                </div>

                {previewId === letter.id && letter.letter_body && (
                  <pre className="mt-3 rounded-lg bg-page p-3 text-xs text-main whitespace-pre-wrap font-sans overflow-x-auto">
                    {letter.letter_body}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted flex items-start gap-1.5">
        <i className="ri-shield-check-line flex-shrink-0 mt-0.5"></i>
        <span>
          BuildNerve records what you do here but does not send the letter, confirm delivery, or confirm that it was
          legally served. Do not rely on it as a court filing or a solicitor-approved agreement.
        </span>
      </p>

      {/* Record sending modal */}
      {sendTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSendTarget(null)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-md p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-main">Record how it was sent</h3>
              <button type="button" onClick={() => setSendTarget(null)} className="w-8 h-8 rounded-lg hover:bg-page flex items-center justify-center text-muted cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <p className="text-xs text-muted mt-1">
              BuildNerve does not send the letter or confirm legal service. This simply records your own sending details.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted">Sending method</label>
                <input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="e.g. Recorded delivery, email" className="mt-1 w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Sending date</label>
                <input type="date" value={sentDate} onChange={(e) => setSentDate(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Recipient (optional)</label>
                <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient name" className="mt-1 w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-status-red">{error}</p>}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setSendTarget(null)} className="h-10 px-4 rounded-xl border border-border text-main text-sm font-medium hover:bg-page cursor-pointer whitespace-nowrap">Cancel</button>
              <button type="button" onClick={submitSending} disabled={sending} className="h-10 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer whitespace-nowrap">
                {sending ? 'Recording…' : 'Record sending'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}