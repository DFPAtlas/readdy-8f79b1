// ─── Types ───────────────────────────────────────────────

export interface SiteAddress {
  addressLine1: string;
  addressLine2?: string;
  town: string;
  county: string;
  postcode: string;
  siteContactName?: string;
  siteContactNumber?: string;
  accessNotes?: string;
}

export interface JobClient {
  id: string;
  type: 'individual' | 'business';
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email: string;
  mobile: string;
  preferredContact: 'email' | 'mobile' | 'either';
  billingAddress: SiteAddress;
}

export interface JobTeamMember {
  id: string;
  initials: string;
  name: string;
  role: string;
  trade?: string;
  available: boolean;
  complianceState: 'compliant' | 'attention' | 'expired';
  insuranceExpiry?: string;
  missingCertificates?: string[];
}

export interface JobFinancialSummary {
  contractValue: number;
  approvedVariations: number;
  revisedContract: number;
  invoiced: number;
  paid: number;
  outstanding: number;
  retentionHeld: number;
}

export interface JobDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  category: string;
}

export interface ComplianceItem {
  id: string;
  label: string;
  checked: boolean;
  required: boolean;
}

export interface JobProgramme {
  startDate: string;
  estimatedDuration: number;
  durationUnit: 'days' | 'weeks' | 'months';
  targetCompletion: string;
  workingDays: string[];
  siteWorkingHours: string;
  projectManager: string;
  assignedEmployees: string[];
  subcontractors: string[];
  requiredTrades: string[];
  clientMilestones: string[];
}

export interface ContractDraftSummary {
  fileName?: string;
  contractType?: string;
  termCount?: number;
  documentId?: string;
}

export interface WizardDraft {
  step1?: {
    clientType: 'existing' | 'new';
    existingClientId?: string;
    clientTypeEntity?: 'individual' | 'business';
    firstName?: string;
    lastName?: string;
    companyName?: string;
    email?: string;
    mobile?: string;
    preferredContact?: 'email' | 'mobile' | 'either';
    billingAddress?: SiteAddress;
    useBillingAsSite?: boolean;
    siteAddress?: SiteAddress;
    siteContactName?: string;
    siteContactNumber?: string;
    accessNotes?: string;
  };
  step2?: {
    jobName?: string;
    jobReference?: string;
    jobCategory?: string;
    primaryTrade?: string;
    clientType?: string;
    workType?: string;
    description?: string;
    priority?: string;
    projectManager?: string;
    leadWorker?: string;
  };
  step3?: {
    contractType?: string;
    detailedScope?: string;
    includedWork?: string;
    excludedWork?: string;
    assumptions?: string;
    clientSuppliedItems?: string;
    pricingType?: string;
    estimatedValue?: number;
    vatTreatment?: string;
    depositRequired?: boolean;
    depositAmount?: number;
    depositPercentage?: number;
    retentionApplies?: boolean;
    retentionPercentage?: number;
    paymentTerms?: string;
    paymentSchedule?: string;
  };
  step4?: {
    startDate?: string;
    estimatedDuration?: number;
    durationUnit?: 'days' | 'weeks' | 'months';
    targetCompletion?: string;
    workingDays?: string[];
    siteWorkingHours?: string;
    projectManager?: string;
    assignedEmployees?: string[];
    subcontractors?: string[];
    requiredTrades?: string[];
    clientMilestones?: string[];
    warningsAcknowledged?: boolean;
  };
  step5?: {
    documents?: JobDocument[];
    complianceItems?: ComplianceItem[];
    ramsRequired?: 'yes' | 'no' | 'tbc';
    principalContractorRole?: 'our_company' | 'another' | 'client' | 'tbc';
  };
  contract?: ContractDraftSummary;
}

