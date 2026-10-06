import type { FullJob } from '@/mocks/jobs';
import type { EvidenceJobItem } from '@/services/evidence.service';
import type { TimelineJobItem } from '@/services/timeline.service';
import type { ContractTermItem } from '@/services/documents.service';

export interface VariationView {
  id: string;
  reference: string;
  title: string;
  status: string;
  totalPence: number;
  programmeDays: number | null;
  approvalDeadline: string | null;
  updatedAt: string;
}

export interface DocumentView {
  id: string;
  name: string;
  category: string;
  mimeType: string;
  sizeBytes: number;
  version: number;
}

export interface DecisionView {
  id: string;
  question: string;
  status: string;
  detail: string;
}

export type PanelKey = 'evidence' | 'timeline' | 'variations' | 'documents' | 'financials' | 'team';

export type PanelErrors = Partial<Record<PanelKey, boolean>>;

export interface JobDetailData {
  evidence: EvidenceJobItem[];
  timeline: TimelineJobItem[];
  variations: VariationView[];
  documents: DocumentView[];
  contractTerms: ContractTermItem[];
  decisions: DecisionView[];
  decisionsAvailable: boolean;
  financialsAvailable: boolean;
  panelErrors: PanelErrors;
}

export type JobDetailStatus = 'loading' | 'ready' | 'notfound' | 'error' | 'no-org';

export interface JobDetailState {
  status: JobDetailStatus;
  job: FullJob | null;
  data: JobDetailData | null;
  isDemo: boolean;
  error: string | null;
}

export const emptyJobDetailData = (): JobDetailData => ({
  evidence: [],
  timeline: [],
  variations: [],
  documents: [],
  contractTerms: [],
  decisions: [],
  decisionsAvailable: false,
  financialsAvailable: false,
  panelErrors: {},
});