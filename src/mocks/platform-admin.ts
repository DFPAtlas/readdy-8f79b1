// BuildNerve Phase 13 — Platform Admin Mock Data
// Types and demo data for the platform administration control centre

export type PlatformRole =
  | 'platform_owner'
  | 'platform_admin'
  | 'platform_support'
  | 'platform_security'
  | 'platform_billing'
  | 'platform_read_only';

export type PlatformStaffStatus = 'active' | 'suspended' | 'invited';
export type SupportCaseStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
export type SupportCaseCategory = 'general' | 'access' | 'billing' | 'technical' | 'compliance' | 'security' | 'data' | 'feature_request';
export type SupportCasePriority = 'low' | 'normal' | 'high' | 'urgent';
export type AccessRequestType = 'metadata_only' | 'org_config' | 'job_readonly' | 'module_readonly' | 'controlled_repair' | 'emergency';
export type AccessRequestStatus = 'pending' | 'approved' | 'denied' | 'expired' | 'revoked';
export type GrantStatus = 'active' | 'expired' | 'revoked';
export type AnnouncementStatus = 'draft' | 'scheduled' | 'active' | 'ended' | 'cancelled';
export type AnnouncementTarget = 'all' | 'organisation_type' | 'plan' | 'specific_orgs';

export interface PlatformStaffMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: PlatformRole;
  mfaEnrolled: boolean;
  status: PlatformStaffStatus;
  lastSignInAt: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
}

export interface PlatformStaffInvitation {
  id: string;
  email: string;
  role: PlatformRole;
  invitedBy: string;
  invitedByName: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  createdAt: string;
}

export interface PlatformPermission {
  id: string;
  permissionKey: string;
  description: string;
  category: string;
}

