import { getSupabase } from '@/lib/supabase';

export interface PlatformUser {
  id: string; full_name: string | null; email: string | null; created_at: string;
  last_sign_in_at: string | null; email_confirmed_at: string | null; banned_until: string | null;
  account_state: 'email_confirmed' | 'email_unconfirmed' | 'banned' | 'anonymous';
  has_verified_mfa: boolean; membership_count: number; active_membership_count: number;
}
export interface UserMembership {
  id: string; organisation_id: string; organisation_name: string; role: string;
  status: string; joined_at: string | null; created_at: string; organisation_archived: boolean;
}
export interface DirectoryPage<T> { items: T[]; total: number }
async function rpcPage<T>(name: string, params: Record<string, unknown>): Promise<DirectoryPage<T>> {
  const client = getSupabase();
  if (!client) throw new Error('The backend is unavailable.');
  // Scoped until generated schema types include these additive RPCs.
  const { data, error } = await (client as any).rpc(name, params);
  if (error) throw new Error(error.message);
  if (!data || !Array.isArray(data.items) || typeof data.total !== 'number') throw new Error('Invalid user directory response.');
  return data as DirectoryPage<T>;
}
export const loadPlatformUsers = (search: string, state: string, offset: number) =>
  rpcPage<PlatformUser>('platform_user_directory', { p_search: search, p_state: state, p_limit: 50, p_offset: offset });
export const loadUserMemberships = (userId: string, offset: number) =>
  rpcPage<UserMembership>('platform_user_memberships', { p_user: userId, p_limit: 25, p_offset: offset });
