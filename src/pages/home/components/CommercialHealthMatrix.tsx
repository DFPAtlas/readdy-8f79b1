import { useNavigate } from 'react-router-dom';
import { commercialHealthRows, formatGBP, type JobHealthStatus } from '@/mocks/commandCenter';
import { useToast } from '@/components/base/Toast';

const statusMap: Record<JobHealthStatus, { pill: string; dot: string; bar: string }> = {
  'on-budget': {
    pill: 'bg-status-green-pale text-status-green',
    dot: 'bg-status-green',
    bar: 'bg-status-green',
  },
  'margin-warning': {
    pill: 'bg-status-amber-pale text-status-amber',
    dot: 'bg-status-amber',
    bar: 'bg-status-amber',
  },
  'at-risk': {
    pill: 'bg-status-red-pale text-status-red',
    dot: 'bg-status-red',
    bar: 'bg-status-red',
  },
};

function marginColor(pct: number): string {
  if (pct >= 15) return 'text-status-green';
  if (pct >= 10) return 'text-status-amber';
  return 'text-status-red';
}

export default function CommercialHealthMatrix() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleRowClick = (code: string) => {
    showToast(`Opening job ${code}...`, 'info');
    navigate('/jobs');
  };

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-main">Active Jobs &amp; Commercial Health</h3>
          <p className="text-xs text-muted mt-0.5">Gross margin, completion and open variations across the live portfolio</p>
        </div>
        <button
          onClick={() => navigate('/jobs')}
          className="text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1"
        >
          View all
          <i className="ri-arrow-right-line text-sm"></i>
        </button>
      </div>

      {/* Column headers */}
      <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-2.5 border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
        <div className="col-span-4">Job</div>
        <div className="col-span-2 text-right">Gross Margin</div>
        <div className="col-span-3">Completion</div>
        <div className="col-span-2 text-right">Open Variations</div>
        <div className="col-span-1 text-right">Status</div>
      </div>

      <div className="divide-y divide-border">
        {commercialHealthRows.map((row) => {
          const s = statusMap[row.status];
          return (
            <button
              key={row.id}
              onClick={() => handleRowClick(row.code)}
              className="w-full text-left px-5 py-3.5 hover:bg-page transition-colors grid grid-cols-2 md:grid-cols-12 gap-3 items-center cursor-pointer group"
            >
              {/* Job */}
              <div className="col-span-2 md:col-span-4 flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-main truncate">
                    {row.code} · {row.name}
                  </p>
                </div>
              </div>

              {/* Gross margin */}
              <div className="hidden md:block md:col-span-2 text-right">
                <span className={`text-sm font-semibold tabular-nums ${marginColor(row.grossMarginPct)}`}>
                  {row.grossMarginPct.toFixed(1)}%
                </span>
              </div>

              {/* Completion */}
              <div className="hidden md:flex md:col-span-3 items-center gap-2">
                <div className="flex-1 h-1.5 bg-page rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.bar} transition-all duration-500`}
                    style={{ width: `${row.completionPct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-main tabular-nums w-8 text-right">{row.completionPct}%</span>
              </div>

              {/* Open variations */}
              <div className="hidden md:block md:col-span-2 text-right">
                <span className="text-sm text-muted tabular-nums">
                  {row.openVariations > 0 ? formatGBP(row.openVariations) : '—'}
                </span>
              </div>

              {/* Status */}
              <div className="hidden md:flex md:col-span-1 justify-end">
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${s.pill}`}>
                  {row.statusLabel}
                </span>
              </div>

              {/* Mobile compact line */}
              <div className="md:hidden col-span-2 flex items-center justify-between text-xs text-muted mt-1">
                <span>{row.completionPct}% · {formatGBP(row.openVariations)} open</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.pill}`}>{row.statusLabel}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}