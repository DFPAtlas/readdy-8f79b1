// ─── Types ───────────────────────────────────────────────

export type ReportSection = 'overview' | 'jobs' | 'commercial' | 'cash_flow' | 'workforce' | 'compliance' | 'site_activity' | 'clients' | 'subcontractors' | 'saved' | 'scheduled' | 'export_history';

export type PresetPeriod = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_tax_year' | 'last_tax_year' | 'custom';

export type JobHealthStatus = 'on_track' | 'attention_needed' | 'at_risk' | 'critical' | 'insufficient_data';

export type ClientHealthStatus = 'strong' | 'normal' | 'attention' | 'high_commercial_risk' | 'insufficient_data';

export type ReportPackType = 'jobs' | 'commercial' | 'cash_flow' | 'workforce' | 'compliance' | 'site_activity' | 'client' | 'subcontractor' | 'custom_management';

export type ReportFormat = 'internal_management' | 'finance_only' | 'client_safe' | 'subcontractor_specific';

export type ReportScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'specific_day';

export type ReportRunTrigger = 'manual' | 'scheduled' | 'api';

export type ReportRunStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type ReportOutputFormat = 'pdf' | 'csv';

export interface ReportSummaryCard {
  id: string;
  label: string;
  value: string;
  previousValue?: string;
  changePct?: number;
  changeIsPositive?: boolean;
  tooltip: string;
  linkRoute: string;
  category: 'commercial' | 'jobs' | 'cash' | 'compliance' | 'workforce' | 'actions';
}

export interface JobPerformanceRow {
  jobId: string;
  jobRef: string;
  jobName: string;
  clientName: string;
  projectManager: string;
  status: string;
  statusColor: string;
  startDate: string;
  targetCompletion: string;
  progress: number;
  revisedContractValue: number;
  applicationsIssued: number;
  paymentsReceived: number;
  outstandingValue: number;
  approvedVariations: number;
  openDelays: number;
  complianceIssues: number;
  lastSiteUpdate: string;
  healthStatus: JobHealthStatus;
  healthReasons: string[];
}

export interface CommercialMetric {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  tooltip: string;
}

export interface CashFlowSummary {
  totalOutstanding: number;
  totalOverdue: number;
  dueNext7Days: number;
  dueNext30Days: number;
  expectedRetentionReleases: number;
  paymentsReceivedThisMonth: number;
  averagePaymentDelay: number;
  oldestUnpaidDays: number;
}

export interface ReceivablesAgeing {
  label: string;
  range: string;
  amount: number;
  count: number;
  color: string;
}

export interface ClientPerformanceRow {
  clientId: string;
  clientName: string;
  activeJobs: number;
  totalRevisedContractValue: number;
  applicationsIssued: number;
  paymentsReceived: number;
  outstandingAmount: number;
  overdueAmount: number;
  averageDaysToPay: number;
  openVariationDecisions: number;
  approvalResponseTimeDays: number;
  lastActivity: string;
  healthStatus: ClientHealthStatus;
}

export interface WorkforceReportMetric {
  id: string;
  label: string;
  value: string;
  tooltip: string;
}

export interface SubcontractorPerformanceRow {
  business: string;
  trade: string;
  activeAssignments: number;
  completedAssignments: number;
  complianceStatus: string;
  evidenceSubmitted: number;
  variationsRaised: number;
  paymentStatus: string;
  retentionBalance: number;
  lastActivity: string;
}

export interface SiteActivityMetric {
  id: string;
  label: string;
  value: string;
  tooltip: string;
}

export interface ComplianceMetric {
  id: string;
  label: string;
  value: string;
  tooltip: string;
  denominator?: string;
  explanation?: string;
}

