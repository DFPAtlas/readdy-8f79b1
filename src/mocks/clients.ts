// ─── Types ───────────────────────────────────────────────

import type { SiteAddress } from './jobs';

export type ClientType = 'individual' | 'business';

export type PortalStatus = 'not_invited' | 'invited' | 'active' | 'action_required' | 'revoked' | 'expired';

export type DecisionStatus =
  | 'draft'
  | 'requested'
  | 'viewed'
  | 'question_received'
  | 'approved'
  | 'declined'
  | 'overdue'
  | 'cancelled'
  | 'superseded';

export type CommunicationType =
  | 'message'
  | 'email_record'
  | 'phone_call_note'
  | 'meeting_note'
  | 'progress_update'
  | 'decision_request'
  | 'variation'
  | 'document_shared'
  | 'system_notification';

export type VariationStatus =
  | 'draft'
  | 'internal_review'
  | 'ready_to_send'
  | 'sent'
  | 'viewed'
  | 'question_received'
  | 'approved'
  | 'declined'
  | 'withdrawn'
  | 'superseded'
  | 'invoiced';

export type EvidenceVisibility = 'internal_only' | 'client_visible' | 'shared_with_selected';

export interface ClientContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  preferredContact: 'email' | 'mobile' | 'either';
  isPrimary: boolean;
}

export interface ClientRecord {
  id: string;
  type: ClientType;
  firstName?: string;
  lastName?: string;
  displayName: string;
  companyName?: string;
  contacts: ClientContact[];
  billingAddress: SiteAddress;
  siteAddress?: SiteAddress;
  activeJobIds: string[];
  activeJobNames: string[];
  activeJobRefs: string[];
  portalStatus: PortalStatus;
  portalAccessId?: string;
  waitingActions: number;
  outstandingValue: number;
  lastActivity: string;
  archived: boolean;
  accountStatus: 'active' | 'inactive' | 'on_hold';
  createdAt: string;
}

export interface PortalPermission {
  id: string;
  label: string;
  granted: boolean;
  category: 'progress' | 'photos' | 'schedule' | 'documents' | 'financials' | 'decisions' | 'variations' | 'messages';
}

export interface ClientPortalAccess {
  id: string;
  clientId: string;
  token: string;
  status: 'active' | 'revoked' | 'expired';
  invitedContacts: string[];
  lastAccessed?: string;
  accessExpiry?: string;
  createdAt: string;
  projectIds: string[];
  permissions: PortalPermission[];
  linkRegeneratedAt?: string;
  revokedAt?: string;
  revokeReason?: string;
}

export interface ClientCommunication {
  id: string;
  type: CommunicationType;
  subject: string;
  projectId?: string;
  projectName?: string;
  dateTime: string;
  sender: string;
  senderRole: string;
  recipients: string[];
  visibility: 'client_visible' | 'internal_only' | 'restricted';
  message: string;
  attachments?: string[];
  deliveryState: 'sent' | 'delivered' | 'viewed' | 'failed';
  relatedRecord?: string;
  auditRef: string;
}

export interface ClientDecision {
  id: string;
  question: string;
  description?: string;
  options: string[];
  selectedOption?: string;
  costImpact?: string;
  programmeImpact?: string;
  dueDate: string;
  attachments?: string[];
  relatedJobStage?: string;
  relatedVariationId?: string;
  relatedVariationRef?: string;
  status: DecisionStatus;
  respondedBy?: string;
  respondedAt?: string;
  portalSessionRef?: string;
  decisionVersion: number;
  confirmationText?: string;
  projectId: string;
  projectName: string;
  clientId: string;
  createdAt: string;
  auditHistory: DecisionAuditEntry[];
}

export interface DecisionAuditEntry {
  timestamp: string;
  event: string;
  actor: string;
  detail?: string;
}

export interface VariationVersion {
  version: number;
  createdAt: string;
  createdBy: string;
  status: VariationStatus;
  title: string;
  description: string;
  includedWork: string;
  excludedWork: string;
  internalCost: number;
  clientPrice: number;
  vatAmount: number;
  totalPrice: number;
  programmeImpact: string;
  revisedCompletion?: string;
  approvalDeadline?: string;
  notes?: string;
}

export interface VariationRecord {
  id: string;
  reference: string;
  jobId: string;
  jobRef: string;
  jobName: string;
  clientId: string;
  clientName: string;
  title: string;
  requestedBy: string;
  source: string;
  reason: string;
  status: VariationStatus;
  currentVersion: number;
  versions: VariationVersion[];
  latestInternalCost: number;
  latestClientPrice: number;
  latestVatAmount: number;
  latestTotalPrice: number;
  vatTreatment: string;
  programmeImpactDays: number;
  revisedCompletion?: string;
  approvalDeadline?: string;
  risk: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  viewedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  declinedAt?: string;
  declinedBy?: string;
  declinedReason?: string;
  questions: VariationQuestion[];
  attachments?: string[];
  internalNotes?: string;
}

export interface VariationQuestion {
  id: string;
  askedBy: string;
  askedAt: string;
  question: string;
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
}

export interface PortalAuditEvent {
  id: string;
  timestamp: string;
  event: string;
  actor: string;
  detail?: string;
  sessionRef?: string;
}

export interface ProjectStage {
  id: string;
  name: string;
  status: 'complete' | 'in_progress' | 'upcoming';
  summary?: string;
  plannedStart?: string;
  plannedEnd?: string;
  updates?: string[];
}

export interface ClientVisibleEvidence {
  id: string;
  caption: string;
  dateTime: string;
  uploadedBy: string;
  visibility: EvidenceVisibility;
  imageUrl: string;
}

// ─── Demo Portal Permissions Template ──────────────────

