import { getSupabase } from '@/lib/supabase';
import { variationMoney } from './live-variations.service';
export type ReportKind = 'overview' | 'jobs' | 'commercial' | 'cash-flow' | 'clients' | 'workforce' | 'site-activity' | 'compliance';
export interface ReportRow { id: string; cells: (string | number)[]; route?: string }
export interface LiveReport { title: string; description: string; columns: string[]; rows: ReportRow[]; total: number }
function backend() { const client = getSupabase(); if (!client) throw new Error('Backend unavailable'); return client; }
const text = (value: string | null) => value || 'Not recorded';
export async function loadLiveReport(kind: ReportKind, org: string, offset: number, signal: AbortSignal): Promise<LiveReport> {
  const client = backend();
  if (kind === 'overview') {
    const results = await Promise.all([
      client.from('jobs').select('id', { head: true, count: 'exact' }).eq('organisation_id', org).is('archived_at', null).abortSignal(signal),
      client.from('clients').select('id', { head: true, count: 'exact' }).eq('organisation_id', org).is('archived_at', null).abortSignal(signal),
      client.from('variations').select('id', { head: true, count: 'exact' }).eq('organisation_id', org).is('archived_at', null).abortSignal(signal),
      client.from('workforce_people').select('id', { head: true, count: 'exact' }).eq('organisation_id', org).is('archived_at', null).abortSignal(signal),
      client.from('evidence_records').select('id', { head: true, count: 'exact' }).eq('organisation_id', org).is('archived_at', null).abortSignal(signal),
    ]);
    for (const r of results) if (r.error) throw r.error;
    const names = ['Jobs', 'Clients', 'Variations', 'Workforce people', 'Evidence records'];
    return { title: 'Reports overview', description: 'Current non-archived company record counts. These counts do not measure revenue, compliance approval or delivery performance.', columns: ['Record type', 'Count'], rows: names.map((name, i) => ({ id: name, cells: [name, results[i].count ?? 0] })), total: 5 };
  }
  if (kind === 'jobs') {
    const r = await client.from('jobs').select('id,reference,project_name,status,progress,target_completion_date', { count: 'exact' }).eq('organisation_id', org).is('archived_at', null).order('id').range(offset, offset + 49).abortSignal(signal); if (r.error) throw r.error;
    return { title: 'Job status report', description: 'Current saved job status and progress. A missing progress value is not treated as zero.', columns: ['Reference', 'Project', 'Status', 'Progress', 'Target completion'], total: r.count ?? 0, rows: (r.data ?? []).map(j => ({ id: j.id, cells: [j.reference, j.project_name, j.status, j.progress == null ? 'Not recorded' : j.progress + '%', text(j.target_completion_date)], route: '/jobs/' + j.id })) };
  }
  if (kind === 'commercial') {
    const r = await client.from('variations').select('id,reference,title,status,client_price_pence,vat_pence,total_pence,currency', { count: 'exact' }).eq('organisation_id', org).is('archived_at', null).order('id').range(offset, offset + 49).abortSignal(signal); if (r.error) throw r.error;
    return { title: 'Commercial variation register', description: 'Recorded variation values by status and currency. Draft and unapproved variations are not recognised revenue or profit.', columns: ['Reference', 'Title', 'Status', 'Price excluding VAT', 'VAT', 'Total'], total: r.count ?? 0, rows: (r.data ?? []).map(v => ({ id: v.id, cells: [v.reference, v.title, v.status, variationMoney(v.client_price_pence, v.currency), variationMoney(v.vat_pence, v.currency), variationMoney(v.total_pence, v.currency)], route: '/variations/' + v.id })) };
  }
  if (kind === 'cash-flow') {
    const r = await client.from('payment_applications').select('id,job_id,reference,application_date,status,amount_due_pence,retention_pence,currency', { count: 'exact' }).eq('organisation_id', org).order('id').range(offset, offset + 49).abortSignal(signal); if (r.error) throw r.error;
    return { title: 'Payment application register', description: 'Saved payment applications, including drafts and void records. Application dates are not due dates. Cash-flow forecasting and receivables ageing are not calculated from these records.', columns: ['Reference', 'Application date', 'Status', 'Amount due', 'Retention'], total: r.count ?? 0, rows: (r.data ?? []).map(v => ({ id: v.id, cells: [v.reference, v.application_date, v.status, variationMoney(v.amount_due_pence, v.currency), variationMoney(v.retention_pence, v.currency)], route: '/jobs/' + v.job_id + '/payments' })) };
  }
  if (kind === 'clients') {
    const r = await client.from('clients').select('id,company_name,first_name,last_name,client_type,account_status,portal_status', { count: 'exact' }).eq('organisation_id', org).is('archived_at', null).order('id').range(offset, offset + 49).abortSignal(signal); if (r.error) throw r.error;
    return { title: 'Client account register', description: 'Current saved client metadata. Customer satisfaction and payment-performance scores are not measured here.', columns: ['Client', 'Type', 'Account status', 'Recorded portal status'], total: r.count ?? 0, rows: (r.data ?? []).map(v => ({ id: v.id, cells: [v.company_name || [v.first_name, v.last_name].filter(Boolean).join(' ') || 'Unnamed client', v.client_type, v.account_status, v.portal_status], route: '/clients/' + v.id })) };
  }
  if (kind === 'workforce' || kind === 'compliance') {
    const r = await client.from('workforce_people').select('id,first_name,last_name,relationship,primary_trade,passport_status,availability,next_expiry_type,next_expiry_date', { count: 'exact' }).eq('organisation_id', org).is('archived_at', null).order('id').range(offset, offset + 49).abortSignal(signal); if (r.error) throw r.error;
    const compliance = kind === 'compliance';
    return { title: compliance ? 'Recorded workforce passport status' : 'Workforce register', description: compliance ? 'Saved passport statuses and next expiry dates. Review individual evidence before making a site-access decision; this report is not legal or compliance certification.' : 'Saved workforce relationships, trades and availability. No productivity or subcontractor-performance scores are inferred.', columns: compliance ? ['Person', 'Recorded passport status', 'Next expiry type', 'Next expiry date'] : ['Person', 'Relationship', 'Trade', 'Availability'], total: r.count ?? 0, rows: (r.data ?? []).map(v => ({ id: v.id, cells: compliance ? [[v.first_name, v.last_name].filter(Boolean).join(' '), v.passport_status, text(v.next_expiry_type), text(v.next_expiry_date)] : [[v.first_name, v.last_name].filter(Boolean).join(' '), v.relationship, text(v.primary_trade), text(v.availability)], route: '/workforce/' + v.id })) };
  }
  const r = await client.from('evidence_records').select('id,caption,evidence_type,captured_at,review_status,visibility', { count: 'exact' }).eq('organisation_id', org).is('archived_at', null).order('captured_at', { ascending: false }).order('id').range(offset, offset + 49).abortSignal(signal); if (r.error) throw r.error;
  return { title: 'Site evidence register', description: 'Recorded evidence by capture time and review state. No fictional coverage heatmap or site attendance is shown.', columns: ['Caption', 'Type', 'Captured at', 'Review state', 'Visibility'], total: r.count ?? 0, rows: (r.data ?? []).map(v => ({ id: v.id, cells: [text(v.caption), v.evidence_type, v.captured_at, v.review_status, v.visibility], route: '/evidence/' + v.id })) };
}
