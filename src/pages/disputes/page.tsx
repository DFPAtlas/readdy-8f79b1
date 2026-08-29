import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { disputesService } from '@/services/disputes.service';
import type { DisputeListItem } from '@/types/disputes';
import { DISPUTE_STATUS_LABELS, DISPUTE_CATEGORY_LABELS } from '@/types/disputes';
import SummaryCards, { computeSummary } from '@/pages/disputes/components/SummaryCards';
import DisputeFilters, { DEFAULT_FILTERS, type DisputeFilterState } from '@/pages/disputes/components/DisputeFilters';
import DisputeList from '@/pages/disputes/components/DisputeList';

type SummaryKind = 'open' | 'awaiting' | 'negotiation' | 'resolved';

export default function DisputeResolutionCentre() {
  const navigate = useNavigate();
  const [items, setItems] = useState<DisputeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DisputeFilterState>(DEFAULT_FILTERS);
  const [summaryKind, setSummaryKind] = useState<SummaryKind | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await disputesService.listDisputes();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => computeSummary(items), [items]);

  const projectOptions = useMemo(() => {
    const seen = new Map<string, string>();
    items.forEach((d) => {
      if (d.project_id && !seen.has(d.project_id)) {
        seen.set(d.project_id, d.project_name ?? d.project_reference ?? d.project_id);
      }
    });
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [items]);

  const statusOptions = useMemo(
    () => (Object.keys(DISPUTE_STATUS_LABELS) as (keyof typeof DISPUTE_STATUS_LABELS)[]).map((s) => ({ value: s, label: DISPUTE_STATUS_LABELS[s] })),
    [],
  );

  const categoryOptions = useMemo(
    () => (Object.keys(DISPUTE_CATEGORY_LABELS) as (keyof typeof DISPUTE_CATEGORY_LABELS)[]).map((c) => ({ value: c, label: DISPUTE_CATEGORY_LABELS[c] })),
    [],
  );

  const filtered = useMemo(() => {
    let result = [...items];
    const f = filters;
    if (f.search) {
      const s = f.search.toLowerCase();
      result = result.filter(
        (d) =>
          d.case_reference.toLowerCase().includes(s) ||
          (d.project_name ?? '').toLowerCase().includes(s) ||
          (d.project_reference ?? '').toLowerCase().includes(s) ||
          d.title.toLowerCase().includes(s),
      );
    }
    if (f.status) result = result.filter((d) => d.status === f.status);
    if (f.role) result = result.filter((d) => d.my_role === f.role);
    if (f.category) result = result.filter((d) => d.dispute_category === f.category);
    if (f.project) result = result.filter((d) => d.project_id === f.project);
    if (f.actionRequired) result = result.filter((d) => d.action_required);
    if (f.dateOpened) {
      const now = Date.now();
      const dayMs = 1000 * 60 * 60 * 24;
      const limit = f.dateOpened === '30' ? 30 : f.dateOpened === '90' ? 90 : 365;
      result = result.filter((d) => {
        const opened = d.opened_at ? new Date(d.opened_at).getTime() : null;
        if (!opened) return false;
        return now - opened <= limit * dayMs;
      });
    }
    return result;
  }, [items, filters]);

  const hasActiveFilters = Object.values({
    search: filters.search,
    status: filters.status,
    role: filters.role,
    category: filters.category,
    project: filters.project,
    actionRequired: filters.actionRequired,
    dateOpened: filters.dateOpened,
  }).some((v) => (typeof v === 'boolean' ? v : v !== ''));

  const handleSummarySelect = (kind: SummaryKind) => {
    setSummaryKind(kind);
    if (kind === 'awaiting') {
      setFilters({ ...DEFAULT_FILTERS, actionRequired: true });
    } else if (kind === 'open') {
      setFilters({ ...DEFAULT_FILTERS, status: '' });
    } else if (kind === 'negotiation') {
      setFilters({ ...DEFAULT_FILTERS, status: 'negotiation' });
    } else if (kind === 'resolved') {
      setFilters({ ...DEFAULT_FILTERS, status: 'resolved' });
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-main">Dispute Resolution</h1>
          <p className="text-sm text-muted mt-1.5">
            A calm, neutral place to record and work through issues on your projects. BuildNerve keeps a reliable
            history of what happened without deciding who is right.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => navigate('/disputes/legal-guidance')}
            className="h-10 px-4 border border-border bg-white hover:bg-page text-main text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
          >
            <i className="ri-scales-3-line"></i>
            Legal guidance
          </button>
          <button
            type="button"
            onClick={() => navigate('/messages')}
            className="h-10 px-4 border border-border bg-white hover:bg-page text-main text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
          >
            <i className="ri-chat-1-line"></i>
            Project messages
          </button>
          <button
            type="button"
            onClick={() => navigate('/disputes/new')}
            className="h-10 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
          >
            <i className="ri-add-line"></i>
            Raise an issue
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <SummaryCards summary={summary} onSelect={handleSummarySelect} active={summaryKind} />

      {/* Filters */}
      <DisputeFilters
        filters={filters}
        onChange={setFilters}
        statusOptions={statusOptions}
        categoryOptions={categoryOptions}
        projectOptions={projectOptions}
      />

      {/* List / states */}
      {loading ? (
        <div className="py-20 text-center">
          <i className="ri-loader-4-line text-2xl text-primary-500 animate-spin"></i>
          <p className="text-sm text-muted mt-3">Loading your disputes…</p>
        </div>
      ) : error ? (
        <div className="py-16 text-center bg-white border border-border rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-status-red-pale flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-2xl text-status-red"></i>
          </div>
          <h3 className="text-base font-semibold text-main">Couldn&apos;t load your disputes</h3>
          <p className="text-sm text-muted mt-1 max-w-sm mx-auto">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-5 h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            Try again
          </button>
        </div>
      ) : (
        <DisputeList
          items={filtered}
          totalCount={items.length}
          filtered={hasActiveFilters}
          actionRequiredFilter={filters.actionRequired}
          onOpen={(id) => navigate(`/disputes/${id}`)}
          onClearFilters={() => setFilters(DEFAULT_FILTERS)}
          onRaise={() => navigate('/disputes/new')}
        />
      )}
    </div>
  );
}