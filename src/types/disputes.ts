// BuildNerve — England & Wales Dispute Resolution shared types, labels and validators.
// Neutral domain model: records a reliable audit history without deciding who is right.

// ─── Enumerated domains ──────────────────────────────────────────────────────

export type DisputeStatus =
  | 'draft'
  | 'open'
  | 'awaiting_response'
  | 'under_discussion'
  | 'evidence_collection'
  | 'negotiation'
  | 'mediation_considered'
  | 'pre_action'
  | 'resolved'
  | 'withdrawn'
  | 'closed';

export type DisputeStage =
  | 'open'
  | 'awaiting_response'
  | 'under_discussion'
  | 'evidence_collection'
  | 'negotiation'
  | 'mediation_considered'
  | 'pre_action'
  | 'resolved'
  | 'withdrawn'
  | 'closed';

export type DisputeCategory =
  | 'defective_work'
  | 'incomplete_work'
  | 'delay'
  | 'non_payment'
  | 'disputed_variation'
  | 'damage'
  | 'contract_scope'
  | 'refund'
  | 'access_problem'
  | 'communication_breakdown'
  | 'other';

export type DisputeRelationshipType =
  | 'homeowner_trader'
  | 'trader_homeowner'
  | 'contractor_subcontractor'
  | 'business_business'
  | 'unpaid_invoice'
  | 'other';

export type Jurisdiction = 'england_wales';

export type DisputePartyRole = 'claimant' | 'respondent';

export type DisputeClaimType =
  | 'claim'
  | 'counterclaim'
  | 'defence'
  | 'response'
  | 'correction';

export type DisputeClaimStatus = 'submitted' | 'accepted' | 'superseded' | 'withdrawn';

export type DisputeResponsePosition =
  | 'accept_full'
  | 'accept_part'
  | 'dispute'
  | 'need_clarification';

export type DisputeClarificationStatus = 'open' | 'answered' | 'withdrawn';

export type DisputePartyAccessStatus = 'active' | 'suspended' | 'removed';

export type DisputeEventVisibility = 'parties' | 'claimant' | 'respondent' | 'admin_only';

export type DisputeEventActorRole = 'claimant' | 'respondent' | 'platform_admin' | 'system';

export type DisputeEvidenceCategory =
  | 'contract_or_quote'
  | 'scope_or_specification'
  | 'variation'
  | 'invoice'
  | 'payment'
  | 'message_or_email'
  | 'photograph'
  | 'video'
  | 'inspection_report'
  | 'defect_record'
  | 'remedial_estimate'
  | 'completion_record'
  | 'access_record'
  | 'witness_information'
  | 'other';

export type DisputeEvidenceSource = 'linked_record' | 'file_upload' | 'text_note';

export type DisputeEvidenceSubmissionStatus = 'pending_validation' | 'validated' | 'withdrawn';

// ─── Record models (mirror the database rows) ────────────────────────────────

