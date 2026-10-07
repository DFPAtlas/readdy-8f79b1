import { useOrg } from '@/contexts/OrgContext';

/**
 * Shown across the dashboard when the organisation's free trial has ended unpaid.
 * Read-only access is enforced on the server; this banner explains the state and
 * offers the upgrade path to owners and admins.
 */
export default function ReadOnlyBanner() {
  const { isReadOnly, isOwnerOrAdmin, accessState } = useOrg();

  if (!isReadOnly) return null;

  const suspended = accessState === 'suspended_by_platform';

  return (
    <div className="bg-status-amber-pale border-b border-status-amber/20 px-4 md:px-6 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-status-amber flex items-start gap-2">
          <i className="ri-lock-2-line mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>
            {suspended
              ? 'Your organisation has been suspended. You can still view and export your data.'
              : 'Your free trial has ended. Your data is safe and you can still view and export everything. Upgrade to start adding and editing again.'}
          </span>
        </p>
        {isOwnerOrAdmin ? (
          <a
            href="/app/settings/billing/plan?plan=general"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-status-amber hover:bg-status-amber/90 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            Upgrade now
          </a>
        ) : (
          <span className="text-sm font-medium text-status-amber/90 whitespace-nowrap">
            Ask your company owner to upgrade
          </span>
        )}
      </div>
    </div>
  );
}