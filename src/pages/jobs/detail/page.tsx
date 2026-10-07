import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';
import { useJobDetail } from './useJobDetail';
import OverviewTab from './components/OverviewTab';
import EvidenceTab from './components/EvidenceTab';
import TimelineTab from './components/TimelineTab';
import VariationsTab from './components/VariationsTab';
import DocumentsTab from './components/DocumentsTab';
import { PanelEmpty, PanelUnavailable } from './components/PanelState';
import HealthSafetyTab from './components/HealthSafetyTab';
import SnaggingTab from './components/SnaggingTab';

const TABS = ['overview', 'timeline', 'schedule', 'team', 'variations', 'evidence', 'financials', 'documents', 'healthSafety', 'snagging', 'compliance', 'clientPortal'];

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

export default function JobDetail() {
  const { t } = useTranslation();
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const formatMoney = (v: number): string => formatAmount(v, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const [activeTab, setActiveTab] = useState('overview');

  const { status, job, data, error, reload } = useJobDetail(jobId);

  // --- Non-ready states -----------------------------------------------------
  if (status === 'loading') {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-24 flex flex-col items-center justify-center text-center" style={{ minHeight: '60vh' }}>
        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
        <p className="text-sm text-muted mt-3">{t('dashboard.detail.loading')}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 text-center" style={{ minHeight: '60vh' }}>
        <div className="w-16 h-16 rounded-2xl bg-status-red-pale flex items-center justify-center mx-auto mb-4">
          <i className="ri-error-warning-line text-2xl text-status-red"></i>
        </div>
        <h2 className="text-lg font-semibold text-main mb-2">{t('dashboard.detail.errorTitle')}</h2>
        <p className="text-sm text-muted mb-4">{error || t('dashboard.detail.errorDesc')}</p>
        <div className="flex items-center justify-center gap-2">
          <button
            className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            onClick={reload}
          >
            {t('dashboard.retry')}
          </button>
          <button
            className="h-10 px-5 border border-border text-main text-sm font-medium rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
            onClick={() => navigate('/jobs')}
          >
            {t('dashboard.backToJobs')}
          </button>
        </div>
      </div>
    );
  }

  if (status === 'no-org') {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 text-center" style={{ minHeight: '60vh' }}>
        <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
          <i className="ri-building-line text-2xl text-muted"></i>
        </div>
        <h2 className="text-lg font-semibold text-main mb-2">{t('dashboard.noOrganisation')}</h2>
        <p className="text-sm text-muted mb-4">{t('dashboard.noOrganisationDesc')}</p>
        <button
          className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          onClick={() => navigate('/jobs')}
        >
          {t('dashboard.backToJobs')}
        </button>
      </div>
    );
  }

  if (status === 'notfound' || !job || !data) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 text-center" style={{ minHeight: '60vh' }}>
        <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
          <i className="ri-error-warning-line text-2xl text-muted"></i>
        </div>
        <h2 className="text-lg font-semibold text-main mb-2">{t('dashboard.detail.notFoundTitle')}</h2>
        <p className="text-sm text-muted mb-4">{t('dashboard.detail.notFoundDesc')}</p>
        <button
          className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          onClick={() => navigate('/jobs')}
        >
          {t('dashboard.backToJobs')}
        </button>
      </div>
    );
  }

  const renderTeam = () => {
    if (data.panelErrors.team) {
      return <PanelEmpty icon="ri-team-line" title={t('dashboard.detail.panelLoadError')} description={t('dashboard.detail.tryAgain')} />;
    }
    if (job.teamMembers.length === 0) {
      return (
        <PanelEmpty icon="ri-team-line" title={t('dashboard.detail.noTeamTitle')} description={t('dashboard.detail.noTeamDesc')} />
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {job.teamMembers.map((m, i) => (
          <div key={m.id} className="flex items-center gap-3 p-4 border border-border rounded-2xl bg-white">
            <div className={`w-10 h-10 rounded-full ${workerColors[i % workerColors.length]} flex items-center justify-center flex-shrink-0`}>
              <span className="text-sm font-semibold text-white">{m.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-main truncate">{m.name}</p>
              <p className="text-xs text-muted truncate">{m.role}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFinancials = () => {
    if (data.panelErrors.financials) {
      return <PanelEmpty icon="ri-money-pound-circle-line" title={t('dashboard.detail.panelLoadError')} description={t('dashboard.detail.tryAgain')} />;
    }
    const f = job.financials;
    const items = [
      { label: t('dashboard.originalContract'), value: formatMoney(f.contractValue) },
      { label: t('dashboard.approvedVariations'), value: formatMoney(f.approvedVariations) },
      { label: t('dashboard.revisedContract'), value: formatMoney(f.revisedContract) },
      { label: t('dashboard.invoiced'), value: formatMoney(f.invoiced) },
      { label: t('dashboard.paid'), value: formatMoney(f.paid) },
      { label: t('dashboard.outstanding'), value: formatMoney(f.outstanding) },
      { label: t('dashboard.retentionHeld'), value: formatMoney(f.retentionHeld) },
    ];
    return (
      <div className="bg-white border border-border rounded-2xl p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.label}>
              <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{item.label}</p>
              <p className="text-sm font-semibold text-main">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSchedule = () => {
    if (!job.programme || (!job.programme.startDate && !job.programme.targetCompletion)) {
      return (
        <PanelEmpty icon="ri-calendar-line" title={t('dashboard.detail.noJobInfoTitle')} description={t('dashboard.detail.noJobInfoDesc')} />
      );
    }
    return (
      <div className="bg-white border border-border rounded-2xl p-5">
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
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{t('dashboard.detail.duration')}</p>
            <p className="text-sm font-medium text-main">
              {job.programme.estimatedDuration ? `${job.programme.estimatedDuration} ${job.programme.durationUnit}` : '—'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab job={job} jobId={jobId || ''} data={data} onNavigate={navigate} onRetry={reload} />;
      case 'timeline':
        return <TimelineTab jobId={jobId || ''} data={data} onNavigate={navigate} onRetry={reload} />;
      case 'evidence':
        return <EvidenceTab jobId={jobId || ''} data={data} onNavigate={navigate} onRetry={reload} />;
      case 'variations':
        return <VariationsTab data={data} onNavigate={navigate} onRetry={reload} />;
      case 'documents':
        return <DocumentsTab data={data} onRetry={reload} />;
      case 'healthSafety':
        return <HealthSafetyTab jobId={jobId || ''} job={job} />;
      case 'snagging':
        return <SnaggingTab jobId={jobId || ''} job={job} />;
      case 'team':
        return renderTeam();
      case 'financials':
        return renderFinancials();
      case 'schedule':
        return renderSchedule();
      case 'clientPortal':
        return <PanelUnavailable description={t('dashboard.detail.clientPortalUnavailable')} />;
      default:
        return <PanelUnavailable description={t('dashboard.detail.complianceUnavailable')} />;
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Breadcrumb */}
      <button
        className="text-sm font-medium text-muted hover:text-main transition-colors cursor-pointer flex items-center gap-1"
        onClick={() => navigate('/jobs')}
      >
        <i className="ri-arrow-left-line text-base"></i>
        {t('dashboard.backToJobs')}
      </button>

      {/* Job header */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">{job.reference}</span>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusColorMap[job.statusColor]}`}>{job.status}</span>
              {job.trade && <span className="text-[10px] text-muted bg-page px-2 py-0.5 rounded-md">{job.trade}</span>}
            </div>
            <h1 className="text-xl font-bold text-main">{job.project}</h1>
            <p className="text-sm text-muted mt-1">{job.client} · {job.site}</p>
            <div className="flex items-center gap-3 mt-3 max-w-sm">
              <div className="flex-1 h-2 bg-page rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${statusDotMap[job.statusColor]}`} style={{ width: `${job.progress}%` }} />
              </div>
              <span className="text-sm font-bold text-main">{job.progress}%</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted">
              <span>PM: {job.projectManager}</span>
              <span>·</span>
              <span>Updated {job.updated}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className="h-9 px-4 border border-border text-main text-sm font-medium rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
              onClick={() => navigate('/deadlines')}
            >
              <i className="ri-calendar-2-line text-sm"></i>
              Deadlines
            </button>
            <button
              className="h-9 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
              onClick={() => navigate(`/jobs/${jobId}/payments`)}
            >
              <i className="ri-money-pound-circle-line text-sm"></i>
              Payment applications
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex items-center gap-1 border-b border-border pb-0 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 -mb-[1px] ${
                activeTab === tab ? 'text-primary-500 border-primary-500' : 'text-muted border-transparent hover:text-main'
              }`}
            >
              {t(`dashboard.detailTabs.${tab}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {renderTabContent()}
    </div>
  );
}