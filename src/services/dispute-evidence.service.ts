// BuildNerve — Dispute Evidence Library service layer.
// All evidence reads/writes go through the `dispute-evidence` edge function,
// which revalidates dispute-party membership on every request, validates file
// safety server-side, computes SHA-256 hashes, stores files in private storage
// and serves them only via short-lived signed URLs.

import { getSupabase } from '@/lib/supabase';
import type { DisputeEvidence, DisputeLinkableRecord } from '@/types/disputes';

const FUNCTION_URL = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/dispute-evidence`;

async function getAuthHeaders(json = true): Promise<Record<string, string>> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Backend not connected');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return {
    Authorization: `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function call<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
  const headers = await getAuthHeaders(true);
  const resp = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error((data as { error?: string })?.error || 'Operation failed');
  return data as T;
}

export type EvidenceListItem = DisputeEvidence;

export interface EvidenceListResponse {
  items: EvidenceListItem[];
  counts: {
    total: number;
    active: number;
    pendingValidation: number;
    withdrawn: number;
  };
}

export interface EvidenceDetailResponse {
  evidence: DisputeEvidence;
  signedUrl: string | null;
  audit: {
    action: string;
    created_at: string;
  }[];
}

export interface SubmitTextNoteInput {
  disputeId: string;
  category: string;
  title: string;
  description: string;
  eventDate?: string;
  supersedesEvidenceId?: string;
}

export interface SubmitLinkedRecordInput {
  disputeId: string;
  category: string;
  title: string;
  description?: string;
  eventDate?: string;
  recordType: string;
  recordId: string;
}

export interface UploadEvidenceInput {
  disputeId: string;
  file: File;
  category: string;
  title: string;
  description?: string;
  eventDate?: string;
  supersedesEvidenceId?: string;
}

export const disputeEvidenceService = {
  async list(disputeId: string): Promise<EvidenceListResponse> {
    return call<EvidenceListResponse>('list', { disputeId });
  },

  async detail(evidenceId: string): Promise<EvidenceDetailResponse> {
    return call<EvidenceDetailResponse>('detail', { evidenceId });
  },

  async linkableRecords(disputeId: string): Promise<DisputeLinkableRecord[]> {
    const data = await call<{ records: DisputeLinkableRecord[] }>('linkable_records', { disputeId });
    return data.records ?? [];
  },

  async submitTextNote(input: SubmitTextNoteInput): Promise<{ evidence: DisputeEvidence }> {
    return call('submit_text_note', { ...input });
  },

  async submitLinkedRecord(input: SubmitLinkedRecordInput): Promise<{ evidence: DisputeEvidence }> {
    return call('submit_linked_record', { ...input });
  },

  async upload(input: UploadEvidenceInput): Promise<{ evidence: DisputeEvidence }> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const form = new FormData();
    form.append('disputeId', input.disputeId);
    form.append('file', input.file);
    form.append('category', input.category);
    form.append('title', input.title);
    if (input.description) form.append('description', input.description);
    if (input.eventDate) form.append('eventDate', input.eventDate);
    if (input.supersedesEvidenceId) form.append('supersedesEvidenceId', input.supersedesEvidenceId);

    const resp = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const result = await resp.json();
    if (!resp.ok) throw new Error((result as { error?: string })?.error || 'Upload failed');
    return result as { evidence: DisputeEvidence };
  },

  async withdraw(evidenceId: string, reason?: string): Promise<{ evidence: DisputeEvidence }> {
    return call('withdraw', { evidenceId, reason });
  },
};