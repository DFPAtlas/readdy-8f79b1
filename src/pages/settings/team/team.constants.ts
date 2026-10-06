export const TEAM_ROLES = [
  'owner',
  'admin',
  'project_manager',
  'site_supervisor',
  'finance',
  'employee',
] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  project_manager: 'Project manager',
  site_supervisor: 'Site supervisor',
  finance: 'Finance',
  employee: 'Employee',
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: 'Everything including billing.',
  admin: 'Everything except removing owners.',
  project_manager: 'Jobs, variations, procurement.',
  site_supervisor: 'Daily logs, evidence, site capture.',
  finance: 'Payments, CIS, retention, billing view.',
  employee: 'Assigned jobs only.',
};

export const ROLE_ORDER: string[] = [...TEAM_ROLES];

export const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  invited: 'Invited',
  suspended: 'Suspended',
  removed: 'Removed',
};

export const STATUS_BADGE_CLASSES: Record<string, string> = {
  active: 'bg-status-green/10 text-status-green',
  invited: 'bg-status-blue/10 text-status-blue',
  suspended: 'bg-status-amber/10 text-status-amber',
  removed: 'bg-status-red/10 text-status-red',
};

export function roleLabel(role: string | null | undefined): string {
  if (!role) return '—';
  return ROLE_LABELS[role] ?? role;
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function initialsFor(name: string | null | undefined, fallback: string | null | undefined): string {
  const source = (name || '').trim();
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return source.slice(0, 2).toUpperCase();
  }
  const email = (fallback || '').trim();
  return email ? email.slice(0, 2).toUpperCase() : '??';
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / 86400000);
}