export interface FullJob {
  id: string;
  reference: string;
  project: string;
  client: string;
  clientId: string;
  clientDetails?: JobClient;
  site: string;
  sitePostcode: string;
  siteAddress?: SiteAddress;
  type: string;
  trade: string;
  category: string;
  status: string;
  statusColor: string;
  progress: number;
  nextAction: string;
  nextActionTime: string;
  workers: string[];
  teamMembers: JobTeamMember[];
  financials: JobFinancialSummary;
  risk: string;
  riskColor: string;
  updated: string;
  description: string;
  priority: string;
  projectManager: string;
  programme?: JobProgramme;
  complianceItems?: ComplianceItem[];
  documents?: JobDocument[];
  statusStep: 'draft' | 'active' | 'completed';
}

// ─── Demo Clients ────────────────────────────────────────

export const demoClients: JobClient[] = [
  {
    id: 'client-1',
    type: 'individual',
    firstName: 'Sarah',
    lastName: 'Miller',
    email: 'sarah.miller@email.com',
    mobile: '07912 345678',
    preferredContact: 'email',
    billingAddress: {
      addressLine1: '14 Oakfield Road',
      town: 'Leicester',
      county: 'Leicestershire',
      postcode: 'LE3 6RT',
    },
  },
  {
    id: 'client-2',
    type: 'business',
    companyName: 'Northlight Studio Ltd',
    email: 'accounts@northlightstudio.co.uk',
    mobile: '07789 123456',
    preferredContact: 'email',
    billingAddress: {
      addressLine1: '8 Harcourt Street',
      town: 'Nottingham',
      county: 'Nottinghamshire',
      postcode: 'NG1 4FG',
    },
  },
  {
    id: 'client-3',
    type: 'individual',
    firstName: 'Priya',
    lastName: 'Shah',
    email: 'priya.shah@email.com',
    mobile: '07845 987654',
    preferredContact: 'mobile',
    billingAddress: {
      addressLine1: '22 Riverside Close',
      town: 'Derby',
      county: 'Derbyshire',
      postcode: 'DE1 2FN',
    },
  },
  {
    id: 'client-4',
    type: 'individual',
    firstName: 'Robert',
    lastName: 'Ellis',
    email: 'robert.ellis@email.com',
    mobile: '07555 246801',
    preferredContact: 'either',
    billingAddress: {
      addressLine1: '6 Meadow View',
      town: 'Coventry',
      county: 'West Midlands',
      postcode: 'CV3 2LP',
    },
  },
  {
    id: 'client-5',
    type: 'business',
    companyName: 'Kingsway Retail Group',
    email: 'facilities@kingswayretail.co.uk',
    mobile: '0121 555 8900',
    preferredContact: 'email',
    billingAddress: {
      addressLine1: 'Unit 4, Kingsway Park',
      town: 'Birmingham',
      county: 'West Midlands',
      postcode: 'B24 9QR',
    },
  },
];

// ─── Demo Team Members ───────────────────────────────────

export const demoTeamMembers: JobTeamMember[] = [
  { id: 'worker-1', initials: 'MT', name: 'Martin Hewett', role: 'Project Manager', trade: 'General building', available: true, complianceState: 'compliant' },
  { id: 'worker-2', initials: 'JL', name: 'James Lawrence', role: 'Lead Carpenter', trade: 'Carpentry', available: true, complianceState: 'compliant' },
  { id: 'worker-3', initials: 'AK', name: 'Adam Khan', role: 'Labourer', trade: 'General building', available: true, complianceState: 'attention', missingCertificates: ['Asbestos awareness due December'], insuranceExpiry: '2027-01-15' },
  { id: 'worker-4', initials: 'DH', name: 'David Hughes', role: 'Electrician', trade: 'Electrical', available: true, complianceState: 'attention', insuranceExpiry: '2026-08-13', missingCertificates: ['Public liability expires in 8 days'] },
  { id: 'worker-5', initials: 'RP', name: 'Ruth Pearson', role: 'Apprentice Electrician', trade: 'Electrical', available: true, complianceState: 'compliant' },
  { id: 'worker-6', initials: 'CW', name: 'Chris Walker', role: 'Plumber', trade: 'Plumbing', available: true, complianceState: 'compliant' },
];

// ─── Demo Full Jobs ──────────────────────────────────────

