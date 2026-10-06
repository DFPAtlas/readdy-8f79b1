import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_ORDER } from '@/pages/settings/team/team.constants';

const ROLE_ICONS: Record<string, string> = {
  owner: 'ri-vip-crown-line',
  admin: 'ri-shield-user-line',
  project_manager: 'ri-briefcase-line',
  site_supervisor: 'ri-tools-line',
  finance: 'ri-bank-card-line',
  employee: 'ri-user-line',
};

export default function RolesExplainer() {
  return (
    <section className="bg-white rounded-2xl border border-background-200 p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-secondary-100 text-secondary-700 flex items-center justify-center flex-shrink-0">
          <i className="ri-information-line text-lg"></i>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground-950">Roles explained</h2>
          <p className="text-xs text-foreground-500 mt-0.5">What each role can access in your workspace</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ROLE_ORDER.map((role) => (
          <div key={role} className="flex items-start gap-3 rounded-xl border border-background-200 bg-background-50 p-3">
            <span className="w-8 h-8 rounded-lg bg-background-100 text-foreground-600 flex items-center justify-center flex-shrink-0">
              <i className={`${ROLE_ICONS[role] ?? 'ri-user-line'} text-base`}></i>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground-950">{ROLE_LABELS[role]}</p>
              <p className="text-xs text-foreground-500 mt-0.5">{ROLE_DESCRIPTIONS[role]}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}