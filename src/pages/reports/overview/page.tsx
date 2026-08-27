import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/base/Toast';
import {
  demoReportSummaryCards,
  presetPeriods,
  getPresetPeriodLabel,
  formatGBP,
  demoReportRuns,
  getRunStatusColor,
} from '@/mocks/reports';
import { demoFullJobs } from '@/mocks/jobs';
import type { PresetPeriod } from '@/mocks/reports';

export default function ReportsOverview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [period, setPeriod] = useState<PresetPeriod>('this_month');
  const [comparePrevious, setComparePrevious] = useState(true);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const cards = demoReportSummaryCards;
  const recentRuns = demoReportRuns.filter((r) => r.status === 'completed').slice(0, 5);

  const reportNav = [
    { id: 'overview', label: t('reports.overview'), icon: 'ri-dashboard-line', active: true },
    { id: 'jobs', label: t('reports.jobs'), icon: 'ri-briefcase-line' },
    { id: 'commercial', label: t('reports.commercial'), icon: 'ri-money-pound-circle-line' },
    { id: 'cash-flow', label: t('reports.cashFlow'), icon: 'ri-bank-line' },
    { id: 'clients', label: t('reports.clients'), icon: 'ri-user-line' },
    { id: 'workforce', label: t('reports.workforce'), icon: 'ri-team-line' },
    { id: 'site-activity', label: t('reports.siteActivity'), icon: 'ri-camera-line' },
    { id: 'compliance', label: t('reports.compliance'), icon: 'ri-shield-check-line' },
    { id: 'builder', label: t('reports.reportBuilder'), icon: 'ri-file-chart-line' },
    { id: 'saved', label: t('reports.savedReports'), icon: 'ri-bookmark-line' },
    { id: 'scheduled', label: t('reports.scheduledReports'), icon: 'ri-calendar-schedule-line' },
  ];

  const getCategoryIcon = (cat: string) => {
    const icons: Record<string, string> = {
      commercial: 'ri-money-pound-circle-line',
      jobs: 'ri-briefcase-line',
      cash: 'ri-bank-line',
      compliance: 'ri-shield-check-line',
      workforce: 'ri-team-line',
      actions: 'ri-alert-line',
    };
    return icons[cat] || 'ri-information-line';
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      commercial: 'bg-primary-50 text-primary-700',
      jobs: 'bg-blue-50 text-blue-700',
      cash: 'bg-green-50 text-green-700',
      compliance: 'bg-amber-50 text-amber-700',
      workforce: 'bg-purple-50 text-purple-700',
      actions: 'bg-red-50 text-red-700',
    };
    return colors[cat] || 'bg-gray-50 text-gray-600';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-6 py-5 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground-950">{t('reports.heading')}</h1>
        <p className="text-sm text-foreground-500 mt-1">{t('reports.subheading')}</p>
      </div>

      <div className="flex-1 flex">
        {/* Left nav */}
        <nav className="hidden lg:block w-56 border-r border-border p-3 space-y-0.5 flex-shrink-0">
          {reportNav.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'overview') return;
                navigate(`/reports/${item.id}`);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                item.active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-foreground-600 hover:bg-background-50'
              }`}
            >
              <span className="w-7 h-7 flex items-center justify-center">
                <i className={`${item.icon} text-base`}></i>
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative">
              <button
                onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                className="h-9 px-3 bg-background-50 border border-border rounded-lg text-sm flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <i className="ri-calendar-line text-muted"></i>
                {getPresetPeriodLabel(period)}
                <i className="ri-arrow-down-s-line text-muted text-xs"></i>
              </button>
              {showPeriodDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPeriodDropdown(false)} />
                  <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-border rounded-xl shadow-lg z-50 py-1">
                    {presetPeriods.map((p) => (
                      <button
                        key={p}
                        onClick={() => { setPeriod(p); setShowPeriodDropdown(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-background-50 cursor-pointer whitespace-nowrap ${period === p ? 'bg-primary-50 text-primary-700 font-medium' : 'text-foreground-700'}`}
                      >
                        {getPresetPeriodLabel(p)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setComparePrevious(!comparePrevious)}
              className={`h-9 px-3 rounded-lg text-sm border cursor-pointer whitespace-nowrap transition-colors flex items-center gap-2 ${
                comparePrevious
                  ? 'bg-primary-50 border-primary-200 text-primary-700'
                  : 'bg-white border-border text-foreground-500'
              }`}
            >
              <i className={`${comparePrevious ? 'ri-toggle-fill' : 'ri-toggle-line'} text-base`}></i>
              {t('reports.comparePrevious')}
            </button>

            <div className="flex-1" />

            <button
              onClick={() => showToast(t('reports.demoExport'), 'info')}
              className="h-9 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg cursor-pointer whitespace-nowrap flex items-center gap-2"
            >
              <i className="ri-download-2-line"></i>
              {t('reports.exportDashboard')}
            </button>

            <button
              onClick={() => { setPeriod('this_month'); setComparePrevious(true); }}
              className="h-9 px-3 text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap"
            >
              {t('reports.resetFilters')}
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => navigate(card.linkRoute)}
                className="bg-white border border-border rounded-xl p-4 text-left hover:border-primary-200 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${getCategoryColor(card.category)}`}>
                    <i className={`${getCategoryIcon(card.category)} text-sm`}></i>
                  </span>
                  {card.changePct !== undefined && comparePrevious && (
                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                      card.changeIsPositive
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {card.changePct > 0 ? '+' : ''}{card.changePct}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground-500 mb-1">{card.label}</p>
                <p className="text-xl font-bold text-foreground-950">{card.value}</p>
                {comparePrevious && card.previousValue && (
                  <p className="text-[10px] text-foreground-400 mt-1">
                    {t('reports.comparedToPrevious')}: {card.previousValue}
                  </p>
                )}
              </button>
            ))}
          </div>

          {/* Recent exports */}
          <div className="bg-white border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground-950">{t('reports.recentExports')}</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-foreground-400 text-[11px] uppercase tracking-wider border-b border-border">
                  <th className="text-left py-2 font-medium">{t('reports.reportName')}</th>
                  <th className="text-left py-2 font-medium">{t('reports.trigger')}</th>
                  <th className="text-left py-2 font-medium">{t('reports.started')}</th>
                  <th className="text-left py-2 font-medium">{t('reports.outputFormat')}</th>
                  <th className="text-left py-2 font-medium">{t('reports.status')}</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-medium text-foreground-800">{run.reportName}</td>
                    <td className="py-2.5 text-foreground-500">
                      {run.trigger === 'scheduled' ? t('reports.scheduled') : t('reports.manual')}
                    </td>
                    <td className="py-2.5 text-foreground-500">
                      {new Date(run.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} {new Date(run.startedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5">
                      <span className="text-[10px] font-semibold uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {run.outputFormat.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getRunStatusColor(run.status)}`}>
                        {t(`reports.${run.status === 'completed' ? 'completed_status' : run.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}