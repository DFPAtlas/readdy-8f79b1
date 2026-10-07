import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import { useWidgetData } from '@/hooks/useWidgetData';
import { getCommercialHealth, type CommercialHealthRow } from '@/services/dashboard.service';
import { useCurrency } from '@/hooks/useCurrency';
import { WidgetError, WidgetEmpty, WidgetLoading } from './WidgetState';

type StatusColor = 'green' | 'amber' | 'blue' | 'red' | 'neutral';

const STATUS_META: Record<string, { label: string; color: StatusColor }> = {
  enquiry: { label: 'Enquiry', color: 'blue' },
  quoting: { label: 'Quoting', color: 'blue' },
  quote_sent: { label: 'Quote sent', color: 'amber' },
  accepted: { label: 'Accepted', color: 'amber' },
  in_progress: { label: 'In progress', color: 'green' },
  on_site: { label: 'On site', color: 'green' },
  on_hold: { label: 'On hold', color: 'amber' },
};

const pillMap: Record<StatusColor, { pill: string; dot: string; bar: string }> = {
  green: { pill: 'bg-status-green-pale text-status-green', dot: 'bg-status-green', bar: 'bg-status-green' },
  amber: { pill: 'bg-status-amber-pale text-status-amber', dot: 'bg-status-amber', bar: 'bg-status-amber' },
  blue: { pill: 'bg-status-blue-pale text-status-blue', dot: 'bg-status-blue', bar: 'bg-status-blue' },
  red: { pill: 'bg-status-red-pale text-status-red', dot: 'bg-status-red', bar: 'bg-status-red' },
  neutral: { pill: 'bg-page text-muted', dot: 'bg-foreground-300', bar: 'bg-foreground-300' },
};

function getStatusMeta(status: string) {
  return (
    STATUS_META[status] || {
      label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      color: 'neutral' as StatusColor,
    }
  );
}

export default function CommercialHealthMatrix() {
  const navigate = useNavigate();
  const { organisation } = useOrg();
  const { formatPence } = useCurrency();
  const { data, loading, error, reload } = useWidgetData<CommercialHealthRow[]>(
    organisation?.id ?? null,
    getCommercialHealth,
  );

  const rows = data ?? [];

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-main">Active Jobs &amp; Commercial Health</h3>
          <p className="text-xs text-muted mt-0.5">
            Completion and open variations across your live portfolio
          </p>
        </div>
        <button
          onClick={() => navigate('/jobs')}
          className="text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1"
        >
          View all
          <i className="ri-arrow-right-line text-sm"></i>
        </button>
      </div>

      {error ? (
        <WidgetError message={error} onRetry={reload} />
      ) : loading && !data ? (
        <WidgetLoading rows={4} />
      ) : rows.length === 0 ? (
        <WidgetEmpty
          icon="ri-briefcase-line"
          text="No jobs yet"
          actionLabel="Create your first job"
          onAction={() => navigate('/jobs/new')}
        />
      ) : (
        <>
          {/* Column headers */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-2.5 border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
            <div className="col-span-4">Job</div>
            <div className="col-span-2 text-right">Gross Margin</div>
            <div className="col-span-3">Completion</div>
            <div className="col-span-2 text-right">Open Variations</div>
            <div className="col-span-1 text-right">Status</div>
          </div>

          <div className="divide-y divide-border">
            {rows.map((row) => {
              const meta = getStatusMeta(row.status);
              const s = pillMap[meta.color];
              return (
                <button
                  key={row.id}
                  onClick={() => navigate(`/jobs/${row.id}`)}
                  className="w-full text-left px-5 py-3.5 hover:bg-page transition-colors grid grid-cols-2 md:grid-cols-12 gap-3 items-center cursor-pointer group"
                >
                  {/* Job */}
                  <div className="col-span-2 md:col-span-4 flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-main truncate">
                        {row.reference} · {row.name}
                      </p>
                    </div>
                  </div>

                  {/* Gross margin — not stored yet, so show a dash rather than a guess */}
                  <div className="hidden md:block md:col-span-2 text-right">
                    <span className="text-sm font-semibold text-muted tabular-nums">—</span>
                  </div>

                  {/* Completion */}
                  <div className="hidden md:flex md:col-span-3 items-center gap-2">
                    <div className="flex-1 h-1.5 bg-page rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.bar} transition-all duration-500`}
                        style={{ width: `${row.completionPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-main tabular-nums w-8 text-right">
                      {row.completionPct}%
                    </span>
                  </div>

                  {/* Open variations */}
                  <div className="hidden md:block md:col-span-2 text-right">
                    <span className="text-sm text-muted tabular-nums">
                      {row.openVariationsPence > 0
                        ? formatPence(row.openVariationsPence, { maximumFractionDigits: 0 })
                        : '—'}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="hidden md:flex md:col-span-1 justify-end">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${s.pill}`}
                    >
                      {meta.label}
                    </span>
                  </div>

                  {/* Mobile compact line */}
                  <div className="md:hidden col-span-2 flex items-center justify-between text-xs text-muted mt-1">
                    <span>
                      {row.completionPct}% ·{' '}
                      {row.openVariationsPence > 0
                        ? `${formatPence(row.openVariationsPence, { maximumFractionDigits: 0 })} open`
                        : 'no open variations'}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.pill}`}>
                      {meta.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}