// Pure display helpers for the job detail page.
// These are label/colour lookups only — no sample data lives here.

export function evidenceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    photo: 'Photo',
    video: 'Video',
    voice_note: 'Voice note',
    written_note: 'Written note',
    site_instruction: 'Site instruction',
    labour_record: 'Labour record',
    material_record: 'Material record',
    delivery: 'Delivery',
    delay: 'Delay',
    inspection: 'Inspection',
    test_result: 'Test result',
    drawing_markup: 'Drawing/markup',
    client_decision: 'Client decision',
    variation_evidence: 'Variation evidence',
    safety_observation: 'Safety observation',
    damage_record: 'Damage record',
    completion_signoff: 'Completion/sign-off',
    other: 'Other',
  };
  return labels[type] || type;
}

export function evidenceTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    photo: 'ri-camera-line',
    video: 'ri-vidicon-line',
    voice_note: 'ri-mic-line',
    written_note: 'ri-file-text-line',
    site_instruction: 'ri-chat-check-line',
    labour_record: 'ri-user-line',
    material_record: 'ri-stack-line',
    delivery: 'ri-truck-line',
    delay: 'ri-timer-line',
    inspection: 'ri-clipboard-line',
    test_result: 'ri-test-tube-line',
    drawing_markup: 'ri-pencil-ruler-line',
    client_decision: 'ri-question-answer-line',
    variation_evidence: 'ri-price-tag-3-line',
    safety_observation: 'ri-shield-line',
    damage_record: 'ri-error-warning-line',
    completion_signoff: 'ri-check-double-line',
    other: 'ri-more-line',
  };
  return icons[type] || 'ri-file-line';
}

export function reviewStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    awaiting_review: 'Awaiting review',
    accepted: 'Accepted',
    correction_requested: 'Correction requested',
    rejected: 'Rejected',
    archived: 'Archived',
  };
  return labels[status] || status;
}

export function reviewStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-background-200 text-foreground-700',
    submitted: 'bg-status-blue-pale text-status-blue',
    awaiting_review: 'bg-status-amber-pale text-status-amber',
    accepted: 'bg-primary-50 text-primary-700',
    correction_requested: 'bg-status-amber-pale text-status-amber',
    rejected: 'bg-status-red-pale text-status-red',
    archived: 'bg-background-200 text-foreground-700',
  };
  return colors[status] || 'bg-background-200 text-foreground-700';
}

export function visibilityLabel(visibility: string): string {
  const labels: Record<string, string> = {
    internal_only: 'Internal only',
    client_visible: 'Client visible',
    shared_with_selected: 'Shared with selected',
  };
  return labels[visibility] || visibility;
}

export function visibilityColor(visibility: string): string {
  const colors: Record<string, string> = {
    internal_only: 'bg-background-200 text-foreground-700',
    client_visible: 'bg-primary-50 text-primary-700',
    shared_with_selected: 'bg-status-blue-pale text-status-blue',
  };
  return colors[visibility] || 'bg-background-200 text-foreground-700';
}

export function eventCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    milestone: 'Milestone',
    progress: 'Progress',
    photo: 'Photo',
    video: 'Video',
    voice_note: 'Voice note',
    delivery: 'Delivery',
    instruction: 'Instruction',
    delay: 'Delay',
    variation: 'Variation',
    decision: 'Decision',
    inspection: 'Inspection',
    completion: 'Completion',
    document: 'Document',
    update: 'Update',
  };
  return labels[category] || category;
}

export function eventCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    milestone: 'bg-primary-500',
    progress: 'bg-status-blue',
    photo: 'bg-status-purple',
    video: 'bg-status-purple',
    voice_note: 'bg-status-amber',
    delivery: 'bg-status-blue',
    instruction: 'bg-status-amber',
    delay: 'bg-status-red',
    variation: 'bg-status-purple',
    decision: 'bg-primary-500',
    inspection: 'bg-status-green',
    completion: 'bg-status-green',
    document: 'bg-background-300',
    update: 'bg-status-blue',
  };
  return colors[category] || 'bg-background-300';
}

export function confidenceLabel(score: number | null): 'High' | 'Medium' | 'Low' {
  if (score === null) return 'Low';
  if (score >= 0.8) return 'High';
  if (score >= 0.5) return 'Medium';
  return 'Low';
}

export function variationStatusLabel(status: string): string {
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

export function variationStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-background-200 text-foreground-700',
    internal_review: 'bg-status-blue-pale text-status-blue',
    ready_to_send: 'bg-status-purple-pale text-status-purple',
    sent: 'bg-status-blue-pale text-status-blue',
    viewed: 'bg-status-amber-pale text-status-amber',
    question_received: 'bg-status-amber-pale text-status-amber',
    approved: 'bg-primary-50 text-primary-700',
    declined: 'bg-status-red-pale text-status-red',
    withdrawn: 'bg-background-200 text-foreground-700',
    superseded: 'bg-background-200 text-foreground-700',
    invoiced: 'bg-primary-50 text-primary-700',
  };
  return colors[status] || 'bg-background-200 text-foreground-700';
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}