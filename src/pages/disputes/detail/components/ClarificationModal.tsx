import { useState, useEffect, type FormEvent } from 'react';
import type { DisputeClaim, DisputeClarification } from '@/types/disputes';
import { formatDate, formatPence } from '@/pages/disputes/helpers';

export type ClarificationMode = 'request' | 'answer';

interface ClarificationModalProps {
  mode: ClarificationMode | null;
  claims: DisputeClaim[];
  clarification: DisputeClarification | null;
  currency: string;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onRequest: (input: { point: string; relevance: string; deadlineDays: number; targetClaimId: string | null }) => void;
  onAnswer: (input: { clarificationId: string; response: string }) => void;
}

export default function ClarificationModal({
  mode,
  claims,
  clarification,
  currency,
  submitting,
  error,
  onClose,
  onRequest,
  onAnswer,
}: ClarificationModalProps) {
  const [point, setPoint] = useState('');
  const [relevance, setRelevance] = useState('');
  const [deadlineDays, setDeadlineDays] = useState(7);
  const [targetClaimId, setTargetClaimId] = useState('');
  const [response, setResponse] = useState('');

  useEffect(() => {
    if (mode) {
      setPoint('');
      setRelevance('');
      setDeadlineDays(7);
      setTargetClaimId('');
      setResponse('');
    }
  }, [mode]);

  if (!mode) return null;

  const isAnswer = mode === 'answer';
  const title = isAnswer ? 'Answer this clarification' : 'Request clarification';
  const desc = isAnswer
    ? 'Provide a clear, proportionate answer to the point raised.'
    : 'Ask the other party to clarify a specific point before you respond.';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isAnswer) {
      if (!clarification) return;
      onAnswer({ clarificationId: clarification.id, response: response.trim() });
    } else {
      onRequest({
        point: point.trim(),
        relevance: relevance.trim(),
        deadlineDays,
        targetClaimId: targetClaimId || null,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="clarification-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-[92vw] max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="clarification-title" className="text-lg font-semibold text-main">{title}</h2>
            <p className="text-sm text-muted mt-1">{desc}</p>
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

        {isAnswer && clarification && (
          <div className="mt-4 rounded-xl border border-border bg-page/50 p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Point requiring clarification</p>
            <p className="text-sm text-main mt-1">{clarification.point}</p>
            <p className="text-xs text-muted mt-2">{clarification.relevance}</p>
            <p className="text-xs text-muted mt-2 flex items-center gap-1">
              <i className="ri-time-line"></i>
              Due {formatDate(clarification.response_due_at)}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {isAnswer ? (
            <div>
              <label className="block text-xs font-medium text-main mb-1.5">Your clarification</label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                required
                maxLength={500}
                rows={4}
                className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
                placeholder="Answer the point clearly and factually…"
              />
              <p className="text-[11px] text-muted text-right mt-1">{response.length}/500</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-main mb-1.5">Point requiring clarification</label>
                <textarea
                  value={point}
                  onChange={(e) => setPoint(e.target.value)}
                  required
                  maxLength={500}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
                  placeholder="The exact point you need clarified…"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-main mb-1.5">Why it is relevant</label>
                <textarea
                  value={relevance}
                  onChange={(e) => setRelevance(e.target.value)}
                  required
                  maxLength={500}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
                  placeholder="Why this point matters to your position…"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-main mb-1.5">Response deadline</label>
                  <div className="relative">
                    <select
                      value={deadlineDays}
                      onChange={(e) => setDeadlineDays(Number(e.target.value))}
                      className="w-full h-10 px-3.5 bg-page border border-border rounded-xl text-sm text-main appearance-none focus:outline-none focus:border-primary-300 pr-9 cursor-pointer"
                    >
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={28}>28 days</option>
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"></i>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-main mb-1.5">Related submission (optional)</label>
                  <div className="relative">
                    <select
                      value={targetClaimId}
                      onChange={(e) => setTargetClaimId(e.target.value)}
                      className="w-full h-10 px-3.5 bg-page border border-border rounded-xl text-sm text-main appearance-none focus:outline-none focus:border-primary-300 pr-9 cursor-pointer"
                    >
                      <option value="">None</option>
                      {claims.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.claim_type} · {formatPence(c.amount_pence, currency)}
                        </option>
                      ))}
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"></i>
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-status-red bg-status-red-pale rounded-lg px-3 py-2">{error}</p>
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
              {isAnswer ? 'Submit answer' : 'Request clarification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}