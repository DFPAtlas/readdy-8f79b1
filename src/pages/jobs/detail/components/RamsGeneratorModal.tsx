import { useState } from 'react';
import { HAZARD_CATEGORIES } from '@/mocks/health-safety';
import { healthSafetyService } from '@/services/health-safety.service';

export interface RamsDraft {
  title: string;
  scopeSummary?: string;
  hazards: string[];
  controlMeasures: string[];
  generatedByAi: boolean;
}

interface RamsGeneratorModalProps {
  defaultTitle: string;
  defaultScope?: string;
  onClose: () => void;
  onSave: (draft: RamsDraft) => void;
}

export default function RamsGeneratorModal({ defaultTitle, defaultScope, onClose, onSave }: RamsGeneratorModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [scopeSummary, setScopeSummary] = useState(defaultScope || '');
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ hazards: string[]; controlMeasures: string[] } | null>(null);

  const toggleCategory = (cat: string) => {
    setSelected((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const handleGenerate = async () => {
    if (!title.trim() || selected.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await healthSafetyService.generateRams({
        title: title.trim(),
        scopeSummary: scopeSummary.trim() || undefined,
        hazardCategories: selected,
      });
      setDraft({ hazards: result.hazards, controlMeasures: result.controlMeasures });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!draft) return;
    onSave({
      title: title.trim(),
      scopeSummary: scopeSummary.trim() || undefined,
      hazards: draft.hazards,
      controlMeasures: draft.controlMeasures,
      generatedByAi: true,
    });
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
              <i className="ri-shield-check-line text-xl text-white"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-main">Generate RAMS with Nerve</h2>
              <p className="text-xs text-muted">Draft a risk assessment &amp; method statement for review.</p>
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
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Document title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-3.5 text-sm rounded-xl border border-border focus:outline-none focus:border-primary-300"
              placeholder="e.g. Working at height RAMS"
            />
          </div>

          {/* Scope */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Scope &amp; activities</label>
            <textarea
              value={scopeSummary}
              onChange={(e) => setScopeSummary(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full p-3.5 text-sm rounded-xl border border-border focus:outline-none focus:border-primary-300 resize-none"
              placeholder="Describe the activities Nerve should consider..."
            />
          </div>

          {/* Hazard categories */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Hazard categories <span className="text-muted normal-case font-normal">({selected.length} selected)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HAZARD_CATEGORIES.map((cat) => {
                const active = selected.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left text-sm transition-colors cursor-pointer ${
                      active ? 'border-primary-400 bg-primary-50 text-main' : 'border-border text-muted hover:border-primary-200'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 ${active ? 'bg-primary-500 border-primary-500' : 'border-border'}`}>
                      {active && <i className="ri-check-line text-white text-xs"></i>}
                    </span>
                    <span className="whitespace-nowrap">{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate button (pre-draft) */}
          {!draft && (
            <button
              onClick={handleGenerate}
              disabled={!title.trim() || selected.length === 0 || loading}
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
                <p className="text-xs text-primary-700">Review before use — a competent person must approve this document.</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-main uppercase tracking-wider mb-2">
                  Hazards ({draft.hazards.length})
                </h4>
                <ul className="space-y-1.5">
                  {draft.hazards.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-main">
                      <i className="ri-alert-line text-status-amber mt-0.5"></i>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-main uppercase tracking-wider mb-2">
                  Control measures ({draft.controlMeasures.length})
                </h4>
                <ul className="space-y-1.5">
                  {draft.controlMeasures.map((c) => (
                    <li key={c} className="flex items-start gap-2 text-sm text-main">
                      <i className="ri-shield-check-line text-primary-500 mt-0.5"></i>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
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
                  Save as draft
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}