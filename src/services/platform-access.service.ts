import { getSupabase } from '@/lib/supabase';
export const platformRoles = ['platform_owner', 'platform_admin', 'platform_support', 'platform_security', 'platform_billing', 'platform_read_only'] as const;
export type PlatformRole = typeof platformRoles[number];
export async function loadPlatformAccess(userId: string) {
  const client = getSupabase();
  if (!client) throw new Error('Backend unavailable');
  const { data, error } = await client.from('platform_staff').select('id,role,status').eq('user_id', userId).eq('status', 'active').maybeSingle();
  if (error) throw error;
  if (!data || !platformRoles.includes(data.role as PlatformRole)) throw new Error('Active platform staff access required');
  const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance.error) throw assurance.error;
  return { role: data.role as PlatformRole, assurance: assurance.data.currentLevel };
}
