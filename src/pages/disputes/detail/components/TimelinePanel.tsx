import type { DisputeEvent } from '@/types/disputes';
import { formatDateTime } from '@/pages/disputes/helpers';

function eventMeta(eventType: string): { icon: string; tone: string } {
  switch (eventType) {
    case 'dispute_drafted':
      return { icon: 'ri-edit-line', tone: 'bg-page text-muted' };
    case 'dispute_submitted':
      return { icon: 'ri-play-circle-line', tone: 'bg-primary-100 text-primary-600' };
    case 'claim_submitted':
      return { icon: 'ri-file-list-3-line', tone: 'bg-primary-100 text-primary-600' };
    case 'party_responded':
      return { icon: 'ri-chat-3-line', tone: 'bg-status-amber-pale text-status-amber' };
    case 'response_submitted':
      return { icon: 'ri-chat-check-line', tone: 'bg-status-amber-pale text-status-amber' };
    case 'counterclaim_submitted':
      return { icon: 'ri-shield-flash-line', tone: 'bg-status-amber-pale text-status-amber' };
    case 'clarification_requested':
      return { icon: 'ri-question-line', tone: 'bg-status-amber-pale text-status-amber' };
    case 'clarification_answered':
      return { icon: 'ri-reply-line', tone: 'bg-status-green-pale text-status-green' };
    case 'claim_corrected':
      return { icon: 'ri-refresh-line', tone: 'bg-status-amber-pale text-status-amber' };
    case 'resolution_requested':
      return { icon: 'ri-hand-coin-line', tone: 'bg-status-green-pale text-status-green' };
    case 'resolution_agreed':
      return { icon: 'ri-check-double-line', tone: 'bg-status-green-pale text-status-green' };
    case 'offer_submitted':
      return { icon: 'ri-hand-coin-line', tone: 'bg-primary-100 text-primary-600' };
    case 'offer_accepted':
      return { icon: 'ri-hand-coin-line', tone: 'bg-status-green-pale text-status-green' };
    case 'offer_rejected':
      return { icon: 'ri-close-circle-line', tone: 'bg-status-red-pale text-status-red' };
    case 'offer_countered':
      return { icon: 'ri-git-branch-line', tone: 'bg-status-amber-pale text-status-amber' };
    case 'offer_withdrawn':
      return { icon: 'ri-close-circle-line', tone: 'bg-page text-muted' };
    case 'obligation_completed':
      return { icon: 'ri-check-line', tone: 'bg-status-amber-pale text-status-amber' };
    case 'obligation_confirmed':
      return { icon: 'ri-check-double-line', tone: 'bg-status-green-pale text-status-green' };
    case 'obligation_disputed':
      return { icon: 'ri-error-warning-line', tone: 'bg-status-red-pale text-status-red' };
    case 'dispute_withdrawn':
      return { icon: 'ri-close-circle-line', tone: 'bg-page text-muted' };
    default:
      return { icon: 'ri-information-line', tone: 'bg-page text-muted' };
  }
}

export default function TimelinePanel({ events }: { events: DisputeEvent[] }) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return (
    <section className="bg-white border border-border rounded-2xl p-5">
      <h2 className="text-base font-semibold text-main">Case timeline</h2>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted mt-3">No events recorded yet.</p>
      ) : (
        <ol className="mt-4 space-y-0 relative">
          {sorted.map((e, i) => {
            const meta = eventMeta(e.event_type);
            const isLast = i === sorted.length - 1;
            return (
              <li key={e.id} className="relative flex gap-3 pb-5">
                {!isLast && (
                  <span className="absolute left-[17px] top-9 bottom-0 w-px bg-border"></span>
                )}
                <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${meta.tone}`}>
                  <i className={`${meta.icon} text-base`}></i>
                </span>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium text-main">{e.title}</p>
                    <span className="text-[11px] text-muted whitespace-nowrap">{formatDateTime(e.created_at)}</span>
                  </div>
                  {e.description && <p className="text-sm text-muted mt-0.5 whitespace-pre-wrap">{e.description}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}