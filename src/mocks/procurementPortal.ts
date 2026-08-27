export function formatGBP(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export interface JobOption {
  id: string;
  label: string;
  active?: boolean;
}

export const jobOptions: JobOption[] = [
  { id: '204', label: 'Job #204 - Oakridge Residential Phase 2', active: true },
  { id: '198', label: 'Job #198 - Riverside Commercial Fit-Out' },
  { id: '211', label: 'Job #211 - Northgate School Extension' },
];

export const procurementKpis = [
  {
    id: 'committed',
    label: 'Total Committed Spend (POs)',
    value: 342800,
    isMoney: true,
    supporting: 'Across 48 issued purchase orders',
    icon: 'ri-hand-coin-line',
    color: 'bg-status-green-pale text-status-green',
  },
  {
    id: 'requisitions',
    label: 'Pending Material Requisitions',
    value: 5,
    isMoney: false,
    supporting: 'Awaiting site manager approval',
    icon: 'ri-file-list-3-line',
    color: 'bg-status-amber-pale text-status-amber',
  },
  {
    id: 'invoices',
    label: 'Invoices Awaiting 3-Way Match',
    value: 68400,
    isMoney: true,
    supporting: '8 invoices under automated OCR review',
    icon: 'ri-bill-line',
    color: 'bg-status-blue-pale text-status-blue',
  },
  {
    id: 'hire',
    label: 'Active Plant & Tool Hire',
    value: 14200,
    isMoney: true,
    perMonth: true,
    supporting: '12 active hire items on site',
    icon: 'ri-tools-line',
    color: 'bg-status-purple-pale text-status-purple',
  },
];

export interface PurchaseOrderRow {
  id: string;
  reference: string;
  date: string;
  supplier: string;
  costCode: string;
  trade: string;
  value: number;
  deliveryPct: number;
  status: 'Approved' | 'Pending Approval' | 'Partially Delivered' | 'Fully Fulfilled' | 'Closed' | 'Rejected';
}

export const purchaseOrders: PurchaseOrderRow[] = [
  { id: 'po1', reference: '#PO-204-089', date: '22 Aug 2026', supplier: 'Travis Perkins', costCode: '03-Masonry', trade: 'Bricks & Blocks', value: 12450, deliveryPct: 80, status: 'Approved' },
  { id: 'po2', reference: '#PO-204-088', date: '20 Aug 2026', supplier: 'Jewson Ltd', costCode: '02-Timber', trade: 'Structural Timber', value: 8740, deliveryPct: 100, status: 'Fully Fulfilled' },
  { id: 'po3', reference: '#PO-204-090', date: '23 Aug 2026', supplier: 'CEF (City Electrical Factors)', costCode: '05-Electrical', trade: 'Containment & Cabling', value: 6320, deliveryPct: 0, status: 'Pending Approval' },
  { id: 'po4', reference: '#PO-204-085', date: '15 Aug 2026', supplier: 'SIG Roofing', costCode: '04-Roofing', trade: 'Flat Roof System', value: 18900, deliveryPct: 55, status: 'Partially Delivered' },
  { id: 'po5', reference: '#PO-204-091', date: '24 Aug 2026', supplier: 'Keyline (Civils)', costCode: '06-Groundworks', trade: 'Drainage & Ducting', value: 9150, deliveryPct: 0, status: 'Pending Approval' },
  { id: 'po6', reference: '#PO-204-081', date: '08 Aug 2026', supplier: 'Wickes', costCode: '07-Finishes', trade: 'Plasterboard & Drylining', value: 4280, deliveryPct: 100, status: 'Closed' },
];

export interface RequisitionRow {
  id: string;
  reference: string;
  description: string;
  requestedBy: string;
  requiredBy: string;
  value: number;
  urgent: boolean;
}

export const requisitions: RequisitionRow[] = [
  { id: 'r1', reference: 'REQ-204-132', description: 'Structural steel fixings — M20 bolts, plates & cleats', requestedBy: 'C. Whitfield', requiredBy: '28 Aug 2026', value: 2850, urgent: true },
  { id: 'r2', reference: 'REQ-204-133', description: 'PIR insulation board (100mm) for Level 3 externals', requestedBy: 'M. Turner', requiredBy: '30 Aug 2026', value: 1940, urgent: false },
  { id: 'r3', reference: 'REQ-204-134', description: 'Fire door ironmongery — hinges, closers & intumescent strips', requestedBy: 'D. Hughes', requiredBy: '01 Sep 2026', value: 1120, urgent: false },
  { id: 'r4', reference: 'REQ-204-135', description: 'Screed & floor levelling compound (Block B corridors)', requestedBy: 'J. Lawson', requiredBy: '02 Sep 2026', value: 1760, urgent: false },
  { id: 'r5', reference: 'REQ-204-136', description: 'Safety netting & edge protection for roof works', requestedBy: 'C. Whitfield', requiredBy: '27 Aug 2026', value: 2400, urgent: true },
];

export interface InvoiceLine {
  description: string;
  quantity: string;
  unitPrice: number;
  total: number;
}

export interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  supplier: string;
  invoiceDate: string;
  net: number;
  vat: number;
  gross: number;
  poReference: string;
  poMatched: boolean;
  grnMatched: boolean;
  grnReference?: string;
  priceVariance: number | null;
  lineItems: InvoiceLine[];
}

