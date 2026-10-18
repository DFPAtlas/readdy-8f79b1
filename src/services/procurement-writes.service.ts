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

export type RequisitionAction = 'create_requisition' | 'update_requisition' | 'submit_requisition' | 'approve_requisition' | 'reject_requisition' | 'request_requisition_changes' | 'cancel_requisition';
export async function writeRequisition(orgId: string, requestId: string, action: RequisitionAction, payload: Json): Promise<string> {
  const client = getSupabase();
  if (!client) throw new Error('The backend is unavailable.');
  const { data, error } = await client.rpc('procurement_requisition_write', { p_org: orgId, p_request: requestId, p_action: action, p_data: payload });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('The server did not confirm the save.');
  return data;
}

export type RfqAction = 'create_rfq' | 'update_rfq' | 'open_rfq' | 'record_quote' | 'close_rfq' | 'cancel_rfq' | 'award_rfq';
export async function writeRfq(orgId: string, requestId: string, action: RfqAction, payload: Json): Promise<string> {
  const client = getSupabase();
  if (!client) throw new Error('The backend is unavailable.');
  const { data, error } = await client.rpc('procurement_rfq_write', { p_org: orgId, p_request: requestId, p_action: action, p_data: payload });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('The server did not confirm the save.');
  return data;
}

export async function cancelPurchaseOrder(orgId: string, requestId: string, payload: Json): Promise<string> {
  const client = getSupabase();
  if (!client) throw new Error('The backend is unavailable.');
  const { data, error } = await client.rpc('procurement_cancel_order', { p_org: orgId, p_request: requestId, p_data: payload });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('The server did not confirm cancellation.');
  return data;
}

export type ReturnCreditAction = 'create_return' | 'collect_return' | 'complete_return' | 'cancel_return' | 'record_credit' | 'void_credit';
export async function writeReturnCredit(orgId: string, requestId: string, action: ReturnCreditAction, payload: Json): Promise<string> {
  const client = getSupabase();
  if (!client) throw new Error('The backend is unavailable.');
  const { data, error } = await client.rpc('procurement_return_credit_write', {p_org:orgId,p_request:requestId,p_action:action,p_data:payload});
  if (error) throw new Error(error.message);
  if (!data) throw new Error('The server did not confirm the save.');
  return data;
}
