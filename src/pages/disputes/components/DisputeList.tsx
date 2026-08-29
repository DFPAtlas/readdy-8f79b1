import type { DisputeListItem } from '@/types/disputes';
import { DISPUTE_CATEGORY_LABELS, DISPUTE_STATUS_LABELS, DISPUTE_STAGE_LABELS, getDisputeRoleLabel } from '@/types/disputes';
import { formatPence, formatDate, daysUntil, statusTone } from '@/pages/disputes/helpers';

interface DisputeListProps {
  items: DisputeListItem[];
  totalCount: number;
  filtered: boolean;
  actionRequiredFilter: boolean;
  onOpen: (id: string) => void;
  onClearFilters: () => void;
  onRaise: () => void;
}

function DeadlineCell({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-xs text-muted">—</span>;
  const days = daysUntil(iso);
  if (days === null) return <span className="text-xs text-muted">{formatDate(iso)}</span>;
  if (days < 0) {
    return <span className="text-xs font-medium text-status-red">Overdue by {Math.abs(days)}d</span>;
  }
  if (days === 0) return <span className="text-xs font-medium text-status-amber">Due today</span>;
  return (
    <span className="text-xs text-main">
      {days}d <span className="text-muted">({formatDate(iso)})</span>
    </span>
  );
}

export default function DisputeList({
  items,
  totalCount,
  filtered,
  actionRequiredFilter,
  onOpen,
  onClearFilters,
  onRaise,
}: DisputeListProps) {
  // ── Empty states ─────────────────────────────────────────────────────────
  if (items.length === 0) {
    if (totalCount === 0) {
      return (
        <div className="text-center py-16 px-6 bg-white border border-border rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
            <i className="ri-scales-3-line text-2xl text-primary-500"></i>
          </div>
          <h3 className="text-base font-semibold text-main">No disputes yet</h3>
          <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
            If something on a project isn&apos;t going to plan, you can raise a neutral issue here to start a clear, recorded conversation.
          </p>
          <button
            type="button"
            onClick={onRaise}
            className="mt-5 h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 mx-auto"
          >
            <i className="ri-add-line"></i>
            Raise an issue
          </button>
        </div>
      );
    }

    if (actionRequiredFilter) {
      return (
        <div className="text-center py-16 px-6 bg-white border border-border rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-status-green-pale flex items-center justify-center mx-auto mb-4">
            <i className="ri-check-double-line text-2xl text-status-green"></i>
          </div>
          <h3 className="text-base font-semibold text-main">No action currently required</h3>
          <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
            You&apos;re all caught up — none of your disputes are waiting on you right now.
          </p>
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-5 h-10 px-5 border border-border bg-white hover:bg-page text-main text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            Clear filters
          </button>
        </div>
      );
    }

    return (
      <div className="text-center py-16 px-6 bg-white border border-border rounded-2xl">
        <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
          <i className="ri-search-line text-2xl text-muted"></i>
        </div>
        <h3 className="text-base font-semibold text-main">No matching disputes</h3>
        <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
          Try adjusting your search or filters to find what you&apos;re looking for.
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-5 h-10 px-5 border border-border bg-white hover:bg-page text-main text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden lg:block bg-white border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-page/50">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Case</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Project</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Other party</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Issue</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Amount</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Stage</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Next action</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Response due</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted uppercase tracking-wider">Last activity</th>
                <th className="w-10 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((d) => {
                const tone = statusTone(d.status);
                return (
                  <tr
                    key={d.id}
                    onClick={() => onOpen(d.id)}
                    className="hover:bg-page/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold text-primary-600 whitespace-nowrap">{d.case_reference}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-main">{d.project_name ?? '—'}</span>
                      {d.project_reference && (
                        <span className="block text-[11px] text-muted">{d.project_reference}</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-main">{d.other_party_name ?? 'Other party'}</span>
                      <span className="block text-[11px] text-muted">{getDisputeRoleLabel(d.other_party_role)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-main">{DISPUTE_CATEGORY_LABELS[d.dispute_category] ?? d.dispute_category}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-semibold text-main whitespace-nowrap">{formatPence(d.amount_disputed_pence, d.currency)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-main">{DISPUTE_STAGE_LABELS[d.current_stage] ?? d.current_stage}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${tone.bg} ${tone.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`}></span>
                        {DISPUTE_STATUS_LABELS[d.status] ?? d.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs ${d.action_required ? 'font-semibold text-status-amber' : 'text-muted'}`}>
                        {d.action_required && <i className="ri-alert-line mr-1"></i>}
                        {d.next_action ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <DeadlineCell iso={d.response_due_at} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-muted whitespace-nowrap">{formatDate(d.last_activity_at)}</span>
                    </td>
                    <td className="px-3 py-4">
                      <i className="ri-arrow-right-s-line text-muted opacity-0 group-hover:opacity-100 transition-opacity"></i>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-3">
        {items.map((d) => {
          const tone = statusTone(d.status);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onOpen(d.id)}
              className="w-full text-left bg-white border border-border rounded-xl p-4 cursor-pointer hover:border-primary-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-primary-600">{d.case_reference}</span>
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${tone.bg} ${tone.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`}></span>
                  {DISPUTE_STATUS_LABELS[d.status] ?? d.status}
                </span>
              </div>
              <p className="text-sm font-medium text-main mt-2">{d.title}</p>
              <p className="text-xs text-muted mt-0.5">
                {d.project_name ?? '—'} · {DISPUTE_CATEGORY_LABELS[d.dispute_category] ?? d.dispute_category}
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <div>
                  <span className="block text-[11px] text-muted">Other party</span>
                  <span className="text-xs text-main">{d.other_party_name ?? '—'}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[11px] text-muted">Amount</span>
                  <span className="text-xs font-semibold text-main">{formatPence(d.amount_disputed_pence, d.currency)}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[11px] text-muted">Due</span>
                  <DeadlineCell iso={d.response_due_at} />
                </div>
              </div>
              {d.action_required && (
                <p className="mt-3 text-xs font-semibold text-status-amber flex items-center gap-1">
                  <i className="ri-alert-line"></i>
                  {d.next_action}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {filtered && (
        <p className="text-xs text-muted">
          Showing {items.length} of {totalCount} dispute{totalCount === 1 ? '' : 's'}
        </p>
      )}
    </>
  );
}