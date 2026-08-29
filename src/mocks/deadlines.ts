export type DeadlineType =
  | 'payment_notice'
  | 'pay_less_notice'
  | 'final_date_for_payment'
  | 'eot_notification'
  | 'loss_expense_notification'
  | 'defects_liability_end'
  | 'retention_release';

export type DeadlineStatus = 'upcoming' | 'due_soon' | 'overdue' | 'actioned' | 'expired';

export interface StatutoryDeadline {
  id: string;
  organisation_id: string;
  job_id: string;
  job_reference: string;
  job_name: string;
  deadline_type: DeadlineType;
  source_record_type: string;
  source_record_id: string;
  due_at: string;
  status: DeadlineStatus;
}

interface DeadlineTypeMeta {
  label: string;
  icon: string;
  tone: 'red' | 'amber' | 'green' | 'blue';
}

export const deadlineTypeMeta: Record<DeadlineType, DeadlineTypeMeta> = {
  payment_notice: { label: 'Payment Notice', icon: 'ri-file-list-3-line', tone: 'blue' },
  pay_less_notice: { label: 'Pay Less Notice', icon: 'ri-alert-line', tone: 'red' },
  final_date_for_payment: { label: 'Final Date for Payment', icon: 'ri-bank-card-line', tone: 'green' },
  eot_notification: { label: 'EOT Notification', icon: 'ri-time-line', tone: 'amber' },
  loss_expense_notification: { label: 'Loss & Expense', icon: 'ri-money-pound-circle-line', tone: 'amber' },
  defects_liability_end: { label: 'Defects Liability End', icon: 'ri-shield-check-line', tone: 'blue' },
  retention_release: { label: 'Retention Release', icon: 'ri-inbox-archive-line', tone: 'green' },
};

export const deadlineTypeOptions: DeadlineType[] = [
  'payment_notice',
  'pay_less_notice',
  'final_date_for_payment',
  'eot_notification',
  'loss_expense_notification',
  'defects_liability_end',
  'retention_release',
];

// Effective status derived from due_at, so display stays correct without a
// separate status-recompute job. Stored actioned/expired still win.
export function computeStatus(dueAt: string, stored: DeadlineStatus): DeadlineStatus {
  if (stored === 'actioned' || stored === 'expired') return stored;
  const due = new Date(dueAt).getTime();
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (due < now) return 'overdue';
  if (due < now + sevenDays) return 'due_soon';
  return 'upcoming';
}

export const deadlineStatusMeta: Record<DeadlineStatus, { label: string; chip: string; dot: string }> = {
  upcoming: { label: 'Upcoming', chip: 'bg-status-blue-pale text-status-blue', dot: 'bg-status-blue' },
  due_soon: { label: 'Due soon', chip: 'bg-status-amber-pale text-status-amber', dot: 'bg-status-amber' },
  overdue: { label: 'Overdue', chip: 'bg-status-red-pale text-status-red', dot: 'bg-status-red' },
  actioned: { label: 'Actioned', chip: 'bg-primary-50 text-primary-700', dot: 'bg-primary-500' },
  expired: { label: 'Expired', chip: 'bg-page text-muted', dot: 'bg-muted' },
};

function daysFromNow(days: number, hour = 17): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// Demo deadlines — realistic, dates relative to "now" so the calendar always
// looks live. Used as a fallback when the organisation has no DB records yet.
export const demoDeadlines: StatutoryDeadline[] = [
  { id: 'dl-01', organisation_id: '', job_id: 'sl-1048', job_reference: 'SL-1048', job_name: 'Oakfield kitchen extension', deadline_type: 'pay_less_notice', source_record_type: 'payment_application', source_record_id: 'pa-01', due_at: daysFromNow(2), status: 'due_soon' },
  { id: 'dl-02', organisation_id: '', job_id: 'sl-1048', job_reference: 'SL-1048', job_name: 'Oakfield kitchen extension', deadline_type: 'final_date_for_payment', source_record_type: 'payment_application', source_record_id: 'pa-01', due_at: daysFromNow(9), status: 'upcoming' },
  { id: 'dl-03', organisation_id: '', job_id: 'sl-1051', job_reference: 'SL-1051', job_name: 'Harcourt office rewire', deadline_type: 'pay_less_notice', source_record_type: 'payment_application', source_record_id: 'pa-02', due_at: daysFromNow(-1), status: 'overdue' },
  { id: 'dl-04', organisation_id: '', job_id: 'sl-1051', job_reference: 'SL-1051', job_name: 'Harcourt office rewire', deadline_type: 'eot_notification', source_record_type: 'variation', source_record_id: 'vo-004', due_at: daysFromNow(3), status: 'due_soon' },
  { id: 'dl-05', organisation_id: '', job_id: 'sl-1042', job_reference: 'SL-1042', job_name: 'Riverside bathroom suite', deadline_type: 'retention_release', source_record_type: 'retention_record', source_record_id: 'rr-01', due_at: daysFromNow(5), status: 'due_soon' },
  { id: 'dl-06', organisation_id: '', job_id: 'sl-1042', job_reference: 'SL-1042', job_name: 'Riverside bathroom suite', deadline_type: 'final_date_for_payment', source_record_type: 'payment_application', source_record_id: 'pa-03', due_at: daysFromNow(12), status: 'upcoming' },
  { id: 'dl-07', organisation_id: '', job_id: 'sl-1056', job_reference: 'SL-1056', job_name: 'Meadow Vale loft conversion', deadline_type: 'payment_notice', source_record_type: 'payment_application', source_record_id: 'pa-04', due_at: daysFromNow(1), status: 'due_soon' },
  { id: 'dl-08', organisation_id: '', job_id: 'sl-1056', job_reference: 'SL-1056', job_name: 'Meadow Vale loft conversion', deadline_type: 'pay_less_notice', source_record_type: 'payment_application', source_record_id: 'pa-04', due_at: daysFromNow(4), status: 'due_soon' },
  { id: 'dl-09', organisation_id: '', job_id: 'sl-1043', job_reference: 'SL-1043', job_name: 'Canary Wharf fit-out', deadline_type: 'loss_expense_notification', source_record_type: 'variation', source_record_id: 'vo-006', due_at: daysFromNow(7), status: 'upcoming' },
  { id: 'dl-10', organisation_id: '', job_id: 'sl-1043', job_reference: 'SL-1043', job_name: 'Canary Wharf fit-out', deadline_type: 'defects_liability_end', source_record_type: 'retention_record', source_record_id: 'rr-02', due_at: daysFromNow(140), status: 'upcoming' },
  { id: 'dl-11', organisation_id: '', job_id: 'sl-1048', job_reference: 'SL-1048', job_name: 'Oakfield kitchen extension', deadline_type: 'payment_notice', source_record_type: 'payment_application', source_record_id: 'pa-05', due_at: daysFromNow(0, 9), status: 'upcoming' },
  { id: 'dl-12', organisation_id: '', job_id: 'sl-1051', job_reference: 'SL-1051', job_name: 'Harcourt office rewire', deadline_type: 'final_date_for_payment', source_record_type: 'payment_application', source_record_id: 'pa-06', due_at: daysFromNow(-3), status: 'overdue' },
];