export function defaultPortalPermissions(): PortalPermission[] {
  return [
    { id: 'perm-progress', label: 'View progress', granted: true, category: 'progress' },
    { id: 'perm-photos', label: 'View client-visible photos', granted: true, category: 'photos' },
    { id: 'perm-schedule', label: 'View schedule summary', granted: true, category: 'schedule' },
    { id: 'perm-docs', label: 'View documents', granted: true, category: 'documents' },
    { id: 'perm-financials', label: 'View financial summary', granted: true, category: 'financials' },
    { id: 'perm-decisions', label: 'Approve decisions', granted: true, category: 'decisions' },
    { id: 'perm-variations', label: 'Approve variations', granted: true, category: 'variations' },
    { id: 'perm-messages', label: 'Send messages', granted: true, category: 'messages' },
  ];
}

// ─── Demo Clients ──────────────────────────────────────

export const demoClientRecords: ClientRecord[] = [
  {
    id: 'client-1',
    type: 'individual',
    firstName: 'Sarah',
    lastName: 'Miller',
    displayName: 'Sarah & Ben Miller',
    contacts: [
      { id: 'ct-1a', firstName: 'Sarah', lastName: 'Miller', email: 'sarah.miller@email.com', mobile: '07912 345678', preferredContact: 'email', isPrimary: true },
      { id: 'ct-1b', firstName: 'Ben', lastName: 'Miller', email: 'ben.miller@email.com', mobile: '07912 345679', preferredContact: 'mobile', isPrimary: false },
    ],
    billingAddress: { addressLine1: '14 Oakfield Road', town: 'Leicester', county: 'Leicestershire', postcode: 'LE3 6RT' },
    siteAddress: { addressLine1: '14 Oakfield Road', town: 'Leicester', county: 'Leicestershire', postcode: 'LE3 6RT', siteContactName: 'Sarah Miller', siteContactNumber: '07912 345678', accessNotes: 'Side gate access via driveway.' },
    activeJobIds: ['sl-1048'],
    activeJobNames: ['Oakfield kitchen extension'],
    activeJobRefs: ['SL-1048'],
    portalStatus: 'active',
    portalAccessId: 'pa-1',
    waitingActions: 1,
    outstandingValue: 8640,
    lastActivity: 'Today',
    archived: false,
    accountStatus: 'active',
    createdAt: '2026-05-10',
  },
  {
    id: 'client-2',
    type: 'business',
    displayName: 'Northlight Studio Ltd',
    companyName: 'Northlight Studio Ltd',
    contacts: [
      { id: 'ct-2a', firstName: 'James', lastName: 'North', email: 'accounts@northlightstudio.co.uk', mobile: '07789 123456', preferredContact: 'email', isPrimary: true },
    ],
    billingAddress: { addressLine1: '8 Harcourt Street', town: 'Nottingham', county: 'Nottinghamshire', postcode: 'NG1 4FG' },
    siteAddress: { addressLine1: '8 Harcourt Street', town: 'Nottingham', county: 'Nottinghamshire', postcode: 'NG1 4FG', siteContactName: 'James North', siteContactNumber: '07789 123456', accessNotes: 'Reception desk key code: 4821.' },
    activeJobIds: ['sl-1051'],
    activeJobNames: ['Harcourt office rewire'],
    activeJobRefs: ['SL-1051'],
    portalStatus: 'active',
    portalAccessId: 'pa-2',
    waitingActions: 2,
    outstandingValue: 4200,
    lastActivity: 'Today',
    archived: false,
    accountStatus: 'active',
    createdAt: '2026-06-01',
  },
  {
    id: 'client-3',
    type: 'individual',
    firstName: 'Priya',
    lastName: 'Shah',
    displayName: 'Priya Shah',
    contacts: [
      { id: 'ct-3a', firstName: 'Priya', lastName: 'Shah', email: 'priya.shah@email.com', mobile: '07845 987654', preferredContact: 'mobile', isPrimary: true },
    ],
    billingAddress: { addressLine1: '22 Riverside Close', town: 'Derby', county: 'Derbyshire', postcode: 'DE1 2FN' },
    siteAddress: { addressLine1: '22 Riverside Close', town: 'Derby', county: 'Derbyshire', postcode: 'DE1 2FN', siteContactName: 'Priya Shah', siteContactNumber: '07845 987654', accessNotes: 'Parking on driveway.' },
    activeJobIds: ['sl-1042'],
    activeJobNames: ['Riverside bathroom suite'],
    activeJobRefs: ['SL-1042'],
    portalStatus: 'active',
    portalAccessId: 'pa-3',
    waitingActions: 0,
    outstandingValue: 2560,
    lastActivity: 'Yesterday',
    archived: false,
    accountStatus: 'active',
    createdAt: '2026-06-20',
  },
  {
    id: 'client-4',
    type: 'individual',
    firstName: 'Robert',
    lastName: 'Ellis',
    displayName: 'Robert Ellis',
    contacts: [
      { id: 'ct-4a', firstName: 'Robert', lastName: 'Ellis', email: 'robert.ellis@email.com', mobile: '07555 246801', preferredContact: 'either', isPrimary: true },
    ],
    billingAddress: { addressLine1: '6 Meadow View', town: 'Coventry', county: 'West Midlands', postcode: 'CV3 2LP' },
    siteAddress: { addressLine1: '6 Meadow View', town: 'Coventry', county: 'West Midlands', postcode: 'CV3 2LP', siteContactName: 'Robert Ellis', siteContactNumber: '07555 246801', accessNotes: 'Boiler located in garage.' },
    activeJobIds: ['sl-1054'],
    activeJobNames: ['Meadow View boiler replacement'],
    activeJobRefs: ['SL-1054'],
    portalStatus: 'invited',
    waitingActions: 1,
    outstandingValue: 1640,
    lastActivity: 'Yesterday',
    archived: false,
    accountStatus: 'active',
    createdAt: '2026-07-15',
  },
  {
    id: 'client-5',
    type: 'business',
    displayName: 'Kingsway Retail Group',
    companyName: 'Kingsway Retail Group',
    contacts: [
      { id: 'ct-5a', firstName: 'Mark', lastName: 'Stevens', email: 'facilities@kingswayretail.co.uk', mobile: '0121 555 8900', preferredContact: 'email', isPrimary: true },
    ],
    billingAddress: { addressLine1: 'Unit 4, Kingsway Park', town: 'Birmingham', county: 'West Midlands', postcode: 'B24 9QR' },
    siteAddress: { addressLine1: 'Unit 4, Kingsway Park', town: 'Birmingham', county: 'West Midlands', postcode: 'B24 9QR', siteContactName: 'Mark Stevens', siteContactNumber: '0121 555 8900', accessNotes: 'Delivery entrance at rear via service road.' },
    activeJobIds: ['sl-1039'],
    activeJobNames: ['Kingsway retail refurbishment'],
    activeJobRefs: ['SL-1039'],
    portalStatus: 'action_required',
    portalAccessId: 'pa-5',
    waitingActions: 1,
    outstandingValue: 24600,
    lastActivity: '2 days ago',
    archived: false,
    accountStatus: 'active',
    createdAt: '2026-04-01',
  },
];

