import type { DisputePermittedActions } from '@/types/disputes';

export type DisputeAction =
  | 'submit'
  | 'respond'
  | 'request_clarification'
  | 'answer_clarification'
  | 'correct'
  | 'withdraw'
  | 'request_resolution'
  | 'confirm_resolution';

interface NextActionPanelProps {
  actions: DisputePermittedActions;
  resolutionPending: boolean;
  resolutionRequestedByMe: boolean;
  projectId: string | null;
  onAction: (action: DisputeAction) => void;
  onViewProject: () => void;
}

export default function NextActionPanel({
  actions,
  resolutionPending,
  resolutionRequestedByMe,
  projectId,
  onAction,
  onViewProject,
}: NextActionPanelProps) {
  const items: { key: DisputeAction; label: string; icon: string; show: boolean; primary?: boolean }[] = [
    { key: 'submit', label: 'Submit your dispute', icon: 'ri-send-plane-line', show: actions.canSubmit, primary: true },
    { key: 'respond', label: 'Submit formal response', icon: 'ri-chat-3-line', show: actions.canSubmitResponse, primary: true },
    { key: 'answer_clarification', label: 'Answer clarification', icon: 'ri-reply-line', show: actions.canAnswerClarification, primary: true },
    { key: 'request_clarification', label: 'Request clarification', icon: 'ri-question-line', show: actions.canRequestClarification },
    { key: 'correct', label: 'Correct my earlier submission', icon: 'ri-refresh-line', show: actions.canCorrectOwnClaim },
    { key: 'request_resolution', label: 'Mark as resolved', icon: 'ri-check-double-line', show: actions.canRequestResolution },
    { key: 'confirm_resolution', label: 'Confirm agreed resolution', icon: 'ri-check-double-line', show: actions.canConfirmResolution, primary: true },
    { key: 'withdraw', label: 'Withdraw my dispute', icon: 'ri-close-circle-line', show: actions.canWithdraw },
  ];

  const visible = items.filter((i) => i.show);

  return (
    <section className="bg-white border border-border rounded-2xl p-5">
      <h2 className="text-base font-semibold text-main">Next actions</h2>

      {resolutionPending && (
        <p className="mt-3 text-xs text-status-amber bg-status-amber-pale rounded-lg px-3 py-2 flex items-center gap-2">
          <i className="ri-time-line"></i>
          {resolutionRequestedByMe
            ? 'You requested an agreed resolution — awaiting the other party\u2019s confirmation.'
            : 'The other party has requested an agreed resolution — you can confirm it below.'}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-muted mt-3">No actions are currently available for this case.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {visible.map((it) => (
            <button
              key={it.key}
              type="button"
              onClick={() => onAction(it.key)}
              className={`w-full h-10 px-3.5 rounded-xl text-sm font-medium flex items-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap ${
                it.primary
                  ? 'bg-primary-500 hover:bg-primary-600 text-white justify-center'
                  : it.key === 'withdraw'
                    ? 'border border-border bg-white hover:bg-status-red-pale text-status-red'
                    : 'border border-border bg-white hover:bg-page text-main'
              }`}
            >
              <i className={`${it.icon} ${it.primary ? '' : 'text-muted'}`}></i>
              {it.label}
            </button>
          ))}
        </div>
      )}

      {projectId && (
        <button
          type="button"
          onClick={onViewProject}
          className="w-full mt-2 h-10 px-3.5 rounded-xl border border-border bg-white hover:bg-page text-main text-sm font-medium flex items-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-external-link-line text-muted"></i>
          View linked project
        </button>
      )}
    </section>
  );
}