import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import { useWidgetData } from '@/hooks/useWidgetData';
import { deadlinesService, type DeadlineSummary } from '@/services/deadlines.service';
import { WidgetError } from './WidgetState';

export default function DeadlineWidget() {
  const navigate = useNavigate();
  const { organisation } = useOrg();
  const { data, loading, error, reload } = useWidgetData<DeadlineSummary>(
    organisation?.id ?? null,
    (orgId) => deadlinesService.getSummaryCounts(orgId),
  );

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-white">
        <WidgetError message={error} onRetry={reload} />
      </div>
    );
  }

  if (loading && !data) {
    return <div className="rounded-2xl border border-border bg-white h-[72px] animate-pulse" />;
  }

  const counts = data ?? { dueNext7Days: 0, overdue: 0, dueSoon: 0, totalActive: 0 };
  const hasAny = counts.totalActive > 0;

  // Friendly empty state — no deadlines exist yet for this company.
  if (!hasAny) {
    return (
      <div className="rounded-2xl border border-border bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-page text-muted">
          <i className="ri-calendar-2-line text-lg"></i>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-main">No statutory deadlines yet</p>
          <p className="text-xs text-muted mt-0.5">
            They&apos;re added automatically from your jobs.
          </p>
        </div>
        <button
          className="h-9 px-4 bg-white border border-border text-main text-sm font-semibold rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          onClick={() => navigate('/deadlines')}
        >
          Open calendar
          <i className="ri-arrow-right-line text-sm"></i>
        </button>
      </div>
    );
  }

  const urgent = counts.overdue > 0;

  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
        urgent ? 'bg-status-red-pale border-status-red/20' : 'bg-status-amber-pale border-[#F5E0C0]'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          urgent ? 'bg-status-red/15 text-status-red' : 'bg-status-amber/20 text-status-amber'
        }`}
      >
        <i className={`${urgent ? 'ri-alert-line' : 'ri-calendar-2-line'} text-lg`}></i>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-main">
          {counts.dueNext7Days === 0
            ? 'No statutory deadlines in the next 7 days'
            : `${counts.dueNext7Days} statutory deadline${counts.dueNext7Days === 1 ? '' : 's'} due in the next 7 days`}
        </p>
        <p className={`text-xs mt-0.5 ${urgent ? 'text-status-red font-medium' : 'text-muted'}`}>
          {urgent
            ? `${counts.overdue} overdue · ${counts.dueSoon} due soon — act before notice windows lapse`
            : `${counts.dueSoon} due soon across your active jobs`}
        </p>
      </div>
      <button
        className="h-9 px-4 bg-white border border-border text-main text-sm font-semibold rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
        onClick={() => navigate('/deadlines')}
      >
        Open calendar
        <i className="ri-arrow-right-line text-sm"></i>
      </button>
    </div>
  );
}