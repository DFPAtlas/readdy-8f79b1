import { useToast } from '@/components/base/Toast';
import { milestoneAlert, formatGBP } from '@/mocks/retentionLifecycle';

export default function MilestoneAlert() {
  const { showToast } = useToast();

  return (
    <div className="bg-status-amber-pale border border-status-amber/40 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="w-11 h-11 rounded-lg bg-status-amber text-white flex items-center justify-center flex-shrink-0">
        <i className="ri-flashlight-line text-xl"></i>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-amber bg-white border border-status-amber/30 rounded-full px-2.5 py-0.5 whitespace-nowrap">
            <i className="ri-alert-line text-sm"></i>
            Milestone Reached
          </span>
          <span className="text-xs text-muted">Signed off {milestoneAlert.signedOffDate}</span>
        </div>
        <p className="text-sm text-main font-medium mt-2 leading-relaxed">
          Practical Completion signed off for Job {milestoneAlert.jobRef} · {milestoneAlert.jobName}. The{' '}
          {milestoneAlert.releasePct}% retention release ({formatGBP(milestoneAlert.releaseAmount)}) is now unlocked for
          payment valuation.
        </p>
      </div>
      <button
        onClick={() => showToast(`Retention release of ${formatGBP(milestoneAlert.releaseAmount)} added to the valuation queue.`, 'success')}
        className="h-11 px-5 bg-status-amber hover:bg-status-amber/90 text-white rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
      >
        Review &amp; Value Release
      </button>
    </div>
  );
}