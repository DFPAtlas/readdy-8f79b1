import { timelinePhases, type TimelinePhase } from '@/mocks/clientHub';

function phaseDot(phase: TimelinePhase) {
  switch (phase.status) {
    case 'completed':
      return <i className="ri-check-line text-white text-sm"></i>;
    case 'in_progress':
      return <span className="w-2.5 h-2.5 rounded-full bg-white"></span>;
    case 'upcoming':
    case 'scheduled':
      return <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>;
    default:
      return null;
  }
}

function dotClasses(phase: TimelinePhase): string {
  switch (phase.status) {
    case 'completed':
      return 'bg-emerald-500 border-emerald-500';
    case 'in_progress':
      return 'bg-indigo-600 border-indigo-600';
    case 'upcoming':
    case 'scheduled':
      return 'bg-white border-slate-300';
    default:
      return 'bg-white border-slate-300';
  }
}

export default function TimelineTracker() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 h-full">
      <h2 className="text-base font-semibold text-slate-900">Project Timeline &amp; Phase Status</h2>
      <p className="text-xs text-slate-500 mt-1 mb-6">Live programme against your six key phases</p>

      <div className="space-y-0">
        {timelinePhases.map((phase, idx) => {
          const isLast = idx === timelinePhases.length - 1;
          const isCompleted = phase.status === 'completed';
          const isInProgress = phase.status === 'in_progress';

          return (
            <div key={phase.id} className="flex gap-4">
              {/* Rail */}
              <div className="flex flex-col items-center">
                <span
                  className={`w-8 h-8 flex items-center justify-center rounded-full border-2 shrink-0 ${dotClasses(phase)} ${
                    isInProgress ? 'ring-4 ring-indigo-100' : ''
                  }`}
                >
                  {phaseDot(phase)}
                </span>
                {!isLast && <span className="w-0.5 flex-1 min-h-[40px] bg-slate-200"></span>}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-7 ${isLast ? 'pb-0' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <p
                    className={`text-sm font-semibold ${
                      isCompleted ? 'text-slate-500' : isInProgress ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {phase.name}
                  </p>
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 whitespace-nowrap">
                      <i className="ri-checkbox-circle-line"></i> Completed
                    </span>
                  )}
                  {isInProgress && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 whitespace-nowrap">
                      <i className="ri-loader-4-line animate-spin"></i> In Progress
                    </span>
                  )}
                  {phase.status === 'upcoming' && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 whitespace-nowrap">
                      <i className="ri-time-line"></i> Upcoming
                    </span>
                  )}
                  {phase.status === 'scheduled' && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 whitespace-nowrap">
                      <i className="ri-calendar-line"></i> Scheduled
                    </span>
                  )}
                </div>

                {phase.completedDate && (
                  <p className="text-xs text-slate-500 mt-0.5">Completed {phase.completedDate}</p>
                )}
                {phase.targetDate && !phase.completedDate && (
                  <p className="text-xs text-slate-500 mt-0.5">{phase.targetDate}</p>
                )}

                {isInProgress && phase.progress !== undefined && (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                        style={{ width: `${phase.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-semibold text-indigo-600 whitespace-nowrap">{phase.progress}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}