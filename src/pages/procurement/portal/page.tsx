import { Link } from 'react-router-dom';

export default function ProcurementPortal() {
  return <div className="px-4 md:px-6 py-6 md:py-8 max-w-[1400px] mx-auto space-y-5">
    <h1 className="text-2xl font-semibold text-main">Material Procurement &amp; Supplier Financials</h1>
    <p className="text-sm text-muted">Create draft purchase orders, approve them and record accepted, rejected or damaged deliveries against the order lines. Record supplier invoices, review matching exceptions and approve matched invoices separately.</p>
    <div className="flex flex-wrap gap-3">
      <Link className="rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold text-main" to="/app/procurement/requisitions">Material requisitions</Link>
      <Link className="rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold text-main" to="/app/procurement/rfqs">Supplier quotations</Link>
      <Link className="rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold text-main" to="/app/procurement/returns">Returns and credit notes</Link>
      <Link className="rounded-lg bg-primary-500 px-4 py-3 text-sm font-semibold text-white" to="/app/procurement/purchase-orders">Purchase orders</Link>
      <Link className="rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold text-main" to="/app/procurement/deliveries">Record deliveries</Link>
      <Link className="rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold text-main" to="/app/procurement/supplier-invoices">Supplier invoices</Link>
      <Link className="rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold text-main" to="/app/procurement/inventory">Stock and job allocations</Link>
      <Link className="rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold text-main" to="/app/procurement/hire">Plant and tool hire</Link>
    </div>
    <div className="rounded-2xl border border-status-amber/40 bg-status-amber-pale p-5" role="status">
      <p className="font-semibold text-main">Further procurement workflows are still being completed</p>
      <p className="mt-2 text-sm text-main">Create and review material requisitions before ordering. Create quotation requests from approved requisitions, compare recorded supplier quotes and create a draft order from an accepted quote. RFQs are shared outside BuildNerve; supplier emails are not sent here. Invoice approval does not make a payment. Saving or approving an order records it internally; it does not send it to a supplier.</p>
    </div>
  </div>;
}