// ─── Demo Portal Access Records ────────────────────────

export const demoPortalAccess: ClientPortalAccess[] = [
  {
    id: 'pa-1',
    clientId: 'client-1',
    token: 'sl-portal-a7f3b2c9d1e4f5a6b7c8d9e0f1a2b3c4',
    status: 'active',
    invitedContacts: ['sarah.miller@email.com', 'ben.miller@email.com'],
    lastAccessed: '2026-08-05T09:30:00Z',
    accessExpiry: '2027-01-01T00:00:00Z',
    createdAt: '2026-06-01T00:00:00Z',
    projectIds: ['sl-1048'],
    permissions: defaultPortalPermissions(),
  },
  {
    id: 'pa-2',
    clientId: 'client-2',
    token: 'sl-portal-b8g4c3d2e5f6a7b8c9d0e1f2a3b4c5d6',
    status: 'active',
    invitedContacts: ['accounts@northlightstudio.co.uk'],
    lastAccessed: '2026-08-04T14:20:00Z',
    accessExpiry: '2027-02-01T00:00:00Z',
    createdAt: '2026-06-10T00:00:00Z',
    projectIds: ['sl-1051'],
    permissions: defaultPortalPermissions(),
  },
  {
    id: 'pa-3',
    clientId: 'client-3',
    token: 'sl-portal-c9h5d4e3f6a7b8c9d0e1f2a3b4c5d6e7',
    status: 'active',
    invitedContacts: ['priya.shah@email.com'],
    lastAccessed: '2026-08-05T11:00:00Z',
    accessExpiry: '2027-03-01T00:00:00Z',
    createdAt: '2026-07-01T00:00:00Z',
    projectIds: ['sl-1042'],
    permissions: defaultPortalPermissions(),
  },
  {
    id: 'pa-5',
    clientId: 'client-5',
    token: 'sl-portal-d0i6e5f4a7b8c9d0e1f2a3b4c5d6e7f8',
    status: 'active',
    invitedContacts: ['facilities@kingswayretail.co.uk'],
    lastAccessed: '2026-08-03T08:45:00Z',
    accessExpiry: '2026-12-01T00:00:00Z',
    createdAt: '2026-05-01T00:00:00Z',
    projectIds: ['sl-1039'],
    permissions: defaultPortalPermissions(),
  },
];

// ─── Demo Communications ───────────────────────────────

export const demoCommunications: ClientCommunication[] = [
  {
    id: 'comm-1',
    type: 'progress_update',
    subject: 'Steelwork preparation completed',
    projectId: 'sl-1048',
    projectName: 'Oakfield kitchen extension',
    dateTime: '2026-08-05T09:20:00Z',
    sender: 'Martin Hewett',
    senderRole: 'Project Manager',
    recipients: ['Sarah & Ben Miller'],
    visibility: 'client_visible',
    message: 'The existing opening has been prepared and checked. Steel installation is scheduled for today. All building control requirements have been reviewed and the structural engineer has confirmed the steel specification.',
    deliveryState: 'viewed',
    auditRef: 'AUD-2026-0805-001',
  },
  {
    id: 'comm-2',
    type: 'decision_request',
    subject: 'Additional kitchen sockets — Variation 004',
    projectId: 'sl-1048',
    projectName: 'Oakfield kitchen extension',
    dateTime: '2026-08-03T10:00:00Z',
    sender: 'Martin Hewett',
    senderRole: 'Project Manager',
    recipients: ['Sarah & Ben Miller'],
    visibility: 'client_visible',
    message: 'Please review Variation 004 for additional kitchen sockets. The variation adds 6 double sockets within the revised kitchen layout. Total cost: £1,536 including VAT. Please approve by 5 August.',
    relatedRecord: 'VAR-004',
    deliveryState: 'viewed',
    auditRef: 'AUD-2026-0803-001',
  },
  {
    id: 'comm-3',
    type: 'decision_request',
    subject: 'Flooring selection required',
    projectId: 'sl-1048',
    projectName: 'Oakfield kitchen extension',
    dateTime: '2026-08-02T14:00:00Z',
    sender: 'Martin Hewett',
    senderRole: 'Project Manager',
    recipients: ['Sarah & Ben Miller'],
    visibility: 'client_visible',
    message: 'We need your flooring selection for the kitchen. Options: Oak engineered wood, Natural stone tiles, or Client-supplied material. Please confirm by 8 August so we can order materials.',
    deliveryState: 'delivered',
    auditRef: 'AUD-2026-0802-001',
  },
  {
    id: 'comm-4',
    type: 'phone_call_note',
    subject: 'Chased payment application',
    projectId: 'sl-1048',
    projectName: 'Oakfield kitchen extension',
    dateTime: '2026-08-04T16:30:00Z',
    sender: 'Martin Hewett',
    senderRole: 'Project Manager',
    recipients: ['Internal record'],
    visibility: 'internal_only',
    message: 'Called Sarah re: outstanding payment application of £8,640. She confirmed payment will be made by Friday 7 August.',
    deliveryState: 'sent',
    auditRef: 'AUD-2026-0804-001',
  },
  {
    id: 'comm-5',
    type: 'message',
    subject: 'Steel delivery confirmed',
    projectId: 'sl-1048',
    projectName: 'Oakfield kitchen extension',
    dateTime: '2026-08-04T08:00:00Z',
    sender: 'Martin Hewett',
    senderRole: 'Project Manager',
    recipients: ['Sarah & Ben Miller'],
    visibility: 'client_visible',
    message: 'Steel delivery confirmed for tomorrow morning. The team will be on site from 08:00. Please ensure the driveway is clear for the delivery vehicle.',
    deliveryState: 'viewed',
    auditRef: 'AUD-2026-0804-002',
  },
];

