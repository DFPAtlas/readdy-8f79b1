import type { Dispute } from '@/types/disputes';
import { DISPUTE_STATUS_LABELS, DISPUTE_STAGE_LABELS } from '@/types/disputes';
import { formatDate } from '@/pages/disputes/helpers';

function bannerCopy(dispute: Dispute, isRespondent: boolean) {
  const stage = DISPUTE_STAGE_LABELS[dispute.current_stage] ?? dispute.current_stage;
  const status = DISPUTE_STATUS_LABELS[dispute.status] ?? dispute.status;

  if (dispute.status === 'draft') {
    return {
      title: 'This dispute is still a draft',
      who: 'You',
      action: 'review and submit it so the other party can be notified.',
      deadline: null,
    };
  }
  if (dispute.status === 'awaiting_response' || dispute.status === 'open') {
    return {
      title: `Case is ${stage.toLowerCase()}`,
      who: isRespondent ? 'You' : 'The other party',
      action: isRespondent ? 'need to submit your response.' : 'needs to respond to the issue you raised.',
      deadline: dispute.response_due_at,
    };
  }
  if (dispute.status === 'negotiation') {
    return {
      title: 'Case is in negotiation',
      who: 'Both parties',
      action: 'can exchange settlement offers and track agreed obligations to work towards a resolution.',
      deadline: null,
    };
  }
  if (dispute.status === 'under_discussion' || dispute.status === 'mediation_considered') {
    return {
      title: `Case is ${stage.toLowerCase()}`,
      who: 'Both parties',
      action: 'can add clarifications and responses to keep the record moving.',
      deadline: dispute.response_due_at,
    };
  }
  if (dispute.status === 'pre_action') {
    return {
      title: 'This case is approaching pre-action',
      who: 'Both parties',
      action: 'should consider their positions carefully before any formal steps.',
      deadline: dispute.response_due_at,
    };
  }
  if (dispute.status === 'resolved') {
    return {
      title: 'This dispute has been resolved',
      who: 'Both parties',
      action: 'agreed a resolution and the case is now closed.',
      deadline: null,
    };
  }
  if (dispute.status === 'withdrawn') {
    return {
      title: 'This dispute was withdrawn',
      who: 'The claimant',
      action: 'withdrew the issue and the case is now closed.',
      deadline: null,
    };
  }
  return {
    title: `Case status: ${status}`,
    who: '',
    action: '',
    deadline: null,
  };
}

export default function StatusBanner({ dispute, isRespondent }: { dispute: Dispute; isRespondent: boolean }) {
  const copy = bannerCopy(dispute, isRespondent);
  const isClosed = ['resolved', 'withdrawn', 'closed'].includes(dispute.status);
  const isPreAction = dispute.status === 'pre_action';

  return (
    <div className={`rounded-xl border p-4 ${isPreAction ? 'border-status-red/20 bg-status-red-pale' : isClosed ? 'border-status-green/20 bg-status-green-pale' : 'border-primary-100 bg-primary-50'}`}>
      <div className="flex items-start gap-3">
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isPreAction ? 'bg-status-red/10 text-status-red' : isClosed ? 'bg-status-green/10 text-status-green' : 'bg-primary-100 text-primary-600'}`}>
          <i className={isClosed ? 'ri-check-double-line text-lg' : isPreAction ? 'ri-error-warning-line text-lg' : 'ri-information-line text-lg'}></i>
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-main">{copy.title}</p>
          <p className="text-sm text-muted mt-0.5">
            {copy.who && <span className="font-medium text-main">{copy.who} </span>}
            {copy.action}
            {copy.deadline && (
              <span> Deadline: <span className="font-medium text-main">{formatDate(copy.deadline)}</span></span>
            )}
          </p>
          <p className="text-xs text-muted mt-2 flex items-center gap-1">
            <i className="ri-shield-check-line"></i>
            BuildNerve has not decided which party is right — this record is neutral.
          </p>
        </div>
      </div>
    </div>
  );
}