export interface Dispute {
  id: string;
  organisation_id: string;
  case_reference: string;
  project_id: string;
  raised_by_user_id: string | null;
  claimant_user_id: string;
  respondent_user_id: string | null;
  claimant_role: string;
  respondent_role: string | null;
  relationship_type: DisputeRelationshipType;
  jurisdiction: Jurisdiction;
  dispute_category: DisputeCategory;
  title: string;
  summary: string | null;
  amount_disputed_pence: number | null;
  currency: string;
  desired_resolution: string | null;
  current_stage: DisputeStage;
  status: DisputeStatus;
  opened_at: string | null;
  response_due_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisputeParty {
  id: string;
  dispute_id: string;
  user_id: string;
  party_role: DisputePartyRole;
  display_name_snapshot: string | null;
  business_name_snapshot: string | null;
  service_address_snapshot: string | null;
  email_snapshot: string | null;
  access_status: DisputePartyAccessStatus;
  joined_at: string;
}

export interface DisputeClaim {
  id: string;
  dispute_id: string;
  submitted_by_user_id: string;
  claim_type: DisputeClaimType;
  statement: string | null;
  amount_pence: number | null;
  calculation_breakdown: unknown | null;
  requested_remedy: string | null;
  status: DisputeClaimStatus;
  submitted_at: string;
  supersedes_claim_id: string | null;
  // ── Formal response / counterclaim fields (Disputes 04) ─────────────────
  position?: DisputeResponsePosition | null;
  facts_accepted?: string[] | null;
  facts_disputed?: { point: string; reason: string }[] | null;
  proposed_resolution?: string | null;
  amount_accepted_pence?: number | null;
  counterclaim_category?: string | null;
  linked_records?: { type: string; id: string; label: string }[] | null;
}

export interface DisputeClarification {
  id: string;
  dispute_id: string;
  requested_by_user_id: string | null;
  target_claim_id: string | null;
  point: string;
  relevance: string;
  response_due_at: string;
  status: DisputeClarificationStatus;
  response: string | null;
  answered_by_user_id: string | null;
  answered_at: string | null;
  created_at: string;
}

export interface DisputeEvent {
  id: string;
  dispute_id: string;
  event_type: string;
  actor_user_id: string | null;
  actor_role: DisputeEventActorRole | null;
  title: string;
  description: string | null;
  related_record_type: string | null;
  related_record_id: string | null;
  visibility: DisputeEventVisibility;
  metadata: unknown | null;
  created_at: string;
}

export interface DisputeAuditEntry {
  id: string;
  dispute_id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  previous_value: unknown | null;
  new_value: unknown | null;
  request_metadata: unknown | null;
  created_at: string;
}

export interface DisputeEvidence {
  id: string;
  dispute_id: string;
  submitted_by_user_id: string;
  evidence_reference: string;
  evidence_category: DisputeEvidenceCategory;
  title: string;
  description: string | null;
  event_date: string | null;
  source_type: DisputeEvidenceSource;
  linked_project_record_type: string | null;
  linked_project_record_id: string | null;
  storage_path: string | null;
  original_filename: string | null;
  safe_display_filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  file_hash: string | null;
  captured_metadata: unknown | null;
  visibility: 'shared' | 'withdrawn';
  submission_status: DisputeEvidenceSubmissionStatus;
  supersedes_evidence_id: string | null;
  submitted_at: string;
  created_at: string;
  // ── Enriched (server-side joined) ───────────────────────────────────────
  submitted_by_name?: string | null;
  submitted_by_role?: string | null;
  superseded_by_id?: string | null;
  linked_record_label?: string | null;
  versions?: DisputeEvidenceVersion[];
}

export interface DisputeEvidenceVersion {
  id: string;
  evidence_reference: string;
  submitted_at: string;
  submitted_by_name: string | null;
  is_current: boolean;
}

export interface DisputeLinkableRecord {
  type: string;
  id: string;
  label: string;
  reference: string | null;
}

// ─── Label maps ──────────────────────────────────────────────────────────────

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  awaiting_response: 'Awaiting response',
  under_discussion: 'Under discussion',
  evidence_collection: 'Evidence collection',
  negotiation: 'Negotiation',
  mediation_considered: 'Mediation considered',
  pre_action: 'Pre-action',
  resolved: 'Resolved',
  withdrawn: 'Withdrawn',
  closed: 'Closed',
};

export const DISPUTE_STAGE_LABELS: Record<DisputeStage, string> = {
  open: 'Open',
  awaiting_response: 'Awaiting response',
  under_discussion: 'Under discussion',
  evidence_collection: 'Evidence collection',
  negotiation: 'Negotiation',
  mediation_considered: 'Mediation considered',
  pre_action: 'Pre-action',
  resolved: 'Resolved',
  withdrawn: 'Withdrawn',
  closed: 'Closed',
};

export const DISPUTE_CATEGORY_LABELS: Record<DisputeCategory, string> = {
  defective_work: 'Defective work',
  incomplete_work: 'Incomplete work',
  delay: 'Delay',
  non_payment: 'Non-payment',
  disputed_variation: 'Disputed variation',
  damage: 'Damage',
  contract_scope: 'Contract scope',
  refund: 'Refund',
  access_problem: 'Access problem',
  communication_breakdown: 'Communication breakdown',
  other: 'Other',
};

export const DISPUTE_RELATIONSHIP_LABELS: Record<DisputeRelationshipType, string> = {
  homeowner_trader: 'Homeowner → Trader',
  trader_homeowner: 'Trader → Homeowner',
  contractor_subcontractor: 'Contractor → Subcontractor',
  business_business: 'Business → Business',
  unpaid_invoice: 'Unpaid invoice',
  other: 'Other',
};

// Party role labels for the claimant_role / respondent_role columns.
export const DISPUTE_ROLE_LABELS: Record<string, string> = {
  homeowner: 'Homeowner',
  client: 'Client',
  trader: 'Trader',
  contractor: 'Contractor',
  subcontractor: 'Subcontractor',
  business: 'Business',
  other: 'Other',
};

export function getDisputeRoleLabel(role: string | null | undefined): string {
  if (!role) return '—';
  return DISPUTE_ROLE_LABELS[role] ?? role;
}

export const JURISDICTION_LABELS: Record<Jurisdiction, string> = {
  england_wales: 'England & Wales',
};

export const DISPUTE_CLAIM_TYPE_LABELS: Record<DisputeClaimType, string> = {
  claim: 'Claim',
  counterclaim: 'Counterclaim',
  defence: 'Defence',
  response: 'Response',
  correction: 'Correction',
};

