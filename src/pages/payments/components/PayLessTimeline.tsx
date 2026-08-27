import { oakridgeTimeline, paylessAlert } from '@/mocks/retention';

export default function PayLessTimeline() {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="p-4 md:p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-main">Statutory payment & pay-less countdown</h2>
          <p className="text-sm text-muted mt-0.5">
            JCT / NEC payment cycle tracking · Job #204 (Oakridge Site)
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted bg-page rounded-full px-3 py-1 whitespace-nowrap">
          <i className="ri-government-line text-sm"></i>
          Construction Act 1996
        </span>
      </div>

      {/* Active deadline banner */}
      <div className="px-4 md:px-5 pt-4 md:pt-5">
        <div className="flex items-start gap-3 bg-status-amber-pale border border-status-amber/30 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-status-amber text-white flex items-center justify-center flex-shrink-0">
            <i className="ri-alert-line text-lg"></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-main leading-snug">
              Pay-Less Notice deadline for Job {paylessAlert.jobRef} ({paylessAlert.jobName}) expires in{' '}
              <span className="text-status-amber font-bold">{paylessAlert.hoursRemaining} hours!</span>
            </p>
            <p className="text-xs text-muted mt-1">
              Deadline {paylessAlert.deadline}. If no pay-less notice is served, the notified sum becomes due in full.
            </p>
          </div>
        </div>
      </div>

      {/* Timeline steps */}
      <div className="p-4 md:p-5">
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {oakridgeTimeline.map((step, idx) => {
            const isDone = step.state === 'done';
            const isActive = step.state === 'active';
            return (
              <li key={step.key} className="relative">
                <div
                  className={`
                    rounded-xl border p-4 h-full transition-colors
                    ${isActive
                      ? 'border-status-amber/50 bg-status-amber-pale'
                      : isDone
                      ? 'border-border bg-page/40'
                      : 'border-border bg-white'}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`
                        w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                        ${isDone
                          ? 'bg-status-green text-white'
                          : isActive
                          ? 'bg-status-amber text-white'
                          : 'bg-border text-muted'}
                      `}
                    >
                      {isDone ? <i className="ri-check-line"></i> : idx + 1}
                    </span>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-status-amber whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-amber animate-pulse"></span>
                        Live
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-main leading-snug">{step.label}</p>
                  <p className="text-xs text-muted mt-1">{step.date}</p>
                  {step.note && (
                    <p className="text-xs font-medium text-status-amber mt-1.5">{step.note}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}