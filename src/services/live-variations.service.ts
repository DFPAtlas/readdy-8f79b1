import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
export type Variation = Database['public']['Tables']['variations']['Row'];
export type VariationInsert = Database['public']['Tables']['variations']['Insert'];
function backend() { const client = getSupabase(); if (!client) throw new Error('Backend unavailable'); return client; }
export async function variationPage(orgId: string, offset: number, signal: AbortSignal) {
  const { data, count, error } = await backend().from('variations').select('*', { count: 'exact' })
    .eq('organisation_id', orgId).is('archived_at', null).order('created_at', { ascending: false }).order('id')
    .range(offset, offset + 49).abortSignal(signal);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0 };
}
export async function variationDetail(orgId: string, id: string, signal: AbortSignal) {
  const client = backend();
  const result = await client.from('variations').select('*').eq('organisation_id', orgId).eq('id', id).is('archived_at', null).abortSignal(signal).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) return null;
  const job = await client.from('jobs').select('id,reference,project_name').eq('organisation_id', orgId).eq('id', result.data.job_id).abortSignal(signal).maybeSingle();
  if (job.error) throw job.error;
  return { variation: result.data, job: job.data };
}
export async function variationJobs(orgId: string, signal: AbortSignal) {
  const client = backend(); const rows: { id: string; reference: string; project: string }[] = [];
  for (let offset = 0; ; offset += 250) {
    const { data, error } = await client.from('jobs').select('id,reference,project_name').eq('organisation_id', orgId)
      .is('archived_at', null).order('id').range(offset, offset + 249).abortSignal(signal);
    if (error) throw error;
    rows.push(...(data ?? []).map(row => ({ id: row.id, reference: row.reference, project: row.project_name })));
    if (!data || data.length < 250) break;
  }
  return rows;
}
export async function saveVariation(input: VariationInsert) {
  const client = backend();
  const job = await client.from('jobs').select('id').eq('organisation_id', input.organisation_id).eq('id', input.job_id).is('archived_at', null).maybeSingle();
  if (job.error) throw job.error;
  if (!job.data) throw new Error('Select an available job in your company.');
  const { data, error } = await client.from('variations').insert(input).select().single();
  if (!error) return data;
  // An ambiguous network result can be retried without creating another variation.
  if (input.id) {
    const previous = await client.from('variations').select('*').eq('id', input.id).eq('organisation_id', input.organisation_id).maybeSingle();
    if (!previous.error && previous.data && previous.data.created_by === input.created_by && previous.data.job_id === input.job_id
      && previous.data.title === input.title && previous.data.total_pence === input.total_pence && previous.data.status === input.status) return previous.data;
  }
  throw error;
}
export function variationMoney(pence: number, currency: string) {
  if (!/^[A-Z]{3}$/.test(currency)) return `${(pence / 100).toFixed(2)} (currency not recorded)`;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(pence / 100);
}
