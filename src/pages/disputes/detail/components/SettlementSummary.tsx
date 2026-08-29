import { useState } from 'react';
import type { Dispute, DisputePartyView, SettlementOffer, SettlementObligation } from '@/types/disputes';
import {
  SETTLEMENT_OFFER_TYPE_LABELS,
  SETTLEMENT_OBLIGATION_STATUS_LABELS,
  getDisputeRoleLabel,
} from '@/types/disputes';
import { formatPence, formatDate, formatDateTime } from '@/pages/disputes/helpers';

type Transition = 'start' | 'complete' | 'confirm' | 'dispute';

interface SettlementSummaryProps {
  dispute: Dispute;
  offer: SettlementOffer | null;
  obligations: SettlementObligation[];
  parties: DisputePartyView[];
  projectName: string | null;
  currentUserId: string | null;
  submitting: boolean;
  onTransition: (obligationId: string, transition: Transition, reason?: string) => void;
}

function obligationTone(status: string): string {
  switch (status) {
    case 'confirmed_completed':
      return 'bg-status-green-pale text-status-green';
    case 'submitted_completed':
      return 'bg-status-amber-pale text-status-amber';
    case 'in_progress':
      return 'bg-primary-100 text-primary-700';
    case 'disputed_completion':
      return 'bg-status-red-pale text-status-red';
    case 'overdue':
      return 'bg-status-red-pale text-status-red';
    default:
      return 'bg-page text-muted';
  }
}

