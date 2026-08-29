import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { disputeAdminService } from '@/services/dispute-admin.service';
import type { DisputeAdminIdentity, AdminCaseOverview } from '@/types/dispute-admin';
import {
  DISPUTE_STATUS_LABELS,
  DISPUTE_CATEGORY_LABELS,
  DISPUTE_RELATIONSHIP_LABELS,
} from '@/types/disputes';

const ACTIVE_STATUSES = ['open', 'awaiting_response', 'under_discussion', 'evidence_collection', 'negotiation', 'mediation_considered', 'pre_action'];

export default function PlatformDisputeCasePage() {
  const { disputeId } = useParams<{ disputeId: string }>();

  const [identity, setIdentity] = useState<DisputeAdminIdentity | null>(null);
  const [reason, setReason] = useState('');
  const [reasonNeeded, setReasonNeeded] = useState(true);
  const [overview, setOverview] = useState<AdminCaseOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState('overview');

  const [previewReason, setPreviewReason] = useState('');
  const [previewTarget, setPreviewTarget] = useState<{ id: string; title: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMsg, setPreviewMsg] = useState<string | null>(null);

  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    disputeAdminService
      .getMyPermissions()
      .then((id) => {
        if (active) setIdentity(id);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Access denied');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const canViewCase = identity?.has('disputes_view_case') ?? false;
  const canSupport = identity?.has('disputes_support') ?? false;
  const canSafety = identity?.has('disputes_manage_safety') ?? false;
  const canDeadlines = identity?.has('disputes_manage_deadlines') ?? false;

  const openCase = async () => {
    if (!reason.trim() || !disputeId) return;
    setLoading(true);
    setError(null);
    try {
      const o = await disputeAdminService.getCaseOverview(disputeId, reason.trim());
      setOverview(o);
      setReasonNeeded(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to open case');
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (fn: () => Promise<{ message: string }>) => {
    setBusy(true);
    setActionMsg(null);
    try {
      const r = await fn();
      setActionMsg(r.message);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const doPreview = async () => {
    if (!previewTarget || !previewReason.trim()) return;
    setBusy(true);
    setPreviewMsg(null);
    try {
      const r = await disputeAdminService.getEvidencePreview(previewTarget.id, previewReason.trim());
      setPreviewUrl(r.signedUrl);
      setPreviewMsg(r.signedUrl ? 'Preview URL generated (1-hour expiry).' : 'No file to preview (text note or no stored file).');
    } catch (e) {
      setPreviewMsg(e instanceof Error ? e.message : 'Preview failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !overview) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <Link to="/platform-admin/disputes" className="text-amber-400 text-sm mt-4 inline-block hover:underline">Back to disputes</Link>
        </div>
      </div>
    );
  }

  if (reasonNeeded || !overview) {
    return (
      <div className="p-6">
        <div className="max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h1 className="text-white font-bold text-lg">Open case for review</h1>
          <p className="text-slate-400 text-sm">
            Opening a dispute case requires a documented support or compliance reason. This is recorded in the access audit.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Reason for accessing this case..."
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={openCase}
              disabled={!reason.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              Continue
            </button>
            <Link to="/platform-admin/disputes" className="px-4 py-2 bg-slate-800 text-slate-300 text-sm rounded-xl hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap">
              Cancel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const d = overview.dispute;

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'parties', label: 'Parties' },
    { id: 'claims', label: 'Claims & responses' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'negotiation', label: 'Negotiation' },
    { id: 'deadlines', label: 'Deadlines' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'exports', label: 'Exports' },
    { id: 'notes', label: 'Notes' },
    { id: 'safety', label: 'Safety' },
    { id: 'audit', label: 'Audit' },
  ];

  const statusLabel = DISPUTE_STATUS_LABELS[d.status as keyof typeof DISPUTE_STATUS_LABELS] ?? d.status;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <Link to="/platform-admin/disputes" className="text-slate-400 text-xs hover:text-slate-200">
          <i className="ri-arrow-left-line mr-1"></i>Dispute administration
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
          <div>
            <h1 className="text-white font-bold text-lg font-mono">{d.case_reference}</h1>
            <p className="text-slate-300 text-sm mt-1">{d.title}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{statusLabel}</span>
            {d.safety_flag && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                <i className="ri-flag-line mr-1"></i>Safety flag
              </span>
            )}
          </div>
        </div>
        <p className="text-slate-500 text-xs mt-2">
          {DISPUTE_CATEGORY_LABELS[d.dispute_category as keyof typeof DISPUTE_CATEGORY_LABELS]} · {DISPUTE_RELATIONSHIP_LABELS[d.relationship_type as keyof typeof DISPUTE_RELATIONSHIP_LABELS]} · {d.jurisdiction.replace('_', ' ')}
          {overview.project ? ` · ${overview.project.project_name}` : ''}
        </p>
      </div>

      {actionMsg && <p className="text-emerald-400 text-xs">{actionMsg}</p>}

      {/* Admin actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h2 className="text-white text-sm font-semibold">Allowed support actions</h2>
        <div className="flex flex-wrap gap-2">
          {canSupport && (
            <button
              disabled={busy}
              onClick={() => runAction(() => disputeAdminService.correctStatus(d.id, 'under_discussion', 'Operational status corrected by support'))}
              className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              Correct status
            </button>
          )}
          {canSupport && (
            <button
              disabled={busy}
              onClick={() => runAction(() => disputeAdminService.addAdminNote(d.id, 'internal', 'Internal procedural note.'))}
              className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              Add internal note
            </button>
          )}
          {canSafety && d.safety_flag && (
            <button
              disabled={busy}
              onClick={() => runAction(() => disputeAdminService.recordExternalOutcome(d.id, 'External outcome recorded by support'))}
              className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              Record external outcome
            </button>
          )}
          <p className="text-slate-500 text-[11px] w-full">
            Every action records before/after values, actor identity, timestamp and an audit entry. Administrators cannot rewrite party claims, alter evidence, accept settlements or decide liability.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-full p-1 w-fit overflow-x-auto max-w-full">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setTab(s.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              tab === s.id ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        {tab === 'overview' && (
          <OverviewSection overview={overview} />
        )}
        {tab === 'parties' && (
          <div className="space-y-2">
            {overview.parties.map((p) => (
              <div key={p.id} className="bg-slate-800 rounded-lg p-3">
                <p className="text-white text-sm font-medium">{p.display_name_snapshot || p.business_name_snapshot || '—'} <span className="text-slate-500">({p.party_role})</span></p>
                <p className="text-slate-400 text-xs mt-1">{p.email_snapshot || 'No email'} · access: {p.access_status}</p>
              </div>
            ))}
          </div>
        )}
        {tab === 'claims' && (
          <div className="space-y-2">
            {overview.claims.map((c) => (
              <div key={c.id} className="bg-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="text-white text-sm font-medium">{c.claim_type} · {c.submitted_by_name || '—'} ({c.submitted_by_role || 'unknown'})</p>
                  <span className="text-slate-500 text-[11px]">{c.status}</span>
                </div>
                {c.statement && <p className="text-slate-300 text-xs mt-1 whitespace-pre-wrap">{c.statement}</p>}
                {c.amount_pence != null && <p className="text-amber-400 text-xs mt-1">£{(c.amount_pence / 100).toFixed(2)}</p>}
              </div>
            ))}
            {overview.claims.length === 0 && <p className="text-slate-500 text-sm">No claims.</p>}
          </div>
        )}
        {tab === 'evidence' && (
          <div className="space-y-2">
            {overview.evidence.map((e) => (
              <div key={e.id} className="bg-slate-800 rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-white text-sm font-medium">{e.evidence_reference} · {e.title}</p>
                  <p className="text-slate-400 text-xs mt-1">{e.evidence_category} · {e.submission_status} · by {e.submitted_by_name || '—'}</p>
                </div>
                {canSafety && (
                  <button
                    onClick={() => setPreviewTarget({ id: e.id, title: e.title })}
                    className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-600 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Preview
                  </button>
                )}
              </div>
            ))}
            {overview.evidence.length === 0 && <p className="text-slate-500 text-sm">No evidence.</p>}
            {!canSafety && <p className="text-slate-500 text-xs">Evidence preview requires an elevated permission.</p>}
          </div>
        )}
        {tab === 'timeline' && (
          <TimelineList overview={overview} />
        )}
        {tab === 'negotiation' && (
          <div className="space-y-2">
            {overview.negotiations.map((o) => (
              <div key={o.id} className="bg-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="text-white text-sm font-medium">{o.offer_type} · {o.offered_by_name || '—'}</p>
                  <span className="text-slate-500 text-[11px]">{o.status}</span>
                </div>
                <p className="text-slate-300 text-xs mt-1">{o.summary}</p>
              </div>
            ))}
            {overview.negotiations.length === 0 && <p className="text-slate-500 text-sm">No negotiation records.</p>}
          </div>
        )}
        {tab === 'deadlines' && (
          <div className="space-y-2">
            {overview.deadlines.map((dl) => (
              <div key={dl.id} className="bg-slate-800 rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-white text-sm font-medium">{dl.title}</p>
                  <p className="text-slate-400 text-xs mt-1">{dl.deadline_type} · due {new Date(dl.due_at).toLocaleDateString('en-GB')} · {dl.actor_name || '—'}</p>
                </div>
                <span className="text-slate-500 text-[11px]">{dl.status}</span>
              </div>
            ))}
            {overview.deadlines.length === 0 && <p className="text-slate-500 text-sm">No deadlines.</p>}
            {!canDeadlines && <p className="text-slate-500 text-xs">Extending a deadline requires the manage-deadlines permission.</p>}
          </div>
        )}
        {tab === 'notifications' && (
          <div className="space-y-2">
            {overview.notifications.map((n) => (
              <div key={n.id} className="bg-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="text-white text-sm font-medium">{n.notification_type}</p>
                  <span className={`text-[11px] ${n.status === 'failed' || n.status === 'permanent_failure' ? 'text-red-400' : 'text-slate-500'}`}>{n.status}</span>
                </div>
                <p className="text-slate-400 text-xs mt-1">{n.recipient_email || '—'}{n.last_error ? ` · ${n.last_error}` : ''}</p>
              </div>
            ))}
            {overview.notifications.length === 0 && <p className="text-slate-500 text-sm">No notification records.</p>}
          </div>
        )}
        {tab === 'exports' && (
          <div className="space-y-2">
            {overview.exports.map((x) => (
              <div key={x.id} className="bg-slate-800 rounded-lg p-3">
                <p className="text-white text-sm font-medium">Pack v{x.version} · {x.perspective}</p>
                <p className="text-slate-400 text-xs mt-1">{x.purpose} · {x.status}</p>
              </div>
            ))}
            {overview.exports.length === 0 && <p className="text-slate-500 text-sm">No exports.</p>}
          </div>
        )}
        {tab === 'notes' && (
          <div className="space-y-2">
            {overview.notes.map((n) => (
              <div key={n.id} className={`rounded-lg p-3 ${n.note_scope === 'internal' ? 'bg-violet-500/5 border border-violet-500/20' : 'bg-slate-800'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-medium ${n.note_scope === 'internal' ? 'text-violet-400' : 'text-slate-500'}`}>
                    {n.note_scope === 'internal' ? 'INTERNAL (restricted)' : 'Shared procedural'}
                  </span>
                  <span className="text-slate-500 text-[11px]">{n.author_name || '—'}</span>
                </div>
                <p className="text-slate-300 text-xs mt-1">{n.body}</p>
              </div>
            ))}
            {overview.notes.length === 0 && <p className="text-slate-500 text-sm">No notes.</p>}
            <p className="text-slate-500 text-[11px]">Internal notes never appear in party views, evidence packs, letters or notifications.</p>
          </div>
        )}
        {tab === 'safety' && (
          <div className="space-y-2">
            {overview.safetyReports.map((s) => (
              <div key={s.id} className="bg-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="text-white text-sm font-medium">{s.report_category}</p>
                  <span className="text-slate-500 text-[11px]">{s.priority} · {s.status}</span>
                </div>
                <p className="text-slate-400 text-xs mt-1">{s.description || '—'} · by {s.reporting_name || '—'}</p>
              </div>
            ))}
            {overview.restrictions.map((r) => (
              <div key={r.id} className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-xs font-medium">{r.status}: {r.target_type} {r.target_id}</p>
                <p className="text-slate-400 text-xs mt-1">{r.reason}</p>
              </div>
            ))}
            {overview.safetyReports.length === 0 && overview.restrictions.length === 0 && (
              <p className="text-slate-500 text-sm">No safety reports or restrictions.</p>
            )}
          </div>
        )}
        {tab === 'audit' && (
          <div className="space-y-2">
            {overview.auditTrail.map((a) => (
              <div key={a.id} className="bg-slate-800 rounded-lg p-3">
                <p className="text-white text-xs font-medium font-mono">{a.action}</p>
                <p className="text-slate-500 text-[11px] mt-1">{a.target_type || '—'} · {new Date(a.created_at).toLocaleString('en-GB')}</p>
              </div>
            ))}
            {overview.auditTrail.length === 0 && <p className="text-slate-500 text-sm">No audit entries.</p>}
          </div>
        )}
      </div>

      {/* Evidence preview modal */}
      {previewTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => { setPreviewTarget(null); setPreviewUrl(null); setPreviewMsg(null); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
              <h2 className="text-white font-bold">Preview evidence</h2>
              <p className="text-slate-400 text-xs">{previewTarget.title}</p>
              <textarea
                value={previewReason}
                onChange={(e) => setPreviewReason(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Reason for previewing this evidence (audited)..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
              />
              {previewMsg && <p className="text-amber-400 text-xs">{previewMsg}</p>}
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noreferrer nofollow" className="text-amber-400 text-sm hover:underline break-all">
                  Open file (signed, 1-hour)
                </a>
              )}
              <div className="flex gap-3">
                <button
                  onClick={doPreview}
                  disabled={busy || !previewReason.trim()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  Preview
                </button>
                <button onClick={() => { setPreviewTarget(null); setPreviewUrl(null); setPreviewMsg(null); }} className="px-4 py-2 bg-slate-800 text-slate-300 text-sm rounded-xl hover:bg-slate-700 cursor-pointer whitespace-nowrap">
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OverviewSection({ overview }: { overview: AdminCaseOverview }) {
  const d = overview.dispute;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Info label="Status" value={DISPUTE_STATUS_LABELS[d.status as keyof typeof DISPUTE_STATUS_LABELS] ?? d.status} />
      <Info label="Stage" value={d.current_stage} />
      <Info label="Opened" value={d.opened_at ? new Date(d.opened_at).toLocaleDateString('en-GB') : '—'} />
      <Info label="Response due" value={d.response_due_at ? new Date(d.response_due_at).toLocaleDateString('en-GB') : '—'} />
      <Info label="Amount disputed" value={d.amount_disputed_pence != null ? `£${(d.amount_disputed_pence / 100).toFixed(2)}` : '—'} />
      <Info label="Support owner" value={d.support_owner_name || 'Unassigned'} />
      <div className="sm:col-span-2 bg-slate-800 rounded-lg p-3">
        <p className="text-slate-400 text-xs uppercase mb-1">Summary</p>
        <p className="text-slate-300 text-sm">{d.summary || '—'}</p>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-3">
      <p className="text-slate-400 text-xs uppercase mb-1">{label}</p>
      <p className="text-white text-sm">{value}</p>
    </div>
  );
}

function TimelineList({ overview }: { overview: AdminCaseOverview }) {
  return (
    <div className="space-y-2">
      {overview.timeline.map((ev) => (
        <div key={ev.id} className="bg-slate-800 rounded-lg p-3">
          <p className="text-white text-sm font-medium">{ev.title}</p>
          <p className="text-slate-500 text-[11px] mt-1">{ev.event_type} · {ev.actor_role || 'system'} · {ev.visibility} · {new Date(ev.created_at).toLocaleString('en-GB')}</p>
          {ev.description && <p className="text-slate-300 text-xs mt-1">{ev.description}</p>}
        </div>
      ))}
      {overview.timeline.length === 0 && <p className="text-slate-500 text-sm">No timeline events.</p>}
    </div>
  );
}