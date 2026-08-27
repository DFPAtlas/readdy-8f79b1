// ─── Payment Applications & Valuations Ledger demo data ───────────────────

export type LedgerStatus = 'paid' | 'certified_due' | 'pay_less' | 'under_review';

export interface LedgerDocument {
  name: string;
}

export interface LedgerEntry {
  id: string;
  reference: string;
  period: string;
  periodEnding: string;
  submittedDate: string;
  paymentNoticeDate: string;
  dueDate: string;
  grossApplied: number;
  retentionDeduction: number;
  netCertified: number;
  payLessReduction?: number;
  status: LedgerStatus;
  retentionRate: number;
  drcStatus: string;
  documents: LedgerDocument[];
}

export function formatGBP(v: number): string {
  return '£' + v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const ledgerSummary = {
  cumulativeApplied: 490000,
  netCertifiedPayable: 450500,
  retentionWithheld: 24500,
  retentionRate: 5.0,
};

export const ledgerEntries: LedgerEntry[] = [
  {
    id: 'app-005',
    reference: 'App #005',
    period: 'August 2026',
    periodEnding: '2026-08-25',
    submittedDate: '2026-08-18',
    paymentNoticeDate: '2026-08-20',
    dueDate: '2026-09-04',
    grossApplied: 185000,
    retentionDeduction: 9250,
    netCertified: 175750,
    status: 'certified_due',
    retentionRate: 5.0,
    drcStatus: 'DRC Applied - 0% Direct',
    documents: [
      { name: 'Original Tax Invoice.pdf' },
      { name: 'Payment Certificate.pdf' },
    ],
  },
  {
    id: 'app-004',
    reference: 'App #004',
    period: 'July 2026',
    periodEnding: '2026-07-25',
    submittedDate: '2026-07-17',
    paymentNoticeDate: '2026-07-20',
    dueDate: '2026-08-03',
    grossApplied: 118400,
    retentionDeduction: 5920,
    netCertified: 112480,
    status: 'paid',
    retentionRate: 5.0,
    drcStatus: 'DRC Applied - 0% Direct',
    documents: [
      { name: 'Original Tax Invoice.pdf' },
      { name: 'Payment Certificate.pdf' },
    ],
  },
  {
    id: 'app-003',
    reference: 'App #003',
    period: 'June 2026',
    periodEnding: '2026-06-25',
    submittedDate: '2026-06-17',
    paymentNoticeDate: '2026-06-22',
    dueDate: '2026-07-04',
    grossApplied: 96200,
    retentionDeduction: 4810,
    netCertified: 76390,
    payLessReduction: 15000,
    status: 'pay_less',
    retentionRate: 5.0,
    drcStatus: 'DRC Applied - 0% Direct',
    documents: [
      { name: 'Original Tax Invoice.pdf' },
      { name: 'Payment Certificate.pdf' },
      { name: 'Statutory Pay-Less Notice.pdf' },
    ],
  },
  {
    id: 'app-002',
    reference: 'App #002',
    period: 'May 2026',
    periodEnding: '2026-05-25',
    submittedDate: '2026-05-18',
    paymentNoticeDate: '2026-05-20',
    dueDate: '2026-06-04',
    grossApplied: 52000,
    retentionDeduction: 2600,
    netCertified: 49400,
    status: 'paid',
    retentionRate: 5.0,
    drcStatus: 'DRC Applied - 0% Direct',
    documents: [
      { name: 'Original Tax Invoice.pdf' },
      { name: 'Payment Certificate.pdf' },
    ],
  },
  {
    id: 'app-001',
    reference: 'App #001',
    period: 'April 2026',
    periodEnding: '2026-04-25',
    submittedDate: '2026-04-17',
    paymentNoticeDate: '2026-04-20',
    dueDate: '2026-05-04',
    grossApplied: 38400,
    retentionDeduction: 1920,
    netCertified: 36480,
    status: 'paid',
    retentionRate: 5.0,
    drcStatus: 'DRC Applied - 0% Direct',
    documents: [
      { name: 'Original Tax Invoice.pdf' },
      { name: 'Payment Certificate.pdf' },
    ],
  },
  {
    id: 'app-006',
    reference: 'App #006',
    period: 'September 2026',
    periodEnding: '2026-09-25',
    submittedDate: '2026-09-18',
    paymentNoticeDate: '2026-09-21',
    dueDate: '2026-10-03',
    grossApplied: 96000,
    retentionDeduction: 4800,
    netCertified: 91200,
    status: 'under_review',
    retentionRate: 5.0,
    drcStatus: 'DRC Applied - 0% Direct',
    documents: [
      { name: 'Original Tax Invoice.pdf' },
    ],
  },
  {
    id: 'app-007',
    reference: 'App #007',
    period: 'March 2026',
    periodEnding: '2026-03-25',
    submittedDate: '2026-03-18',
    paymentNoticeDate: '2026-03-20',
    dueDate: '2026-04-04',
    grossApplied: 31200,
    retentionDeduction: 1560,
    netCertified: 29640,
    status: 'paid',
    retentionRate: 5.0,
    drcStatus: 'DRC Applied - 0% Direct',
    documents: [
      { name: 'Original Tax Invoice.pdf' },
      { name: 'Payment Certificate.pdf' },
    ],
  },
  {
    id: 'app-008',
    reference: 'App #008',
    period: 'February 2026',
    periodEnding: '2026-02-25',
    submittedDate: '2026-02-17',
    paymentNoticeDate: '2026-02-20',
    dueDate: '2026-03-04',
    grossApplied: 28600,
    retentionDeduction: 1430,
    netCertified: 27170,
    status: 'paid',
    retentionRate: 5.0,
    drcStatus: 'DRC Applied - 0% Direct',
    documents: [
      { name: 'Original Tax Invoice.pdf' },
      { name: 'Payment Certificate.pdf' },
    ],
  },
];