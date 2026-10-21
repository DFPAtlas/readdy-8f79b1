import { getSupabase } from '@/lib/supabase';
export interface WorkforceInvitation { id: string; person_id: string; email: string; status: string; delivery_status: string; expires_at: string; accepted_at: string | null }
export async function workforceInvitationRequest<T>(action: string, fields: Record<string, unknown>): Promise<T> {
 const client = getSupabase();
 if (!client) throw new Error('The backend is unavailable.');
 const { data: { session } } = await client.auth.getSession();
 const response = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/workforce-invitations`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY, ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify({ action, ...fields }) });
 const result = await response.json();
 if (!response.ok) throw new Error(result.error || 'Invitation request failed.');
 return result as T;
}
