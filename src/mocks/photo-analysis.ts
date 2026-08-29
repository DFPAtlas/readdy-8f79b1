// Phase 22: AI Site Photo Analysis — types, demo data and checklist helpers.

export type PhotoAnalysisType = 'hazard' | 'quality' | 'defect';
export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface PhotoFinding {
  label: string;
  severity: FindingSeverity;
  description: string;
  boundingBox?: { x: number; y: number; width: number; height: number } | null;
}

export interface PhotoAnalysis {
  id: string;
  evidenceRecordId: string;
  analysisType: PhotoAnalysisType;
  findings: PhotoFinding[];
  analyzedAt: string;
  reviewedByHuman: boolean;
  dismissed: boolean;
}

// ─── Demo analyses (pre-seeded results for a few records) ─────────────

export const demoPhotoAnalyses: PhotoAnalysis[] = [
  {
    id: 'pa-001',
    evidenceRecordId: 'ev-1002',
    analysisType: 'hazard',
    findings: [
      {
        label: 'Temporary propping',
        severity: 'high',
        description: 'No temporary propping or support visible beneath the wall opening prior to steel beam installation.',
        boundingBox: { x: 22, y: 34, width: 56, height: 40 },
      },
      {
        label: 'Dust control',
        severity: 'low',
        description: 'Light dust present around the cutting area; extraction not visible in frame.',
        boundingBox: null,
      },
    ],
    analyzedAt: '2026-08-05T08:46:00Z',
    reviewedByHuman: false,
    dismissed: false,
  },
  {
    id: 'pa-002',
    evidenceRecordId: 'ev-1009',
    analysisType: 'quality',
    findings: [
      {
        label: 'Mortar joint consistency',
        severity: 'low',
        description: 'Perpend joints slightly uneven on the upper two courses — check gauge and joint tooling.',
        boundingBox: { x: 40, y: 20, width: 45, height: 30 },
      },
    ],
    analyzedAt: '2026-08-03T14:31:00Z',
    reviewedByHuman: true,
    dismissed: false,
  },
  {
    id: 'pa-003',
    evidenceRecordId: 'ev-1012',
    analysisType: 'hazard',
    findings: [
      {
        label: 'Falls from height',
        severity: 'high',
        description: 'Open roof opening with no visible edge protection or fall restraint in frame.',
        boundingBox: { x: 20, y: 10, width: 60, height: 45 },
      },
      {
        label: 'Falling objects',
        severity: 'medium',
        description: 'Tools and offcuts near the opening edge could fall to the level below.',
        boundingBox: null,
      },
    ],
    analyzedAt: '2026-08-01T11:31:00Z',
    reviewedByHuman: false,
    dismissed: false,
  },
  {
    id: 'pa-004',
    evidenceRecordId: 'ev-1010',
    analysisType: 'quality',
    findings: [
      {
        label: 'Setting out accuracy',
        severity: 'medium',
        description: 'Marked wall positions should be re-verified against Rev 3 before first fix begins.',
        boundingBox: { x: 10, y: 50, width: 70, height: 35 },
      },
    ],
    analyzedAt: '2026-08-02T10:16:00Z',
    reviewedByHuman: false,
    dismissed: true,
  },
];

// ─── Deterministic checklist (mirrors the photo-analysis edge function) ─

interface ChecklistRule {
  type: PhotoAnalysisType;
  pattern: RegExp;
  finding: PhotoFinding;
}

