import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { demoWorkforceMetrics, demoSubcontractorPerformance, formatGBP } from '@/mocks/reports';

export default function WorkforceReport() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => navigate('/reports')} className="text-foreground-400 hover:text-foreground-600 cursor-pointer">
            <i className="ri-arrow-left-line"></i>
          </button>
          <h1 className="text-xl font-semibold text-foreground-950">{t('reports.workforceHeading')}</h1>
        </div>
        <p className="text-sm text-foreground-500">{t('reports.workforceDesc')}</p>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {demoWorkforceMetrics.map((m) => (
            <div key={m.id} className="bg-white border border-border rounded-xl p-4">
              <p className="text-xs text-foreground-500 mb-1">{m.label}</p>
              <p className="text-xl font-bold text-foreground-950">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Subcontractor performance */}
        <div className="bg-white border border-border rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-foreground-950 mb-4">{t('reports.subcontractorPerformance')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background-50 text-foreground-400 text-[11px] uppercase tracking-wider">
                  <th className="text-left py-2.5 px-4 font-medium">{t('reports.colBusiness')}</th>
                  <th className="text-left py-2.5 px-4 font-medium">{t('reports.colTrade')}</th>
                  <th className="text-center py-2.5 px-4 font-medium">{t('reports.colActiveAssignments')}</th>
                  <th className="text-center py-2.5 px-4 font-medium">{t('reports.colCompletedAssignments')}</th>
                  <th className="text-center py-2.5 px-4 font-medium">{t('reports.colCompliance')}</th>
                  <th className="text-center py-2.5 px-4 font-medium">{t('reports.colEvidenceSubmitted')}</th>
                  <th className="text-center py-2.5 px-4 font-medium">{t('reports.colPaymentStatus')}</th>
                  <th className="text-right py-2.5 px-4 font-medium">{t('reports.colRetentionBalance')}</th>
                  <th className="text-center py-2.5 px-4 font-medium">{t('reports.colLastActivity')}</th>
                </tr>
              </thead>
              <tbody>
                {demoSubcontractorPerformance.map((sub, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-background-50">
                    <td className="py-2.5 px-4 font-medium text-foreground-800">{sub.business}</td>
                    <td className="py-2.5 px-4 text-foreground-500">{sub.trade}</td>
                    <td className="py-2.5 px-4 text-center text-foreground-600">{sub.activeAssignments}</td>
                    <td className="py-2.5 px-4 text-center text-foreground-500">{sub.completedAssignments}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        sub.complianceStatus === 'Compliant' ? 'bg-green-50 text-green-700' :
                        sub.complianceStatus === 'Action required' ? 'bg-red-50 text-red-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {sub.complianceStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center text-foreground-500">{sub.evidenceSubmitted}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="text-[11px] font-medium text-green-700">{sub.paymentStatus}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-foreground-600">{formatGBP(sub.retentionBalance)}</td>
                    <td className="py-2.5 px-4 text-center text-foreground-400 text-xs">{sub.lastActivity}</td>
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