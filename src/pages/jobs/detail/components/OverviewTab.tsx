import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/hooks/useCurrency';
import type { FullJob } from '@/mocks/jobs';
import type { JobDetailData } from '../job-detail.types';
import { PanelError, PanelUnavailable } from './PanelState';
import { evidenceTypeIcon, visibilityLabel } from '../job-detail.labels';

interface OverviewTabProps {
  job: FullJob;
  jobId: string;
  data: JobDetailData;
  onNavigate: (path: string) => void;
  onRetry: () => void;
}

const statusColorMap: Record<string, string> = {
  green: 'bg-primary-50 text-primary-700',
  amber: 'bg-status-amber-pale text-status-amber',
  blue: 'bg-status-blue-pale text-status-blue',
  red: 'bg-status-red-pale text-status-red',
  neutral: 'bg-page text-muted',
};

const statusDotMap: Record<string, string> = {
  green: 'bg-primary-500',
  amber: 'bg-status-amber',
  blue: 'bg-status-blue',
  red: 'bg-status-red',
  neutral: 'bg-muted',
};

const workerColors = ['bg-primary-500', 'bg-status-amber', 'bg-status-blue', 'bg-status-purple', 'bg-status-red'];

const progressStages = [
  { name: 'Pre-start', key: 'prestart' },
  { name: 'Groundworks', key: 'groundworks' },
  { name: 'Structure', key: 'structure' },
  { name: 'First fix', key: 'firstfix' },
  { name: 'Second fix', key: 'secondfix' },
  { name: 'Finishing', key: 'finishing' },
  { name: 'Handover', key: 'handover' },
];

const decisionStyles: Record<string, { label: string; cls: string; icon: string }> = {
  approved: { label: 'Approved', cls: 'bg-primary-50 text-primary-700', icon: 'ri-check-line' },
  declined: { label: 'Declined', cls: 'bg-status-red-pale text-status-red', icon: 'ri-close-line' },
  overdue: { label: 'Overdue', cls: 'bg-status-red-pale text-status-red', icon: 'ri-timer-line' },
  viewed: { label: 'Viewed', cls: 'bg-status-amber-pale text-status-amber', icon: 'ri-eye-line' },
  requested: { label: 'Requested', cls: 'bg-status-blue-pale text-status-blue', icon: 'ri-time-line' },
  question_received: { label: 'Question', cls: 'bg-status-amber-pale text-status-amber', icon: 'ri-question-line' },
};