export const invoices: InvoiceRow[] = [
  {
    id: 'inv1',
    invoiceNumber: 'INV-99482',
    supplier: 'Travis Perkins',
    invoiceDate: '21 Aug 2026',
    net: 12450,
    vat: 2490,
    gross: 14940,
    poReference: '#PO-204-089',
    poMatched: true,
    grnMatched: true,
    grnReference: 'GRN #042',
    priceVariance: 180,
    lineItems: [
      { description: 'Facing bricks (Class B)', quantity: '2,400 no.', unitPrice: 4.1, total: 9840 },
      { description: 'C24 structural timber', quantity: '360 lm', unitPrice: 5.0, total: 1800 },
      { description: 'Haulage & crane offload', quantity: '1 job', unitPrice: 810, total: 810 },
    ],
  },
  {
    id: 'inv2',
    invoiceNumber: 'INV-99475',
    supplier: 'Jewson Ltd',
    invoiceDate: '19 Aug 2026',
    net: 8740,
    vat: 1748,
    gross: 10488,
    poReference: '#PO-204-088',
    poMatched: true,
    grnMatched: true,
    grnReference: 'GRN #040',
    priceVariance: null,
    lineItems: [
      { description: 'C24 timber sections', quantity: '680 lm', unitPrice: 12.0, total: 8160 },
      { description: 'Joist hangers', quantity: '120 no.', unitPrice: 4.83, total: 580 },
    ],
  },
  {
    id: 'inv3',
    invoiceNumber: 'INV-99468',
    supplier: 'SIG Roofing',
    invoiceDate: '18 Aug 2026',
    net: 18900,
    vat: 3780,
    gross: 22680,
    poReference: '#PO-204-085',
    poMatched: false,
    grnMatched: true,
    grnReference: 'GRN #039',
    priceVariance: null,
    lineItems: [
      { description: 'Single-ply membrane', quantity: '1,150 m2', unitPrice: 14.2, total: 16330 },
      { description: 'Insulation & vapour barrier', quantity: '1,150 m2', unitPrice: 2.23, total: 2570 },
    ],
  },
  {
    id: 'inv4',
    invoiceNumber: 'INV-99455',
    supplier: 'Keyline (Civils)',
    invoiceDate: '16 Aug 2026',
    net: 6120,
    vat: 1224,
    gross: 7344,
    poReference: '#PO-204-082',
    poMatched: true,
    grnMatched: false,
    priceVariance: null,
    lineItems: [
      { description: '110mm underground drainage', quantity: '420 lm', unitPrice: 11.5, total: 4830 },
      { description: 'Manhole rings & covers', quantity: '8 no.', unitPrice: 161.25, total: 1290 },
    ],
  },
];

export interface HireRecord {
  id: string;
  assetId: string;
  description: string;
  company: string;
  rate: number;
  rateUnit: string;
  startDate: string;
  offHireDate: string;
  daysRemaining: number;
}

export const hireRecords: HireRecord[] = [
  { id: 'h1', assetId: 'KX057-4', description: '5-Ton Kubota Mini Excavator', company: 'Speedy Hire', rate: 285, rateUnit: 'day', startDate: '18 Aug 2026', offHireDate: '28 Aug 2026', daysRemaining: 2 },
  { id: 'h2', assetId: 'SCAF-6M', description: '6m Scaffold Tower Package', company: 'HSS Hire', rate: 160, rateUnit: 'week', startDate: '10 Aug 2026', offHireDate: '03 Sep 2026', daysRemaining: 8 },
  { id: 'h3', assetId: 'GARIC-02', description: 'Site Accommodation — 2 Office Cabins', company: 'Garic', rate: 340, rateUnit: 'week', startDate: '01 Aug 2026', offHireDate: '15 Sep 2026', daysRemaining: 20 },
  { id: 'h4', assetId: 'THW-6T', description: '6-Ton Swivel Dumper', company: 'Speedy Hire', rate: 190, rateUnit: 'day', startDate: '20 Aug 2026', offHireDate: '27 Aug 2026', daysRemaining: 1 },
  { id: 'h5', assetId: 'GENIE-Z45', description: 'Mobile Elevating Work Platform (Z-45)', company: 'Nationwide Platforms', rate: 230, rateUnit: 'day', startDate: '22 Aug 2026', offHireDate: '30 Aug 2026', daysRemaining: 4 },
];