export const DISPUTE_RESPONSE_POSITION_LABELS: Record<DisputeResponsePosition, string> = {
  accept_full: 'Accept the claim in full',
  accept_part: 'Accept the claim in part',
  dispute: 'Dispute the claim',
  need_clarification: 'Need clarification before responding',
};

export const DISPUTE_CLARIFICATION_STATUS_LABELS: Record<DisputeClarificationStatus, string> = {
  open: 'Open',
  answered: 'Answered',
  withdrawn: 'Withdrawn',
};

export const DISPUTE_EVIDENCE_CATEGORY_LABELS: Record<DisputeEvidenceCategory, string> = {
  contract_or_quote: 'Contract or quote',
  scope_or_specification: 'Scope or specification',
  variation: 'Variation',
  invoice: 'Invoice',
  payment: 'Payment',
  message_or_email: 'Message or email',
  photograph: 'Photograph',
  video: 'Video',
  inspection_report: 'Inspection report',
  defect_record: 'Defect record',
  remedial_estimate: 'Remedial estimate',
  completion_record: 'Completion record',
  access_record: 'Access record',
  witness_information: 'Witness information',
  other: 'Other',
};

export const DISPUTE_EVIDENCE_CATEGORIES = Object.keys(
  DISPUTE_EVIDENCE_CATEGORY_LABELS,
) as DisputeEvidenceCategory[];

export const DISPUTE_EVIDENCE_SOURCE_LABELS: Record<DisputeEvidenceSource, string> = {
  linked_record: 'Linked project record',
  file_upload: 'Uploaded file',
  text_note: 'Text note',
};

export const DISPUTE_EVIDENCE_STATUS_LABELS: Record<DisputeEvidenceSubmissionStatus, string> = {
  pending_validation: 'Pending validation',
  validated: 'Validated',
  withdrawn: 'Withdrawn',
};

export const DISPUTE_RESPONSE_POSITIONS = Object.keys(
  DISPUTE_RESPONSE_POSITION_LABELS,
) as DisputeResponsePosition[];

// ─── Validators ──────────────────────────────────────────────────────────────

export const DISPUTE_STATUSES = Object.keys(DISPUTE_STATUS_LABELS) as DisputeStatus[];
export const DISPUTE_STAGES = Object.keys(DISPUTE_STAGE_LABELS) as DisputeStage[];
export const DISPUTE_CATEGORIES = Object.keys(DISPUTE_CATEGORY_LABELS) as DisputeCategory[];
export const DISPUTE_RELATIONSHIPS = Object.keys(DISPUTE_RELATIONSHIP_LABELS) as DisputeRelationshipType[];
export const DISPUTE_CLAIM_TYPES = Object.keys(DISPUTE_CLAIM_TYPE_LABELS) as DisputeClaimType[];

export function isDisputeStatus(value: string): value is DisputeStatus {
  return (DISPUTE_STATUSES as string[]).includes(value);
}

export function isDisputeStage(value: string): value is DisputeStage {
  return (DISPUTE_STAGES as string[]).includes(value);
}

export function isDisputeCategory(value: string): value is DisputeCategory {
  return (DISPUTE_CATEGORIES as string[]).includes(value);
}

export function isDisputeRelationshipType(value: string): value is DisputeRelationshipType {
  return (DISPUTE_RELATIONSHIPS as string[]).includes(value);
}

export function isJurisdiction(value: string): value is Jurisdiction {
  return value === 'england_wales';
}

// ─── Permitted actions (neutral, permission-only — no liability/outcome logic) ─

export interface DisputePermittedActions {
  canEditDraft: boolean;
  canSubmit: boolean;
  canAddClaim: boolean;
  canCorrectOwnClaim: boolean;
  canRespond: boolean;
  canSubmitResponse: boolean;
  canRequestClarification: boolean;
  canAnswerClarification: boolean;
  canWithdraw: boolean;
  canRequestResolution: boolean;
  canConfirmResolution: boolean;
  canViewFull: boolean;
  isParty: boolean;
}

export const NO_PERMITTED_ACTIONS: DisputePermittedActions = {
  canEditDraft: false,
  canSubmit: false,
  canAddClaim: false,
  canCorrectOwnClaim: false,
  canRespond: false,
  canSubmitResponse: false,
  canRequestClarification: false,
  canAnswerClarification: false,
  canWithdraw: false,
  canRequestResolution: false,
  canConfirmResolution: false,
  canViewFull: false,
  isParty: false,
};

// ─── Enriched view models (server-side joined data) ────────────────────────

export interface DisputeProjectRef {
  id: string;
  reference: string | null;
  project_name: string | null;
}

