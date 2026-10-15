export default function ProcurementPortal() {
  return (
    <div className="px-4 md:px-6 py-6 md:py-8 max-w-[1400px] mx-auto">
      <div className="rounded-2xl border border-status-amber/40 bg-status-amber-pale p-6 md:p-8" role="status">
        <p className="text-xs font-semibold uppercase tracking-wider text-status-amber">Live procurement data not connected</p>
        <h1 className="mt-2 text-2xl font-semibold text-main">Material Procurement &amp; Supplier Financials</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-main">
          The previous screen showed sample jobs, orders and invoices, and its actions did not save changes.
          Those examples have been removed until requisitions, purchase orders, deliveries and invoice matching are connected to this organisation.
        </p>
      </div>
    </div>
  );
}
