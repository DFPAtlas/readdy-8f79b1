import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { demoClientPerformance, getClientHealthLabel, getClientHealthColor, formatGBP } from '@/mocks/reports';

export default function ClientPerformanceReport() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => navigate('/reports')} className="text-foreground-400 hover:text-foreground-600 cursor-pointer">
            <i className="ri-arrow-left-line"></i>
          </button>
          <h1 className="text-xl font-semibold text-foreground-950">{t('reports.clientsHeading')}</h1>
        </div>
        <p className="text-sm text-foreground-500">{t('reports.clientsDesc')}</p>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background-50 text-foreground-400 text-[11px] uppercase tracking-wider">
                  <th className="text-left py-2.5 px-4 font-medium">{t('reports.colClient')}</th>
                  <th className="text-center py-2.5 px-4 font-medium">{t('reports.colActiveJobs')}</th>
                  <th className="text-right py-2.5 px-4 font-medium hidden md:table-cell">{t('reports.colTotalContract')}</th>
                  <th className="text-right py-2.5 px-4 font-medium hidden lg:table-cell">{t('reports.colAppsIssued')}</th>
                  <th className="text-right py-2.5 px-4 font-medium hidden lg:table-cell">{t('reports.colReceived')}</th>
                  <th className="text-right py-2.5 px-4 font-medium">{t('reports.colOutstanding')}</th>
                  <th className="text-right py-2.5 px-4 font-medium hidden md:table-cell">{t('reports.colOverdue')}</th>
                  <th className="text-center py-2.5 px-4 font-medium hidden lg:table-cell">{t('reports.colAvgPay')}</th>
                  <th className="text-center py-2.5 px-4 font-medium">{t('reports.colOpenDecisions')}</th>
                  <th className="text-center py-2.5 px-4 font-medium">{t('reports.colClientHealth')}</th>
                </tr>
              </thead>
              <tbody>
                {demoClientPerformance.map((client) => (
                  <tr key={client.clientId} className="border-b border-border last:border-0 hover:bg-background-50">
                    <td className="py-2.5 px-4">
                      <button onClick={() => navigate(`/clients/${client.clientId}`)} className="font-medium text-foreground-800 hover:text-primary-600 cursor-pointer whitespace-nowrap">
                        {client.clientName}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-center text-foreground-600">{client.activeJobs}</td>
                    <td className="py-2.5 px-4 text-right text-foreground-600 hidden md:table-cell">{formatGBP(client.totalRevisedContractValue)}</td>
                    <td className="py-2.5 px-4 text-right text-foreground-500 hidden lg:table-cell">{formatGBP(client.applicationsIssued)}</td>
                    <td className="py-2.5 px-4 text-right text-green-700 hidden lg:table-cell">{formatGBP(client.paymentsReceived)}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className={`font-medium ${client.outstandingAmount > 5000 ? 'text-red-600' : 'text-foreground-700'}`}>
                        {formatGBP(client.outstandingAmount)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right hidden md:table-cell">
                      <span className={client.overdueAmount > 0 ? 'text-red-600 font-medium' : 'text-foreground-400'}>
                        {formatGBP(client.overdueAmount)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center text-foreground-500 hidden lg:table-cell">
                      {client.averageDaysToPay} {t('reports.days')}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${client.openVariationDecisions > 0 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                        {client.openVariationDecisions}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full cursor-default ${getClientHealthColor(client.healthStatus)}`}>
                        {getClientHealthLabel(client.healthStatus)}
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