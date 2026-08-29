import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Dispute, DisputePartyView } from '@/types/disputes';
import {
  DISPUTE_EVIDENCE_CATEGORIES,
  DISPUTE_EVIDENCE_CATEGORY_LABELS,
  DISPUTE_EVIDENCE_SOURCE_LABELS,
  DISPUTE_EVIDENCE_STATUS_LABELS,
  type DisputeEvidence,
} from '@/types/disputes';
import { disputeEvidenceService, type EvidenceListResponse } from '@/services/dispute-evidence.service';
import { formatDate, formatFileSize } from '@/pages/disputes/helpers';
import AddEvidenceModal from '@/pages/disputes/detail/components/AddEvidenceModal';
import EvidenceDetailModal from '@/pages/disputes/detail/components/EvidenceDetailModal';

interface EvidencePanelProps {
  dispute: Dispute;
  parties: DisputePartyView[];
  myRole: 'claimant' | 'respondent' | null;
  onViewProject: () => void;
}

type StatusFilter = 'all' | 'active' | 'pending_validation' | 'withdrawn';

export default function EvidencePanel({ dispute, parties, myRole, onViewProject }: EvidencePanelProps) {
  const [data, setData] = useState<EvidenceListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [submittedBy, setSubmittedBy] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await disputeEvidenceService.list(dispute.id);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load evidence');
    } finally {
      setLoading(false);
    }
  }, [dispute.id]);

  useEffect(() => {
    load();
  }, [load]);

  const nameByUser = useMemo(() => {
    const map = new Map<string, string>();
    parties.forEach((p) => map.set(p.user_id, p.profile_name ?? p.display_name_snapshot ?? 'Party'));
    return map;
  }, [parties]);

  const items = data?.items ?? [];

  const submitterOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((it) => {
      if (!map.has(it.submitted_by_user_id)) {
        map.set(it.submitted_by_user_id, it.submitted_by_name ?? 'Party');
      }
    });
    return Array.from(map.entries());
  }, [items]);

  const filtered = useMemo(() => {
    let result = [...items];
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      result = result.filter(
        (it) =>
          it.title.toLowerCase().includes(s) ||
          it.evidence_reference.toLowerCase().includes(s) ||
          (it.description ?? '').toLowerCase().includes(s) ||
          (it.original_filename ?? '').toLowerCase().includes(s),
      );
    }
    if (category !== 'all') result = result.filter((it) => it.evidence_category === category);
    if (submittedBy !== 'all') result = result.filter((it) => it.submitted_by_user_id === submittedBy);
    if (statusFilter === 'active') result = result.filter((it) => it.submission_status !== 'withdrawn');
    if (statusFilter === 'pending_validation') result = result.filter((it) => it.submission_status === 'pending_validation');
    if (statusFilter === 'withdrawn') result = result.filter((it) => it.submission_status === 'withdrawn');
    if (dateFrom) result = result.filter((it) => (it.event_date ?? it.submitted_at.slice(0, 10)) >= dateFrom);
    return result;
  }, [items, search, category, submittedBy, statusFilter, dateFrom]);

  const canSubmit = myRole === 'claimant' || myRole === 'respondent';

  if (loading) {
    return (
      <div className="py-16 text-center">
        <i className="ri-loader-4-line text-2xl text-primary-500 animate-spin"></i>
        <p className="text-sm text-muted mt-3">Loading evidence…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-status-red-pale flex items-center justify-center mx-auto mb-3">
          <i className="ri-error-warning-line text-xl text-status-red"></i>
        </div>
        <p className="text-sm text-muted">{error}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
        >
          Try again
        </button>
      </div>
    );
  }

  const counts = data?.counts ?? { total: 0, active: 0, pendingValidation: 0, withdrawn: 0 };

  return (
    <section className="bg-white border border-border rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-main">Evidence library</h2>
            <span className="text-xs font-semibold text-muted bg-page px-2 py-0.5 rounded-full">{counts.total}</span>
          </div>
          <p className="text-xs text-muted mt-1">
            Evidence is shared with the other party and becomes part of the permanent case record.
          </p>
        </div>
        {canSubmit && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="h-10 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 flex-shrink-0"
          >
            <i className="ri-add-line text-lg"></i>
            Add evidence
          </button>
        )}
      </div>

      {/* Summary strip */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl bg-page/60 px-3 py-2">
          <p className="text-lg font-bold text-main">{counts.active}</p>
          <p className="text-[11px] text-muted">Active evidence</p>
        </div>
        <div className="rounded-xl bg-page/60 px-3 py-2">
          <p className="text-lg font-bold text-main">{counts.pendingValidation}</p>
          <p className="text-[11px] text-muted">Pending validation</p>
        </div>
        <div className="rounded-xl bg-page/60 px-3 py-2">
          <p className="text-lg font-bold text-main">{counts.withdrawn}</p>
          <p className="text-[11px] text-muted">Withdrawn</p>
        </div>
        <div className="rounded-xl bg-page/60 px-3 py-2">
          <p className="text-lg font-bold text-main">{items.filter((i) => i.file_hash).length}</p>
          <p className="text-[11px] text-muted">Files with integrity hash</p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <div className="sm:col-span-2 relative">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reference, title or filename"
            className="w-full h-10 pl-9 pr-3 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300"
          />
        </div>
        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm text-main appearance-none focus:outline-none focus:border-primary-300 pr-8 cursor-pointer"
          >
            <option value="all">All categories</option>
            {DISPUTE_EVIDENCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{DISPUTE_EVIDENCE_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"></i>
        </div>
        <div className="relative">
          <select
            value={submittedBy}
            onChange={(e) => setSubmittedBy(e.target.value)}
            className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm text-main appearance-none focus:outline-none focus:border-primary-300 pr-8 cursor-pointer"
          >
            <option value="all">All submitters</option>
            {submitterOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"></i>
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm text-main appearance-none focus:outline-none focus:border-primary-300 pr-8 cursor-pointer"
          >
            <option value="all">All states</option>
            <option value="active">Active</option>
            <option value="pending_validation">Pending validation</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
          <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"></i>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <label className="text-xs text-muted flex items-center gap-2">
          Event date from
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 px-2.5 bg-page border border-border rounded-lg text-sm text-main focus:outline-none focus:border-primary-300"
          />
        </label>
        {dateFrom && (
          <button
            type="button"
            onClick={() => setDateFrom('')}
            className="text-xs text-status-red hover:underline cursor-pointer"
          >
            Clear date
          </button>
        )}
      </div>

      {/* Empty states */}
      {filtered.length === 0 ? (
        <div className="mt-6 py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-page flex items-center justify-center mx-auto mb-3">
            <i className="ri-folder-open-line text-2xl text-muted"></i>
          </div>
          {items.length === 0 ? (
            <>
              <h3 className="text-sm font-semibold text-main">No evidence yet</h3>
              <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
                Add contract documents, photos, messages or other records that support your position.
              </p>
              {canSubmit && (
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="mt-4 h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  Add your first item
                </button>
              )}
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-main">No matching evidence</h3>
              <p className="text-sm text-muted mt-1">Try adjusting your search or filters.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategory('all');
                  setSubmittedBy('all');
                  setStatusFilter('all');
                  setDateFrom('');
                }}
                className="mt-4 h-9 px-4 border border-border text-main text-sm font-medium rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
              >
                Reset filters
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-5 hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted border-b border-border">
                  <th className="pb-2 font-medium">Reference</th>
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Submitted by</th>
                  <th className="pb-2 font-medium">Event date</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">State</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => (
                  <tr
                    key={it.id}
                    className={`border-b border-border last:border-0 hover:bg-page/40 cursor-pointer transition-colors ${it.submission_status === 'withdrawn' ? 'opacity-60' : ''}`}
                    onClick={() => setDetailId(it.id)}
                  >
                    <td className="py-3 pr-3 font-medium text-primary-700 whitespace-nowrap">{it.evidence_reference}</td>
                    <td className="py-3 pr-3 max-w-[280px]">
                      <p className="text-main font-medium truncate">{it.title}</p>
                      {it.superseded_by_id && (
                        <p className="text-[10px] text-status-amber flex items-center gap-1 mt-0.5">
                          <i className="ri-refresh-line"></i>Superseded
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-muted whitespace-nowrap">
                      {DISPUTE_EVIDENCE_CATEGORY_LABELS[it.evidence_category] ?? it.evidence_category}
                    </td>
                    <td className="py-3 pr-3 text-muted whitespace-nowrap">{it.submitted_by_name ?? 'Party'}</td>
                    <td className="py-3 pr-3 text-muted whitespace-nowrap">{formatDate(it.event_date ?? it.submitted_at)}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      <span className="text-[11px] text-muted bg-page px-2 py-0.5 rounded-full">
                        {it.mime_type ? it.mime_type.split('/')[0] : DISPUTE_EVIDENCE_SOURCE_LABELS[it.source_type]}
                      </span>
                    </td>
                    <td className="py-3">
                      <StatusPill status={it.submission_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-5 md:hidden space-y-2">
            {filtered.map((it) => (
              <div
                key={it.id}
                className={`rounded-xl border border-border p-3.5 cursor-pointer hover:bg-page/40 transition-colors ${it.submission_status === 'withdrawn' ? 'opacity-60' : ''}`}
                onClick={() => setDetailId(it.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-primary-700">{it.evidence_reference}</p>
                    <p className="text-sm font-medium text-main truncate mt-0.5">{it.title}</p>
                  </div>
                  <StatusPill status={it.submission_status} />
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-2 text-[11px] text-muted">
                  <span>{DISPUTE_EVIDENCE_CATEGORY_LABELS[it.evidence_category] ?? it.evidence_category}</span>
                  <span>·</span>
                  <span>{it.submitted_by_name ?? 'Party'}</span>
                  <span>·</span>
                  <span>{formatDate(it.event_date ?? it.submitted_at)}</span>
                  {it.file_size != null && (
                    <>
                      <span>·</span>
                      <span>{formatFileSize(it.file_size)}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <AddEvidenceModal
        open={addOpen}
        dispute={dispute}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          load();
        }}
      />

      <EvidenceDetailModal
        evidenceId={detailId}
        dispute={dispute}
        nameByUser={nameByUser}
        myRole={myRole}
        onClose={() => setDetailId(null)}
        onChanged={load}
        onViewProject={onViewProject}
      />
    </section>
  );
}

function StatusPill({ status }: { status: DisputeEvidence['submission_status'] }) {
  const tone =
    status === 'validated'
      ? 'bg-status-green-pale text-status-green'
      : status === 'withdrawn'
        ? 'bg-page text-muted'
        : 'bg-status-amber-pale text-status-amber';
  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${tone}`}>
      {DISPUTE_EVIDENCE_STATUS_LABELS[status]}
    </span>
  );
}