// ─── Demo Decisions ────────────────────────────────────

export const demoDecisions: ClientDecision[] = [
  {
    id: 'dec-1',
    question: 'Kitchen door colour',
    description: 'Please select your preferred colour for the bi-fold doors.',
    options: ['Anthracite Grey', 'Deep Forest Green', 'Classic White'],
    selectedOption: 'Deep Forest Green',
    dueDate: '2026-08-02',
    relatedJobStage: 'Structure',
    status: 'approved',
    respondedBy: 'Sarah Miller',
    respondedAt: '2026-08-04T11:00:00Z',
    portalSessionRef: 'portal-ses-001',
    decisionVersion: 1,
    confirmationText: 'I confirm my selection of Deep Forest Green for the bi-fold doors.',
    projectId: 'sl-1048',
    projectName: 'Oakfield kitchen extension',
    clientId: 'client-1',
    createdAt: '2026-07-28T09:00:00Z',
    auditHistory: [
      { timestamp: '2026-07-28T09:00:00Z', event: 'Decision created', actor: 'Martin Hewett' },
      { timestamp: '2026-07-28T09:30:00Z', event: 'Sent to client', actor: 'Martin Hewett' },
      { timestamp: '2026-08-01T14:20:00Z', event: 'Viewed by client', actor: 'Sarah Miller' },
      { timestamp: '2026-08-04T11:00:00Z', event: 'Approved', actor: 'Sarah Miller', detail: 'Selected: Deep Forest Green' },
    ],
  },
  {
    id: 'dec-2',
    question: 'Additional kitchen sockets',
    description: 'Install six additional double sockets within the revised kitchen layout.',
    options: ['Approve — £1,536 including VAT', 'Decline — no additional sockets'],
    costImpact: '£1,536 including VAT',
    programmeImpact: '1 additional working day',
    dueDate: '2026-08-05',
    relatedJobStage: 'First fix',
    relatedVariationId: 'var-004',
    relatedVariationRef: 'VAR-004',
    status: 'viewed',
    portalSessionRef: 'portal-ses-002',
    decisionVersion: 1,
    projectId: 'sl-1048',
    projectName: 'Oakfield kitchen extension',
    clientId: 'client-1',
    createdAt: '2026-08-03T10:00:00Z',
    auditHistory: [
      { timestamp: '2026-08-03T10:00:00Z', event: 'Decision created', actor: 'Martin Hewett' },
      { timestamp: '2026-08-03T10:15:00Z', event: 'Sent to client', actor: 'Martin Hewett' },
      { timestamp: '2026-08-04T09:00:00Z', event: 'Viewed by client', actor: 'Sarah Miller', detail: 'Linked to Variation 004' },
    ],
  },
  {
    id: 'dec-3',
    question: 'Flooring selection',
    description: 'Please choose the flooring material for the kitchen.',
    options: ['Oak engineered wood', 'Natural stone tiles', 'Client-supplied material'],
    dueDate: '2026-08-08',
    relatedJobStage: 'Second fix',
    status: 'requested',
    decisionVersion: 1,
    projectId: 'sl-1048',
    projectName: 'Oakfield kitchen extension',
    clientId: 'client-1',
    createdAt: '2026-08-02T14:00:00Z',
    auditHistory: [
      { timestamp: '2026-08-02T14:00:00Z', event: 'Decision created', actor: 'Martin Hewett' },
      { timestamp: '2026-08-02T14:30:00Z', event: 'Sent to client', actor: 'Martin Hewett' },
    ],
  },
];

// ─── Demo Project Stages ──────────────────────────────

export const demoProjectStages: ProjectStage[] = [
  { id: 'stage-1', name: 'Pre-start', status: 'complete', plannedStart: '2026-05-20', plannedEnd: '2026-06-14', summary: 'Design, estimating, and contract preparation completed.' },
  { id: 'stage-2', name: 'Groundworks', status: 'complete', plannedStart: '2026-06-15', plannedEnd: '2026-06-28', summary: 'Foundations, drainage, and ground floor slab completed.' },
  { id: 'stage-3', name: 'Structure', status: 'in_progress', plannedStart: '2026-06-29', plannedEnd: '2026-08-10', summary: 'Steel installation in progress. Blockwork and roof structure to follow.', updates: ['Steelwork preparation completed — 5 Aug', 'Steel installation scheduled — 5 Aug'] },
  { id: 'stage-4', name: 'First fix', status: 'upcoming', plannedStart: '2026-08-11', plannedEnd: '2026-08-24', summary: 'Electrical, plumbing, and heating first fix throughout the extension.' },
  { id: 'stage-5', name: 'Second fix', status: 'upcoming', plannedStart: '2026-08-25', plannedEnd: '2026-09-07', summary: 'Plastering, joinery, and second-fix trades.' },
  { id: 'stage-6', name: 'Finishing', status: 'upcoming', plannedStart: '2026-09-08', plannedEnd: '2026-09-17', summary: 'Decoration, flooring, tiling, and final fittings.' },
  { id: 'stage-7', name: 'Handover', status: 'upcoming', plannedStart: '2026-09-18', plannedEnd: '2026-09-18', summary: 'Client walkthrough, snagging, and handover.' },
];

