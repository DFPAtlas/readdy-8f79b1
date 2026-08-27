// SiteLedger Assist — AI service layer
// Handles conversations, chat, settings, usage, feedback

import { getSupabase } from '@/lib/supabase';

const ASSIST_FUNCTION_URL = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/site-ledger-assist`;
const INGESTION_FUNCTION_URL = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/document-ingestion`;

interface AssistChatRequest {
  organisationId: string;
  conversationId?: number;
  message: string;
  scopeType?: string;
  scopeId?: string;
  scopeLabel?: string;
  templateKey?: string;
}

interface AssistChatResponse {
  content: string;
  messageId?: number;
  runId?: number;
  conversationId?: number;
  sources?: AssistSource[];
  usage?: { inputTokens: number; outputTokens: number; costPence: number };
  isAiAssisted?: boolean;
  isEmergency?: boolean;
  safetyBlocked?: boolean;
  failed?: boolean;
  error?: string;
  code?: string;
}

interface AssistSource {
  index: number;
  source_type: string;
  source_id: string;
  label: string;
  date?: string;
}

interface AssistConversation {
  id: number;
  title: string;
  scope_type: string;
  scope_label: string;
  status: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
  total_cost_pence: number;
}

interface AssistMessage {
  id: number;
  role: string;
  content: string;
  sources?: any;
  citations?: any;
  is_ai_assisted: boolean;
  needs_review: boolean;
  created_at: string;
  run_id?: number;
  cost_pence: number;
}

interface AssistSettings {
  settings: any;
  budget: any;
  usage: { monthCostPence: number; monthLimitPence: number };
  isAdmin: boolean;
}

interface AssistUsageSummary {
  totalCostPence: number;
  totalRuns: number;
  avgRating: number | null;
  feedbackCount: number;
  recentUsage: any[];
  recentFeedback: any[];
}

export interface IngestionJob {
  id: number;
  organisation_id: string;
  user_id: string;
  job_id?: string | null;
  document_name: string;
  document_type: string;
  storage_path: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  page_count: number | null;
  language: string | null;
  checksum: string | null;
  ocr_provider: string | null;
  ocr_version: string | null;
  status: string;
  error_message: string | null;
  excluded_by: string | null;
  excluded_at: string | null;
  access_class: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  extractions?: ExtractionSummary[];
}

export interface ExtractionSummary {
  id: number;
  template_name: string;
  status: string;
}

export interface IngestionJobDetail extends IngestionJob {
  signedUrl: string | null;
  extractions: ExtractionDetail[];
}

export interface ExtractionDetail {
  id: number;
  template_name: string;
  template_version: number | null;
  raw_text: string | null;
  extracted_json: Record<string, any> | null;
  confirmed_json: Record<string, any> | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  fields: ExtractedField[];
}

export interface ExtractedField {
  id: number;
  extraction_id: number;
  field_name: string;
  field_label: string | null;
  extracted_value: string | null;
  confidence: string;
  source_highlight: string | null;
  is_confirmed: boolean;
  edited_value: string | null;
  is_safety_critical: boolean;
  is_financial: boolean;
  created_at: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not connected');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export const assistService = {
  async chat(request: AssistChatRequest): Promise<AssistChatResponse> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${ASSIST_FUNCTION_URL}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
    const data = await resp.json();
    return data;
  },

  async listConversations(organisationId: string): Promise<AssistConversation[]> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${ASSIST_FUNCTION_URL}/conversations?organisationId=${organisationId}`, { headers });
    const data = await resp.json();
    return data.conversations || [];
  },

  async getMessages(conversationId: number): Promise<AssistMessage[]> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${ASSIST_FUNCTION_URL}/messages?conversationId=${conversationId}`, { headers });
    const data = await resp.json();
    return data.messages || [];
  },

  async archiveConversation(conversationId: number, action: 'archive' | 'delete' = 'archive'): Promise<void> {
    const headers = await getAuthHeaders();
    await fetch(`${ASSIST_FUNCTION_URL}/conversations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ conversationId, action }),
    });
  },

  async submitFeedback(params: {
    organisationId: string;
    messageId?: number;
    runId?: number;
    rating?: number;
    category?: string;
    comment?: string;
    isReportedIncorrect?: boolean;
  }): Promise<void> {
    const headers = await getAuthHeaders();
    await fetch(`${ASSIST_FUNCTION_URL}/feedback`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
  },

  async getSettings(organisationId: string): Promise<AssistSettings> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${ASSIST_FUNCTION_URL}/settings?organisationId=${organisationId}`, { headers });
    return resp.json();
  },

  async saveSettings(organisationId: string, settings: Record<string, any>): Promise<any> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${ASSIST_FUNCTION_URL}/settings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ organisationId, ...settings }),
    });
    return resp.json();
  },

  async getUsageSummary(organisationId: string): Promise<AssistUsageSummary> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${ASSIST_FUNCTION_URL}/usage?organisationId=${organisationId}`, { headers });
    return resp.json();
  },

  // Document Ingestion
  async uploadDocument(params: {
    file: File;
    organisationId: string;
    documentType: string;
    jobId?: string | null;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; jobId: number; storagePath: string }> {
    const headers = await getAuthHeaders();
    const formData_1 = new FormData();
    formData_1.append('file', params.file);
    formData_1.append('organisationId', params.organisationId);
    formData_1.append('documentType', params.documentType);
    if (params.jobId) formData_1.append('jobId', params.jobId);
    formData_1.append('metadata', JSON.stringify(params.metadata || {}));

    const resp = await fetch(`${INGESTION_FUNCTION_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: headers.Authorization },
      body: formData_1,
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },

  async listIngestionJobs(organisationId: string): Promise<IngestionJob[]> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${INGESTION_FUNCTION_URL}/jobs?organisationId=${organisationId}`, { headers });
    const data = await resp.json();
    return data.jobs || [];
  },

  async getIngestionJobDetail(jobId: number): Promise<IngestionJobDetail> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${INGESTION_FUNCTION_URL}/jobs/${jobId}`, { headers });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Failed to get job detail');
    return data;
  },

  async triggerExtraction(jobId: number, templateName: string): Promise<{ success: boolean; extractionId: number; fields: number; status: string }> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${INGESTION_FUNCTION_URL}/extract`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jobId, templateName }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Extraction failed');
    return data;
  },

  async confirmExtraction(extractionId: number, fields: Array<{ id: number; is_confirmed: boolean; edited_value?: string | null }>): Promise<{ success: boolean }> {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${INGESTION_FUNCTION_URL}/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ extractionId, fields }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Confirmation failed');
    return data;
  },
};