export interface SavedReport {
  id: string;
  name: string;
  description: string;
  reportType: ReportPackType;
  filterConfig: Record<string, unknown>;
  selectedSections: string[];
  visibility: ReportFormat;
  sharedWithRoles: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface ReportSchedule {
  id: string;
  savedReportId: string;
  reportName: string;
  frequency: ReportScheduleFrequency;
  dayOfMonth?: number;
  recipients: string[];
  deliveryTime: string;
  timezone: string;
  outputFormat: ReportOutputFormat;
  clientSafe: boolean;
  active: boolean;
  nextRun: string;
  lastRun?: string;
  lastStatus?: string;
}

export interface ReportRun {
  id: string;
  reportId: string;
  reportName: string;
  trigger: ReportRunTrigger;
  startedAt: string;
  completedAt?: string;
  status: ReportRunStatus;
  outputFormat: ReportOutputFormat;
  outputPath?: string;
  errorCategory?: string;
  createdBy: string;
}

export interface ReportSnapshot {
  id: string;
  reportId: string;
  reportType: ReportPackType;
  generatedBy: string;
  visibility: ReportFormat;
  snapshotTimestamp: string;
  outputPath?: string;
  version: number;
  superseded: boolean;
  relatedJobId?: string;
  relatedClientId?: string;
}

// ─── Demo Report Summary Cards ────────────────────────

export const demoReportSummaryCards: ReportSummaryCard[] = [
  {
    id: 'card-1',
    label: 'Active jobs',
    value: '5',
    previousValue: '4',
    changePct: 25,
    changeIsPositive: true,
    tooltip: 'Total number of jobs currently in progress across the organisation.',
    linkRoute: '/reports/jobs',
    category: 'jobs',
  },
  {
    id: 'card-2',
    label: 'Contracted value',
    value: '£165,530',
    previousValue: '£127,030',
    changePct: 30,
    changeIsPositive: true,
    tooltip: 'Sum of all original contract values for active jobs.',
    linkRoute: '/reports/commercial',
    category: 'commercial',
  },
  {
    id: 'card-3',
    label: 'Approved variation value',
    value: '£13,750',
    previousValue: '£8,140',
    changePct: 69,
    changeIsPositive: true,
    tooltip: 'Sum of all approved variation values. Excludes pending, rejected and withdrawn variations.',
    linkRoute: '/reports/commercial',
    category: 'commercial',
  },
  {
    id: 'card-4',
    label: 'Revised contract value',
    value: '£179,280',
    previousValue: '£135,170',
    changePct: 33,
    changeIsPositive: true,
    tooltip: 'Original contract value plus approved variations only. Pending and rejected variations excluded.',
    linkRoute: '/reports/commercial',
    category: 'commercial',
  },
  {
    id: 'card-5',
    label: 'Applications issued',
    value: '£96,470',
    previousValue: '£72,800',
    changePct: 33,
    changeIsPositive: true,
    tooltip: 'Total value of payment applications issued to clients across all active jobs.',
    linkRoute: '/reports/cash-flow',
    category: 'commercial',
  },
  {
    id: 'card-6',
    label: 'Payments received',
    value: '£62,330',
    previousValue: '£48,100',
    changePct: 30,
    changeIsPositive: true,
    tooltip: 'Total payments received. Each payment counted only against its application.',
    linkRoute: '/reports/cash-flow',
    category: 'cash',
  },
  {
    id: 'card-7',
    label: 'Outstanding receivables',
    value: '£41,640',
    previousValue: '£28,740',
    changePct: 45,
    changeIsPositive: false,
    tooltip: 'Total amount invoiced but not yet paid. Increasing balance requires attention.',
    linkRoute: '/reports/cash-flow',
    category: 'cash',
  },
  {
    id: 'card-8',
    label: 'Overdue receivables',
    value: '£8,640',
    previousValue: '£3,200',
    changePct: 170,
    changeIsPositive: false,
    tooltip: 'Total amount past its due date. This represents a commercial risk.',
    linkRoute: '/reports/cash-flow',
    category: 'cash',
  },
  {
    id: 'card-9',
    label: 'Retention held',
    value: '£5,380',
    previousValue: '£2,100',
    changePct: 156,
    changeIsPositive: true,
    tooltip: 'Total retention money held by clients across all active contracts.',
    linkRoute: '/reports/commercial',
    category: 'commercial',
  },
  {
    id: 'card-10',
    label: 'Workforce compliance rate',
    value: '92%',
    previousValue: '88%',
    changePct: 4,
    changeIsPositive: true,
    tooltip: 'Percentage of active assigned workers who currently meet all mandatory requirements.',
    linkRoute: '/reports/compliance',
    category: 'compliance',
  },
  {
    id: 'card-11',
    label: 'Open actions',
    value: '7',
    previousValue: '9',
    changePct: -22,
    changeIsPositive: true,
    tooltip: 'Total actions requiring attention: pending variations, overdue payments, compliance expiries, and client decisions.',
    linkRoute: '/reports/overview',
    category: 'actions',
  },
  {
    id: 'card-12',
    label: 'Jobs requiring attention',
    value: '2',
    previousValue: '1',
    changePct: 100,
    changeIsPositive: false,
    tooltip: 'Jobs flagged as at risk or critical based on delays, overdue payments, compliance gaps, and missing site activity.',
    linkRoute: '/reports/jobs',
    category: 'jobs',
  },
];

// ─── Demo Job Performance ─────────────────────────────

export const demoJobPerformance: JobPerformanceRow[] = [
  {
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    clientName: 'Sarah & Ben Miller',
    projectManager: 'Martin Hewett',
    status: 'On site',
    statusColor: 'green',
    startDate: '2026-06-15',
    targetCompletion: '2026-08-22',
    progress: 68,
    revisedContractValue: 45740,
    applicationsIssued: 28600,
    paymentsReceived: 19960,
    outstandingValue: 8640,
    approvedVariations: 3240,
    openDelays: 1,
    complianceIssues: 0,
    lastSiteUpdate: 'Today',
    healthStatus: 'attention_needed',
    healthReasons: ['Payment application £8,640 overdue by 3 days', 'Building Control delay — 1 working day'],
  },
  {
    jobId: 'sl-1051',
    jobRef: 'SL-1051',
    jobName: 'Harcourt office rewire',
    clientName: 'Northlight Studio Ltd',
    projectManager: 'Martin Hewett',
    status: 'Approval needed',
    statusColor: 'amber',
    startDate: '2026-07-20',
    targetCompletion: '2026-08-17',
    progress: 42,
    revisedContractValue: 20650,
    applicationsIssued: 9450,
    paymentsReceived: 5250,
    outstandingValue: 4200,
    approvedVariations: 1900,
    openDelays: 0,
    complianceIssues: 1,
    lastSiteUpdate: 'Today',
    healthStatus: 'attention_needed',
    healthReasons: ['Public liability insurance expires in 8 days', 'Variation 004 awaiting client approval — 2 days'],
  },
  {
    jobId: 'sl-1042',
    jobRef: 'SL-1042',
    jobName: 'Riverside bathroom suite',
    clientName: 'Priya Shah',
    projectManager: 'Martin Hewett',
    status: 'Finishing',
    statusColor: 'blue',
    startDate: '2026-07-06',
    targetCompletion: '2026-08-07',
    progress: 91,
    revisedContractValue: 13560,
    applicationsIssued: 11000,
    paymentsReceived: 11000,
    outstandingValue: 2560,
    approvedVariations: 760,
    openDelays: 0,
    complianceIssues: 0,
    lastSiteUpdate: 'Yesterday',
    healthStatus: 'on_track',
    healthReasons: ['Within programme', 'All payments current', 'No compliance gaps'],
  },
  {
    jobId: 'sl-1054',
    jobRef: 'SL-1054',
    jobName: 'Meadow View boiler replacement',
    clientName: 'Robert Ellis',
    projectManager: 'James Lawrence',
    status: 'Starting soon',
    statusColor: 'blue',
    startDate: '2026-08-07',
    targetCompletion: '2026-08-08',
    progress: 10,
    revisedContractValue: 5480,
    applicationsIssued: 1920,
    paymentsReceived: 1920,
    outstandingValue: 1640,
    approvedVariations: 0,
    openDelays: 0,
    complianceIssues: 0,
    lastSiteUpdate: 'Yesterday',
    healthStatus: 'on_track',
    healthReasons: ['Equipment delivery confirmed', 'Gas Safe engineer assigned', 'All compliance current'],
  },
  {
    jobId: 'sl-1039',
    jobRef: 'SL-1039',
    jobName: 'Kingsway retail refurbishment',
    clientName: 'Kingsway Retail Group',
    projectManager: 'Martin Hewett',
    status: 'At risk',
    statusColor: 'red',
    startDate: '2026-06-01',
    targetCompletion: '2026-09-05',
    progress: 57,
    revisedContractValue: 93850,
    applicationsIssued: 48500,
    paymentsReceived: 24200,
    outstandingValue: 24600,
    approvedVariations: 7850,
    openDelays: 1,
    complianceIssues: 0,
    lastSiteUpdate: '2 days ago',
    healthStatus: 'at_risk',
    healthReasons: ['Drawing discrepancy unresolved — 1 day overdue', 'Outstanding payment £24,600 — largest single exposure', 'Milestone slippage of 3 days in structural phase'],
  },
];

// ─── Demo Commercial Metrics ───────────────────────────

export const demoCommercialMetrics: CommercialMetric[] = [
  { id: 'cm-1', label: 'Original contract value', value: 165530, formattedValue: '£165,530', tooltip: 'Sum of all original contract values.' },
  { id: 'cm-2', label: 'Approved variation value', value: 13750, formattedValue: '£13,750', tooltip: 'Approved variations only. Excludes pending, rejected and withdrawn.' },
  { id: 'cm-3', label: 'Revised contract value', value: 179280, formattedValue: '£179,280', tooltip: 'Original + approved variations only.' },
  { id: 'cm-4', label: 'Pending variation value', value: 7364, formattedValue: '£7,364', tooltip: 'Variations sent to client but not yet decided.' },
  { id: 'cm-5', label: 'Rejected variation value', value: 0, formattedValue: '£0', tooltip: 'Variations formally declined by the client.' },
  { id: 'cm-6', label: 'Applications issued', value: 96470, formattedValue: '£96,470', tooltip: 'Total payment applications issued.' },
  { id: 'cm-7', label: 'Payments received', value: 62330, formattedValue: '£62,330', tooltip: 'Recorded receipts matched to applications.' },
  { id: 'cm-8', label: 'Outstanding receivables', value: 41640, formattedValue: '£41,640', tooltip: 'Invoiced but not yet paid.' },
  { id: 'cm-9', label: 'Overdue receivables', value: 8640, formattedValue: '£8,640', tooltip: 'Past due date.' },
  { id: 'cm-10', label: 'Retention held', value: 5380, formattedValue: '£5,380', tooltip: 'Retention across all active contracts.' },
  { id: 'cm-11', label: 'Retention released', value: 0, formattedValue: '£0', tooltip: 'Retention released to date.' },
  { id: 'cm-12', label: 'CIS deductions', value: 0, formattedValue: '£0', tooltip: 'CIS deductions recorded this tax year.' },
  { id: 'cm-13', label: 'Subcontractor payments', value: 4800, formattedValue: '£4,800', tooltip: 'Payments made to subcontractors this period.' },
];

// ─── Demo Cash Flow ────────────────────────────────────

export const demoCashFlowSummary: CashFlowSummary = {
  totalOutstanding: 41640,
  totalOverdue: 8640,
  dueNext7Days: 4200,
  dueNext30Days: 16400,
  expectedRetentionReleases: 2100,
  paymentsReceivedThisMonth: 5250,
  averagePaymentDelay: 12,
  oldestUnpaidDays: 28,
};

export const demoReceivablesAgeing: ReceivablesAgeing[] = [
  { label: 'Not yet due', range: 'Current', amount: 18600, count: 3, color: 'bg-status-green' },
  { label: '1–30 days overdue', range: 'Early', amount: 8640, count: 1, color: 'bg-status-amber' },
  { label: '31–60 days overdue', range: 'Moderate', amount: 8200, count: 1, color: 'bg-status-orange' },
  { label: '61–90 days overdue', range: 'Late', amount: 6200, count: 1, color: 'bg-status-red' },
  { label: 'More than 90 days', range: 'Critical', amount: 0, count: 0, color: 'bg-red-800' },
];

export interface CashFlowForecastItem {
  id: string;
  jobRef: string;
  description: string;
  amount: number;
  dueDate: string;
  expectedDate: string;
  status: 'confirmed' | 'expected' | 'at_risk' | 'overdue';
  statusLabel: string;
}

export const demoCashFlowForecast: CashFlowForecastItem[] = [
  { id: 'fc-1', jobRef: 'SL-1048', description: 'Stage 3 application', amount: 8640, dueDate: '2026-07-30', expectedDate: '2026-08-07', status: 'overdue', statusLabel: 'Overdue' },
  { id: 'fc-2', jobRef: 'SL-1051', description: 'Stage 2 application', amount: 4200, dueDate: '2026-08-12', expectedDate: '2026-08-19', status: 'confirmed', statusLabel: 'Confirmed' },
  { id: 'fc-3', jobRef: 'SL-1042', description: 'Final payment', amount: 2560, dueDate: '2026-08-10', expectedDate: '2026-08-14', status: 'expected', statusLabel: 'Expected' },
  { id: 'fc-4', jobRef: 'SL-1039', description: 'Stage 4 application', amount: 18500, dueDate: '2026-08-20', expectedDate: '2026-09-01', status: 'at_risk', statusLabel: 'At risk' },
  { id: 'fc-5', jobRef: 'SL-1048', description: 'Retention release — groundwork', amount: 2100, dueDate: '2026-09-28', expectedDate: '2026-10-05', status: 'expected', statusLabel: 'Expected' },
  { id: 'fc-6', jobRef: 'SL-1054', description: 'Deposit balance', amount: 1640, dueDate: '2026-08-08', expectedDate: '2026-08-08', status: 'confirmed', statusLabel: 'Confirmed' },
];

// ─── Demo Client Performance ───────────────────────────

export const demoClientPerformance: ClientPerformanceRow[] = [
  {
    clientId: 'client-1',
    clientName: 'Sarah & Ben Miller',
    activeJobs: 1,
    totalRevisedContractValue: 45740,
    applicationsIssued: 28600,
    paymentsReceived: 19960,
    outstandingAmount: 8640,
    overdueAmount: 8640,
    averageDaysToPay: 18,
    openVariationDecisions: 1,
    approvalResponseTimeDays: 2,
    lastActivity: 'Today',
    healthStatus: 'attention',
  },
  {
    clientId: 'client-2',
    clientName: 'Northlight Studio Ltd',
    activeJobs: 1,
    totalRevisedContractValue: 20650,
    applicationsIssued: 9450,
    paymentsReceived: 5250,
    outstandingAmount: 4200,
    overdueAmount: 0,
    averageDaysToPay: 9,
    openVariationDecisions: 1,
    approvalResponseTimeDays: 4,
    lastActivity: 'Today',
    healthStatus: 'normal',
  },
  {
    clientId: 'client-3',
    clientName: 'Priya Shah',
    activeJobs: 1,
    totalRevisedContractValue: 13560,
    applicationsIssued: 11000,
    paymentsReceived: 11000,
    outstandingAmount: 2560,
    overdueAmount: 0,
    averageDaysToPay: 6,
    openVariationDecisions: 0,
    approvalResponseTimeDays: 0,
    lastActivity: 'Yesterday',
    healthStatus: 'strong',
  },
  {
    clientId: 'client-4',
    clientName: 'Robert Ellis',
    activeJobs: 1,
    totalRevisedContractValue: 5480,
    applicationsIssued: 1920,
    paymentsReceived: 1920,
    outstandingAmount: 1640,
    overdueAmount: 0,
    averageDaysToPay: 5,
    openVariationDecisions: 1,
    approvalResponseTimeDays: 0,
    lastActivity: 'Yesterday',
    healthStatus: 'normal',
  },
  {
    clientId: 'client-5',
    clientName: 'Kingsway Retail Group',
    activeJobs: 1,
    totalRevisedContractValue: 93850,
    applicationsIssued: 48500,
    paymentsReceived: 24200,
    outstandingAmount: 24600,
    overdueAmount: 0,
    averageDaysToPay: 22,
    openVariationDecisions: 0,
    approvalResponseTimeDays: 0,
    lastActivity: '2 days ago',
    healthStatus: 'high_commercial_risk',
  },
];

// ─── Demo Workforce Report ─────────────────────────────

export const demoWorkforceMetrics: WorkforceReportMetric[] = [
  { id: 'wm-1', label: 'Total active workforce', value: '6', tooltip: 'All currently active workers across the organisation.' },
  { id: 'wm-2', label: 'Employees', value: '3', tooltip: 'Directly employed workers.' },
  { id: 'wm-3', label: 'Sole traders', value: '1', tooltip: 'Self-employed individuals operating as sole traders.' },
  { id: 'wm-4', label: 'Subcontractor companies', value: '2', tooltip: 'Limited company subcontractors.' },
  { id: 'wm-5', label: 'Currently assigned', value: '5', tooltip: 'Workers currently assigned to active jobs.' },
  { id: 'wm-6', label: 'Available', value: '1', tooltip: 'Workers not currently assigned and available for work.' },
  { id: 'wm-7', label: 'Fully compliant', value: '4', tooltip: 'Workers meeting all mandatory requirements.' },
  { id: 'wm-8', label: 'Action required', value: '2', tooltip: 'Workers with expired or expiring documents requiring attention.' },
  { id: 'wm-9', label: 'Expiring within 30 days', value: '2', tooltip: 'Documents expiring in the next 30 days.' },
  { id: 'wm-10', label: 'Expired documents', value: '0', tooltip: 'Currently expired mandatory documents.' },
];

export const demoSubcontractorPerformance: SubcontractorPerformanceRow[] = [
  {
    business: 'D. Hughes Electrical',
    trade: 'Electrical',
    activeAssignments: 1,
    completedAssignments: 2,
    complianceStatus: 'Action required',
    evidenceSubmitted: 8,
    variationsRaised: 0,
    paymentStatus: 'Current',
    retentionBalance: 0,
    lastActivity: 'Today',
  },
  {
    business: 'AK Groundworks Ltd',
    trade: 'Groundworks and drainage',
    activeAssignments: 1,
    completedAssignments: 3,
    complianceStatus: 'Compliant',
    evidenceSubmitted: 14,
    variationsRaised: 0,
    paymentStatus: 'Current',
    retentionBalance: 380,
    lastActivity: 'Today',
  },
  {
    business: 'Patel Cable Systems Ltd',
    trade: 'Electrical',
    activeAssignments: 1,
    completedAssignments: 1,
    complianceStatus: 'Review needed',
    evidenceSubmitted: 4,
    variationsRaised: 0,
    paymentStatus: 'Current',
    retentionBalance: 0,
    lastActivity: '2 days ago',
  },
];

// ─── Demo Site Activity Report ─────────────────────────

export const demoSiteActivityMetrics: SiteActivityMetric[] = [
  { id: 'sa-1', label: 'Daily logs submitted', value: '12', tooltip: 'Total daily logs submitted across all active jobs this period.' },
  { id: 'sa-2', label: 'Missing expected daily logs', value: '2', tooltip: 'Working days without a submitted daily log for active jobs.' },
  { id: 'sa-3', label: 'Evidence uploaded', value: '42', tooltip: 'Total evidence records (photos, videos, notes, etc.) captured this period.' },
  { id: 'sa-4', label: 'Photos', value: '28', tooltip: 'Photographic evidence records.' },
  { id: 'sa-5', label: 'Voice notes', value: '6', tooltip: 'Voice note records.' },
  { id: 'sa-6', label: 'Deliveries recorded', value: '4', tooltip: 'Recorded material or equipment deliveries.' },
  { id: 'sa-7', label: 'Delays recorded', value: '2', tooltip: 'Recorded project delays.' },
  { id: 'sa-8', label: 'Safety observations', value: '3', tooltip: 'Safety observations recorded in daily logs.' },
  { id: 'sa-9', label: 'Client-visible updates', value: '8', tooltip: 'Evidence and updates published to client portals.' },
  { id: 'sa-10', label: 'Last recorded site activity', value: 'Today 12:05', tooltip: 'Most recent evidence or daily log timestamp.' },
];

export interface EvidenceCoverageDay {
  date: string;
  jobId: string;
  jobRef: string;
  hasLog: boolean;
  hasEvidence: boolean;
  isWorkingDay: boolean;
}

export const demoEvidenceCoverage: EvidenceCoverageDay[] = [
  { date: '2026-08-03', jobId: 'sl-1048', jobRef: 'SL-1048', hasLog: true, hasEvidence: true, isWorkingDay: true },
  { date: '2026-08-04', jobId: 'sl-1048', jobRef: 'SL-1048', hasLog: true, hasEvidence: true, isWorkingDay: true },
  { date: '2026-08-05', jobId: 'sl-1048', jobRef: 'SL-1048', hasLog: true, hasEvidence: true, isWorkingDay: true },
  { date: '2026-08-03', jobId: 'sl-1051', jobRef: 'SL-1051', hasLog: true, hasEvidence: true, isWorkingDay: true },
  { date: '2026-08-04', jobId: 'sl-1051', jobRef: 'SL-1051', hasLog: true, hasEvidence: true, isWorkingDay: true },
  { date: '2026-08-05', jobId: 'sl-1051', jobRef: 'SL-1051', hasLog: false, hasEvidence: false, isWorkingDay: true },
  { date: '2026-08-03', jobId: 'sl-1042', jobRef: 'SL-1042', hasLog: true, hasEvidence: true, isWorkingDay: true },
  { date: '2026-08-04', jobId: 'sl-1042', jobRef: 'SL-1042', hasLog: true, hasEvidence: false, isWorkingDay: true },
  { date: '2026-08-05', jobId: 'sl-1042', jobRef: 'SL-1042', hasLog: false, hasEvidence: false, isWorkingDay: true },
];

// ─── Demo Compliance Report ────────────────────────────

export const demoComplianceMetrics: ComplianceMetric[] = [
  {
    id: 'comp-1',
    label: 'Overall compliance rate',
    value: '92%',
    tooltip: 'Percentage of active assigned workers meeting all mandatory requirements.',
    denominator: '42 of 48 active assigned workers',
    explanation: '42 of 48 active assigned workers currently meet all mandatory requirements.',
  },
  {
    id: 'comp-2',
    label: 'Fully compliant workforce',
    value: '4',
    tooltip: 'Workers with no outstanding compliance issues.',
  },
  {
    id: 'comp-3',
    label: 'Action required',
    value: '2',
    tooltip: 'Workers with expiring or missing mandatory documents.',
  },
  {
    id: 'comp-4',
    label: 'Expiring in 7 days',
    value: '1',
    tooltip: 'Documents expiring within 7 calendar days.',
  },
  {
    id: 'comp-5',
    label: 'Expiring in 30 days',
    value: '2',
    tooltip: 'Documents expiring within 30 calendar days.',
  },
  {
    id: 'comp-6',
    label: 'Expired',
    value: '0',
    tooltip: 'Currently expired mandatory documents.',
  },
  {
    id: 'comp-7',
    label: 'Missing mandatory evidence',
    value: '0',
    tooltip: 'Required documents that have not been uploaded.',
  },
  {
    id: 'comp-8',
    label: 'Insurance gaps',
    value: '1',
    tooltip: 'Insurance policies expiring or expired without renewal evidence.',
  },
  {
    id: 'comp-9',
    label: 'Unreviewed submissions',
    value: '1',
    tooltip: 'Submitted documents awaiting review.',
  },
];

// ─── Demo Saved Reports ────────────────────────────────

export const demoSavedReports: SavedReport[] = [
  {
    id: 'sr-1',
    name: 'Monthly management report',
    description: 'Full monthly management pack covering all active jobs, commercial position and workforce compliance.',
    reportType: 'custom_management',
    filterConfig: { period: 'this_month', jobIds: [] },
    selectedSections: ['cover', 'job_details', 'commercial', 'workforce', 'compliance', 'timeline'],
    visibility: 'internal_management',
    sharedWithRoles: ['owner', 'admin', 'project_manager'],
    createdBy: 'Martin Hewett',
    createdAt: '2026-07-01T09:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'sr-2',
    name: 'Client progress report — Oakfield',
    description: 'Client-safe progress report for Oakfield kitchen extension.',
    reportType: 'jobs',
    filterConfig: { period: 'custom', jobIds: ['sl-1048'], dateFrom: '2026-07-01', dateTo: '2026-08-05' },
    selectedSections: ['cover', 'job_details', 'photos', 'timeline', 'inspections', 'variations'],
    visibility: 'client_safe',
    sharedWithRoles: [],
    createdBy: 'Martin Hewett',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'sr-3',
    name: 'Quarterly subcontractor review',
    description: 'Subcontractor performance and compliance summary for Q2 2026.',
    reportType: 'subcontractor',
    filterConfig: { period: 'last_quarter' },
    selectedSections: ['compliance', 'assignments', 'payments'],
    visibility: 'internal_management',
    sharedWithRoles: ['owner', 'admin'],
    createdBy: 'Amelia Brooks',
    createdAt: '2026-07-15T14:00:00Z',
    updatedAt: '2026-07-15T14:00:00Z',
  },
];

// ─── Demo Report Schedules ─────────────────────────────

export const demoReportSchedules: ReportSchedule[] = [
  {
    id: 'sch-1',
    savedReportId: 'sr-1',
    reportName: 'Monthly management report',
    frequency: 'monthly',
    dayOfMonth: 1,
    recipients: ['martin@siteledger.co.uk', 'amelia@siteledger.co.uk'],
    deliveryTime: '08:00',
    timezone: 'Europe/London',
    outputFormat: 'pdf',
    clientSafe: false,
    active: true,
    nextRun: '2026-09-01T08:00:00+01:00',
    lastRun: '2026-08-01T08:00:00+01:00',
    lastStatus: 'completed',
  },
  {
    id: 'sch-2',
    savedReportId: 'sr-2',
    reportName: 'Client progress report — Oakfield',
    frequency: 'weekly',
    recipients: ['sarah.miller@email.com'],
    deliveryTime: '08:00',
    timezone: 'Europe/London',
    outputFormat: 'pdf',
    clientSafe: true,
    active: true,
    nextRun: '2026-08-12T08:00:00+01:00',
    lastRun: '2026-08-05T08:00:00+01:00',
    lastStatus: 'completed',
  },
];

// ─── Demo Report Runs ──────────────────────────────────

export const demoReportRuns: ReportRun[] = [
  {
    id: 'run-1',
    reportId: 'sr-1',
    reportName: 'Monthly management report',
    trigger: 'scheduled',
    startedAt: '2026-08-01T08:00:00+01:00',
    completedAt: '2026-08-01T08:02:00+01:00',
    status: 'completed',
    outputFormat: 'pdf',
    outputPath: 'org-001/reports/run-1-monthly-management-aug-2026.pdf',
    createdBy: 'SiteLedger automation',
  },
  {
    id: 'run-2',
    reportId: 'sr-2',
    reportName: 'Client progress report — Oakfield',
    trigger: 'manual',
    startedAt: '2026-08-05T14:00:00+01:00',
    completedAt: '2026-08-05T14:01:00+01:00',
    status: 'completed',
    outputFormat: 'pdf',
    outputPath: 'org-001/reports/run-2-oakfield-aug-progress.pdf',
    createdBy: 'Martin Hewett',
  },
  {
    id: 'run-3',
    reportId: 'sr-1',
    reportName: 'Monthly management report',
    trigger: 'scheduled',
    startedAt: '2026-07-01T08:00:00+01:00',
    completedAt: null,
    status: 'failed',
    outputFormat: 'pdf',
    errorCategory: 'provider_timeout',
    createdBy: 'SiteLedger automation',
  },
];

// ─── Demo Report Snapshots ─────────────────────────────

export const demoReportSnapshots: ReportSnapshot[] = [
  {
    id: 'snap-1',
    reportId: 'sr-2',
    reportType: 'jobs',
    generatedBy: 'Martin Hewett',
    visibility: 'client_safe',
    snapshotTimestamp: '2026-08-01T10:15:00+01:00',
    outputPath: 'org-001/snapshots/snap-1-oakfield-aug-progress-v1.pdf',
    version: 1,
    superseded: true,
    relatedJobId: 'sl-1048',
    relatedClientId: 'client-1',
  },
  {
    id: 'snap-2',
    reportId: 'sr-2',
    reportType: 'jobs',
    generatedBy: 'Martin Hewett',
    visibility: 'client_safe',
    snapshotTimestamp: '2026-08-05T14:05:00+01:00',
    outputPath: 'org-001/snapshots/snap-2-oakfield-aug-progress-v2.pdf',
    version: 2,
    superseded: false,
    relatedJobId: 'sl-1048',
    relatedClientId: 'client-1',
  },
];

// ─── Helper functions ──────────────────────────────────

export function getPresetPeriodLabel(period: PresetPeriod): string {
  const labels: Record<string, string> = {
    this_week: 'This week',
    last_week: 'Last week',
    this_month: 'This month',
    last_month: 'Last month',
    this_quarter: 'This quarter',
    last_quarter: 'Last quarter',
    this_tax_year: 'This tax year',
    last_tax_year: 'Last tax year',
    custom: 'Custom range',
  };
  return labels[period] || period;
}

export function getJobHealthLabel(status: JobHealthStatus): string {
  const labels: Record<string, string> = {
    on_track: 'On track',
    attention_needed: 'Attention needed',
    at_risk: 'At risk',
    critical: 'Critical',
    insufficient_data: 'Insufficient data',
  };
  return labels[status] || status;
}

export function getJobHealthColor(status: JobHealthStatus): string {
  const colors: Record<string, string> = {
    on_track: 'bg-status-green text-white',
    attention_needed: 'bg-status-amber text-white',
    at_risk: 'bg-status-red text-white',
    critical: 'bg-red-800 text-white',
    insufficient_data: 'bg-gray-400 text-white',
  };
  return colors[status] || 'bg-gray-400 text-white';
}

export function getClientHealthLabel(status: ClientHealthStatus): string {
  const labels: Record<string, string> = {
    strong: 'Strong',
    normal: 'Normal',
    attention: 'Attention',
    high_commercial_risk: 'High commercial risk',
    insufficient_data: 'Insufficient data',
  };
  return labels[status] || status;
}

export function getClientHealthColor(status: ClientHealthStatus): string {
  const colors: Record<string, string> = {
    strong: 'bg-status-green text-white',
    normal: 'bg-blue-400 text-white',
    attention: 'bg-status-amber text-white',
    high_commercial_risk: 'bg-status-red text-white',
    insufficient_data: 'bg-gray-400 text-white',
  };
  return colors[status] || 'bg-gray-400 text-white';
}

export function getReportTypeLabel(type: ReportPackType): string {
  const labels: Record<string, string> = {
    jobs: 'Jobs',
    commercial: 'Commercial',
    cash_flow: 'Cash flow',
    workforce: 'Workforce',
    compliance: 'Compliance',
    site_activity: 'Site activity',
    client: 'Client',
    subcontractor: 'Subcontractor',
    custom_management: 'Custom management pack',
  };
  return labels[type] || type;
}

export function getRunStatusColor(status: ReportRunStatus): string {
  const colors: Record<string, string> = {
    queued: 'bg-status-blue text-white',
    processing: 'bg-status-amber text-white',
    completed: 'bg-status-green text-white',
    failed: 'bg-status-red text-white',
    cancelled: 'bg-gray-400 text-white',
  };
  return colors[status] || 'bg-gray-400 text-white';
}

export function formatGBP(value: number): string {
  return value.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
}

export function formatGBPCompact(value: number): string {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}m`;
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}k`;
  }
  return `£${value}`;
}