export default function SettlementSummary({
  dispute,
  offer,
  obligations,
  parties,
  projectName,
  currentUserId,
  submitting,
  onTransition,
}: SettlementSummaryProps) {
  const [disputeTarget, setDisputeTarget] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

  const nameByUser = new Map<string, string>();
  parties.forEach((p) => nameByUser.set(p.user_id, p.profile_name ?? p.display_name_snapshot ?? 'Party'));

  if (!offer) return null;

  const acceptedBy = offer.responded_by_name ?? 'Other party';

  const progress = (() => {
    if (obligations.length === 0) return { done: 0, total: 0, pct: 0 };
    const done = obligations.filter((o) => o.effective_status === 'confirmed_completed').length;
    return { done, total: obligations.length, pct: Math.round((done / obligations.length) * 100) };
  })();

  return (
    <section className="bg-white border border-status-green/25 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-main flex items-center gap-2">
            <i className="ri-file-check-line text-status-green"></i>
            Settlement record
          </h2>
          <p className="text-[11px] text-muted mt-1">
            BuildNerve settlement record — review before relying on it.
          </p>
        </div>
        {obligations.length > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted">Resolution progress</p>
            <p className="text-sm font-semibold text-main">{progress.done}/{progress.total} obligations confirmed</p>
          </div>
        )}
      </div>

      {/* Accepted terms */}
      <div className="mt-4 rounded-xl border border-border bg-page/40 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Case reference</p>
            <p className="text-main font-semibold">{dispute.case_reference}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Project</p>
            <p className="text-main">{projectName ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Offer type</p>
            <p className="text-main">{SETTLEMENT_OFFER_TYPE_LABELS[offer.offer_type]}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-border/60">
          <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Accepted terms</p>
          <p className="text-sm text-main mt-1 whitespace-pre-wrap">{offer.summary}</p>
        </div>

        {(offer.payment_amount_pence != null || offer.work_description) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {offer.payment_amount_pence != null && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Amount</p>
                <p className="text-main font-semibold">{formatPence(offer.payment_amount_pence, offer.currency)}</p>
              </div>
            )}
            {offer.work_description && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Work obligation</p>
                <p className="text-main whitespace-pre-wrap">{offer.work_description}</p>
              </div>
            )}
          </div>
        )}

        {(offer.payment_due_date || offer.proposed_completion_date) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {offer.payment_due_date && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Payment due</p>
                <p className="text-main">{formatDate(offer.payment_due_date)}</p>
              </div>
            )}
            {offer.proposed_completion_date && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Completion date</p>
                <p className="text-main">{formatDate(offer.proposed_completion_date)}</p>
              </div>
            )}
          </div>
        )}

        {offer.referenced_evidence && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Referenced evidence</p>
            <p className="text-sm text-main mt-1 whitespace-pre-wrap">{offer.referenced_evidence}</p>
          </div>
        )}

        {offer.conditions && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Conditions</p>
            <p className="text-sm text-main mt-1 whitespace-pre-wrap">{offer.conditions}</p>
          </div>
        )}

        <div className="pt-2 border-t border-border/60 flex items-center gap-4 flex-wrap text-xs text-muted">
          <span>Offered by <span className="text-main font-medium">{offer.offered_by_name ?? 'Party'}</span></span>
          <span>Accepted by <span className="text-main font-medium">{acceptedBy}</span></span>
          {offer.responded_at && <span>Accepted {formatDateTime(offer.responded_at)}</span>}
        </div>
      </div>

      {/* Obligations */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-main">Settlement obligations</h3>
        {obligations.length === 0 ? (
          <p className="text-sm text-muted mt-2">No obligations have been recorded yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {obligations.map((ob) => {
              const status = ob.effective_status ?? ob.status;
              const isMySubmission = ob.submitted_by_user_id === currentUserId;
              const tone = obligationTone(status);
              return (
                <div key={ob.id} className="rounded-xl border border-border p-3.5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                          {ob.kind === 'payment' ? 'Payment' : ob.kind === 'work' ? 'Work' : 'Other'}
                        </span>
                        <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${tone}`}>
                          {SETTLEMENT_OBLIGATION_STATUS_LABELS[status as keyof typeof SETTLEMENT_OBLIGATION_STATUS_LABELS] ?? status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-main mt-1">{ob.title}</p>
                      <div className="flex items-center gap-3 flex-wrap mt-1 text-xs text-muted">
                        {ob.amount_pence != null && <span>{formatPence(ob.amount_pence, dispute.currency)}</span>}
                        {ob.due_date && (
                          <span className={status === 'overdue' ? 'text-status-red font-medium' : ''}>
                            Due {formatDate(ob.due_date)}
                          </span>
                        )}
                        {ob.submitted_by_name && <span>Completed by {ob.submitted_by_name}</span>}
                        {ob.confirmed_by_name && <span>Confirmed by {ob.confirmed_by_name}</span>}
                      </div>
                      {status === 'disputed_completion' && ob.dispute_reason && (
                        <p className="text-xs text-status-red mt-1">Dispute reason: {ob.dispute_reason}</p>
                      )}
                      {status === 'submitted_completed' && isMySubmission && (
                        <p className="text-xs text-status-amber mt-1">Awaiting the other party&rsquo;s confirmation.</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {(status === 'not_started' || status === 'overdue' || status === 'disputed_completion') && (
                        <>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => onTransition(ob.id, 'start')}
                            className="h-8 px-3 border border-border text-main text-xs font-medium rounded-lg hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Start
                          </button>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => onTransition(ob.id, 'complete')}
                            className="h-8 px-3 bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Mark complete
                          </button>
                        </>
                      )}
                      {status === 'in_progress' && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => onTransition(ob.id, 'complete')}
                          className="h-8 px-3 bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Mark complete
                        </button>
                      )}
                      {status === 'submitted_completed' && !isMySubmission && (
                        <>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => onTransition(ob.id, 'confirm')}
                            className="h-8 px-3 bg-status-green hover:bg-status-green/90 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => {
                              setDisputeTarget(ob.id);
                              setDisputeReason('');
                            }}
                            className="h-8 px-3 border border-status-red/30 text-status-red text-xs font-medium rounded-lg hover:bg-status-red-pale transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Dispute
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {disputeTarget === ob.id && (
                    <div className="mt-3 rounded-lg border border-status-red/20 bg-status-red-pale/40 p-3">
                      <label className="block text-xs font-medium text-main mb-1.5">Reason for disputing completion</label>
                      <textarea
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        maxLength={500}
                        rows={2}
                        className="w-full px-3 py-2 bg-white border border-border rounded-lg text-sm text-main focus:outline-none focus:border-status-red/40 resize-none"
                        placeholder="Explain why you do not consider this obligation complete…"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setDisputeTarget(null)}
                          className="h-9 px-3 border border-border text-main text-xs font-medium rounded-lg hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={submitting || !disputeReason.trim()}
                          onClick={() => {
                            onTransition(ob.id, 'dispute', disputeReason.trim());
                            setDisputeTarget(null);
                          }}
                          className="h-9 px-3 bg-status-red hover:bg-status-red/90 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Confirm dispute
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Outstanding actions */}
      {obligations.filter((o) => (o.effective_status ?? o.status) !== 'confirmed_completed').length > 0 && (
        <p className="mt-4 text-xs text-muted flex items-center gap-1.5">
          <i className="ri-information-line"></i>
          The case will only be marked resolved once both parties have confirmed every obligation as complete.
        </p>
      )}
    </section>
  );
}