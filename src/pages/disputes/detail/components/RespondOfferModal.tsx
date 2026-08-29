import { useState, useEffect, type FormEvent } from 'react';
import type { SettlementOffer } from '@/types/disputes';
import { SETTLEMENT_OFFER_TYPE_LABELS } from '@/types/disputes';
import { formatPence, formatDate } from '@/pages/disputes/helpers';

export type RespondMode = 'accept' | 'reject' | 'clarify';

interface RespondOfferModalProps {
  offer: SettlementOffer | null;
  mode: RespondMode | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
  onClarify: (point: string, relevance: string) => void;
}

export default function RespondOfferModal({
  offer,
  mode,
  submitting,
  error,
  onClose,
  onAccept,
  onReject,
  onClarify,
}: RespondOfferModalProps) {
  const [confirming, setConfirming] = useState(false);
  const [point, setPoint] = useState('');
  const [relevance, setRelevance] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (mode) {
      setConfirming(false);
      setPoint('');
      setRelevance('');
      setLocalError(null);
    }
  }, [mode]);

  if (!offer || !mode) return null;

  const handleClarify = (e: FormEvent) => {
    e.preventDefault();
    if (!point.trim()) {
      setLocalError('Please describe the point needing clarification.');
      return;
    }
    if (!relevance.trim()) {
      setLocalError('Please explain why this point is relevant.');
      return;
    }
    setLocalError(null);
    onClarify(point.trim(), relevance.trim());
  };

  const title =
    mode === 'accept' ? 'Accept this offer?' : mode === 'reject' ? 'Reject this offer?' : 'Request clarification';

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="respond-offer-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-3 flex-shrink-0">
            <div>
              <h2 id="respond-offer-title" className="text-lg font-semibold text-main">{title}</h2>
              <p className="text-sm text-muted mt-0.5">Respond to the settlement offer below.</p>
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

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Offer summary */}
            <div className="rounded-xl border border-border bg-page/50 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-primary-600">
                  {SETTLEMENT_OFFER_TYPE_LABELS[offer.offer_type]}
                </span>
                <span className="text-[11px] text-muted">{offer.offered_by_name ?? 'Other party'}</span>
              </div>
              <p className="text-sm text-main whitespace-pre-wrap">{offer.summary}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {offer.payment_amount_pence != null && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Amount</p>
                    <p className="text-main font-semibold">{formatPence(offer.payment_amount_pence, offer.currency)}</p>
                  </div>
                )}
                {offer.work_description && (
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Work</p>
                    <p className="text-main whitespace-pre-wrap">{offer.work_description}</p>
                  </div>
                )}
                {offer.response_deadline && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Expires</p>
                    <p className="text-main">{formatDate(offer.response_deadline)}</p>
                  </div>
                )}
              </div>
              {offer.conditions && (
                <p className="text-xs text-muted">Conditions: {offer.conditions}</p>
              )}
            </div>

            {mode === 'clarify' ? (
              <form onSubmit={handleClarify} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-main mb-1.5">Point requiring clarification</label>
                  <textarea
                    value={point}
                    onChange={(e) => setPoint(e.target.value)}
                    maxLength={500}
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
                    placeholder="The exact point in this offer you need clarified…"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-main mb-1.5">Why it is relevant</label>
                  <textarea
                    value={relevance}
                    onChange={(e) => setRelevance(e.target.value)}
                    maxLength={500}
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
                    placeholder="Explain why this matters before you can respond…"
                  />
                </div>
                {(localError || error) && (
                  <p className="text-sm text-status-red bg-status-red-pale rounded-lg px-3 py-2">{localError || error}</p>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 h-11 border border-border bg-white text-main rounded-xl text-sm font-semibold hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 h-11 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    {submitting && <i className="ri-loader-4-line animate-spin"></i>}
                    Send request
                  </button>
                </div>
              </form>
            ) : (
              <>
                {mode === 'accept' && (
                  <div className="rounded-xl border border-status-amber/40 bg-status-amber-pale/40 p-4 text-xs text-main space-y-2">
                    <p className="flex items-start gap-2">
                      <i className="ri-alert-line text-status-amber flex-shrink-0 mt-0.5"></i>
                      <span>Accepting creates a binding settlement record. You should ensure you understand and agree to every term before proceeding.</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <i className="ri-shield-check-line text-status-amber flex-shrink-0 mt-0.5"></i>
                      <span>BuildNerve does not determine liability or provide legal advice. Consider independent legal advice if unsure.</span>
                    </p>
                  </div>
                )}

                {error && <p className="text-sm text-status-red bg-status-red-pale rounded-lg px-3 py-2">{error}</p>}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 h-11 border border-border bg-white text-main rounded-xl text-sm font-semibold hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Cancel
                  </button>
                  {mode === 'accept' && !confirming && (
                    <button
                      type="button"
                      onClick={() => setConfirming(true)}
                      className="flex-1 h-11 bg-status-green hover:bg-status-green/90 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Accept offer
                    </button>
                  )}
                  {mode === 'accept' && confirming && (
                    <button
                      type="button"
                      onClick={onAccept}
                      disabled={submitting}
                      className="flex-1 h-11 bg-status-green hover:bg-status-green/90 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                    >
                      {submitting && <i className="ri-loader-4-line animate-spin"></i>}
                      Confirm acceptance
                    </button>
                  )}
                  {mode === 'reject' && (
                    <button
                      type="button"
                      onClick={onReject}
                      disabled={submitting}
                      className="flex-1 h-11 bg-status-red hover:bg-status-red/90 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                    >
                      {submitting && <i className="ri-loader-4-line animate-spin"></i>}
                      Reject offer
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}