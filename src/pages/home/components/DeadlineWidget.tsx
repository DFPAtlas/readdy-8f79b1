import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import { deadlinesService } from '@/services/deadlines.service';
import { demoDeadlines, computeStatus } from '@/mocks/deadlines';

interface Counts {
  dueNext7Days: number;
  overdue: number;
  dueSoon: number;
}

function countFrom(list: { due_at: string; status: any }[]): Counts {
  let overdue = 0;
  let dueSoon = 0;
  list.forEach((d) => {
    const s = computeStatus(d.due_at, d.status);
    if (s === 'overdue') overdue += 1;
    else if (s === 'due_soon') dueSoon += 1;
  });
  return { dueNext7Days: overdue + dueSoon, overdue, dueSoon };
}

export default function DeadlineWidget() {
  const navigate = useNavigate();
  const { organisation } = useOrg();
  const demoCounts = useMemo(() => countFrom(demoDeadlines), []);
  const [counts, setCounts] = useState<Counts>(demoCounts);

  useEffect(() => {
    let active = true;
    if (organisation?.id) {
      deadlinesService.getSummaryCounts(organisation.id).then((c) => {
        if (!active) return;
        setCounts(c.totalActive > 0 ? c : demoCounts);
      });
    }
    return () => { active = false; };
  }, [organisation?.id, demoCounts]);

  const urgent = counts.overdue > 0;

  return (
    <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
      urgent ? 'bg-status-red-pale border-status-red/20' : 'bg-status-amber-pale border-[#F5E0C0]'
    }`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${urgent ? 'bg-status-red/15 text-status-red' : 'bg-status-amber/20 text-status-amber'}`}>
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