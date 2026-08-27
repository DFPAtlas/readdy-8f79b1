export type WorkforceRelationship =
  | 'employee'
  | 'subcontractor_company'
  | 'sole_trader'
  | 'agency_worker'
  | 'consultant'
  | 'invited'
  | 'archived';

export type PassportStatus =
  | 'not_started'
  | 'invited'
  | 'in_progress'
  | 'submitted'
  | 'review_needed'
  | 'action_required'
  | 'ready_for_site'
  | 'restricted'
  | 'expired'
  | 'archived';

export type AvailabilityStatus =
  | 'available_now'
  | 'available_tomorrow'
  | 'available_next_week'
  | 'on_site'
  | 'on_leave'
  | 'booked'
  | 'not_available';

export type ExpiryStatus = 'valid' | 'expiring_soon' | 'urgent' | 'expired';

export type ReviewStatus =
  | 'draft'
  | 'submitted'
  | 'awaiting_review'
  | 'accepted'
  | 'rejected'
  | 'expiring_soon'
  | 'expired'
  | 'replaced';

export type DocumentVisibility =
  | 'passport_owner'
  | 'office_users'
  | 'project_managers'
  | 'site_specific'
  | 'client_visible'
  | 'restricted';

export type InsuranceType =
  | 'public_liability'
  | 'employers_liability'
  | 'professional_indemnity'
  | 'contract_works'
  | 'motor'
  | 'plant'
  | 'other';

export type DocumentCategory =
  | 'identity'
  | 'business'
  | 'cis'
  | 'insurance'
  | 'qualifications'
  | 'training'
  | 'right_to_work'
  | 'site_induction'
  | 'rams'
  | 'contract'
  | 'bank_change_evidence'
  | 'other';

export interface WorkforcePerson {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  displayName: string;
  companyName?: string;
  tradingName?: string;
  relationship: WorkforceRelationship;
  primaryTrade: string;
  secondaryTrades: string[];
  passportStatus: PassportStatus;
  availability: AvailabilityStatus;
  currentJobId?: string;
  currentJobName?: string;
  currentJobRef?: string;
  nextExpiryLabel?: string;
  nextExpiryDate?: string;
  phone?: string;
  email?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  ppeRequirements?: string[];
  siteInductionComplete: boolean;
  ramsAcknowledged: boolean;
  updatedAt: string;
  avatarUrl?: string;
  archived: boolean;
  restricted: boolean;
  restrictionReason?: string;
  bankDetailsStatus: 'not_recorded' | 'recorded' | 'restricted' | 'pending_change';
  bankDetailsChangedAt?: string;
  identity?: IdentityRecord;
  business?: BusinessRecord;
  cis?: CISRecord;
  bankDetails?: BankDetailsRecord;
  emergencySiteInfo?: EmergencySiteInfo;
}

