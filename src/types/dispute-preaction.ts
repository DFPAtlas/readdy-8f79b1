// BuildNerve — Pre-Action Workspace & Letter of Claim shared types.
// Neutral domain model: records a reliable, audited pre-action record without
// deciding liability, predicting outcomes or certifying legal compliance.

// ─── Checklist ──────────────────────────────────────────────────────────────

export type PreActionChecklistStatus =
  | 'not_started'
  | 'in_progress'
  | 'complete'
  | 'not_applicable'
  | 'needs_advice';

export type PreActionChecklistKey =
  | 'party_identities'
  | 'contract_basis'
  | 'claim_summary'
  | 'important_dates'
  | 'amount_calculation'
  | 'requested_remedy'
  | 'key_evidence'
  | 'other_party_response'
  | 'counterclaim_reviewed'
  | 'negotiation_attempted'
  | 'adr_considered'
  | 'remaining_issues'
  | 'procedure_reviewed'
  | 'independent_advice';

export interface PreActionChecklistItem {
  id: string;
  dispute_id: string;
  item_key: PreActionChecklistKey;
  status: PreActionChecklistStatus;
  note: string | null;
  updated_by_user_id: string | null;
  updated_by_name: string | null;
  updated_at: string;
}

export const PRE_ACTION_CHECKLIST_LABELS: Record<PreActionChecklistKey, string> = {
  party_identities: 'Party identities and service addresses confirmed',
  contract_basis: 'Contract or project basis identified',
  claim_summary: 'Claim summary completed',
  important_dates: 'Important dates recorded',
  amount_calculation: 'Amount and calculation explained',
  requested_remedy: 'Requested remedy identified',
  key_evidence: 'Key supporting evidence selected',
  other_party_response: "Other party's response recorded (or response period noted)",
  counterclaim_reviewed: 'Counterclaim reviewed',
  negotiation_attempted: 'Negotiation attempted',
  adr_considered: 'ADR or mediation considered',
  remaining_issues: 'Remaining issues identified',
  procedure_reviewed: 'Relevant procedure reviewed',
  independent_advice: 'Independent advice considered',
};

export const PRE_ACTION_CHECKLIST_KEYS = Object.keys(
  PRE_ACTION_CHECKLIST_LABELS,
) as PreActionChecklistKey[];

export const PRE_ACTION_CHECKLIST_STATUS_LABELS: Record<PreActionChecklistStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
  not_applicable: 'Not applicable',
  needs_advice: 'Needs advice',
};

export const PRE_ACTION_CHECKLIST_STATUSES = Object.keys(
  PRE_ACTION_CHECKLIST_STATUS_LABELS,
) as PreActionChecklistStatus[];

// ─── Issues schedule ────────────────────────────────────────────────────────

export type PreActionIssueStatus = 'open' | 'partly_resolved' | 'resolved';

export interface PreActionIssue {
  id: string;
  dispute_id: string;
  issue_reference: string;
  title: string;
  claimant_position: string | null;
  claimant_position_updated_by: string | null;
  claimant_position_updated_at: string | null;
  respondent_position: string | null;
  respondent_position_updated_by: string | null;
  respondent_position_updated_at: string | null;
  agreed_facts: string | null;
  disputed_facts: string | null;
  evidence_references: { id: string; reference: string; title: string }[] | null;
  amount_pence: number | null;
  resolution_status: PreActionIssueStatus;
  created_by_user_id: string | null;
  created_at: string;
}

export const PRE_ACTION_ISSUE_STATUS_LABELS: Record<PreActionIssueStatus, string> = {
  open: 'Open',
  partly_resolved: 'Partly resolved',
  resolved: 'Resolved',
};

// ─── Letter of Claim ────────────────────────────────────────────────────────

export type LetterStatus =
  | 'draft'
  | 'ready_for_review'
  | 'finalised'
  | 'sent_external'
  | 'sent_buildnerve'
  | 'superseded';

export type LetterLegalBasis =
  | 'contract_terms'
  | 'consumer_rights_act_2015'
  | 'non_payment'
  | 'agreed_variation'
  | 'other';

export interface LetterEvidenceRef {
  id: string;
  reference: string;
  title: string;
}

export interface LetterOfClaim {
  id: string;
  dispute_id: string;
  created_by_user_id: string;
  version: number;
  status: LetterStatus;
  title: string;
  claimant_name: string | null;
  claimant_address: string | null;
  defendant_name: string | null;
  defendant_address: string | null;
  contract_basis: string | null;
  chronology: string | null;
  claim_basis: string | null;
  legal_provisions: LetterLegalBasis[] | null;
  other_basis: string | null;
  alleged_work: string | null;
  amount_pence: number | null;
  calculation_breakdown: string | null;
  requested_remedy: string | null;
  evidence_references: LetterEvidenceRef[] | null;
  resolution_attempts: string | null;
  adr_invitation: string | null;
  response_date: string | null;
  enclosures: string[] | null;
  letter_body: string | null;
  supersedes_letter_id: string | null;
  finalised_at: string | null;
  downloaded_at: string | null;
  sent_method: string | null;
  sent_date: string | null;
  recipient: string | null;
  created_at: string;
  updated_at: string;
  // Enriched
  created_by_name: string | null;
  created_by_role: 'claimant' | 'respondent' | null;
}

export const LETTER_STATUS_LABELS: Record<LetterStatus, string> = {
  draft: 'Draft',
  ready_for_review: 'Ready for review',
  finalised: 'Finalised by user',
  sent_external: 'Sent outside BuildNerve',
  sent_buildnerve: 'Sent through BuildNerve',
  superseded: 'Superseded',
};

export const LETTER_LEGAL_BASIS_LABELS: Record<LetterLegalBasis, string> = {
  contract_terms: 'Contract terms',
  consumer_rights_act_2015: 'Consumer Rights Act 2015',
  non_payment: 'Non-payment',
  agreed_variation: 'Agreed variation',
  other: 'Other basis',
};

export const LETTER_LEGAL_BASIS_OPTIONS = Object.keys(
  LETTER_LEGAL_BASIS_LABELS,
) as LetterLegalBasis[];

// ─── Workspace envelope ─────────────────────────────────────────────────────

export interface PreActionEvidenceOption {
  id: string;
  reference: string;
  title: string;
}

export interface PreActionSummary {
  checklistComplete: number;
  checklistTotal: number;
  unresolvedIssues: number;
  claimAmountPence: number | null;
  responseStatus: string;
  negotiationOffers: number;
  hasAcceptedOffer: boolean;
  adrConsidered: boolean;
  letterStatus: LetterStatus | null;
  latestLetterVersion: number | null;
}

export interface PreActionWorkspace {
  eligible: boolean;
  reasons: string[];
  isParty: boolean;
  jurisdiction: string;
  checklist: PreActionChecklistItem[];
  issues: PreActionIssue[];
  letters: LetterOfClaim[];
  evidenceOptions: PreActionEvidenceOption[];
  summary: PreActionSummary;
  canGenerate: boolean;
}