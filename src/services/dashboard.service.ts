import { getSupabase } from '@/lib/supabase';

// ─── Shared vocabulary ─────────────────────────────────────────────────
// Job statuses that count as "active" (i.e. not finished or archived).
export const ACTIVE_JOB_STATUSES = [
  'enquiry',
  'quoting',
  'quote_sent',
  'accepted',
  'in_progress',
  'on_site',
  'on_hold',
];

// Variations that have been issued and are awaiting a client response.
export const VARIATION_AWAITING_STATUSES = ['sent', 'viewed', 'question_received'];

// Variations that are settled and no longer "open".
export const VARIATION_CLOSED_STATUSES = ['approved', 'declined', 'rejected'];

// Payment applications that represent money still owed to the company.
export const PAYMENT_OUTSTANDING_STATUSES = ['submitted', 'certified'];

// Plant hire statuses that mean the item has left the books.
const PLANT_OFF_HIRE_STATUSES = [
  'off_hire',
  'off-hired',
  'offhire',
  'returned',
  'closed',
  'completed',
  'cancelled',
];

const DAY_MS = 86_400_000;

async function client() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('The backend is not available right now.');
  return supabase;
}

function sumPence(rows: Record<string, unknown>[], key: string): number {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}

export interface JobRef {
  reference: string;
  project_name: string;
}

/** Lightweight job id → {reference, project_name} map scoped to the org. */
async function fetchJobRefs(orgId: string): Promise<Map<string, JobRef>> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('jobs')
    .select('id, reference, project_name')
    .eq('organisation_id', orgId)
    .is('archived_at', null);
  if (error) throw error;
  const map = new Map<string, JobRef>();
  (data || []).forEach((j) => map.set(j.id, { reference: j.reference, project_name: j.project_name }));
  return map;
}

// ─── KPI command bar ───────────────────────────────────────────────────

export interface DashboardKpis {
  activeJobs: number;
  variationsAwaitingCount: number;
  variationsAwaitingPence: number;
  paymentOutstandingCount: number;
  paymentOutstandingPence: number;
  retentionHeldPence: number;
}

export async function getDashboardKpis(orgId: string): Promise<DashboardKpis> {
  const supabase = await client();
  const [jobsRes, varRes, payRes, retRes] = await Promise.all([
    supabase.from('jobs').select('id, status').eq('organisation_id', orgId).is('archived_at', null),
    supabase.from('variations').select('status, total_pence').eq('organisation_id', orgId).is('archived_at', null),
    supabase.from('payment_applications').select('status, amount_due_pence').eq('organisation_id', orgId),
    supabase.from('retention_records').select('withheld_pence, released_pence').eq('organisation_id', orgId),
  ]);
  if (jobsRes.error) throw jobsRes.error;
  if (varRes.error) throw varRes.error;
  if (payRes.error) throw payRes.error;
  if (retRes.error) throw retRes.error;

  const jobs = (jobsRes.data || []) as Record<string, unknown>[];
  const variations = (varRes.data || []) as Record<string, unknown>[];
  const payments = (payRes.data || []) as Record<string, unknown>[];
  const retention = (retRes.data || []) as Record<string, unknown>[];

  const activeJobs = jobs.filter((j) => ACTIVE_JOB_STATUSES.includes(j.status as string)).length;
  const awaitingVars = variations.filter((v) => VARIATION_AWAITING_STATUSES.includes(v.status as string));
  const outstandingPayments = payments.filter((p) =>
    PAYMENT_OUTSTANDING_STATUSES.includes(p.status as string),
  );

  const retentionHeldPence = retention.reduce(
    (total, r) => total + ((Number(r.withheld_pence) || 0) - (Number(r.released_pence) || 0)),
    0,
  );

  return {
    activeJobs,
    variationsAwaitingCount: awaitingVars.length,
    variationsAwaitingPence: sumPence(awaitingVars, 'total_pence'),
    paymentOutstandingCount: outstandingPayments.length,
    paymentOutstandingPence: sumPence(outstandingPayments, 'amount_due_pence'),
    retentionHeldPence,
  };
}

// ─── Commercial health ─────────────────────────────────────────────────

export interface CommercialHealthRow {
  id: string;
  reference: string;
  name: string;
  completionPct: number;
  openVariationsPence: number;
  status: string;
}

export async function getCommercialHealth(orgId: string): Promise<CommercialHealthRow[]> {
  const supabase = await client();
  const [jobsRes, varRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, reference, project_name, status, progress')
      .eq('organisation_id', orgId)
      .is('archived_at', null),
    supabase
      .from('variations')
      .select('job_id, status, total_pence')
      .eq('organisation_id', orgId)
      .is('archived_at', null),
  ]);
  if (jobsRes.error) throw jobsRes.error;
  if (varRes.error) throw varRes.error;

  const openByJob = new Map<string, number>();
  ((varRes.data || []) as Record<string, unknown>[]).forEach((v) => {
    if (VARIATION_CLOSED_STATUSES.includes(v.status as string)) return;
    const jobId = v.job_id as string;
    openByJob.set(jobId, (openByJob.get(jobId) || 0) + (Number(v.total_pence) || 0));
  });

  return ((jobsRes.data || []) as Record<string, unknown>[])
    .filter((j) => ACTIVE_JOB_STATUSES.includes(j.status as string))
    .map((j) => ({
      id: j.id as string,
      reference: j.reference as string,
      name: j.project_name as string,
      completionPct: Number.isFinite(Number(j.progress))
        ? Math.max(0, Math.min(100, Number(j.progress)))
        : 0,
      openVariationsPence: openByJob.get(j.id as string) || 0,
      status: j.status as string,
    }));
}

