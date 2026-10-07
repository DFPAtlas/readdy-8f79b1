import { useOrg } from '@/contexts/OrgContext';

/**
 * Slim trial banner shown at the top of the app during the free trial.
 * Only owners and admins see it; other members are unaffected.
 */
export default function TrialBanner() {
  const { isReadOnly, isOwnerOrAdmin, isTrialing, trialDaysLeft } = useOrg();

  if (isReadOnly || !isOwnerOrAdmin || !isTrialing) return null;

  const daysLeft = trialDaysLeft ?? 0;
  const urgent = daysLeft <= 3;
  const dayWord = daysLeft === 1 ? 'day' : 'days';

  if (urgent) {
    return (
      <div className="bg-status-amber-pale border-b border-status-amber/20 px-4 md:px-6 py-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm text-status-amber flex items-start gap-2">
            <i className="ri-alert-line mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span className="font-medium">
              Your trial ends in {daysLeft} {dayWord}. Upgrade to keep adding jobs and records.
            </span>
          </p>
          <a
            href="/app/settings/billing/plan?plan=general"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-status-amber hover:bg-status-amber/90 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            Upgrade now
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-100 border-b border-background-200 px-4 md:px-6 py-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-foreground-700 flex items-center gap-2">
          <i className="ri-timer-flash-line text-primary-500 flex-shrink-0" aria-hidden="true" />
          <span>
            Free trial: <span className="font-semibold text-foreground-950">{daysLeft} {dayWord} left</span>
          </span>
        </p>
        <a
          href="/app/settings/billing/plan?plan=general"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          Upgrade now
        </a>
      </div>
    </div>
  );
}