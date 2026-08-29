import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { disputeLaunchService } from '@/services/dispute-launch.service';
import type { ReadinessResult, ReadinessCheck, ReadinessStatus, ManualGate } from '@/types/dispute-launch';

const STATUS_META: Record<ReadinessStatus, { label: string; cls: string; icon: string }> = {
  pass: { label: 'PASS', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: 'ri-check-line' },
  fail: { label: 'FAIL', cls: 'bg-red-500/15 text-red-400 border-red-500/30', icon: 'ri-close-line' },
  manual: { label: 'MANUAL REVIEW', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: 'ri-eye-line' },
  not_configured: { label: 'NOT CONFIGURED', cls: 'bg-slate-700/40 text-slate-300 border-slate-600/50', icon: 'ri-question-line' },
};

const GROUP_META: Record<string, { label: string; icon: string; description: string }> = {
  critical_security: { label: 'Critical security checks', icon: 'ri-shield-check-line', description: 'Authentication, row-level security, storage privacy, cross-case isolation, admin permissions, append-only integrity, export privacy and secret exposure.' },
  critical_functional: { label: 'Critical functional checks', icon: 'ri-function-line', description: 'Dispute creation, response, evidence, negotiation, deadlines, pre-action documents, evidence export and notifications.' },
  legal_governance: { label: 'Legal and governance checks', icon: 'ri-scales-3-line', description: 'Disclaimer coverage, jurisdiction handling, official-source links, guidance review dates, admin audit, retention policy and solicitor review.' },
};

