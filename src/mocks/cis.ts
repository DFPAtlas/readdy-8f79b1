export type VerificationStatus = 'verified' | 'unverified' | 'gross';

export interface Subcontractor {
  id: string;
  name: string;
  trade: string;
  utr: string;
  verificationStatus: VerificationStatus;
  deductionRate: string;
  verRegNo: string;
  verExpiry: string;
  vatNumber: string;
  drcActive: boolean;
  grossLabor: number;
  materialSplit: number;
  retention: number;
  netCisTax: number;
}

export const subcontractors: Subcontractor[] = [
  {
    id: 'sub-01',
    name: 'Apex Brickwork Ltd',
    trade: 'Masonry',
    utr: '3872914056',
    verificationStatus: 'verified',
    deductionRate: '20%',
    verRegNo: 'V000984721',
    verExpiry: '2027-03-18',
    vatNumber: 'GB 287 4410 92',
    drcActive: true,
    grossLabor: 18420.0,
    materialSplit: 4210.0,
    retention: 921.0,
    netCisTax: 2657.8,
  },
  {
    id: 'sub-02',
    name: 'Hargreaves Electrical Services',
    trade: 'Electrical',
    utr: '4401827365',
    verificationStatus: 'verified',
    deductionRate: '20%',
    verRegNo: 'V000998231',
    verExpiry: '2027-06-02',
    vatNumber: 'GB 933 2014 08',
    drcActive: true,
    grossLabor: 22100.0,
    materialSplit: 6120.0,
    retention: 1105.0,
    netCisTax: 2975.0,
  },
  {
    id: 'sub-03',
    name: 'Northgate Scaffolding Co',
    trade: 'Scaffolding',
    utr: '7739201564',
    verificationStatus: 'gross',
    deductionRate: '0%',
    verRegNo: 'V000874409',
    verExpiry: '2027-01-09',
    vatNumber: 'GB 511 7732 40',
    drcActive: true,
    grossLabor: 9640.0,
    materialSplit: 2180.0,
    retention: 0,
    netCisTax: 0,
  },
  {
    id: 'sub-04',
    name: 'De Silva Plastering',
    trade: 'Plastering',
    utr: '2108475392',
    verificationStatus: 'verified',
    deductionRate: '20%',
    verRegNo: 'V001021184',
    verExpiry: '2027-08-30',
    vatNumber: 'GB 102 4467 15',
    drcActive: true,
    grossLabor: 14280.0,
    materialSplit: 3550.0,
    retention: 714.0,
    netCisTax: 2003.2,
  },
  {
    id: 'sub-05',
    name: 'Walsh Groundworks Ltd',
    trade: 'Groundworks',
    utr: '6610348291',
    verificationStatus: 'unverified',
    deductionRate: '30%',
    verRegNo: '—',
    verExpiry: '—',
    vatNumber: 'GB 745 8821 03',
    drcActive: true,
    grossLabor: 27550.0,
    materialSplit: 8940.0,
    retention: 1377.5,
    netCisTax: 5169.75,
  },
  {
    id: 'sub-06',
    name: 'CJ Roofing & Cladding',
    trade: 'Roofing',
    utr: '9051847236',
    verificationStatus: 'verified',
    deductionRate: '20%',
    verRegNo: 'V000951208',
    verExpiry: '2027-04-22',
    vatNumber: 'GB 319 5504 76',
    drcActive: true,
    grossLabor: 16890.0,
    materialSplit: 4930.0,
    retention: 844.5,
    netCisTax: 2223.1,
  },
  {
    id: 'sub-07',
    name: 'Midlands Plant Hire',
    trade: 'Plant & Machinery',
    utr: '5289074316',
    verificationStatus: 'gross',
    deductionRate: '0%',
    verRegNo: 'V000903377',
    verExpiry: '2027-02-14',
    vatNumber: 'GB 664 1189 52',
    drcActive: true,
    grossLabor: 12100.0,
    materialSplit: 0,
    retention: 0,
    netCisTax: 0,
  },
  {
    id: 'sub-08',
    name: 'Ferro Steel Fixing',
    trade: 'Steel fixing',
    utr: '1562908473',
    verificationStatus: 'unverified',
    deductionRate: '30%',
    verRegNo: '—',
    verExpiry: '—',
    vatNumber: 'GB 208 7734 91',
    drcActive: false,
    grossLabor: 19320.0,
    materialSplit: 7110.0,
    retention: 966.0,
    netCisTax: 3373.2,
  },
  {
    id: 'sub-09',
    name: 'Atherton Joinery',
    trade: 'Joinery',
    utr: '8346201759',
    verificationStatus: 'verified',
    deductionRate: '20%',
    verRegNo: 'V001044596',
    verExpiry: '2027-09-11',
    vatNumber: 'GB 488 2205 37',
    drcActive: true,
    grossLabor: 15440.0,
    materialSplit: 4680.0,
    retention: 772.0,
    netCisTax: 1997.6,
  },
  {
    id: 'sub-10',
    name: 'Kestrel Mechanical Ltd',
    trade: 'Mechanical / HVAC',
    utr: '3029476185',
    verificationStatus: 'verified',
    deductionRate: '20%',
    verRegNo: 'V000977562',
    verExpiry: '2027-05-17',
    vatNumber: 'GB 795 3340 62',
    drcActive: true,
    grossLabor: 24680.0,
    materialSplit: 7310.0,
    retention: 1234.0,
    netCisTax: 3227.2,
  },
  {
    id: 'sub-11',
    name: 'Brookside Decorating',
    trade: 'Painting & Decorating',
    utr: '9821450637',
    verificationStatus: 'gross',
    deductionRate: '0%',
    verRegNo: 'V000859110',
    verExpiry: '2026-12-05',
    vatNumber: 'GB 611 9974 28',
    drcActive: true,
    grossLabor: 8960.0,
    materialSplit: 2140.0,
    retention: 0,
    netCisTax: 0,
  },
  {
    id: 'sub-12',
    name: 'Turner Drylining Ltd',
    trade: 'Drylining',
    utr: '4175308296',
    verificationStatus: 'verified',
    deductionRate: '20%',
    verRegNo: 'V001008743',
    verExpiry: '2027-07-25',
    vatNumber: 'GB 254 8810 44',
    drcActive: true,
    grossLabor: 13760.0,
    materialSplit: 3940.0,
    retention: 688.0,
    netCisTax: 1826.4,
  },
];

export const cisStatusBreakdown = {
  gross: 12,
  standard: 26,
  higher: 4,
};

export const summary = {
  totalActive: 42,
  drcRate: 92,
  drcActiveCount: 38,
  drcTotalContracts: 41,
  cis300DueInDays: 8,
  cis300DueDate: '5 September 2026',
};

export function formatGBP(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(value);
}

export function findSubcontractorByUtr(utr: string): Subcontractor | undefined {
  return subcontractors.find((s) => s.utr === utr.replace(/\s/g, ''));
}