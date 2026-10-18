import { useStockHireSave } from '@/hooks/useStockHireSave';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { inventoryService, materialService, deliveryService, poService, type InventoryBalance, type InventoryLocation, type PurchaseOrder } from '@/services/procurement.service';
import { jobsService } from '@/services/jobs.service';
import type { StockHireAction } from '@/services/procurement-writes.service';
import { SetupStockForm, Field, JobSelect, type JobOption } from '../components/StockHireForms';
import { button, input, type Receipt, type Return } from '../components/ReturnCreditForms';
type Material = Awaited<ReturnType<typeof materialService.getActiveMaterials>>[number];
type Movement = Awaited<ReturnType<typeof inventoryService.getMovements>>[number];
type Allocation = Awaited<ReturnType<typeof inventoryService.getAllocations>>[number];
interface StockData {
    locations: InventoryLocation[];
    balances: InventoryBalance[];
    materials: Material[];
    jobs: JobOption[];
    receipts: Receipt[];
    returns: Return[];
    orders: PurchaseOrder[];
    movements: Movement[];
    allocations: Allocation[];
}
const empty: StockData = { locations: [], balances: [], materials: [], jobs: [], receipts: [], returns: [], orders: [], movements: [], allocations: [] };
const operations: {
    action: StockHireAction;
    label: string;
}[] = [{ action: 'receipt_stock', label: 'Post accepted delivery to stock' }, { action: 'supplier_return_stock', label: 'Post completed supplier return' }, { action: 'reserve_stock', label: 'Reserve for job' }, { action: 'release_stock', label: 'Release job reservation' }, { action: 'issue_stock', label: 'Issue to job' }, { action: 'return_job_stock', label: 'Return from job' }, { action: 'transfer_stock', label: 'Transfer between locations' }, { action: 'set_count', label: 'Record physical count / opening balance' }];
function StockForm({ data, manager, onSaved, onCancel }: {
    data: StockData;
    manager: boolean;
    onSaved: () => void;
    onCancel: () => void;
}) {
    const { save, error, saving, isReadOnly } = useStockHireSave(onSaved);
    const [action, setAction] = useState<StockHireAction>('receipt_stock');
    const [location, setLocation] = useState('');
    const [material, setMaterial] = useState('');
    const [source, setSource] = useState('');
    const needsJob = ['reserve_stock', 'release_stock', 'issue_stock', 'return_job_stock'].includes(action);
    const needsSource = ['receipt_stock', 'supplier_return_stock'].includes(action);
    const balance = data.balances.find(b => b.location_id === location && b.material_item_id === material);
    const unit = data.materials.find(m => m.id === material)?.unit_of_measure ?? 'units';
    const receipts = data.receipts.flatMap(r => r.lines.map(line => ({ line, receipt: r, order: data.orders.find(o => o.id === r.purchase_order_id) }))).filter(({ line, order }) => line.accepted_quantity > 0 && (!order?.lines?.find(l => l.id === line.purchase_order_line_id)?.material_item_id || order.lines.find(l => l.id === line.purchase_order_line_id)?.material_item_id === material));
    const returns = data.returns.filter(r => ['returned', 'credited'].includes(r.status)).flatMap(r => r.lines.filter(line => line.return_condition === 'accepted' && line.goods_receipt_line_id).map(line => ({ line, ret: r })));
    const sources = action === 'receipt_stock' ? receipts.map(({ line, receipt, order }) => ({ id: line.id, label: `${order?.po_number ?? 'Order'} · ${receipt.delivery_note_number ?? receipt.arrival_date} · ${order?.lines?.find(l => l.id === line.purchase_order_line_id)?.description ?? 'Material'} · originally accepted ${line.accepted_quantity}`, receiptId: line.id })) : returns.map(({ line, ret }) => ({ id: line.id, label: `${ret.return_reference} · ${line.description} · returned ${line.quantity}`, receiptId: line.goods_receipt_line_id }));
    const selected = sources.find(s => s.id === source);
    const mapping = data.movements.find(m => m.reference_type === 'goods_receipt_line' && m.reference_id === selected?.receiptId)?.material_item_id;
    async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const val = (key: string) => String(form.get(key) ?? '').trim(); await save(action, { location_id: location, material_id: material, quantity: Number(val('quantity')), reason: val('reason'), job_id: needsJob ? val('job_id') : null, destination_id: val('destination_id') || null, source_id: needsSource ? source : null, expected_updated_at: balance?.updated_at ?? null }); }
    return <form onSubmit={submit} className="rounded-xl border border-border bg-white p-5 space-y-3"><h2 className="font-semibold">Record stock operation</h2><p className="text-sm">Delivery and return documents do not automatically move location stock. Post their physical movements here once. Counts are absolute; all other quantities are movement amounts. The server checks remaining receipt quantities and protects other jobs’ reservations.</p>{error && <p role="alert" className="text-red-700">{error}</p>}<fieldset disabled={saving || isReadOnly} className="grid sm:grid-cols-2 gap-3"><Field label="Operation"><select className={input} value={action} onChange={e => { setAction(e.target.value as StockHireAction); setSource(''); }}>{operations.filter(o => manager || o.action !== 'set_count').map(o => <option key={o.action} value={o.action}>{o.label}</option>)}</select></Field><Field label="Stock material"><select required className={input} value={material} onChange={e => { setMaterial(e.target.value); setSource(''); }}><option value="">Choose material</option>{data.materials.map(m => <option key={m.id} value={m.id}>{m.description} ({m.unit_of_measure})</option>)}</select></Field><Field label={action === 'transfer_stock' ? 'From location' : 'Location'}><select required className={input} value={location} onChange={e => setLocation(e.target.value)}><option value="">Choose location</option>{data.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>{needsJob && <JobSelect jobs={data.jobs} required/>}{action === 'transfer_stock' && <Field label="To location"><select name="destination_id" required className={input}><option value="">Choose destination</option>{data.locations.filter(l => l.id !== location).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>}{needsSource && <Field label={action === 'receipt_stock' ? 'Accepted delivery line' : 'Completed accepted-goods return line'}><select required className={input} value={source} onChange={e => setSource(e.target.value)}><option value="">Choose source document line</option>{sources.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>}<Field label={`${action === 'set_count' ? 'Counted on hand' : 'Quantity'} (${unit})`}><input name="quantity" type="number" min={action === 'set_count' ? 0 : 0.0001} max="1000000" step="0.0001" required className={input}/></Field><Field label="Reason / movement reference"><input name="reason" maxLength={4000} required className={input}/></Field><p className="text-sm sm:col-span-2">Current location balance: {balance?.quantity_on_hand ?? 0} on hand · {balance?.reserved_quantity ?? 0} reserved · {Number(balance?.quantity_on_hand ?? 0) - Number(balance?.reserved_quantity ?? 0)} available ({unit}).{action === 'return_job_stock' ? ' Job returns must come back to the issuing location; transfer afterwards if needed.' : ''}{mapping && mapping !== material ? ' This receipt was previously posted against a different material. Select that catalogue material.' : ''}</p><button type="submit" disabled={!location || !material || (needsSource && (!source || !!mapping && mapping !== material))} className={button}>{saving ? 'Saving…' : 'Save stock operation'}</button></fieldset><button className={button} type="button" disabled={saving} onClick={onCancel}>Close</button></form>;
}
export default function ProcurementInventory() {
    const { organisation, role, isReadOnly } = useOrg();
    const orgId = organisation?.id;
    const [data, setData] = useState<StockData>(empty);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    const [filter, setFilter] = useState('');
    const [form, setForm] = useState<'move' | 'create_material' | 'create_location' | null>(null);
    const currentOrg = useRef(orgId);
    currentOrg.current = orgId;
    const manager = !isReadOnly && ['owner', 'admin', 'finance', 'project_manager'].includes(role ?? '');
    const operator = !isReadOnly && (manager || role === 'site_supervisor');
    useEffect(() => { let active = true; setData(empty); setForm(null); setFilter(''); setError(''); if (!orgId) {
        setLoading(false);
        return;
    } setLoading(true); Promise.all([inventoryService.getLocations(orgId), inventoryService.getBalances(orgId), materialService.getActiveMaterials(orgId), jobsService.getJobs(orgId), deliveryService.getGoodsReceipts(orgId), deliveryService.getReturns(orgId), poService.getPurchaseOrders(orgId), inventoryService.getMovements(orgId), inventoryService.getAllocations(orgId)]).then(([locations, balances, materials, jobs, receipts, returns, orders, movements, allocations]) => { if (active)
        setData({ locations, balances, materials: materials.filter(m => !m.archived_at), jobs, receipts, returns, orders, movements, allocations }); }).catch(e => { if (active)
        setError(e instanceof Error ? e.message : 'Could not load inventory.'); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [orgId, reload]);
    function saved() { if (currentOrg.current === orgId) {
        setForm(null);
        setReload(v => v + 1);
    } }
    const materialName = (id: string) => data.materials.find(m => m.id === id)?.description ?? data.balances.find(b => b.material_item_id === id)?.material_item?.description ?? 'Earlier material';
    const locationName = (id: string | null) => data.locations.find(l => l.id === id)?.name ?? 'Earlier location';
    const jobName = (id: string | null) => data.jobs.find(j => j.id === id)?.project_name ?? 'Earlier job';
    const unit = (id: string) => data.materials.find(m => m.id === id)?.unit_of_measure ?? data.balances.find(b => b.material_item_id === id)?.material_item?.unit_of_measure ?? '';
    if (loading)
        return <p role="status" className="p-8">Loading stock and movements…</p>;
    return <div className="space-y-5"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-semibold">Inventory</h1><p className="text-sm">Balances, job reservations and recorded physical movements by location.</p></div>{!form && <div className="flex gap-2 flex-wrap">{manager && <><button className={button} onClick={() => setForm('create_material')}>Add material</button><button className={button} onClick={() => setForm('create_location')}>Add location</button></>}{operator && <button className={button} onClick={() => setForm('move')}>Record stock operation</button>}</div>}</div>{isReadOnly && <p>This workspace is read-only.</p>}{error && <div role="alert" className="text-red-700">{error} <button className={button} onClick={() => setReload(v => v + 1)}>Reload</button></div>}{form && orgId && (form === 'move' ? <StockForm key={orgId} data={data} manager={manager} onSaved={saved} onCancel={() => setForm(null)}/> : <SetupStockForm key={`${orgId}:${form}`} kind={form} jobs={data.jobs} onSaved={saved} onCancel={() => setForm(null)}/>)}<Field label="Filter location"><select className={input} value={filter} onChange={e => setFilter(e.target.value)}><option value="">All locations</option>{data.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
 <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-sm"><caption className="p-3 text-left font-semibold">Stock balances (quantities use each material’s unit)</caption><thead><tr>{['Material', 'Location', 'On hand', 'Reserved', 'Available'].map(h => <th key={h} className="text-left p-3">{h}</th>)}</tr></thead><tbody>{data.balances.filter(b => !filter || b.location_id === filter).map(b => <tr key={b.id} className="border-t"><td className="p-3">{materialName(b.material_item_id)} ({unit(b.material_item_id)})</td><td className="p-3">{locationName(b.location_id)}</td><td className="p-3">{b.quantity_on_hand}</td><td className="p-3">{b.reserved_quantity ?? 0}</td><td className="p-3">{Number(b.quantity_on_hand) - Number(b.reserved_quantity ?? 0)}</td></tr>)}</tbody></table>{!data.balances.length && <p className="p-5">No stock balances recorded.</p>}</div>
 <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-sm"><caption className="p-3 text-left font-semibold">Job allocations</caption><thead><tr>{['Job', 'Material', 'Issuing location', 'Reserved', 'Issued, not returned'].map(h => <th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{data.allocations.filter(a => !filter || a.location_id === filter).map(a => <tr key={a.id} className="border-t"><td className="p-3">{jobName(a.job_id)}</td><td className="p-3">{materialName(a.material_item_id)} ({unit(a.material_item_id)})</td><td className="p-3">{locationName(a.location_id)}</td><td className="p-3">{a.quantity_allocated ?? 0}</td><td className="p-3">{Number(a.quantity_used ?? 0) - Number(a.quantity_returned ?? 0)}</td></tr>)}</tbody></table></div>
 <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-sm"><caption className="p-3 text-left font-semibold">Latest 100 stock movements</caption><thead><tr>{['When', 'Material / location', 'On-hand change', 'Reservation change', 'Job', 'Reason / source'].map(h => <th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{data.movements.filter(m => !filter || m.location_id === filter).slice(0, 100).map(m => <tr key={m.id} className="border-t"><td className="p-3">{new Date(m.created_at).toLocaleString('en-GB')}</td><td className="p-3">{materialName(m.material_item_id)} ({unit(m.material_item_id)}) · {locationName(m.location_id)}</td><td className="p-3">{m.quantity > 0 ? '+' : ''}{m.quantity}</td><td className="p-3">{m.reserved_delta > 0 ? '+' : ''}{m.reserved_delta}</td><td className="p-3">{m.job_id ? jobName(m.job_id) : '—'}</td><td className="p-3">{m.reason}<span className="block text-xs">{m.reference_type?.replaceAll('_', ' ')} · {m.reference_id}</span></td></tr>)}</tbody></table></div></div>;
}
