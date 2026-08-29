import { useState, useEffect, type FormEvent } from 'react';
import type { Dispute, DisputeClaim } from '@/types/disputes';
import {
  DISPUTE_RESPONSE_POSITIONS,
  DISPUTE_RESPONSE_POSITION_LABELS,
  DISPUTE_CATEGORY_LABELS,
} from '@/types/disputes';
import type { SubmitResponseInput } from '@/services/disputes.service';
import { formatPence, formatDate } from '@/pages/disputes/helpers';

interface FormalResponseModalProps {
  open: boolean;
  dispute: Dispute;
  projectName: string | null;
  originalClaim: DisputeClaim | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: SubmitResponseInput) => void;
}

const CATEGORY_KEYS = Object.keys(DISPUTE_CATEGORY_LABELS) as (keyof typeof DISPUTE_CATEGORY_LABELS)[];

interface DisputedFact {
  point: string;
  reason: string;
}

export default function FormalResponseModal({
  open,
  dispute,
  projectName,
  originalClaim,
  submitting,
  error,
  onClose,
  onSubmit,
}: FormalResponseModalProps) {
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [position, setPosition] = useState<string>('');
  const [statement, setStatement] = useState('');
  const [factsAcceptedText, setFactsAcceptedText] = useState('');
  const [factsDisputed, setFactsDisputed] = useState<DisputedFact[]>([]);
  const [proposedResolution, setProposedResolution] = useState('');
  const [amountAccepted, setAmountAccepted] = useState('');
  const [hasCounterclaim, setHasCounterclaim] = useState(false);
  const [counterclaimCategory, setCounterclaimCategory] = useState('defective_work');
  const [counterclaimSummary, setCounterclaimSummary] = useState('');
  const [counterclaimAmount, setCounterclaimAmount] = useState('');
  const [counterclaimBreakdown, setCounterclaimBreakdown] = useState('');
  const [counterclaimRemedy, setCounterclaimRemedy] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep('form');
      setPosition('');
      setStatement('');
      setFactsAcceptedText('');
      setFactsDisputed([]);
      setProposedResolution('');
      setAmountAccepted('');
      setHasCounterclaim(false);
      setCounterclaimCategory('defective_work');
      setCounterclaimSummary('');
      setCounterclaimAmount('');
      setCounterclaimBreakdown('');
      setCounterclaimRemedy('');
      setLocalError(null);
    }
  }, [open]);

  if (!open) return null;

  const factsAccepted = factsAcceptedText
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s !== '');

  const showAmountAccepted = position === 'accept_full' || position === 'accept_part';

  const addDisputedFact = () => {
    setFactsDisputed((prev) => [...prev, { point: '', reason: '' }]);
  };
  const updateDisputedFact = (index: number, patch: Partial<DisputedFact>) => {
    setFactsDisputed((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };
  const removeDisputedFact = (index: number) => {
    setFactsDisputed((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): string | null => {
    if (!position) return 'Please select your position.';
    if (!statement.trim()) return 'Please provide a plain-language response.';
    if (position === 'dispute' && factsDisputed.length > 0) {
      for (const f of factsDisputed) {
        if (!f.point.trim()) return 'Each disputed fact needs a point.';
        if (!f.reason.trim()) return 'Each disputed fact needs a reason it is challenged.';
      }
    }
    if (hasCounterclaim) {
      if (!counterclaimSummary.trim()) return 'Please provide a counterclaim summary.';
    }
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
    const amountAcceptedPence = amountAccepted.trim() === '' ? null : Math.round(parseFloat(amountAccepted) * 100);
    const counterclaimAmountPence = counterclaimAmount.trim() === '' ? null : Math.round(parseFloat(counterclaimAmount) * 100);

    const input: SubmitResponseInput = {
      disputeId: dispute.id,
      position,
      statement: statement.trim(),
      factsAccepted,
      factsDisputed: factsDisputed
        .filter((f) => f.point.trim() !== '')
        .map((f) => ({ point: f.point.trim(), reason: f.reason.trim() })),
      proposedResolution: proposedResolution.trim() || null,
      amountAcceptedPence,
      counterclaim: hasCounterclaim,
      counterclaimCategory: hasCounterclaim ? counterclaimCategory : null,
      counterclaimSummary: hasCounterclaim ? counterclaimSummary.trim() : null,
      counterclaimAmountPence: hasCounterclaim ? counterclaimAmountPence : null,
      counterclaimBreakdown: hasCounterclaim && counterclaimBreakdown.trim() !== '' ? counterclaimBreakdown.trim() : null,
      counterclaimRemedy: hasCounterclaim && counterclaimRemedy.trim() !== '' ? counterclaimRemedy.trim() : null,
    };

    onSubmit(input);
  };

  const positionTitle = position ? DISPUTE_RESPONSE_POSITION_LABELS[position as keyof typeof DISPUTE_RESPONSE_POSITION_LABELS] : '';

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="formal-response-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-3 flex-shrink-0">
            <div>
              <h2 id="formal-response-title" className="text-lg font-semibold text-main">Submit formal response</h2>
              <p className="text-sm text-muted mt-0.5">Review the original claim, then state your position clearly.</p>
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

          {/* Steps */}
          <div className="px-6 pt-4 flex-shrink-0">
            <div className="flex items-center gap-2 text-xs">
              <span className={`flex items-center gap-1.5 font-medium ${step === 'form' ? 'text-primary-700' : 'text-muted'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold ${step === 'form' ? 'bg-primary-500 text-white' : 'bg-status-green text-white'}`}>
                  {step === 'form' ? '1' : <i className="ri-check-line"></i>}
                </span>
                Your response
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
            {/* ── Case context ─────────────────────────────────────────────── */}
            <div className="rounded-xl border border-border bg-page/50 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-primary-600">{dispute.case_reference}</span>
                <span className="text-[11px] text-muted">{projectName ?? 'Project'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Amount claimed</p>
                  <p className="text-main font-semibold mt-0.5">{formatPence(originalClaim?.amount_pence ?? dispute.amount_disputed_pence, dispute.currency)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Response due</p>
                  <p className="text-main font-medium mt-0.5">{formatDate(dispute.response_due_at)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Requested resolution</p>
                  <p className="text-main mt-0.5 line-clamp-2">{dispute.desired_resolution ?? originalClaim?.requested_remedy ?? 'Not specified'}</p>
                </div>
              </div>
              {originalClaim?.statement && (
                <div className="pt-2 border-t border-border/60">
                  <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Original claim</p>
                  <p className="text-sm text-main mt-1 whitespace-pre-wrap">{originalClaim.statement}</p>
                </div>
              )}
              <p className="text-[11px] text-muted flex items-center gap-1 pt-1">
                <i className="ri-information-line"></i>
                BuildNerve provides a neutral record and does not decide which party is right.
              </p>
            </div>

            {step === 'form' ? (
              <>
                {/* Position */}
                <div>
                  <label className="block text-xs font-medium text-main mb-2">Your position</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DISPUTE_RESPONSE_POSITIONS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPosition(p)}
                        className={`text-left h-auto min-h-11 px-3.5 py-2.5 rounded-xl border text-sm transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2.5 ${
                          position === p ? 'border-primary-300 bg-primary-50 text-primary-700 font-medium' : 'border-border bg-white text-main hover:border-primary-200'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${position === p ? 'border-primary-500' : 'border-border'}`}>
                          {position === p && <span className="w-2 h-2 rounded-full bg-primary-500"></span>}
                        </span>
                        {DISPUTE_RESPONSE_POSITION_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Statement */}
                <div>
                  <label className="block text-xs font-medium text-main mb-1.5">Plain-language response</label>
                  <textarea
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                    required
                    maxLength={1000}
                    rows={4}
                    className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
                    placeholder="Explain your position clearly and factually…"
                  />
                  <p className="text-[11px] text-muted text-right mt-1">{statement.length}/1000</p>
                </div>

                {/* Facts accepted */}
                <div>
                  <label className="block text-xs font-medium text-main mb-1.5">Facts you accept</label>
                  <textarea
                    value={factsAcceptedText}
                    onChange={(e) => setFactsAcceptedText(e.target.value)}
                    maxLength={1000}
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
                    placeholder="One accepted fact per line…"
                  />
                  <p className="text-[11px] text-muted mt-1">One fact per line (optional).</p>
                </div>

                {/* Facts disputed */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-main">Facts you dispute</label>
                    <button
                      type="button"
                      onClick={addDisputedFact}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700 cursor-pointer flex items-center gap-1 whitespace-nowrap"
                    >
                      <i className="ri-add-line"></i>
                      Add disputed fact
                    </button>
                  </div>
                  {factsDisputed.length === 0 ? (
                    <p className="text-xs text-muted mt-2">No disputed facts yet — add any points you challenge and why.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {factsDisputed.map((f, i) => (
                        <div key={i} className="rounded-xl border border-border p-3 bg-page/40">
                          <div className="flex items-start gap-2">
                            <input
                              type="text"
                              value={f.point}
                              onChange={(e) => updateDisputedFact(i, { point: e.target.value })}
                              className="flex-1 h-10 px-3.5 bg-white border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300"
                              placeholder="The point you dispute"
                            />
                            <button
                              type="button"
                              onClick={() => removeDisputedFact(i)}
                              className="w-8 h-10 flex items-center justify-center text-muted hover:text-status-red transition-colors cursor-pointer flex-shrink-0"
                              aria-label="Remove"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                          <textarea
                            value={f.reason}
                            onChange={(e) => updateDisputedFact(i, { reason: e.target.value })}
                            maxLength={300}
                            rows={2}
                            className="w-full mt-2 px-3.5 py-2.5 bg-white border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
                            placeholder="Why you challenge this point…"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Proposed resolution */}
                <div>
                  <label className="block text-xs font-medium text-main mb-1.5">Proposed resolution</label>
                  <textarea
                    value={proposedResolution}
                    onChange={(e) => setProposedResolution(e.target.value)}
                    maxLength={500}
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
                    placeholder="How you propose this should be resolved…"
                  />
                </div>

                {/* Amount accepted */}
                {showAmountAccepted && (
                  <div>
                    <label className="block text-xs font-medium text-main mb-1.5">Amount accepted (£)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amountAccepted}
                      onChange={(e) => setAmountAccepted(e.target.value)}
                      className="w-full h-10 px-3.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300"
                      placeholder="0.00"
                    />
                  </div>
                )}

                {/* Counterclaim */}
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCounterclaim}
                      onChange={(e) => setHasCounterclaim(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-border text-primary-500 focus:ring-primary-400 cursor-pointer"
                    />
                    <span>
                      <span className="block text-sm font-medium text-main">I am making a counterclaim</span>
                      <span className="block text-xs text-muted mt-0.5">A counterclaim is recorded separately and does not replace the original claim.</span>
                    </span>
                  </label>

                  {hasCounterclaim && (
                    <div className="space-y-3 pt-2 border-t border-border/60">
                      <div>
                        <label className="block text-xs font-medium text-main mb-1.5">Counterclaim category</label>
                        <div className="relative">
                          <select
                            value={counterclaimCategory}
                            onChange={(e) => setCounterclaimCategory(e.target.value)}
                            className="w-full h-10 px-3.5 bg-white border border-border rounded-xl text-sm text-main appearance-none focus:outline-none focus:border-primary-300 pr-9 cursor-pointer"
                          >
                            {CATEGORY_KEYS.map((c) => (
                              <option key={c} value={c}>{DISPUTE_CATEGORY_LABELS[c]}</option>
                            ))}
                          </select>
                          <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"></i>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-main mb-1.5">Counterclaim summary</label>
                        <textarea
                          value={counterclaimSummary}
                          onChange={(e) => setCounterclaimSummary(e.target.value)}
                          maxLength={1000}
                          rows={3}
                          className="w-full px-3.5 py-2.5 bg-white border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
                          placeholder="Describe your counterclaim…"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-main mb-1.5">Counterclaim amount (£)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={counterclaimAmount}
                            onChange={(e) => setCounterclaimAmount(e.target.value)}
                            className="w-full h-10 px-3.5 bg-white border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-main mb-1.5">Requested remedy</label>
                          <input
                            type="text"
                            value={counterclaimRemedy}
                            onChange={(e) => setCounterclaimRemedy(e.target.value)}
                            className="w-full h-10 px-3.5 bg-white border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300"
                            placeholder="What you want"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-main mb-1.5">Calculation breakdown</label>
                        <textarea
                          value={counterclaimBreakdown}
                          onChange={(e) => setCounterclaimBreakdown(e.target.value)}
                          maxLength={500}
                          rows={2}
                          className="w-full px-3.5 py-2.5 bg-white border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
                          placeholder="How the amount was calculated…"
                        />
                      </div>
                    </div>
                  )}
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
                {/* ── Review screen ─────────────────────────────────────────── */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Position</p>
                    <p className="text-sm font-semibold text-main mt-1">{positionTitle}</p>
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Response</p>
                    <p className="text-sm text-main mt-1 whitespace-pre-wrap">{statement}</p>
                  </div>

                  {factsAccepted.length > 0 && (
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Facts accepted</p>
                      <ul className="mt-1 space-y-1">
                        {factsAccepted.map((f, i) => (
                          <li key={i} className="text-sm text-main flex items-start gap-2">
                            <i className="ri-check-line text-status-green mt-0.5"></i>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {factsDisputed.length > 0 && (
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Facts disputed</p>
                      <div className="mt-1 space-y-2">
                        {factsDisputed.map((f, i) => (
                          <div key={i} className="text-sm">
                            <p className="text-main font-medium">{f.point}</p>
                            <p className="text-muted mt-0.5">{f.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {proposedResolution && (
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Proposed resolution</p>
                      <p className="text-sm text-main mt-1 whitespace-pre-wrap">{proposedResolution}</p>
                    </div>
                  )}

                  {showAmountAccepted && amountAccepted.trim() !== '' && (
                    <div className="rounded-xl border border-border p-4">
                      <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Amount accepted</p>
                      <p className="text-sm font-semibold text-main mt-1">{formatPence(Math.round(parseFloat(amountAccepted) * 100), dispute.currency)}</p>
                    </div>
                  )}

                  {hasCounterclaim && (
                    <div className="rounded-xl border border-status-amber/40 bg-status-amber-pale/30 p-4">
                      <p className="text-[11px] uppercase tracking-wider text-status-amber font-semibold flex items-center gap-1">
                        <i className="ri-shield-flash-line"></i> Counterclaim
                      </p>
                      <p className="text-sm text-main mt-1 font-medium">{DISPUTE_CATEGORY_LABELS[counterclaimCategory as keyof typeof DISPUTE_CATEGORY_LABELS]}</p>
                      <p className="text-sm text-main mt-1 whitespace-pre-wrap">{counterclaimSummary}</p>
                      {counterclaimAmount.trim() !== '' && (
                        <p className="text-sm font-semibold text-main mt-1">Amount: {formatPence(Math.round(parseFloat(counterclaimAmount) * 100), dispute.currency)}</p>
                      )}
                    </div>
                  )}

                  <div className="rounded-xl border border-status-amber/40 bg-status-amber-pale/40 p-4 flex items-start gap-2.5">
                    <i className="ri-alert-line text-status-amber text-lg flex-shrink-0 mt-0.5"></i>
                    <p className="text-xs text-main">
                      <span className="font-semibold">This becomes part of the permanent dispute record.</span>{' '}
                      Once submitted, your response cannot be edited or deleted — it can only be corrected by creating a new version.
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
                      Submit formal response
                    </button>
                  </div>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}