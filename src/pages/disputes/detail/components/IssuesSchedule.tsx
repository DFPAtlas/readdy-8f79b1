import { useState } from 'react';
import type { PreActionIssue, PreActionEvidenceOption, LetterEvidenceRef } from '@/types/dispute-preaction';
import { PRE_ACTION_ISSUE_STATUS_LABELS } from '@/types/dispute-preaction';
import { disputePreactionService } from '@/services/dispute-preaction.service';
import { useToast } from '@/components/base/Toast';
import { formatPence } from '@/pages/disputes/helpers';

interface IssuesScheduleProps {
  disputeId: string;
  issues: PreActionIssue[];
  myRole: 'claimant' | 'respondent' | null;
  evidenceOptions: PreActionEvidenceOption[];
  currency: string;
  onChanged: () => void;
}

interface IssueEditorProps {
  open: boolean;
  issue: PreActionIssue | null;
  myRole: 'claimant' | 'respondent' | null;
  evidenceOptions: PreActionEvidenceOption[];
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}

function IssueEditor({ open, issue, myRole, evidenceOptions, submitting, error, onClose, onSubmit }: IssueEditorProps) {
  const [title, setTitle] = useState(issue?.title ?? '');
  const [myPosition, setMyPosition] = useState(issue?.claimant_position ?? issue?.respondent_position ?? '');
  const [agreedFacts, setAgreedFacts] = useState(issue?.agreed_facts ?? '');
  const [disputedFacts, setDisputedFacts] = useState(issue?.disputed_facts ?? '');
  const [amount, setAmount] = useState(issue?.amount_pence != null ? String(issue.amount_pence / 100) : '');
  const [resolutionStatus, setResolutionStatus] = useState(issue?.resolution_status ?? 'open');
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>(
    (issue?.evidence_references ?? []).map((e) => e.id),
  );

  if (!open) return null;

  const canEditPosition = myRole === 'claimant' || myRole === 'respondent';

  const submit = () => {
    if (!title.trim()) return;
    const evidenceRefs: LetterEvidenceRef[] = evidenceOptions
      .filter((e) => selectedEvidence.includes(e.id))
      .map((e) => ({ id: e.id, reference: e.reference, title: e.title }));
    const amountPence = amount.trim() === '' ? null : Math.round(parseFloat(amount) * 100);
    onSubmit({
      title: title.trim(),
      myPosition: myPosition.trim() || null,
      agreedFacts: agreedFacts.trim() || null,
      disputedFacts: disputedFacts.trim() || null,
      evidenceReferences: evidenceRefs.length ? evidenceRefs : null,
      amountPence: Number.isFinite(amountPence) ? amountPence : null,
      resolutionStatus,
    });
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-main">{issue ? issue.issue_reference : 'Add issue'}</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-page flex items-center justify-center text-muted cursor-pointer">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted">Issue title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!!issue}
              placeholder="A short neutral description of the issue"
              className="mt-1 w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:bg-page"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted">
              Your position ({myRole === 'claimant' ? 'claimant' : 'respondent'})
            </label>
            <textarea
              value={myPosition}
              onChange={(e) => setMyPosition(e.target.value)}
              disabled={!canEditPosition}
              rows={3}
              maxLength={10000}
              placeholder="State your own position on this issue. You can only edit your own position."
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-white text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
            />
            {!canEditPosition && (
              <p className="text-[11px] text-muted mt-1">Your position can only be entered by your own party.</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted">Agreed facts</label>
              <textarea
                value={agreedFacts}
                onChange={(e) => setAgreedFacts(e.target.value)}
                rows={3}
                maxLength={10000}
                placeholder="Facts both parties agree on"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-white text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Disputed facts</label>
              <textarea
                value={disputedFacts}
                onChange={(e) => setDisputedFacts(e.target.value)}
                rows={3}
                maxLength={10000}
                placeholder="Facts the parties do not agree on"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-white text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted">Amount connected to this issue (£)</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className="mt-1 w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Resolution status</label>
              <select
                value={resolutionStatus}
                onChange={(e) => setResolutionStatus(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg border border-border bg-white text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary-300 cursor-pointer"
              >
                <option value="open">Open</option>
                <option value="partly_resolved">Partly resolved</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          {evidenceOptions.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted">Evidence references</label>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                {evidenceOptions.map((e) => {
                  const active = selectedEvidence.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() =>
                        setSelectedEvidence((prev) =>
                          active ? prev.filter((id) => id !== e.id) : [...prev, e.id],
                        )
                      }
                      className={`h-8 px-3 rounded-full text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                        active ? 'bg-primary-100 border-primary-300 text-primary-700' : 'border-border text-muted hover:text-main'
                      }`}
                    >
                      {e.reference}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-status-red">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl border border-border text-main text-sm font-medium hover:bg-page cursor-pointer whitespace-nowrap">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !title.trim()}
            className="h-10 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {submitting ? 'Saving…' : issue ? 'Save changes' : 'Add issue'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IssuesSchedule({
  disputeId,
  issues,
  myRole,
  evidenceOptions,
  currency,
  onChanged,
}: IssuesScheduleProps) {
  const { showToast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PreActionIssue | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canParty = myRole === 'claimant' || myRole === 'respondent';

  const submitIssue = async (payload: Record<string, unknown>) => {
    setSubmitting(true);
    setError(null);
    try {
      if (editTarget) {
        // Update my own position + shared facts + resolution status.
        if (payload.myPosition !== undefined) {
          await disputePreactionService.updateIssuePosition({
            issueId: editTarget.id,
            myPosition: (payload.myPosition as string) || null,
          });
        }
        await disputePreactionService.updateIssueFacts({
          issueId: editTarget.id,
          agreedFacts: payload.agreedFacts as string | null,
          disputedFacts: payload.disputedFacts as string | null,
          resolutionStatus: payload.resolutionStatus as string,
        });
        showToast('Issue updated.', 'success');
      } else {
        await disputePreactionService.createIssue({
          disputeId,
          title: payload.title as string,
          myPosition: (payload.myPosition as string) || null,
          agreedFacts: payload.agreedFacts as string | null,
          disputedFacts: payload.disputedFacts as string | null,
          evidenceReferences: (payload.evidenceReferences as LetterEvidenceRef[]) || null,
          amountPence: (payload.amountPence as number) || null,
        });
        showToast('Issue added.', 'success');
      }
      setEditorOpen(false);
      setEditTarget(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save issue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-main">Agreed &amp; disputed issues</h3>
          <p className="text-xs text-muted mt-0.5">
            Each party controls only their own position. Neither party can rewrite the other's statement.
          </p>
        </div>
        {canParty && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setEditTarget(null);
              setEditorOpen(true);
            }}
            className="h-10 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 flex-shrink-0"
          >
            <i className="ri-add-line text-lg"></i>
            Add issue
          </button>
        )}
      </div>

      {issues.length === 0 ? (
        <p className="text-sm text-muted mt-4">
          No issues recorded yet. Add issues to build a clear picture of what is agreed and disputed.
        </p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {issues.map((issue) => {
            const myPosition = myRole === 'claimant' ? issue.claimant_position : issue.respondent_position;
            const otherPosition = myRole === 'claimant' ? issue.respondent_position : issue.claimant_position;
            const otherLabel = myRole === 'claimant' ? 'Respondent' : 'Claimant';
            return (
              <div key={issue.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-primary-600">{issue.issue_reference}</span>
                      <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        issue.resolution_status === 'resolved' ? 'bg-status-green-pale text-status-green'
                          : issue.resolution_status === 'partly_resolved' ? 'bg-status-amber-pale text-status-amber'
                            : 'bg-page text-muted'
                      }`}>
                        {PRE_ACTION_ISSUE_STATUS_LABELS[issue.resolution_status]}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-main mt-1">{issue.title}</h4>
                  </div>
                  {issue.amount_pence != null && (
                    <span className="text-sm font-semibold text-main">{formatPence(issue.amount_pence, currency)}</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="rounded-lg bg-page p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Claimant position</p>
                    <p className="text-sm text-main mt-1 whitespace-pre-wrap">{issue.claimant_position || 'Not stated'}</p>
                  </div>
                  <div className="rounded-lg bg-page p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Respondent position</p>
                    <p className="text-sm text-main mt-1 whitespace-pre-wrap">{issue.respondent_position || 'Not stated'}</p>
                  </div>
                </div>

                {(issue.agreed_facts || issue.disputed_facts) && (
                  <div className="mt-3 space-y-2">
                    {issue.agreed_facts && (
                      <p className="text-xs text-main"><span className="font-semibold text-status-green">Agreed:</span> {issue.agreed_facts}</p>
                    )}
                    {issue.disputed_facts && (
                      <p className="text-xs text-main"><span className="font-semibold text-status-red">Disputed:</span> {issue.disputed_facts}</p>
                    )}
                  </div>
                )}

                {issue.evidence_references && issue.evidence_references.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-muted">Evidence:</span>
                    {issue.evidence_references.map((e) => (
                      <span key={e.id} className="text-[11px] font-medium text-primary-700 bg-primary-100 rounded-full px-2 py-0.5">{e.reference}</span>
                    ))}
                  </div>
                )}

                {canParty && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setEditTarget(issue);
                      setEditorOpen(true);
                    }}
                    className="mt-3 h-8 px-3 border border-border text-main text-xs font-medium rounded-lg hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {myPosition ? 'Edit my position' : 'Add my position'} / facts
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <IssueEditor
        open={editorOpen}
        issue={editTarget}
        myRole={myRole}
        evidenceOptions={evidenceOptions}
        submitting={submitting}
        error={error}
        onClose={() => {
          setEditorOpen(false);
          setEditTarget(null);
        }}
        onSubmit={submitIssue}
      />
    </div>
  );
}