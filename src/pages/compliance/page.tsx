export default function CompliancePage() {
  return (
    <div className="px-4 md:px-6 py-6 md:py-8 max-w-[1400px] mx-auto">
      <div className="rounded-2xl border border-status-amber/40 bg-status-amber-pale p-6 md:p-8" role="status">
        <p className="text-xs font-semibold uppercase tracking-wider text-status-amber">CIS integration not ready</p>
        <h1 className="mt-2 text-2xl font-semibold text-main">Subcontractor CIS &amp; Compliance</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-main">
          Live HMRC verification and CIS return filing are not connected yet. The previous screen used sample records,
          so those figures and checks have been removed. Do not use this page to verify a subcontractor or prepare a tax return.
        </p>
      </div>
    </div>
  );
}
