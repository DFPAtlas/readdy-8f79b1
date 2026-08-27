import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { demoSiteActivityMetrics, demoEvidenceCoverage } from '@/mocks/reports';

export default function SiteActivityReport() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const metrics = demoSiteActivityMetrics;

  // Group coverage by date
  const dates = [...new Set(demoEvidenceCoverage.map((d) => d.date))].sort();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => navigate('/reports')} className="text-foreground-400 hover:text-foreground-600 cursor-pointer">
            <i className="ri-arrow-left-line"></i>
          </button>
          <h1 className="text-xl font-semibold text-foreground-950">{t('reports.siteActivityHeading')}</h1>
        </div>
        <p className="text-sm text-foreground-500">{t('reports.siteActivityDesc')}</p>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {metrics.map((m) => (
            <div key={m.id} className="bg-white border border-border rounded-xl p-4">
              <p className="text-xs text-foreground-500 mb-1">{m.label}</p>
              <p className="text-xl font-bold text-foreground-950">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Coverage calendar */}
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground-950 mb-4">{t('reports.evidenceCoverage')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background-50 text-foreground-400 text-[11px] uppercase tracking-wider">
                  <th className="text-left py-2.5 px-4 font-medium">{t('reports.colJobRef')}</th>
                  {dates.map((date) => (
                    <th key={date} className="text-center py-2.5 px-3 font-medium">
                      {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...new Set(demoEvidenceCoverage.map((d) => d.jobRef))].map((jobRef) => (
                  <tr key={jobRef} className="border-b border-border last:border-0">
                    <td className="py-2.5 px-4 font-medium text-foreground-800">{jobRef}</td>
                    {dates.map((date) => {
                      const day = demoEvidenceCoverage.find((d) => d.date === date && d.jobRef === jobRef);
                      return (
                        <td key={date} className="py-2.5 px-3 text-center">
                          {day?.isWorkingDay ? (
                            day.hasLog ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 text-[10px] font-bold" title={t('reports.logPresent')}>✓</span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50 text-red-400 text-[10px] font-bold" title={t('reports.logMissing')}>✕</span>
                            )
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-50 text-gray-300 text-[10px]">–</span>
                          )}
                        </td>
                      );
                    })}
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