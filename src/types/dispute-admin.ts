// BuildNerve — Dispute administration shared types.
// Neutral oversight model: admins monitor, support and govern access — they
// never decide liability or silently alter party evidence.

// ─── Permissions ────────────────────────────────────────────────────────────

export type DisputeAdminPermissionKey =
  | 'disputes_view_summary'
  | 'disputes_view_case'
  | 'disputes_support'
  | 'disputes_manage_safety'
  | 'disputes_manage_deadlines'
  | 'disputes_view_audit'
  | 'disputes_export_audit'
  | 'disputes_manage_legal_content';

export const DISPUTE_ADMIN_PERMISSION_LABELS: Record<DisputeAdminPermissionKey, string> = {
  disputes_view_summary: 'View summaries',
  disputes_view_case: 'View cases',
  disputes_support: 'Support actions',
  disputes_manage_safety: 'Manage safety',
  disputes_manage_deadlines: 'Manage deadlines',
  disputes_view_audit: 'View audit',
  disputes_export_audit: 'Export audit',
  disputes_manage_legal_content: 'Manage legal content',
};

export interface DisputeAdminIdentity {
  isStaff: boolean;
  role: string | null;
  permissions: DisputeAdminPermissionKey[];
  has: (key: DisputeAdminPermissionKey) => boolean;
}

// ─── Dashboard summary ──────────────────────────────────────────────────────

export interface DisputeAdminMetrics {
  openDisputes: number;
  awaitingResponse: number;
  overduePlatformActions: number;
  activeNegotiations: number;
  preActionCases: number;
  resolvedThisMonth: number;
  evidenceAwaitingValidation: number;
  notificationFailures: number;
}

export interface DisputeAdminListItem {
  id: string;
  case_reference: string;
  project_name: string | null;
  project_reference: string | null;
  status: string;
  current_stage: string;
  dispute_category: string;
  jurisdiction: string;
  opened_at: string | null;
  overdue: boolean;
  safety_flag: boolean;
  support_owner_name: string | null;
  support_owner_user_id: string | null;
  awaiting_response: boolean;
  created_at: string;
}

export interface DisputeAdminDashboard {
  metrics: DisputeAdminMetrics;
  items: DisputeAdminListItem[];
  supportOwners: { user_id: string; name: string }[];
}

// ─── Case view ──────────────────────────────────────────────────────────────

export interface AdminCaseParty {
  id: string;
  user_id: string;
  party_role: 'claimant' | 'respondent';
  display_name_snapshot: string | null;
  business_name_snapshot: string | null;
  email_snapshot: string | null;
  access_status: string;
}

export interface AdminCaseOverview {
  dispute: {
    id: string;
    case_reference: string;
    title: string;
    summary: string | null;
    status: string;
    current_stage: string;
    dispute_category: string;
    relationship_type: string;
    jurisdiction: string;
    amount_disputed_pence: number | null;
    currency: string;
    opened_at: string | null;
    response_due_at: string | null;
    resolved_at: string | null;
    closed_at: string | null;
    safety_flag: boolean;
    safety_flag_reason: string | null;
    support_owner_user_id: string | null;
    support_owner_name: string | null;
    created_at: string;
  };
  project: { id: string; reference: string | null; project_name: string | null } | null;
  parties: AdminCaseParty[];
  claims: {
    id: string;
    claim_type: string;
    submitted_by_user_id: string;
    submitted_by_name: string | null;
    submitted_by_role: 'claimant' | 'respondent' | null;
    statement: string | null;
    amount_pence: number | null;
    status: string;
    submitted_at: string;
  }[];
  evidence: {
    id: string;
    evidence_reference: string;
    title: string;
    evidence_category: string;
    submission_status: string;
    submitted_by_name: string | null;
    submitted_at: string;
    file_hash: string | null;
  }[];
  timeline: {
    id: string;
    event_type: string;
    title: string;
    description: string | null;
    actor_role: string | null;
    visibility: string;
    created_at: string;
  }[];
  negotiations: {
    id: string;
    offer_type: string;
    summary: string;
    status: string;
    payment_amount_pence: number | null;
    offered_by_name: string | null;
    created_at: string;
  }[];
  deadlines: {
    id: string;
    deadline_type: string;
    title: string;
    due_at: string;
    status: string;
    actor_name: string | null;
  }[];
  notifications: {
    id: string;
    notification_type: string;
    title: string;
    status: string;
    recipient_email: string | null;
    last_error: string | null;
    created_at: string;
  }[];
  exports: {
    id: string;
    version: number;
    perspective: string;
    purpose: string;
    status: string;
    generated_at: string | null;
  }[];
  notes: {
    id: string;
    note_scope: 'shared' | 'internal';
    body: string;
    author_name: string | null;
    created_at: string;
  }[];
  restrictions: {
    id: string;
    target_type: string;
    target_id: string;
    reason: string;
    status: string;
    restricted_at: string;
  }[];
  safetyReports: {
    id: string;
    report_category: string;
    description: string | null;
    priority: string;
    status: string;
    reporting_name: string | null;
    created_at: string;
  }[];
  auditTrail: {
    id: string;
    action: string;
    actor_user_id: string | null;
    target_type: string | null;
    previous_value: unknown;
    new_value: unknown;
    created_at: string;
  }[];
}