export const demoFullJobs: FullJob[] = [
  {
    id: 'sl-1048',
    reference: 'SL-1048',
    project: 'Oakfield kitchen extension',
    client: 'Sarah & Ben Miller',
    clientId: 'client-1',
    clientDetails: demoClients[0],
    site: '14 Oakfield Road, Leicester',
    sitePostcode: 'LE3 6RT',
    siteAddress: {
      addressLine1: '14 Oakfield Road',
      town: 'Leicester',
      county: 'Leicestershire',
      postcode: 'LE3 6RT',
      siteContactName: 'Sarah Miller',
      siteContactNumber: '07912 345678',
      accessNotes: 'Side gate access via driveway. Dog in garden — please keep gate closed.',
    },
    type: 'Residential extension',
    trade: 'General build',
    category: 'Extension',
    status: 'On site',
    statusColor: 'green',
    progress: 68,
    nextAction: 'Steel installation',
    nextActionTime: 'Today · 10:30',
    workers: ['MT', 'JL', 'AK'],
    teamMembers: [demoTeamMembers[0], demoTeamMembers[1], demoTeamMembers[2]],
    financials: {
      contractValue: 42500,
      approvedVariations: 3240,
      revisedContract: 45740,
      invoiced: 28600,
      paid: 19960,
      outstanding: 8640,
      retentionHeld: 0,
    },
    risk: 'Payment overdue',
    riskColor: 'red',
    updated: '12 minutes ago',
    description: 'Single-storey rear kitchen extension with bi-fold doors, roof lantern, and underfloor heating. Full kitchen fit-out included.',
    priority: 'High',
    projectManager: 'Martin Hewett',
    programme: {
      startDate: '2026-06-15',
      estimatedDuration: 10,
      durationUnit: 'weeks',
      targetCompletion: '2026-08-22',
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      siteWorkingHours: '08:00 – 16:30',
      projectManager: 'Martin Hewett',
      assignedEmployees: ['MT', 'JL', 'AK'],
      subcontractors: ['Brickwork Ltd (bricklayers)', 'SteelCo (steel supply & fit)'],
      requiredTrades: ['General building', 'Carpentry', 'Plumbing', 'Electrical'],
      clientMilestones: ['Kitchen design sign-off', 'Bi-fold door colour choice'],
    },
    complianceItems: [
      { id: 'c1', label: 'Written scope agreed', checked: true, required: true },
      { id: 'c2', label: 'Quote or contract accepted', checked: true, required: true },
      { id: 'c3', label: 'Client identity recorded', checked: true, required: true },
      { id: 'c4', label: 'Site address verified', checked: true, required: true },
      { id: 'c5', label: 'Public liability checked', checked: true, required: true },
      { id: 'c6', label: 'Workforce competency checked', checked: true, required: true },
      { id: 'c7', label: 'RAMS required', checked: true, required: true },
      { id: 'c8', label: 'Building Control involvement', checked: true, required: true },
      { id: 'c9', label: 'Planning permission involvement', checked: true, required: true },
      { id: 'c10', label: 'CDM duties reviewed', checked: false, required: true },
      { id: 'c11', label: 'Asbestos information available', checked: false, required: true },
      { id: 'c12', label: 'Welfare arrangements confirmed', checked: true, required: true },
    ],
    documents: [
      { id: 'doc-1', name: 'Client brief — Oakfield extension', type: 'PDF', size: '1.2 MB', category: 'Client brief' },
      { id: 'doc-2', name: 'Architect drawings — rev 3', type: 'PDF', size: '4.8 MB', category: 'Drawings' },
      { id: 'doc-3', name: 'Structural calculations', type: 'PDF', size: '890 KB', category: 'Specifications' },
      { id: 'doc-4', name: 'JCT Minor Works contract', type: 'PDF', size: '2.1 MB', category: 'Contract' },
    ],
    statusStep: 'active',
  },
  {
    id: 'sl-1051',
    reference: 'SL-1051',
    project: 'Harcourt office rewire',
    client: 'Northlight Studio Ltd',
    clientId: 'client-2',
    clientDetails: demoClients[1],
    site: '8 Harcourt Street, Nottingham',
    sitePostcode: 'NG1 4FG',
    siteAddress: {
      addressLine1: '8 Harcourt Street',
      town: 'Nottingham',
      county: 'Nottinghamshire',
      postcode: 'NG1 4FG',
      siteContactName: 'James North',
      siteContactNumber: '07789 123456',
      accessNotes: 'Reception desk key code: 4821. Parking in visitor bays only. Working hours restricted to 08:00–18:00.',
    },
    type: 'Commercial electrical',
    trade: 'Electrical',
    category: 'Refurbishment',
    status: 'Approval needed',
    statusColor: 'amber',
    progress: 42,
    nextAction: 'Client approval for Variation 004',
    nextActionTime: 'Waiting 2 days',
    workers: ['DH', 'RP'],
    teamMembers: [demoTeamMembers[3], demoTeamMembers[4]],
    financials: {
      contractValue: 18750,
      approvedVariations: 1900,
      revisedContract: 20650,
      invoiced: 9450,
      paid: 5250,
      outstanding: 4200,
      retentionHeld: 0,
    },
    risk: 'Approval delay',
    riskColor: 'amber',
    updated: '38 minutes ago',
    description: 'Full office rewire across two floors including data cabling, new distribution board, emergency lighting, and floor box installation.',
    priority: 'Medium',
    projectManager: 'Martin Hewett',
    programme: {
      startDate: '2026-07-20',
      estimatedDuration: 4,
      durationUnit: 'weeks',
      targetCompletion: '2026-08-17',
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      siteWorkingHours: '08:00 – 18:00',
      projectManager: 'Martin Hewett',
      assignedEmployees: ['DH', 'RP'],
      subcontractors: [],
      requiredTrades: ['Electrical'],
      clientMilestones: ['Phase 1 (ground floor) sign-off'],
    },
    complianceItems: [
      { id: 'c1', label: 'Written scope agreed', checked: true, required: true },
      { id: 'c2', label: 'Quote or contract accepted', checked: true, required: true },
      { id: 'c3', label: 'Client identity recorded', checked: true, required: true },
      { id: 'c4', label: 'Site address verified', checked: true, required: true },
      { id: 'c5', label: 'Public liability checked', checked: false, required: true },
      { id: 'c6', label: 'Workforce competency checked', checked: true, required: true },
      { id: 'c7', label: 'RAMS required', checked: true, required: true },
      { id: 'c8', label: 'Building Control involvement', checked: false, required: false },
    ],
    documents: [
      { id: 'doc-5', name: 'Electrical specification', type: 'PDF', size: '650 KB', category: 'Specifications' },
      { id: 'doc-6', name: 'Floor plans — ground & first', type: 'PDF', size: '3.2 MB', category: 'Drawings' },
    ],
    statusStep: 'active',
  },
  {
    id: 'sl-1042',
    reference: 'SL-1042',
    project: 'Riverside bathroom suite',
    client: 'Priya Shah',
    clientId: 'client-3',
    clientDetails: demoClients[2],
    site: '22 Riverside Close, Derby',
    sitePostcode: 'DE1 2FN',
    siteAddress: {
      addressLine1: '22 Riverside Close',
      town: 'Derby',
      county: 'Derbyshire',
      postcode: 'DE1 2FN',
      siteContactName: 'Priya Shah',
      siteContactNumber: '07845 987654',
      accessNotes: 'Parking on driveway. Please use protective floor coverings throughout.',
    },
    type: 'Residential refurbishment',
    trade: 'Plumbing',
    category: 'Refurbishment',
    status: 'Finishing',
    statusColor: 'blue',
    progress: 91,
    nextAction: 'Client walkthrough',
    nextActionTime: 'Today · 15:00',
    workers: ['CW', 'MT'],
    teamMembers: [demoTeamMembers[5], demoTeamMembers[0]],
    financials: {
      contractValue: 12800,
      approvedVariations: 760,
      revisedContract: 13560,
      invoiced: 11000,
      paid: 11000,
      outstanding: 2560,
      retentionHeld: 0,
    },
    risk: 'None',
    riskColor: 'green',
    updated: '1 hour ago',
    description: 'Complete bathroom refurbishment including new suite, tiling, underfloor heating, and ventilation. First-floor bathroom in Victorian terrace.',
    priority: 'Medium',
    projectManager: 'Martin Hewett',
    programme: {
      startDate: '2026-07-06',
      estimatedDuration: 3,
      durationUnit: 'weeks',
      targetCompletion: '2026-08-07',
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      siteWorkingHours: '08:00 – 16:00',
      projectManager: 'Martin Hewett',
      assignedEmployees: ['CW', 'MT'],
      subcontractors: ['TilePro (tiling)'],
      requiredTrades: ['Plumbing', 'Tiling', 'Carpentry'],
      clientMilestones: ['Tile selection', 'Suite choice confirmed'],
    },
    complianceItems: [
      { id: 'c1', label: 'Written scope agreed', checked: true, required: true },
      { id: 'c2', label: 'Quote or contract accepted', checked: true, required: true },
      { id: 'c3', label: 'Client identity recorded', checked: true, required: true },
      { id: 'c4', label: 'Site address verified', checked: true, required: true },
      { id: 'c5', label: 'Public liability checked', checked: true, required: true },
      { id: 'c6', label: 'Workforce competency checked', checked: true, required: true },
      { id: 'c7', label: 'RAMS required', checked: false, required: false },
    ],
    documents: [
      { id: 'doc-7', name: 'Bathroom design — final', type: 'PDF', size: '1.5 MB', category: 'Drawings' },
      { id: 'doc-8', name: 'Tile schedule', type: 'PDF', size: '320 KB', category: 'Specifications' },
    ],
    statusStep: 'active',
  },
  {
    id: 'sl-1054',
    reference: 'SL-1054',
    project: 'Meadow View boiler replacement',
    client: 'Robert Ellis',
    clientId: 'client-4',
    clientDetails: demoClients[3],
    site: '6 Meadow View, Coventry',
    sitePostcode: 'CV3 2LP',
    siteAddress: {
      addressLine1: '6 Meadow View',
      town: 'Coventry',
      county: 'West Midlands',
      postcode: 'CV3 2LP',
      siteContactName: 'Robert Ellis',
      siteContactNumber: '07555 246801',
      accessNotes: 'Boiler located in garage. Side door access.',
    },
    type: 'Heating installation',
    trade: 'Heating and gas',
    category: 'Installation',
    status: 'Starting soon',
    statusColor: 'blue',
    progress: 10,
    nextAction: 'Confirm equipment delivery',
    nextActionTime: 'Tomorrow · 08:00',
    workers: ['JL'],
    teamMembers: [demoTeamMembers[1]],
    financials: {
      contractValue: 5480,
      approvedVariations: 0,
      revisedContract: 5480,
      invoiced: 1920,
      paid: 1920,
      outstanding: 1640,
      retentionHeld: 0,
    },
    risk: 'None',
    riskColor: 'green',
    updated: 'Yesterday',
    description: 'Replace existing combi boiler with new A-rated Worcester Bosch unit. Includes flush, new thermostat, and magnetic filter.',
    priority: 'Low',
    projectManager: 'Martin Hewett',
    programme: {
      startDate: '2026-08-07',
      estimatedDuration: 2,
      durationUnit: 'days',
      targetCompletion: '2026-08-08',
      workingDays: ['Thu', 'Fri'],
      siteWorkingHours: '08:00 – 16:00',
      projectManager: 'Martin Hewett',
      assignedEmployees: ['JL'],
      subcontractors: [],
      requiredTrades: ['Heating and gas'],
      clientMilestones: [],
    },
    complianceItems: [
      { id: 'c1', label: 'Written scope agreed', checked: true, required: true },
      { id: 'c2', label: 'Quote or contract accepted', checked: true, required: true },
      { id: 'c3', label: 'Client identity recorded', checked: true, required: true },
      { id: 'c4', label: 'Site address verified', checked: true, required: true },
      { id: 'c5', label: 'Public liability checked', checked: true, required: true },
      { id: 'c6', label: 'Gas Safe register checked', checked: true, required: true },
    ],
    documents: [
      { id: 'doc-9', name: 'Boiler quote', type: 'PDF', size: '280 KB', category: 'Quote or estimate' },
    ],
    statusStep: 'active',
  },
  {
    id: 'sl-1039',
    reference: 'SL-1039',
    project: 'Kingsway retail refurbishment',
    client: 'Kingsway Retail Group',
    clientId: 'client-5',
    clientDetails: demoClients[4],
    site: 'Unit 4, Kingsway Park, Birmingham',
    sitePostcode: 'B24 9QR',
    siteAddress: {
      addressLine1: 'Unit 4, Kingsway Park',
      town: 'Birmingham',
      county: 'West Midlands',
      postcode: 'B24 9QR',
      siteContactName: 'Mark Stevens',
      siteContactNumber: '0121 555 8900',
      accessNotes: 'Delivery entrance at rear via service road. Site induction required before starting. High-vis and hard hat mandatory.',
    },
    type: 'Commercial refurbishment',
    trade: 'Multi-trade',
    category: 'Refurbishment',
    status: 'At risk',
    statusColor: 'red',
    progress: 57,
    nextAction: 'Resolve drawing discrepancy',
    nextActionTime: 'Overdue by 1 day',
    workers: ['MT', 'AK', 'DH', 'RP'],
    teamMembers: [demoTeamMembers[0], demoTeamMembers[2], demoTeamMembers[3], demoTeamMembers[4]],
    financials: {
      contractValue: 86000,
      approvedVariations: 7850,
      revisedContract: 93850,
      invoiced: 48500,
      paid: 24200,
      outstanding: 24600,
      retentionHeld: 0,
    },
    risk: 'Programme delay',
    riskColor: 'red',
    updated: 'Yesterday',
    description: 'Full retail unit refurbishment including strip-out, new shopfront, flooring, suspended ceiling, lighting, HVAC, and decoration.',
    priority: 'High',
    projectManager: 'Martin Hewett',
    programme: {
      startDate: '2026-06-01',
      estimatedDuration: 14,
      durationUnit: 'weeks',
      targetCompletion: '2026-09-05',
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      siteWorkingHours: '07:00 – 17:00 (Mon–Fri), 08:00–13:00 (Sat)',
      projectManager: 'Martin Hewett',
      assignedEmployees: ['MT', 'AK', 'DH', 'RP'],
      subcontractors: ['Shopfront Solutions Ltd', 'Ceiling & Partition Co', 'HVAC Midlands'],
      requiredTrades: ['General building', 'Electrical', 'Carpentry', 'Plastering', 'Decorating'],
      clientMilestones: ['Shopfront design approval', 'Floor finish selection', 'Lighting layout sign-off'],
    },
    complianceItems: [
      { id: 'c1', label: 'Written scope agreed', checked: true, required: true },
      { id: 'c2', label: 'Quote or contract accepted', checked: true, required: true },
      { id: 'c3', label: 'Client identity recorded', checked: true, required: true },
      { id: 'c4', label: 'Site address verified', checked: true, required: true },
      { id: 'c5', label: 'Public liability checked', checked: true, required: true },
      { id: 'c6', label: 'Workforce competency checked', checked: true, required: true },
      { id: 'c7', label: 'RAMS required', checked: true, required: true },
      { id: 'c8', label: 'Building Control involvement', checked: true, required: true },
      { id: 'c9', label: 'Planning permission involvement', checked: false, required: false },
      { id: 'c10', label: 'CDM duties reviewed', checked: true, required: true },
      { id: 'c11', label: 'Asbestos information available', checked: true, required: true },
      { id: 'c12', label: 'Welfare arrangements confirmed', checked: true, required: true },
      { id: 'c13', label: 'Waste-carrier requirements reviewed', checked: true, required: true },
      { id: 'c14', label: 'Permit to work system agreed', checked: true, required: true },
    ],
    documents: [
      { id: 'doc-10', name: 'Client brief — Kingsway', type: 'PDF', size: '2.1 MB', category: 'Client brief' },
      { id: 'doc-11', name: 'Architect drawings pack', type: 'PDF', size: '8.4 MB', category: 'Drawings' },
      { id: 'doc-12', name: 'M&E specification', type: 'PDF', size: '1.7 MB', category: 'Specifications' },
      { id: 'doc-13', name: 'JCT Standard Building Contract', type: 'PDF', size: '3.5 MB', category: 'Contract' },
      { id: 'doc-14', name: 'Pre-construction photos', type: 'ZIP', size: '24 MB', category: 'Photos' },
    ],
    statusStep: 'active',
  },
];

