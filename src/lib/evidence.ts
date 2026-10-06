/**
 * Pure evidence helpers — no mock data, no backend imports.
 *
 * The capture UI uses friendly type keys (e.g. `labour_record`) while the
 * `evidence_records.evidence_type` column has a strict CHECK constraint that
 * only accepts canonical values (e.g. `labour`). Writing the UI label straight
 * into the column would fail with a 23514 check_violation, so every capture is
 * normalised through `toDbEvidenceType` before insert.
 */

export type CaptureType =
  | 'photo'
  | 'video'
  | 'voice_note'
  | 'written_note'
  | 'labour_record'
  | 'material_record'
  | 'delivery'
  | 'site_instruction'
  | 'delay'
  | 'inspection'
  | 'completion_signoff';

export type EvidenceVisibilityValue = 'internal_only' | 'client_visible';

/** Maps a capture-type key to the canonical value the database CHECK allows. */
const CAPTURE_TO_DB: Record<string, string> = {
  photo: 'photo',
  video: 'video',
  voice_note: 'voice_note',
  written_note: 'written_note',
  labour_record: 'labour',
  material_record: 'material',
  delivery: 'delivery',
  site_instruction: 'site_instruction',
  delay: 'delay',
  inspection: 'inspection',
  completion_signoff: 'completion_signoff',
};

const DB_EVIDENCE_TYPES = new Set([
  'photo',
  'video',
  'voice_note',
  'written_note',
  'site_instruction',
  'labour',
  'material',
  'delivery',
  'delay',
  'inspection',
  'test_result',
  'drawing',
  'client_decision',
  'variation_evidence',
  'safety_observation',
  'damage',
  'completion_signoff',
  'other',
]);

/**
 * Normalises any capture/UI type to a value accepted by the
 * `evidence_records_evidence_type_check` constraint. Unknown values fall back
 * to `other` so a capture can never be rejected for an unmapped label.
 */
export function toDbEvidenceType(type: string): string {
  const mapped = CAPTURE_TO_DB[type];
  if (mapped) return mapped;
  if (DB_EVIDENCE_TYPES.has(type)) return type;
  return 'other';
}

const TYPE_LABELS: Record<string, string> = {
  photo: 'Photo',
  video: 'Video',
  voice_note: 'Voice note',
  written_note: 'Written note',
  site_instruction: 'Site instruction',
  labour_record: 'Labour record',
  labour: 'Labour record',
  material_record: 'Material record',
  material: 'Material record',
  delivery: 'Delivery',
  delay: 'Delay',
  inspection: 'Inspection',
  test_result: 'Test result',
  drawing: 'Drawing/markup',
  drawing_markup: 'Drawing/markup',
  client_decision: 'Client decision',
  variation_evidence: 'Variation evidence',
  safety_observation: 'Safety observation',
  damage: 'Damage record',
  damage_record: 'Damage record',
  completion_signoff: 'Completion/sign-off',
  other: 'Other',
};

export function evidenceTypeLabel(type: string): string {
  return TYPE_LABELS[type] || type.replace(/_/g, ' ');
}

const TYPE_ICONS: Record<string, string> = {
  photo: 'ri-camera-line',
  video: 'ri-vidicon-line',
  voice_note: 'ri-mic-line',
  written_note: 'ri-file-text-line',
  site_instruction: 'ri-chat-check-line',
  labour_record: 'ri-user-line',
  labour: 'ri-user-line',
  material_record: 'ri-stack-line',
  material: 'ri-stack-line',
  delivery: 'ri-truck-line',
  delay: 'ri-timer-line',
  inspection: 'ri-clipboard-line',
  test_result: 'ri-test-tube-line',
  drawing: 'ri-pencil-ruler-line',
  drawing_markup: 'ri-pencil-ruler-line',
  client_decision: 'ri-question-answer-line',
  variation_evidence: 'ri-price-tag-3-line',
  safety_observation: 'ri-shield-line',
  damage: 'ri-error-warning-line',
  damage_record: 'ri-error-warning-line',
  completion_signoff: 'ri-check-double-line',
  other: 'ri-file-line',
};

export function evidenceTypeIcon(type: string): string {
  return TYPE_ICONS[type] || 'ri-file-line';
}

const REVIEW_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  awaiting_review: 'Awaiting review',
  accepted: 'Accepted',
  correction_requested: 'Correction requested',
  rejected: 'Rejected',
  archived: 'Archived',
};

export function reviewStatusLabel(status: string): string {
  return REVIEW_STATUS_LABELS[status] || status;
}

const REVIEW_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-300 text-gray-700',
  submitted: 'bg-status-blue text-white',
  awaiting_review: 'bg-status-amber text-white',
  accepted: 'bg-status-green text-white',
  correction_requested: 'bg-status-amber text-white',
  rejected: 'bg-status-red text-white',
  archived: 'bg-gray-400 text-white',
};

export function reviewStatusColor(status: string): string {
  return REVIEW_STATUS_COLORS[status] || 'bg-gray-200 text-gray-600';
}

export function visibilityLabel(visibility: string): string {
  if (visibility === 'client_visible') return 'Client visible';
  if (visibility === 'shared_selected') return 'Shared with selected';
  if (visibility === 'restricted') return 'Restricted';
  return 'Internal only';
}

export function visibilityColor(visibility: string): string {
  if (visibility === 'client_visible') return 'bg-primary-50 text-primary-700';
  if (visibility === 'shared_selected') return 'bg-status-blue-pale text-status-blue';
  return 'bg-gray-200 text-gray-600';
}

/** Capture categories offered in the site-capture flow. */
export const evidenceJobStages = [
  'Pre-start',
  'Groundworks',
  'Structure',
  'First fix',
  'Second fix',
  'Finishing',
  'Handover',
];

export const delayCategories = [
  'weather',
  'client_decision',
  'design_information',
  'access',
  'labour',
  'materials',
  'plant',
  'inspection',
  'utility',
  'third_party',
  'unforeseen_condition',
  'safety',
  'other',
];

export const instructionSources = [
  'Client',
  'Main contractor',
  'Designer',
  'Project manager',
  'Site supervisor',
  'Building Control',
  'Other',
];

export interface SelectedEvidenceFile {
  /** Stable key used to build an idempotent storage path across retries. */
  id: string;
  file: File;
}

/** Creates a stable, collision-resistant key for a selected file. */
export function createFileKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Builds the protected storage object path for an evidence file, matching the
 * `{org}/{job}/{record}/{key}-{filename}` convention read by
 * `public.extract_org_from_path`.
 */
export function buildEvidenceObjectPath(
  orgId: string,
  jobId: string,
  recordId: string,
  fileKey: string,
  filename: string,
): string {
  const safe = (filename || 'file')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120) || 'file';
  return `${orgId}/${jobId}/${recordId}/${fileKey}-${safe}`;
}