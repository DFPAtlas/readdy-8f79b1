import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOrg } from '@/contexts/OrgContext';
import {
  evidenceService,
  type EvidenceDetailView,
  type PhotoAnalysisRecord,
  type PhotoAnalysisType,
  type PhotoFinding,
} from '@/services/evidence.service';

const VISUAL_TYPES = ['photo', 'video', 'safety_observation', 'damage', 'inspection'];

function severityColor(severity: string): string {
  if (severity === 'high' || severity === 'critical') return 'bg-status-red text-white';
  if (severity === 'medium') return 'bg-status-amber text-white';
  return 'bg-status-green text-white';
}

function severityDot(severity: string): string {
  if (severity === 'high' || severity === 'critical') return 'bg-status-red';
  if (severity === 'medium') return 'bg-status-amber';
  return 'bg-status-green';
}

export default function PhotoAnalysisPanel({ evidence }: { evidence: EvidenceDetailView }) {
  const { t } = useTranslation();
  const { organisation } = useOrg();
  const orgId = organisation?.id ?? null;

  const [analyses, setAnalyses] = useState<PhotoAnalysisRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [analysisType, setAnalysisType] = useState<PhotoAnalysisType>('hazard');
  const [analysing, setAnalysing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [freshFindings, setFreshFindings] = useState<PhotoFinding[] | null>(null);

  const imageFile = evidence.files.find((f) => f.isImage);
  const isVisual = VISUAL_TYPES.includes(evidence.evidenceType);

  const loadAnalyses = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const all = await evidenceService.listPhotoAnalyses(orgId);
      setAnalyses(all.filter((a) => a.evidence_record_id === evidence.id));
    } catch (err) {
      console.error('Failed to load photo analyses:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [orgId, evidence.id]);

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  if (!isVisual) return null;

  const activeAnalyses = analyses.filter((a) => !a.dismissed);
  const persistedFindings = activeAnalyses.flatMap((a) => a.findings || []);
  const allFindings = freshFindings !== null ? freshFindings : persistedFindings;
  const hasRun = activeAnalyses.length > 0 || freshFindings !== null;

  const runAnalysis = async () => {
    setActionError(null);
    if (!orgId || !imageFile) {
      setActionError(t('evidence.photoAnalysis.requiresPhoto'));
      return;
    }
    setAnalysing(true);
    setFreshFindings(null);
    try {
      const result = await evidenceService.analyzePhoto({
        organisationId: orgId,
        evidenceFileId: imageFile.id,
        evidenceRecordId: evidence.id,
        analysisType,
        caption: evidence.caption,
        evidenceType: evidence.evidenceType,
      });
      setFreshFindings(result.findings || []);
      await loadAnalyses();
    } catch (err) {
      console.error('Photo analysis failed:', err);
      setActionError(t('evidence.photoAnalysis.runError'));
    } finally {
      setAnalysing(false);
    }
  };

  const markReviewed = async (analysisId: string) => {
    setActionError(null);
    try {
      await evidenceService.reviewPhotoAnalysis(analysisId, false);
      await loadAnalyses();
    } catch (err) {
      console.error('Failed to mark analysis reviewed:', err);
      setActionError(t('evidence.photoAnalysis.runError'));
    }
  };

  const dismiss = async (analysisId: string) => {
    setActionError(null);
    try {
      await evidenceService.reviewPhotoAnalysis(analysisId, true);
      await loadAnalyses();
    } catch (err) {
      console.error('Failed to dismiss analysis:', err);
      setActionError(t('evidence.photoAnalysis.runError'));
    }
  };

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <i className="ri-shield-flash-line text-lg text-primary-600"></i>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-main">{t('evidence.photoAnalysis.title')}</h3>
            <p className="text-xs text-muted">{t('evidence.photoAnalysis.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value as PhotoAnalysisType)}
            className="h-8 px-2 text-xs border border-border rounded-lg bg-white text-main focus:outline-none focus:border-primary-300 cursor-pointer"
          >
            <option value="hazard">{t('evidence.photoAnalysis.hazard')}</option>
            <option value="quality">{t('evidence.photoAnalysis.quality')}</option>
            <option value="defect">{t('evidence.photoAnalysis.defect')}</option>
          </select>
          <button
            className="h-8 px-3 text-xs font-semibold bg-primary-500 text-white rounded-lg hover:bg-primary-600 cursor-pointer whitespace-nowrap flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={runAnalysis}
            disabled={analysing || !imageFile}
          >
            {analysing ? (
              <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              <i className="ri-magic-line"></i>
            )}
            {analysing ? t('evidence.photoAnalysis.analysing') : t('evidence.photoAnalysis.analyse')}
          </button>
        </div>
      </div>

      {!imageFile && (
        <div className="flex items-center gap-3 p-4 bg-page rounded-xl">
          <div className="w-9 h-9 rounded-xl bg-background-100 flex items-center justify-center flex-shrink-0">
            <i className="ri-image-line text-lg text-muted"></i>
          </div>
          <p className="text-sm text-muted">{t('evidence.photoAnalysis.requiresPhoto')}</p>
        </div>
      )}

      {imageFile && loading && (
        <div className="flex items-center gap-3 p-4 bg-page rounded-xl">
          <span className="inline-block w-5 h-5 rounded-full border-2 border-primary-300 border-t-primary-600 animate-spin" />
          <p className="text-sm text-muted">{t('evidence.photoAnalysis.analysing')}</p>
        </div>
      )}

      {imageFile && !loading && loadError && (
        <div className="flex items-center justify-between gap-3 p-4 bg-status-red-pale rounded-xl">
          <p className="text-sm text-status-red">{t('evidence.photoAnalysis.loadError')}</p>
          <button
            className="h-7 px-3 text-[11px] font-medium text-status-red hover:bg-white rounded-lg cursor-pointer whitespace-nowrap"
            onClick={loadAnalyses}
          >
            {t('evidence.retry')}
          </button>
        </div>
      )}

      {imageFile && !loading && !loadError && allFindings.length > 0 && (
        <div className="space-y-2.5">
          {activeAnalyses.map((a) => (
            <div key={a.id} className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2 bg-page">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full capitalize">
                    {a.analysis_type}
                  </span>
                  <span className="text-[10px] text-muted">
                    {new Date(a.analyzed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {a.reviewed_by_human && (
                    <span className="text-[10px] font-medium text-primary-600">{t('evidence.photoAnalysis.reviewed')}</span>
                  )}
                  <button
                    className="h-7 px-2 text-[11px] font-medium text-muted hover:text-main hover:bg-background-100 rounded-lg cursor-pointer whitespace-nowrap"
                    onClick={() => markReviewed(a.id)}
                  >
                    {t('evidence.photoAnalysis.markReviewed')}
                  </button>
                  <button
                    className="h-7 px-2 text-[11px] font-medium text-status-red hover:bg-status-red-pale rounded-lg cursor-pointer whitespace-nowrap"
                    onClick={() => dismiss(a.id)}
                  >
                    {t('evidence.photoAnalysis.dismiss')}
                  </button>
                </div>
              </div>
              <div className="divide-y divide-border">
                {(a.findings || []).map((f, i) => (
                  <FindingRow key={i} finding={f} />
                ))}
              </div>
            </div>
          ))}

          {freshFindings !== null && freshFindings.length > 0 && (
            <div className="border border-primary-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2 bg-primary-50">
                <span className="text-[10px] font-semibold text-primary-700">
                  {t('evidence.photoAnalysis.freshAnalysis')} · {analysisType}
                </span>
                <span className="text-[10px] text-muted">{t('evidence.photoAnalysis.justNow')}</span>
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

      {imageFile && !loading && !loadError && allFindings.length === 0 && hasRun && (
        <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-xl">
          <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <i className="ri-check-double-line text-lg text-primary-600"></i>
          </div>
          <div>
            <p className="text-sm font-medium text-main">{t('evidence.photoAnalysis.noFindings')}</p>
            <p className="text-xs text-muted">
              {t('evidence.photoAnalysis.noFindingsDesc', { type: analysisType })}
            </p>
          </div>
        </div>
      )}

      {imageFile && !loading && !loadError && allFindings.length === 0 && !hasRun && !analysing && (
        <div className="flex items-center gap-3 p-4 bg-page rounded-xl">
          <div className="w-9 h-9 rounded-xl bg-background-100 flex items-center justify-center flex-shrink-0">
            <i className="ri-search-eye-line text-lg text-muted"></i>
          </div>
          <p className="text-sm text-muted">{t('evidence.photoAnalysis.notAnalysed')}</p>
        </div>
      )}

      {actionError && (
        <p className="text-xs text-status-red mt-3 flex items-center gap-1">
          <i className="ri-error-warning-line"></i>
          {actionError}
        </p>
      )}
    </div>
  );
}

function FindingRow({ finding }: { finding: PhotoFinding }) {
  return (
    <div className="flex items-start gap-3 px-3.5 py-3">
      <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${severityDot(finding.severity)}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-main">{finding.label}</p>
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${severityColor(finding.severity)}`}>
            {finding.severity}
          </span>
        </div>
        <p className="text-xs text-muted mt-0.5">{finding.description}</p>
      </div>
    </div>
  );
}