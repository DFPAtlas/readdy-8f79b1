import { useEffect, useRef, useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { poService, supplierInvoiceService, type PurchaseOrder } from '@/services/procurement.service';
import { writeInvoice, type InvoiceAction } from '@/services/procurement-writes.service';
import { formatPence } from '@/lib/money';
import { InvoiceForm } from '../components/InvoiceForm';

type Invoice = Awaited<ReturnType<typeof supplierInvoiceService.getInvoices>>[number];
const button = 'rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50';
function matchPassed(invoice: Invoice) {
  const match = invoice.match;
  if(invoice.purchase_order?.returns_recorded_at && (!match?.matched_at || new Date(match.matched_at)<new Date(invoice.purchase_order.returns_recorded_at))) return false;
  return match?.match_type === 'three_way' && match.price_match && match.quantity_match && match.tax_match && Array.isArray(match.exceptions) && match.exceptions.length === 0;
}
export default function ProcurementSupplierInvoices() {
  const { organisation, role, isReadOnly } = useOrg();
  const orgId = organisation?.id;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState('');
  const [cancelId, setCancelId] = useState('');
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  const currentOrg = useRef(orgId);
  currentOrg.current = orgId;
  const canWrite = !isReadOnly && ['owner','admin','finance','project_manager'].includes(role || '');
  const canApprove = !isReadOnly && ['owner','admin','finance'].includes(role || '');
  useEffect(() => {
    let active = true;
    setInvoices([]); setOrders([]); setError(''); setShowForm(false); setCancelId(''); setMessage('');
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([supplierInvoiceService.getInvoices(orgId), poService.getPurchaseOrders(orgId)])
      .then(([rows, purchaseOrders]) => { if (active) { setInvoices(rows); setOrders(purchaseOrders); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load invoices.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orgId, revision]);
  async function action(invoice: Invoice, operation: Exclude<InvoiceAction, 'create_invoice'>) {
    if (!orgId || busy.current) return;
    const actionOrg = orgId;
    busy.current = true; setBusyId(invoice.id); setError('');
    try {
      await writeInvoice(actionOrg, crypto.randomUUID(), operation, { invoice_id: invoice.id });
      const rows = await supplierInvoiceService.getInvoices(actionOrg);
      if (currentOrg.current === actionOrg) {
        setInvoices(rows); setCancelId('');
        setMessage(operation === 'approve_invoice' ? 'Invoice approved. No payment has been made.' : operation === 'cancel_invoice' ? 'Invoice cancelled. Record a corrected invoice if needed.' : 'Matching checks refreshed. Review the result below.');
      }
    } catch (reason) {
      if (currentOrg.current === actionOrg) setError(reason instanceof Error ? reason.message : 'The action failed.');
    } finally { busy.current = false; setBusyId(''); }
  }
  if (loading) return <p role="status" className="p-8">Loading supplier invoices…</p>;
  const filtered = invoices.filter(invoice => filter === 'all' || invoice.status === filter);
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-3 items-center justify-between">
      <div><h1 className="text-2xl font-semibold">Supplier invoices</h1><p className="text-sm text-muted">Record invoices, review order and delivery checks, then approve separately.</p></div>
      {canWrite && <button className={button} disabled={!!busyId} onClick={() => setShowForm(value => !value)}>{showForm ? 'Close invoice form' : 'Record invoice'}</button>}
    </div>
    {isReadOnly && <p className="text-sm">Your workspace is read-only. You can view invoices; upgrade to make changes.</p>}
    {error && <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700"><p>{error}</p><button className="underline" disabled={!!busyId} onClick={() => setRevision(value => value + 1)}>Reload records</button></div>}
    {message && <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm">{message}</p>}
    {showForm && orgId && <InvoiceForm key={orgId} orders={orders} onCancel={() => setShowForm(false)} onSaved={() => { if (currentOrg.current === orgId) { setShowForm(false); setRevision(value => value + 1); } }} />}
    <label className="block text-sm">Status <select className="rounded border border-border p-2" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All ({invoices.length})</option>{['received','pending_match','matched','exception','approved','paid','cancelled'].map(status => <option key={status} value={status}>{status.replaceAll('_',' ')}</option>)}</select></label>
    {filtered.map(invoice => {
      const passed = matchPassed(invoice);
      const mutable = ['draft','received','pending_match','matched','exception'].includes(invoice.status) && invoice.approval_status !== 'approved' && invoice.payment_status === 'unpaid';
      const exceptions = Array.isArray(invoice.match?.exceptions) ? invoice.match.exceptions : [];
      return <article key={invoice.id} className="rounded-xl border border-border bg-white p-5 space-y-3">
        <div className="flex flex-wrap gap-3 justify-between"><h2 className="font-semibold">{invoice.invoice_number} — {invoice.supplier?.trading_name || 'Supplier'}</h2><span className="text-sm capitalize">{invoice.status.replaceAll('_',' ')}</span></div>
        <p className="text-sm">PO: {invoice.purchase_order?.po_number || 'Not linked'} · Invoice date: {invoice.invoice_date || 'Not recorded'} · Due: {invoice.due_date || 'Not recorded'}</p>
        <p className="font-semibold">{formatPence(invoice.gross_amount_pence, invoice.currency)}</p>
        {invoice.credits.some(credit=>credit.status!=='void') && <p className="text-sm">Credit notes: {formatPence(invoice.credits.filter(credit=>credit.status!=='void').reduce((sum,credit)=>sum+credit.amount_pence,0),invoice.currency)} · Invoice value after credits: {formatPence(invoice.gross_amount_pence-invoice.credits.filter(credit=>credit.status!=='void').reduce((sum,credit)=>sum+credit.amount_pence,0),invoice.currency)}. Credit recording does not make a refund or clear matching exceptions.</p>}
        {invoice.purchase_order?.returns_recorded_at && <p className="text-sm text-amber-700">This order has completed returns. Review quantities and related credit notes.</p>}
        {invoice.status !== 'cancelled' && <p className={`text-sm ${passed ? 'text-green-700' : 'text-amber-700'}`}>{passed ? 'Three-way checks passed at last check' : 'Matching requires review'}{invoice.match?.matched_at ? ` · ${new Date(invoice.match.matched_at).toLocaleString('en-GB')}` : ''}</p>}
        {invoice.status !== 'cancelled' && exceptions.length > 0 && <ul className="list-disc pl-5 text-sm text-red-700">{exceptions.map((exception, index) => <li key={index}>{typeof exception === 'string' ? exception : JSON.stringify(exception)}</li>)}</ul>}
        <details><summary className="cursor-pointer text-sm">Invoice lines and totals</summary><div className="overflow-x-auto"><table className="w-full text-sm mt-3"><thead><tr><th className="text-left">Description</th><th>Quantity</th><th>Unit price</th><th>VAT</th><th>Net</th></tr></thead><tbody>{[...invoice.lines].sort((a,b) => a.line_number - b.line_number).map(line => <tr key={line.id}><td className="py-2">{line.description}</td><td className="text-center">{line.quantity}</td><td className="text-center">{formatPence(line.unit_price_pence, invoice.currency)}</td><td className="text-center">{line.tax_rate == null ? 'Unknown' : `${line.tax_rate * 100}%`}</td><td className="text-center">{formatPence(line.line_total_pence ?? 0, invoice.currency)}</td></tr>)}</tbody></table></div><p className="text-sm mt-2">Net {formatPence(invoice.net_amount_pence, invoice.currency)} · VAT {formatPence(invoice.tax_amount_pence ?? 0, invoice.currency)}</p>{invoice.notes && <p className="text-sm mt-2 whitespace-pre-wrap">{invoice.notes}</p>}</details>
        {mutable && <div className="flex flex-wrap gap-2">
          {canWrite && <button className={button} disabled={!!busyId} onClick={() => action(invoice, 'recheck_invoice')}>{busyId === invoice.id ? 'Working…' : 'Recheck match'}</button>}
          {canApprove && <button className={button} disabled={!!busyId || !passed} onClick={() => action(invoice, 'approve_invoice')}>Approve invoice</button>}
          {canApprove && <button className={button} disabled={!!busyId} onClick={() => setCancelId(invoice.id)}>Cancel incorrect invoice</button>}
        </div>}
        {cancelId === invoice.id && <div className="rounded-lg bg-amber-50 p-3 text-sm"><p>Cancel this invoice? It stays in the record but no longer counts towards invoiced quantities. A corrected invoice can then be recorded.</p><button className={button} disabled={!!busyId} onClick={() => action(invoice, 'cancel_invoice')}>Confirm cancellation</button> <button className={button} disabled={!!busyId} onClick={() => setCancelId('')}>Keep invoice</button></div>}
      </article>;
    })}
    {!error && filtered.length === 0 && <p className="rounded-xl border border-border p-8 text-center">No invoices in this view.{canWrite ? ' Use Record invoice to enter one against an approved order.' : ''}</p>}
  </div>;
}
