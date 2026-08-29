import type {
  DisputeDeadline,
  DisputeDeadlineSummary,
  DisputeDeadlineStatus,
} from '@/types/dispute-notifications';
import {
  DISPUTE_DEADLINE_TYPE_LABELS,
  DISPUTE_DEADLINE_STATUS_LABELS,
  DISPUTE_DEADLINE_ACTOR_LABELS,
} from '@/types/dispute-notifications';

interface DeadlinesPanelProps {
  caseReference: string;
  deadlines: DisputeDeadline[];
  summary: DisputeDeadlineSummary;
  currentUserId: string | null;
}

const STATUS_BADGE: Record<DisputeDeadlineStatus, string> = {
  scheduled: 'bg-page text-muted',
  due_soon: 'bg-status-amber-pale text-status-amber',
  due_today: 'bg-status-amber-pale text-status-amber',
  overdue: 'bg-status-red-pale text-status-red',
  completed: 'bg-status-green-pale text-status-green',
  cancelled: 'bg-page text-muted',
  superseded: 'bg-page text-muted',
};

function formatDueAt(dueAt: string): string {
  return new Date(dueAt).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function actorLabel(deadline: DisputeDeadline, currentUserId: string | null): string {
  if (!deadline.actor_user_id) return 'Both parties to review';
  if (deadline.actor_user_id === currentUserId) return 'You';
  if (deadline.actor_name) return deadline.actor_name;
  return deadline.actor_role === 'claimant' ? 'Claimant' : 'Respondent';
}

export default function DeadlinesPanel({
  caseReference,
  deadlines,
  summary,
  currentUserId,
}: DeadlinesPanelProps) {
  const active = deadlines.filter((d) =>
    ['scheduled', 'due_soon', 'due_today', 'overdue'].includes(d.status),
  );
  const completed = deadlines.filter((d) =>
    ['completed', 'cancelled', 'superseded'].includes(d.status),
  );
  const next = summary.nextDeadline;

  return (
    <section className="bg-white border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
          <i className="ri-calendar-check-line"></i>
        </span>
        <h2 className="text-base font-semibold text-main">Deadlines &amp; actions</h2>
        <span className="ml-auto text-xs text-muted">{summary.openCount} open</span>
      </div>

      {/* Next deadline highlight */}
      {next ? (
        <div
          className={`mt-4 rounded-xl border p-4 ${
            next.overdue
              ? 'border-status-red/30 bg-status-red-pale'
              : 'border-border bg-page'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted uppercase tracking-wide">
                {next.overdue ? 'Overdue' : 'Next deadline'}
              </p>
              <h3 className="mt-1 text-sm font-semibold text-main">{next.title}</h3>
              <p className="mt-0.5 text-xs text-muted">{DISPUTE_DEADLINE_TYPE_LABELS[next.deadline_type]}</p>
            </div>
            {next.overdue ? (
              <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium text-status-red">
                <i className="ri-alert-line"></i> Overdue
              </span>
            ) : (
              <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium text-status-amber">
                <i className="ri-time-line"></i> {next.time_remaining ?? '—'}
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-muted">
              Action needed from <span className="text-main font-medium">{actorLabel(next, currentUserId)}</span>
            </span>
            <span className="text-xs text-muted">Due {formatDueAt(next.due_at)}</span>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">No open deadlines for this case.</p>
      )}

      {/* Open deadlines */}
      {active.length > 0 && (
        <div className="mt-4 space-y-2">
          {active.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-border bg-white px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-main">{d.title}</span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[d.status]}`}>
                    {DISPUTE_DEADLINE_STATUS_LABELS[d.status]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {actorLabel(d, currentUserId)} &middot; due {formatDueAt(d.due_at)}
                </p>
              </div>
              {!d.overdue && d.time_remaining && (
                <span className="flex-shrink-0 text-xs text-muted whitespace-nowrap">
                  {d.time_remaining}
                </span>
              )}
              {d.overdue && (
                <span className="flex-shrink-0 text-xs text-status-red font-medium whitespace-nowrap">
                  Overdue
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completed deadlines */}
      {completed.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
            Completed ({completed.length})
          </p>
          <div className="space-y-1.5">
            {completed.map((d) => (
              <div key={d.id} className="flex items-center gap-2.5 text-sm">
                <i className="ri-check-line text-status-green"></i>
                <span className="text-muted">{d.title}</span>
                <span className="ml-auto text-xs text-muted">{formatDueAt(d.due_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-[11px] text-muted leading-relaxed border-t border-border pt-3">
        These are BuildNerve platform targets to help you keep the case moving. They are separate from
        any court or statutory deadlines, which you should verify independently. A missed deadline does
        not automatically decide liability or close a dispute.
      </p>
    </section>
  );
}