import { useNavigate } from 'react-router-dom';
import { deadlineTypeMeta, deadlineStatusMeta, type StatutoryDeadline } from '@/mocks/deadlines';

function formatDue(dueAt: string): string {
  return new Date(dueAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(dueAt: string): number {
  const diff = new Date(dueAt).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

interface DeadlineListProps {
  deadlines: StatutoryDeadline[];
  onAction: (id: string) => void;
}

export default function DeadlineList({ deadlines, onAction }: DeadlineListProps) {
  const navigate = useNavigate();

  if (deadlines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-page flex items-center justify-center mb-4">
          <i className="ri-calendar-check-line text-2xl text-muted"></i>
        </div>
        <h3 className="text-base font-semibold text-main">No deadlines match your filters</h3>
        <p className="text-sm text-muted mt-1">Adjust the filters, or your notice calendar is clear.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {deadlines.map((d) => {
        const typeMeta = deadlineTypeMeta[d.deadline_type];
        const statusMeta = deadlineStatusMeta[d.status];
        const days = daysUntil(d.due_at);

        return (
          <div
            key={d.id}
            className="bg-white border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-primary-200 transition-colors"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              typeMeta.tone === 'red' ? 'bg-status-red-pale text-status-red' :
              typeMeta.tone === 'amber' ? 'bg-status-amber-pale text-status-amber' :
              typeMeta.tone === 'green' ? 'bg-primary-50 text-primary-500' :
              'bg-status-blue-pale text-status-blue'
            }`}>
              <i className={`${typeMeta.icon} text-lg`}></i>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-main">{typeMeta.label}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusMeta.chip}`}>{statusMeta.label}</span>
              </div>
              <button
                className="text-xs text-muted hover:text-primary-500 transition-colors cursor-pointer text-left"
                onClick={() => navigate(`/jobs/${d.job_id}`)}
              >
                <span className="font-medium text-primary-600">{d.job_reference}</span> · {d.job_name}
              </button>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
              <div className="text-right">
                <p className="text-sm font-semibold text-main whitespace-nowrap">{formatDue(d.due_at)}</p>
                <p className={`text-[11px] ${d.status === 'overdue' ? 'text-status-red font-semibold' : 'text-muted'}`}>
                  {d.status === 'overdue' ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue` : `in ${days} day${days === 1 ? '' : 's'}`}
                </p>
              </div>
              <button
                className="h-8 px-3 text-xs font-semibold border border-border text-main rounded-lg hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
                onClick={() => onAction(d.id)}
              >
                Mark actioned
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}