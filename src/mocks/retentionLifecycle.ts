export type PartyType = 'client' | 'subcontractor';

export type StageStatus = 'released' | 'due' | 'countdown' | 'ready';

export interface ReleaseStage {
  dueDate: string;
  amount: number;
  status: StageStatus;
  statusLabel: string;
  monthsRemaining?: number;
}

export interface RetentionLedgerRow {
  id: string;
  reference: string;
  partyName: string;
  partyType: PartyType;
  totalRetention: number;
  stage1: ReleaseStage;
  stage2: ReleaseStage;
}

export interface PipelineStage {
  key: string;
  step: number;
  title: string;
  description: string;
  badge: string;
  state: 'active' | 'next' | 'upcoming';
}

export const retentionCashPool = {
  receivable: 142500.0,
  receivableJobs: 6,
  payable: 88200.0,
  payableSubcontracts: 18,
  nextRelease: 22500.0,
  nextReleaseJob: 'Oakridge Residential Phase 2',
  nextReleaseStage: 'Practical Completion',
  nextReleaseTiming: 'next month',
};

export const milestoneAlert = {
  jobRef: '#104',
  jobName: 'Oakridge Residential Phase 2 — Block B',
  releaseAmount: 12500.0,
  releasePct: 50,
  signedOffDate: '26 Aug 2026',
};

export const pipelineStages: PipelineStage[] = [
  {
    key: 'execution',
    step: 1,
    title: 'Contract Execution',
    description: 'Ongoing 5% retention withheld from every certified payment across the programme.',
    badge: '5% Withheld',
    state: 'active',
  },
  {
    key: 'practical-completion',
    step: 2,
    title: 'Practical Completion (PC)',
    description: 'Triggers the first 50% release — half of the total retention pool returned to the party.',
    badge: '50% First Release (2.5%)',
    state: 'next',
  },
  {
    key: 'defects-liability',
    step: 3,
    title: 'Defects Liability Period (DLP)',
    description: '12-month countdown from PC, after which the final 50% release is certified.',
    badge: 'Final 50% Release',
    state: 'upcoming',
  },
];

