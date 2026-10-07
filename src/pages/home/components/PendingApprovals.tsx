import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import { useWidgetData } from '@/hooks/useWidgetData';
import { getPendingApprovals, type PendingApprovalItem } from '@/services/dashboard.service';
import { useCurrency } from '@/hooks/useCurrency';
import { WidgetError, WidgetEmpty, WidgetLoading } from './WidgetState';

type Tone = 'red' | 'amber' | 'purple';

const toneMap: Record<Tone, { border: string; dot: string; badgeBg: string; badgeText: string; actionBg: string; actionText: string }> = {
  red: {
    border: 'border-l-status-red',
    dot: 'bg-status-red',
    badgeBg: 'bg-status-red-pale',
    badgeText: 'text-status-red',
    actionBg: 'bg-status-red-pale hover:bg-[#FAD5D5]',
    actionText: 'text-status-red',
  },
  amber: {
    border: 'border-l-status-amber',
    dot: 'bg-status-amber',
    badgeBg: 'bg-status-amber-pale',
    badgeText: 'text-status-amber',
    actionBg: 'bg-status-amber-pale hover:bg-[#FDE8CC]',
    actionText: 'text-status-amber',
  },
  purple: {
    border: 'border-l-status-purple',
    dot: 'bg-status-purple',
    badgeBg: 'bg-status-purple-pale',
    badgeText: 'text-status-purple',
    actionBg: 'bg-status-purple-pale hover:bg-[#E6DFF2]',
    actionText: 'text-status-purple',
  },
};

function toneFor(kind: PendingApprovalItem['kind']): Tone {
  return kind === 'requisition' ? 'purple' : 'amber';
}

export default function PendingApprovals() {
  const navigate = useNavigate();
  const { organisation } = useOrg();
  const { formatPence } = useCurrency();
  const { data, loading, error, reload } = useWidgetData<PendingApprovalItem[]>(
    organisation?.id ?? null,
    getPendingApprovals,
  );

  const items = data ?? [];

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-main">Action Needed — Pending Approvals</h3>
          <p className="text-xs text-muted mt-0.5">
            Variations awaiting a response and procurement sign-offs requiring a decision
          </p>
        </div>
        {!error && !loading && (
          <span className="text-[11px] font-medium text-muted bg-page px-2.5 py-1 rounded-full whitespace-nowrap">
            {items.length} open
          </span>
        )}
      </div>

      {error ? (
        <WidgetError message={error} onRetry={reload} />
      ) : loading && !data ? (
        <WidgetLoading rows={2} />
      ) : items.length === 0 ? (
        <WidgetEmpty icon="ri-checkbox-circle-line" text="Nothing waiting for you" />
      ) : (
        <div className="divide-y divide-border">
          {items.map((item) => {
            const c = toneMap[toneFor(item.kind)];
            const subtitle =
              item.amountPence !== null
                ? `${item.jobLabel} · ${formatPence(item.amountPence, { maximumFractionDigits: 0 })}`
                : item.jobLabel;
            return (
              <div
                key={item.id}
                className={`px-5 py-4 border-l-[3px] ${c.border} flex flex-col sm:flex-row sm:items-center gap-3`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className={`w-2 h-2 rounded-full ${c.dot} mt-1.5 flex-shrink-0`} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-main">{item.title}</p>
                    <p className="text-xs text-muted mt-1">{subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 sm:pl-3">
                  <button
                    onClick={() => navigate(item.route)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${c.actionBg} ${c.actionText}`}
                  >
                    {item.kind === 'variation' ? 'Review variation' : 'Review requisition'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}