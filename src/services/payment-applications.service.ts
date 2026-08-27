import { getSupabase } from '@/lib/supabase';

export interface PaymentApplication {
  id: string;
  organisation_id: string;
  job_id: string;
  reference: string;
  application_date: string;
  valuation_pence: number;
  previous_certified_pence: number;
  amount_due_pence: number;
  retention_pence: number;
  status: 'draft' | 'submitted' | 'certified' | 'paid' | 'disputed' | 'void';
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

export interface PaymentSummary {
  total_valuation_pence: number;
  total_certified_pence: number;
  total_paid_pence: number;
  total_outstanding_pence: number;
  total_retention_held_pence: number;
  application_count: number;
}

export const paymentApplicationsService = {
  async getByJob(jobId: string, orgId: string): Promise<PaymentApplication[]> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('No Supabase');

    const { data, error } = await supabase
      .from('payment_applications')
      .select('*')
      .eq('job_id', jobId)
      .eq('organisation_id', orgId)
      .order('application_date', { ascending: false });

    if (error) throw error;

    const apps = data || [];

    // Fetch creator names
    const creatorIds = [...new Set(apps.map((a) => a.created_by).filter(Boolean))];
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles_full')
        .select('id, full_name')
        .in('id', creatorIds as string[]);

      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => {
        nameMap[p.id] = p.full_name;
      });

      return apps.map((a) => ({ ...a, creator_name: nameMap[a.created_by] || 'Unknown' }));
    }

    return apps;
  },

  getSummary(apps: PaymentApplication[]): PaymentSummary {
    const latest = apps[0]; // apps come sorted desc by date
    const totalCertified = apps
      .filter((a) => ['certified', 'paid'].includes(a.status))
      .reduce((sum, a) => sum + a.amount_due_pence, 0);
    const totalPaid = apps
      .filter((a) => a.status === 'paid')
      .reduce((sum, a) => sum + a.amount_due_pence, 0);
    const totalRetention = apps
      .filter((a) => ['certified', 'paid'].includes(a.status))
      .reduce((sum, a) => sum + a.retention_pence, 0);

    return {
      total_valuation_pence: latest?.valuation_pence || 0,
      total_certified_pence: totalCertified,
      total_paid_pence: totalPaid,
      total_outstanding_pence: totalCertified - totalPaid,
      total_retention_held_pence: totalRetention,
      application_count: apps.length,
    };
  },
};