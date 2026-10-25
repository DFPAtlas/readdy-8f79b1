import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
export type Client = Database['public']['Tables']['clients']['Row'];
export type Contact = Database['public']['Tables']['client_contacts']['Row'];
export const clientName = (c: Client) => c.company_name?.trim() || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed client';
function backend() {
  const client = getSupabase();
  if (!client) throw new Error('The backend is unavailable.');
  return client;
}
export async function loadClientsPage(orgId: string, offset: number, signal: AbortSignal) {
  const { data, error, count } = await backend().from('clients').select('*', { count: 'exact' })
    .eq('organisation_id', orgId).is('archived_at', null)
    .order('created_at', { ascending: false }).order('id').range(offset, offset + 49).abortSignal(signal);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0 };
}
export async function loadClient(orgId: string, clientId: string, signal: AbortSignal) {
  const { data, error } = await backend().from('clients').select('*').eq('organisation_id', orgId)
    .eq('id', clientId).is('archived_at', null).abortSignal(signal).maybeSingle();
  if (error) throw error;
  return data;
}
export async function loadContacts(orgId: string, clientId: string, offset: number, signal: AbortSignal) {
  const { data, error, count } = await backend().from('client_contacts').select('*', { count: 'exact' })
    .eq('organisation_id', orgId).eq('client_id', clientId)
    .order('is_primary', { ascending: false }).order('created_at').order('id')
    .range(offset, offset + 24).abortSignal(signal);
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0 };
}
