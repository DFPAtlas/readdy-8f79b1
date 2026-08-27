// ─── Executive Command Center — demo data ───────────────────────────────

export function formatGBP(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(value);
}

// ─── Section 1 — Executive KPI Command Bar ─────────────────────────────

export type KpiTone = 'primary' | 'blue' | 'green' | 'amber';

export interface ExecutiveKpi {
  id: string;
  label: string;
  icon: string;
  tone: KpiTone;
  value?: number;
  isMoney?: boolean;
  supporting: string;
  change?: string;
  changePositive?: boolean;
  trend?: number[];
  link?: string;
  badge?: { icon: string; label: string; tone: 'green' };
}

export const executiveKpis: ExecutiveKpi[] = [
  {
    id: 'portfolio',
    label: 'Active Portfolio Value',
    icon: 'ri-building-2-line',
    tone: 'primary',
    value: 4280000,
    isMoney: true,
    supporting: 'across 8 active jobs',
    change: '+8.2% vs Q2',
    changePositive: true,
    trend: [32, 38, 36, 44, 50, 47, 56, 62, 68, 74],
  },
  {
    id: 'liquidity',
    label: 'Net Monthly Cash Liquidity',
    icon: 'ri-line-chart-line',
    tone: 'blue',
    value: 482500,
    isMoney: true,
    supporting: 'surplus · 6 payment apps cleared',
    link: 'Cash Flow Forecast',
  },
  {
    id: 'cis',
    label: 'CIS & HMRC Compliance',
    icon: 'ri-shield-check-line',
    tone: 'green',
    supporting: '42 Subcontractors Verified · 0 Overdue CIS300',
    badge: { icon: 'ri-check-line', label: 'Compliant', tone: 'green' },
  },
  {
    id: 'deadlines',
    label: 'Urgent Statutory Deadlines',
    icon: 'ri-alarm-warning-line',
    tone: 'amber',
    supporting: '2 Pay-Less Cutoffs & 1 Off-Hire Release due within 48h',
    change: '48h window',
    changePositive: false,
  },
];

// ─── Section 2 — Widget A: Commercial Health Matrix ────────────────────

export type JobHealthStatus = 'on-budget' | 'margin-warning' | 'at-risk';

export interface CommercialHealthRow {
  id: string;
  code: string;
  name: string;
  grossMarginPct: number;
  completionPct: number;
  openVariations: number;
  status: JobHealthStatus;
  statusLabel: string;
}

export const commercialHealthRows: CommercialHealthRow[] = [
  { id: '204', code: '#204', name: 'Oakridge Residential Phase 2', grossMarginPct: 18.4, completionPct: 72, openVariations: 24500, status: 'on-budget', statusLabel: 'On Budget' },
  { id: '198', code: '#198', name: 'Ashford Retail Fit-Out', grossMarginPct: 22.1, completionPct: 64, openVariations: 11800, status: 'on-budget', statusLabel: 'On Budget' },
  { id: '215', code: '#215', name: 'Riverside Flats — Block C', grossMarginPct: 11.2, completionPct: 48, openVariations: 32750, status: 'margin-warning', statusLabel: 'Margin Warning' },
  { id: '190', code: '#190', name: 'Maple Court Refurbishment', grossMarginPct: 16.7, completionPct: 81, openVariations: 6400, status: 'on-budget', statusLabel: 'On Budget' },
  { id: '211', code: '#211', name: 'The Forge Industrial Units', grossMarginPct: 8.9, completionPct: 39, openVariations: 19800, status: 'at-risk', statusLabel: 'At Risk' },
  { id: '207', code: '#207', name: 'Cedar View Gardens', grossMarginPct: 24.3, completionPct: 90, openVariations: 0, status: 'on-budget', statusLabel: 'On Budget' },
  { id: '104', code: '#104', name: 'Oakridge Phase 2 — Block B', grossMarginPct: 14.6, completionPct: 55, openVariations: 15700, status: 'margin-warning', statusLabel: 'Margin Warning' },
  { id: '178', code: '#178', name: 'Whitmore Office Fit-Out', grossMarginPct: 19.8, completionPct: 33, openVariations: 9200, status: 'on-budget', statusLabel: 'On Budget' },
];

