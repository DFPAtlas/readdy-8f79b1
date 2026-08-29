import { useState } from 'react';
import { SNAG_TRADES, getSnagSeverityColor, type SnagSeverity } from '@/mocks/snagging';
import { snaggingService } from '@/services/snagging.service';

export interface GeneratedSnagDraft {
  title: string;
  description: string;
  area: string;
  severity: SnagSeverity;
  trade: string;
}

interface SnagGeneratorModalProps {
  defaultTrade: string;
  defaultScope?: string;
  onClose: () => void;
  onSave: (snags: GeneratedSnagDraft[]) => void;
}

export default function SnagGeneratorModal({ defaultTrade, defaultScope, onClose, onSave }: SnagGeneratorModalProps) {
  const [trade, setTrade] = useState<string>(defaultTrade || SNAG_TRADES[0]);
  const [scopeSummary, setScopeSummary] = useState(defaultScope || '');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<GeneratedSnagDraft[] | null>(null);

  const handleGenerate = async () => {
    if (!trade.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await snaggingService.generateSnags({
        trade: trade.trim(),
        scopeSummary: scopeSummary.trim() || undefined,
        count,
      });
      setDraft(result.snags);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!draft || draft.length === 0) return;
    onSave(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 md:p-8">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
              <i className="ri-list-check-3 text-xl text-white"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-main">Generate snag list with Nerve</h2>
              <p className="text-xs text-muted">Draft a snagging &amp; defects list for review before issue to site.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-page transition-colors text-muted cursor-pointer"
            aria-label="Close"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Trade */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Trade</label>
            <select
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              className="w-full h-11 px-3.5 text-sm rounded-xl border border-border bg-white text-main focus:outline-none focus:border-primary-300 cursor-pointer"
            >
              {SNAG_TRADES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Scope */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Scope &amp; context</label>
            <textarea
              value={scopeSummary}
              onChange={(e) => setScopeSummary(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full p-3.5 text-sm rounded-xl border border-border focus:outline-none focus:border-primary-300 resize-none"
              placeholder="Describe the works Nerve should consider..."
            />
          </div>

          {/* Count */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Number of items <span className="text-muted normal-case font-normal">({count})</span>
            </label>
            <div className="flex gap-2">
              {[3, 5, 7, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`h-9 px-4 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                    count === n ? 'border-primary-400 bg-primary-50 text-main' : 'border-border text-muted hover:border-primary-200'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button (pre-draft) */}
          {!draft && (
            <button
              onClick={handleGenerate}
              disabled={!trade.trim() || loading}
              className="w-full h-11 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i> Drafting with Nerve...
                </>
              ) : (
                <>
                  <i className="ri-sparkling-2-line"></i> Generate draft
                </>
              )}
            </button>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-status-red-pale border border-status-red/20 text-sm text-status-red">
              {error}
            </div>
          )}

          {/* Draft preview */}
          {draft && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-primary-50 border border-primary-200">
                <div className="flex items-center gap-2 mb-1">
                  <i className="ri-robot-line text-primary-600"></i>
                  <span className="text-xs font-semibold text-primary-700">AI-generated draft</span>
                </div>
                <p className="text-xs text-primary-700">Review before issue — a competent person should verify each item against the actual works.</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-main uppercase tracking-wider mb-2">
                  Snag items ({draft.length})
                </h4>
                <div className="space-y-2">
                  {draft.map((s, i) => (
                    <div key={i} className="p-3.5 border border-border rounded-xl">
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${s.severity === 'high' || s.severity === 'critical' ? 'bg-status-red' : s.severity === 'medium' ? 'bg-status-amber' : 'bg-status-green'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-main">{s.title}</p>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${getSnagSeverityColor(s.severity)}`}>
                              {s.severity}
                            </span>
                          </div>
                          <p className="text-xs text-muted mt-0.5">{s.description}</p>
                          {s.area && <p className="text-[10px] text-muted mt-1">Area: {s.area}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="h-10 px-4 border border-border text-main text-sm font-medium rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                >
                  <i className="ri-refresh-line"></i> Regenerate
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 h-10 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  Add to snag list
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}