export const retentionLedgerRows: RetentionLedgerRow[] = [
  // Receivable — held by clients
  {
    id: 'rl-01',
    reference: '#204 Oakridge Residential Phase 2',
    partyName: 'Oakridge Developments Ltd',
    partyType: 'client',
    totalRetention: 45000,
    stage1: { dueDate: '28 Sep 2026', amount: 22500, status: 'due', statusLabel: 'Due for Release' },
    stage2: { dueDate: '28 Sep 2027', amount: 22500, status: 'countdown', statusLabel: '12 Months Remaining', monthsRemaining: 12 },
  },
  {
    id: 'rl-02',
    reference: '#198 Ashford Retail Fit-Out',
    partyName: 'Ashford Retail Group',
    partyType: 'client',
    totalRetention: 23500,
    stage1: { dueDate: '15 Mar 2026', amount: 11750, status: 'released', statusLabel: 'Released' },
    stage2: { dueDate: '15 Mar 2027', amount: 11750, status: 'countdown', statusLabel: '7 Months Remaining', monthsRemaining: 7 },
  },
  {
    id: 'rl-03',
    reference: '#215 Riverside Flats',
    partyName: 'Riverside Property Holdings',
    partyType: 'client',
    totalRetention: 26000,
    stage1: { dueDate: '12 Oct 2026', amount: 13000, status: 'due', statusLabel: 'Due for Release' },
    stage2: { dueDate: '12 Oct 2027', amount: 13000, status: 'countdown', statusLabel: '13 Months Remaining', monthsRemaining: 13 },
  },
  {
    id: 'rl-04',
    reference: '#190 Maple Court Refurbishment',
    partyName: 'Maple Court Estates',
    partyType: 'client',
    totalRetention: 18500,
    stage1: { dueDate: '02 Feb 2026', amount: 9250, status: 'released', statusLabel: 'Released' },
    stage2: { dueDate: '02 Feb 2027', amount: 9250, status: 'countdown', statusLabel: '5 Months Remaining', monthsRemaining: 5 },
  },
  {
    id: 'rl-05',
    reference: '#211 The Forge Industrial Units',
    partyName: 'Forge Developments Ltd',
    partyType: 'client',
    totalRetention: 14000,
    stage1: { dueDate: '05 Nov 2026', amount: 7000, status: 'due', statusLabel: 'Due for Release' },
    stage2: { dueDate: '05 Nov 2027', amount: 7000, status: 'countdown', statusLabel: '14 Months Remaining', monthsRemaining: 14 },
  },
  {
    id: 'rl-06',
    reference: '#207 Cedar View Gardens',
    partyName: 'Cedar View Housing Association',
    partyType: 'client',
    totalRetention: 15500,
    stage1: { dueDate: '28 Jul 2026', amount: 7750, status: 'released', statusLabel: 'Released' },
    stage2: { dueDate: '28 Jul 2027', amount: 7750, status: 'countdown', statusLabel: '11 Months Remaining', monthsRemaining: 11 },
  },
  // Payable — held from subcontractors
  {
    id: 'rl-07',
    reference: 'C-1421 Apex Brickwork Ltd',
    partyName: 'Apex Brickwork Ltd',
    partyType: 'subcontractor',
    totalRetention: 18400,
    stage1: { dueDate: '12 Sep 2026', amount: 9200, status: 'due', statusLabel: 'Due for Release' },
    stage2: { dueDate: '12 Sep 2027', amount: 9200, status: 'countdown', statusLabel: '12 Months Remaining', monthsRemaining: 12 },
  },
  {
    id: 'rl-08',
    reference: 'C-1389 Hargreaves Electrical',
    partyName: 'Hargreaves Electrical Services',
    partyType: 'subcontractor',
    totalRetention: 12750,
    stage1: { dueDate: '28 May 2026', amount: 6375, status: 'released', statusLabel: 'Released' },
    stage2: { dueDate: '28 May 2027', amount: 6375, status: 'countdown', statusLabel: '9 Months Remaining', monthsRemaining: 9 },
  },
  {
    id: 'rl-09',
    reference: 'C-1502 Kestrel Mechanical',
    partyName: 'Kestrel Mechanical Ltd',
    partyType: 'subcontractor',
    totalRetention: 21300,
    stage1: { dueDate: '05 Oct 2026', amount: 10650, status: 'due', statusLabel: 'Due for Release' },
    stage2: { dueDate: '05 Oct 2027', amount: 10650, status: 'countdown', statusLabel: '13 Months Remaining', monthsRemaining: 13 },
  },
  {
    id: 'rl-10',
    reference: 'C-1447 CJ Roofing & Cladding',
    partyName: 'CJ Roofing & Cladding',
    partyType: 'subcontractor',
    totalRetention: 15600,
    stage1: { dueDate: '30 Sep 2026', amount: 7800, status: 'due', statusLabel: 'Due for Release' },
    stage2: { dueDate: '30 Sep 2027', amount: 7800, status: 'countdown', statusLabel: '13 Months Remaining', monthsRemaining: 13 },
  },
  {
    id: 'rl-11',
    reference: 'C-1365 Northgate Scaffolding',
    partyName: 'Northgate Scaffolding Co',
    partyType: 'subcontractor',
    totalRetention: 9200,
    stage1: { dueDate: '11 Aug 2025', amount: 4600, status: 'released', statusLabel: 'Released' },
    stage2: { dueDate: '11 Aug 2026', amount: 4600, status: 'ready', statusLabel: 'Ready for Final Release' },
  },
  {
    id: 'rl-12',
    reference: 'C-1472 De Silva Plastering',
    partyName: 'De Silva Plastering',
    partyType: 'subcontractor',
    totalRetention: 10950,
    stage1: { dueDate: '18 Sep 2026', amount: 5475, status: 'due', statusLabel: 'Due for Release' },
    stage2: { dueDate: '18 Sep 2027', amount: 5475, status: 'countdown', statusLabel: '12 Months Remaining', monthsRemaining: 12 },
  },
];

export function formatGBP(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(value);
}