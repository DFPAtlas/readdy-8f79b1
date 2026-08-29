// BuildNerve — Dispute launch-readiness service.
// Reads go through the `dispute-launch-check` edge function, which resolves the
// caller's staff role/permissions server-side and runs evidence-based checks
// against the live database. The browser never holds service-role credentials.

import { getSupabase } from '@/lib/supabase';
import type { ReadinessResult } from '@/types/dispute-launch';

const FUNCTION_URL = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/dispute-launch-check`;

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

export const disputeLaunchService = {
  async getReadiness(): Promise<ReadinessResult> {
    return call<ReadinessResult>('get_readiness');
  },

  async recordGateApproval(gateKey: string, note?: string): Promise<{ success: boolean; message: string }> {
    return call<{ success: boolean; message: string }>('record_gate_approval', { gateKey, note });
  },
};