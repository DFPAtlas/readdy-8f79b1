import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
export type Preference = Database['public']['Tables']['notification_preferences']['Row'];
export const preferenceCategories = ['jobs', 'workforce', 'variations', 'payments', 'documents', 'client_activity', 'security', 'system'] as const;
function backend() { const client = getSupabase(); if (!client) throw new Error('Backend unavailable'); return client; }
export async function loadPreferences(org: string, user: string, signal: AbortSignal) {
  const { data, error } = await backend().from('notification_preferences').select('*').eq('organisation_id', org).eq('user_id', user).order('category').abortSignal(signal);
  if (error) throw error; return data ?? [];
}
export async function savePreference(org: string, user: string, row: Preference) {
  if (row.category === 'security' || !preferenceCategories.includes(row.category as typeof preferenceCategories[number])) throw new Error('This category cannot be edited here.');
  const client = backend();
  const changes = { in_app_enabled: row.in_app_enabled, email_enabled: row.email_enabled, updated_at: new Date().toISOString() };
  const query = row.id.startsWith('unsaved:')
    ? client.from('notification_preferences').insert({ ...changes, organisation_id: org, user_id: user, category: row.category })
    : client.from('notification_preferences').update(changes).eq('id', row.id).eq('organisation_id', org).eq('user_id', user);
  const { data, error } = await query.select().single();
  if (error || !data || data.user_id !== user || data.organisation_id !== org) throw error || new Error('Save unconfirmed');
  return data;
}
