import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/components/base/Toast';
import { demoFullJobs } from '@/mocks/jobs';
import { getEvidenceByJob, getDailyLogsByJob, getTimelineEventsByJob } from '@/mocks/evidence';
import { getVariationsByJob } from '@/mocks/clients';
import { formatGBP } from '@/mocks/reports';

type ViewMode = 'management' | 'commercial' | 'site' | 'client_safe';

export default function JobReport() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { jobId } = useParams<{ jobId: string }>();

  const [viewMode, setViewMode] = useState<ViewMode>('management');

  const job = demoFullJobs.find((j) => j.id === jobId);
  const evidence = jobId ? getEvidenceByJob(jobId) : [];
  const dailyLogs = jobId ? getDailyLogsByJob(jobId) : [];
  const timeline = jobId ? getTimelineEventsByJob(jobId) : [];
  const variations = jobId ? getVariationsByJob(jobId) : [];

  const isClientSafe = viewMode === 'client_safe';

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="w-16 h-16 rounded-2xl bg-background-50 flex items-center justify-center mb-3">
          <i className="ri-file-search-line text-2xl text-foreground-300"></i>
        </div>
        <p className="text-sm font-medium text-foreground-500">Job not found</p>
        <button onClick={() => navigate('/reports/jobs')} className="mt-3 text-sm text-primary-500 cursor-pointer">
          Back to job performance
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => navigate(`/jobs/${job.id}`)} className="text-foreground-400 hover:text-foreground-600 cursor-pointer">
            <i className="ri-arrow-left-line"></i>
          </button>
          <h1 className="text-xl font-semibold text-foreground-950">{t('reports.jobReportHeading')}</h1>
        </div>
        <p className="text-sm text-foreground-500 flex items-center gap-2">
          {job.reference} — {job.project}
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
            job.statusColor === 'green' ? 'bg-green-50 text-green-700' :
            job.statusColor === 'amber' ? 'bg-amber-50 text-amber-700' :
            job.statusColor === 'red' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
          }`}>
            {job.status}
          </span>
        </p>
      </div>

      {/* View mode tabs */}
      <div className="px-4 md:px-6 py-2 border-b border-border flex flex-wrap gap-2">
        {([
          { id: 'management' as const, icon: 'ri-dashboard-line', label: t('reports.managementView') },
          { id: 'commercial' as const, icon: 'ri-money-pound-circle-line', label: t('reports.commercialView') },
          { id: 'site' as const, icon: 'ri-building-line', label: t('reports.siteView') },
          { id: 'client_safe' as const, icon: 'ri-eye-line', label: t('reports.clientSafeView') },
        ]).map((mode) => (
          <button
            key={mode.id}
            onClick={() => setViewMode(mode.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              viewMode === mode.id
                ? mode.id === 'client_safe' ? 'bg-blue-50 text-blue-700' : 'bg-primary-50 text-primary-700'
                : 'bg-background-50 text-foreground-500 hover:bg-background-100'
            }`}
          >
            <i className={`${mode.icon} text-sm`}></i>
            {mode.label}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => showToast(t('reports.demoExport'), 'info')} className="h-8 px-3 bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap flex items-center gap-1.5">
          <i className="ri-download-2-line"></i>
          {t('reports.exportJobReport')}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-3xl space-y-6">
          {/* Client-safe banner */}
          {isClientSafe && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
              {t('reports.clientSafeRemoved')}
            </div>
          )}

          {/* Project summary */}
          <section className="bg-white border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground-950 mb-3">{t('reports.projectSummary')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-foreground-400">{t('dashboard.colClient')}</p>
                <p className="text-sm font-medium text-foreground-800">{job.client}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-400">{t('dashboard.startDate')}</p>
                <p className="text-sm font-medium text-foreground-800">{job.programme?.startDate ? new Date(job.programme.startDate).toLocaleDateString('en-GB') : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-400">{t('dashboard.targetCompletion')}</p>
                <p className="text-sm font-medium text-foreground-800">{job.programme?.targetCompletion ? new Date(job.programme.targetCompletion).toLocaleDateString('en-GB') : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-foreground-400">{t('dashboard.projectProgress')}</p>
                <p className="text-sm font-medium text-foreground-800">{job.progress}%</p>
              </div>
            </div>
          </section>

          {/* Commercial section (hidden in client-safe) */}
          {!isClientSafe && (
            <section className="bg-white border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground-950 mb-3">{t('reports.contractValue')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: t('reports.originalContractValue'), value: formatGBP(job.financials.contractValue) },
                  { label: t('reports.approvedVariationValue'), value: formatGBP(job.financials.approvedVariations) },
                  { label: t('reports.revisedContractValue'), value: formatGBP(job.financials.revisedContract) },
                  { label: t('reports.applicationsIssued'), value: formatGBP(job.financials.invoiced) },
                  { label: t('reports.paymentsReceived'), value: formatGBP(job.financials.paid) },
                  { label: t('reports.outstandingReceivables'), value: formatGBP(job.financials.outstanding) },
                ].map((m, i) => (
                  <div key={i}>
                    <p className="text-xs text-foreground-400">{m.label}</p>
                    <p className={`text-sm font-semibold ${m.label === t('reports.outstandingReceivables') && job.financials.outstanding > 0 ? 'text-red-600' : 'text-foreground-800'}`}>{m.value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Daily log coverage */}
          <section className="bg-white border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground-950 mb-3">{t('reports.dailyLogCoverage')}</h3>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">{dailyLogs.length}</p>
                <p className="text-xs text-foreground-400">Logs submitted</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground-950">{evidence.length > 0 ? Math.min(evidence.length, 42) : 0}</p>
                <p className="text-xs text-foreground-400">Evidence records</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground-950">{timeline.length}</p>
                <p className="text-xs text-foreground-400">Timeline events</p>
              </div>
            </div>
          </section>

          {/* Variations (hidden in client-safe commercial) */}
          {!isClientSafe && variations.length > 0 && (
            <section className="bg-white border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground-950 mb-3">{t('dashboard.variationsTitle')}</h3>
              <div className="space-y-2">
                {variations.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-background-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground-800">{v.reference} — {v.title}</p>
                      <p className="text-xs text-foreground-400">{v.status} · {formatGBP(v.latestTotalPrice)}</p>
                    </div>
                    <button onClick={() => navigate(`/variations/${v.id}`)} className="text-xs text-primary-500 hover:underline cursor-pointer">
                      View
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent timeline */}
          <section className="bg-white border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground-950 mb-3">{t('reports.recentCommunication')}</h3>
            <div className="space-y-3">
              {timeline.slice(-8).reverse().map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-background-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-semibold text-foreground-400">{event.actorInitials}</span>
                  </div>
                  <div>
                    <p className="text-sm text-foreground-800">
                      <span className="font-medium">{event.eventType}</span>: {event.summary}
                    </p>
                    <p className="text-[10px] text-foreground-400">
                      {new Date(event.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {event.actor}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}