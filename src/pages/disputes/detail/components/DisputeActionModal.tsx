import { useEffect, useState, type FormEvent } from 'react';
import type { DisputeClaim } from '@/types/disputes';
import { formatPence } from '@/pages/disputes/helpers';

export type SimpleAction = 'submit' | 'correct';

export interface ActionPayload {
  statement?: string;
  requestedRemedy?: string;
  amountPence?: number | null;
  claimId?: string;
}

interface DisputeActionModalProps {
  action: SimpleAction | null;
  myClaims: DisputeClaim[];
  currency: string;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (action: SimpleAction, payload: ActionPayload) => void;
}

const TITLES: Record<SimpleAction, { title: string; desc: string }> = {
  submit: { title: 'Submit your dispute', desc: 'Once submitted, the other party will be notified and the case becomes active.' },
  correct: { title: 'Correct an earlier submission', desc: 'This creates a new version — your original submission is preserved.' },
};

export default function DisputeActionModal({
  action,
  myClaims,
  currency,
  submitting,
  error,
  onClose,
  onSubmit,
}: DisputeActionModalProps) {
  const [statement, setStatement] = useState('');
  const [remedy, setRemedy] = useState('');
  const [amount, setAmount] = useState('');
  const [claimId, setClaimId] = useState('');

  useEffect(() => {
    if (action === 'correct' && myClaims.length > 0) {
      const first = myClaims[0];
      setClaimId(first.id);
      setStatement(first.statement ?? '');
      setRemedy(first.requested_remedy ?? '');
      setAmount(first.amount_pence != null ? (first.amount_pence / 100).toString() : '');
    } else {
      setStatement('');
      setRemedy('');
      setAmount('');
      setClaimId('');
    }
  }, [action, myClaims]);

  if (!action) return null;

  const meta = TITLES[action];

  const handleCorrectSelect = (id: string) => {
    setClaimId(id);
    const c = myClaims.find((x) => x.id === id);
    if (c) {
      setStatement(c.statement ?? '');
      setRemedy(c.requested_remedy ?? '');
      setAmount(c.amount_pence != null ? (c.amount_pence / 100).toString() : '');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const amountPence = amount.trim() === '' ? null : Math.round(parseFloat(amount) * 100);
    const payload: ActionPayload = {
      statement,
      requestedRemedy: remedy,
      amountPence,
    };
    if (action === 'correct') payload.claimId = claimId;
    onSubmit(action, payload);
  };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="action-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-[92vw] max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="action-title" className="text-lg font-semibold text-main">{meta.title}</h2>
            <p className="text-sm text-muted mt-1">{meta.desc}</p>
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
          {action === 'correct' && (
            <div>
              <label className="block text-xs font-medium text-main mb-1.5">Submission to correct</label>
              <div className="relative">
                <select
                  value={claimId}
                  onChange={(e) => handleCorrectSelect(e.target.value)}
                  className="w-full h-10 px-3.5 bg-page border border-border rounded-xl text-sm text-main appearance-none focus:outline-none focus:border-primary-300 pr-9 cursor-pointer"
                >
                  {myClaims.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatPence(c.amount_pence, currency)} · {new Date(c.submitted_at).toLocaleDateString('en-GB')}
                    </option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"></i>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-main mb-1.5">Statement</label>
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              required
              maxLength={500}
              rows={4}
              className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
              placeholder="Describe your position clearly and factually…"
            />
            <p className="text-[11px] text-muted text-right mt-1">{statement.length}/500</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-main mb-1.5">Requested remedy</label>
            <textarea
              value={remedy}
              onChange={(e) => setRemedy(e.target.value)}
              maxLength={300}
              rows={2}
              className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
              placeholder="What outcome are you looking for?"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-main mb-1.5">Amount (£)</label>
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

          {error && (
            <p className="text-sm text-status-red bg-status-red-pale rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 border border-border bg-white text-main rounded-xl text-sm font-semibold hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-10 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            >
              {submitting && <i className="ri-loader-4-line animate-spin"></i>}
              {action === 'submit' ? 'Submit dispute' : 'Save correction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}