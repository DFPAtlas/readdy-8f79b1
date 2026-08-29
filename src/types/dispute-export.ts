// BuildNerve — Evidence Pack exporter shared types.
// Neutral domain model: organises selected records without deciding liability,
// predicting outcomes or certifying admissibility.

// ─── Enumerated domains ──────────────────────────────────────────────────────

export type ExportPerspective = 'claimant' | 'respondent';

export type ExportPurpose =
  | 'legal_review'
  | 'mediation'
  | 'pre_action_exchange'
  | 'court_preparation';

export type ExportStatus =
  | 'generating'
  | 'ready'
  | 'failed'
  | 'expired'
  | 'superseded';

// ─── Workspace / selection options ─────────────────────────────────────────

export interface ExportClaimOption {
  id: string;
  claim_type: string;
  submitted_by_name: string | null;
  submitted_by_role: 'claimant' | 'respondent' | null;
  submitted_at: string;
  amount_pence: number | null;
  status: string;
  superseded: boolean;
  preview: string | null;
}

export interface ExportEvidenceOption {
  id: string;
  reference: string;
  title: string;
  category: string;
  submitted_by_name: string | null;
  submitted_by_role: 'claimant' | 'respondent' | null;
  submission_status: string;
  source_type: string;
  mime_type: string | null;
  original_filename: string | null;
  file_size: number | null;
  file_hash: string | null;
  superseded_by_id: string | null;
  withdrawn: boolean;
}

export interface ExportLetterOption {
  id: string;
  version: number;
  status: string;
  title: string;
  created_at: string;
}

export interface ExportWorkspace {
  eligible: boolean;
  reasons: string[];
  isParty: boolean;
  jurisdiction: string;
  status: string;
  project: { reference: string | null; project_name: string | null } | null;
  claims: ExportClaimOption[];
  evidence: ExportEvidenceOption[];
  letters: ExportLetterOption[];
  counts: {
    claims: number;
    evidence: number;
    offers: number;
    issues: number;
    checklist: number;
    letters: number;
  };
  partyNames: { claimant: string | null; respondent: string | null };
}

// ─── Pack configuration (what the user deliberately selects) ───────────────

export interface ExportConfig {
  perspective: ExportPerspective;
  title: string;
  purpose: ExportPurpose;
  includeChronology: boolean;
  includeSummary: boolean;
  summaryText: string;
  summaryPreparedBy: string;
  includeProjectRecords: boolean;
  includeCorrespondence: boolean;
  includeNegotiation: boolean;
  includePreAction: boolean;
  claimIds: string[];
  evidenceIds: string[];
  letterIds: string[];
}

// ─── Generated pack record ─────────────────────────────────────────────────

export interface ExportMissingItem {
  evidence_reference: string;
  reason: string;
}

export interface DisputeExport {
  id: string;
  dispute_id: string;
  created_by_user_id: string;
  version: number;
  perspective: ExportPerspective;
  title: string;
  purpose: ExportPurpose;
  status: ExportStatus;
  configuration: ExportConfig | null;
  pdf_storage_path: string | null;
  zip_storage_path: string | null;
  item_count: number;
  file_count: number;
  missing_items: ExportMissingItem[] | null;
  declared_at: string | null;
  generated_at: string | null;
  downloaded_at: string | null;
  supersedes_export_id: string | null;
  created_at: string;
  // Enriched
  created_by_name: string | null;
  created_by_role: 'claimant' | 'respondent' | null;
}

export interface ExportGenerateResult {
  export: DisputeExport;
  pdfUrl: string | null;
  zipUrl: string | null;
}

// ─── Label maps ─────────────────────────────────────────────────────────────

export const EXPORT_PERSPECTIVE_LABELS: Record<ExportPerspective, string> = {
  claimant: 'Claimant perspective',
  respondent: 'Respondent perspective',
};

export const EXPORT_PURPOSE_LABELS: Record<ExportPurpose, string> = {
  legal_review: 'Legal review',
  mediation: 'Mediation',
  pre_action_exchange: 'Pre-action exchange',
  court_preparation: 'Court preparation',
};

export const EXPORT_PURPOSES = Object.keys(EXPORT_PURPOSE_LABELS) as ExportPurpose[];

export const EXPORT_STATUS_LABELS: Record<ExportStatus, string> = {
  generating: 'Generating',
  ready: 'Ready',
  failed: 'Failed',
  expired: 'Expired',
  superseded: 'Superseded',
};

export const EXPORT_DISCLAIMER =
  'This pack organises records selected from BuildNerve. It is not legal advice, a court filing, proof that the contents are true, or a guarantee that every item will be admitted as evidence. Review the pack carefully and obtain professional advice where appropriate.';