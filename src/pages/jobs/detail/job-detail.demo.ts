import { demoFullJobs, type FullJob } from '@/mocks/jobs';
import { getEvidenceByJob, getTimelineEventsByJob, type EvidenceRecord, type TimelineEvent } from '@/mocks/evidence';
import { getVariationsByJob, getDecisionsByProject, type VariationRecord } from '@/mocks/clients';
import { demoContractTerms } from '@/mocks/contracts';
import type { EvidenceJobItem } from '@/services/evidence.service';
import type { TimelineJobItem } from '@/services/timeline.service';
import type { DocumentView, JobDetailData, VariationView } from './job-detail.types';

function parseSizeToBytes(size: string): number {
  const match = /([\d.]+)\s*(KB|MB|GB|B)/i.exec(size || '');
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2].toUpperCase();
  const factor = unit === 'GB' ? 1_073_741_824 : unit === 'MB' ? 1_048_576 : unit === 'KB' ? 1024 : 1;
  return Math.round(value * factor);
}

function mapDemoEvidence(ev: EvidenceRecord): EvidenceJobItem {
  return {
    id: ev.id,
    jobId: ev.jobId,
    jobRef: ev.jobRef,
    jobName: ev.jobName,
    evidenceType: ev.evidenceType,
    caption: ev.caption,
    projectStage: ev.projectStage,
    capturedAt: ev.capturedAt,
    capturedBy: ev.capturedBy,
    visibility: ev.visibility,
    reviewStatus: ev.reviewStatus,
    locationLabel: ev.locationLabel || '',
    internalNote: ev.internalNote || '',
    previewUrl: ev.attachments.find((a) => a.previewUrl)?.previewUrl ?? null,
  };
}

function mapDemoTimeline(ev: TimelineEvent): TimelineJobItem {
  return {
    id: ev.id,
    eventType: ev.eventType,
    eventCategory: ev.eventCategory,
    title: ev.title,
    summary: ev.summary,
    visibility: ev.visibility,
    eventDate: ev.timestamp,
    relatedRecordType: null,
    actor: ev.actor,
    actorInitials: ev.actorInitials,
    auditRef: ev.auditRef,
  };
}

function mapDemoVariation(v: VariationRecord): VariationView {
  return {
    id: v.id,
    reference: v.reference,
    title: v.title,
    status: v.status,
    totalPence: Math.round(v.latestTotalPrice * 100),
    programmeDays: v.programmeImpactDays ?? null,
    approvalDeadline: v.approvalDeadline ?? null,
    updatedAt: v.updatedAt,
  };
}

/**
 * Builds the job-detail view-model for the built-in demo jobs only.
 * Real backend jobs never use this path, so sample content can never
 * leak into a real job record.
 */
export function buildDemoJobDetail(jobId: string): { job: FullJob; data: JobDetailData } | null {
  const job = demoFullJobs.find((j) => j.id === jobId);
  if (!job) return null;

  const documents: DocumentView[] = (job.documents || []).map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    mimeType: d.type,
    sizeBytes: parseSizeToBytes(d.size),
    version: 1,
  }));

  const decisions = getDecisionsByProject(jobId).map((d) => ({
    id: d.id,
    question: d.question,
    status: d.status,
    detail: d.selectedOption
      ? `Selected: ${d.selectedOption}`
      : d.dueDate
        ? `Due ${new Date(d.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
        : '',
  }));

  const data: JobDetailData = {
    evidence: getEvidenceByJob(jobId).map(mapDemoEvidence),
    timeline: getTimelineEventsByJob(jobId).map(mapDemoTimeline),
    variations: getVariationsByJob(jobId).map(mapDemoVariation),
    documents,
    contractTerms: job.documents?.some((d) => d.category === 'Contract')
      ? demoContractTerms.map((term) => ({
          id: term.field_name,
          fileName: job.documents?.find((d) => d.category === 'Contract')?.name ?? 'Contract',
          fieldName: term.field_name,
          fieldLabel: term.field_label,
          value: term.extracted_value,
          confidence: term.confidence_score,
          confirmed: false,
        }))
      : [],
    decisions,
    decisionsAvailable: true,
    financialsAvailable: true,
    panelErrors: {},
  };

  return { job, data };
}