export default function OverviewTab({ job, jobId, data, onNavigate, onRetry }: OverviewTabProps) {
  const { t } = useTranslation();
  const { formatAmount } = useCurrency();
  const formatMoney = (v: number): string => formatAmount(v, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const financials = job.financials;
  const progressStagesDone = (job.progress / 100) * progressStages.length;

  const financialItems = [
    { label: t('dashboard.originalContract'), value: formatMoney(financials.contractValue) },
    { label: t('dashboard.approvedVariations'), value: formatMoney(financials.approvedVariations), color: 'text-status-amber' },
    { label: t('dashboard.revisedContract'), value: formatMoney(financials.revisedContract), bold: true },
    { label: t('dashboard.invoiced'), value: formatMoney(financials.invoiced) },
    { label: t('dashboard.paid'), value: formatMoney(financials.paid), color: 'text-primary-500' },
    { label: t('dashboard.outstanding'), value: formatMoney(financials.outstanding), color: financials.outstanding > 0 ? 'text-status-red' : 'text-muted' },
    { label: t('dashboard.retentionHeld'), value: formatMoney(financials.retentionHeld) },
  ];

  const recentEvidence = data.evidence.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Next action */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">{t('dashboard.nextActionLabel')}</h3>
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${statusColorMap[job.statusColor]}`}>
            <i className="ri-arrow-right-circle-line text-xl"></i>
          </div>
          <div>
            <p className="text-base font-semibold text-main">{job.nextAction}</p>
            <p className="text-sm text-muted mt-0.5">{job.nextActionTime}</p>
            {job.workers.length > 0 && (
              <p className="text-xs text-muted mt-1">{t('dashboard.assignedTo')}: {job.workers.join(', ')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Project progress */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('dashboard.projectProgress')}</h3>
        <div className="space-y-2">
          {progressStages.map((stage, i) => {
            const status: 'done' | 'in-progress' | 'upcoming' =
              i < Math.floor(progressStagesDone) ? 'done' :
              i === Math.floor(progressStagesDone) ? 'in-progress' : 'upcoming';
            return (
              <div key={stage.key} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  status === 'done' ? 'bg-primary-500' :
                  status === 'in-progress' ? 'bg-primary-100 border-2 border-primary-500' :
                  'bg-page border-2 border-border'
                }`}>
                  {status === 'done' ? (
                    <i className="ri-check-line text-xs text-white"></i>
                  ) : status === 'in-progress' ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                  )}
                </div>
                <span className={`text-sm ${status === 'upcoming' ? 'text-muted' : 'text-main font-medium'}`}>{stage.name}</span>
                {status === 'done' && <span className="text-[10px] text-primary-500 font-medium ml-auto">Complete</span>}
                {status === 'in-progress' && <span className="text-[10px] text-status-amber font-medium ml-auto">In progress</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial position */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">{t('dashboard.financialPosition')}</h3>
          <button
            className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
            onClick={() => onNavigate(`/jobs/${jobId}/payments`)}
          >
            Payment applications <i className="ri-arrow-right-line"></i>
          </button>
        </div>
        {data.panelErrors.financials ? (
          <PanelError description={t('dashboard.detail.panelLoadError')} retryLabel={t('dashboard.retry')} onRetry={onRetry} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {financialItems.map((item) => (
              <div key={item.label}>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{item.label}</p>
                <p className={`text-sm ${item.bold ? 'font-bold text-main text-base' : 'font-semibold text-main'} ${item.color || ''}`}>{item.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Client decisions + Recent evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client decisions */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('dashboard.clientDecisions')}</h3>
          {data.decisionsAvailable ? (
            data.decisions.length === 0 ? (
              <p className="text-sm text-muted">{t('dashboard.detail.noDecisions')}</p>
            ) : (
              <div className="space-y-3">
                {data.decisions.map((d) => {
                  const style = decisionStyles[d.status] || { label: d.status, cls: 'bg-page text-muted', icon: 'ri-record-circle-line' };
                  return (
                    <div key={d.id} className={`flex items-center gap-3 p-3 rounded-xl ${style.cls}`}>
                      <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center flex-shrink-0">
                        <i className={`${style.icon} text-sm`}></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-main truncate">{d.question}</p>
                        <p className="text-[11px] opacity-80">{style.label}{d.detail ? ` · ${d.detail}` : ''}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <PanelUnavailable
              title={t('dashboard.detail.notConnected')}
              description={t('dashboard.detail.clientDecisionsUnavailable')}
            />
          )}
        </div>

        {/* Recent site evidence */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('dashboard.recentSiteEvidence')}</h3>
          {data.panelErrors.evidence ? (
            <PanelError description={t('dashboard.detail.panelLoadError')} retryLabel={t('dashboard.retry')} onRetry={onRetry} />
          ) : recentEvidence.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-2xl bg-page flex items-center justify-center mx-auto mb-3">
                <i className="ri-camera-line text-xl text-muted"></i>
              </div>
              <p className="text-sm font-medium text-main">{t('dashboard.detail.noEvidenceTitle')}</p>
              <p className="text-xs text-muted mt-1">{t('dashboard.detail.noEvidenceDesc')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentEvidence.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-page transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-page flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.previewUrl ? (
                      <img src={item.previewUrl} alt={item.caption} className="w-full h-full object-cover" />
                    ) : (
                      <i className={`${evidenceTypeIcon(item.evidenceType)} text-lg text-muted`}></i>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-main leading-snug line-clamp-2">{item.caption || 'No caption'}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {item.capturedAt && (
                        <span className="text-[10px] text-muted">
                          {new Date(item.capturedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      <span className="text-[10px] text-muted">by {item.capturedBy}</span>
                      {item.visibility === 'internal_only' && (
                        <span className="text-[9px] font-medium text-status-amber bg-status-amber-pale px-1.5 py-0.5 rounded-full">
                          {visibilityLabel(item.visibility)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Team & compliance */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('dashboard.teamAndCompliance')}</h3>
        {data.panelErrors.team ? (
          <PanelError description={t('dashboard.detail.panelLoadError')} retryLabel={t('dashboard.retry')} onRetry={onRetry} />
        ) : job.teamMembers.length === 0 ? (
          <p className="text-sm text-muted">{t('dashboard.detail.noTeamDesc')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {job.teamMembers.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 p-3 border border-border rounded-xl">
                <div className={`w-9 h-9 rounded-full ${workerColors[i % workerColors.length]} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-xs font-semibold text-white">{m.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-main truncate">{m.name}</p>
                  <p className="text-[11px] text-muted truncate">{m.role}</p>
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 bg-primary-50 text-primary-700">
                  {t('dashboard.compliant')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Important job information */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('dashboard.jobInformation')}</h3>
        {job.programme ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{t('dashboard.startDate')}</p>
              <p className="text-sm font-medium text-main">
                {job.programme.startDate ? new Date(job.programme.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{t('dashboard.targetCompletion')}</p>
              <p className="text-sm font-medium text-main">
                {job.programme.targetCompletion ? new Date(job.programme.targetCompletion).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{t('dashboard.workingHours')}</p>
              <p className="text-sm font-medium text-main">{job.programme.siteWorkingHours || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{t('dashboard.siteAccess')}</p>
              <p className="text-sm font-medium text-main">{job.siteAddress?.accessNotes || '—'}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">{t('dashboard.detail.noJobInfoDesc')}</p>
        )}
      </div>
    </div>
  );
}