function StatusBadge({ status }: { status: ReadinessStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${m.cls}`}>
      <i className={`${m.icon} text-xs`}></i>
      {m.label}
    </span>
  );
}

function CheckRow({ check }: { check: ReadinessCheck }) {
  return (
    <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/60">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-amber-400 flex-shrink-0">
            <i className="ri-file-check-line text-base"></i>
          </span>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium">{check.title}</p>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">{check.evidence}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {check.blocking ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 whitespace-nowrap">Blocking</span>
          ) : (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap">Non-blocking</span>
          )}
          <StatusBadge status={check.status} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <i className={`${check.automated ? 'ri-cpu-line text-emerald-400' : 'ri-user-line text-amber-400'}`}></i>
          {check.automated ? 'Automated' : 'Manual'}
        </span>
        {check.status !== 'pass' && (
          <span className="text-slate-400">
            <i className="ri-tools-line mr-1"></i>
            {check.remediation}
          </span>
        )}
      </div>
    </div>
  );
}

function GateRow({ gate, canApprove, note, onNote, onApprove, busy }: {
  gate: ManualGate;
  canApprove: boolean;
  note: string;
  onNote: (v: string) => void;
  onApprove: () => void;
  busy: boolean;
}) {
  return (
    <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/60">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-amber-400 flex-shrink-0">
            <i className="ri-git-commit-line text-base"></i>
          </span>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium">{gate.label}</p>
            {gate.approved ? (
              <p className="text-emerald-400 text-xs mt-1">
                Approved by {gate.approved_by_name || 'a staff member'}
                {gate.approved_at ? ` on ${new Date(gate.approved_at).toLocaleDateString('en-GB')}` : ''}
                {gate.note ? ` — ${gate.note}` : ''}
              </p>
            ) : (
              <p className="text-amber-400/80 text-xs mt-1">
                Requires approval by a qualified person before launch.
              </p>
            )}
          </div>
        </div>
        {gate.approved ? (
          <StatusBadge status="pass" />
        ) : canApprove ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <input
              type="text"
              value={note}
              onChange={(e) => onNote(e.target.value)}
              placeholder="Approval note (optional)"
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500/50 w-48"
            />
            <button
              onClick={onApprove}
              disabled={busy}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              Approve
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-slate-500 whitespace-nowrap">
            <i className="ri-lock-line mr-1"></i>Requires elevated permission
          </span>
        )}
      </div>
    </div>
  );
}

export default function PlatformDisputesLaunchReadiness() {
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    disputeLaunchService
      .getReadiness()
      .then(setResult)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load readiness'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (gateKey: string) => {
    setSubmitting(gateKey);
    try {
      await disputeLaunchService.recordGateApproval(gateKey, notes[gateKey] || undefined);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to record approval');
    } finally {
      setSubmitting(null);
    }
  };

  const groups = useMemo(() => {
    if (!result) return [];
    const order = ['critical_security', 'critical_functional', 'legal_governance'];
    return order
      .map((g) => ({ key: g, checks: result.checks.filter((c) => c.group === g) }))
      .filter((g) => g.checks.length > 0);
  }, [result]);

  const counts = useMemo(() => {
    const c = { pass: 0, fail: 0, manual: 0, not_configured: 0 };
    (result?.checks || []).forEach((ch) => { c[ch.status] += 1; });
    return c;
  }, [result]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <i className="ri-lock-line text-xl text-red-400"></i>
          </div>
          <h1 className="text-white font-bold text-lg mt-4">Launch readiness unavailable</h1>
          <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">{error || 'You do not have permission to view launch readiness.'}</p>
          <p className="text-slate-500 text-xs mt-4">This page requires an active platform-staff role with the disputes_view_summary permission.</p>
          <button onClick={load} className="mt-4 px-4 py-2 rounded-lg text-xs font-medium bg-amber-500 text-slate-950 hover:bg-amber-400 whitespace-nowrap cursor-pointer">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const verdictCls =
    result.verdict === 'GO' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
      : result.verdict === 'NO_GO' ? 'border-red-500/40 bg-red-500/10 text-red-300'
        : 'border-amber-500/40 bg-amber-500/10 text-amber-300';

  const verdictLabel = result.verdict === 'GO' ? 'GO' : result.verdict === 'NO_GO' ? 'NO-GO' : 'CONDITIONAL GO';

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Dispute System Launch Readiness</h1>
          <p className="text-slate-400 text-sm mt-1">
            Evidence-based security, functional and legal-governance checks. Manual items are not marked pass without real evidence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/platform-admin/disputes" className="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 border border-slate-800 hover:border-slate-700 transition-colors whitespace-nowrap">
            <i className="ri-arrow-left-line mr-1.5"></i>Disputes admin
          </Link>
          <button onClick={load} className="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 border border-slate-800 hover:border-slate-700 transition-colors whitespace-nowrap cursor-pointer">
            <i className="ri-refresh-line mr-1.5"></i>Re-run checks
          </button>
        </div>
      </div>

      {/* Verdict */}
      <div className={`border rounded-xl p-5 ${verdictCls}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-xl font-bold">{verdictLabel === 'GO' ? '✓' : verdictLabel === 'NO-GO' ? '✕' : '!'}</span>
            <div>
              <p className="text-2xl font-bold leading-none">{verdictLabel}</p>
              <p className="text-xs mt-1 opacity-80">
                Last checked {new Date(result.generated_at).toLocaleString('en-GB')} · {counts.pass} pass · {counts.fail} fail · {counts.manual} manual · {counts.not_configured} not configured
              </p>
            </div>
          </div>
        </div>

        {result.controlling.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-2">What controls this result</p>
            <div className="flex flex-wrap gap-2">
              {result.controlling.map((c) => (
                <span key={c} className="px-2 py-1 rounded-full bg-white/10 text-xs font-mono">{c}</span>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs mt-4 opacity-80">
          GO requires all critical automated checks to pass and every manual gate to be approved. A security, privacy, access or integrity failure produces NO-GO. Remaining non-blocking items produce CONDITIONAL GO.
        </p>
      </div>

      {/* Checks */}
      {groups.map((g) => {
        const meta = GROUP_META[g.key];
        return (
          <section key={g.key}>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 text-amber-400">
                <i className={`${meta.icon} text-lg`}></i>
              </span>
              <div>
                <h2 className="text-white font-semibold">{meta.label}</h2>
                <p className="text-slate-500 text-xs">{meta.description}</p>
              </div>
            </div>
            <div className="space-y-2">
              {g.checks.map((c) => (
                <CheckRow key={c.id} check={c} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Manual gates */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 text-amber-400">
            <i className="ri-user-star-line text-lg"></i>
          </span>
          <div>
            <h2 className="text-white font-semibold">Manual launch gates</h2>
            <p className="text-slate-500 text-xs">These remain MANUAL REVIEW until a qualified person records approval. They are never auto-marked as passed.</p>
          </div>
        </div>
        <div className="space-y-2">
          {result.gates.map((g) => (
            <GateRow
              key={g.gate_key}
              gate={g}
              canApprove={g.legal ? result.canApproveLegal : result.canApproveOperational}
              note={notes[g.gate_key] || ''}
              onNote={(v) => setNotes((prev) => ({ ...prev, [g.gate_key]: v }))}
              onApprove={() => approve(g.gate_key)}
              busy={submitting === g.gate_key}
            />
          ))}
        </div>
      </section>
    </div>
  );
}