import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import { evidenceService, type EvidenceDetailView } from '@/services/evidence.service';
import { useToast } from '@/components/base/Toast';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import {
  evidenceTypeLabel,
  evidenceTypeIcon,
  reviewStatusLabel,
  reviewStatusColor,
  visibilityLabel,
  visibilityColor,
} from '@/lib/evidence';
import PhotoAnalysisPanel from './components/PhotoAnalysisPanel';

type Status = 'loading' | 'ready' | 'notfound' | 'error' | 'no-org';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function formatDateTime(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function EvidenceDetail() {
  const { t } = useTranslation();
  const { evidenceId } = useParams<{ evidenceId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { organisation, status: orgStatus } = useOrg();
  const orgId = organisation?.id ?? null;

  const [status, setStatus] = useState<Status>('loading');
  const [evidence, setEvidence] = useState<EvidenceDetailView | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setEvidence(null);

    if (!evidenceId) {
      setStatus('notfound');
      return undefined;
    }
    if (orgStatus === 'loading') return undefined;
    if (orgStatus === 'error') {
      setStatus('error');
      return undefined;
    }
    if (orgStatus === 'empty' || !orgId) {
      setStatus('no-org');
      return undefined;
    }

    (async () => {
      try {
        const record = await evidenceService.getById(orgId, evidenceId);
        if (cancelled) return;
        if (!record) {
          setStatus('notfound');
          return;
        }
        setEvidence(record);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load evidence detail:', err);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [evidenceId, orgId, orgStatus, reloadKey]);

  const changeVisibility = useCallback(
    async (visibility: 'internal_only' | 'client_visible') => {
      if (!orgId || !evidence) return;
      setUpdating(true);
      try {
        await evidenceService.setVisibility(orgId, evidence.id, visibility);
        showToast(
          visibility === 'client_visible'
            ? t('evidence.evidenceDetail.publishedToast')
            : t('evidence.evidenceDetail.withdrawnToast'),
          'success',
        );
        setPublishConfirm(false);
        setWithdrawConfirm(false);
        setReloadKey((k) => k + 1);
      } catch (err) {
        console.error('Failed to change evidence visibility:', err);
        showToast(t('evidence.evidenceDetail.publishError'), 'warning');
      } finally {
        setUpdating(false);
      }
    },
    [evidence, orgId, showToast, t],
  );

  if (status !== 'ready' || !evidence) {
    return renderDetailStatus(status, {
      onRetry: () => setReloadKey((k) => k + 1),
      onBack: () => navigate('/evidence'),
      t,
    });
  }

  const primaryImage = evidence.files.find((f) => f.isImage && f.url);
  const meta = (evidence.metadata || {}) as Record<string, Record<string, unknown>>;
  const instruction = meta.siteInstruction;
  const delay = meta.delay;
  const inspection = meta.inspection;
  const voice = meta.voice;

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Back */}
      <button
        className="text-sm font-medium text-muted hover:text-main cursor-pointer flex items-center gap-1"
        onClick={() => navigate('/evidence')}
      >
        <i className="ri-arrow-left-line text-base"></i>
        {t('evidence.evidenceDetail.backToEvidence')}
      </button>

      {/* Header */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] font-medium text-muted bg-page px-2 py-1 rounded-full flex items-center gap-1">
                <i className={`${evidenceTypeIcon(evidence.evidenceType)} text-xs`}></i>
                {evidenceTypeLabel(evidence.evidenceType)}
              </span>
              <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${reviewStatusColor(evidence.reviewStatus)}`}>
                {reviewStatusLabel(evidence.reviewStatus)}
              </span>
              <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${visibilityColor(evidence.visibility)}`}>
                {visibilityLabel(evidence.visibility)}
              </span>
            </div>
            <h1 className="text-xl font-bold text-main">
              {evidence.caption || evidenceTypeLabel(evidence.evidenceType)}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted">
              {evidence.jobRef && (
                <button
                  className="cursor-pointer hover:text-primary-600 flex items-center gap-1"
                  onClick={() => evidence.jobId && navigate(`/jobs/${evidence.jobId}`)}
                >
                  <i className="ri-briefcase-line"></i>
                  {evidence.jobRef}
                  {evidence.jobName ? ` · ${evidence.jobName}` : ''}
                </button>
              )}
              {evidence.projectStage && <span>{evidence.projectStage}</span>}
              <span>{formatDateTime(evidence.capturedAt)}</span>
              <span>{t('evidence.evidenceDetail.capturedBy')}: {evidence.capturedByName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {evidence.visibility !== 'client_visible' ? (
              <button
                className="h-9 px-3 text-xs font-medium text-primary-500 border border-primary-200 bg-primary-50 rounded-xl hover:bg-primary-100 cursor-pointer whitespace-nowrap disabled:opacity-60"
                onClick={() => setPublishConfirm(true)}
                disabled={updating}
              >
                <i className="ri-send-plane-line mr-1"></i>
                {t('evidence.evidenceDetail.publishToClient')}
              </button>
            ) : (
              <button
                className="h-9 px-3 text-xs font-medium text-status-amber border border-[#F5E0C0] rounded-xl hover:bg-status-amber-pale cursor-pointer whitespace-nowrap disabled:opacity-60"
                onClick={() => setWithdrawConfirm(true)}
                disabled={updating}
              >
                <i className="ri-close-circle-line mr-1"></i>
                {t('evidence.evidenceDetail.withdrawFromClient')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      {primaryImage?.url && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="aspect-[16/9] bg-page">
            <img src={primaryImage.url} alt={evidence.caption || 'Evidence'} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* AI Photo Analysis */}
      <PhotoAnalysisPanel evidence={evidence} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Attachments */}
          {evidence.files.length > 0 && (
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
                {t('evidence.evidenceDetail.attachmentsTitle')}
              </h3>
              <div className="space-y-2">
                {evidence.files.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-3 bg-page rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-white border border-border flex items-center justify-center flex-shrink-0">
                      <i className={`${f.isImage ? 'ri-image-line' : f.mimeType.startsWith('audio/') ? 'ri-mic-line' : f.mimeType.startsWith('video/') ? 'ri-vidicon-line' : 'ri-file-line'} text-muted`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-main truncate">{f.name}</p>
                      <p className="text-[10px] text-muted">{formatBytes(f.sizeBytes)}</p>
                    </div>
                    {f.url && (
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-primary-600 hover:text-primary-700 whitespace-nowrap"
                      >
                        {t('evidence.evidenceDetail.openAttachment')}
                        <i className="ri-external-link-line ml-1"></i>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {evidence.files.length === 0 && (
            <div className="bg-white border border-border rounded-2xl p-5 text-sm text-muted">
              {t('evidence.evidenceDetail.noPreview')}
            </div>
          )}

          {/* Voice note */}
          {voice && (
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
                {evidenceTypeLabel(evidence.evidenceType)}
              </h3>
              {typeof voice.durationSeconds === 'number' && voice.durationSeconds > 0 && (
                <p className="text-sm font-medium text-main mb-2">
                  {t('evidence.evidenceDetail.duration')}: {String(voice.durationSeconds)}s
                </p>
              )}
              {typeof voice.summary === 'string' && voice.summary && (
                <div>
                  <span className="text-muted text-xs">{t('evidence.evidenceDetail.voiceSummary')}</span>
                  <p className="text-sm mt-1">{voice.summary}</p>
                </div>
              )}
            </div>
          )}

          {/* Site instruction */}
          {instruction && (
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
                {t('evidence.capture.siteInstruction')}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted text-xs">{t('evidence.evidenceDetail.instructionSource')}:</span>
                  <p className="font-medium">{String(instruction.source || '—')}</p>
                </div>
                <div>
                  <span className="text-muted text-xs">{t('evidence.evidenceDetail.personGiving')}:</span>
                  <p className="font-medium">{String(instruction.person || '—')}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted text-xs">{t('evidence.evidenceDetail.instructionText')}:</span>
                  <p className="text-sm mt-1 whitespace-pre-line">{String(instruction.text || '—')}</p>
                </div>
                <div>
                  <span className="text-muted text-xs">{t('evidence.evidenceDetail.costImpactExpected')}:</span>
                  <p className="font-medium">{instruction.costImpact ? t('dashboard.yes') : t('dashboard.no')}</p>
                </div>
                <div>
                  <span className="text-muted text-xs">{t('evidence.evidenceDetail.programmeImpactExpected')}:</span>
                  <p className="font-medium">{instruction.programmeImpact ? t('dashboard.yes') : t('dashboard.no')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Delay */}
          {delay && (
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
                {t('evidence.capture.recordDelay')}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted text-xs">{t('evidence.evidenceDetail.delayCategory')}:</span>
                  <p className="font-medium capitalize">{String(delay.category || '—').replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <span className="text-muted text-xs">{t('evidence.evidenceDetail.responsibleParty')}:</span>
                  <p className="font-medium">{String(delay.responsible || '—')}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted text-xs">{t('evidence.capture.delayDescription')}:</span>
                  <p className="text-sm mt-1 whitespace-pre-line">{String(delay.description || '—')}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted text-xs">{t('evidence.evidenceDetail.workAffected')}:</span>
                  <p className="text-sm mt-1">{String(delay.workAffected || '—')}</p>
                </div>
                <div>
                  <span className="text-muted text-xs">{t('evidence.evidenceDetail.estimatedHours')}:</span>
                  <p className="font-medium">{Number(delay.estimatedHours || 0)}h</p>
                </div>
              </div>
            </div>
          )}

          {/* Inspection */}
          {inspection && (
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">
                {t('evidence.capture.inspection')}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted text-xs">{t('evidence.evidenceDetail.inspectionOutcome')}:</span>
                  <p className="font-semibold capitalize">{String(inspection.outcome || '—')}</p>
                </div>
                <div>
                  <span className="text-muted text-xs">{t('evidence.evidenceDetail.inspectionReference')}:</span>
                  <p className="font-medium">{String(inspection.reference || '—')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Internal note */}
          {evidence.internalNote && (
            <div className="bg-status-amber-pale border border-[#F5E0C0] rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-status-amber uppercase tracking-wider mb-2">
                {t('evidence.evidenceDetail.internalNote')}
              </h3>
              <p className="text-sm text-main">{evidence.internalNote}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-border rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              {t('evidence.evidenceDetail.type')}
            </h3>
            <p className="text-sm font-medium text-main">{evidenceTypeLabel(evidence.evidenceType)}</p>
          </div>
          {evidence.jobId && (
            <div className="bg-white border border-border rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                {t('evidence.evidenceDetail.job')}
              </h3>
              <button
                className="text-sm font-medium text-main hover:text-primary-600 cursor-pointer text-left"
                onClick={() => evidence.jobId && navigate(`/jobs/${evidence.jobId}`)}
              >
                {evidence.jobRef}{evidence.jobName ? ` — ${evidence.jobName}` : ''}
              </button>
              {evidence.projectStage && <p className="text-xs text-muted mt-1">{evidence.projectStage}</p>}
            </div>
          )}
          {evidence.locationLabel && (
            <div className="bg-white border border-border rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                {t('evidence.capture.locationLabel')}
              </h3>
              <p className="text-sm text-main">{evidence.locationLabel}</p>
            </div>
          )}
          <div className="bg-white border border-border rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              {t('evidence.evidenceDetail.capturedBy')}
            </h3>
            <p className="text-sm font-medium text-main">{evidence.capturedByName}</p>
            <p className="text-xs text-muted mt-1">{formatDateTime(evidence.capturedAt)}</p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={publishConfirm}
        title={t('evidence.evidenceDetail.publishToClient')}
        description={t('evidence.evidenceDetail.publishConfirm')}
        confirmText={updating ? t('evidence.capture.saving') : t('evidence.evidenceDetail.confirmPublish')}
        cancelText={t('dashboard.cancel')}
        onConfirm={() => changeVisibility('client_visible')}
        onCancel={() => {
          if (!updating) setPublishConfirm(false);
        }}
      />

      <ConfirmDialog
        open={withdrawConfirm}
        title={t('evidence.evidenceDetail.withdrawFromClient')}
        description={t('evidence.evidenceDetail.withdrawConfirm')}
        confirmText={updating ? t('evidence.capture.saving') : t('evidence.evidenceDetail.confirmWithdraw')}
        cancelText={t('dashboard.cancel')}
        variant="warning"
        onConfirm={() => changeVisibility('internal_only')}
        onCancel={() => {
          if (!updating) setWithdrawConfirm(false);
        }}
      />
    </div>
  );
}

interface DetailStatusHandlers {
  onRetry: () => void;
  onBack: () => void;
  t: (key: string) => string;
}

function renderDetailStatus(status: Status, { onRetry, onBack, t }: DetailStatusHandlers) {
  if (status === 'loading') {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
        <div className="bg-white border border-border rounded-2xl p-5 animate-pulse">
          <div className="h-3 w-24 bg-page rounded mb-3" />
          <div className="h-5 w-56 bg-page rounded mb-3" />
          <div className="h-3 w-40 bg-page rounded" />
        </div>
        <div className="bg-white border border-border rounded-2xl aspect-[16/9] animate-pulse" />
      </div>
    );
  }

  const copy: Record<string, { icon: string; title: string; desc: string; retry: boolean }> = {
    notfound: { icon: 'ri-file-unknow-line', title: t('evidence.evidenceDetail.notFound'), desc: t('evidence.evidenceDetail.notFoundDesc'), retry: false },
    error: { icon: 'ri-error-warning-line', title: t('evidence.evidenceDetail.loadErrorTitle'), desc: t('evidence.evidenceDetail.loadErrorDesc'), retry: true },
    'no-org': { icon: 'ri-building-2-line', title: t('evidence.noOrg'), desc: t('evidence.noOrgDesc'), retry: false },
    ready: { icon: 'ri-file-line', title: '', desc: '', retry: false },
    loading: { icon: 'ri-loader-4-line', title: '', desc: '', retry: false },
  };
  const c = copy[status];

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
        <i className={`${c.icon} text-2xl text-muted`}></i>
      </div>
      <h2 className="text-lg font-semibold text-main mb-2">{c.title}</h2>
      <p className="text-sm text-muted mb-4">{c.desc}</p>
      <div className="flex items-center justify-center gap-2">
        {c.retry && (
          <button
            className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap"
            onClick={onRetry}
          >
            {t('evidence.retry')}
          </button>
        )}
        <button
          className="h-10 px-5 border border-border text-main text-sm font-medium rounded-xl hover:bg-page cursor-pointer whitespace-nowrap"
          onClick={onBack}
        >
          {t('evidence.evidenceDetail.backToEvidence')}
        </button>
      </div>
    </div>
  );
}