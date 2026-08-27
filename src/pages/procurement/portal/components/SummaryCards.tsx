import { procurementKpis, formatGBP } from '@/mocks/procurementPortal';

export default function SummaryCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {procurementKpis.map((kpi) => (
        <div key={kpi.id} className="bg-white border border-border rounded-xl p-5 flex items-start gap-4">
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${kpi.color}`}>
            <i className={`${kpi.icon} text-xl`}></i>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted font-medium">{kpi.label}</p>
            <p className="text-2xl font-semibold text-main tabular-nums mt-1">
              {kpi.isMoney
                ? formatGBP(kpi.value)
                : kpi.value}
              {kpi.perMonth && (
                <span className="text-sm font-medium text-muted">/mo</span>
              )}
            </p>
            <p className="text-xs text-muted mt-1">{kpi.supporting}</p>
          </div>
        </div>
      ))}
    </div>
  );
}