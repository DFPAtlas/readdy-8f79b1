// ─── Types ───────────────────────────────────────────────

export type EvidenceType =
  | 'photo'
  | 'video'
  | 'voice_note'
  | 'written_note'
  | 'site_instruction'
  | 'labour_record'
  | 'material_record'
  | 'delivery'
  | 'delay'
  | 'inspection'
  | 'test_result'
  | 'drawing_markup'
  | 'client_decision'
  | 'variation_evidence'
  | 'safety_observation'
  | 'damage_record'
  | 'completion_signoff'
  | 'other';

export type EvidenceVisibility = 'internal_only' | 'client_visible' | 'shared_with_selected';

export type EvidenceReviewStatus = 'draft' | 'submitted' | 'awaiting_review' | 'accepted' | 'correction_requested' | 'rejected' | 'archived';

export type SyncState = 'saved_on_device' | 'waiting_to_sync' | 'syncing' | 'synced' | 'sync_failed' | 'conflict_requires_review';

export type DelayCategory =
  | 'weather'
  | 'client_decision'
  | 'design_information'
  | 'access'
  | 'labour'
  | 'materials'
  | 'plant'
  | 'inspection'
  | 'utility'
  | 'third_party'
  | 'unforeseen_condition'
  | 'safety'
  | 'other';

export type DelayStatus = 'open' | 'monitoring' | 'resolved' | 'linked_to_variation' | 'superseded';

export type DailyLogStatus = 'draft' | 'complete' | 'corrected' | 'client_summary_published' | 'locked' | 'archived';

export type EvidencePackType = 'progress_update' | 'stage_completion' | 'variation_support' | 'payment_support' | 'inspection_record' | 'handover_evidence' | 'custom';

export interface EvidenceVersion {
  version: number;
  createdAt: string;
  createdBy: string;
  changeNote: string;
  previousStatus: EvidenceReviewStatus;
  newStatus: EvidenceReviewStatus;
}

export interface EvidenceRelationship {
  type: string;
  id: string;
  ref: string;
  title: string;
}

export interface EvidenceAttachment {
  id: string;
  name: string;
  type: string;
  size: string;
  previewUrl?: string;
}

export interface EvidenceRecord {
  id: string;
  evidenceType: EvidenceType;
  title: string;
  caption: string;
  jobId: string;
  jobRef: string;
  jobName: string;
  projectStage: string;
  capturedAt: string;
  capturedBy: string;
  capturedByInitials: string;
  visibility: EvidenceVisibility;
  reviewStatus: EvidenceReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  locationLabel?: string;
  peopleInvolved?: string[];
  attachments: EvidenceAttachment[];
  relatedRecords: EvidenceRelationship[];
  tags: string[];
  internalNote?: string;
  versions: EvidenceVersion[];
  syncState: SyncState;
  createdAt: string;
  updatedAt: string;

  // Type-specific fields
  duration?: string;
  transcriptPlaceholder?: string;
  supplier?: string;
  deliveryRef?: string;
  deliveryItems?: string;
  deliveryCondition?: string;
  acceptedBy?: string;
  purchaseOrderRef?: string;
  damageShortage?: string;
  instructionSource?: string;
  personGivingInstruction?: string;
  instructionText?: string;
  costImpactExpected?: boolean;
  programmeImpactExpected?: boolean;
  workAuthorised?: boolean;
  acknowledgedBy?: string;
  delayCategory?: DelayCategory;
  delayStatus?: DelayStatus;
  delayStartDateTime?: string;
  delayEndDateTime?: string;
  delayResponsibleParty?: string;
  delayDescription?: string;
  delayWorkAffected?: string;
  delayEstimatedHours?: number;
  delayEstimatedProgrammeEffect?: string;
  delayActionRequired?: string;
  inspectionOutcome?: string;
  inspectionReference?: string;
  materialName?: string;
  materialQuantity?: number;
  materialUnit?: string;
  materialUnitCost?: number;
  materialTotalCost?: number;
  materialWaste?: string;
  labourDate?: string;
  labourStart?: string;
  labourFinish?: string;
  labourBreak?: string;
  labourTotalHours?: number;
  labourWorkCompleted?: string;
  decisionId?: string;
  variationId?: string;
  offlineCreatedAt?: string;
}

export interface SiteAttendance {
  personId: string;
  name: string;
  initials: string;
  company: string;
  role: string;
  startTime?: string;
  finishTime?: string;
  hours: number;
  category: 'employee' | 'subcontractor' | 'visitor';
}

