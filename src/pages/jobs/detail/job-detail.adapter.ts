import type { FullJob, JobTeamMember, SiteAddress } from '@/mocks/jobs';
import type { JobMember } from '@/services/jobs.service';
import type { Database } from '@/types/supabase';
import { formatRelativeTime, type StatusColor } from '@/pages/jobs/jobs-workspace.adapter';

type JobRow = Database['public']['Tables']['jobs']['Row'];
type ClientRow = Database['public']['Tables']['clients']['Row'];

const STATUS_META: Record<string, { label: string; color: StatusColor }> = {
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

function getStatusMeta(status: string): { label: string; color: StatusColor } {
  const known = STATUS_META[status];
  if (known) return known;
  return {
    label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    color: 'neutral',
  };
}

function getInitials(fullName: string): string {
  const trimmed = (fullName || '').trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0][0] || '?').toUpperCase();
}

function formatClientName(client: ClientRow | null): string {
  if (!client) return 'No client';
  if (client.client_type === 'business' && client.company_name) return client.company_name.trim();
  const individual = [client.first_name, client.last_name].filter(Boolean).join(' ').trim();
  return individual || (client.company_name ? client.company_name.trim() : 'No client');
}

function buildSiteAddress(client: ClientRow | null, job: JobRow): SiteAddress | undefined {
  if (!client) return undefined;
  const line1 = client.site_address_line1 || client.billing_address_line1 || '';
  const town = client.site_town_city || client.billing_town_city || '';
  const postcode = client.site_postcode || client.billing_postcode || '';
  if (!line1 && !town && !postcode && !job.access_notes) return undefined;
  return {
    addressLine1: line1,
    addressLine2: client.site_address_line2 || client.billing_address_line2 || '',
    town,
    county: client.site_county || client.billing_county || '',
    postcode,
    accessNotes: job.access_notes || undefined,
  };
}

function buildTeam(members: JobMember[]): JobTeamMember[] {
  return members.map((m) => ({
    id: m.user_id,
    initials: getInitials(m.full_name ?? ''),
    name: m.full_name || 'Team member',
    role: m.role,
    trade: undefined,
    available: true,
    complianceState: 'compliant',
  }));
}

function getStatusStep(status: string): FullJob['statusStep'] {
  if (status === 'completed') return 'completed';
  if (status === 'enquiry' || status === 'quoting' || status === 'quote_sent') return 'draft';
  return 'active';
}

/**
 * Maps a real Supabase `jobs` row (plus its client and team members) into the
 * existing `FullJob` view-model so the job detail page can render real backend
 * records with the same layout as before.
 */
export function mapJobRowToFullJob(
  job: JobRow,
  client: ClientRow | null,
  members: JobMember[],
): FullJob {
  const meta = getStatusMeta(job.status);
  const estimatedPounds = (job.estimated_value_pence ?? 0) / 100;

  const programme = job.proposed_start_date || job.target_completion_date || job.site_working_hours || job.estimated_duration
    ? {
        startDate: job.proposed_start_date || '',
        estimatedDuration: job.estimated_duration || 0,
        durationUnit: (job.duration_unit as 'days' | 'weeks' | 'months') || 'days',
        targetCompletion: job.target_completion_date || '',
        workingDays: [],
        siteWorkingHours: job.site_working_hours || '',
        projectManager: '',
        assignedEmployees: [],
        subcontractors: [],
        requiredTrades: [],
        clientMilestones: [],
      }
    : undefined;

  return {
    id: job.id,
    reference: job.reference,
    project: job.project_name,
    client: formatClientName(client),
    clientId: client?.id ?? '',
    site: client
      ? [client.site_town_city || client.billing_town_city, client.site_postcode || client.billing_postcode]
          .filter(Boolean)
          .join(', ')
      : '—',
    sitePostcode: client?.site_postcode || client?.billing_postcode || '—',
    siteAddress: buildSiteAddress(client, job),
    type: job.trade || job.work_type || '',
    trade: job.trade || '',
    category: job.work_type || '',
    status: meta.label,
    statusColor: meta.color,
    progress: Number.isFinite(job.progress) ? Math.max(0, Math.min(100, job.progress)) : 0,
    nextAction: 'No next action recorded',
    nextActionTime: '—',
    workers: members.map((m) => getInitials(m.full_name ?? '')),
    teamMembers: buildTeam(members),
    financials: {
      contractValue: estimatedPounds,
      approvedVariations: 0,
      revisedContract: estimatedPounds,
      invoiced: 0,
      paid: 0,
      outstanding: 0,
      retentionHeld: 0,
    },
    risk: 'None',
    riskColor: 'green',
    updated: formatRelativeTime(job.updated_at),
    description: job.short_description || '',
    priority: 'Medium',
    projectManager: '—',
    programme,
    complianceItems: undefined,
    documents: undefined,
    statusStep: getStatusStep(job.status),
  };
}