export interface IdentityRecord {
  legalName: string;
  preferredName?: string;
  dateOfBirth: string;
  niNumber: string;
  address: string;
  documentType: string;
  documentRef: string;
  evidenceUrl?: string;
  reviewStatus: ReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface BusinessRecord {
  tradingName: string;
  legalBusinessName: string;
  businessType: string;
  companyNumber?: string;
  registeredOffice?: string;
  tradingAddress?: string;
  utr: string;
  vatStatus: string;
  vatNumber?: string;
  trades: string[];
  yearsTrading: number;
  phone?: string;
  email?: string;
}

export interface CISRecord {
  registrationState: string;
  utrRecorded: string;
  verificationReference?: string;
  deductionRate: string;
  grossPaymentStatus: boolean;
  lastChecked: string;
  checkedBy: string;
  statusNote: string;
}

export interface BankDetailsRecord {
  accountName: string;
  sortCode: string;
  accountNumber: string;
  paymentReference?: string;
  status: 'active' | 'pending_change';
  lastChanged: string;
  reviewedBy: string;
}

export interface EmergencySiteInfo {
  emergencyContact: string;
  emergencyPhone: string;
  ppeRequirements: string[];
  voluntaryAccessInfo?: string;
  medicalInfo?: string;
}

export interface Qualification {
  id: string;
  name: string;
  issuer: string;
  reference: string;
  issueDate: string;
  expiryDate?: string;
  status: ReviewStatus;
  evidenceUrl?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  note?: string;
}

export interface InsurancePolicy {
  id: string;
  provider: string;
  type: InsuranceType;
  coverAmount: string;
  reference: string;
  startDate: string;
  expiryDate: string;
  status: ExpiryStatus;
  evidenceUrl?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  note?: string;
}

export interface WorkforceDocument {
  id: string;
  name: string;
  category: DocumentCategory;
  uploadedAt: string;
  expiryDate?: string;
  reviewStatus: ReviewStatus;
  visibility: DocumentVisibility;
  version: number;
  fileType: string;
  size: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  event: string;
  actor: string;
  recordAffected: string;
  oldStatus?: string;
  newStatus?: string;
  note?: string;
  source: string;
  reference?: string;
}

export interface WorkforceInvitation {
  id: string;
  token: string;
  recipientName: string;
  recipientEmail: string;
  relationship: WorkforceRelationship;
  trade: string;
  proposedJobId?: string;
  proposedJobName?: string;
  proposedStart?: string;
  requirements: string[];
  personalMessage?: string;
  expiryDate: string;
  reminderSchedule: string;
  assignedReviewer: string;
  status: 'draft' | 'sent' | 'opened' | 'submitted' | 'expired' | 'revoked';
  sentAt?: string;
  submittedAt?: string;
  createdAt: string;
  createdBy: string;
}

export interface WorkforceAssignment {
  id: string;
  personId: string;
  jobId: string;
  jobName: string;
  jobRef: string;
  role: string;
  package: string;
  startDate: string;
  expectedFinish: string;
  siteInductionComplete: boolean;
  ramsAcknowledged: boolean;
}

export interface ReadinessCheck {
  category: string;
  state: 'accepted' | 'recorded' | 'expiring_soon' | 'expired' | 'missing' | 'restricted';
  label: string;
  detail?: string;
  date?: string;
}

export interface ReviewDecision {
  reviewer: string;
  timestamp: string;
  note: string;
  action: 'accept' | 'reject' | 'request_replacement';
}

// ──────────────────────────
// Demo workforce people
// ──────────────────────────

export const demoWorkforcePeople: WorkforcePerson[] = [
  {
    id: 'person-1',
    firstName: 'Martin',
    lastName: 'Taylor',
    initials: 'MT',
    displayName: 'Martin Taylor',
    relationship: 'employee',
    primaryTrade: 'General building and carpentry',
    secondaryTrades: ['Carpentry'],
    passportStatus: 'ready_for_site',
    availability: 'on_site',
    currentJobId: 'sl-1048',
    currentJobName: 'Oakfield kitchen extension',
    currentJobRef: 'SL-1048',
    nextExpiryLabel: 'CSCS card',
    nextExpiryDate: '2026-11-18',
    phone: '07912 345601',
    email: 'martin.taylor@buildnerve.co.uk',
    siteInductionComplete: true,
    ramsAcknowledged: true,
    updatedAt: '2026-08-04',
    archived: false,
    restricted: false,
    bankDetailsStatus: 'recorded',
    identity: {
      legalName: 'Martin Christopher Taylor',
      preferredName: 'Martin Taylor',
      dateOfBirth: '1978-04-12',
      niNumber: 'AB123456C',
      address: '12 Beech Close, Leicester LE3 8PQ',
      documentType: 'UK Passport',
      documentRef: '798123456',
      reviewStatus: 'accepted',
      reviewedBy: 'Amelia Brooks',
      reviewedAt: '2026-01-15',
    },
    business: {
      tradingName: 'Martin Taylor',
      legalBusinessName: 'Martin Taylor',
      businessType: 'Employee',
      trades: ['General building', 'Carpentry'],
      yearsTrading: 18,
      utr: '1234567890',
      vatStatus: 'Not registered',
      phone: '07912 345601',
      email: 'martin.taylor@buildnerve.co.uk',
    },
    emergencySiteInfo: {
      emergencyContact: 'Emma Taylor',
      emergencyPhone: '07912 345602',
      ppeRequirements: ['Hard hat', 'High-vis', 'Steel toe boots', 'Safety glasses'],
    },
  },
  {
    id: 'person-2',
    firstName: 'Daniel',
    lastName: 'Hughes',
    initials: 'DH',
    displayName: 'Daniel Hughes',
    companyName: 'D. Hughes Electrical',
    tradingName: 'D. Hughes Electrical',
    relationship: 'sole_trader',
    primaryTrade: 'Electrical',
    secondaryTrades: [],
    passportStatus: 'action_required',
    availability: 'on_site',
    currentJobId: 'sl-1051',
    currentJobName: 'Harcourt office rewire',
    currentJobRef: 'SL-1051',
    nextExpiryLabel: 'Public liability',
    nextExpiryDate: '2026-08-13',
    phone: '07845 678901',
    email: 'daniel@dhugheselectrical.co.uk',
    siteInductionComplete: true,
    ramsAcknowledged: true,
    updatedAt: '2026-08-03',
    archived: false,
    restricted: false,
    bankDetailsStatus: 'restricted',
    bankDetailsChangedAt: '2026-07-20',
    identity: {
      legalName: 'Daniel James Hughes',
      preferredName: 'Daniel Hughes',
      dateOfBirth: '1985-07-22',
      niNumber: 'BC234567D',
      address: '45 Maple Drive, Nottingham NG4 2XY',
      documentType: 'UK Passport',
      documentRef: '817654321',
      reviewStatus: 'accepted',
      reviewedBy: 'Amelia Brooks',
      reviewedAt: '2026-02-10',
    },
    business: {
      tradingName: 'D. Hughes Electrical',
      legalBusinessName: 'Daniel Hughes',
      businessType: 'Sole trader',
      utr: '2345678901',
      vatStatus: 'Not registered',
      trades: ['Electrical'],
      yearsTrading: 14,
      phone: '07845 678901',
      email: 'daniel@dhugheselectrical.co.uk',
    },
    cis: {
      registrationState: 'Registered',
      utrRecorded: '2345678901',
      verificationReference: 'VER-12841',
      deductionRate: '20%',
      grossPaymentStatus: false,
      lastChecked: '2026-07-28',
      checkedBy: 'Amelia Brooks',
      statusNote: 'CIS details are operational records. Production verification must use an authorised HMRC-compatible process.',
    },
    bankDetails: {
      accountName: 'Daniel Hughes',
      sortCode: '11-22-33',
      accountNumber: '12345678',
      paymentReference: 'DH Electrical',
      status: 'active',
      lastChanged: '2026-01-15',
      reviewedBy: 'Amelia Brooks',
    },
    emergencySiteInfo: {
      emergencyContact: 'Lucy Hughes',
      emergencyPhone: '07845 678902',
      ppeRequirements: ['Hard hat', 'High-vis', 'Safety glasses', 'Insulated gloves'],
    },
  },
  {
    id: 'person-3',
    firstName: 'James',
    lastName: 'Lewis',
    initials: 'JL',
    displayName: 'James Lewis',
    relationship: 'employee',
    primaryTrade: 'Heating and gas',
    secondaryTrades: ['Plumbing'],
    passportStatus: 'ready_for_site',
    availability: 'available_tomorrow',
    currentJobId: 'sl-1054',
    currentJobName: 'Meadow View boiler replacement',
    currentJobRef: 'SL-1054',
    siteInductionComplete: true,
    ramsAcknowledged: true,
    updatedAt: '2026-08-05',
    archived: false,
    restricted: false,
    bankDetailsStatus: 'recorded',
    phone: '07789 123456',
    email: 'james.lewis@buildnerve.co.uk',
    identity: {
      legalName: 'James Anthony Lewis',
      preferredName: 'James Lewis',
      dateOfBirth: '1981-11-05',
      niNumber: 'CD345678E',
      address: '88 Ash Road, Coventry CV2 9HJ',
      documentType: 'UK Passport',
      documentRef: '834218765',
      reviewStatus: 'accepted',
      reviewedBy: 'Amelia Brooks',
      reviewedAt: '2026-03-01',
    },
    business: {
      tradingName: 'James Lewis',
      legalBusinessName: 'James Lewis',
      businessType: 'Employee',
      trades: ['Heating and gas', 'Plumbing'],
      yearsTrading: 12,
      utr: '3456789012',
      vatStatus: 'Not registered',
      phone: '07789 123456',
      email: 'james.lewis@buildnerve.co.uk',
    },
    emergencySiteInfo: {
      emergencyContact: 'Sophie Lewis',
      emergencyPhone: '07789 123457',
      ppeRequirements: ['Hard hat', 'High-vis', 'Steel toe boots'],
    },
  },
  {
    id: 'person-4',
    firstName: 'Aisha',
    lastName: 'Khan',
    initials: 'AK',
    displayName: 'Aisha Khan',
    companyName: 'AK Groundworks Ltd',
    tradingName: 'AK Groundworks Ltd',
    relationship: 'subcontractor_company',
    primaryTrade: 'Groundworks and drainage',
    secondaryTrades: ['Excavation', 'Drainage'],
    passportStatus: 'ready_for_site',
    availability: 'on_site',
    currentJobId: 'sl-1048',
    currentJobName: 'Oakfield kitchen extension',
    currentJobRef: 'SL-1048',
    siteInductionComplete: true,
    ramsAcknowledged: true,
    updatedAt: '2026-08-04',
    archived: false,
    restricted: false,
    bankDetailsStatus: 'recorded',
    phone: '07654 321098',
    email: 'info@akgroundworks.co.uk',
    identity: {
      legalName: 'Aisha Fatima Khan',
      preferredName: 'Aisha Khan',
      dateOfBirth: '1980-03-18',
      niNumber: 'DE456789F',
      address: '31 Birch Avenue, Leicester LE2 5PQ',
      documentType: 'UK Passport',
      documentRef: '851276543',
      reviewStatus: 'accepted',
      reviewedBy: 'Amelia Brooks',
      reviewedAt: '2026-01-20',
    },
    business: {
      tradingName: 'AK Groundworks Ltd',
      legalBusinessName: 'AK Groundworks Ltd',
      businessType: 'Limited company',
      companyNumber: '08765432',
      registeredOffice: '31 Birch Avenue, Leicester LE2 5PQ',
      tradingAddress: '31 Birch Avenue, Leicester LE2 5PQ',
      utr: '4567890123',
      vatStatus: 'Registered',
      vatNumber: 'GB123456789',
      trades: ['Groundworks', 'Drainage', 'Excavation'],
      yearsTrading: 15,
      phone: '07654 321098',
      email: 'info@akgroundworks.co.uk',
    },
    emergencySiteInfo: {
      emergencyContact: 'Irfan Khan',
      emergencyPhone: '07654 321099',
      ppeRequirements: ['Hard hat', 'High-vis', 'Steel toe boots', 'Safety glasses', 'Ear protection'],
    },
  },
  {
    id: 'person-5',
    firstName: 'Chloe',
    lastName: 'Williams',
    initials: 'CW',
    displayName: 'Chloe Williams',
    relationship: 'employee',
    primaryTrade: 'Plumbing',
    secondaryTrades: ['Bathroom fitting'],
    passportStatus: 'ready_for_site',
    availability: 'on_site',
    currentJobId: 'sl-1042',
    currentJobName: 'Riverside bathroom suite',
    currentJobRef: 'SL-1042',
    nextExpiryLabel: 'WRAS certificate',
    nextExpiryDate: '2027-01-10',
    siteInductionComplete: true,
    ramsAcknowledged: true,
    updatedAt: '2026-08-05',
    archived: false,
    restricted: false,
    bankDetailsStatus: 'recorded',
    phone: '07555 246801',
    email: 'chloe.williams@buildnerve.co.uk',
    identity: {
      legalName: 'Chloe Elizabeth Williams',
      preferredName: 'Chloe Williams',
      dateOfBirth: '1992-09-30',
      niNumber: 'EF567890G',
      address: '17 Willow Lane, Derby DE3 4TR',
      documentType: 'UK Passport',
      documentRef: '862543217',
      reviewStatus: 'accepted',
      reviewedBy: 'Amelia Brooks',
      reviewedAt: '2026-02-28',
    },
    business: {
      tradingName: 'Chloe Williams',
      legalBusinessName: 'Chloe Williams',
      businessType: 'Employee',
      trades: ['Plumbing', 'Bathroom fitting'],
      yearsTrading: 8,
      utr: '5678901234',
      vatStatus: 'Not registered',
      phone: '07555 246801',
      email: 'chloe.williams@buildnerve.co.uk',
    },
    emergencySiteInfo: {
      emergencyContact: 'Rachel Williams',
      emergencyPhone: '07555 246802',
      ppeRequirements: ['Hard hat', 'High-vis', 'Steel toe boots'],
    },
  },
  {
    id: 'person-6',
    firstName: 'Ryan',
    lastName: 'Patel',
    initials: 'RP',
    displayName: 'Ryan Patel',
    companyName: 'Patel Cable Systems Ltd',
    tradingName: 'Patel Cable Systems Ltd',
    relationship: 'subcontractor_company',
    primaryTrade: 'Electrical',
    secondaryTrades: ['Data cabling', 'Testing'],
    passportStatus: 'review_needed',
    availability: 'on_site',
    currentJobId: 'sl-1051',
    currentJobName: 'Harcourt office rewire',
    currentJobRef: 'SL-1051',
    siteInductionComplete: true,
    ramsAcknowledged: true,
    updatedAt: '2026-08-02',
    archived: false,
    restricted: false,
    bankDetailsStatus: 'recorded',
    phone: '07456 789012',
    email: 'ryan@patelcables.co.uk',
    identity: {
      legalName: 'Ryan Anand Patel',
      preferredName: 'Ryan Patel',
      dateOfBirth: '1988-06-14',
      niNumber: 'GH678901H',
      address: '55 Cedar Crescent, Nottingham NG3 8QR',
      documentType: 'UK Passport',
      documentRef: '879654321',
      reviewStatus: 'accepted',
      reviewedBy: 'Amelia Brooks',
      reviewedAt: '2026-03-15',
    },
    business: {
      tradingName: 'Patel Cable Systems Ltd',
      legalBusinessName: 'Patel Cable Systems Ltd',
      businessType: 'Limited company',
      companyNumber: '09876543',
      registeredOffice: '55 Cedar Crescent, Nottingham NG3 8QR',
      tradingAddress: '55 Cedar Crescent, Nottingham NG3 8QR',
      utr: '6789012345',
      vatStatus: 'Registered',
      vatNumber: 'GB987654321',
      trades: ['Electrical', 'Data cabling'],
      yearsTrading: 10,
      phone: '07456 789012',
      email: 'ryan@patelcables.co.uk',
    },
    emergencySiteInfo: {
      emergencyContact: 'Priya Patel',
      emergencyPhone: '07456 789013',
      ppeRequirements: ['Hard hat', 'High-vis', 'Safety glasses', 'Insulated gloves'],
    },
  },
  {
    id: 'person-7',
    firstName: 'Connor',
    lastName: 'Murphy',
    initials: 'CM',
    displayName: 'Connor Murphy',
    companyName: 'Murphy Roofing Ltd',
    tradingName: 'Murphy Roofing Ltd',
    relationship: 'subcontractor_company',
    primaryTrade: 'Roofing',
    secondaryTrades: ['Lead work'],
    passportStatus: 'submitted',
    availability: 'booked',
    currentJobId: 'sl-1048',
    currentJobName: 'Oakfield kitchen extension',
    currentJobRef: 'SL-1048',
    nextExpiryLabel: 'Public liability',
    nextExpiryDate: '2026-09-02',
    phone: '07901 334455',
    email: 'connor@murphyroofing.co.uk',
    siteInductionComplete: true,
    ramsAcknowledged: false,
    updatedAt: '2026-08-06',
    archived: false,
    restricted: false,
    bankDetailsStatus: 'pending_change',
    identity: {
      legalName: 'Connor Sean Murphy',
      preferredName: 'Connor Murphy',
      dateOfBirth: '1987-02-19',
      niNumber: 'JK123456L',
      address: '24 Oak Grove, Redhill RH1 4BN',
      documentType: 'UK Passport',
      documentRef: '904331221',
      reviewStatus: 'accepted',
      reviewedBy: 'Amelia Brooks',
      reviewedAt: '2026-04-08',
    },
    business: {
      tradingName: 'Murphy Roofing Ltd',
      legalBusinessName: 'Murphy Roofing Ltd',
      businessType: 'Limited company',
      companyNumber: '11223344',
      registeredOffice: '24 Oak Grove, Redhill RH1 4BN',
      tradingAddress: '24 Oak Grove, Redhill RH1 4BN',
      utr: '7890123456',
      vatStatus: 'Registered',
      vatNumber: 'GB 654 3210 78',
      trades: ['Roofing', 'Lead work'],
      yearsTrading: 16,
      phone: '07901 334455',
      email: 'connor@murphyroofing.co.uk',
    },
    emergencySiteInfo: {
      emergencyContact: 'Shannon Murphy',
      emergencyPhone: '07901 334456',
      ppeRequirements: ['Hard hat', 'High-vis', 'Steel toe boots', 'Safety harness'],
    },
  },
  {
    id: 'person-8',
    firstName: 'Grace',
    lastName: 'Ellis',
    initials: 'GE',
    displayName: 'Grace Ellis',
    relationship: 'sole_trader',
    primaryTrade: 'Plastering',
    secondaryTrades: ['Drylining'],
    passportStatus: 'in_progress',
    availability: 'available_next_week',
    nextExpiryLabel: 'CSCS card',
    nextExpiryDate: '2026-08-29',
    phone: '07700 998877',
    email: 'grace@ellisplastering.co.uk',
    siteInductionComplete: false,
    ramsAcknowledged: false,
    updatedAt: '2026-08-05',
    archived: false,
    restricted: false,
    bankDetailsStatus: 'not_recorded',
    identity: {
      legalName: 'Grace Olivia Ellis',
      preferredName: 'Grace Ellis',
      dateOfBirth: '1994-12-03',
      niNumber: 'LM234567N',
      address: '9 Rowan Close, Horley RH6 7PW',
      documentType: 'UK Driving Licence',
      documentRef: 'ELLIS904221G',
      reviewStatus: 'submitted',
    },
    business: {
      tradingName: 'G. Ellis Plastering',
      legalBusinessName: 'Grace Ellis',
      businessType: 'Sole trader',
      utr: '8901234567',
      vatStatus: 'Not registered',
      trades: ['Plastering', 'Drylining'],
      yearsTrading: 6,
      phone: '07700 998877',
      email: 'grace@ellisplastering.co.uk',
    },
    emergencySiteInfo: {
      emergencyContact: 'Ben Ellis',
      emergencyPhone: '07700 998878',
      ppeRequirements: ['Hard hat', 'High-vis', 'Steel toe boots'],
    },
  },
  {
    id: 'person-9',
    firstName: 'Kamil',
    lastName: 'Nowak',
    initials: 'KN',
    displayName: 'Kamil Nowak',
    companyName: 'Workforce Direct Agency',
    tradingName: 'Workforce Direct Agency',
    relationship: 'agency_worker',
    primaryTrade: 'Multi-trade',
    secondaryTrades: ['Groundworks', 'Demolition'],
    passportStatus: 'not_started',
    availability: 'available_now',
    phone: '07888 112233',
    email: 'kamil.nowak@wfd-agency.co.uk',
    siteInductionComplete: false,
    ramsAcknowledged: false,
    updatedAt: '2026-08-07',
    archived: false,
    restricted: false,
    bankDetailsStatus: 'not_recorded',
    identity: {
      legalName: 'Kamil Andrzej Nowak',
      preferredName: 'Kamil Nowak',
      dateOfBirth: '1990-05-27',
      niNumber: 'NO345678P',
      address: '3 Mill Lane, Crawley RH10 5QA',
      documentType: 'EU Passport',
      documentRef: 'ES4491237',
      reviewStatus: 'draft',
    },
    business: {
      tradingName: 'Workforce Direct Agency',
      legalBusinessName: 'Workforce Direct Ltd',
      businessType: 'Agency',
      utr: '9012345678',
      vatStatus: 'Registered',
      vatNumber: 'GB 890 1234 56',
      trades: ['Multi-trade', 'Groundworks'],
      yearsTrading: 9,
      phone: '07888 112233',
      email: 'kamil.nowak@wfd-agency.co.uk',
    },
    emergencySiteInfo: {
      emergencyContact: 'Agnieszka Nowak',
      emergencyPhone: '07888 112234',
      ppeRequirements: ['Hard hat', 'High-vis', 'Steel toe boots', 'Safety glasses'],
    },
  },
];

// ──────────────────────────
// Demo qualifications — Daniel Hughes
// ──────────────────────────

export const demoQualifications: Record<string, Qualification[]> = {
  'person-2': [
    {
      id: 'q-1',
      name: 'ECS Installation Electrician Card',
      issuer: 'JIB',
      reference: 'ECS-2024-12845',
      issueDate: '2025-03-18',
      expiryDate: '2028-03-18',
      status: 'accepted',
      reviewedBy: 'Amelia Brooks',
      reviewedAt: '2025-03-20',
    },
    {
      id: 'q-2',
      name: 'BS 7671 18th Edition',
      issuer: 'City & Guilds',
      reference: 'C&G-7671-99421',
      issueDate: '2023-06-01',
      status: 'accepted',
      reviewedBy: 'Amelia Brooks',
      reviewedAt: '2023-06-05',
    },
    {
      id: 'q-3',
      name: 'Inspection and Testing',
      issuer: 'City & Guilds',
      reference: 'C&G-2391-55123',
      issueDate: '2026-06-11',
      expiryDate: '2029-06-11',
      status: 'accepted',
      reviewedBy: 'Amelia Brooks',
      reviewedAt: '2026-06-15',
    },
    {
      id: 'q-4',
      name: 'IPAF 3a/3b',
      issuer: 'IPAF',
      reference: 'IPAF-2023-88291',
      issueDate: '2023-09-02',
      expiryDate: '2026-09-02',
      status: 'expiring_soon',
    },
  ],
  'person-4': [
    {
      id: 'q-5',
      name: 'SMSTS Site Management Safety Training',
      issuer: 'CITB',
      reference: 'SMSTS-2024-22110',
      issueDate: '2024-02-12',
      expiryDate: '2029-02-12',
      status: 'accepted',
      reviewedBy: 'Amelia Brooks',
      reviewedAt: '2024-02-14',
    },
    {
      id: 'q-6',
      name: 'CPCS 360 Excavator',
      issuer: 'NOCN',
      reference: 'CPCS-A58-77320',
      issueDate: '2023-06-19',
      expiryDate: '2026-06-19',
      status: 'accepted',
      reviewedBy: 'Amelia Brooks',
      reviewedAt: '2023-06-21',
    },
    {
      id: 'q-7',
      name: 'First Aid at Work',
      issuer: 'St John Ambulance',
      reference: 'FAW-2023-55012',
      issueDate: '2023-11-04',
      expiryDate: '2026-11-04',
      status: 'accepted',
    },
  ],
  'person-6': [
    {
      id: 'q-8',
      name: 'ECS Gold Card',
      issuer: 'JIB',
      reference: 'ECS-G-2024-33412',
      issueDate: '2024-04-02',
      expiryDate: '2027-04-02',
      status: 'accepted',
      reviewedBy: 'Amelia Brooks',
      reviewedAt: '2024-04-05',
    },
    {
      id: 'q-9',
      name: 'BS 7671 18th Edition',
      issuer: 'City and Guilds',
      reference: 'CG-7671-88213',
      issueDate: '2023-05-15',
      status: 'accepted',
    },
    {
      id: 'q-10',
      name: 'IPAF 3a/3b',
      issuer: 'IPAF',
      reference: 'IPAF-2024-66120',
      issueDate: '2024-07-22',
      expiryDate: '2027-07-22',
      status: 'accepted',
    },
  ],
};

// ──────────────────────────
// Demo insurance — Daniel Hughes
// ──────────────────────────

export const demoInsurancePolicies: Record<string, InsurancePolicy[]> = {
  'person-2': [
    {
      id: 'ins-1',
      provider: 'Example Mutual',
      type: 'public_liability',
      coverAmount: '£2,000,000',
      reference: 'PL-EXM-2025-77432',
      startDate: '2025-08-14',
      expiryDate: '2026-08-13',
      status: 'expiring_soon',
      reviewedAt: '2026-07-28',
      reviewedBy: 'Amelia Brooks',
    },
    {
      id: 'ins-2',
      provider: 'Example Mutual',
      type: 'employers_liability',
      coverAmount: '£10,000,000',
      reference: 'EL-EXM-2025-77433',
      startDate: '2025-08-14',
      expiryDate: '2026-08-13',
      status: 'expiring_soon',
      reviewedAt: '2026-07-28',
      reviewedBy: 'Amelia Brooks',
    },
  ],
  'person-4': [
    {
      id: 'ins-3',
      provider: 'Sterling Underwriting',
      type: 'public_liability',
      coverAmount: '£5,000,000',
      reference: 'PL-SU-2026-11230',
      startDate: '2026-01-01',
      expiryDate: '2027-01-01',
      status: 'valid',
      reviewedAt: '2026-01-05',
      reviewedBy: 'Amelia Brooks',
    },
    {
      id: 'ins-4',
      provider: 'Sterling Underwriting',
      type: 'employers_liability',
      coverAmount: '£10,000,000',
      reference: 'EL-SU-2026-11231',
      startDate: '2026-01-01',
      expiryDate: '2027-01-01',
      status: 'valid',
    },
    {
      id: 'ins-5',
      provider: 'Plant Insure Ltd',
      type: 'plant',
      coverAmount: '£1,500,000',
      reference: 'PT-PL-2026-88410',
      startDate: '2026-03-01',
      expiryDate: '2026-08-25',
      status: 'urgent',
    },
  ],
  'person-6': [
    {
      id: 'ins-6',
      provider: 'Sterling Underwriting',
      type: 'public_liability',
      coverAmount: '£2,000,000',
      reference: 'PL-SU-2026-22310',
      startDate: '2026-02-10',
      expiryDate: '2027-02-10',
      status: 'valid',
    },
    {
      id: 'ins-7',
      provider: 'Sterling Underwriting',
      type: 'professional_indemnity',
      coverAmount: '£1,000,000',
      reference: 'PI-SU-2026-22311',
      startDate: '2026-02-10',
      expiryDate: '2026-09-12',
      status: 'expiring_soon',
    },
  ],
};

// ──────────────────────────
// Demo documents — Daniel Hughes
// ──────────────────────────

export const demoWorkforceDocuments: Record<string, WorkforceDocument[]> = {
  'person-2': [
    {
      id: 'wd-1',
      name: 'UK Passport',
      category: 'identity',
      uploadedAt: '2026-02-10',
      reviewStatus: 'accepted',
      visibility: 'restricted',
      version: 1,
      fileType: 'PDF',
      size: '2.4 MB',
    },
    {
      id: 'wd-2',
      name: 'Public liability policy schedule',
      category: 'insurance',
      uploadedAt: '2025-08-14',
      expiryDate: '2026-08-13',
      reviewStatus: 'accepted',
      visibility: 'office_users',
      version: 1,
      fileType: 'PDF',
      size: '1.8 MB',
    },
    {
      id: 'wd-3',
      name: 'ECS card scan',
      category: 'qualifications',
      uploadedAt: '2025-03-18',
      expiryDate: '2028-03-18',
      reviewStatus: 'accepted',
      visibility: 'office_users',
      version: 1,
      fileType: 'PDF',
      size: '1.1 MB',
    },
    {
      id: 'wd-4',
      name: 'BS 7671 certificate',
      category: 'qualifications',
      uploadedAt: '2023-06-01',
      reviewStatus: 'accepted',
      visibility: 'office_users',
      version: 1,
      fileType: 'PDF',
      size: '890 KB',
    },
    {
      id: 'wd-5',
      name: 'CIS registration letter',
      category: 'cis',
      uploadedAt: '2026-01-10',
      reviewStatus: 'accepted',
      visibility: 'restricted',
      version: 1,
      fileType: 'PDF',
      size: '340 KB',
    },
    {
      id: 'wd-6',
      name: 'IPAF card scan',
      category: 'qualifications',
      uploadedAt: '2023-09-02',
      expiryDate: '2026-09-02',
      reviewStatus: 'accepted',
      visibility: 'office_users',
      version: 1,
      fileType: 'PDF',
      size: '1.2 MB',
    },
    {
      id: 'wd-7',
      name: 'RAMS acknowledgement',
      category: 'rams',
      uploadedAt: '2026-08-03',
      reviewStatus: 'accepted',
      visibility: 'project_managers',
      version: 1,
      fileType: 'PDF',
      size: '120 KB',
    },
    {
      id: 'wd-8',
      name: 'Site induction record',
      category: 'site_induction',
      uploadedAt: '2026-08-03',
      reviewStatus: 'accepted',
      visibility: 'project_managers',
      version: 1,
      fileType: 'PDF',
      size: '95 KB',
    },
  ],
};

// ──────────────────────────
// Demo audit events — Daniel Hughes
// ──────────────────────────

export const demoAuditEvents: Record<string, AuditEvent[]> = {
  'person-2': [
    {
      id: 'ae-1',
      timestamp: '2026-07-28T09:15:00Z',
      event: 'CIS details reviewed',
      actor: 'Amelia Brooks',
      recordAffected: 'CIS registration',
      oldStatus: 'submitted',
      newStatus: 'accepted',
      note: 'Deduction rate confirmed at 20%. HMRC verification required for production use.',
      source: 'Manual review',
      reference: 'REV-2026-0728-001',
    },
    {
      id: 'ae-2',
      timestamp: '2026-07-28T09:22:00Z',
      event: 'Public liability document accepted',
      actor: 'Amelia Brooks',
      recordAffected: 'Public liability insurance',
      oldStatus: 'submitted',
      newStatus: 'accepted',
      note: 'Policy valid until 13 August 2026. Renewal reminder scheduled.',
      source: 'Manual review',
      reference: 'REV-2026-0728-002',
    },
    {
      id: 'ae-3',
      timestamp: '2026-08-03T10:45:00Z',
      event: 'Site induction completed',
      actor: 'Daniel Hughes',
      recordAffected: 'Site induction',
      oldStatus: 'not_started',
      newStatus: 'completed',
      note: 'Induction completed at Harcourt office rewire. Key code 4821 provided.',
      source: 'Self-recorded',
    },
    {
      id: 'ae-4',
      timestamp: '2026-08-03T11:00:00Z',
      event: 'RAMS acknowledgement recorded',
      actor: 'Daniel Hughes',
      recordAffected: 'RAMS',
      oldStatus: 'pending',
      newStatus: 'acknowledged',
      note: 'Risk assessment and method statement acknowledged for electrical rewire work.',
      source: 'Self-recorded',
    },
    {
      id: 'ae-5',
      timestamp: '2026-08-05T08:00:00Z',
      event: 'Insurance reminder sent',
      actor: 'BuildNerve automation',
      recordAffected: 'Public liability insurance',
      note: 'Automated reminder: public liability expires in 8 days.',
      source: 'Automated',
    },
  ],
};

// ──────────────────────────
// Demo invitations
// ──────────────────────────

export const demoInvitations: WorkforceInvitation[] = [
  {
    id: 'inv-1',
    token: 'demo-invite-001',
    recipientName: 'Daniel Hughes',
    recipientEmail: 'daniel@dhugheselectrical.co.uk',
    relationship: 'sole_trader',
    trade: 'Electrical',
    proposedJobId: 'sl-1051',
    proposedJobName: 'Harcourt office rewire',
    proposedStart: '2026-08-03',
    requirements: [
      'identity',
      'business_details',
      'utr_and_cis',
      'bank_details',
      'public_liability',
      'employers_liability',
      'qualifications',
      'competency_cards',
      'emergency_contact',
      'site_induction',
      'rams_acknowledgement',
    ],
    personalMessage: 'Hi Daniel, we have an electrical rewire project starting next week. Please complete your work passport so we can confirm your assignment.',
    expiryDate: '2026-08-10',
    reminderSchedule: '3 days, 1 day',
    assignedReviewer: 'Amelia Brooks',
    status: 'submitted',
    sentAt: '2026-07-25',
    submittedAt: '2026-07-29',
    createdAt: '2026-07-20',
    createdBy: 'Martin Hewett',
  },
];

// ──────────────────────────
// Demo assignments
// ──────────────────────────

export const demoAssignments: WorkforceAssignment[] = [
  {
    id: 'asg-1',
    personId: 'person-2',
    jobId: 'sl-1051',
    jobName: 'Harcourt office rewire',
    jobRef: 'SL-1051',
    role: 'Electrical subcontractor',
    package: 'Containment, first-fix wiring and testing',
    startDate: '2026-08-03',
    expectedFinish: '2026-08-14',
    siteInductionComplete: true,
    ramsAcknowledged: true,
  },
  {
    id: 'asg-2',
    personId: 'person-1',
    jobId: 'sl-1048',
    jobName: 'Oakfield kitchen extension',
    jobRef: 'SL-1048',
    role: 'Site supervisor',
    package: 'General building and carpentry',
    startDate: '2026-06-15',
    expectedFinish: '2026-08-22',
    siteInductionComplete: true,
    ramsAcknowledged: true,
  },
];

// ──────────────────────────
// Readiness checks for Daniel
// ──────────────────────────

export function getReadinessChecks(person: WorkforcePerson): ReadinessCheck[] {
  if (person.id === 'person-2') {
    return [
      { category: 'Identity', state: 'accepted', label: 'Accepted' },
      { category: 'Business details', state: 'accepted', label: 'Accepted' },
      { category: 'CIS information', state: 'recorded', label: 'Recorded' },
      { category: 'Insurance', state: 'expiring_soon', label: 'Expiring soon', detail: 'Public liability expires on 13 August 2026' },
      { category: 'Qualifications', state: 'accepted', label: 'Accepted' },
      { category: 'Site induction', state: 'accepted', label: 'Accepted' },
      { category: 'RAMS acknowledgement', state: 'accepted', label: 'Accepted' },
      { category: 'Bank details', state: 'restricted', label: 'Recorded — restricted', detail: 'Bank details changed on 20 July 2026. Independent confirmation required.' },
      { category: 'Overall', state: 'expiring_soon', label: 'Action required' },
    ];
  }
  return [
    { category: 'Identity', state: 'accepted', label: 'Accepted' },
    { category: 'Insurance', state: 'accepted', label: 'Accepted' },
    { category: 'Qualifications', state: 'accepted', label: 'Accepted' },
    { category: 'Overall', state: 'accepted', label: 'Ready for site' },
  ];
}

// ──────────────────────────
// Filter / helper utilities
// ──────────────────────────

export function getPassportStatusLabel(status: PassportStatus): string {
  const labels: Record<string, string> = {
    not_started: 'Not started',
    invited: 'Invited',
    in_progress: 'In progress',
    submitted: 'Submitted',
    review_needed: 'Review needed',
    action_required: 'Action required',
    ready_for_site: 'Ready for site',
    restricted: 'Restricted',
    expired: 'Expired',
    archived: 'Archived',
  };
  return labels[status] || status;
}

export function getAvailabilityLabel(status: AvailabilityStatus): string {
  const labels: Record<string, string> = {
    available_now: 'Available now',
    available_tomorrow: 'Available tomorrow',
    available_next_week: 'Available next week',
    on_site: 'On site',
    on_leave: 'On leave',
    booked: 'Booked',
    not_available: 'Not available',
  };
  return labels[status] || status;
}

export function getExpiryStatusLabel(status: ExpiryStatus): string {
  const labels: Record<string, string> = {
    valid: 'Valid',
    expiring_soon: 'Expiring soon',
    urgent: 'Urgent',
    expired: 'Expired',
  };
  return labels[status] || status;
}

export function getRelationshipLabel(rel: WorkforceRelationship): string {
  const labels: Record<string, string> = {
    employee: 'Employee',
    sole_trader: 'Sole trader',
    subcontractor_company: 'Subcontractor company',
    agency_worker: 'Agency worker',
    consultant: 'Consultant',
    invited: 'Invited',
    archived: 'Archived',
  };
  return labels[rel] || rel;
}

export function getReviewStatusLabel(status: ReviewStatus): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    awaiting_review: 'Awaiting review',
    accepted: 'Accepted',
    rejected: 'Rejected',
    expiring_soon: 'Expiring soon',
    expired: 'Expired',
    replaced: 'Replaced',
  };
  return labels[status] || status;
}

