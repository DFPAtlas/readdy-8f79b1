import { hubKpis } from '@/mocks/clientHub';

const accentIcon: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  slate: 'bg-slate-100 text-slate-600',
  amber: 'bg-amber-50 text-amber-600',
};

const accentValue: Record<string, string> = {
  indigo: 'text-indigo-600',
  emerald: 'text-emerald-600',
  slate: 'text-slate-900',
  amber: 'text-amber-600',
};

export default function HubKpiBar() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {hubKpis.map((kpi) => (
        <div
          key={kpi.key}
          className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className={`w-9 h-9 flex items-center justify-center rounded-xl ${accentIcon[kpi.accent]}`}>
              <i className={`${kpi.icon} text-lg`}></i>
            </span>
            {kpi.progress !== undefined && (
              <span className="text-xs font-semibold text-emerald-600">{kpi.progress}%</span>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{kpi.label}</p>
            <p className={`text-xl font-bold mt-1 whitespace-nowrap ${accentValue[kpi.accent]}`}>{kpi.value}</p>
          </div>

          <p className="text-xs text-slate-500">{kpi.sub}</p>

          {kpi.progress !== undefined && (
            <div className="mt-auto">
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${kpi.progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}