// ─── Demo Client-Visible Evidence ─────────────────────

export const demoClientEvidence: ClientVisibleEvidence[] = [
  {
    id: 'ev-1',
    caption: 'Steel beam preparation — opening cleared and checked',
    dateTime: '2026-08-05T08:45:00Z',
    uploadedBy: 'Martin Hewett',
    visibility: 'client_visible',
    imageUrl: 'https://readdy.ai/api/search-image?query=Professional%20construction%20site%20photograph%20showing%20a%20prepared%20steel%20beam%20opening%20in%20a%20brick%20wall%20of%20a%20kitchen%20extension%2C%20clean%20worksite%20with%20tools%20neatly%20arranged%2C%20natural%20daylight%2C%20warm%20neutral%20tones%2C%20documentary%20construction%20photography%20style&width=800&height=600&seq=sl-ev-001&orientation=landscape',
  },
  {
    id: 'ev-2',
    caption: 'Steel delivery on site — beams positioned for installation',
    dateTime: '2026-08-05T09:15:00Z',
    uploadedBy: 'James Lawrence',
    visibility: 'client_visible',
    imageUrl: 'https://readdy.ai/api/search-image?query=Construction%20site%20showing%20steel%20beams%20delivered%20and%20positioned%20near%20a%20residential%20extension%2C%20clear%20sky%2C%20professional%20tradespeople%20in%20high%20visibility%20clothing%2C%20organized%20materials%2C%20bright%20natural%20light&width=800&height=600&seq=sl-ev-002&orientation=landscape',
  },
  {
    id: 'ev-3',
    caption: 'Drainage connection completed and tested',
    dateTime: '2026-08-04T16:00:00Z',
    uploadedBy: 'Adam Khan',
    visibility: 'internal_only',
    imageUrl: 'https://readdy.ai/api/search-image?query=Underground%20drainage%20pipe%20connection%20at%20a%20construction%20site%2C%20freshly%20backfilled%20trench%2C%20professional%20plumbing%20work%2C%20clean%20and%20tidy%20worksite%2C%20natural%20outdoor%20lighting%2C%20documentary%20style&width=800&height=600&seq=sl-ev-003&orientation=landscape',
  },
  {
    id: 'ev-4',
    caption: 'Kitchen layout — wall positions marked out',
    dateTime: '2026-08-05T10:30:00Z',
    uploadedBy: 'Martin Hewett',
    visibility: 'client_visible',
    imageUrl: 'https://readdy.ai/api/search-image?query=Interior%20of%20a%20kitchen%20extension%20under%20construction%20with%20wall%20positions%20marked%20on%20concrete%20floor%2C%20tape%20measures%20and%20marking%20tools%20visible%2C%20bright%20natural%20light%20through%20roof%20opening%2C%20clean%20professional%20worksite&width=800&height=600&seq=sl-ev-004&orientation=landscape',
  },
  {
    id: 'ev-5',
    caption: 'Building Control inspection — foundation check',
    dateTime: '2026-08-01T11:00:00Z',
    uploadedBy: 'Martin Hewett',
    visibility: 'internal_only',
    imageUrl: 'https://readdy.ai/api/search-image?query=Building%20inspector%20examining%20foundation%20at%20a%20construction%20site%2C%20clipboard%20and%20measuring%20equipment%2C%20professional%20setting%2C%20clear%20daylight%2C%20documentary%20construction%20photography&width=800&height=600&seq=sl-ev-005&orientation=landscape',
  },
  {
    id: 'ev-6',
    caption: 'Blockwork progress — rear elevation taking shape',
    dateTime: '2026-08-03T14:30:00Z',
    uploadedBy: 'Martin Hewett',
    visibility: 'client_visible',
    imageUrl: 'https://readdy.ai/api/search-image?query=Residential%20extension%20showing%20blockwork%20walls%20in%20progress%2C%20bricklayers%20at%20work%2C%20scaffolding%20in%20background%2C%20warm%20summer%20afternoon%20light%2C%20professional%20construction%20site%20photography%2C%20clean%20composition&width=800&height=600&seq=sl-ev-006&orientation=landscape',
  },
];

// ─── Demo Variations ───────────────────────────────────

export const variationRequestedByOptions = ['Client', 'Contractor', 'Designer', 'Main contractor', 'Site condition', 'Authority', 'Other'];

export const variationSourceOptions = ['Client request', 'Site instruction', 'Design change', 'Unforeseen condition', 'Authority requirement', 'Value engineering', 'Other'];

