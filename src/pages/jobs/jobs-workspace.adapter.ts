import type { JobWithClient, JobClientRef } from '@/services/jobs.service';

// View-model used by the Jobs Workspace, mapped from real database rows.
export interface JobWorkspaceItem {
  id: string;
  reference: string;
  project: string;
  client: string;
  sitePostcode: string;
  type: string;
  trade: string | null;
  workType: string | null;
  status: string;
  statusLabel: string;
  statusColor: StatusColor;
  progress: number;
  estimatedValuePence: number | null;
  proposedStartDate: string | null;
  targetCompletionDate: string | null;
  updatedAt: string;
}

export type StatusColor = 'green' | 'amber' | 'blue' | 'red' | 'neutral';

interface StatusMeta {
  label: string;
  color: StatusColor;
}

// Deterministic display mapping for the real `jobs.status` values enforced by
// the database CHECK constraint.
const STATUS_META: Record<string, StatusMeta> = {
  enquiry: { label: 'Enquiry', color: 'blue' },
  quoting: { label: 'Quoting', color: 'blue' },
  quote_sent: { label: 'Quote sent', color: 'amber' },
  accepted: { label: 'Accepted', color: 'amber' },
  in_progress: { label: 'In progress', color: 'green' },
  on_site: { label: 'On site', color: 'green' },
  completed: { label: 'Completed', color: 'green' },
  on_hold: { label: 'On hold', color: 'amber' },
  cancelled: { label: 'Cancelled', color: 'red' },
  archived: { label: 'Archived', color: 'red' },
};

function getStatusMeta(status: string): StatusMeta {
  const known = STATUS_META[status];
  if (known) return known;
  return {
    label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    color: 'neutral',
  };
}

function formatClientName(client: JobClientRef | null): string {
  if (!client) return 'No client';
  if (client.client_type === 'business' && client.company_name) {
    return client.company_name.trim();
  }
  const individual = [client.first_name, client.last_name].filter(Boolean).join(' ').trim();
  return individual || (client.company_name ? client.company_name.trim() : 'No client');
}

function formatSitePostcode(client: JobClientRef | null): string {
  if (!client) return '—';
  return client.site_postcode || client.billing_postcode || '—';
}

export function mapJobToWorkspaceItem(job: JobWithClient): JobWorkspaceItem {
  const meta = getStatusMeta(job.status);
  const progress = Number.isFinite(job.progress)
    ? Math.max(0, Math.min(100, job.progress))
    : 0;

  return {
    id: job.id,
    reference: job.reference,
    project: job.project_name,
    client: formatClientName(job.clients),
    sitePostcode: formatSitePostcode(job.clients),
    type: job.trade || job.work_type || '',
    trade: job.trade,
    workType: job.work_type,
    status: job.status,
    statusLabel: meta.label,
    statusColor: meta.color,
    progress,
    estimatedValuePence: job.estimated_value_pence,
    proposedStartDate: job.proposed_start_date,
    targetCompletionDate: job.target_completion_date,
    updatedAt: job.updated_at,
  };
}

const DAY_MS = 86_400_000;

export function isWithinNextDays(dateStr: string | null, now: Date, days: number): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  const diff = date.getTime() - now.getTime();
  return diff >= 0 && diff <= days * DAY_MS;
}

export function isNotFinished(status: string): boolean {
  return status !== 'completed' && status !== 'cancelled' && status !== 'archived';
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (Number.isNaN(date.getTime())) return '—';
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const jobQuickFilters = [
  { id: 'all', label: 'All jobs' },
  { id: 'on-site', label: 'On site' },
  { id: 'starting', label: 'Starting soon' },
  { id: 'approval', label: 'Approval needed' },
  { id: 'at-risk', label: 'At risk' },
  { id: 'completed', label: 'Completed' },
];