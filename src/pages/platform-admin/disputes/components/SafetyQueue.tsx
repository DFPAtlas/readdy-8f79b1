import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { disputeAdminService } from '@/services/dispute-admin.service';
import type { SafetyReport } from '@/types/dispute-admin';
import { SAFETY_REPORT_CATEGORY_LABELS, SAFETY_REPORT_STATUS_LABELS } from '@/types/dispute-admin';

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-800 text-slate-300',
  normal: 'bg-sky-500/10 text-sky-400',
  high: 'bg-amber-500/10 text-amber-400',
  urgent: 'bg-red-500/10 text-red-400',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-500/10 text-red-400',
  in_review: 'bg-amber-500/10 text-amber-400',
  restricted: 'bg-violet-500/10 text-violet-400',
  no_action: 'bg-slate-800 text-slate-400',
  resolved: 'bg-emerald-500/10 text-emerald-400',
};

export default function SafetyQueue() {
  const [items, setItems] = useState<SafetyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<SafetyReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    disputeAdminService
      .listSafetyQueue()
      .then((d) => {
        if (active) setItems(d.items);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load safety queue');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = statusFilter === 'all' ? items : items.filter((i) => i.status === statusFilter);

  const applyDecision = async (report: SafetyReport, status: string, decision?: string) => {
    setBusy(true);
    setActionMsg(null);
    try {
      const result = await disputeAdminService.reviewSafetyReport(report.id, status, decision, decision || undefined);
      setActionMsg(result.message);
      setItems((prev) => prev.map((i) => (i.id === report.id ? { ...i, status: status as SafetyReport['status'], decision: decision ?? i.decision } : i)));
      setSelected(null);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {['all', 'open', 'in_review', 'restricted', 'no_action', 'resolved'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              statusFilter === s ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            {s === 'all' ? 'All' : SAFETY_REPORT_STATUS_LABELS[s as keyof typeof SAFETY_REPORT_STATUS_LABELS]}
          </button>
        ))}
      </div>

      {actionMsg && <p className="text-emerald-400 text-xs">{actionMsg}</p>}

      <div className="space-y-3">
        {filtered.map((report) => (
          <button
            key={report.id}
            onClick={() => setSelected(report)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-left hover:border-slate-700 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLORS[report.priority]}`}>{report.priority}</span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[report.status]}`}>{SAFETY_REPORT_STATUS_LABELS[report.status]}</span>
                  <span className="text-slate-400 text-xs">{SAFETY_REPORT_CATEGORY_LABELS[report.report_category]}</span>
                </div>
                <p className="text-white text-sm font-medium mt-2">{report.case_reference}</p>
                <p className="text-slate-400 text-xs mt-1 line-clamp-2">{report.description || 'No description'}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-slate-500 text-[11px]">Reported by</p>
                <p className="text-slate-300 text-xs">{report.reporting_name || '—'}</p>
              </div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && <p className="text-slate-500 text-sm text-center py-8">No safety reports.</p>}
      </div>

      {selected && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSelected(null)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-slate-900 border-l border-slate-800 z-50 overflow-auto">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Safety report</h2>
                <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer">
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-1">Category</p>
                  <p className="text-white text-sm">{SAFETY_REPORT_CATEGORY_LABELS[selected.report_category]}</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-1">Case</p>
                  <Link to={`/platform-admin/disputes/${selected.dispute_id}`} className="text-amber-400 text-sm font-mono hover:underline">
                    {selected.case_reference}
                  </Link>
                </div>
                {selected.description && (
                  <div className="bg-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 text-xs uppercase mb-1">Description</p>
                    <p className="text-slate-300 text-sm">{selected.description}</p>
                  </div>
                )}
                {selected.target_type && (
                  <div className="bg-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 text-xs uppercase mb-1">Target record</p>
                    <p className="text-white text-sm font-mono">{selected.target_type} · {selected.target_id}</p>
                  </div>
                )}
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase mb-1">Reported by</p>
                  <p className="text-white text-sm">{selected.reporting_name || '—'}</p>
                </div>
              </div>

              <p className="text-slate-500 text-xs">
                Restricting content preserves the original record and its audit history. It never deletes formal evidence.
              </p>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-800">
                <button
                  disabled={busy}
                  onClick={() => applyDecision(selected, 'in_review')}
                  className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-sm hover:bg-amber-500/20 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  Start review
                </button>
                <button
                  disabled={busy}
                  onClick={() => applyDecision(selected, 'restricted', 'Content restricted pending further review')}
                  className="px-4 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl text-sm hover:bg-violet-500/20 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  Restrict content
                </button>
                <button
                  disabled={busy}
                  onClick={() => applyDecision(selected, 'no_action', 'No further action required')}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  No action
                </button>
                <button
                  disabled={busy}
                  onClick={() => applyDecision(selected, 'resolved', 'Safety review resolved')}
                  className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm hover:bg-emerald-500/20 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  Resolve
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}