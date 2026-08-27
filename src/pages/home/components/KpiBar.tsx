import { useNavigate } from 'react-router-dom';
import { executiveKpis, formatGBP, type KpiTone } from '@/mocks/commandCenter';
import { useToast } from '@/components/base/Toast';

const toneMap: Record<KpiTone, { iconWrap: string; accentText: string }> = {
  primary: { iconWrap: 'bg-primary-100 text-primary-500', accentText: 'text-primary-600' },
  blue: { iconWrap: 'bg-status-blue-pale text-status-blue', accentText: 'text-status-blue' },
  green: { iconWrap: 'bg-status-green-pale text-status-green', accentText: 'text-status-green' },
  amber: { iconWrap: 'bg-status-amber-pale text-status-amber', accentText: 'text-status-amber' },
};

export default function KpiBar() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Portfolio value */}
      {executiveKpis.map((kpi) => {
        const tone = toneMap[kpi.tone];
        return (
          <div key={kpi.id} className="bg-white border border-border rounded-xl p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <span className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${tone.iconWrap}`}>
                <i className={`${kpi.icon} text-lg`}></i>
              </span>

              {kpi.change && (
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
                    kpi.changePositive
                      ? 'bg-status-green-pale text-status-green'
                      : 'bg-status-amber-pale text-status-amber'
                  }`}
                >
                  {kpi.change}
                </span>
              )}

              {kpi.badge && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap bg-status-green-pale text-status-green">
                  <i className={`${kpi.badge.icon} text-xs`}></i>
                  {kpi.badge.label}
                </span>
              )}
            </div>

            <p className="text-sm text-muted font-medium mt-4">{kpi.label}</p>

            {kpi.value !== undefined ? (
              <p className="text-2xl font-bold text-main tabular-nums mt-1">
                {kpi.isMoney ? formatGBP(kpi.value) : kpi.value}
              </p>
            ) : (
              <p className="text-xl font-bold text-main mt-1">{kpi.supporting}</p>
            )}

            {kpi.value !== undefined && <p className="text-xs text-muted mt-1">{kpi.supporting}</p>}

            {kpi.trend && (
              <div className="flex items-end gap-[3px] h-8 mt-3">
                {kpi.trend.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-[2px] bg-status-green/60"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            )}

            {kpi.link && (
              <button
                onClick={() => {
                  showToast('Opening Cash Flow Forecast...', 'info');
                  navigate('/reports/cash-flow');
                }}
                className={`mt-3 self-start text-xs font-semibold ${tone.accentText} hover:underline whitespace-nowrap cursor-pointer flex items-center gap-1`}
              >
                {kpi.link}
                <i className="ri-arrow-right-line text-xs"></i>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}