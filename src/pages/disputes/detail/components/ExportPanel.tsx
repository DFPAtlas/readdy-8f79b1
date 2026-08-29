import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Dispute, DisputePartyView } from '@/types/disputes';
import type {
  ExportWorkspace,
  ExportConfig,
  ExportPurpose,
  ExportPerspective,
  DisputeExport,
  ExportGenerateResult,
} from '@/types/dispute-export';
import {
  EXPORT_PURPOSE_LABELS,
  EXPORT_PURPOSES,
  EXPORT_DISCLAIMER,
} from '@/types/dispute-export';
import { DISPUTE_CLAIM_TYPE_LABELS } from '@/types/disputes';
import { disputeExportService } from '@/services/dispute-export.service';
import { useToast } from '@/components/base/Toast';
import { formatDate, formatFileSize } from '@/pages/disputes/helpers';
import PackHistory from '@/pages/disputes/detail/components/PackHistory';

interface ExportPanelProps {
  dispute: Dispute;
  parties: DisputePartyView[];
  myRole: 'claimant' | 'respondent' | null;
  currentUserId: string | null;
  onChanged: () => void;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function ExportPanel({ dispute, myRole }: ExportPanelProps) {
  const { showToast } = useToast();

  const [ws, setWs] = useState<ExportWorkspace | null>(null);
  const [packs, setPacks] = useState<DisputeExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<'config' | 'review'>('config');
  const [config, setConfig] = useState<ExportConfig | null>(null);
  const [declared, setDeclared] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ExportGenerateResult | null>(null);

  const defaultPerspective: ExportPerspective = myRole === 'respondent' ? 'respondent' : 'claimant';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [workspace, history] = await Promise.all([
        disputeExportService.getWorkspace(dispute.id),
        disputeExportService.list(dispute.id),
      ]);
      setWs(workspace);
      setPacks(history);
      setConfig((prev) =>
        prev
          ? prev
          : {
              perspective: defaultPerspective,
              title: '',
              purpose: 'pre_action_exchange',
              includeChronology: true,
              includeSummary: false,
              summaryText: '',
              summaryPreparedBy: '',
              includeProjectRecords: true,
              includeCorrespondence: false,
              includeNegotiation: true,
              includePreAction: true,
              claimIds: [],
              evidenceIds: [],
              letterIds: [],
            },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load export workspace');
    } finally {
      setLoading(false);
    }
  }, [dispute.id, defaultPerspective]);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback((patch: Partial<ExportConfig>) => {
    setConfig((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const toggle = useCallback(
    (list: 'claimIds' | 'evidenceIds' | 'letterIds', id: string) => {
      setConfig((prev) => {
        if (!prev) return prev;
        const cur = prev[list];
        return {
          ...prev,
          [list]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
        };
      });
    },
    [],
  );

  const claimOptions = useMemo(() => ws?.claims ?? [], [ws]);
  const evidenceOptions = useMemo(() => ws?.evidence ?? [], [ws]);
  const letterOptions = useMemo(() => ws?.letters ?? [], [ws]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <i className="ri-loader-4-line text-2xl text-primary-500 animate-spin"></i>
        <p className="text-sm text-muted mt-3">Loading evidence pack workspace…</p>
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
        <button type="button" onClick={load} className="mt-4 h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap">
          Try again
        </button>
      </div>
    );
  }

  if (!ws || !config) return null;

  // Eligibility gate
  if (!ws.eligible) {
    return (
      <section className="bg-white border border-border rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-status-amber-pale text-status-amber flex items-center justify-center flex-shrink-0">
            <i className="ri-lock-line text-lg"></i>
          </span>
          <div>
            <h2 className="text-base font-semibold text-main">Evidence Pack unavailable</h2>
            <p className="text-sm text-muted mt-1">
              An evidence pack can only be created for a formally submitted England &amp; Wales dispute that is still open.
            </p>
            <ul className="mt-3 space-y-1">
              {ws.reasons.map((r) => (
                <li key={r} className="text-sm text-main flex items-start gap-2">
                  <i className="ri-arrow-right-s-line text-muted mt-0.5"></i>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    );
  }

  const selectedClaims = claimOptions.filter((c) => config.claimIds.includes(c.id));
  const selectedEvidence = evidenceOptions.filter((e) => config.evidenceIds.includes(e.id));
  const selectedLetters = letterOptions.filter((l) => config.letterIds.includes(l.id));
  const missingCount = selectedEvidence.filter((e) => e.withdrawn || e.superseded_by_id).length;

  const generate = async () => {
    if (!declared) {
      showToast('Please complete the declaration before generating.', 'warning');
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const res = await disputeExportService.generate(dispute.id, config);
      setResult(res);
      showToast('Evidence pack generated.', 'success');
      setStep('config');
      setDeclared(false);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const inputClass =
    'mt-1 w-full px-3 rounded-lg border border-border bg-white text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary-300';

  return (
    <section className="bg-white border border-border rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-main">Evidence Pack exporter</h2>
            <span className="text-[11px] font-medium text-muted bg-page px-2 py-0.5 rounded-full">England &amp; Wales</span>
          </div>
          <p className="text-xs text-muted mt-1">
            Organise selected records into a numbered PDF and a ZIP of original files. This is not a court filing.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-status-amber/30 bg-status-amber-pale p-3">
        <p className="text-xs text-main flex items-start gap-2">
          <i className="ri-error-warning-line mt-0.5 flex-shrink-0"></i>
          <span>{EXPORT_DISCLAIMER}</span>
        </p>
      </div>

      {/* Step switcher */}
      <div className="flex items-center gap-1 bg-page rounded-full p-1 w-fit mt-4">
        <button type="button" onClick={() => setStep('config')} className={`h-9 px-4 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${step === 'config' ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'}`}>
          1. Configure
        </button>
        <button type="button" onClick={() => setStep('review')} className={`h-9 px-4 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${step === 'review' ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'}`}>
          2. Review &amp; declare
        </button>
      </div>

      {step === 'config' ? (
        <div className="mt-4 space-y-4">
          {/* Basics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted">Perspective</label>
              <select
                value={config.perspective}
                onChange={(e) => update({ perspective: e.target.value as ExportPerspective })}
                className={`${inputClass} h-10 appearance-none cursor-pointer`}
              >
                <option value="claimant">Claimant perspective</option>
                <option value="respondent">Respondent perspective</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Purpose</label>
              <select
                value={config.purpose}
                onChange={(e) => update({ purpose: e.target.value as ExportPurpose })}
                className={`${inputClass} h-10 appearance-none cursor-pointer`}
              >
                {EXPORT_PURPOSES.map((p) => (
                  <option key={p} value={p}>{EXPORT_PURPOSE_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Export title</label>
              <input
                value={config.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="e.g. Evidence pack for mediation"
                className={`${inputClass} h-10`}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="rounded-xl border border-border p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2">Include sections</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Toggle label="Chronology" checked={config.includeChronology} onChange={(v) => update({ includeChronology: v })} />
              <Toggle label="Project records" checked={config.includeProjectRecords} onChange={(v) => update({ includeProjectRecords: v })} />
              <Toggle label="Correspondence" checked={config.includeCorrespondence} onChange={(v) => update({ includeCorrespondence: v })} />
              <Toggle label="Negotiation & ADR history" checked={config.includeNegotiation} onChange={(v) => update({ includeNegotiation: v })} />
              <Toggle label="Pre-action record" checked={config.includePreAction} onChange={(v) => update({ includePreAction: v })} />
              <Toggle label="Case summary" checked={config.includeSummary} onChange={(v) => update({ includeSummary: v })} />
            </div>
            {config.includeSummary && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted">Prepared / approved by</label>
                  <input value={config.summaryPreparedBy} onChange={(e) => update({ summaryPreparedBy: e.target.value })} className={`${inputClass} h-10`} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-muted">Case summary (your own words)</label>
                  <textarea value={config.summaryText} onChange={(e) => update({ summaryText: e.target.value })} rows={3} maxLength={10000} className={`${inputClass} py-2 resize-none`} />
                </div>
              </div>
            )}
          </div>

          {/* Claims selection */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted">Claims &amp; responses ({selectedClaims.length} selected)</label>
              <button type="button" onClick={() => update({ claimIds: claimOptions.length ? claimOptions.map((c) => c.id) : [] })} className="text-xs text-primary-700 hover:underline cursor-pointer">
                {config.claimIds.length === claimOptions.length && claimOptions.length ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="mt-1.5 space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {claimOptions.length === 0 ? (
                <p className="text-xs text-muted">No claims or responses recorded.</p>
              ) : (
                claimOptions.map((c) => (
                  <SelectableRow
                    key={c.id}
                    active={config.claimIds.includes(c.id)}
                    onToggle={() => toggle('claimIds', c.id)}
                    title={`${DISPUTE_CLAIM_TYPE_LABELS[c.claim_type as keyof typeof DISPUTE_CLAIM_TYPE_LABELS] ?? c.claim_type} — ${c.submitted_by_name ?? 'Party'}`}
                    meta={`${formatDate(c.submitted_at)}${c.superseded ? ' · superseded' : ''}`}
                    preview={c.preview}
                  />
                ))
              )}
            </div>
          </div>

          {/* Evidence selection */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted">Evidence ({selectedEvidence.length} selected)</label>
              <button type="button" onClick={() => update({ evidenceIds: evidenceOptions.length ? evidenceOptions.filter((e) => !e.withdrawn).map((e) => e.id) : [] })} className="text-xs text-primary-700 hover:underline cursor-pointer">
                {config.evidenceIds.length === evidenceOptions.filter((e) => !e.withdrawn).length && evidenceOptions.length ? 'Clear all' : 'Select active'}
              </button>
            </div>
            <div className="mt-1.5 space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {evidenceOptions.length === 0 ? (
                <p className="text-xs text-muted">No evidence recorded.</p>
              ) : (
                evidenceOptions.map((e) => (
                  <SelectableRow
                    key={e.id}
                    active={config.evidenceIds.includes(e.id)}
                    onToggle={() => toggle('evidenceIds', e.id)}
                    title={`${e.reference} — ${e.title}`}
                    meta={`${e.withdrawn ? 'withdrawn · ' : ''}${e.superseded_by_id ? 'superseded · ' : ''}${e.original_filename ?? 'linked/text note'}${e.file_size ? ` · ${formatFileSize(e.file_size)}` : ''}`}
                    warning={e.withdrawn}
                  />
                ))
              )}
            </div>
          </div>

          {/* Letter selection */}
          <div>
            <label className="text-xs font-medium text-muted">Letter of Claim versions ({selectedLetters.length} selected)</label>
            <div className="mt-1.5 space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {letterOptions.length === 0 ? (
                <p className="text-xs text-muted">No letters recorded.</p>
              ) : (
                letterOptions.map((l) => (
                  <SelectableRow
                    key={l.id}
                    active={config.letterIds.includes(l.id)}
                    onToggle={() => toggle('letterIds', l.id)}
                    title={`v${l.version} — ${l.title}`}
                    meta={`${l.status} · ${formatDate(l.created_at)}`}
                  />
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={() => setStep('review')} className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap">
              Review pack
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border p-3 space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Selected records</p>
            <p className="text-xs text-main">Case reference: <span className="font-semibold">{dispute.case_reference}</span></p>
            <p className="text-xs text-main">Perspective: <span className="font-semibold">{config.perspective}</span> · Purpose: <span className="font-semibold">{EXPORT_PURPOSE_LABELS[config.purpose]}</span></p>
            <p className="text-xs text-main">Claims &amp; responses: <span className="font-semibold">{selectedClaims.length}</span></p>
            <p className="text-xs text-main">Evidence: <span className="font-semibold">{selectedEvidence.length}</span></p>
            <p className="text-xs text-main">Letters: <span className="font-semibold">{selectedLetters.length}</span></p>
            <p className="text-xs text-main">Sections: <span className="font-semibold">{[config.includeChronology && 'Chronology', config.includeProjectRecords && 'Project records', config.includeCorrespondence && 'Correspondence', config.includeNegotiation && 'Negotiation', config.includePreAction && 'Pre-action', config.includeSummary && 'Summary'].filter(Boolean).join(', ')}</span></p>
          </div>

          {missingCount > 0 && (
            <div className="rounded-xl border border-status-red/30 bg-status-red-pale p-3">
              <p className="text-xs font-semibold text-status-red mb-1">Flagged selections</p>
              <p className="text-xs text-main">
                {missingCount} selected evidence item(s) are withdrawn or superseded. They will be indexed but should be reviewed carefully.
              </p>
            </div>
          )}

          {selectedClaims.length === 0 && selectedEvidence.length === 0 && (
            <div className="rounded-xl border border-status-amber/30 bg-status-amber-pale p-3">
              <p className="text-xs text-main">You have not selected any claims or evidence. The pack will contain the case information and any included sections only.</p>
            </div>
          )}

          <div className="rounded-xl border border-border p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2">Declaration</p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} className="mt-0.5" />
              <span className="text-xs text-main">
                I confirm I have reviewed the selected records, the facts are accurate to the best of my knowledge, and I am generating this pack for my own use in this dispute.
              </span>
            </label>
          </div>

          <p className="text-[11px] text-muted flex items-start gap-1.5">
            <i className="ri-shield-check-line flex-shrink-0 mt-0.5"></i>
            <span>{EXPORT_DISCLAIMER}</span>
          </p>

          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => setStep('config')} className="h-10 px-4 rounded-xl border border-border text-main text-sm font-medium hover:bg-page cursor-pointer whitespace-nowrap">
              Back
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap flex items-center gap-2"
            >
              {generating ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  Generating pack…
                </>
              ) : (
                'Generate evidence pack'
              )}
            </button>
          </div>

          {result && result.export && (
            <div className="rounded-xl border border-status-green/30 bg-status-green-pale p-3">
              <p className="text-xs font-semibold text-status-green mb-2">Pack v{result.export.version} generated</p>
              <div className="flex items-center gap-2 flex-wrap">
                {result.pdfUrl && (
                  <button type="button" onClick={() => triggerDownload(result.pdfUrl!, `BuildNerve_Evidence_Pack_v${result.export.version}.pdf`)} className="h-9 px-3 rounded-lg border border-border text-main text-xs font-medium hover:bg-page transition-colors cursor-pointer whitespace-nowrap">
                    Download PDF
                  </button>
                )}
                {result.zipUrl && (
                  <button type="button" onClick={() => triggerDownload(result.zipUrl!, `BuildNerve_Evidence_Pack_v${result.export.version}.zip`)} className="h-9 px-3 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap">
                    Download ZIP
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pack history */}
      <div className="mt-6 pt-5 border-t border-border">
        <h3 className="text-sm font-semibold text-main">Pack history</h3>
        <p className="text-xs text-muted mt-0.5">Generated packs are immutable. A changed selection creates a new version.</p>
        <PackHistory packs={packs} onChanged={load} />
      </div>
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-left hover:bg-page transition-colors cursor-pointer"
    >
      <span className="text-xs text-main">{label}</span>
      <span className={`flex items-center rounded-full transition-colors ${checked ? 'bg-primary-500' : 'bg-border'}`} style={{ width: 34, height: 20, padding: 2 }}>
        <span
          className="block rounded-full bg-white transition-transform"
          style={{ width: 16, height: 16, transform: checked ? 'translateX(14px)' : 'translateX(0)' }}
        ></span>
      </span>
    </button>
  );
}

function SelectableRow({
  active,
  onToggle,
  title,
  meta,
  preview,
  warning,
}: {
  active: boolean;
  onToggle: () => void;
  title: string;
  meta?: string;
  preview?: string | null;
  warning?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
        active ? 'border-primary-300 bg-primary-100/60' : 'border-border hover:bg-page'
      } ${warning ? 'opacity-70' : ''}`}
    >
      <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${active ? 'bg-primary-500 border-primary-500' : 'border-border'}`}>
        {active && <i className="ri-check-line text-white text-[11px]"></i>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-main truncate">{title}</span>
        {meta && <span className="block text-[11px] text-muted truncate">{meta}</span>}
        {preview && <span className="block text-[11px] text-muted mt-0.5 line-clamp-2">{preview}</span>}
      </span>
    </button>
  );
}