export function getInsuranceTypeLabel(type: InsuranceType): string {
  const labels: Record<string, string> = {
    public_liability: 'Public liability',
    employers_liability: 'Employers\' liability',
    professional_indemnity: 'Professional indemnity',
    contract_works: 'Contract works',
    motor: 'Motor',
    plant: 'Plant',
    other: 'Other',
  };
  return labels[type] || type;
}

export function getDocumentCategoryLabel(cat: DocumentCategory): string {
  const labels: Record<string, string> = {
    identity: 'Identity',
    business: 'Business',
    cis: 'CIS',
    insurance: 'Insurance',
    qualifications: 'Qualifications',
    training: 'Training',
    right_to_work: 'Right-to-work',
    site_induction: 'Site induction',
    rams: 'RAMS',
    contract: 'Contract',
    bank_change_evidence: 'Bank-change evidence',
    other: 'Other',
  };
  return labels[cat] || cat;
}

export function getDocumentVisibilityLabel(vis: DocumentVisibility): string {
  const labels: Record<string, string> = {
    passport_owner: 'Passport owner',
    office_users: 'Authorised office users',
    project_managers: 'Assigned project managers',
    site_specific: 'Site-specific',
    client_visible: 'Client-visible',
    restricted: 'Restricted',
  };
  return labels[vis] || vis;
}

