import { useState, useEffect, type FormEvent } from 'react';
import type { Dispute } from '@/types/disputes';
import {
  SETTLEMENT_OFFER_TYPES,
  SETTLEMENT_OFFER_TYPE_LABELS,
} from '@/types/disputes';
import type { CreateOfferInput } from '@/services/disputes.service';

interface OfferModalProps {
  open: boolean;
  mode: 'create' | 'counter';
  dispute: Dispute;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: CreateOfferInput) => void;
}

export default function OfferModal({
  open,
  mode,
  dispute,
  submitting,
  error,
  onClose,
  onSubmit,
}: OfferModalProps) {
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [offerType, setOfferType] = useState<string>('payment');
  const [summary, setSummary] = useState('');
  const [amount, setAmount] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [proposedCompletionDate, setProposedCompletionDate] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [conditions, setConditions] = useState('');
  const [referencedEvidence, setReferencedEvidence] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep('form');
      setOfferType('payment');
      setSummary('');
      setAmount('');
      setWorkDescription('');
      setProposedCompletionDate('');
      setPaymentDueDate('');
      setConditions('');
      setReferencedEvidence('');
      setExpiryDate('');
      setLocalError(null);
    }
  }, [open]);

  if (!open) return null;

  const buildInput = (): CreateOfferInput => {
    const responseDeadline = expiryDate ? `${expiryDate}T23:59:59.000Z` : null;
    return {
      disputeId: dispute.id,
      offerType,
      summary: summary.trim(),
      paymentAmountPence: amount.trim() === '' ? null : Math.round(parseFloat(amount) * 100),
      currency: dispute.currency,
      workDescription: workDescription.trim() || null,
      proposedCompletionDate: proposedCompletionDate || null,
      paymentDueDate: paymentDueDate || null,
      conditions: conditions.trim() || null,
      referencedEvidence: referencedEvidence.trim() || null,
      responseDeadline,
    };
  };

  const validate = (): string | null => {
    if (!offerType) return 'Please choose an offer type.';
    if (!summary.trim()) return 'Please describe the terms of your offer.';
    return null;
  };

  const goToReview = () => {
    const err = validate();
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    setStep('review');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(buildInput());
  };

  const title = mode === 'counter' ? 'Make a counteroffer' : 'Make a settlement offer';

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="offer-modal-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-3 flex-shrink-0">
            <div>
              <h2 id="offer-modal-title" className="text-lg font-semibold text-main">{title}</h2>
              <p className="text-sm text-muted mt-0.5">
                Propose a resolution in plain language. This is shared with the other party.
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

          <div className="px-6 pt-4 flex-shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <span className={`flex items-center gap-1.5 font-medium ${step === 'form' ? 'text-primary-700' : 'text-muted'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold ${step === 'form' ? 'bg-primary-500 text-white' : 'bg-status-green text-white'}`}>
                  {step === 'form' ? '1' : <i className="ri-check-line"></i>}
                </span>
                Offer terms
              </span>
              <span className="h-px flex-1 bg-border"></span>
              <span className={`flex items-center gap-1.5 font-medium ${step === 'review' ? 'text-primary-700' : 'text-muted'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold ${step === 'review' ? 'bg-primary-500 text-white' : 'bg-page text-muted border border-border'}`}>
                  2
                </span>
                Review &amp; submit
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {step === 'form' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-main mb-2">Offer type</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SETTLEMENT_OFFER_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setOfferType(t)}
                        className={`text-left h-auto min-h-11 px-3.5 py-2.5 rounded-xl border text-sm transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2.5 ${
                          offerType === t ? 'border-primary-300 bg-primary-50 text-primary-700 font-medium' : 'border-border bg-white text-main hover:border-primary-200'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${offerType === t ? 'border-primary-500' : 'border-border'}`}>
                          {offerType === t && <span className="w-2 h-2 rounded-full bg-primary-500"></span>}
                        </span>
                        {SETTLEMENT_OFFER_TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-main mb-1.5">Plain-language terms</label>
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    required
                    maxLength={2000}
                    rows={4}
                    className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
                    placeholder="Describe what you are offering and on what terms…"
                  />
                  <p className="text-[11px] text-muted text-right mt-1">{summary.length}/2000</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-main mb-1.5">
                      Amount ({dispute.currency === 'EUR' ? '€' : dispute.currency === 'USD' ? '$' : '£'})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full h-10 px-3.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-main mb-1.5">Offer expiry</label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full h-10 px-3.5 bg-page border border-border rounded-xl text-sm text-main focus:outline-none focus:border-primary-300"
                    />
                    <p className="text-[11px] text-muted mt-1">Optional — offers expire and cannot be accepted after this date.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-main mb-1.5">Work to be completed (if applicable)</label>
                  <textarea
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    maxLength={1000}
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
                    placeholder="Describe any remedial or completion work…"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-main mb-1.5">Proposed completion date</label>
                    <input
                      type="date"
                      value={proposedCompletionDate}
                      onChange={(e) => setProposedCompletionDate(e.target.value)}
                      className="w-full h-10 px-3.5 bg-page border border-border rounded-xl text-sm text-main focus:outline-none focus:border-primary-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-main mb-1.5">Payment due date</label>
                    <input
                      type="date"
                      value={paymentDueDate}
                      onChange={(e) => setPaymentDueDate(e.target.value)}
                      className="w-full h-10 px-3.5 bg-page border border-border rounded-xl text-sm text-main focus:outline-none focus:border-primary-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-main mb-1.5">Conditions</label>
                  <textarea
                    value={conditions}
                    onChange={(e) => setConditions(e.target.value)}
                    maxLength={1000}
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
                    placeholder="Any conditions attached to this offer…"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-main mb-1.5">Referenced records or evidence</label>
                  <textarea
                    value={referencedEvidence}
                    onChange={(e) => setReferencedEvidence(e.target.value)}
                    maxLength={1000}
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
                    placeholder="Reference the evidence or records this offer relies on (e.g. BN-E001)…"
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
                    type="button"
                    onClick={goToReview}
                    className="flex-1 h-11 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Review
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Offer type</p>
                    <p className="text-sm font-semibold text-main mt-1">{SETTLEMENT_OFFER_TYPE_LABELS[offerType as keyof typeof SETTLEMENT_OFFER_TYPE_LABELS]}</p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Terms</p>
                    <p className="text-sm text-main mt-1 whitespace-pre-wrap">{summary}</p>
                  </div>
                  {amount.trim() !== '' && (
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Amount</p>
                      <p className="text-sm font-semibold text-main mt-1">
                        {dispute.currency === 'EUR' ? '€' : dispute.currency === 'USD' ? '$' : '£'}{parseFloat(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                  {workDescription && (
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Work to be completed</p>
                      <p className="text-sm text-main mt-1 whitespace-pre-wrap">{workDescription}</p>
                    </div>
                  )}
                  {proposedCompletionDate && (
                    <p className="text-sm text-main"><span className="text-muted">Proposed completion:</span> {proposedCompletionDate}</p>
                  )}
                  {paymentDueDate && (
                    <p className="text-sm text-main"><span className="text-muted">Payment due:</span> {paymentDueDate}</p>
                  )}
                  {expiryDate && (
                    <p className="text-sm text-main"><span className="text-muted">Offer expires:</span> {expiryDate}</p>
                  )}
                  {conditions && (
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Conditions</p>
                      <p className="text-sm text-main mt-1 whitespace-pre-wrap">{conditions}</p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-status-amber/40 bg-status-amber-pale/40 p-4 space-y-2 text-xs text-main">
                  <p className="flex items-start gap-2">
                    <i className="ri-alert-line text-status-amber flex-shrink-0 mt-0.5"></i>
                    <span>Submitting an offer does not mean you admit liability unless the offer expressly says so. Consider obtaining independent legal advice before accepting important settlement terms.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <i className="ri-information-line text-status-amber flex-shrink-0 mt-0.5"></i>
                    <span>BuildNerve does not automatically label communications &ldquo;without prejudice&rdquo; — legal effect can depend on the circumstances and wording.</span>
                  </p>
                  <p className="flex items-start gap-2 font-semibold">
                    <i className="ri-shield-check-line text-status-amber flex-shrink-0 mt-0.5"></i>
                    <span>Once submitted, this offer becomes part of the permanent case record and is visible to both parties.</span>
                  </p>
                </div>

                {(localError || error) && (
                  <p className="text-sm text-status-red bg-status-red-pale rounded-lg px-3 py-2">{localError || error}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep('form')}
                    className="flex-1 h-11 border border-border bg-white text-main rounded-xl text-sm font-semibold hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 h-11 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    {submitting && <i className="ri-loader-4-line animate-spin"></i>}
                    {mode === 'counter' ? 'Submit counteroffer' : 'Submit offer'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}