export const presetPeriods: PresetPeriod[] = [
  'this_week', 'last_week', 'this_month', 'last_month',
  'this_quarter', 'last_quarter', 'this_tax_year', 'last_tax_year', 'custom',
];

export const reportPackTypes: ReportPackType[] = [
  'jobs', 'commercial', 'cash_flow', 'workforce', 'compliance',
  'site_activity', 'client', 'subcontractor', 'custom_management',
];

export const reportFormats: ReportFormat[] = [
  'internal_management', 'finance_only', 'client_safe', 'subcontractor_specific',
];

export const reportPackSections = [
  { id: 'cover', label: 'Cover summary', category: 'general' },
  { id: 'job_details', label: 'Job details', category: 'general' },
  { id: 'timeline', label: 'Timeline', category: 'jobs' },
  { id: 'photos', label: 'Photos', category: 'jobs' },
  { id: 'daily_logs', label: 'Daily logs', category: 'jobs' },
  { id: 'labour', label: 'Labour summary', category: 'jobs' },
  { id: 'materials', label: 'Materials & deliveries', category: 'commercial' },
  { id: 'instructions', label: 'Instructions', category: 'jobs' },
  { id: 'delays', label: 'Delays', category: 'jobs' },
  { id: 'inspections', label: 'Inspections', category: 'jobs' },
  { id: 'variations', label: 'Variations', category: 'commercial' },
  { id: 'decisions', label: 'Decisions', category: 'jobs' },
  { id: 'documents', label: 'Documents', category: 'general' },
  { id: 'audit', label: 'Audit references', category: 'general' },
  { id: 'commercial', label: 'Commercial summary', category: 'commercial' },
  { id: 'workforce', label: 'Workforce summary', category: 'workforce' },
  { id: 'compliance', label: 'Compliance summary', category: 'compliance' },
  { id: 'payments', label: 'Payment summary', category: 'commercial' },
];

export const reportJobFilters = [
  { id: 'all', label: 'All jobs' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'on_hold', label: 'On hold' },
  { id: 'at_risk', label: 'At risk' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'archived', label: 'Archived' },
];

export const scheduleFrequencies: ReportScheduleFrequency[] = ['daily', 'weekly', 'monthly', 'specific_day'];