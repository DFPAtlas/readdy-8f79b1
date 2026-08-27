export type NoticeStatus = 'certified' | 'payless' | 'pending';

export type StageStatus = 'released' | 'due' | 'overdue' | 'upcoming';

export interface ValuationRow {
  id: string;
  jobRef: string;
  subcontractor: string;
  trade: string;
  appliedLabour: number;
  appliedMaterial: number;
  retentionPct: number;
  cisPct: number;
  status: NoticeStatus;
}

export interface ReleaseStage {
  label: string;
  pct: number;
  dueDate: string;
  status: StageStatus;
}

export interface RetentionContract {
  id: string;
  contractId: string;
  subcontractor: string;
  trade: string;
  totalRetention: number;
  stage1: ReleaseStage;
  stage2: ReleaseStage;
}

export interface TimelineStep {
  key: string;
  label: string;
  date: string;
  state: 'done' | 'active' | 'upcoming';
  note?: string;
}

export const retentionSummary = {
  withheldHeldByUs: 142500.0,
  receivableHeldByClients: 89200.0,
  upcomingReleases: 2,
  upcomingReleaseNote: 'due at Practical Completion this month',
  activeApplicationsTotal: 310000.0,
  activeApplicationsJobs: 8,
};

export const paylessAlert = {
  jobRef: '#204',
  jobName: 'Oakridge Site',
  hoursRemaining: 48,
  deadline: '30 August 2026 · 17:00',
};

export const oakridgeTimeline: TimelineStep[] = [
  { key: 'received', label: 'Application Received', date: '22 Aug 2026', state: 'done' },
  { key: 'valuation', label: 'Valuation Date', date: '26 Aug 2026', state: 'done' },
  { key: 'payment-notice', label: 'Payment Notice Deadline', date: '29 Aug 2026', state: 'done' },
  { key: 'payless-cutoff', label: 'Pay-Less Notice Cutoff', date: '30 Aug 2026 · 17:00', state: 'active', note: '48 hours remaining' },
  { key: 'final-due', label: 'Final Due Date', date: '12 Sep 2026', state: 'upcoming' },
];

export const valuationRows: ValuationRow[] = [
  {
    id: 'val-01',
    jobRef: '#204',
    subcontractor: 'Apex Brickwork Ltd',
    trade: 'Masonry',
    appliedLabour: 30000,
    appliedMaterial: 7000,
    retentionPct: 5.0,
    cisPct: 20,
    status: 'pending',
  },
  {
    id: 'val-02',
    jobRef: '#207',
    subcontractor: 'Hargreaves Electrical Services',
    trade: 'Electrical',
    appliedLabour: 28000,
    appliedMaterial: 7000,
    retentionPct: 5.0,
    cisPct: 20,
    status: 'certified',
  },
  {
    id: 'val-03',
    jobRef: '#198',
    subcontractor: 'Northgate Scaffolding Co',
    trade: 'Scaffolding',
    appliedLabour: 19000,
    appliedMaterial: 0,
    retentionPct: 5.0,
    cisPct: 0,
    status: 'certified',
  },
  {
    id: 'val-04',
    jobRef: '#211',
    subcontractor: 'Kestrel Mechanical Ltd',
    trade: 'Mechanical / HVAC',
    appliedLabour: 40000,
    appliedMaterial: 10000,
    retentionPct: 5.0,
    cisPct: 20,
    status: 'payless',
  },
  {
    id: 'val-05',
    jobRef: '#190',
    subcontractor: 'De Silva Plastering',
    trade: 'Plastering',
    appliedLabour: 22000,
    appliedMaterial: 5000,
    retentionPct: 5.0,
    cisPct: 20,
    status: 'certified',
  },
  {
    id: 'val-06',
    jobRef: '#215',
    subcontractor: 'CJ Roofing & Cladding',
    trade: 'Roofing',
    appliedLabour: 34000,
    appliedMaterial: 8500,
    retentionPct: 5.0,
    cisPct: 20,
    status: 'pending',
  },
  {
    id: 'val-07',
    jobRef: '#203',
    subcontractor: 'Ferro Steel Fixing',
    trade: 'Steel fixing',
    appliedLabour: 31000,
    appliedMaterial: 9000,
    retentionPct: 5.0,
    cisPct: 30,
    status: 'payless',
  },
  {
    id: 'val-08',
    jobRef: '#201',
    subcontractor: 'Turner Drylining Ltd',
    trade: 'Drylining',
    appliedLabour: 26000,
    appliedMaterial: 6000,
    retentionPct: 5.0,
    cisPct: 20,
    status: 'certified',
  },
];

export const retentionContracts: RetentionContract[] = [
  {
    id: 'rc-01',
    contractId: 'C-1421',
    subcontractor: 'Apex Brickwork Ltd',
    trade: 'Masonry',
    totalRetention: 18400,
    stage1: { label: 'Practical Completion', pct: 50, dueDate: '12 Sep 2026', status: 'due' },
    stage2: { label: 'End of DLP (12 months)', pct: 50, dueDate: '12 Sep 2027', status: 'upcoming' },
  },
  {
    id: 'rc-02',
    contractId: 'C-1389',
    subcontractor: 'Hargreaves Electrical Services',
    trade: 'Electrical',
    totalRetention: 12750,
    stage1: { label: 'Practical Completion', pct: 50, dueDate: '28 Aug 2026', status: 'overdue' },
    stage2: { label: 'End of DLP (12 months)', pct: 50, dueDate: '28 Aug 2027', status: 'upcoming' },
  },
  {
    id: 'rc-03',
    contractId: 'C-1502',
    subcontractor: 'Kestrel Mechanical Ltd',
    trade: 'Mechanical / HVAC',
    totalRetention: 21300,
    stage1: { label: 'Practical Completion', pct: 50, dueDate: '05 Oct 2026', status: 'upcoming' },
    stage2: { label: 'End of DLP (12 months)', pct: 50, dueDate: '05 Oct 2027', status: 'upcoming' },
  },
  {
    id: 'rc-04',
    contractId: 'C-1447',
    subcontractor: 'CJ Roofing & Cladding',
    trade: 'Roofing',
    totalRetention: 15600,
    stage1: { label: 'Practical Completion', pct: 50, dueDate: '30 Sep 2026', status: 'upcoming' },
    stage2: { label: 'End of DLP (12 months)', pct: 50, dueDate: '30 Sep 2027', status: 'upcoming' },
  },
  {
    id: 'rc-05',
    contractId: 'C-1365',
    subcontractor: 'Northgate Scaffolding Co',
    trade: 'Scaffolding',
    totalRetention: 9200,
    stage1: { label: 'Practical Completion', pct: 50, dueDate: '11 Mar 2026', status: 'released' },
    stage2: { label: 'End of DLP (12 months)', pct: 50, dueDate: '11 Mar 2027', status: 'upcoming' },
  },
];

export function formatGBP(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(value);
}

export function appliedTotal(row: ValuationRow): number {
  return row.appliedLabour + row.appliedMaterial;
}

export function retentionWithheld(row: ValuationRow): number {
  return (appliedTotal(row) * row.retentionPct) / 100;
}

export function cisDeduction(row: ValuationRow): number {
  return (row.appliedLabour * row.cisPct) / 100;
}

export function certifiedNet(row: ValuationRow): number {
  return appliedTotal(row) - retentionWithheld(row) - cisDeduction(row);
}