export interface DailySiteLog {
  id: string;
  jobId: string;
  jobRef: string;
  jobName: string;
  logDate: string;
  status: DailyLogStatus;
  supervisor: string;
  siteOpenTime?: string;
  siteCloseTime?: string;
  attendance: SiteAttendance[];
  totalLabourHours: number;
  weather: string;
  temperature?: string;
  siteConditions?: string;
  accessIssues?: string;
  welfareStatus?: string;
  workCompleted: string;
  jobStagesAffected: string[];
  progressEstimate?: number;
  plantUsed?: string;
  materialsUsed?: string;
  deliveries?: string;
  inspections?: string;
  tests?: string;
  delays?: string;
  instructions?: string;
  designQueries?: string;
  safetyObservations?: string;
  damage?: string;
  clientDecisions?: string;
  variationsRequired?: string;
  plannedWork: string;
  peopleRequired?: string;
  materialsRequired?: string;
  plantRequired?: string;
  decisionsNeeded?: string;
  risks?: string;
  clientSummaryPublished?: boolean;
  clientSummaryContent?: string;
  linkedEvidenceIds: string[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  versions: { version: number; updatedAt: string; reason: string }[];
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  eventCategory: string;
  eventType: string;
  title: string;
  actor: string;
  actorInitials: string;
  summary: string;
  jobId: string;
  jobRef: string;
  visibility: EvidenceVisibility;
  relatedEvents: string[];
  attachments: string[];
  version: number;
  auditRef: string;
  evidenceType?: EvidenceType;
}

export interface EvidencePack {
  id: string;
  jobId: string;
  jobRef: string;
  jobName: string;
  packType: EvidencePackType;
  title: string;
  dateFrom: string;
  dateTo: string;
  selectedEvidenceIds: string[];
  sections: string[];
  format: 'client_safe' | 'internal';
  generatedPreview?: string;
  createdAt: string;
}

export interface OfflineQueueItem {
  id: string;
  evidenceType: EvidenceType;
  title: string;
  caption: string;
  jobId: string;
  capturedAt: string;
  capturedBy: string;
  syncState: SyncState;
  localData: Record<string, unknown>;
}

// ─── Demo Evidence Records ─────────────────────────────

export const demoEvidence: EvidenceRecord[] = [
  {
    id: 'ev-1001',
    evidenceType: 'photo',
    title: 'Steel bearing preparation',
    caption: 'Existing wall opening prepared for steel beam installation. Padstones checked and level.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    projectStage: 'Structure',
    capturedAt: '2026-08-05T08:42:00Z',
    capturedBy: 'Martin Hewett',
    capturedByInitials: 'MH',
    visibility: 'client_visible',
    reviewStatus: 'accepted',
    reviewedBy: 'Amelia Brooks',
    reviewedAt: '2026-08-05T08:55:00Z',
    attachments: [
      { id: 'att-1', name: 'steel-bearing-prep.jpg', type: 'image/jpeg', size: '2.4 MB', previewUrl: 'https://readdy.ai/api/search-image?query=Professional%20construction%20site%20photograph%20showing%20steel%20beam%20bearing%20preparation%20in%20a%20brick%20wall%20opening%2C%20clean%20worksite%2C%20building%20control%20ready%2C%20natural%20daylight%2C%20warm%20stone%20tones%2C%20documentary%20construction%20photography&width=800&height=600&seq=sl-evidence-01&orientation=landscape' },
    ],
    relatedRecords: [],
    tags: ['steel', 'structure', 'preparation'],
    versions: [
      { version: 1, createdAt: '2026-08-05T08:42:00Z', createdBy: 'Martin Hewett', changeNote: 'Original capture', previousStatus: 'draft', newStatus: 'submitted' },
      { version: 1, createdAt: '2026-08-05T08:55:00Z', createdBy: 'Amelia Brooks', changeNote: 'Reviewed and accepted', previousStatus: 'submitted', newStatus: 'accepted' },
    ],
    syncState: 'synced',
    createdAt: '2026-08-05T08:42:00Z',
    updatedAt: '2026-08-05T08:55:00Z',
    locationLabel: 'Rear elevation, kitchen extension',
  },
  {
    id: 'ev-1002',
    evidenceType: 'photo',
    title: 'Existing wall opening before steel installation',
    caption: 'Original wall opening showing existing brickwork condition. No cracks or movement detected.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    projectStage: 'Structure',
    capturedAt: '2026-08-05T08:45:00Z',
    capturedBy: 'James Lawrence',
    capturedByInitials: 'JL',
    visibility: 'internal_only',
    reviewStatus: 'accepted',
    reviewedBy: 'Martin Hewett',
    reviewedAt: '2026-08-05T09:00:00Z',
    attachments: [
      { id: 'att-2', name: 'wall-opening-before.jpg', type: 'image/jpeg', size: '1.8 MB', previewUrl: 'https://readdy.ai/api/search-image?query=Existing%20brick%20wall%20opening%20in%20residential%20kitchen%20extension%20before%20structural%20steel%20installation%2C%20professional%20construction%20documentation%2C%20natural%20daylight%2C%20clean%20composition&width=800&height=600&seq=sl-evidence-02&orientation=landscape' },
    ],
    relatedRecords: [],
    tags: ['wall', 'structure', 'pre-installation'],
    internalNote: 'Checked with structural engineer drawings. Padstone positions confirmed.',
    versions: [
      { version: 1, createdAt: '2026-08-05T08:45:00Z', createdBy: 'James Lawrence', changeNote: 'Original capture', previousStatus: 'draft', newStatus: 'submitted' },
      { version: 1, createdAt: '2026-08-05T09:00:00Z', createdBy: 'Martin Hewett', changeNote: 'Accepted', previousStatus: 'submitted', newStatus: 'accepted' },
    ],
    syncState: 'synced',
    createdAt: '2026-08-05T08:45:00Z',
    updatedAt: '2026-08-05T09:00:00Z',
  },
  {
    id: 'ev-1003',
    evidenceType: 'delivery',
    title: 'Steel beam delivered',
    caption: 'UC 203x203x46 steel beam delivered to site. Checked against order and structural specification.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    projectStage: 'Structure',
    capturedAt: '2026-08-05T09:18:00Z',
    capturedBy: 'Martin Hewett',
    capturedByInitials: 'MH',
    visibility: 'internal_only',
    reviewStatus: 'accepted',
    supplier: 'Example Steel Ltd',
    deliveryRef: 'DN-2842',
    deliveryItems: '1 x UC 203x203x46 steel beam (3.2m)\n2 x 150x150x10 base plates\n8 x M16 anchor bolts\n1 x pack of shims',
    deliveryCondition: 'Good — no damage, protective coating intact',
    acceptedBy: 'Martin Hewett',
    purchaseOrderRef: 'PO-1048-017',
    attachments: [
      { id: 'att-3a', name: 'delivery-note-DN2842.pdf', type: 'application/pdf', size: '120 KB' },
      { id: 'att-3b', name: 'steel-beam-on-site.jpg', type: 'image/jpeg', size: '2.1 MB', previewUrl: 'https://readdy.ai/api/search-image?query=Steel%20beam%20delivered%20on%20construction%20site%20driveway%2C%20protected%20with%20coating%2C%20delivery%20vehicle%20in%20background%2C%20professional%20construction%20delivery%20documentation&width=800&height=600&seq=sl-evidence-03&orientation=landscape' },
    ],
    relatedRecords: [],
    tags: ['steel', 'delivery', 'supply'],
    versions: [
      { version: 1, createdAt: '2026-08-05T09:18:00Z', createdBy: 'Martin Hewett', changeNote: 'Original record', previousStatus: 'draft', newStatus: 'accepted' },
    ],
    syncState: 'synced',
    createdAt: '2026-08-05T09:18:00Z',
    updatedAt: '2026-08-05T09:18:00Z',
  },
  {
    id: 'ev-1004',
    evidenceType: 'site_instruction',
    title: 'Move two kitchen socket positions',
    caption: 'Client requested two double socket positions be moved 300mm left from marked positions. Discussed on site visit.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    projectStage: 'First fix',
    capturedAt: '2026-08-04T14:20:00Z',
    capturedBy: 'Daniel Hughes',
    capturedByInitials: 'DH',
    visibility: 'internal_only',
    reviewStatus: 'accepted',
    instructionSource: 'Client',
    personGivingInstruction: 'Sarah Miller',
    instructionText: 'Move socket positions at positions 3 and 5 (as marked on drawing) 300mm to the left to align with revised worktop layout. Discussed with client on site. Cost and programme impact expected.',
    costImpactExpected: true,
    programmeImpactExpected: false,
    workAuthorised: false,
    acknowledgedBy: 'Daniel Hughes',
    relatedRecords: [
      { type: 'variation', id: 'var-004', ref: 'VAR-004', title: 'Additional kitchen sockets' },
    ],
    tags: ['electrical', 'client', 'instruction', 'variation'],
    internalNote: 'Converted to variation VAR-004. Awaiting client approval before proceeding.',
    versions: [
      { version: 1, createdAt: '2026-08-04T14:20:00Z', createdBy: 'Daniel Hughes', changeNote: 'Original instruction recorded', previousStatus: 'draft', newStatus: 'submitted' },
      { version: 1, createdAt: '2026-08-04T15:00:00Z', createdBy: 'Martin Hewett', changeNote: 'Converted to variation VAR-004', previousStatus: 'submitted', newStatus: 'accepted' },
    ],
    syncState: 'synced',
    createdAt: '2026-08-04T14:20:00Z',
    updatedAt: '2026-08-04T15:00:00Z',
  },
  {
    id: 'ev-1005',
    evidenceType: 'delay',
    title: 'Building Control inspection moved',
    caption: 'Building Control inspector unavailable for scheduled inspection. Inspection rescheduled by 1 working day.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    projectStage: 'Structure',
    capturedAt: '2026-08-04T11:06:00Z',
    capturedBy: 'Martin Hewett',
    capturedByInitials: 'MH',
    visibility: 'client_visible',
    reviewStatus: 'accepted',
    delayCategory: 'third_party',
    delayStatus: 'open',
    delayStartDateTime: '2026-08-04T10:00:00Z',
    delayEndDateTime: '2026-08-05T10:00:00Z',
    delayResponsibleParty: 'Building Control',
    delayDescription: 'Inspector unavailable due to staff shortage. Inspection moved from 4 August to 5 August at 10:00.',
    delayWorkAffected: 'Structural steel installation cannot proceed until inspection is completed.',
    delayEstimatedHours: 8,
    delayEstimatedProgrammeEffect: '1 working day delay to steel installation',
    delayActionRequired: 'Confirm inspection attendance on 5 August. Adjust programme if further delays.',
    attachments: [],
    relatedRecords: [],
    tags: ['delay', 'building-control', 'inspection'],
    versions: [
      { version: 1, createdAt: '2026-08-04T11:06:00Z', createdBy: 'Martin Hewett', changeNote: 'Delay recorded', previousStatus: 'draft', newStatus: 'accepted' },
    ],
    syncState: 'synced',
    createdAt: '2026-08-04T11:06:00Z',
    updatedAt: '2026-08-04T11:06:00Z',
  },
  {
    id: 'ev-1006',
    evidenceType: 'inspection',
    title: 'Foundation depth inspection',
    caption: 'Building Control inspection of foundation depths and reinforcement. All passed.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    projectStage: 'Groundworks',
    capturedAt: '2026-07-30T10:15:00Z',
    capturedBy: 'Martin Hewett',
    capturedByInitials: 'MH',
    visibility: 'client_visible',
    reviewStatus: 'accepted',
    inspectionOutcome: 'Passed',
    inspectionReference: 'BC-1048-02',
    attachments: [
      { id: 'att-6', name: 'foundation-inspection.jpg', type: 'image/jpeg', size: '1.6 MB', previewUrl: 'https://readdy.ai/api/search-image?query=Building%20inspector%20examining%20foundation%20trench%20depth%20with%20measuring%20tape%20at%20construction%20site%2C%20clipboard%20with%20documentation%2C%20professional%20setting%2C%20clearance%20natural%20light&width=800&height=600&seq=sl-evidence-06&orientation=landscape' },
    ],
    relatedRecords: [],
    tags: ['inspection', 'building-control', 'foundations'],
    versions: [
      { version: 1, createdAt: '2026-07-30T10:15:00Z', createdBy: 'Martin Hewett', changeNote: 'Inspection recorded — passed', previousStatus: 'draft', newStatus: 'accepted' },
    ],
    syncState: 'synced',
    createdAt: '2026-07-30T10:15:00Z',
    updatedAt: '2026-07-30T10:15:00Z',
  },
  {
    id: 'ev-1007',
    evidenceType: 'voice_note',
    title: 'Site progress summary',
    caption: 'Quick site progress summary: steel prep complete, materials on site, team ready for installation.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    projectStage: 'Structure',
    capturedAt: '2026-08-05T12:05:00Z',
    capturedBy: 'Aisha Khan',
    capturedByInitials: 'AK',
    visibility: 'internal_only',
    reviewStatus: 'awaiting_review',
    duration: '34 seconds',
    transcriptPlaceholder: 'Transcription unavailable — voice service not connected.',
    attachments: [],
    relatedRecords: [],
    tags: ['voice', 'progress', 'summary'],
    versions: [
      { version: 1, createdAt: '2026-08-05T12:05:00Z', createdBy: 'Aisha Khan', changeNote: 'Voice note recorded', previousStatus: 'draft', newStatus: 'awaiting_review' },
    ],
    syncState: 'synced',
    createdAt: '2026-08-05T12:05:00Z',
    updatedAt: '2026-08-05T12:05:00Z',
  },
  {
    id: 'ev-1008',
    evidenceType: 'completion_signoff',
    title: 'Drainage connection completed',
    caption: 'Drainage connection to existing manhole completed. Tested with water — no leaks. Inspection chamber access confirmed.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    projectStage: 'Groundworks',
    capturedAt: '2026-08-01T15:48:00Z',
    capturedBy: 'Aisha Khan',
    capturedByInitials: 'AK',
    visibility: 'client_visible',
    reviewStatus: 'accepted',
    reviewedBy: 'Martin Hewett',
    reviewedAt: '2026-08-01T16:10:00Z',
    attachments: [
      { id: 'att-8', name: 'drainage-complete.jpg', type: 'image/jpeg', size: '1.9 MB', previewUrl: 'https://readdy.ai/api/search-image?query=Completed%20underground%20drainage%20connection%20at%20construction%20site%2C%20freshly%20backfilled%20trench%2C%20inspection%20chamber%20visible%2C%20clean%20professional%20plumbing%20work%2C%20natural%20daylight&width=800&height=600&seq=sl-evidence-08&orientation=landscape' },
    ],
    relatedRecords: [],
    tags: ['drainage', 'completion', 'groundworks', 'sign-off'],
    versions: [
      { version: 1, createdAt: '2026-08-01T15:48:00Z', createdBy: 'Aisha Khan', changeNote: 'Original record', previousStatus: 'draft', newStatus: 'submitted' },
      { version: 1, createdAt: '2026-08-01T16:10:00Z', createdBy: 'Martin Hewett', changeNote: 'Reviewed and accepted', previousStatus: 'submitted', newStatus: 'accepted' },
    ],
    syncState: 'synced',
    createdAt: '2026-08-01T15:48:00Z',
    updatedAt: '2026-08-01T16:10:00Z',
  },
  {
    id: 'ev-1009',
    evidenceType: 'photo',
    title: 'Blockwork rear elevation — progress',
    caption: 'Blockwork to rear elevation reaching full height. DPC installed. Ready for wall plate.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    projectStage: 'Structure',
    capturedAt: '2026-08-03T14:30:00Z',
    capturedBy: 'Martin Hewett',
    capturedByInitials: 'MH',
    visibility: 'client_visible',
    reviewStatus: 'accepted',
    attachments: [
      { id: 'att-9', name: 'blockwork-progress.jpg', type: 'image/jpeg', size: '2.2 MB', previewUrl: 'https://readdy.ai/api/search-image?query=Residential%20extension%20showing%20blockwork%20walls%20at%20full%20height%2C%20DPC%20visible%2C%20scaffolding%20and%20building%20materials%2C%20warm%20afternoon%20light%2C%20professional%20construction%20photography&width=800&height=600&seq=sl-evidence-09&orientation=landscape' },
    ],
    relatedRecords: [],
    tags: ['blockwork', 'structure', 'progress'],
    versions: [
      { version: 1, createdAt: '2026-08-03T14:30:00Z', createdBy: 'Martin Hewett', changeNote: 'Original capture', previousStatus: 'draft', newStatus: 'accepted' },
    ],
    syncState: 'synced',
    createdAt: '2026-08-03T14:30:00Z',
    updatedAt: '2026-08-03T14:30:00Z',
  },
  {
    id: 'ev-1010',
    evidenceType: 'photo',
    title: 'Kitchen layout marked out',
    caption: 'Wall positions and kitchen layout marked on floor slab. Aligns with revised drawings Rev 3.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    projectStage: 'Structure',
    capturedAt: '2026-08-02T10:15:00Z',
    capturedBy: 'James Lawrence',
    capturedByInitials: 'JL',
    visibility: 'internal_only',
    reviewStatus: 'accepted',
    attachments: [
      { id: 'att-10', name: 'kitchen-layout-marked.jpg', type: 'image/jpeg', size: '1.5 MB', previewUrl: 'https://readdy.ai/api/search-image?query=Interior%20of%20construction%20site%20with%20wall%20positions%20marked%20on%20concrete%20floor%20slab%2C%20measuring%20tools%2C%20chalk%20lines%2C%20bright%20natural%20light%2C%20professional%20trades%20environment&width=800&height=600&seq=sl-evidence-10&orientation=landscape' },
    ],
    relatedRecords: [],
    tags: ['layout', 'structure', 'marking'],
    internalNote: 'Checked against latest architect drawings. Consistent with Rev 3 kitchen layout.',
    versions: [
      { version: 1, createdAt: '2026-08-02T10:15:00Z', createdBy: 'James Lawrence', changeNote: 'Original capture', previousStatus: 'draft', newStatus: 'accepted' },
    ],
    syncState: 'synced',
    createdAt: '2026-08-02T10:15:00Z',
    updatedAt: '2026-08-02T10:15:00Z',
  },
  {
    id: 'ev-1011',
    evidenceType: 'material_record',
    title: 'Blockwork materials check',
    caption: '100mm dense concrete blocks delivered. 200 units. Checked against quantity schedule.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    projectStage: 'Structure',
    capturedAt: '2026-08-04T08:30:00Z',
    capturedBy: 'James Lawrence',
    capturedByInitials: 'JL',
    visibility: 'internal_only',
    reviewStatus: 'accepted',
    materialName: 'Dense concrete blocks 100mm',
    materialQuantity: 200,
    materialUnit: 'units',
    materialUnitCost: 1.85,
    materialTotalCost: 370,
    supplier: 'Builders Merchant Ltd',
    purchaseOrderRef: 'PO-1048-015',
    materialWaste: 'Five blocks chipped — set aside for cuts',
    attachments: [],
    relatedRecords: [],
    tags: ['materials', 'blockwork', 'supply'],
    versions: [
      { version: 1, createdAt: '2026-08-04T08:30:00Z', createdBy: 'James Lawrence', changeNote: 'Materials recorded', previousStatus: 'draft', newStatus: 'accepted' },
    ],
    syncState: 'synced',
    createdAt: '2026-08-04T08:30:00Z',
    updatedAt: '2026-08-04T08:30:00Z',
  },
  {
    id: 'ev-1012',
    evidenceType: 'photo',
    title: 'Roof lantern opening formed',
    caption: 'Roof lantern opening cut and trimmed. Dimensions checked against lantern specification.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    projectStage: 'Structure',
    capturedAt: '2026-08-01T11:30:00Z',
    capturedBy: 'Martin Hewett',
    capturedByInitials: 'MH',
    visibility: 'client_visible',
    reviewStatus: 'accepted',
    attachments: [
      { id: 'att-12', name: 'roof-lantern-opening.jpg', type: 'image/jpeg', size: '2.0 MB', previewUrl: 'https://readdy.ai/api/search-image?query=Roof%20lantern%20opening%20in%20flat%20roof%20of%20kitchen%20extension%2C%20trimmed%20and%20prepared%2C%20timber%20framework%20visible%2C%20blue%20sky%20background%2C%20clean%20construction%20site&width=800&height=600&seq=sl-evidence-12&orientation=landscape' },
    ],
    relatedRecords: [],
    tags: ['roof', 'structure', 'lantern'],
    versions: [
      { version: 1, createdAt: '2026-08-01T11:30:00Z', createdBy: 'Martin Hewett', changeNote: 'Original capture', previousStatus: 'draft', newStatus: 'accepted' },
    ],
    syncState: 'synced',
    createdAt: '2026-08-01T11:30:00Z',
    updatedAt: '2026-08-01T11:30:00Z',
  },
];

// ─── Demo Daily Logs ──────────────────────────────────

export const demoDailyLogs: DailySiteLog[] = [
  {
    id: 'log-0805',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    logDate: '2026-08-05',
    status: 'complete',
    supervisor: 'Martin Hewett',
    siteOpenTime: '07:45',
    siteCloseTime: '16:30',
    attendance: [
      { personId: 'worker-1', name: 'Martin Hewett', initials: 'MH', company: 'SiteLedger Demo Construction', role: 'Project Manager', startTime: '07:45', finishTime: '16:30', hours: 8.75, category: 'employee' },
      { personId: 'worker-2', name: 'James Lawrence', initials: 'JL', company: 'SiteLedger Demo Construction', role: 'Carpenter', startTime: '08:00', finishTime: '16:00', hours: 8, category: 'employee' },
      { personId: 'worker-3', name: 'Aisha Khan', initials: 'AK', company: 'AK Groundworks Ltd', role: 'Groundworker', startTime: '08:00', finishTime: '15:30', hours: 7.5, category: 'subcontractor' },
    ],
    totalLabourHours: 24.25,
    weather: 'Sunny with light cloud, 21°C',
    temperature: '21°C',
    siteConditions: 'Dry, good visibility. All areas accessible.',
    welfareStatus: 'Welfare unit checked — water, electrics and heating working.',
    workCompleted: 'Steel beam preparation completed — padstones checked and level. Wall opening cleaned and ready for steel installation. Building Control inspection rescheduled to 5 August (originally 4 Aug — inspector unavailable). Steel delivered 09:18 — checked against specification and delivery note.',
    jobStagesAffected: ['Structure'],
    progressEstimate: 68,
    plantUsed: 'Disc cutter, rotary hammer drill, laser level',
    materialsUsed: 'Padstones, shims, M16 anchor bolts (8 units)',
    deliveries: 'UC 203x203x46 steel beam, base plates, anchor bolts — DN-2842',
    inspections: 'Building Control inspection rescheduled',
    delays: 'Building Control inspection delayed by 1 working day (inspector unavailability)',
    instructions: 'None new today',
    safetyObservations: 'All PPE worn. Safe access maintained. Dust extraction used during cutting.',
    plannedWork: 'Steel beam installation (subject to Building Control inspection). Begin blockwork to gable. Weatherproofing preparation.',
    peopleRequired: 'Martin Hewett, James Lawrence, Aisha Khan',
    materialsRequired: 'Steel beam (delivered), mortar, blocks',
    plantRequired: 'Telehandler for steel lift (booked), mixer',
    decisionsNeeded: 'Client to approve additional socket positions (VAR-004)',
    risks: 'If Building Control inspection not completed, steel installation moves to tomorrow',
    linkedEvidenceIds: ['ev-1001', 'ev-1002', 'ev-1003', 'ev-1005', 'ev-1007'],
    createdAt: '2026-08-05T16:30:00Z',
    createdBy: 'Martin Hewett',
    updatedAt: '2026-08-05T16:30:00Z',
    versions: [{ version: 1, updatedAt: '2026-08-05T16:30:00Z', reason: 'Original log' }],
  },
  {
    id: 'log-0804',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    logDate: '2026-08-04',
    status: 'complete',
    supervisor: 'Martin Hewett',
    siteOpenTime: '07:30',
    siteCloseTime: '17:00',
    attendance: [
      { personId: 'worker-1', name: 'Martin Hewett', initials: 'MH', company: 'SiteLedger Demo Construction', role: 'Project Manager', hours: 9.5, category: 'employee' },
      { personId: 'worker-2', name: 'James Lawrence', initials: 'JL', company: 'SiteLedger Demo Construction', role: 'Carpenter', hours: 8, category: 'employee' },
      { personId: 'worker-3', name: 'Aisha Khan', initials: 'AK', company: 'AK Groundworks Ltd', role: 'Groundworker', hours: 8, category: 'subcontractor' },
      { personId: 'worker-4', name: 'Daniel Hughes', initials: 'DH', company: 'D. Hughes Electrical', role: 'Electrician', hours: 4, category: 'subcontractor' },
    ],
    totalLabourHours: 29.5,
    weather: 'Cloudy with sunny spells, 19°C',
    temperature: '19°C',
    siteConditions: 'Dry, good working conditions.',
    welfareStatus: 'Welfare checked and satisfactory.',
    workCompleted: 'Rear elevation blockwork completed to full height. DPC installed. Wall plate preparation. Daniel Hughes visited to discuss socket repositioning (see instruction). Client meeting on site — kitchen door colour approved (Deep Forest Green). Building Control notified of inspection delay.',
    jobStagesAffected: ['Structure'],
    progressEstimate: 65,
    instructions: 'Daniel Hughes recorded site instruction: Move two kitchen socket positions 300mm left. To be converted to variation.',
    clientDecisions: 'Kitchen door colour approved — Deep Forest Green selected.',
    variationsRequired: 'Additional socket positions — to be priced as variation VAR-004.',
    plannedWork: 'Steel beam preparation. Await Building Control inspection. Continue blockwork.',
    linkedEvidenceIds: ['ev-1004', 'ev-1011'],
    createdAt: '2026-08-04T17:00:00Z',
    createdBy: 'Martin Hewett',
    updatedAt: '2026-08-04T17:00:00Z',
    versions: [{ version: 1, updatedAt: '2026-08-04T17:00:00Z', reason: 'Original log' }],
  },
  {
    id: 'log-0803',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    logDate: '2026-08-03',
    status: 'complete',
    supervisor: 'Martin Hewett',
    attendance: [
      { personId: 'worker-1', name: 'Martin Hewett', initials: 'MH', company: 'SiteLedger Demo Construction', role: 'Project Manager', hours: 9, category: 'employee' },
      { personId: 'worker-2', name: 'James Lawrence', initials: 'JL', company: 'SiteLedger Demo Construction', role: 'Carpenter', hours: 8, category: 'employee' },
      { personId: 'worker-3', name: 'Aisha Khan', initials: 'AK', company: 'AK Groundworks Ltd', role: 'Groundworker', hours: 8, category: 'subcontractor' },
    ],
    totalLabourHours: 25,
    weather: 'Overcast, 17°C. Light drizzle in the afternoon.',
    workCompleted: 'Blockwork to rear elevation continued — 6 courses completed. Kitchen layout marked out on floor slab. Floor insulation material check completed.',
    jobStagesAffected: ['Structure'],
    progressEstimate: 60,
    linkedEvidenceIds: ['ev-1009'],
    createdAt: '2026-08-03T17:00:00Z',
    createdBy: 'Martin Hewett',
    updatedAt: '2026-08-03T17:00:00Z',
    versions: [{ version: 1, updatedAt: '2026-08-03T17:00:00Z', reason: 'Original log' }],
  },
];

// ─── Demo Timeline Events ─────────────────────────────

export const demoTimelineEvents: TimelineEvent[] = [
  {
    id: 'tle-001',
    timestamp: '2026-06-01T09:00:00Z',
    eventCategory: 'milestone',
    eventType: 'Job created',
    title: 'Job created',
    actor: 'Martin Hewett',
    actorInitials: 'MH',
    summary: 'Oakfield kitchen extension job created. Contract value £42,500.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'internal_only',
    relatedEvents: [],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0601-001',
  },
  {
    id: 'tle-002',
    timestamp: '2026-06-14T14:00:00Z',
    eventCategory: 'milestone',
    eventType: 'Quote accepted',
    title: 'Quote accepted',
    actor: 'Sarah Miller',
    actorInitials: 'SM',
    summary: 'Client accepted fixed-price quote for kitchen extension. Contract signed.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'internal_only',
    relatedEvents: [],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0614-001',
  },
  {
    id: 'tle-003',
    timestamp: '2026-06-15T08:00:00Z',
    eventCategory: 'milestone',
    eventType: 'Team assigned',
    title: 'Team assigned',
    actor: 'Martin Hewett',
    actorInitials: 'MH',
    summary: 'Martin Hewett (PM), James Lawrence (carpenter), Aisha Khan (groundworks) assigned to project.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'internal_only',
    relatedEvents: [],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0615-001',
  },
  {
    id: 'tle-004',
    timestamp: '2026-06-15T08:00:00Z',
    eventCategory: 'progress',
    eventType: 'Pre-start',
    title: 'Pre-start completed',
    actor: 'Martin Hewett',
    actorInitials: 'MH',
    summary: 'Design, estimating, and contract preparation completed. Site set-up scheduled.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'internal_only',
    relatedEvents: [],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0615-002',
  },
  {
    id: 'tle-005',
    timestamp: '2026-06-28T16:00:00Z',
    eventCategory: 'progress',
    eventType: 'Groundworks',
    title: 'Groundworks completed',
    actor: 'Aisha Khan',
    actorInitials: 'AK',
    summary: 'Foundations, drainage, and ground floor slab completed. Ready for structure phase.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'client_visible',
    relatedEvents: [],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0628-001',
  },
  {
    id: 'tle-006',
    timestamp: '2026-07-10T09:00:00Z',
    eventCategory: 'variation',
    eventType: 'Variation created',
    title: 'Variation created — VAR-001',
    actor: 'Martin Hewett',
    actorInitials: 'MH',
    summary: 'Underfloor heating manifold upgrade variation created (£816 total).',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'internal_only',
    relatedEvents: ['tle-007', 'tle-008'],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0710-001',
  },
  {
    id: 'tle-007',
    timestamp: '2026-07-12T14:00:00Z',
    eventCategory: 'variation',
    eventType: 'Variation approved',
    title: 'Variation approved — VAR-001',
    actor: 'Sarah Miller',
    actorInitials: 'SM',
    summary: 'Client approved underfloor heating manifold upgrade. £816 including VAT.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'client_visible',
    relatedEvents: ['tle-006'],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0712-001',
  },
  {
    id: 'tle-008',
    timestamp: '2026-07-30T10:15:00Z',
    eventCategory: 'inspection',
    eventType: 'Inspection',
    title: 'Building Control inspection — foundations',
    actor: 'Martin Hewett',
    actorInitials: 'MH',
    summary: 'Foundation depth inspection passed. Reference: BC-1048-02.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'client_visible',
    relatedEvents: [],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0730-001',
    evidenceType: 'inspection',
  },
  {
    id: 'tle-009',
    timestamp: '2026-08-01T11:30:00Z',
    eventCategory: 'photo',
    eventType: 'Photo',
    title: 'Roof lantern opening formed',
    actor: 'Martin Hewett',
    actorInitials: 'MH',
    summary: 'Roof lantern opening cut and trimmed. Dimensions checked.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'client_visible',
    relatedEvents: [],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0801-001',
    evidenceType: 'photo',
  },
  {
    id: 'tle-010',
    timestamp: '2026-08-01T15:48:00Z',
    eventCategory: 'completion',
    eventType: 'Sign-off',
    title: 'Drainage connection completed',
    actor: 'Aisha Khan',
    actorInitials: 'AK',
    summary: 'Drainage connection to existing manhole completed, tested and signed off.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'client_visible',
    relatedEvents: [],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0801-002',
    evidenceType: 'completion_signoff',
  },
  {
    id: 'tle-011',
    timestamp: '2026-08-03T10:00:00Z',
    eventCategory: 'variation',
    eventType: 'Variation created',
    title: 'Variation created — VAR-004',
    actor: 'Martin Hewett',
    actorInitials: 'MH',
    summary: 'Additional kitchen sockets variation created from site instruction. £1,536 including VAT.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'internal_only',
    relatedEvents: ['tle-012', 'tle-013'],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0803-001',
  },
  {
    id: 'tle-012',
    timestamp: '2026-08-03T14:30:00Z',
    eventCategory: 'photo',
    eventType: 'Photo',
    title: 'Blockwork rear elevation progress',
    actor: 'Martin Hewett',
    actorInitials: 'MH',
    summary: 'Blockwork reaching full height. DPC installed. Ready for wall plate.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'client_visible',
    relatedEvents: [],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0803-002',
    evidenceType: 'photo',
  },
  {
    id: 'tle-013',
    timestamp: '2026-08-03T10:15:00Z',
    eventCategory: 'decision',
    eventType: 'Decision',
    title: 'Variation 004 sent to client',
    actor: 'Martin Hewett',
    actorInitials: 'MH',
    summary: 'Variation 004 (additional kitchen sockets) sent to Sarah & Ben Miller for approval.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'client_visible',
    relatedEvents: ['tle-011', 'tle-014'],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0803-003',
  },
  {
    id: 'tle-014',
    timestamp: '2026-08-04T09:00:00Z',
    eventCategory: 'decision',
    eventType: 'Decision',
    title: 'Variation 004 viewed by client',
    actor: 'Sarah Miller',
    actorInitials: 'SM',
    summary: 'Sarah Miller viewed Variation 004 in client portal. Awaiting decision.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'internal_only',
    relatedEvents: ['tle-013'],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0804-001',
  },
  {
    id: 'tle-015',
    timestamp: '2026-08-04T11:00:00Z',
    eventCategory: 'decision',
    eventType: 'Decision',
    title: 'Kitchen door colour approved',
    actor: 'Sarah Miller',
    actorInitials: 'SM',
    summary: 'Client approved Deep Forest Green for bi-fold doors.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'client_visible',
    relatedEvents: [],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0804-002',
  },
  {
    id: 'tle-016',
    timestamp: '2026-08-04T11:06:00Z',
    eventCategory: 'delay',
    eventType: 'Delay',
    title: 'Building Control inspection delayed',
    actor: 'Martin Hewett',
    actorInitials: 'MH',
    summary: 'Building Control inspection moved from 4 Aug to 5 Aug. Inspector unavailability. 1 working day delay.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'client_visible',
    relatedEvents: [],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0804-003',
    evidenceType: 'delay',
  },
  {
    id: 'tle-017',
    timestamp: '2026-08-04T14:20:00Z',
    eventCategory: 'instruction',
    eventType: 'Site instruction',
    title: 'Site instruction — socket positions',
    actor: 'Daniel Hughes',
    actorInitials: 'DH',
    summary: 'Client requested two socket positions be moved. Recorded and linked to VAR-004.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'internal_only',
    relatedEvents: ['tle-011'],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0804-004',
    evidenceType: 'site_instruction',
  },
  {
    id: 'tle-018',
    timestamp: '2026-08-05T08:42:00Z',
    eventCategory: 'photo',
    eventType: 'Photo',
    title: 'Steel bearing preparation',
    actor: 'Martin Hewett',
    actorInitials: 'MH',
    summary: 'Wall opening prepared for steel beam. Padstones checked and level.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'client_visible',
    relatedEvents: [],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0805-001',
    evidenceType: 'photo',
  },
  {
    id: 'tle-019',
    timestamp: '2026-08-05T08:45:00Z',
    eventCategory: 'photo',
    eventType: 'Photo',
    title: 'Wall opening before steel installation',
    actor: 'James Lawrence',
    actorInitials: 'JL',
    summary: 'Original wall opening documented before steel installation. No cracks detected.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'internal_only',
    relatedEvents: [],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0805-002',
    evidenceType: 'photo',
  },
  {
    id: 'tle-020',
    timestamp: '2026-08-05T09:18:00Z',
    eventCategory: 'delivery',
    eventType: 'Delivery',
    title: 'Steel beam delivered',
    actor: 'Martin Hewett',
    actorInitials: 'MH',
    summary: 'UC 203x203x46 steel beam delivered. DN-2842. Condition: good.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'internal_only',
    relatedEvents: [],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0805-003',
    evidenceType: 'delivery',
  },
  {
    id: 'tle-021',
    timestamp: '2026-08-05T09:20:00Z',
    eventCategory: 'update',
    eventType: 'Progress update',
    title: 'Progress update published',
    actor: 'Martin Hewett',
    actorInitials: 'MH',
    summary: 'Steelwork preparation completed. Steel installation scheduled for today.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'client_visible',
    relatedEvents: [],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0805-004',
  },
  {
    id: 'tle-022',
    timestamp: '2026-08-05T12:05:00Z',
    eventCategory: 'voice_note',
    eventType: 'Voice note',
    title: 'Site progress summary',
    actor: 'Aisha Khan',
    actorInitials: 'AK',
    summary: 'Voice note: steel prep complete, materials on site, team ready for installation.',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    visibility: 'internal_only',
    relatedEvents: [],
    attachments: [],
    version: 1,
    auditRef: 'AUD-2026-0805-005',
    evidenceType: 'voice_note',
  },
];

// ─── Demo Evidence Pack ───────────────────────────────

export const demoEvidencePacks: EvidencePack[] = [
  {
    id: 'pack-001',
    jobId: 'sl-1048',
    jobRef: 'SL-1048',
    jobName: 'Oakfield kitchen extension',
    packType: 'progress_update',
    title: 'August progress update — Structure phase',
    dateFrom: '2026-08-01',
    dateTo: '2026-08-05',
    selectedEvidenceIds: ['ev-1001', 'ev-1003', 'ev-1005', 'ev-1006', 'ev-1008', 'ev-1009', 'ev-1012'],
    sections: ['cover', 'job_details', 'timeline', 'photos', 'daily_logs', 'inspections', 'delays', 'variations'],
    format: 'client_safe',
    createdAt: '2026-08-05T14:00:00Z',
  },
];

// ─── Offline Queue Items ──────────────────────────────

export const demoOfflineQueue: OfflineQueueItem[] = [
  {
    id: 'off-001',
    evidenceType: 'photo',
    title: 'Steel beam positioned',
    caption: 'Beam lifted into position at 13:30.',
    jobId: 'sl-1048',
    capturedAt: '2026-08-05T13:35:00Z',
    capturedBy: 'Martin Hewett',
    syncState: 'waiting_to_sync',
    localData: {},
  },
  {
    id: 'off-002',
    evidenceType: 'written_note',
    title: 'Mortar mix ratio check',
    caption: 'Mortar mix checked against specification. Ratio 4:1 correct.',
    jobId: 'sl-1048',
    capturedAt: '2026-08-05T14:10:00Z',
    capturedBy: 'James Lawrence',
    syncState: 'waiting_to_sync',
    localData: {},
  },
];

// ─── Service / Repository Helpers ─────────────────────

export function getAllEvidence(): EvidenceRecord[] {
  return demoEvidence;
}

export function getEvidenceById(id: string): EvidenceRecord | undefined {
  return demoEvidence.find((e) => e.id === id);
}

export function getEvidenceByJob(jobId: string): EvidenceRecord[] {
  return demoEvidence.filter((e) => e.jobId === jobId);
}

export function getEvidenceByType(type: EvidenceType): EvidenceRecord[] {
  return demoEvidence.filter((e) => e.evidenceType === type);
}

export function getClientVisibleEvidence(jobId?: string): EvidenceRecord[] {
  const visible = demoEvidence.filter((e) => e.visibility === 'client_visible');
  if (jobId) return visible.filter((e) => e.jobId === jobId);
  return visible;
}

export function getDailyLogsByJob(jobId: string): DailySiteLog[] {
  return demoDailyLogs.filter((l) => l.jobId === jobId);
}

export function getDailyLogById(id: string): DailySiteLog | undefined {
  return demoDailyLogs.find((l) => l.id === id);
}

export function getTimelineEventsByJob(jobId: string): TimelineEvent[] {
  return demoTimelineEvents.filter((e) => e.jobId === jobId);
}

export function getEvidencePacksByJob(jobId: string): EvidencePack[] {
  return demoEvidencePacks.filter((p) => p.jobId === jobId);
}

export function getOfflineQueue(): OfflineQueueItem[] {
  return demoOfflineQueue;
}

// ─── Label / Color Helpers ────────────────────────────

export function getEvidenceTypeLabel(type: EvidenceType): string {
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

export function getEvidenceTypeIcon(type: EvidenceType): string {
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

export function getReviewStatusLabel(status: EvidenceReviewStatus): string {
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

export function getReviewStatusColor(status: EvidenceReviewStatus): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-300 text-gray-700',
    submitted: 'bg-status-blue text-white',
    awaiting_review: 'bg-status-amber text-white',
    accepted: 'bg-status-green text-white',
    correction_requested: 'bg-status-amber text-white',
    rejected: 'bg-status-red text-white',
    archived: 'bg-gray-400 text-white',
  };
  return colors[status] || 'bg-gray-300 text-gray-700';
}

export function getVisibilityLabel(visibility: EvidenceVisibility): string {
  const labels: Record<string, string> = {
    internal_only: 'Internal only',
    client_visible: 'Client visible',
    shared_with_selected: 'Shared with selected',
  };
  return labels[visibility] || visibility;
}

export function getVisibilityColor(visibility: EvidenceVisibility): string {
  const colors: Record<string, string> = {
    internal_only: 'bg-gray-200 text-gray-600',
    client_visible: 'bg-primary-50 text-primary-700',
    shared_with_selected: 'bg-status-blue-pale text-status-blue',
  };
  return colors[visibility] || 'bg-gray-200 text-gray-600';
}

export function getSyncStateLabel(state: SyncState): string {
  const labels: Record<string, string> = {
    saved_on_device: 'Saved on device',
    waiting_to_sync: 'Waiting to sync',
    syncing: 'Syncing',
    synced: 'Synced',
    sync_failed: 'Sync failed',
    conflict_requires_review: 'Conflict requires review',
  };
  return labels[state] || state;
}

export function getSyncStateColor(state: SyncState): string {
  const colors: Record<string, string> = {
    saved_on_device: 'bg-gray-200 text-gray-600',
    waiting_to_sync: 'bg-status-amber-pale text-status-amber',
    syncing: 'bg-status-blue-pale text-status-blue',
    synced: 'bg-primary-50 text-primary-700',
    sync_failed: 'bg-status-red-pale text-status-red',
    conflict_requires_review: 'bg-status-red-pale text-status-red',
  };
  return colors[state] || 'bg-gray-200 text-gray-600';
}

export function getDelayCategoryLabel(cat: DelayCategory): string {
  const labels: Record<string, string> = {
    weather: 'Weather',
    client_decision: 'Client decision',
    design_information: 'Design information',
    access: 'Access',
    labour: 'Labour',
    materials: 'Materials',
    plant: 'Plant',
    inspection: 'Inspection',
    utility: 'Utility',
    third_party: 'Third party',
    unforeseen_condition: 'Unforeseen condition',
    safety: 'Safety',
    other: 'Other',
  };
  return labels[cat] || cat;
}

export function getDelayStatusLabel(status: DelayStatus): string {
  const labels: Record<string, string> = {
    open: 'Open',
    monitoring: 'Monitoring',
    resolved: 'Resolved',
    linked_to_variation: 'Linked to variation',
    superseded: 'Superseded',
  };
  return labels[status] || status;
}

export function getDailyLogStatusLabel(status: DailyLogStatus): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    complete: 'Complete',
    corrected: 'Corrected',
    client_summary_published: 'Client summary published',
    locked: 'Locked',
    archived: 'Archived',
  };
  return labels[status] || status;
}

