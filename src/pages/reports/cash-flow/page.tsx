import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { demoCashFlowSummary, demoReceivablesAgeing, demoCashFlowForecast, formatGBP } from '@/mocks/reports';

export default function CashFlowReport() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const summary = demoCashFlowSummary;

  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-50 text-green-700',
    expected: 'bg-blue-50 text-blue-700',
    at_risk: 'bg-red-50 text-red-700',
    overdue: 'bg-red-500 text-white',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => navigate('/reports')} className="text-foreground-400 hover:text-foreground-600 cursor-pointer">
            <i className="ri-arrow-left-line"></i>
          </button>
          <h1 className="text-xl font-semibold text-foreground-950">{t('reports.cashFlowHeading')}</h1>
        </div>
        <p className="text-sm text-foreground-500">{t('reports.cashFlowDesc')}</p>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Summary grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: t('reports.totalOutstanding'), value: formatGBP(summary.totalOutstanding), color: 'text-foreground-950' },
            { label: t('reports.totalOverdue'), value: formatGBP(summary.totalOverdue), color: 'text-red-600' },
            { label: t('reports.dueNext7Days'), value: formatGBP(summary.dueNext7Days), color: 'text-amber-600' },
            { label: t('reports.dueNext30Days'), value: formatGBP(summary.dueNext30Days), color: 'text-blue-600' },
            { label: t('reports.expectedRetentionRelease'), value: formatGBP(summary.expectedRetentionReleases), color: 'text-green-600' },
            { label: t('reports.receivedThisMonth'), value: formatGBP(summary.paymentsReceivedThisMonth), color: 'text-green-700' },
            { label: t('reports.averagePaymentDelay'), value: `${summary.averagePaymentDelay} ${t('reports.days')}`, color: 'text-amber-600' },
            { label: t('reports.oldestUnpaid'), value: `${summary.oldestUnpaidDays} ${t('reports.days')}`, color: 'text-red-600' },
          ].map((item, i) => (
            <div key={i} className="bg-white border border-border rounded-xl p-4">
              <p className="text-xs text-foreground-500 mb-1">{item.label}</p>
              <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ageing */}
          <div className="bg-white border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground-950 mb-4">{t('reports.receivablesAgeing')}</h3>
            <div className="space-y-3">
              {demoReceivablesAgeing.map((bucket) => (
                <div key={bucket.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground-600">{bucket.label}</span>
                    <span className="text-sm font-semibold text-foreground-800">{formatGBP(bucket.amount)}</span>
                  </div>
                  <div className="h-2 bg-background-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${bucket.color}`}
                      style={{ width: `${Math.min(100, (bucket.amount / (demoCashFlowSummary.totalOutstanding || 1)) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-foreground-400 mt-0.5">{bucket.count} {t('reports.items')}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Forecast */}
          <div className="bg-white border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground-950 mb-4">{t('reports.cashFlowForecast')}</h3>
            <div className="space-y-3">
              {demoCashFlowForecast.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-background-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-foreground-400">{item.jobRef}</span>
                      <span className="text-xs text-foreground-600 truncate">{item.description}</span>
                    </div>
                    <p className="text-[10px] text-foreground-400 mt-0.5">
                      {t('reports.due')}: {new Date(item.dueDate).toLocaleDateString('en-GB')} · {t('reports.expected')}: {new Date(item.expectedDate).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="text-sm font-semibold text-foreground-800 whitespace-nowrap">{formatGBP(item.amount)}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusColors[item.status] || 'bg-gray-100 text-gray-600'}`}>
                      {item.statusLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}