export const demoVariations: VariationRecord[] = [
  {
    id: 'var-004',
    reference: 'VAR-004',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    clientId: 'client-1',
    clientName: 'Sarah & Ben Miller',
    title: 'Additional kitchen sockets',
    requestedBy: 'Client',
    source: 'Client request',
    reason: 'Revised kitchen layout requires additional socket positions for appliances and worktop areas.',
    status: 'viewed',
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: '2026-08-03T08:00:00Z',
        createdBy: 'Martin Hewett',
        status: 'viewed',
        title: 'Additional kitchen sockets',
        description: 'Install six additional double sockets within the revised kitchen layout. The client has revised the kitchen design and additional power points are required for the new appliance positions.',
        includedWork: 'Six double sockets\nCable and accessories\nInstallation\nTesting\nCertification update\nMaking good around new positions',
        excludedWork: 'Decorative finishing\nChanges requested after first-fix completion',
        internalCost: 865,
        clientPrice: 1280,
        vatAmount: 256,
        totalPrice: 1536,
        programmeImpact: '1 additional working day',
        revisedCompletion: '19 September 2026',
        approvalDeadline: '2026-08-05',
      },
    ],
    latestInternalCost: 865,
    latestClientPrice: 1280,
    latestVatAmount: 256,
    latestTotalPrice: 1536,
    vatTreatment: 'Standard VAT',
    programmeImpactDays: 1,
    revisedCompletion: '2026-09-19',
    approvalDeadline: '2026-08-05',
    risk: 'Low',
    createdAt: '2026-08-03T08:00:00Z',
    updatedAt: '2026-08-04T09:00:00Z',
    sentAt: '2026-08-03T10:00:00Z',
    viewedAt: '2026-08-04T09:00:00Z',
    internalNotes: 'Client requested during site visit on 2 August. Prepared by Martin, internal review by Amelia. Sent to client portal.',
    questions: [],
    attachments: ['Kitchen socket layout — revised.pdf', 'Additional socket locations plan.pdf'],
  },
  {
    id: 'var-001',
    reference: 'VAR-001',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    clientId: 'client-1',
    clientName: 'Sarah & Ben Miller',
    title: 'Upgrade to underfloor heating manifold',
    requestedBy: 'Contractor',
    source: 'Site condition',
    reason: 'Existing manifold found to be incompatible with new boiler specification. Replacement required.',
    status: 'approved',
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: '2026-07-10T09:00:00Z',
        createdBy: 'Martin Hewett',
        status: 'approved',
        title: 'Upgrade to underfloor heating manifold',
        description: 'Replace existing underfloor heating manifold with compatible unit for new boiler specification.',
        includedWork: 'New manifold unit\nPipe adaptors\nInstallation\nSystem flush and test',
        excludedWork: 'Additional pipework beyond manifold connections',
        internalCost: 420,
        clientPrice: 680,
        vatAmount: 136,
        totalPrice: 816,
        programmeImpact: 'No additional time (completed alongside scheduled work)',
      },
    ],
    latestInternalCost: 420,
    latestClientPrice: 680,
    latestVatAmount: 136,
    latestTotalPrice: 816,
    vatTreatment: 'Standard VAT',
    programmeImpactDays: 0,
    risk: 'None',
    createdAt: '2026-07-10T09:00:00Z',
    updatedAt: '2026-07-12T14:00:00Z',
    sentAt: '2026-07-10T10:00:00Z',
    viewedAt: '2026-07-11T08:30:00Z',
    approvedAt: '2026-07-12T14:00:00Z',
    approvedBy: 'Sarah Miller',
    internalNotes: 'Identified during first fix. Quick approval from client.',
    questions: [],
  },
  {
    id: 'var-002',
    reference: 'VAR-002',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    clientId: 'client-1',
    clientName: 'Sarah & Ben Miller',
    title: 'Additional roof lantern glazing bar',
    requestedBy: 'Client',
    source: 'Client request',
    reason: 'Client requested additional glazing bar in roof lantern for aesthetic preference.',
    status: 'approved',
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: '2026-07-18T11:00:00Z',
        createdBy: 'Martin Hewett',
        status: 'approved',
        title: 'Additional roof lantern glazing bar',
        description: 'Add one extra glazing bar to the roof lantern as requested by the client.',
        includedWork: 'Additional glazing bar\nModification to frame\nInstallation',
        excludedWork: 'Changes to glazing specification',
        internalCost: 320,
        clientPrice: 480,
        vatAmount: 96,
        totalPrice: 576,
        programmeImpact: 'No programme impact',
      },
    ],
    latestInternalCost: 320,
    latestClientPrice: 480,
    latestVatAmount: 96,
    latestTotalPrice: 576,
    vatTreatment: 'Standard VAT',
    programmeImpactDays: 0,
    risk: 'None',
    createdAt: '2026-07-18T11:00:00Z',
    updatedAt: '2026-07-20T09:00:00Z',
    sentAt: '2026-07-18T14:00:00Z',
    viewedAt: '2026-07-19T10:00:00Z',
    approvedAt: '2026-07-20T09:00:00Z',
    approvedBy: 'Ben Miller',
    internalNotes: 'Straightforward addition. Supplier confirmed lead time.',
    questions: [],
  },
  {
    id: 'var-003',
    reference: 'VAR-003',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    clientId: 'client-1',
    clientName: 'Sarah & Ben Miller',
    title: 'Bi-fold door threshold upgrade',
    requestedBy: 'Designer',
    source: 'Design change',
    reason: 'Architect recommended low-profile threshold for accessibility and aesthetic improvement.',
    status: 'approved',
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: '2026-07-22T08:30:00Z',
        createdBy: 'Martin Hewett',
        status: 'approved',
        title: 'Bi-fold door threshold upgrade',
        description: 'Upgrade from standard threshold to low-profile aluminium threshold for improved accessibility and cleaner aesthetic.',
        includedWork: 'Low-profile aluminium threshold\nAdditional DPC detailing\nInstallation\nMaking good',
        excludedWork: 'Door unit itself (already priced)',
        internalCost: 580,
        clientPrice: 880,
        vatAmount: 176,
        totalPrice: 1056,
        programmeImpact: 'No programme impact',
      },
    ],
    latestInternalCost: 580,
    latestClientPrice: 880,
    latestVatAmount: 176,
    latestTotalPrice: 1056,
    vatTreatment: 'Standard VAT',
    programmeImpactDays: 0,
    risk: 'None',
    createdAt: '2026-07-22T08:30:00Z',
    updatedAt: '2026-07-23T16:00:00Z',
    sentAt: '2026-07-22T09:00:00Z',
    viewedAt: '2026-07-22T20:00:00Z',
    approvedAt: '2026-07-23T16:00:00Z',
    approvedBy: 'Sarah Miller',
    internalNotes: 'Recommended by architect at design review.',
    questions: [],
  },
  {
    id: 'var-005',
    reference: 'VAR-005',
    jobId: 'sl-1051',
    jobRef: 'SL-1051',
    jobName: 'Harcourt office rewire',
    clientId: 'client-2',
    clientName: 'Northlight Studio Ltd',
    title: 'Additional data points — ground floor',
    requestedBy: 'Client',
    source: 'Client request',
    reason: 'Client requires four additional data points in ground floor meeting room.',
    status: 'sent',
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: '2026-08-01T09:00:00Z',
        createdBy: 'Martin Hewett',
        status: 'sent',
        title: 'Additional data points — ground floor',
        description: 'Install four additional Cat6 data points in ground floor meeting room.',
        includedWork: 'Four Cat6 data points\nCable runs\nFaceplates\nTesting and certification',
        excludedWork: 'Network switch or active equipment',
        internalCost: 380,
        clientPrice: 620,
        vatAmount: 124,
        totalPrice: 744,
        programmeImpact: 'Half a day additional work',
      },
    ],
    latestInternalCost: 380,
    latestClientPrice: 620,
    latestVatAmount: 124,
    latestTotalPrice: 744,
    vatTreatment: 'Standard VAT',
    programmeImpactDays: 1,
    risk: 'Low',
    createdAt: '2026-08-01T09:00:00Z',
    updatedAt: '2026-08-01T14:00:00Z',
    sentAt: '2026-08-01T14:00:00Z',
    internalNotes: 'Simple addition. Cable runs are accessible.',
    questions: [],
  },
  {
    id: 'var-006',
    reference: 'VAR-006',
    jobId: 'sl-1039',
    jobRef: 'SL-1039',
    jobName: 'Kingsway retail refurbishment',
    clientId: 'client-5',
    clientName: 'Kingsway Retail Group',
    title: 'Shopfront glazing specification change',
    requestedBy: 'Client',
    source: 'Client request',
    reason: 'Client upgraded shopfront glazing to acoustic laminated glass for noise reduction.',
    status: 'draft',
    currentVersion: 1,
    versions: [
      {
        version: 1,
        createdAt: '2026-08-04T16:00:00Z',
        createdBy: 'Martin Hewett',
        status: 'draft',
        title: 'Shopfront glazing specification change',
        description: 'Change shopfront glazing from standard toughened to acoustic laminated glass.',
        includedWork: 'Acoustic laminated glass panels\nRevised framing detail\nInstallation\nWaste removal of original glass',
        excludedWork: 'Structural alterations to opening',
        internalCost: 3200,
        clientPrice: 4850,
        vatAmount: 970,
        totalPrice: 5820,
        programmeImpact: '2 additional working days for glass manufacture',
      },
    ],
    latestInternalCost: 3200,
    latestClientPrice: 4850,
    latestVatAmount: 970,
    latestTotalPrice: 5820,
    vatTreatment: 'Standard VAT',
    programmeImpactDays: 2,
    risk: 'Medium',
    createdAt: '2026-08-04T16:00:00Z',
    updatedAt: '2026-08-04T16:00:00Z',
    internalNotes: 'Draft prepared following client meeting. Awaiting internal review before sending.',
    questions: [],
  },
];

