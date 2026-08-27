import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { demoCommercialMetrics, formatGBP, demoJobPerformance, formatGBPCompact } from '@/mocks/reports';

export default function CommercialReport() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const metrics = demoCommercialMetrics;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 py-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => navigate('/reports')} className="text-foreground-400 hover:text-foreground-600 cursor-pointer">
              <i className="ri-arrow-left-line"></i>
            </button>
            <h1 className="text-xl font-semibold text-foreground-950">{t('reports.commercialHeading')}</h1>
          </div>
          <p className="text-sm text-foreground-500">{t('reports.commercialDesc')}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Metrics grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metrics.slice(0, 8).map((m) => (
            <div key={m.id} className="bg-white border border-border rounded-xl p-4">
              <p className="text-xs text-foreground-500 mb-1">{m.label}</p>
              <p className="text-xl font-bold text-foreground-950">{m.formattedValue}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metrics.slice(8).map((m) => (
            <div key={m.id} className="bg-white border border-border rounded-xl p-4">
              <p className="text-xs text-foreground-500 mb-1">{m.label}</p>
              <p className="text-xl font-bold text-foreground-950">{m.formattedValue}</p>
            </div>
          ))}
        </div>

        {/* By job */}
        <div className="bg-white border border-border rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-foreground-950 mb-4">{t('reports.commercialByJob')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background-50 text-foreground-400 text-[11px] uppercase tracking-wider">
                  <th className="text-left py-2.5 px-4 font-medium">{t('reports.colJobName')}</th>
                  <th className="text-right py-2.5 px-4 font-medium">{t('reports.originalContractValue')}</th>
                  <th className="text-right py-2.5 px-4 font-medium">{t('reports.approvedVariationValue')}</th>
                  <th className="text-right py-2.5 px-4 font-medium">{t('reports.revisedContractValue')}</th>
                  <th className="text-right py-2.5 px-4 font-medium">{t('reports.applicationsIssued')}</th>
                  <th className="text-right py-2.5 px-4 font-medium">{t('reports.paymentsReceived')}</th>
                  <th className="text-right py-2.5 px-4 font-medium">{t('reports.outstandingReceivables')}</th>
                </tr>
              </thead>
              <tbody>
                {demoJobPerformance.map((job) => (
                  <tr key={job.jobId} className="border-b border-border last:border-0 hover:bg-background-50">
                    <td className="py-2.5 px-4 font-medium text-foreground-800">{job.jobName}</td>
                    <td className="py-2.5 px-4 text-right text-foreground-600">{formatGBP(job.revisedContractValue - job.approvedVariations)}</td>
                    <td className="py-2.5 px-4 text-right font-medium text-green-700">{formatGBP(job.approvedVariations)}</td>
                    <td className="py-2.5 px-4 text-right font-semibold text-foreground-800">{formatGBP(job.revisedContractValue)}</td>
                    <td className="py-2.5 px-4 text-right text-foreground-600">{formatGBP(job.applicationsIssued)}</td>
                    <td className="py-2.5 px-4 text-right text-green-700 font-medium">{formatGBP(job.paymentsReceived)}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className={job.outstandingValue > 5000 ? 'text-red-600 font-medium' : 'text-foreground-600'}>
                        {formatGBP(job.outstandingValue)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Applications vs payments visual */}
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground-950 mb-4">{t('reports.applicationsVsPayments')}</h3>
          <div className="space-y-3">
            {demoJobPerformance.map((job) => {
              const pct = job.applicationsIssued > 0 ? Math.round((job.paymentsReceived / job.applicationsIssued) * 100) : 0;
              return (
                <div key={job.jobId} className="flex items-center gap-3">
                  <span className="text-xs text-foreground-500 w-28 truncate">{job.jobRef}</span>
                  <div className="flex-1 flex items-center gap-1">
                    <div className="h-4 bg-background-100 rounded-full flex-1 overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                    </div>
                    <span className="text-[11px] text-foreground-400 w-8 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}