// ─── Evidence preview (elevated + audited) ──────────────────────────────────

export interface AdminEvidencePreview {
  evidenceId: string;
  reference: string;
  title: string;
  signedUrl: string | null;
}

// ─── Safety queue ───────────────────────────────────────────────────────────

export type SafetyReportCategory =
  | 'threatening'
  | 'harassment'
  | 'personal_data'
  | 'illegal_content'
  | 'malware'
  | 'wrong_case'
  | 'other';

export type SafetyReportStatus =
  | 'open'
  | 'in_review'
  | 'restricted'
  | 'no_action'
  | 'resolved';

export interface SafetyReport {
  id: string;
  dispute_id: string;
  case_reference: string;
  report_category: SafetyReportCategory;
  reporting_user_id: string | null;
  reporting_name: string | null;
  target_type: string | null;
  target_id: string | null;
  description: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: SafetyReportStatus;
  assigned_reviewer_user_id: string | null;
  assigned_reviewer_name: string | null;
  decision: string | null;
  decision_reason: string | null;
  resolved_at: string | null;
  created_at: string;
}

export const SAFETY_REPORT_CATEGORY_LABELS: Record<SafetyReportCategory, string> = {
  threatening: 'Threatening content',
  harassment: 'Harassment',
  personal_data: 'Personal data exposure',
  illegal_content: 'Illegal content',
  malware: 'Malware concern',
  wrong_case: 'Evidence uploaded to the wrong case',
  other: 'Other safety concern',
};

export const SAFETY_REPORT_STATUS_LABELS: Record<SafetyReportStatus, string> = {
  open: 'Open',
  in_review: 'In review',
  restricted: 'Restricted',
  no_action: 'No action',
  resolved: 'Resolved',
};

// ─── Access audit ───────────────────────────────────────────────────────────

export interface AdminAccessRecord {
  id: string;
  admin_user_id: string;
  admin_name: string | null;
  dispute_id: string;
  case_reference: string;
  access_reason: string | null;
  sections_viewed: string[];
  evidence_previewed: string[];
  files_downloaded: string[];
  action_taken: string | null;
  created_at: string;
}

export interface AdminAccessAlerts {
  repeatedAccessWithoutAction: { admin_name: string; count: number }[];
  largeVolumeDownloads: { admin_name: string; files: number }[];
  repeatedFailedPermissionChecks: { admin_name: string; count: number }[];
}

// ─── Guidance governance ────────────────────────────────────────────────────

export type GuidanceVersionStatus = 'draft' | 'published' | 'retired';

export interface GuidanceVersion {
  id: string;
  section_id: string;
  version: number;
  title: string;
  summary: string | null;
  content: unknown;
  status: GuidanceVersionStatus;
  published_by_name: string | null;
  published_at: string | null;
  review_due: string | null;
  supersedes_version_id: string | null;
  created_at: string;
  // Enriched
  used_by_dispute_count: number;
}

export const GUIDANCE_VERSION_STATUS_LABELS: Record<GuidanceVersionStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  retired: 'Retired',
};

// ─── Action results ─────────────────────────────────────────────────────────

export interface AdminActionResult {
  success: boolean;
  message: string;
}