// ─── Pending approvals ─────────────────────────────────────────────────

export interface PendingApprovalItem {
  id: string;
  kind: 'variation' | 'requisition';
  title: string;
  jobLabel: string;
  amountPence: number | null;
  route: string;
}

export async function getPendingApprovals(orgId: string): Promise<PendingApprovalItem[]> {
  const supabase = await client();
  const [varRes, reqRes, jobRefs] = await Promise.all([
    supabase
      .from('variations')
      .select('id, reference, job_id, status, total_pence')
      .eq('organisation_id', orgId)
      .is('archived_at', null),
    supabase
      .from('purchase_requisitions')
      .select('id, reference, estimated_cost_pence, status')
      .eq('organisation_id', orgId),
    fetchJobRefs(orgId),
  ]);
  if (varRes.error) throw varRes.error;
  if (reqRes.error) throw reqRes.error;

  const items: PendingApprovalItem[] = [];

  ((varRes.data || []) as Record<string, unknown>[])
    .filter((v) => VARIATION_AWAITING_STATUSES.includes(v.status as string))
    .forEach((v) => {
      const job = v.job_id ? jobRefs.get(v.job_id as string) : null;
      items.push({
        id: `var-${v.id}`,
        kind: 'variation',
        title: `Variation ${v.reference} awaiting response`,
        jobLabel: job ? `${job.reference} · ${job.project_name}` : 'Variation',
        amountPence: v.total_pence === null ? null : Number(v.total_pence) || 0,
        route: '/variations',
      });
    });

  ((reqRes.data || []) as Record<string, unknown>[])
    .filter((r) => ['submitted', 'under_review'].includes(r.status as string))
    .forEach((r) => {
      items.push({
        id: `req-${r.id}`,
        kind: 'requisition',
        title: `Requisition ${r.reference} awaiting approval`,
        jobLabel: 'Procurement sign-off required',
        amountPence: r.estimated_cost_pence === null ? null : Number(r.estimated_cost_pence) || 0,
        route: '/procurement/requisitions',
      });
    });

  return items;
}

// ─── Live field feed ───────────────────────────────────────────────────

export type FieldFeedKind = 'daily' | 'evidence' | 'timeline';

export interface FieldFeedItem {
  id: string;
  kind: FieldFeedKind;
  text: string;
  jobLabel: string;
  timestamp: string;
}

export async function getFieldFeed(orgId: string): Promise<FieldFeedItem[]> {
  const supabase = await client();
  const [jobRefs, logsRes, evRes, tlRes] = await Promise.all([
    fetchJobRefs(orgId),
    supabase
      .from('daily_logs')
      .select('id, job_id, work_completed, weather_desc, log_date, created_at')
      .eq('organisation_id', orgId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(25),
    supabase
      .from('evidence_records')
      .select('id, job_id, caption, evidence_type, captured_at, created_at')
      .eq('organisation_id', orgId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(25),
    supabase
      .from('timeline_events')
      .select('id, job_id, title, summary, event_type, event_date, created_at')
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: false })
      .limit(25),
  ]);
  if (logsRes.error) throw logsRes.error;
  if (evRes.error) throw evRes.error;
  if (tlRes.error) throw tlRes.error;

  const items: FieldFeedItem[] = [];
  const label = (jobId: string | null): string => {
    const job = jobId ? jobRefs.get(jobId) : null;
    return job ? `${job.reference} · ${job.project_name}` : 'Company-wide';
  };

  ((logsRes.data || []) as Record<string, unknown>[]).forEach((l) => {
    const work = ((l.work_completed as string) || '').trim();
    const weather = ((l.weather_desc as string) || '').trim();
    const text = work || (weather ? `Weather logged — ${weather}` : 'Daily site log submitted');
    items.push({
      id: `log-${l.id}`,
      kind: 'daily',
      text,
      jobLabel: label(l.job_id as string | null),
      timestamp: (l.created_at as string) || (l.log_date as string),
    });
  });

  ((evRes.data || []) as Record<string, unknown>[]).forEach((e) => {
    const caption = ((e.caption as string) || '').trim();
    const typeLabel = ((e.evidence_type as string) || 'file').replace(/_/g, ' ');
    items.push({
      id: `ev-${e.id}`,
      kind: 'evidence',
      text: caption || `Evidence uploaded — ${typeLabel}`,
      jobLabel: label(e.job_id as string | null),
      timestamp: (e.created_at as string) || (e.captured_at as string),
    });
  });

  ((tlRes.data || []) as Record<string, unknown>[]).forEach((t) => {
    const title = ((t.title as string) || '').trim();
    const summary = ((t.summary as string) || '').trim();
    items.push({
      id: `tl-${t.id}`,
      kind: 'timeline',
      text: summary ? `${title} — ${summary}` : title || 'Timeline event',
      jobLabel: label(t.job_id as string | null),
      timestamp: (t.created_at as string) || (t.event_date as string),
    });
  });

  return items
    .filter((item) => item.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);
}

