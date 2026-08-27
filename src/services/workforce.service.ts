import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type WorkforcePerson = Database['public']['Tables']['workforce_people']['Row'];
type Qualification = Database['public']['Tables']['qualifications']['Row'];
type InsurancePolicy = Database['public']['Tables']['insurance_policies']['Row'];
type WorkforceDocument = Database['public']['Tables']['workforce_documents']['Row'];
type WorkforceAssignment = Database['public']['Tables']['workforce_assignments']['Row'];

export const workforceService = {
  async getPeople(orgId: string): Promise<WorkforcePerson[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('workforce_people')
      .select('*')
      .eq('organisation_id', orgId)
      .is('archived_at', null)
      .order('last_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getPerson(personId: string, orgId: string): Promise<WorkforcePerson | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('workforce_people')
      .select('*')
      .eq('id', personId)
      .eq('organisation_id', orgId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createPerson(input: Database['public']['Tables']['workforce_people']['Insert']): Promise<WorkforcePerson> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('workforce_people')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePerson(personId: string, orgId: string, updates: Database['public']['Tables']['workforce_people']['Update']): Promise<WorkforcePerson> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('workforce_people')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', personId)
      .eq('organisation_id', orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async archivePerson(personId: string, orgId: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('workforce_people')
      .update({ archived_at: new Date().toISOString(), passport_status: 'archived' })
      .eq('id', personId)
      .eq('organisation_id', orgId);

    if (error) throw error;
  },

  async getQualifications(personId: string, orgId: string): Promise<Qualification[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('qualifications')
      .select('*')
      .eq('person_id', personId)
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getInsurance(personId: string, orgId: string): Promise<InsurancePolicy[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('insurance_policies')
      .select('*')
      .eq('person_id', personId)
      .eq('organisation_id', orgId)
      .order('expiry_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getDocuments(personId: string, orgId: string): Promise<WorkforceDocument[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('workforce_documents')
      .select('*')
      .eq('person_id', personId)
      .eq('organisation_id', orgId)
      .is('archived_at', null)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getAssignments(personId: string, orgId: string): Promise<WorkforceAssignment[]> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('workforce_assignments')
      .select('*')
      .eq('person_id', personId)
      .eq('organisation_id', orgId);

    if (error) throw error;
    return data || [];
  },
};