// ─── Wizard Options ──────────────────────────────────────

export const jobCategories = [
  'New build', 'Extension', 'Refurbishment', 'Repair',
  'Installation', 'Maintenance', 'Inspection', 'Emergency callout', 'Other',
];

export const primaryTrades = [
  'General building', 'Electrical', 'Plumbing', 'Heating and gas',
  'Carpentry', 'Roofing', 'Plastering', 'Decorating',
  'Groundworks', 'Landscaping', 'Multi-trade', 'Other',
];

export const pricingTypes = [
  'Fixed price', 'Estimate', 'Day rate',
  'Cost plus', 'Schedule of rates', 'To be confirmed',
];

export const vatTreatments = [
  'Standard VAT', 'Reduced VAT', 'Zero rated',
  'VAT reverse charge', 'Not VAT registered', 'To be confirmed',
];

export const paymentSchedules = [
  'Deposit and final payment', 'Stage payments', 'Monthly valuation',
  'Payment on completion', 'Custom schedule',
];

export const priorityOptions = ['Low', 'Medium', 'High', 'Critical'];

export const workingDaysOptions = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const defaultComplianceChecklist: ComplianceItem[] = [
  { id: 'cl-1', label: 'Written scope agreed', checked: false, required: true },
  { id: 'cl-2', label: 'Quote or contract accepted', checked: false, required: true },
  { id: 'cl-3', label: 'Client identity recorded', checked: false, required: true },
  { id: 'cl-4', label: 'Site address verified', checked: false, required: true },
  { id: 'cl-5', label: 'Public liability checked', checked: false, required: true },
  { id: 'cl-6', label: 'Workforce competency checked', checked: false, required: true },
  { id: 'cl-7', label: 'RAMS required', checked: false, required: true },
  { id: 'cl-8', label: 'Building Control involvement', checked: false, required: false },
  { id: 'cl-9', label: 'Planning permission involvement', checked: false, required: false },
  { id: 'cl-10', label: 'CDM duties reviewed', checked: false, required: true },
  { id: 'cl-11', label: 'Asbestos information available', checked: false, required: true },
  { id: 'cl-12', label: 'Welfare arrangements confirmed', checked: false, required: true },
  { id: 'cl-13', label: 'Waste-carrier requirements reviewed', checked: false, required: false },
  { id: 'cl-14', label: 'Permit requirements reviewed', checked: false, required: false },
];

// ─── Job Statuses & Filter Options ────────────────────────

export const jobStatuses = ['On site', 'Approval needed', 'Finishing', 'Starting soon', 'At risk', 'Completed'];

export const jobTypes = ['Residential extension', 'Residential refurbishment', 'Commercial electrical', 'Commercial refurbishment', 'Heating installation'];

export const projectManagers = ['Martin Hewett', 'James Lawrence', 'David Hughes'];

export const clientTypes = ['Individual', 'Business'];

export const riskLevels = ['None', 'Approval delay', 'Payment overdue', 'Programme delay'];

export const quickFilters = [
  { id: 'all', label: 'All jobs' },
  { id: 'on-site', label: 'On site' },
  { id: 'starting', label: 'Starting soon' },
  { id: 'approval', label: 'Approval needed' },
  { id: 'at-risk', label: 'At risk' },
  { id: 'completed', label: 'Completed' },
];