export interface DisputePartyView extends DisputeParty {
  profile_name?: string | null;
  profile_job_title?: string | null;
}

export interface DisputeListItem extends Dispute {
  project_name: string | null;
  project_reference: string | null;
  my_role: DisputePartyRole | null;
  other_party_name: string | null;
  other_party_role: string | null;
  action_required: boolean;
  next_action: string | null;
  last_activity_at: string | null;
  last_activity_title: string | null;
}

export interface DisputeResolutionState {
  pendingRequest: boolean;
  requestedByMe: boolean;
}

export interface DisputeDetailView {
  dispute: Dispute;
  project: DisputeProjectRef | null;
  parties: DisputePartyView[];
  claims: DisputeClaim[];
  clarifications: DisputeClarification[];
  events: DisputeEvent[];
  actions: DisputePermittedActions;
  myRole: DisputePartyRole | null;
  resolution: DisputeResolutionState;
}

// ─── Settlement offers & negotiation (Disputes 06) ──────────────────────────

export type SettlementOfferType =
  | 'payment'
  | 'partial_refund'
  | 'full_refund'
  | 'remedial_work'
  | 'revised_completion_plan'
  | 'mutual_walk_away'
  | 'combined_resolution'
  | 'other';

export type SettlementOfferStatus =
  | 'draft'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'countered'
  | 'withdrawn'
  | 'expired'
  | 'completed'
  | 'failed';

export type SettlementObligationStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted_completed'
  | 'confirmed_completed'
  | 'disputed_completion'
  | 'overdue';

export type SettlementObligationKind = 'payment' | 'work' | 'other';

export interface SettlementOffer {
  id: string;
  dispute_id: string;
  offered_by_user_id: string;
  offer_type: SettlementOfferType;
  summary: string;
  payment_amount_pence: number | null;
  currency: string;
  work_description: string | null;
  proposed_completion_date: string | null;
  payment_due_date: string | null;
  conditions: string | null;
  referenced_evidence: string | null;
  response_deadline: string | null;
  status: SettlementOfferStatus;
  supersedes_offer_id: string | null;
  responded_by_user_id: string | null;
  created_at: string;
  responded_at: string | null;
  withdrawn_at: string | null;
  // ── Enriched (server-side joined) ───────────────────────────────────────
  offered_by_name?: string | null;
  offered_by_role?: 'claimant' | 'respondent' | null;
  responded_by_name?: string | null;
}

export interface SettlementObligation {
  id: string;
  dispute_id: string;
  offer_id: string | null;
  kind: SettlementObligationKind;
  title: string;
  amount_pence: number | null;
  due_date: string | null;
  status: SettlementObligationStatus;
  submitted_by_user_id: string | null;
  submitted_at: string | null;
  confirmed_by_user_id: string | null;
  confirmed_at: string | null;
  dispute_reason: string | null;
  created_at: string;
  // ── Enriched ────────────────────────────────────────────────────────────
  effective_status?: SettlementObligationStatus;
  submitted_by_name?: string | null;
  confirmed_by_name?: string | null;
}

export interface OfferListResponse {
  offers: SettlementOffer[];
  obligations: SettlementObligation[];
  activeOfferId: string | null;
  acceptedOfferId: string | null;
  canCreateOffer: boolean;
  canRespondOffer: boolean;
}

// ─── Label maps ──────────────────────────────────────────────────────────────

export const SETTLEMENT_OFFER_TYPE_LABELS: Record<SettlementOfferType, string> = {
  payment: 'Payment',
  partial_refund: 'Partial refund',
  full_refund: 'Full refund',
  remedial_work: 'Remedial work',
  revised_completion_plan: 'Revised completion plan',
  mutual_walk_away: 'Mutual walk-away',
  combined_resolution: 'Combined resolution',
  other: 'Other',
};

export const SETTLEMENT_OFFER_STATUS_LABELS: Record<SettlementOfferStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  accepted: 'Accepted',
  rejected: 'Rejected',
  countered: 'Countered',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
  completed: 'Completed',
  failed: 'Failed',
};

export const SETTLEMENT_OBLIGATION_STATUS_LABELS: Record<SettlementObligationStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  submitted_completed: 'Submitted as completed',
  confirmed_completed: 'Confirmed completed',
  disputed_completion: 'Disputed completion',
  overdue: 'Overdue',
};

export const SETTLEMENT_OFFER_TYPES = Object.keys(
  SETTLEMENT_OFFER_TYPE_LABELS,
) as SettlementOfferType[];

export const SETTLEMENT_OFFER_STATUSES = Object.keys(
  SETTLEMENT_OFFER_STATUS_LABELS,
) as SettlementOfferStatus[];