// ─── Section 2 — Widget B: Pending Approvals & Deadlines ───────────────

export type ApprovalTone = 'red' | 'amber' | 'purple';

export interface PendingApproval {
  id: string;
  title: string;
  subtitle: string;
  deadline?: string;
  tone: ApprovalTone;
  actions: string[];
  route?: string;
}

export const pendingApprovals: PendingApproval[] = [
  {
    id: 'pay-less-204',
    title: 'Pay-Less Notice Deadline — Job #204',
    subtitle: 'Oakridge Phase 2 · certified £175,750.00 · final date for payment approaching',
    deadline: '36h remaining',
    tone: 'red',
    actions: ['Issue Notice', 'Certify'],
    route: '/payments',
  },
  {
    id: 'vo-007',
    title: 'Variation VO-007 Sign-off',
    subtitle: '+£12,400.00 · Oakridge Phase 2 · awaiting client approval',
    tone: 'amber',
    actions: ['Review Variation'],
    route: '/variations',
  },
  {
    id: 'hmrc-apex',
    title: 'HMRC Subcontractor Verification Required',
    subtitle: 'Apex Masonry UTR verification pending · CIS deduction blocked',
    tone: 'purple',
    actions: ['Verify UTR'],
    route: '/compliance',
  },
];

// ─── Section 2 — Widget C: Live Field Feed ─────────────────────────────

export type FieldFeedType = 'weather' | 'voice' | 'snag' | 'labour';

export interface FieldFeedItem {
  id: string;
  type: FieldFeedType;
  text: string;
  meta: string;
  time: string;
}

export const fieldFeedItems: FieldFeedItem[] = [
  {
    id: 'ff-1',
    type: 'weather',
    text: 'Weather log tagged — light rain, wind 12mph at Oakridge Phase 2',
    meta: 'Site diary · #204',
    time: '9m ago',
  },
  {
    id: 'ff-2',
    type: 'voice',
    text: 'Voice note transcribed: “Steel delivered to plot 4, two beams short — chasing supplier.”',
    meta: 'Daily log · #215',
    time: '26m ago',
  },
  {
    id: 'ff-3',
    type: 'snag',
    text: 'Photo snag dropped on drawing pin — cracked lintel above kitchen window',
    meta: 'Snagging · #190',
    time: '48m ago',
  },
  {
    id: 'ff-4',
    type: 'labour',
    text: '6 operatives clocked in · 48 labour hours logged across 3 jobs',
    meta: 'Attendance · All sites',
    time: '1h ago',
  },
];

// ─── Section 2 — Widget E: Procurement & Plant Hire Leakage ────────────

export const plantHireAlert = {
  activeMachines: 24,
  standingRate: 4850,
  idleAssets: [
    { id: 'idle-1', name: '5-Ton Kubota Mini Excavator', daysIdle: 4 },
    { id: 'idle-2', name: 'Tower Scaffold — 3 levels', daysIdle: 2 },
  ],
};

// ─── Section 2 — Widget F: HMRC CIS & Monthly Return ───────────────────

export const cisFiling = {
  deadlineLabel: '19 Sept 2026',
  daysRemaining: 24,
  withheldThisMonth: 42180,
  verifiedSubcontractors: 42,
  overdueReturns: 0,
};

// ─── Quick Navigation Footer ───────────────────────────────────────────

export const quickNavLinks = [
  { id: 'procurement', label: 'Procurement & POs', icon: 'ri-shopping-cart-2-line', route: '/procurement' },
  { id: 'valuations', label: 'Statutory Valuations', icon: 'ri-bank-card-line', route: '/payments' },
  { id: 'retainage', label: 'Retainage Scheduler', icon: 'ri-inbox-archive-line', route: '/retention' },
  { id: 'compliance', label: 'HMRC Compliance', icon: 'ri-shield-check-line', route: '/compliance' },
  { id: 'safety', label: 'Safety & Snagging', icon: 'ri-camera-line', route: '/evidence' },
];