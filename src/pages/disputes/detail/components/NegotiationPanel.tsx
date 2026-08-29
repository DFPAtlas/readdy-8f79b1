import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Dispute, DisputePartyView, SettlementOffer, OfferListResponse } from '@/types/disputes';
import {
  SETTLEMENT_OFFER_TYPE_LABELS,
  SETTLEMENT_OFFER_STATUS_LABELS,
} from '@/types/disputes';
import { disputesService, type CreateOfferInput, type RespondOfferInput } from '@/services/disputes.service';
import { useToast } from '@/components/base/Toast';
import { formatPence, formatDate } from '@/pages/disputes/helpers';
import OfferModal from '@/pages/disputes/detail/components/OfferModal';
import RespondOfferModal, { type RespondMode } from '@/pages/disputes/detail/components/RespondOfferModal';
import SettlementSummary from '@/pages/disputes/detail/components/SettlementSummary';

interface NegotiationPanelProps {
  dispute: Dispute;
  parties: DisputePartyView[];
  myRole: 'claimant' | 'respondent' | null;
  currentUserId: string | null;
  projectName: string | null;
  onChanged: () => void;
}

function offerStatusTone(status: string): string {
  switch (status) {
    case 'submitted':
      return 'bg-primary-100 text-primary-700';
    case 'accepted':
      return 'bg-status-green-pale text-status-green';
    case 'rejected':
      return 'bg-status-red-pale text-status-red';
    case 'countered':
      return 'bg-status-amber-pale text-status-amber';
    case 'withdrawn':
    case 'expired':
      return 'bg-page text-muted';
    case 'completed':
      return 'bg-status-green-pale text-status-green';
    case 'failed':
      return 'bg-status-red-pale text-status-red';
    default:
      return 'bg-page text-muted';
  }
}

