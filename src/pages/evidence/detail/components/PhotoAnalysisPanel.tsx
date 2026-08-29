import { useState } from 'react';
import { useToast } from '@/components/base/Toast';
import {
  getPhotoAnalysesForRecord,
  runPhotoChecklist,
  getAnalysisTypeLabel,
  getAnalysisTypeColor,
  getFindingSeverityColor,
  type PhotoFinding,
  type PhotoAnalysis,
  type PhotoAnalysisType,
} from '@/mocks/photo-analysis';
import type { EvidenceRecord } from '@/mocks/evidence';

const VISUAL_TYPES = ['photo', 'video', 'safety_observation', 'damage_record', 'inspection'];

export default function PhotoAnalysisPanel({ evidence }: { evidence: EvidenceRecord }) {
  const { showToast } = useToast();
  const [analyses, setAnalyses] = useState<PhotoAnalysis[]>(() => getPhotoAnalysesForRecord(evidence.id));
  const [analysisType, setAnalysisType] = useState<PhotoAnalysisType>('hazard');
  const [analysing, setAnalysing] = useState(false);
  const [freshFindings, setFreshFindings] = useState<PhotoFinding[] | null>(null);

  if (!VISUAL_TYPES.includes(evidence.evidenceType)) return null;

  const activeAnalyses = analyses.filter((a) => !a.dismissed);
  const allFindings = freshFindings !== null ? freshFindings : activeAnalyses.flatMap((a) => a.findings);
  const hasRun = activeAnalyses.length > 0 || freshFindings !== null;

  const runAnalysis = () => {
    setAnalysing(true);
    setFreshFindings(null);
    window.setTimeout(() => {
      const findings = runPhotoChecklist(evidence.caption, evidence.evidenceType, analysisType);
      setFreshFindings(findings);
      setAnalysing(false);
      showToast(
        findings.length > 0 ? `${findings.length} finding${findings.length > 1 ? 's' : ''} detected.` : 'No notable hazards or quality issues detected.',
        findings.length > 0 ? 'info' : 'success',
      );
    }, 900);
  };

  const markReviewed = (analysisId: string) => {
    setAnalyses((prev) => prev.map((a) => (a.id === analysisId ? { ...a, reviewedByHuman: true } : a)));
    showToast('Marked as reviewed.', 'success');
  };

  const dismiss = (analysisId: string) => {
    setAnalyses((prev) => prev.map((a) => (a.id === analysisId ? { ...a, dismissed: true } : a)));
    showToast('Finding dismissed.', 'info');
  };

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <i className="ri-shield-flash-line text-lg text-primary-600"></i>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-main">Nerve photo analysis</h3>
            <p className="text-xs text-muted">AI hazard & quality review</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value as PhotoAnalysisType)}
            className="h-8 px-2 text-xs border border-border rounded-lg bg-white text-main focus:outline-none focus:border-primary-300 cursor-pointer"
          >
            <option value="hazard">Hazard</option>
            <option value="quality">Quality</option>
            <option value="defect">Defect</option>
          </select>
          <button
            className="h-8 px-3 text-xs font-semibold bg-primary-500 text-white rounded-lg hover:bg-primary-600 cursor-pointer whitespace-nowrap flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={runAnalysis}
            disabled={analysing}
          >
            {analysing ? (
              <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <i className="ri-magic-line"></i>
            )}
            {analysing ? 'Analysing…' : 'Analyse with Nerve'}
          </button>
        </div>
      </div>

      {analysing && (
        <div className="flex items-center gap-3 p-4 bg-page rounded-xl">
          <span className="inline-block w-5 h-5 rounded-full border-2 border-primary-300 border-t-primary-600 animate-spin" />
          <p className="text-sm text-muted">Nerve is reviewing the photo…</p>
        </div>
      )}

      {!analysing && allFindings.length > 0 && (
        <div className="space-y-2.5">
          {activeAnalyses.map((a) => (
            <div key={a.id} className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2 bg-page">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getAnalysisTypeColor(a.analysisType)}`}>
                    {getAnalysisTypeLabel(a.analysisType)}
                  </span>
                  <span className="text-[10px] text-muted">
                    {new Date(a.analyzedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ·{' '}
                    {new Date(a.analyzedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {a.reviewedByHuman && <span className="text-[10px] font-medium text-primary-600">Reviewed</span>}
                  <button
                    className="h-7 px-2 text-[11px] font-medium text-muted hover:text-main hover:bg-background-100 rounded-lg cursor-pointer whitespace-nowrap"
                    onClick={() => markReviewed(a.id)}
                  >
                    Mark reviewed
                  </button>
                  <button
                    className="h-7 px-2 text-[11px] font-medium text-status-red hover:bg-status-red-pale rounded-lg cursor-pointer whitespace-nowrap"
                    onClick={() => dismiss(a.id)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <div className="divide-y divide-border">
                {a.findings.map((f, i) => (
                  <FindingRow key={i} finding={f} />
                ))}
              </div>
            </div>
          ))}

          {freshFindings !== null && freshFindings.length > 0 && (
            <div className="border border-primary-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2 bg-primary-50">
                <span className="text-[10px] font-semibold text-primary-700">Fresh analysis · {getAnalysisTypeLabel(analysisType)}</span>
                <span className="text-[10px] text-muted">just now</span>
              </div>
              <div className="divide-y divide-border">
                {freshFindings.map((f, i) => (
                  <FindingRow key={i} finding={f} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!analysing && allFindings.length === 0 && hasRun && (
        <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-xl">
          <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <i className="ri-check-double-line text-lg text-primary-600"></i>
          </div>
          <div>
            <p className="text-sm font-medium text-main">No notable findings</p>
            <p className="text-xs text-muted">Nothing flagged by the {getAnalysisTypeLabel(analysisType).toLowerCase()} checklist.</p>
          </div>
        </div>
      )}

      {!analysing && allFindings.length === 0 && !hasRun && (
        <div className="flex items-center gap-3 p-4 bg-page rounded-xl">
          <div className="w-9 h-9 rounded-xl bg-background-100 flex items-center justify-center flex-shrink-0">
            <i className="ri-search-eye-line text-lg text-muted"></i>
          </div>
          <p className="text-sm text-muted">Not yet analysed. Run Nerve to review this photo for hazards and quality.</p>
        </div>
      )}
    </div>
  );
}

function FindingRow({ finding }: { finding: PhotoFinding }) {
  const isHigh = finding.severity === 'high' || finding.severity === 'critical';
  const dotColor = isHigh ? 'bg-status-red' : finding.severity === 'medium' ? 'bg-status-amber' : 'bg-status-green';
  return (
    <div className="flex items-start gap-3 px-3.5 py-3">
      <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-main">{finding.label}</p>
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${getFindingSeverityColor(finding.severity)}`}>
            {finding.severity}
          </span>
        </div>
        <p className="text-xs text-muted mt-0.5">{finding.description}</p>
      </div>
    </div>
  );
}