export function maskSensitive(value: string, showLast = 4): string {
  if (!value || value.length <= showLast + 1) return value;
  return `${'•'.repeat(value.length - showLast)}${value.slice(-showLast)}`;
}

export function maskNiNumber(ni: string): string {
  if (!ni || ni.length < 4) return ni;
  return `•••••••${ni.slice(-3)}`;
}

export function maskDocumentRef(ref: string): string {
  if (!ref || ref.length < 5) return ref;
  return `•••• ${ref.slice(-4)}`;
}

export function computeDaysRemaining(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date('2026-08-05');
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function computeExpiryStatus(dateStr?: string): ExpiryStatus {
  if (!dateStr) return 'valid';
  const days = computeDaysRemaining(dateStr);
  if (days < 0) return 'expired';
  if (days <= 7) return 'urgent';
  if (days <= 30) return 'expiring_soon';
  return 'valid';
}

export const relationshipOptions: WorkforceRelationship[] = [
  'employee',
  'sole_trader',
  'subcontractor_company',
  'agency_worker',
  'consultant',
];

export const tradeOptions = [
  'General building and carpentry',
  'Electrical',
  'Heating and gas',
  'Plumbing',
  'Groundworks and drainage',
  'Roofing',
  'Plastering',
  'Decorating',
  'Carpentry',
  'Multi-trade',
  'Other',
];

export const passportStatusOptions: PassportStatus[] = [
  'not_started',
  'invited',
  'in_progress',
  'submitted',
  'review_needed',
  'action_required',
  'ready_for_site',
  'restricted',
  'expired',
  'archived',
];

export const availabilityOptions: AvailabilityStatus[] = [
  'available_now',
  'available_tomorrow',
  'available_next_week',
  'on_site',
  'on_leave',
  'booked',
  'not_available',
];

export const documentCategoryOptions: DocumentCategory[] = [
  'identity',
  'business',
  'cis',
  'insurance',
  'qualifications',
  'training',
  'right_to_work',
  'site_induction',
  'rams',
  'contract',
  'bank_change_evidence',
  'other',
];

export const quickWorkforceFilters = [
  { id: 'everyone', label: 'Everyone' },
  { id: 'ready', label: 'Ready for site' },
  { id: 'employees', label: 'Employees' },
  { id: 'subcontractors', label: 'Subcontractors' },
  { id: 'expiring', label: 'Expiring soon' },
  { id: 'action_required', label: 'Action required' },
  { id: 'invited', label: 'Invited' },
  { id: 'archived', label: 'Archived' },
];

export const inviteRelationshipOptions: WorkforceRelationship[] = [
  'sole_trader',
  'subcontractor_company',
  'employee',
  'agency_worker',
  'consultant',
];

export const inviteRequirementOptions = [
  { id: 'identity', label: 'Identity' },
  { id: 'business_details', label: 'Business details' },
  { id: 'utr_and_cis', label: 'UTR and CIS' },
  { id: 'vat', label: 'VAT' },
  { id: 'bank_details', label: 'Bank details' },
  { id: 'public_liability', label: 'Public liability' },
  { id: 'employers_liability', label: 'Employers\' liability' },
  { id: 'qualifications', label: 'Qualifications' },
  { id: 'competency_cards', label: 'Competency cards' },
  { id: 'right_to_work', label: 'Right-to-work evidence' },
  { id: 'emergency_contact', label: 'Emergency contact' },
  { id: 'site_induction', label: 'Site induction' },
  { id: 'rams_acknowledgement', label: 'RAMS acknowledgement' },
];

export const inviteTemplates = [
  { id: 'sole_trader', label: 'Sole trader', requirements: ['identity','business_details','utr_and_cis','public_liability','qualifications','competency_cards','emergency_contact','site_induction','rams_acknowledgement'] },
  { id: 'subcontractor_company', label: 'Subcontractor company', requirements: ['business_details','utr_and_cis','vat','public_liability','employers_liability','qualifications','competency_cards','site_induction','rams_acknowledgement'] },
  { id: 'employee', label: 'Employee', requirements: ['identity','emergency_contact','right_to_work','qualifications','competency_cards','site_induction','rams_acknowledgement'] },
  { id: 'labour_only', label: 'Labour-only subcontractor', requirements: ['identity','utr_and_cis','right_to_work','public_liability','qualifications','competency_cards','site_induction','rams_acknowledgement'] },
  { id: 'consultant', label: 'Consultant', requirements: ['identity','business_details','professional_indemnity','qualifications','emergency_contact','site_induction','rams_acknowledgement'] },
];

export const insuranceTypeOptions: InsuranceType[] = [
  'public_liability',
  'employers_liability',
  'professional_indemnity',
  'contract_works',
  'motor',
  'plant',
  'other',
];

// ──────────────────────────
// Service / repository helpers
// ──────────────────────────

export function getAllWorkforce(): WorkforcePerson[] {
  return demoWorkforcePeople;
}

export function getWorkforcePerson(id: string): WorkforcePerson | undefined {
  return demoWorkforcePeople.find((p) => p.id === id);
}

export function getQualifications(personId: string): Qualification[] {
  return demoQualifications[personId] || [];
}

export function getInsurancePolicies(personId: string): InsurancePolicy[] {
  return demoInsurancePolicies[personId] || [];
}

export function getDocuments(personId: string): WorkforceDocument[] {
  return demoWorkforceDocuments[personId] || [];
}

export function getAuditEvents(personId: string): AuditEvent[] {
  return (demoAuditEvents[personId] || []).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getPersonAssignments(personId: string): WorkforceAssignment[] {
  return demoAssignments.filter((a) => a.personId === personId);
}

export function getInvitationByToken(token: string): WorkforceInvitation | undefined {
  return demoInvitations.find((i) => i.token === token);
}

export function getPersonStatusColor(status: PassportStatus): string {
  const colors: Record<string, string> = {
    ready_for_site: 'bg-status-green',
    action_required: 'bg-status-red',
    review_needed: 'bg-status-amber',
    not_started: 'bg-gray-400',
    invited: 'bg-blue-400',
    in_progress: 'bg-blue-400',
    submitted: 'bg-purple-400',
    restricted: 'bg-gray-600',
    expired: 'bg-status-red',
    archived: 'bg-gray-400',
  };
  return colors[status] || 'bg-gray-400';
}

export function getExpiryBadgeColor(status: ExpiryStatus): string {
  const colors: Record<string, string> = {
    valid: 'bg-status-green text-white',
    expiring_soon: 'bg-status-amber text-white',
    urgent: 'bg-status-red text-white',
    expired: 'bg-status-red text-white',
  };
  return colors[status] || 'bg-gray-400 text-white';
}

export function getReviewBadgeColor(status: ReviewStatus): string {
  const colors: Record<string, string> = {
    accepted: 'bg-status-green text-white',
    rejected: 'bg-status-red text-white',
    draft: 'bg-gray-300 text-gray-700',
    submitted: 'bg-blue-400 text-white',
    awaiting_review: 'bg-status-amber text-white',
    expiring_soon: 'bg-status-amber text-white',
    expired: 'bg-status-red text-white',
    replaced: 'bg-purple-400 text-white',
  };
  return colors[status] || 'bg-gray-400 text-white';
}