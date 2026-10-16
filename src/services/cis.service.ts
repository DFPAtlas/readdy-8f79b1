import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type CisRecord = Database['public']['Tables']['cis_records']['Row'];
type WorkforcePerson = Database['public']['Tables']['workforce_people']['Row'];
type CisUpdate = Pick<CisRecord, 'utr_recorded' | 'deduction_rate' | 'gross_payment_status' | 'note'>;

export type CisPersonSummary = Pick<WorkforcePerson, 'id' | 'first_name' | 'last_name' | 'trading_name' | 'primary_trade' | 'relationship'>;
type CisRegisterFields = Pick<CisRecord, 'id' | 'organisation_id' | 'person_id' | 'utr_recorded' | 'deduction_rate' | 'gross_payment_status' | 'note' | 'updated_at'>;
export type CisRecordWithPerson = CisRegisterFields & { person: CisPersonSummary | null };

function client() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('The backend is not available right now.');
  return supabase;
}

export const cisService = {
  async getRecords(orgId: string): Promise<CisRecordWithPerson[]> {
    const supabase = client();
    const [recordsResult, peopleResult] = await Promise.all([
      supabase
        .from('cis_records')
        .select('id, organisation_id, person_id, utr_recorded, deduction_rate, gross_payment_status, note, updated_at')
        .eq('organisation_id', orgId)
        .order('updated_at', { ascending: false }),
      supabase
        .from('workforce_people')
        .select('id, first_name, last_name, trading_name, primary_trade, relationship')
        .eq('organisation_id', orgId)
        .in('relationship', ['subcontractor_individual', 'subcontractor_company']),
    ]);

    if (recordsResult.error) throw recordsResult.error;
    if (peopleResult.error) throw peopleResult.error;

    const peopleById = new Map((peopleResult.data || []).map((person) => [person.id, person]));
    return (recordsResult.data || []).map((record) => ({
      ...record,
      person: peopleById.get(record.person_id) ?? null,
    }));
  },

  async getEligiblePeople(orgId: string): Promise<CisPersonSummary[]> {
    const { data, error } = await client()
      .from('workforce_people')
      .select('id, first_name, last_name, trading_name, primary_trade, relationship')
      .eq('organisation_id', orgId)
      .is('archived_at', null)
      .in('relationship', ['subcontractor_individual', 'subcontractor_company'])
      .order('last_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async saveRecord(orgId: string, personId: string, updates: CisUpdate): Promise<void> {
    const supabase = client();
    const { data: existing, error: findError } = await supabase
      .from('cis_records')
      .select('id')
      .eq('organisation_id', orgId)
      .eq('person_id', personId)
      .maybeSingle();

    if (findError) throw findError;

    const result = existing
      ? await supabase
          .from('cis_records')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .eq('organisation_id', orgId)
          .select('id')
          .single()
      : await supabase
          .from('cis_records')
          .insert({ ...updates, organisation_id: orgId, person_id: personId })
          .select('id')
          .single();

    if (result.error) throw result.error;
  },

  async createWorkforceSubcontractor(
    orgId: string,
    input: { first_name: string; last_name: string; relationship: 'subcontractor_individual' | 'subcontractor_company'; trading_name: string | null; primary_trade: string | null; business_type: 'sole_trader' | 'limited_company' },
  ): Promise<CisPersonSummary> {
    const { data, error } = await client()
      .from('workforce_people')
      .insert({ ...input, organisation_id: orgId })
      .select('id, first_name, last_name, trading_name, primary_trade, relationship')
      .single();

    if (error) throw error;
    return data;
  },
};