const CHECKLIST_RULES: ChecklistRule[] = [
  // Hazard rules
  { type: 'hazard', pattern: /(opening|open roof|roof|edge|height)/, finding: { label: 'Falls from height', severity: 'high', description: 'Potential open edge or fall risk detected. Verify edge protection and fall restraint.', boundingBox: null } },
  { type: 'hazard', pattern: /(steel|beam|prop|propping|support)/, finding: { label: 'Temporary support', severity: 'medium', description: 'Check temporary propping or support arrangements are adequate before work proceeds.', boundingBox: null } },
  { type: 'hazard', pattern: /(dust|cut|cutting|disc|saw)/, finding: { label: 'Dust control', severity: 'low', description: 'Dust-generating activity visible; confirm extraction or RPE is in use.', boundingBox: null } },
  { type: 'hazard', pattern: /(electric|socket|cable|live|wiring)/, finding: { label: 'Electrical safety', severity: 'high', description: 'Electrical work visible; verify isolation and competent-person control.', boundingBox: null } },
  { type: 'hazard', pattern: /(excavat|trench|foundation|footing)/, finding: { label: 'Excavation safety', severity: 'medium', description: 'Excavation or foundation work visible; confirm edge protection and safe access.', boundingBox: null } },
  { type: 'hazard', pattern: /(ladder|scaffold|platform|working at height)/, finding: { label: 'Working at height', severity: 'medium', description: 'Check access equipment is inspected and used correctly.', boundingBox: null } },
  // Quality rules
  { type: 'quality', pattern: /(blockwork|mortar|joint|pointing|brick)/, finding: { label: 'Joint consistency', severity: 'low', description: 'Check mortar joint thickness and tooling for consistency.', boundingBox: null } },
  { type: 'quality', pattern: /(level|plumb|padstone|bearing|bedded)/, finding: { label: 'Levelling & bearing', severity: 'low', description: 'Verify padstones and bearings are level and correctly bedded.', boundingBox: null } },
  { type: 'quality', pattern: /(mark|layout|setting out|chalk|position)/, finding: { label: 'Setting out accuracy', severity: 'medium', description: 'Re-check marked positions against the latest drawing revision before work.', boundingBox: null } },
  { type: 'quality', pattern: /(dpc|membrane|dpm|insulation)/, finding: { label: 'DPC / membrane', severity: 'low', description: 'Confirm DPC and membrane laps and positioning are correct.', boundingBox: null } },
  // Defect rules
  { type: 'defect', pattern: /(crack|movement|damp|leak|defect|damage|chip)/, finding: { label: 'Defect', severity: 'high', description: 'Potential defect or damage visible; record and investigate.', boundingBox: null } },
];

export function runPhotoChecklist(
  caption: string,
  evidenceType: string,
  analysisType: PhotoAnalysisType = 'hazard',
): PhotoFinding[] {
  const text = `${caption} ${evidenceType}`.toLowerCase();
  return CHECKLIST_RULES
    .filter((r) => r.type === analysisType && r.pattern.test(text))
    .map((r) => r.finding);
}

// ─── Lookup helpers ───────────────────────────────────────────────────

export function getPhotoAnalysesForRecord(evidenceRecordId: string): PhotoAnalysis[] {
  return demoPhotoAnalyses.filter((a) => a.evidenceRecordId === evidenceRecordId);
}

export function getActiveFindingsForRecord(evidenceRecordId: string): PhotoFinding[] {
  return demoPhotoAnalyses
    .filter((a) => a.evidenceRecordId === evidenceRecordId && !a.dismissed)
    .flatMap((a) => a.findings);
}

export function hasAIFindings(evidenceRecordId: string): boolean {
  return getActiveFindingsForRecord(evidenceRecordId).length > 0;
}

export function hasHighSeverityFindings(evidenceRecordId: string): boolean {
  return getActiveFindingsForRecord(evidenceRecordId).some(
    (f) => f.severity === 'high' || f.severity === 'critical',
  );
}

// ─── Label / color helpers ────────────────────────────────────────────

export function getAnalysisTypeLabel(type: PhotoAnalysisType): string {
  const labels: Record<PhotoAnalysisType, string> = {
    hazard: 'Hazard',
    quality: 'Quality',
    defect: 'Defect',
  };
  return labels[type];
}

export function getAnalysisTypeColor(type: PhotoAnalysisType): string {
  const colors: Record<PhotoAnalysisType, string> = {
    hazard: 'bg-status-amber-pale text-status-amber',
    quality: 'bg-status-blue-pale text-status-blue',
    defect: 'bg-status-red-pale text-status-red',
  };
  return colors[type];
}

export function getFindingSeverityColor(severity: FindingSeverity): string {
  const colors: Record<FindingSeverity, string> = {
    low: 'bg-status-green text-white',
    medium: 'bg-status-amber text-white',
    high: 'bg-status-red text-white',
    critical: 'bg-status-red text-white',
  };
  return colors[severity];
}