export function getDailyLogStatusColor(status: DailyLogStatus): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-300 text-gray-700',
    complete: 'bg-status-green text-white',
    corrected: 'bg-status-amber text-white',
    client_summary_published: 'bg-primary-50 text-primary-700',
    locked: 'bg-gray-400 text-white',
    archived: 'bg-gray-400 text-white',
  };
  return colors[status] || 'bg-gray-300 text-gray-700';
}

export function getEventCategoryLabel(cat: string): string {
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
  return labels[cat] || cat;
}

export function getEventCategoryColor(cat: string): string {
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
    document: 'bg-gray-400',
    update: 'bg-status-blue',
  };
  return colors[cat] || 'bg-gray-400';
}

// Evidence types for filters
export const evidenceTypes: EvidenceType[] = [
  'photo', 'video', 'voice_note', 'written_note', 'site_instruction',
  'labour_record', 'material_record', 'delivery', 'delay', 'inspection',
  'test_result', 'drawing_markup', 'client_decision', 'variation_evidence',
  'safety_observation', 'damage_record', 'completion_signoff', 'other',
];

// Quick filters for evidence workspace
export const evidenceQuickFilters = [
  { id: 'all', label: 'All evidence' },
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This week' },
  { id: 'photos', label: 'Photos' },
  { id: 'instructions', label: 'Instructions' },
  { id: 'delays', label: 'Delays' },
  { id: 'inspections', label: 'Inspections' },
  { id: 'client_visible', label: 'Client visible' },
  { id: 'needs_review', label: 'Needs review' },
  { id: 'offline_queue', label: 'Offline queue' },
];

