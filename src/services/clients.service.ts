import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientContact = Database['public']['Tables']['client_contacts']['Row'];

export const clientsService = {
  async getClients(orgId: string): Promise<Client[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organisation_id', orgId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getClient(clientId: string, orgId: string): Promise<Client | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('organisation_id', orgId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createClient(input: Database['public']['Tables']['clients']['Insert']): Promise<Client> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('clients')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateClient(clientId: string, orgId: string, updates: Database['public']['Tables']['clients']['Update']): Promise<Client> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('clients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', clientId)
      .eq('organisation_id', orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async archiveClient(clientId: string, orgId: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('clients')
      .update({ archived_at: new Date().toISOString(), account_status: 'archived' })
      .eq('id', clientId)
      .eq('organisation_id', orgId);

    if (error) throw error;
  },

  async getContacts(clientId: string, orgId: string): Promise<ClientContact[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('client_contacts')
      .select('*')
      .eq('client_id', clientId)
      .eq('organisation_id', orgId);

    if (error) throw error;
    return data || [];
  },
};