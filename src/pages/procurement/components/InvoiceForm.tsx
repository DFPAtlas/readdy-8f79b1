import { useRef, useState, type FormEvent } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import type { PurchaseOrder } from '@/services/procurement.service';
import { writeInvoice } from '@/services/procurement-writes.service';
import { poundsToPence, formatPence } from '@/lib/money';

const input = 'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm';
interface Line { id: string; description: string; quantity: string; price: string; vat: string }
export function InvoiceForm({ orders, onSaved, onCancel }: { orders: PurchaseOrder[]; onSaved: () => void; onCancel: () => void }) {
  const { organisation, isReadOnly } = useOrg();
  const [orderId, setOrderId] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [due, setDue] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const request = useRef({ payload: '', id: crypto.randomUUID() });
  const order = orders.find(row => row.id === orderId);
  function chooseOrder(id: string) {
    setOrderId(id);
    setLines((orders.find(row => row.id === id)?.lines || []).map(line => ({ id: line.id, description: line.description, quantity: '', price: (line.unit_price_pence / 100).toFixed(2), vat: String(line.tax_rate ?? 0) })));
  }
  function change(index: number, key: keyof Line, value: string) { setLines(current => current.map((line, i) => i === index ? { ...line, [key]: value } : line)); }
  const selected = lines.filter(line => Number(line.quantity) > 0);
  const total = selected.reduce((sum, line) => { const net = Math.round(Number(line.quantity) * (poundsToPence(line.price) ?? 0)); return sum + net + Math.round(net * Number(line.vat)); }, 0);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!organisation || busy.current || isReadOnly) return;
    if (!selected.length) { setError('Enter an invoiced quantity on at least one line.'); return; }
    const payload = { purchase_order_id: orderId, invoice_number: reference.trim(), invoice_date: date, due_date: due || null, notes: notes.trim(), lines: selected.map(line => ({ purchase_order_line_id: line.id, quantity: Number(line.quantity), unit_price_pence: poundsToPence(line.price), tax_rate: Number(line.vat) })) };
    const serialized = JSON.stringify(payload);
    if (request.current.payload !== serialized) request.current = { payload: serialized, id: crypto.randomUUID() };
    busy.current = true; setSaving(true); setError('');
    try { await writeInvoice(organisation.id, request.current.id, 'create_invoice', payload); onSaved(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Invoice could not be saved.'); }
    finally { busy.current = false; setSaving(false); }
  }
  return <form aria-label="Record supplier invoice" onSubmit={submit} className="rounded-xl border border-border bg-white p-5 space-y-4">
    <h2 className="text-lg font-semibold">Record supplier invoice</h2>
    <p className="text-sm text-muted">Enter quantities, prices and VAT from the supplier invoice. Leave uninvoiced quantities blank. Matching uses all active invoices and accepted deliveries. Saving does not approve or pay an invoice.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <fieldset disabled={saving || isReadOnly} className="space-y-4">
      <label className="block text-sm">Purchase order<select required className={input} value={orderId} onChange={event => chooseOrder(event.target.value)}><option value="">Choose approved order</option>{orders.filter(row => ['approved','issued','acknowledged','partially_delivered','fully_delivered','closed'].includes(row.status)).map(row => <option key={row.id} value={row.id}>{row.po_number} — {row.supplier?.trading_name}</option>)}</select></label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Supplier invoice reference<input required maxLength={100} className={input} value={reference} onChange={event => setReference(event.target.value)} /></label>
        <label className="text-sm">Invoice date<input required type="date" className={input} value={date} onChange={event => setDate(event.target.value)} /></label>
        <label className="text-sm">Due date (optional)<input type="date" min={date} className={input} value={due} onChange={event => setDue(event.target.value)} /></label>
      </div>
      {lines.map((line, index) => <div key={line.id} className="rounded-lg border border-border p-3 grid gap-3 sm:grid-cols-4">
        <p className="text-sm">{line.description}</p>
        <label className="text-sm">Invoiced quantity<input type="number" min="0" max="1000000" step="0.0001" className={input} value={line.quantity} onChange={event => change(index, 'quantity', event.target.value)} /></label>
        <label className="text-sm">Unit price ({order?.currency})<input required type="number" min="0" max="1000000" step="0.01" className={input} value={line.price} onChange={event => change(index, 'price', event.target.value)} /></label>
        <label className="text-sm">VAT<select className={input} value={line.vat} onChange={event => change(index, 'vat', event.target.value)}><option value="0.2">20%</option><option value="0.05">5%</option><option value="0">0%</option></select></label>
      </div>)}
      <label className="block text-sm">Notes<textarea className={input} maxLength={4000} value={notes} onChange={event => setNotes(event.target.value)} /></label>
      <p className="font-semibold">Total including VAT: {formatPence(total, order?.currency)}</p>
      <button type="submit" disabled={!orderId} className="rounded-lg bg-primary-500 text-white px-4 py-2 disabled:opacity-50">{saving ? 'Saving…' : 'Save and check invoice'}</button>
    </fieldset>
    <button type="button" disabled={saving} onClick={onCancel} className="text-sm underline">Cancel</button>
  </form>;
}
