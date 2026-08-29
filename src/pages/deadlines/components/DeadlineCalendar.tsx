import { useMemo, useState } from 'react';
import { deadlineTypeMeta, deadlineStatusMeta, type StatutoryDeadline } from '@/mocks/deadlines';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DeadlineCalendarProps {
  deadlines: StatutoryDeadline[];
  onAction: (id: string) => void;
}

function toKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function DeadlineCalendar({ deadlines, onAction }: DeadlineCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(toKey(today));

  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startWeekday = (first.getDay() + 6) % 7; // Monday = 0
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
    return cells;
  }, [year, month]);

  const deadlinesByDay = useMemo(() => {
    const map: Record<string, StatutoryDeadline[]> = {};
    deadlines.forEach((d) => {
      const key = toKey(new Date(d.due_at));
      if (!map[key]) map[key] = [];
      map[key].push(d);
    });
    return map;
  }, [deadlines]);

  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const selectedDeadlines = selectedKey ? deadlinesByDay[selectedKey] || [] : [];

  const severityDot = (list: StatutoryDeadline[]): string => {
    if (list.some((d) => d.status === 'overdue')) return 'bg-status-red';
    if (list.some((d) => d.status === 'due_soon')) return 'bg-status-amber';
    return 'bg-status-blue';
  };

  const shiftMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Month grid */}
      <div className="lg:col-span-2 bg-white border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-main">{monthLabel}</h3>
          <div className="flex items-center gap-1">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted hover:text-main hover:bg-page transition-colors cursor-pointer"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
            >
              <i className="ri-arrow-left-s-line"></i>
            </button>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted hover:text-main hover:bg-page transition-colors cursor-pointer"
              onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }}
              aria-label="Today"
            >
              <i className="ri-calendar-line text-sm"></i>
            </button>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted hover:text-main hover:bg-page transition-colors cursor-pointer"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
            >
              <i className="ri-arrow-right-s-line"></i>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-[10px] font-semibold text-muted uppercase tracking-wider py-1">{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} />;
            const key = toKey(date);
            const dayDeadlines = deadlinesByDay[key] || [];
            const isSelected = selectedKey === key;
            const isToday = key === toKey(today);

            return (
              <button
                key={key}
                onClick={() => setSelectedKey(key)}
                className={`relative aspect-square rounded-lg text-sm flex flex-col items-center justify-center transition-colors cursor-pointer ${
                  isSelected ? 'bg-primary-500 text-white' : isToday ? 'bg-primary-50 text-primary-700' : 'text-main hover:bg-page'
                }`}
              >
                <span className="font-medium">{date.getDate()}</span>
                {dayDeadlines.length > 0 && (
                  <span className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : severityDot(dayDeadlines)}`} />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border text-[11px] text-muted">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-red"></span>Overdue</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-amber"></span>Due soon</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-blue"></span>Upcoming</span>
        </div>
      </div>

      {/* Selected day detail */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <h3 className="text-base font-semibold text-main mb-1">
          {selectedKey ? new Date(selectedKey + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Select a day'}
        </h3>
        <p className="text-xs text-muted mb-4">{selectedDeadlines.length} deadline{selectedDeadlines.length === 1 ? '' : 's'}</p>

        {selectedDeadlines.length === 0 ? (
          <div className="text-center py-8">
            <i className="ri-calendar-todo-line text-2xl text-muted"></i>
            <p className="text-sm text-muted mt-2">Nothing due on this day.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedDeadlines.map((d) => {
              const typeMeta = deadlineTypeMeta[d.deadline_type];
              const statusMeta = deadlineStatusMeta[d.status];
              return (
                <div key={d.id} className="border border-border rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-main">{typeMeta.label}</span>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${statusMeta.chip}`}>{statusMeta.label}</span>
                  </div>
                  <p className="text-[11px] text-muted">{d.job_reference} · {d.job_name}</p>
                  <button
                    className="mt-2 text-[11px] font-semibold text-primary-500 hover:text-primary-600 cursor-pointer"
                    onClick={() => onAction(d.id)}
                  >
                    Mark actioned
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}