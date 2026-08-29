import type { Dispute, DisputeClarification, DisputePartyView } from '@/types/disputes';
import { DISPUTE_CLARIFICATION_STATUS_LABELS } from '@/types/disputes';
import { formatDate, formatDateTime, daysUntil } from '@/pages/disputes/helpers';

interface ClarificationsPanelProps {
  dispute: Dispute;
  clarifications: DisputeClarification[];
  parties: DisputePartyView[];
}

export default function ClarificationsPanel({ dispute, clarifications, parties }: ClarificationsPanelProps) {
  const nameByUser = new Map<string, string>();
  parties.forEach((p) => {
    nameByUser.set(p.user_id, p.profile_name ?? p.display_name_snapshot ?? 'Party');
  });

  const roleFor = (userId: string | null): string => {
    if (!userId) return '';
    if (userId === dispute.claimant_user_id) return 'Claimant';
    if (userId === dispute.respondent_user_id) return 'Respondent';
    return '';
  };

  const sorted = [...clarifications].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  if (sorted.length === 0) return null;

  return (
    <section className="bg-white border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-main">Clarification requests</h2>
        <span className="text-xs text-muted">{sorted.length} {sorted.length === 1 ? 'request' : 'requests'}</span>
      </div>

      <div className="mt-4 space-y-3">
        {sorted.map((c) => {
          const isOpen = c.status === 'open';
          const days = daysUntil(c.response_due_at);
          const overdue = isOpen && days !== null && days < 0;
          const requesterName = nameByUser.get(c.requested_by_user_id ?? '') ?? 'Party';

          return (
            <div key={c.id} className={`rounded-xl border p-4 ${isOpen ? 'border-border bg-page/40' : 'border-border bg-page/20 opacity-80'}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${isOpen ? 'bg-status-amber-pale text-status-amber' : 'bg-status-green-pale text-status-green'}`}>
                    {DISPUTE_CLARIFICATION_STATUS_LABELS[c.status] ?? c.status}
                  </span>
                  <p className="text-xs text-muted mt-1.5">
                    Requested by <span className="text-main font-medium">{requesterName}</span>
                    {roleFor(c.requested_by_user_id) && <span> ({roleFor(c.requested_by_user_id)})</span>}
                    {' '}· {formatDateTime(c.created_at)}
                  </p>
                </div>
                {isOpen && (
                  <span className={`text-[11px] font-medium ${overdue ? 'text-status-red' : 'text-muted'}`}>
                    {overdue ? `Overdue by ${Math.abs(days!)}d` : days !== null ? `Due in ${days}d` : `Due ${formatDate(c.response_due_at)}`}
                  </span>
                )}
              </div>

              <p className="text-sm font-semibold text-main mt-3">{c.point}</p>
              <p className="text-sm text-muted mt-1">{c.relevance}</p>

              {c.response && (
                <div className="mt-3 rounded-lg bg-page p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Answer</p>
                  <p className="text-sm text-main mt-1 whitespace-pre-wrap">{c.response}</p>
                  {c.answered_at && (
                    <p className="text-[11px] text-muted mt-1.5">
                      Answered by {nameByUser.get(c.answered_by_user_id ?? '') ?? 'Party'} · {formatDateTime(c.answered_at)}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}