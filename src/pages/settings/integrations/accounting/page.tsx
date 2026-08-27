import { useNavigate } from 'react-router-dom';

export default function AccountingSettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
      <button onClick={() => navigate('/app/settings/integrations')} className="text-sm text-foreground-500 hover:text-foreground-700 mb-4 flex items-center gap-1 whitespace-nowrap">
        <i className="ri-arrow-left-s-line"></i> Back to integrations
      </button>

      <h2 className="text-2xl font-semibold text-foreground-950 mb-1">Accounting settings</h2>
      <p className="text-sm text-foreground-600 mb-8">Configure your accounting integration preferences, tax defaults, and financial year settings.</p>

      <div className="space-y-6">
        {/* Financial year */}
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-5">
          <h3 className="text-base font-semibold text-foreground-950 mb-4">Financial year</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1">Year end date</label>
              <select className="w-full px-3 py-2 rounded-lg border border-background-200/70 text-sm bg-white text-foreground-950">
                <option value="03-31">31 March</option>
                <option value="04-05">5 April</option>
                <option value="12-31">31 December</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1">Base currency</label>
              <select className="w-full px-3 py-2 rounded-lg border border-background-200/70 text-sm bg-white text-foreground-950">
                <option value="GBP">GBP — Pound Sterling</option>
                <option value="EUR">EUR — Euro</option>
                <option value="USD">USD — US Dollar</option>
              </select>
            </div>
          </div>
        </div>

        {/* VAT settings */}
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-5">
          <h3 className="text-base font-semibold text-foreground-950 mb-4">VAT settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1">VAT registration number</label>
              <input type="text" placeholder="GB 123 4567 89" className="w-full px-3 py-2 rounded-lg border border-background-200/70 text-sm bg-white text-foreground-950 max-w-sm" />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="vatRegistered" defaultChecked className="rounded" />
              <label htmlFor="vatRegistered" className="text-sm text-foreground-700">VAT registered</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="flatRate" className="rounded" />
              <label htmlFor="flatRate" className="text-sm text-foreground-700">Flat Rate Scheme</label>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="cisGross" className="rounded" />
              <label htmlFor="cisGross" className="text-sm text-foreground-700">CIS gross payment status</label>
            </div>
          </div>
        </div>

        {/* CIS settings */}
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-5">
          <h3 className="text-base font-semibold text-foreground-950 mb-4">CIS settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1">CIS registration number</label>
              <input type="text" placeholder="Enter your CIS UTR" className="w-full px-3 py-2 rounded-lg border border-background-200/70 text-sm bg-white text-foreground-950 max-w-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1">Default CIS deduction rate</label>
              <select className="w-full px-3 py-2 rounded-lg border border-background-200/70 text-sm bg-white text-foreground-950 max-w-sm">
                <option value="20">20% — Standard (registered subcontractor)</option>
                <option value="30">30% — Higher (unmatched subcontractor)</option>
                <option value="0">0% — Gross payment</option>
              </select>
            </div>
          </div>
        </div>

        {/* Invoice numbering */}
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-5">
          <h3 className="text-base font-semibold text-foreground-950 mb-4">Invoice numbering</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1">Sales invoice prefix</label>
              <input type="text" defaultValue="INV-" className="w-full px-3 py-2 rounded-lg border border-background-200/70 text-sm bg-white text-foreground-950" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1">Next number</label>
              <input type="number" defaultValue="1001" className="w-full px-3 py-2 rounded-lg border border-background-200/70 text-sm bg-white text-foreground-950" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1">Purchase order prefix</label>
              <input type="text" defaultValue="PO-" className="w-full px-3 py-2 rounded-lg border border-background-200/70 text-sm bg-white text-foreground-950" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button className="px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap">
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}