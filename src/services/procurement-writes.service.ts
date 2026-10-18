import { getSupabase } from '@/lib/supabase';
import type { Json } from '@/types/supabase';

export type ProcurementAction = 'create_supplier' | 'create_order' | 'approve_order' | 'record_delivery';
export async function writeProcurement(orgId: string, requestId: string, action: ProcurementAction, payload: Json): Promise<string> {
  const client = getSupabase();
  if (!client) throw new Error('The backend is unavailable.');
  const { data, error } = await client.rpc('procurement_write', { p_org: orgId, p_request: requestId, p_action: action, p_data: payload });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('The server did not confirm the save.');
  return data;
}

export type InvoiceAction = 'create_invoice' | 'recheck_invoice' | 'approve_invoice' | 'cancel_invoice';
export async function writeInvoice(orgId: string, requestId: string, action: InvoiceAction, payload: Json): Promise<string> {
  const client = getSupabase();
  if (!client) throw new Error('The backend is unavailable.');
  const { data, error } = await client.rpc('procurement_invoice_write', { p_org: orgId, p_request: requestId, p_action: action, p_data: payload });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('The server did not confirm the save.');
  return data;
}