// ─── Procurement & plant hire leakage ──────────────────────────────────

export interface PlantHireOverdueItem {
  id: string;
  name: string;
  daysOverdue: number;
  endDate: string | null;
}

export interface PlantHireSummary {
  machinesOnHire: number;
  standingRatePence: number;
  overdue: PlantHireOverdueItem[];
}

export async function getPlantHireSummary(orgId: string): Promise<PlantHireSummary> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('plant_hire_records')
    .select('id, equipment_description, quantity, rate_pence, hire_end_date, status')
    .eq('organisation_id', orgId);
  if (error) throw error;

  const rows = (data || []) as Record<string, unknown>[];
  const onHire = rows.filter((r) => !PLANT_OFF_HIRE_STATUSES.includes(String(r.status || '').toLowerCase()));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = onHire
    .filter((r) => r.hire_end_date && new Date(r.hire_end_date as string).getTime() < today.getTime())
    .map((r) => {
      const end = new Date(r.hire_end_date as string);
      return {
        id: r.id as string,
        name: r.equipment_description as string,
        daysOverdue: Math.max(1, Math.floor((today.getTime() - end.getTime()) / DAY_MS)),
        endDate: r.hire_end_date as string,
      };
    });

  return {
    machinesOnHire: onHire.reduce((total, r) => total + (Number(r.quantity) || 0), 0),
    standingRatePence: sumPence(onHire, 'rate_pence'),
    overdue,
  };
}

// ─── HMRC CIS status ───────────────────────────────────────────────────

export interface CisSummary {
  total: number;
  verified: number;
  pending: number;
  lastChecked: string | null;
}

export async function getCisSummary(orgId: string): Promise<CisSummary> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('cis_records')
    .select('id, utr_recorded, last_checked')
    .eq('organisation_id', orgId);
  if (error) throw error;

  const rows = (data || []) as Record<string, unknown>[];
  const verified = rows.filter((r) => r.utr_recorded === true).length;
  const lastChecked = rows.reduce<string | null>((latest, r) => {
    const value = (r.last_checked as string) || null;
    if (!value) return latest;
    return !latest || value > latest ? value : latest;
  }, null);

  return { total: rows.length, verified, pending: rows.length - verified, lastChecked };
}

// ─── Get-started checklist ─────────────────────────────────────────────
// Each flag is a boolean existence check scoped to the current organisation,
// so the dashboard checklist reflects the company's real data and never
// carries progress from another company.

export interface OnboardingChecklistData {
  hasJob: boolean;
  mostRecentJobId: string | null;
  hasClient: boolean;
  hasWorkforceOrInvitation: boolean;
  hasDailyLog: boolean;
  hasAccounting: boolean;
}

export async function getOnboardingChecklist(orgId: string): Promise<OnboardingChecklistData> {
  const supabase = await client();
  const [jobsRes, clientsRes, workforceRes, invitesRes, logsRes, connectionsRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('id')
      .eq('organisation_id', orgId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('clients')
      .select('id')
      .eq('organisation_id', orgId)
      .is('archived_at', null)
      .limit(1),
    supabase
      .from('workforce_people')
      .select('id')
      .eq('organisation_id', orgId)
      .is('archived_at', null)
      .limit(1),
    supabase
      .from('invitations')
      .select('id')
      .eq('organisation_id', orgId)
      .eq('status', 'pending')
      .limit(1),
    supabase
      .from('daily_logs')
      .select('id')
      .eq('organisation_id', orgId)
      .is('archived_at', null)
      .limit(1),
    supabase
      .from('integration_connections')
      .select('id')
      .eq('organisation_id', orgId)
      .limit(1),
  ]);
  if (jobsRes.error) throw jobsRes.error;
  if (clientsRes.error) throw clientsRes.error;
  if (workforceRes.error) throw workforceRes.error;
  if (invitesRes.error) throw invitesRes.error;
  if (logsRes.error) throw logsRes.error;
  if (connectionsRes.error) throw connectionsRes.error;

  const recentJob = (jobsRes.data || [])[0] as { id: string } | undefined;

  return {
    hasJob: (jobsRes.data || []).length > 0,
    mostRecentJobId: recentJob?.id ?? null,
    hasClient: (clientsRes.data || []).length > 0,
    hasWorkforceOrInvitation: (workforceRes.data || []).length > 0 || (invitesRes.data || []).length > 0,
    hasDailyLog: (logsRes.data || []).length > 0,
    hasAccounting: (connectionsRes.data || []).length > 0,
  };
}