export default function NegotiationPanel({
  dispute,
  parties,
  myRole,
  currentUserId,
  projectName,
  onChanged,
}: NegotiationPanelProps) {
  const { showToast } = useToast();
  const [data, setData] = useState<OfferListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [offerModalMode, setOfferModalMode] = useState<'create' | 'counter' | null>(null);
  const [counterTarget, setCounterTarget] = useState<SettlementOffer | null>(null);
  const [respondMode, setRespondMode] = useState<RespondMode | null>(null);
  const [respondTarget, setRespondTarget] = useState<SettlementOffer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await disputesService.listOffers(dispute.id);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load negotiation');
    } finally {
      setLoading(false);
    }
  }, [dispute.id]);

  useEffect(() => {
    load();
  }, [load]);

  const offers = data?.offers ?? [];
  const obligations = data?.obligations ?? [];
  const activeOffer = useMemo(
    () => offers.find((o) => o.id === data?.activeOfferId) ?? null,
    [offers, data?.activeOfferId],
  );
  const acceptedOffer = useMemo(
    () => offers.find((o) => o.id === data?.acceptedOfferId) ?? null,
    [offers, data?.acceptedOfferId],
  );

  const canParty = myRole === 'claimant' || myRole === 'respondent';

  const submitOffer = async (input: CreateOfferInput) => {
    setSubmitting(true);
    setActionError(null);
    try {
      if (offerModalMode === 'counter' && counterTarget) {
        const payload: RespondOfferInput = {
          offerId: counterTarget.id,
          response: 'counter',
          offerType: input.offerType,
          summary: input.summary,
          paymentAmountPence: input.paymentAmountPence,
          currency: input.currency,
          workDescription: input.workDescription,
          proposedCompletionDate: input.proposedCompletionDate,
          paymentDueDate: input.paymentDueDate,
          conditions: input.conditions,
          referencedEvidence: input.referencedEvidence,
          responseDeadline: input.responseDeadline,
        };
        await disputesService.respondOffer(payload);
        showToast('Counteroffer submitted.', 'success');
      } else {
        await disputesService.createOffer(input);
        showToast('Settlement offer submitted.', 'success');
      }
      setOfferModalMode(null);
      setCounterTarget(null);
      await load();
      onChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const respond = async (response: 'accept' | 'reject') => {
    if (!respondTarget) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await disputesService.respondOffer({ offerId: respondTarget.id, response });
      showToast(response === 'accept' ? 'Offer accepted.' : 'Offer rejected.', response === 'accept' ? 'success' : 'warning');
      setRespondMode(null);
      setRespondTarget(null);
      await load();
      onChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const clarify = async (point: string, relevance: string) => {
    if (!respondTarget) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await disputesService.respondOffer({ offerId: respondTarget.id, response: 'clarify', point, relevance });
      showToast('Clarification requested.', 'success');
      setRespondMode(null);
      setRespondTarget(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const withdraw = async (offer: SettlementOffer) => {
    setSubmitting(true);
    setActionError(null);
    try {
      await disputesService.withdrawOffer(offer.id);
      showToast('Offer withdrawn.', 'warning');
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const transitionObligation = async (
    obligationId: string,
    transition: 'start' | 'complete' | 'confirm' | 'dispute',
    reason?: string,
  ) => {
    setSubmitting(true);
    setActionError(null);
    try {
      await disputesService.updateObligation({ obligationId, transition, reason });
      showToast(
        transition === 'confirm'
          ? 'Obligation confirmed.'
          : transition === 'dispute'
            ? 'Completion disputed.'
            : transition === 'start'
              ? 'Obligation started.'
              : 'Obligation marked complete.',
        'success',
      );
      await load();
      onChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <i className="ri-loader-4-line text-2xl text-primary-500 animate-spin"></i>
        <p className="text-sm text-muted mt-3">Loading negotiation…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-status-red-pale flex items-center justify-center mx-auto mb-3">
          <i className="ri-error-warning-line text-xl text-status-red"></i>
        </div>
        <p className="text-sm text-muted">{error}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <section className="bg-white border border-border rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-main">Negotiation</h2>
            <span className="text-xs font-semibold text-muted bg-page px-2 py-0.5 rounded-full">{offers.length}</span>
          </div>
          <p className="text-xs text-muted mt-1">
            Propose and respond to settlement terms. Offers are visible to both parties.
          </p>
        </div>
        {canParty && data?.canCreateOffer && (
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setOfferModalMode('create');
              setCounterTarget(null);
            }}
            className="h-10 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 flex-shrink-0"
          >
            <i className="ri-add-line text-lg"></i>
            Make an offer
          </button>
        )}
      </div>

      {/* Active offer */}
      {activeOffer && (
        <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50/50 p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-700 flex items-center gap-1.5">
              <i className="ri-flashlight-line"></i> Active offer
            </span>
            <span className="text-[11px] text-muted">by {activeOffer.offered_by_name ?? 'Party'}</span>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs font-semibold text-main">{SETTLEMENT_OFFER_TYPE_LABELS[activeOffer.offer_type]}</span>
            {activeOffer.payment_amount_pence != null && (
              <span className="text-sm font-semibold text-main">{formatPence(activeOffer.payment_amount_pence, dispute.currency)}</span>
            )}
            {activeOffer.response_deadline && (
              <span className="text-[11px] text-muted">Expires {formatDate(activeOffer.response_deadline)}</span>
            )}
          </div>
          <p className="text-sm text-main mt-2 whitespace-pre-wrap">{activeOffer.summary}</p>

          {activeOffer.offered_by_user_id !== currentUserId && canParty && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setRespondTarget(activeOffer);
                  setRespondMode('accept');
                }}
                className="h-9 px-4 bg-status-green hover:bg-status-green/90 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setRespondTarget(activeOffer);
                  setRespondMode('reject');
                }}
                className="h-9 px-4 border border-status-red/30 text-status-red text-sm font-semibold rounded-lg hover:bg-status-red-pale transition-colors cursor-pointer whitespace-nowrap"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setCounterTarget(activeOffer);
                  setOfferModalMode('counter');
                }}
                className="h-9 px-4 border border-border text-main text-sm font-semibold rounded-lg hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
              >
                Counteroffer
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setRespondTarget(activeOffer);
                  setRespondMode('clarify');
                }}
                className="h-9 px-4 border border-border text-main text-sm font-semibold rounded-lg hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
              >
                Request clarification
              </button>
            </div>
          )}

          {activeOffer.offered_by_user_id === currentUserId && (
            <button
              type="button"
              onClick={() => withdraw(activeOffer)}
              disabled={submitting}
              className="mt-3 h-8 px-3 border border-border text-muted text-xs font-medium rounded-lg hover:bg-status-red-pale hover:text-status-red transition-colors cursor-pointer whitespace-nowrap"
            >
              Withdraw this offer
            </button>
          )}
        </div>
      )}

      {/* Settlement summary */}
      {acceptedOffer && (
        <div className="mt-4">
          <SettlementSummary
            dispute={dispute}
            offer={acceptedOffer}
            obligations={obligations}
            parties={parties}
            projectName={projectName}
            currentUserId={currentUserId}
            submitting={submitting}
            onTransition={transitionObligation}
          />
        </div>
      )}

      {/* Offer history */}
      <div className="mt-5">
        <h3 className="text-sm font-semibold text-main">Offer history</h3>
        {offers.length === 0 ? (
          <p className="text-sm text-muted mt-2">
            No offers yet. Use &ldquo;Make an offer&rdquo; to propose a resolution.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {[...offers]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((o) => {
                const tone = offerStatusTone(o.status);
                const isMine = o.offered_by_user_id === currentUserId;
                return (
                  <div
                    key={o.id}
                    className={`rounded-xl border p-3.5 ${o.status === 'submitted' ? 'border-border' : 'border-border bg-page/30'}`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-main">{SETTLEMENT_OFFER_TYPE_LABELS[o.offer_type]}</span>
                          <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${tone}`}>
                            {SETTLEMENT_OFFER_STATUS_LABELS[o.status]}
                          </span>
                          {o.supersedes_offer_id && (
                            <span className="text-[11px] text-status-amber flex items-center gap-1">
                              <i className="ri-git-branch-line"></i> Counteroffer
                            </span>
                          )}
                          {isMine && <span className="text-[10px] text-muted">(you)</span>}
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {o.offered_by_name ?? 'Party'} · {formatDate(o.created_at)}
                          {o.responded_by_name && o.responded_at && (
                            <> · {o.status === 'accepted' ? 'accepted' : o.status === 'rejected' ? 'rejected' : 'responded'} by {o.responded_by_name}</>
                          )}
                        </p>
                      </div>
                      {o.payment_amount_pence != null && (
                        <span className="text-sm font-semibold text-main">{formatPence(o.payment_amount_pence, dispute.currency)}</span>
                      )}
                    </div>
                    <p className="text-sm text-main mt-2 whitespace-pre-wrap line-clamp-3">{o.summary}</p>
                    {o.work_description && (
                      <p className="text-xs text-muted mt-1 line-clamp-2">Work: {o.work_description}</p>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Neutral notice */}
      <p className="mt-4 text-[11px] text-muted flex items-start gap-1.5">
        <i className="ri-scales-3-line flex-shrink-0 mt-0.5"></i>
        <span>
          BuildNerve provides a neutral record and does not decide who is right, recommend whether to accept an offer,
          or determine liability. Consider independent legal advice before accepting important settlement terms.
        </span>
      </p>

      <OfferModal
        open={offerModalMode !== null}
        mode={offerModalMode ?? 'create'}
        dispute={dispute}
        submitting={submitting}
        error={actionError}
        onClose={() => {
          setOfferModalMode(null);
          setCounterTarget(null);
        }}
        onSubmit={submitOffer}
      />

      <RespondOfferModal
        offer={respondTarget}
        mode={respondMode}
        submitting={submitting}
        error={actionError}
        onClose={() => {
          setRespondMode(null);
          setRespondTarget(null);
        }}
        onAccept={() => respond('accept')}
        onReject={() => respond('reject')}
        onClarify={clarify}
      />
    </section>
  );
}