// ─── Demo Portal Audit Events ──────────────────────────

export const demoPortalAuditEvents: PortalAuditEvent[] = [
  { id: 'pae-1', timestamp: '2026-08-05T09:30:00Z', event: 'Portal accessed', actor: 'Sarah Miller', sessionRef: 'portal-ses-010' },
  { id: 'pae-2', timestamp: '2026-08-04T11:00:00Z', event: 'Decision approved', actor: 'Sarah Miller', detail: 'Kitchen door colour — Deep Forest Green', sessionRef: 'portal-ses-001' },
  { id: 'pae-3', timestamp: '2026-08-04T09:00:00Z', event: 'Variation viewed', actor: 'Sarah Miller', detail: 'VAR-004 — Additional kitchen sockets', sessionRef: 'portal-ses-002' },
  { id: 'pae-4', timestamp: '2026-08-04T08:00:00Z', event: 'Progress update viewed', actor: 'Sarah Miller', sessionRef: 'portal-ses-009' },
  { id: 'pae-5', timestamp: '2026-08-03T15:00:00Z', event: 'Portal accessed', actor: 'Ben Miller', sessionRef: 'portal-ses-008' },
  { id: 'pae-6', timestamp: '2026-08-01T14:20:00Z', event: 'Decision viewed', actor: 'Sarah Miller', detail: 'Kitchen door colour', sessionRef: 'portal-ses-001' },
  { id: 'pae-7', timestamp: '2026-07-28T09:30:00Z', event: 'Portal invitation sent', actor: 'Martin Hewett', detail: 'Invited sarah.miller@email.com, ben.miller@email.com' },
];

// ─── Service / Repository Helpers ──────────────────────

export function getAllClients(): ClientRecord[] {
  return demoClientRecords;
}

export function getClientById(id: string): ClientRecord | undefined {
  return demoClientRecords.find((c) => c.id === id);
}

export function getPortalAccessByClientId(clientId: string): ClientPortalAccess | undefined {
  return demoPortalAccess.find((p) => p.clientId === clientId);
}

export function getPortalAccessByToken(token: string): ClientPortalAccess | undefined {
  return demoPortalAccess.find((p) => p.token === token);
}

export function getCommunicationsByProject(projectId?: string): ClientCommunication[] {
  if (!projectId) return demoCommunications;
  return demoCommunications.filter((c) => c.projectId === projectId);
}

export function getDecisionsByProject(projectId: string): ClientDecision[] {
  return demoDecisions.filter((d) => d.projectId === projectId);
}

export function getDecisionsByClient(clientId: string): ClientDecision[] {
  return demoDecisions.filter((d) => d.clientId === clientId);
}