export interface SupportCase {
  id: string;
  organisationId: string;
  organisationName: string;
  createdBy: string;
  createdByName: string;
  assignedTo: string | null;
  assignedToName: string | null;
  category: SupportCaseCategory;
  priority: SupportCasePriority;
  title: string;
  description: string;
  status: SupportCaseStatus;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccessRequest {
  id: string;
  requestorId: string;
  requestorName: string;
  requestorRole: PlatformRole;
  organisationId: string;
  organisationName: string;
  accessType: AccessRequestType;
  scopeDetails: string;
  reason: string;
  status: AccessRequestStatus;
  customerApproved: boolean;
  reviewedBy: string | null;
  reviewedByName: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface AccessGrant {
  id: string;
  staffUserId: string;
  staffName: string;
  organisationId: string;
  organisationName: string;
  accessType: AccessRequestType;
  reason: string;
  status: GrantStatus;
  grantedBy: string | null;
  grantedByName: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface PlatformAuditEvent {
  id: string;
  actorId: string;
  actorName: string;
  platformRole: PlatformRole;
  eventType: string;
  targetOrgId: string | null;
  targetOrgName: string | null;
  targetUserId: string | null;
  targetUserName: string | null;
  reason: string | null;
  ipAddress: string;
  createdAt: string;
}

export interface FeatureFlag {
  id: string;
  flagKey: string;
  description: string;
  defaultState: boolean;
  enabled: boolean;
  startAt: string | null;
  endAt: string | null;
  createdBy: string | null;
  changeReason: string | null;
}

export interface PlatformAnnouncement {
  id: string;
  title: string;
  body: string;
  status: AnnouncementStatus;
  targetType: AnnouncementTarget;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdBy: string;
  createdAt: string;
}

export interface OrganisationSummary {
  id: string;
  name: string;
  type: string;
  ownerName: string;
  ownerEmail: string;
  plan: string;
  status: string;
  memberCount: number;
  jobCount: number;
  storageUsed: string;
  createdAt: string;
  lastActivityAt: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  status: string;
  orgMemberships: number;
  mfaEnabled: boolean;
  lastSignIn: string;
  createdAt: string;
}

export interface PlatformMetrics {
  totalActiveOrgs: number;
  trialOrgs: number;
  suspendedOrgs: number;
  activeUsers: number;
  newRegistrations: number;
  storageUsed: string;
  failedDeliveries: number;
  pendingSupportCases: number;
  pendingAccessRequests: number;
  recentSecurityEvents: number;
  recentPrivilegedActions: number;
}

// ============================================================================
// DEMO DATA
// ============================================================================

export const demoPlatformStaff: PlatformStaffMember[] = [
  {
    id: 'ps-001',
    userId: 'user-admin-001',
    name: 'James Mitchell',
    email: 'james.mitchell@buildnerve.co.uk',
    role: 'platform_owner',
    mfaEnrolled: true,
    status: 'active',
    lastSignInAt: '2026-08-06T08:15:00Z',
    suspendedAt: null,
    suspendedReason: null,
    createdAt: '2025-01-15T09:00:00Z',
  },
  {
    id: 'ps-002',
    userId: 'user-admin-002',
    name: 'Sarah Okonkwo',
    email: 'sarah.okonkwo@buildnerve.co.uk',
    role: 'platform_admin',
    mfaEnrolled: true,
    status: 'active',
    lastSignInAt: '2026-08-06T09:30:00Z',
    suspendedAt: null,
    suspendedReason: null,
    createdAt: '2025-03-10T10:00:00Z',
  },
  {
    id: 'ps-003',
    userId: 'user-admin-003',
    name: 'David Chen',
    email: 'david.chen@buildnerve.co.uk',
    role: 'platform_support',
    mfaEnrolled: true,
    status: 'active',
    lastSignInAt: '2026-08-06T07:45:00Z',
    suspendedAt: null,
    suspendedReason: null,
    createdAt: '2025-06-01T08:00:00Z',
  },
  {
    id: 'ps-004',
    userId: 'user-admin-004',
    name: 'Priya Patel',
    email: 'priya.patel@buildnerve.co.uk',
    role: 'platform_security',
    mfaEnrolled: true,
    status: 'active',
    lastSignInAt: '2026-08-05T16:20:00Z',
    suspendedAt: null,
    suspendedReason: null,
    createdAt: '2025-06-15T09:00:00Z',
  },
  {
    id: 'ps-005',
    userId: 'user-admin-005',
    name: 'Tom Williams',
    email: 'tom.williams@buildnerve.co.uk',
    role: 'platform_billing',
    mfaEnrolled: true,
    status: 'active',
    lastSignInAt: '2026-08-04T11:00:00Z',
    suspendedAt: null,
    suspendedReason: null,
    createdAt: '2025-09-01T09:00:00Z',
  },
  {
    id: 'ps-006',
    userId: 'user-admin-006',
    name: 'Emma Taylor',
    email: 'emma.taylor@buildnerve.co.uk',
    role: 'platform_read_only',
    mfaEnrolled: true,
    status: 'active',
    lastSignInAt: '2026-08-03T14:30:00Z',
    suspendedAt: null,
    suspendedReason: null,
    createdAt: '2026-01-10T09:00:00Z',
  },
  {
    id: 'ps-007',
    userId: 'user-admin-007',
    name: 'Mark Harrison',
    email: 'mark.harrison@buildnerve.co.uk',
    role: 'platform_support',
    mfaEnrolled: false,
    status: 'suspended',
    lastSignInAt: '2026-06-15T10:00:00Z',
    suspendedAt: '2026-07-01T12:00:00Z',
    suspendedReason: 'Account under review — suspicious access pattern detected',
    createdAt: '2025-11-01T09:00:00Z',
  },
];

export const demoStaffInvitations: PlatformStaffInvitation[] = [
  {
    id: 'inv-001',
    email: 'new.security@buildnerve.co.uk',
    role: 'platform_security',
    invitedBy: 'user-admin-001',
    invitedByName: 'James Mitchell',
    status: 'pending',
    expiresAt: '2026-08-13T09:00:00Z',
    createdAt: '2026-08-06T09:00:00Z',
  },
];

export const demoPlatformMetrics: PlatformMetrics = {
  totalActiveOrgs: 247,
  trialOrgs: 34,
  suspendedOrgs: 3,
  activeUsers: 1892,
  newRegistrations: 18,
  storageUsed: '42.8 GB',
  failedDeliveries: 12,
  pendingSupportCases: 8,
  pendingAccessRequests: 2,
  recentSecurityEvents: 5,
  recentPrivilegedActions: 23,
};

export const demoOrganisations: OrganisationSummary[] = [
  {
    id: 'org-001',
    name: 'Martin Brothers Construction Ltd',
    type: 'main_contractor',
    ownerName: 'Martin Reeves',
    ownerEmail: 'martin@mbconstruction.co.uk',
    plan: 'Professional',
    status: 'active',
    memberCount: 14,
    jobCount: 23,
    storageUsed: '3.2 GB',
    createdAt: '2025-01-20T10:00:00Z',
    lastActivityAt: '2026-08-06T09:45:00Z',
  },
  {
    id: 'org-002',
    name: 'D. Hughes Electrical Services',
    type: 'subcontractor',
    ownerName: 'Daniel Hughes',
    ownerEmail: 'dan@dhugheselectrical.co.uk',
    plan: 'Starter',
    status: 'active',
    memberCount: 3,
    jobCount: 8,
    storageUsed: '0.8 GB',
    createdAt: '2025-02-14T14:00:00Z',
    lastActivityAt: '2026-08-06T08:30:00Z',
  },
  {
    id: 'org-003',
    name: 'Oakfield Developments Ltd',
    type: 'developer',
    ownerName: 'Helen Carter',
    ownerEmail: 'helen@oakfield.co.uk',
    plan: 'Enterprise',
    status: 'active',
    memberCount: 42,
    jobCount: 67,
    storageUsed: '15.4 GB',
    createdAt: '2025-03-05T09:00:00Z',
    lastActivityAt: '2026-08-06T10:15:00Z',
  },
  {
    id: 'org-004',
    name: 'Thompson Roofing & Cladding',
    type: 'subcontractor',
    ownerName: 'Gary Thompson',
    ownerEmail: 'gary@thompsonroofing.co.uk',
    plan: 'Professional',
    status: 'active',
    memberCount: 8,
    jobCount: 14,
    storageUsed: '1.5 GB',
    createdAt: '2025-04-10T11:00:00Z',
    lastActivityAt: '2026-08-05T16:00:00Z',
  },
  {
    id: 'org-005',
    name: 'Ashworth Building Services',
    type: 'main_contractor',
    ownerName: 'Paul Ashworth',
    ownerEmail: 'paul@ashworthbuild.co.uk',
    plan: 'Starter',
    status: 'trial',
    memberCount: 2,
    jobCount: 1,
    storageUsed: '0.2 GB',
    createdAt: '2026-07-20T09:00:00Z',
    lastActivityAt: '2026-08-04T11:30:00Z',
  },
  {
    id: 'org-006',
    name: 'Greenfield Interiors Ltd',
    type: 'subcontractor',
    ownerName: 'Lisa Greenfield',
    ownerEmail: 'lisa@greenfield-interiors.co.uk',
    plan: 'Professional',
    status: 'suspended',
    memberCount: 5,
    jobCount: 9,
    storageUsed: '1.1 GB',
    createdAt: '2025-06-15T09:00:00Z',
    lastActivityAt: '2026-07-15T10:00:00Z',
  },
  {
    id: 'org-007',
    name: 'North West Civil Engineering Ltd',
    type: 'main_contractor',
    ownerName: 'Robert Singh',
    ownerEmail: 'rob@nwce.co.uk',
    plan: 'Enterprise',
    status: 'active',
    memberCount: 78,
    jobCount: 112,
    storageUsed: '38.6 GB',
    createdAt: '2025-01-10T08:00:00Z',
    lastActivityAt: '2026-08-06T10:00:00Z',
  },
];

export const demoUsers: UserSummary[] = [
  {
    id: 'user-001',
    name: 'Martin Reeves',
    email: 'martin@mbconstruction.co.uk',
    status: 'active',
    orgMemberships: 1,
    mfaEnabled: true,
    lastSignIn: '2026-08-06T09:45:00Z',
    createdAt: '2025-01-20T10:00:00Z',
  },
  {
    id: 'user-002',
    name: 'Daniel Hughes',
    email: 'dan@dhugheselectrical.co.uk',
    status: 'active',
    orgMemberships: 1,
    mfaEnabled: false,
    lastSignIn: '2026-08-06T08:30:00Z',
    createdAt: '2025-02-14T14:00:00Z',
  },
  {
    id: 'user-003',
    name: 'Helen Carter',
    email: 'helen@oakfield.co.uk',
    status: 'active',
    orgMemberships: 1,
    mfaEnabled: true,
    lastSignIn: '2026-08-06T10:15:00Z',
    createdAt: '2025-03-05T09:00:00Z',
  },
  {
    id: 'user-004',
    name: 'Gary Thompson',
    email: 'gary@thompsonroofing.co.uk',
    status: 'active',
    orgMemberships: 1,
    mfaEnabled: true,
    lastSignIn: '2026-08-05T16:00:00Z',
    createdAt: '2025-04-10T11:00:00Z',
  },
  {
    id: 'user-005',
    name: 'Paul Ashworth',
    email: 'paul@ashworthbuild.co.uk',
    status: 'active',
    orgMemberships: 1,
    mfaEnabled: false,
    lastSignIn: '2026-08-04T11:30:00Z',
    createdAt: '2026-07-20T09:00:00Z',
  },
  {
    id: 'user-006',
    name: 'Lisa Greenfield',
    email: 'lisa@greenfield-interiors.co.uk',
    status: 'suspended',
    orgMemberships: 1,
    mfaEnabled: true,
    lastSignIn: '2026-07-15T10:00:00Z',
    createdAt: '2025-06-15T09:00:00Z',
  },
];

export const demoSupportCases: SupportCase[] = [
  {
    id: 'sc-001',
    organisationId: 'org-001',
    organisationName: 'Martin Brothers Construction Ltd',
    createdBy: 'user-admin-003',
    createdByName: 'David Chen',
    assignedTo: 'user-admin-003',
    assignedToName: 'David Chen',
    category: 'access',
    priority: 'high',
    title: 'Cannot invite new team member — invitation link expires immediately',
    description: 'User reports that invitation links for new team members are expiring within seconds of being generated. Affecting project onboarding for Harcourt Road job.',
    status: 'in_progress',
    resolutionNotes: null,
    createdAt: '2026-08-05T14:30:00Z',
    updatedAt: '2026-08-06T09:00:00Z',
  },
  {
    id: 'sc-002',
    organisationId: 'org-003',
    organisationName: 'Oakfield Developments Ltd',
    createdBy: 'user-admin-002',
    createdByName: 'Sarah Okonkwo',
    assignedTo: 'user-admin-002',
    assignedToName: 'Sarah Okonkwo',
    category: 'billing',
    priority: 'normal',
    title: 'Invoice not reflecting correct plan tier after upgrade',
    description: 'Oakfield upgraded from Professional to Enterprise on 15 July but the August invoice still shows Professional pricing.',
    status: 'open',
    resolutionNotes: null,
    createdAt: '2026-08-06T08:15:00Z',
    updatedAt: '2026-08-06T08:15:00Z',
  },
  {
    id: 'sc-003',
    organisationId: 'org-005',
    organisationName: 'Ashworth Building Services',
    createdBy: 'user-admin-003',
    createdByName: 'David Chen',
    assignedTo: null,
    assignedToName: null,
    category: 'general',
    priority: 'low',
    title: 'Onboarding question — how to import existing jobs from spreadsheet',
    description: 'New customer on trial asking how to bulk import existing project data from their Excel sheets.',
    status: 'open',
    resolutionNotes: null,
    createdAt: '2026-08-06T10:00:00Z',
    updatedAt: '2026-08-06T10:00:00Z',
  },
  {
    id: 'sc-004',
    organisationId: 'org-004',
    organisationName: 'Thompson Roofing & Cladding',
    createdBy: 'user-admin-003',
    createdByName: 'David Chen',
    assignedTo: 'user-admin-003',
    assignedToName: 'David Chen',
    category: 'technical',
    priority: 'urgent',
    title: 'Evidence uploads failing for all users in organisation',
    description: 'Entire organisation unable to upload site evidence since 08:00 today. Storage bucket returning 500 errors. Affecting 3 active job sites.',
    status: 'in_progress',
    resolutionNotes: null,
    createdAt: '2026-08-06T08:45:00Z',
    updatedAt: '2026-08-06T09:30:00Z',
  },
  {
    id: 'sc-005',
    organisationId: 'org-001',
    organisationName: 'Martin Brothers Construction Ltd',
    createdBy: 'user-admin-003',
    createdByName: 'David Chen',
    assignedTo: null,
    assignedToName: null,
    category: 'feature_request',
    priority: 'normal',
    title: 'Request: Bulk variation approval workflow',
    description: 'Customer requesting ability to send multiple variations for client approval in a single batch rather than individually.',
    status: 'open',
    resolutionNotes: null,
    createdAt: '2026-08-04T11:00:00Z',
    updatedAt: '2026-08-04T11:00:00Z',
  },
  {
    id: 'sc-006',
    organisationId: 'org-006',
    organisationName: 'Greenfield Interiors Ltd',
    createdBy: 'user-admin-004',
    createdByName: 'Priya Patel',
    assignedTo: 'user-admin-004',
    assignedToName: 'Priya Patel',
    category: 'security',
    priority: 'high',
    title: 'Suspicious login attempts from unrecognised IP',
    description: 'Multiple failed login attempts from IP addresses in Eastern Europe over 48 hours. Account suspended as precaution.',
    status: 'resolved',
    resolutionNotes: 'Account suspended. Customer contacted via phone. Password reset enforced. Additional MFA recommended.',
    createdAt: '2026-07-14T09:00:00Z',
    updatedAt: '2026-07-15T12:00:00Z',
  },
];

export const demoAccessRequests: AccessRequest[] = [
  {
    id: 'ar-001',
    requestorId: 'user-admin-003',
    requestorName: 'David Chen',
    requestorRole: 'platform_support',
    organisationId: 'org-004',
    organisationName: 'Thompson Roofing & Cladding',
    accessType: 'module_readonly',
    scopeDetails: 'Evidence module — read-only access to investigate upload failures (SC-004)',
    reason: 'Investigating support case SC-004: evidence uploads failing for all organisation users',
    status: 'pending',
    customerApproved: false,
    reviewedBy: null,
    reviewedByName: null,
    expiresAt: '2026-08-07T09:30:00Z',
    createdAt: '2026-08-06T09:00:00Z',
  },
  {
    id: 'ar-002',
    requestorId: 'user-admin-004',
    requestorName: 'Priya Patel',
    requestorRole: 'platform_security',
    organisationId: 'org-001',
    organisationName: 'Martin Brothers Construction Ltd',
    accessType: 'emergency',
    scopeDetails: 'Organisation security review — audit access logs and session activity only',
    reason: 'Emergency security review following detection of anomalous API access pattern',
    status: 'approved',
    customerApproved: false,
    reviewedBy: 'user-admin-001',
    reviewedByName: 'James Mitchell',
    expiresAt: '2026-08-06T18:00:00Z',
    createdAt: '2026-08-06T07:00:00Z',
  },
];

export const demoAccessGrants: AccessGrant[] = [
  {
    id: 'ag-001',
    staffUserId: 'user-admin-004',
    staffName: 'Priya Patel',
    organisationId: 'org-001',
    organisationName: 'Martin Brothers Construction Ltd',
    accessType: 'emergency',
    reason: 'Emergency security review — anomalous API access pattern detected',
    status: 'active',
    grantedBy: 'user-admin-001',
    grantedByName: 'James Mitchell',
    expiresAt: '2026-08-06T18:00:00Z',
    createdAt: '2026-08-06T07:15:00Z',
  },
  {
    id: 'ag-002',
    staffUserId: 'user-admin-003',
    staffName: 'David Chen',
    organisationId: 'org-003',
    organisationName: 'Oakfield Developments Ltd',
    accessType: 'org_config',
    reason: 'Billing investigation — plan tier mismatch',
    status: 'active',
    grantedBy: 'user-admin-002',
    grantedByName: 'Sarah Okonkwo',
    expiresAt: '2026-08-07T12:00:00Z',
    createdAt: '2026-08-06T09:00:00Z',
  },
];

export const demoAuditEvents: PlatformAuditEvent[] = [
  {
    id: 'ae-001',
    actorId: 'user-admin-001',
    actorName: 'James Mitchell',
    platformRole: 'platform_owner',
    eventType: 'emergency_access_granted',
    targetOrgId: 'org-001',
    targetOrgName: 'Martin Brothers Construction Ltd',
    targetUserId: null,
    targetUserName: null,
    reason: 'Emergency security review — anomalous API access',
    ipAddress: '81.152.43.12',
    createdAt: '2026-08-06T07:15:00Z',
  },
  {
    id: 'ae-002',
    actorId: 'user-admin-001',
    actorName: 'James Mitchell',
    platformRole: 'platform_owner',
    eventType: 'staff_invitation_sent',
    targetOrgId: null,
    targetOrgName: null,
    targetUserId: null,
    targetUserName: null,
    reason: 'Invited new platform_security staff member',
    ipAddress: '81.152.43.12',
    createdAt: '2026-08-06T09:00:00Z',
  },
  {
    id: 'ae-003',
    actorId: 'user-admin-004',
    actorName: 'Priya Patel',
    platformRole: 'platform_security',
    eventType: 'organisation_suspended',
    targetOrgId: 'org-006',
    targetOrgName: 'Greenfield Interiors Ltd',
    targetUserId: null,
    targetUserName: null,
    reason: 'Suspicious login attempts — precautionary suspension',
    ipAddress: '81.152.43.45',
    createdAt: '2026-07-15T12:00:00Z',
  },
  {
    id: 'ae-004',
    actorId: 'user-admin-002',
    actorName: 'Sarah Okonkwo',
    platformRole: 'platform_admin',
    eventType: 'feature_flag_changed',
    targetOrgId: null,
    targetOrgName: null,
    targetUserId: null,
    targetUserName: null,
    reason: 'Enabled advanced-reporting flag for all Professional plans',
    ipAddress: '81.152.43.23',
    createdAt: '2026-08-05T16:00:00Z',
  },
  {
    id: 'ae-005',
    actorId: 'user-admin-002',
    actorName: 'Sarah Okonkwo',
    platformRole: 'platform_admin',
    eventType: 'user_session_revoked',
    targetOrgId: 'org-001',
    targetOrgName: 'Martin Brothers Construction Ltd',
    targetUserId: 'user-001',
    targetUserName: 'Martin Reeves',
    reason: 'User reported unrecognised device on account',
    ipAddress: '81.152.43.23',
    createdAt: '2026-08-04T14:30:00Z',
  },
  {
    id: 'ae-006',
    actorId: 'user-admin-001',
    actorName: 'James Mitchell',
    platformRole: 'platform_owner',
    eventType: 'role_changed',
    targetOrgId: null,
    targetOrgName: null,
    targetUserId: 'user-admin-006',
    targetUserName: 'Emma Taylor',
    reason: 'Promoted from read-only observer to platform_support (temporary cover)',
    ipAddress: '81.152.43.12',
    createdAt: '2026-08-01T09:00:00Z',
  },
];

export const demoFeatureFlags: FeatureFlag[] = [
  {
    id: 'ff-001',
    flagKey: 'advanced-reporting',
    description: 'Advanced reporting module with PDF exports and scheduled reports',
    defaultState: false,
    enabled: true,
    startAt: '2026-07-01T00:00:00Z',
    endAt: null,
    createdBy: 'user-admin-002',
    changeReason: 'Enabled for Professional and Enterprise plans',
  },
  {
    id: 'ff-002',
    flagKey: 'cis-subcontractor-payments',
    description: 'CIS deduction calculations and subcontractor payment workflows',
    defaultState: false,
    enabled: false,
    startAt: null,
    endAt: null,
    createdBy: 'user-admin-001',
    changeReason: 'Holding for Phase 11 release',
  },
  {
    id: 'ff-003',
    flagKey: 'client-portal-v2',
    description: 'Redesigned client portal with real-time variation tracking',
    defaultState: false,
    enabled: true,
    startAt: '2026-08-01T00:00:00Z',
    endAt: null,
    createdBy: 'user-admin-002',
    changeReason: 'Gradual rollout — 20% of customers',
  },
  {
    id: 'ff-004',
    flagKey: 'dark-mode',
    description: 'Dark mode interface option for all users',
    defaultState: true,
    enabled: false,
    startAt: null,
    endAt: null,
    createdBy: 'user-admin-002',
    changeReason: 'Deferred — contrast issues on mobile',
  },
  {
    id: 'ff-005',
    flagKey: 'ai-daily-log-summaries',
    description: 'AI-generated daily log summaries for client updates',
    defaultState: false,
    enabled: false,
    startAt: null,
    endAt: null,
    createdBy: 'user-admin-001',
    changeReason: 'Under development — not yet approved for production',
  },
];

export const demoAnnouncements: PlatformAnnouncement[] = [
  {
    id: 'ann-001',
    title: 'Scheduled Maintenance — 12 August 2026',
    body: 'BuildNerve will undergo scheduled maintenance on Saturday 12 August from 02:00 to 04:00 BST. The platform may be briefly unavailable during this window. All data will be preserved.',
    status: 'active',
    targetType: 'all',
    scheduledAt: '2026-08-10T09:00:00Z',
    publishedAt: '2026-08-06T08:00:00Z',
    createdBy: 'user-admin-002',
    createdAt: '2026-08-05T15:00:00Z',
  },
  {
    id: 'ann-002',
    title: 'New Feature: Advanced Reporting',
    body: 'We are pleased to announce the release of Advanced Reporting for Professional and Enterprise plans. Create custom reports, schedule automatic delivery and export as PDF or CSV. Visit Reports in your dashboard to get started.',
    status: 'scheduled',
    targetType: 'plan',
    scheduledAt: '2026-08-08T09:00:00Z',
    publishedAt: null,
    createdBy: 'user-admin-002',
    createdAt: '2026-08-06T09:00:00Z',
  },
  {
    id: 'ann-003',
    title: 'Updated Privacy Policy',
    body: 'We have updated our Privacy Policy to reflect changes in UK data protection guidance. The changes take effect on 1 September 2026. Please review the updated policy in your account settings.',
    status: 'draft',
    targetType: 'all',
    scheduledAt: null,
    publishedAt: null,
    createdBy: 'user-admin-001',
    createdAt: '2026-08-05T10:00:00Z',
  },
];

// ============================================================================
// ROLE DISPLAY HELPERS
// ============================================================================

export function getRoleLabel(role: PlatformRole): string {
  const labels: Record<PlatformRole, string> = {
    platform_owner: 'Platform Owner',
    platform_admin: 'Platform Admin',
    platform_support: 'Platform Support',
    platform_security: 'Platform Security',
    platform_billing: 'Platform Billing',
    platform_read_only: 'Read Only',
  };
  return labels[role] || role;
}

export function getRoleColor(role: PlatformRole): string {
  const colors: Record<PlatformRole, string> = {
    platform_owner: 'bg-amber-100 text-amber-800',
    platform_admin: 'bg-emerald-100 text-emerald-800',
    platform_support: 'bg-sky-100 text-sky-800',
    platform_security: 'bg-red-100 text-red-800',
    platform_billing: 'bg-violet-100 text-violet-800',
    platform_read_only: 'bg-slate-100 text-slate-600',
  };
  return colors[role] || 'bg-slate-100 text-slate-600';
}

export function getSupportCaseStatusColor(status: SupportCaseStatus): string {
  const colors: Record<SupportCaseStatus, string> = {
    open: 'bg-sky-100 text-sky-700',
    in_progress: 'bg-amber-100 text-amber-700',
    waiting_customer: 'bg-violet-100 text-violet-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-slate-100 text-slate-500',
  };
  return colors[status] || 'bg-slate-100 text-slate-500';
}

export function getSupportCasePriorityColor(priority: SupportCasePriority): string {
  const colors: Record<SupportCasePriority, string> = {
    low: 'bg-slate-100 text-slate-600',
    normal: 'bg-sky-100 text-sky-700',
    high: 'bg-amber-100 text-amber-700',
    urgent: 'bg-red-100 text-red-700',
  };
  return colors[priority] || 'bg-slate-100 text-slate-600';
}

export function getAccessTypeLabel(type: AccessRequestType): string {
  const labels: Record<AccessRequestType, string> = {
    metadata_only: 'Metadata only',
    org_config: 'Organisation configuration',
    job_readonly: 'Selected job read-only',
    module_readonly: 'Selected module read-only',
    controlled_repair: 'Controlled repair operation',
    emergency: 'Emergency access',
  };
  return labels[type] || type;
}

export function getPlatformNavItems(role: PlatformRole) {
  const allItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-line', path: '/platform-admin' },
    { id: 'organisations', label: 'Organisations', icon: 'ri-building-2-line', path: '/platform-admin/organisations' },
    { id: 'users', label: 'Users', icon: 'ri-group-line', path: '/platform-admin/users' },
    { id: 'support', label: 'Support', icon: 'ri-customer-service-2-line', path: '/platform-admin/support' },
    { id: 'access-requests', label: 'Access Requests', icon: 'ri-key-2-line', path: '/platform-admin/access-requests' },
    { id: 'security', label: 'Security', icon: 'ri-shield-check-line', path: '/platform-admin/security' },
    { id: 'audit', label: 'Audit Log', icon: 'ri-file-list-3-line', path: '/platform-admin/audit' },
    { id: 'communications', label: 'Communications', icon: 'ri-mail-send-line', path: '/platform-admin/communications' },
    { id: 'feature-flags', label: 'Feature Flags', icon: 'ri-toggle-line', path: '/platform-admin/feature-flags' },
    { id: 'system', label: 'System', icon: 'ri-server-line', path: '/platform-admin/system' },
    { id: 'settings', label: 'Settings', icon: 'ri-settings-3-line', path: '/platform-admin/settings' },
  ];

  if (role === 'platform_read_only') {
    return allItems.filter((i) => ['dashboard', 'organisations', 'users', 'audit'].includes(i.id));
  }
  if (role === 'platform_support') {
    return allItems.filter((i) => ['dashboard', 'organisations', 'users', 'support', 'access-requests', 'audit'].includes(i.id));
  }
  if (role === 'platform_security') {
    return allItems.filter((i) => ['dashboard', 'security', 'audit', 'access-requests'].includes(i.id));
  }
  if (role === 'platform_billing') {
    return allItems.filter((i) => ['dashboard', 'organisations', 'audit'].includes(i.id));
  }
  return allItems;
}