// Delay categories
export const delayCategories: DelayCategory[] = [
  'weather', 'client_decision', 'design_information', 'access', 'labour',
  'materials', 'plant', 'inspection', 'utility', 'third_party',
  'unforeseen_condition', 'safety', 'other',
];

// Instruction sources
export const instructionSources = ['Client', 'Main contractor', 'Designer', 'Project manager', 'Site supervisor', 'Building Control', 'Other'];

// Evidence pack types
export const evidencePackTypes: EvidencePackType[] = [
  'progress_update', 'stage_completion', 'variation_support',
  'payment_support', 'inspection_record', 'handover_evidence', 'custom',
];

// Evidence pack sections
export const evidencePackSections = [
  { id: 'cover', label: 'Cover summary' },
  { id: 'job_details', label: 'Job details' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'photos', label: 'Photos' },
  { id: 'daily_logs', label: 'Daily logs' },
  { id: 'labour', label: 'Labour summary' },
  { id: 'materials', label: 'Materials & deliveries' },
  { id: 'instructions', label: 'Instructions' },
  { id: 'delays', label: 'Delays' },
  { id: 'inspections', label: 'Inspections' },
  { id: 'variations', label: 'Variations' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'documents', label: 'Documents' },
  { id: 'audit', label: 'Audit references' },
];

// Job stages for evidence
export const evidenceJobStages = ['Pre-start', 'Groundworks', 'Structure', 'First fix', 'Second fix', 'Finishing', 'Handover'];