export function getClientVisibleEvidence(projectId: string): ClientVisibleEvidence[] {
  return demoClientEvidence.filter((e) => e.projectId === projectId || !e.visibility || e.visibility === 'client_visible');
}

export function getPortalAuditEventsForClient(clientId: string): PortalAuditEvent[] {
  const access = demoPortalAccess.find((p) => p.clientId === clientId);
  if (!access) return [];
  return demoPortalAuditEvents;
}

export function getAllVariations(): VariationRecord[] {
  return demoVariations;
}

export function getVariationsByJob(jobId: string): VariationRecord[] {
  return demoVariations.filter((v) => v.jobId === jobId);
}

export function getVariationById(id: string): VariationRecord | undefined {
  return demoVariations.find((v) => v.id === id);
}

export function getVariationByRef(ref: string): VariationRecord | undefined {
  return demoVariations.find((v) => v.reference === ref);
}

export function getDemoProjectsForClient(clientId: string) {
  const client = getClientById(clientId);
  if (!client) return [];
  return client.activeJobRefs.map((ref, i) => ({
    jobId: client.activeJobIds[i],
    jobRef: ref,
    jobName: client.activeJobNames[i],
  }));
}

export function getPortalStatusLabel(status: PortalStatus): string {
  const labels: Record<string, string> = {
    not_invited: 'Not invited',
    invited: 'Invited',
    active: 'Active',
    action_required: 'Action required',
    revoked: 'Revoked',
    expired: 'Expired',
  };
  return labels[status] || status;
}

export function getPortalStatusColor(status: PortalStatus): string {
  const colors: Record<string, string> = {
    not_invited: 'bg-gray-300 text-gray-700',
    invited: 'bg-status-blue text-white',
    active: 'bg-status-green text-white',
    action_required: 'bg-status-red text-white',
    revoked: 'bg-gray-500 text-white',
    expired: 'bg-status-amber text-white',
  };
  return colors[status] || 'bg-gray-300 text-gray-700';
}

export function getVariationStatusLabel(status: VariationStatus): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    internal_review: 'Internal review',
    ready_to_send: 'Ready to send',
    sent: 'Sent',
    viewed: 'Viewed',
    question_received: 'Question received',
    approved: 'Approved',
    declined: 'Declined',
    withdrawn: 'Withdrawn',
    superseded: 'Superseded',
    invoiced: 'Invoiced',
  };
  return labels[status] || status;
}

export function getVariationStatusColor(status: VariationStatus): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-300 text-gray-700',
    internal_review: 'bg-status-blue text-white',
    ready_to_send: 'bg-status-purple text-white',
    sent: 'bg-status-blue text-white',
    viewed: 'bg-status-amber text-white',
    question_received: 'bg-status-amber text-white',
    approved: 'bg-status-green text-white',
    declined: 'bg-status-red text-white',
    withdrawn: 'bg-gray-500 text-white',
    superseded: 'bg-gray-500 text-white',
    invoiced: 'bg-status-green text-white',
  };
  return colors[status] || 'bg-gray-300 text-gray-700';
}

export function getDecisionStatusLabel(status: DecisionStatus): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    requested: 'Requested',
    viewed: 'Viewed',
    question_received: 'Question received',
    approved: 'Approved',
    declined: 'Declined',
    overdue: 'Overdue',
    cancelled: 'Cancelled',
    superseded: 'Superseded',
  };
  return labels[status] || status;
}

export function getDecisionStatusColor(status: DecisionStatus): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-300 text-gray-700',
    requested: 'bg-status-blue text-white',
    viewed: 'bg-status-amber text-white',
    question_received: 'bg-status-amber text-white',
    approved: 'bg-status-green text-white',
    declined: 'bg-status-red text-white',
    overdue: 'bg-status-red text-white',
    cancelled: 'bg-gray-400 text-white',
    superseded: 'bg-gray-400 text-white',
  };
  return colors[status] || 'bg-gray-300 text-gray-700';
}

export function getCommunicationTypeIcon(type: CommunicationType): string {
  const icons: Record<string, string> = {
    message: 'ri-chat-1-line',
    email_record: 'ri-mail-line',
    phone_call_note: 'ri-phone-line',
    meeting_note: 'ri-calendar-check-line',
    progress_update: 'ri-bar-chart-line',
    decision_request: 'ri-question-answer-line',
    variation: 'ri-price-tag-3-line',
    document_shared: 'ri-file-line',
    system_notification: 'ri-notification-3-line',
  };
  return icons[type] || 'ri-information-line';
}

export function getCommunicationTypeLabel(type: CommunicationType): string {
  const labels: Record<string, string> = {
    message: 'Message',
    email_record: 'Email record',
    phone_call_note: 'Phone call note',
    meeting_note: 'Meeting note',
    progress_update: 'Progress update',
    decision_request: 'Decision request',
    variation: 'Variation',
    document_shared: 'Document shared',
    system_notification: 'System notification',
  };
  return labels[type] || type;
}

// Quick filter options for clients workspace
export const clientQuickFilters = [
  { id: 'all', label: 'All clients' },
  { id: 'active', label: 'Active' },
  { id: 'portal_invited', label: 'Portal invited' },
  { id: 'portal_active', label: 'Portal active' },
  { id: 'action_required', label: 'Action required' },
  { id: 'archived', label: 'Archived' },
];

// Quick filter options for variations workspace
export const variationQuickFilters = [
  { id: 'all', label: 'All variations' },
  { id: 'draft', label: 'Draft' },
  { id: 'internal_review', label: 'Internal review' },
  { id: 'awaiting_client', label: 'Awaiting client' },
  { id: 'approved', label: 'Approved' },
  { id: 'declined', label: 'Declined' },
];

export const variationStatusFilterOptions: VariationStatus[] = [
  'draft', 'internal_review', 'ready_to_send', 'sent', 'viewed',
  'question_received', 'approved', 'declined', 'withdrawn', 'superseded', 'invoiced',
];