import { useEffect, useMemo, useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { deadlinesService } from '@/services/deadlines.service';
import { demoDeadlines, deadlineTypeMeta, deadlineTypeOptions, deadlineStatusMeta, computeStatus, type StatutoryDeadline, type DeadlineStatus, type DeadlineType } from '@/mocks/deadlines';
import DeadlineList from './components/DeadlineList';
import DeadlineCalendar from './components/DeadlineCalendar';

type ViewMode = 'list' | 'calendar';

export default function DeadlinesPage() {
  const { organisation } = useOrg();
  const [deadlines, setDeadlines] = useState<StatutoryDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('list');
  const [typeFilter, setTypeFilter] = useState<DeadlineType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DeadlineStatus | 'all'>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      let rows: StatutoryDeadline[] = [];
      if (organisation?.id) {
        rows = await deadlinesService.getByOrganisation(organisation.id);
      }
      if (active) {
        setDeadlines(rows.length > 0 ? rows : demoDeadlines);
        setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [organisation?.id]);

  const jobs = useMemo(() => {
    const set = new Map<string, string>();
    deadlines.forEach((d) => set.set(d.job_id, `${d.job_reference} · ${d.job_name}`));
    return Array.from(set.entries());
  }, [deadlines]);

  const filtered = useMemo(() => {
    return deadlines.filter((d) => {
      if (typeFilter !== 'all' && d.deadline_type !== typeFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (jobFilter !== 'all' && d.job_id !== jobFilter) return false;
      return true;
    });
  }, [deadlines, typeFilter, statusFilter, jobFilter]);

  const summary = useMemo(() => {
    const active = deadlines.filter((d) => d.status !== 'actioned' && d.status !== 'expired');
    return {
      dueNext7Days: active.filter((d) => d.status === 'due_soon' || d.status === 'overdue').length,
      overdue: active.filter((d) => d.status === 'overdue').length,
      dueSoon: active.filter((d) => d.status === 'due_soon').length,
      total: active.length,
    };
  }, [deadlines]);

  const handleAction = async (id: string) => {
    await deadlinesService.markActioned(id);
    setDeadlines((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'actioned' as DeadlineStatus } : d)));
  };

  const filterSelectClass = 'h-9 px-3 bg-white border border-border rounded-lg text-sm text-main outline-none cursor-pointer';

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted uppercase tracking-wider">Statutory compliance</p>
          <h1 className="text-xl md:text-2xl font-bold text-main mt-1">Deadlines &amp; Notice Calendar</h1>
          <p className="text-sm text-muted mt-1">
            Every Construction Act notice window, payment deadline and retention release — so none is ever missed.
          </p>
        </div>
        <div className="flex items-center bg-page rounded-full p-1 w-fit">
          {(['list', 'calendar'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                view === v ? 'bg-white text-main' : 'text-muted hover:text-main'
              }`}
            >
              <i className={`${v === 'list' ? 'ri-list-check-3' : 'ri-calendar-2-line'} text-sm`}></i>
              {v === 'list' ? 'List' : 'Calendar'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Due in 7 days', value: summary.dueNext7Days, icon: 'ri-calendar-2-line', tone: 'bg-primary-50 text-primary-500' },
          { label: 'Overdue', value: summary.overdue, icon: 'ri-alert-line', tone: 'bg-status-red-pale text-status-red' },
          { label: 'Due soon', value: summary.dueSoon, icon: 'ri-time-line', tone: 'bg-status-amber-pale text-status-amber' },
          { label: 'Active deadlines', value: summary.total, icon: 'ri-timer-line', tone: 'bg-status-blue-pale text-status-blue' },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${c.tone}`}>
              <i className={`${c.icon} text-lg`}></i>
            </div>
            <div>
              <p className="text-2xl font-bold text-main tabular-nums leading-none">{c.value}</p>
              <p className="text-xs text-muted mt-1">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-border rounded-xl p-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider px-1">Filter</span>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as DeadlineType | 'all')} className={filterSelectClass}>
          <option value="all">All notice types</option>
          {deadlineTypeOptions.map((t) => (
            <option key={t} value={t}>{deadlineTypeMeta[t].label}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as DeadlineStatus | 'all')} className={filterSelectClass}>
          <option value="all">All statuses</option>
          {(Object.keys(deadlineStatusMeta) as DeadlineStatus[]).map((s) => (
            <option key={s} value={s}>{deadlineStatusMeta[s].label}</option>
          ))}
        </select>
        <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className={filterSelectClass}>
          <option value="all">All jobs</option>
          {jobs.map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <span className="text-xs text-muted ml-auto">{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <i className="ri-loader-4-line animate-spin text-2xl text-muted"></i>
        </div>
      ) : view === 'list' ? (
        <DeadlineList deadlines={filtered} onAction={handleAction} />
      ) : (
        <DeadlineCalendar deadlines={filtered} onAction={handleAction} />
      )}
    </div>
  );
}