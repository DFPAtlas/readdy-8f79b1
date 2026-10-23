import { getSupabase } from '@/lib/supabase';

export interface PlatformOrganisation {
  id: string; name: string; trading_name: string | null; company_number: string | null;
  created_at: string; business_type: string | null; business_status: string;
  representative_status: string; owner_name: string | null; owner_email: string | null;
  plan_name: string | null; subscription_status: string | null; access_state: string | null;
  trial_end: string | null; status: string; member_count: number; job_count: number;
  latest_audit_at: string | null;
}
export interface OrganisationDirectory { items: PlatformOrganisation[]; total: number }
export async function loadOrganisationDirectory(search: string, status: string, offset: number): Promise<OrganisationDirectory> {
  const client = getSupabase();
  if (!client) throw new Error('The backend is unavailable.');
  // Scoped until generated database types include the additive RPC migration.
  const { data, error } = await (client as any).rpc('platform_organisation_directory', {
    p_search: search, p_status: status, p_limit: 50, p_offset: offset,
  });
  if (error) throw new Error(error.message);
  if (!data || !Array.isArray(data.items) || typeof data.total !== 'number') throw new Error('Invalid organisation directory response.');
  return data as OrganisationDirectory;
}
