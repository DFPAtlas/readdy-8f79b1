// BuildNerve — Evidence Pack exporter service layer.
// Reads and writes both go through the `dispute-export` edge function so the
// browser never holds service-role credentials and cannot bypass the
// party-access / immutability rules. Generated packs are stored privately and
// only exposed via short-lived signed URLs.

import { getSupabase } from '@/lib/supabase';
import type {
  ExportWorkspace,
  ExportConfig,
  DisputeExport,
  ExportGenerateResult,
} from '@/types/dispute-export';

const FUNCTION_URL = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/dispute-export`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Backend not connected');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function call<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
  const headers = await getAuthHeaders();
  const resp = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error((data as { error?: string })?.error || 'Operation failed');
  return data as T;
}

export interface DownloadResult {
  url: string;
  filename: string;
}

export const disputeExportService = {
  async getWorkspace(disputeId: string): Promise<ExportWorkspace> {
    return call<ExportWorkspace>('get_workspace', { disputeId });
  },

  async list(disputeId: string): Promise<DisputeExport[]> {
    const data = await call<{ exports: DisputeExport[] }>('list', { disputeId });
    return data.exports ?? [];
  },

  async generate(disputeId: string, config: ExportConfig): Promise<ExportGenerateResult> {
    return call<ExportGenerateResult>('generate', { disputeId, config });
  },

  async download(exportId: string, kind: 'pdf' | 'zip'): Promise<DownloadResult> {
    return call<DownloadResult>('download', { exportId, kind });
  },
};