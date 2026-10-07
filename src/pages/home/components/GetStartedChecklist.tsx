import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { useWidgetData } from '@/hooks/useWidgetData';
import { getOnboardingChecklist, type OnboardingChecklistData } from '@/services/dashboard.service';
import { WidgetError } from './WidgetState';

// Only the people who can actually set the company up see this card.
const OWNER_ADMIN_ROLES = ['owner', 'admin'];

interface ChecklistStep {
  id: string;
  label: string;
  cta: string;
  done: boolean;
  to: string;
}

function buildSteps(data: OnboardingChecklistData): ChecklistStep[] {
  // Step 5 opens the daily log for the most recent job; with no jobs yet we
  // send them to create one first so the flow never dead-ends.
  const dailyLogTarget = data.mostRecentJobId
    ? `/jobs/${data.mostRecentJobId}/daily-logs/new`
    : '/jobs/new';

  return [
    {
      id: 'company',
      label: 'Company set up',
      cta: 'View company',
      done: true,
      to: '/settings/organisation',
    },
    {
      id: 'job',
      label: 'Create your first job',
      cta: 'Create job',
      done: data.hasJob,
      to: '/jobs/new',
    },
    {
      id: 'client',
      label: 'Add a client',
      cta: 'Add client',
      done: data.hasClient,
      to: '/clients',
    },
    {
      id: 'workforce',
      label: 'Invite a subcontractor or team member',
      cta: 'Send invite',
      done: data.hasWorkforceOrInvitation,
      to: '/workforce/invite',
    },
    {
      id: 'log',
      label: 'Log your first daily site record',
      cta: data.mostRecentJobId ? 'Log record' : 'Create job',
      done: data.hasDailyLog,
      to: dailyLogTarget,
    },
    {
      id: 'accounting',
      label: 'Connect your accounting software',
      cta: 'Connect',
      done: data.hasAccounting,
      to: '/app/settings/integrations',
    },
  ];
}

function readFlag(key: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(key) === 'true';
}

function writeFlag(key: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, 'true');
  } catch {
    // Storage may be unavailable (private mode); the card simply won't persist.
  }
}

export default function GetStartedChecklist() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organisation, membership } = useOrg();

  const userId = user?.id ?? 'anonymous';
  const hiddenKey = `buildnerveChecklistHidden:${userId}`;
  const celebratedKey = `buildnerveChecklistCelebrated:${userId}`;

  // Read once per mount: keeps the card hidden after the user dismisses it, and
  // keeps the "all set" celebration to a single visit.
  const [dismissed, setDismissed] = useState(() => readFlag(hiddenKey));
  const [alreadyCelebrated] = useState(() => readFlag(celebratedKey));

  const role = membership?.role ?? null;
  const canSee = !!role && OWNER_ADMIN_ROLES.includes(role);

  const { data, loading, error, reload } = useWidgetData<OnboardingChecklistData>(
    canSee ? organisation?.id ?? null : null,
    getOnboardingChecklist,
  );

  const steps = useMemo(() => (data ? buildSteps(data) : []), [data]);
  const total = steps.length;
  const completed = steps.filter((s) => s.done).length;
  const allDone = total > 0 && completed === total;
  const nextStepId = steps.find((s) => !s.done)?.id ?? null;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Once every step is done, mark it so the card disappears on the next visit.
  useEffect(() => {
    if (canSee && allDone && !alreadyCelebrated) {
      writeFlag(celebratedKey);
    }
  }, [canSee, allDone, alreadyCelebrated, celebratedKey]);

  const handleHide = () => {
    writeFlag(hiddenKey);
    setDismissed(true);
  };

  if (!canSee || dismissed) return null;

  if (error) {
    return (
      <div className="bg-white border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-main">Get started with BuildNerve</h2>
        </div>
        <WidgetError message={error} onRetry={reload} />
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="bg-white border border-border rounded-xl p-5" aria-busy="true" aria-live="polite">
        <div className="h-5 w-48 bg-page rounded animate-pulse" />
        <div className="h-1.5 w-full bg-page rounded-full mt-4 animate-pulse" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 bg-page rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // All six done: congratulate once, then the card hides itself next time.
  if (allDone) {
    if (alreadyCelebrated) return null;
    return (
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-main">Get started with BuildNerve</h2>
          <button
            onClick={handleHide}
            className="text-xs font-medium text-muted hover:text-main transition-colors cursor-pointer whitespace-nowrap"
          >
            Hide
          </button>
        </div>
        <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
          <span className="w-14 h-14 rounded-full bg-status-green-pale text-status-green flex items-center justify-center">
            <i className="ri-checkbox-circle-fill text-3xl"></i>
          </span>
          <div>
            <p className="text-base font-semibold text-main">You&apos;re all set</p>
            <p className="text-sm text-muted mt-1 max-w-md">
              Nice work — your company is fully set up with jobs, clients, people, site records and
              accounting connected. You&apos;re ready to run everything from here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-main">Get started with BuildNerve</h2>
          <p className="text-xs text-muted mt-0.5">
            <span className="font-semibold text-main tabular-nums">{completed}</span> of{' '}
            <span className="tabular-nums">{total}</span> complete
          </p>
        </div>
        <button
          onClick={handleHide}
          className="text-xs font-medium text-muted hover:text-main transition-colors cursor-pointer whitespace-nowrap"
        >
          Hide
        </button>
      </div>

      {/* Slim progress bar */}
      <div className="px-5 pt-4">
        <div className="h-1.5 w-full bg-page rounded-full overflow-hidden">
          <div
            className="h-full bg-status-green rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <ul className="p-3 md:p-4 space-y-1">
        {steps.map((step) => {
          const isNext = step.id === nextStepId;
          return (
            <li
              key={step.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                isNext ? 'bg-primary-50 border border-primary-200' : 'border border-transparent'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.done ? 'bg-status-green text-white' : 'bg-page text-muted border border-border'
                }`}
              >
                <i className={step.done ? 'ri-check-line text-xs' : 'ri-circle-line text-[8px]'}></i>
              </span>

              <span
                className={`text-sm flex-1 min-w-0 ${
                  step.done ? 'text-muted' : 'text-main font-medium'
                }`}
              >
                {step.label}
              </span>

              {isNext && (
                <button
                  onClick={() => navigate(step.to)}
                  className="h-8 px-3.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 flex-shrink-0"
                >
                  {step.cta}
                  <i className="ri-arrow-right-line text-xs"></i>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}