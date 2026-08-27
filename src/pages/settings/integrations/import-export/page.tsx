import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { importService } from '@/services/integrations.service';
import type { ImportBatch } from '@/services/integrations.service';
import { useOrg } from '@/contexts/OrgContext';

const IMPORT_TYPES = [
  { key: 'clients', label: 'Clients / contacts', icon: 'ri-user-line' },
  { key: 'suppliers', label: 'Suppliers', icon: 'ri-store-line' },
  { key: 'chart_of_accounts', label: 'Chart of accounts', icon: 'ri-book-2-line' },
  { key: 'sales_invoices', label: 'Sales invoices', icon: 'ri-file-list-3-line' },
  { key: 'supplier_bills', label: 'Supplier bills', icon: 'ri-bill-line' },
  { key: 'payments', label: 'Payments', icon: 'ri-bank-card-line' },
  { key: 'cis_records', label: 'CIS records', icon: 'ri-government-line' },
  { key: 'job_costs', label: 'Job cost summaries', icon: 'ri-pie-chart-line' },
];

export default function ImportExportPage() {
  const navigate = useNavigate();
  const { organisation } = useOrg();
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'history'>('import');
  const [selectedType, setSelectedType] = useState<string>('clients');
  const [uploading, setUploading] = useState(false);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [batchesLoaded, setBatchesLoaded] = useState(false);

  const loadBatches = async () => {
    if (!organisation?.id) return;
    try {
      const data = await importService.getBatches(organisation.id);
      setBatches(data);
      setBatchesLoaded(true);
    } catch (err) {
      console.error('Failed to load batches:', err);
    }
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !organisation?.id) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await importService.createBatch(
          organisation.id,
          `IMPORT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
          selectedType,
          file.name,
          '00000000-0000-0000-0000-000000000000', // placeholder user
        );
      }
      await loadBatches();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <button onClick={() => navigate('/app/settings/integrations')} className="text-sm text-foreground-500 hover:text-foreground-700 mb-4 flex items-center gap-1 whitespace-nowrap">
        <i className="ri-arrow-left-s-line"></i> Back to integrations
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground-950 mb-1">Import & export</h2>
          <p className="text-sm text-foreground-600">Bulk import data from CSV files or export records for external use.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-background-100 rounded-full p-1 mb-6 w-fit">
        {(['import', 'export', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); if (tab === 'history') loadBatches(); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize whitespace-nowrap ${activeTab === tab ? 'bg-white text-foreground-950 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Import */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="bg-background-50 border border-background-200/70 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground-950 mb-4">Step 1: Select data type</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {IMPORT_TYPES.map(type => (
                <button
                  key={type.key}
                  onClick={() => setSelectedType(type.key)}
                  className={`p-3 rounded-lg border text-left transition-colors ${selectedType === type.key ? 'border-primary-300 bg-primary-50' : 'border-background-200/70 hover:border-background-300/60'}`}
                >
                  <i className={`${type.icon} text-lg block mb-1 ${selectedType === type.key ? 'text-primary-600' : 'text-foreground-500'}`}></i>
                  <span className="text-sm font-medium text-foreground-950">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-background-50 border border-background-200/70 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground-950 mb-4">Step 2: Upload CSV file</h3>
            <div className="border-2 border-dashed border-background-300/60 rounded-xl p-8 text-center">
              <i className="ri-upload-cloud-2-line text-3xl text-foreground-400 mb-3 block"></i>
              <p className="text-sm text-foreground-600 mb-2">Drag and drop CSV files here, or click to browse</p>
              <p className="text-xs text-foreground-400 mb-4">Header row required with column names</p>
              <label className="inline-block px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium cursor-pointer hover:bg-primary-600 transition-colors whitespace-nowrap">
                {uploading ? 'Uploading...' : 'Browse files'}
                <input type="file" accept=".csv" multiple onChange={handleFilesSelected} className="hidden" disabled={uploading} />
              </label>
            </div>
          </div>

          <div className="bg-background-100/60 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-foreground-950 mb-2">Import workflow</h4>
            <ol className="text-sm text-foreground-600 space-y-1 list-decimal list-inside">
              <li>Upload your CSV file</li>
              <li>Auto-detect headers and preview data</li>
              <li>Map columns to SiteLedger fields</li>
              <li>Validate records for errors</li>
              <li>Preview creates, updates, and skips</li>
              <li>Confirm and process in batches</li>
              <li>Download error report for any failed rows</li>
            </ol>
          </div>
        </div>
      )}

      {/* Export */}
      {activeTab === 'export' && (
        <div className="space-y-4">
          <p className="text-sm text-foreground-600 mb-4">Select data to export as CSV. These files can be imported into your accounting software or used for reporting.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {IMPORT_TYPES.map(type => (
              <div key={type.key} className="bg-background-50 border border-background-200/70 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-secondary-100 flex items-center justify-center flex-shrink-0">
                    <i className={`${type.icon} text-secondary-600`}></i>
                  </div>
                  <span className="text-sm font-medium text-foreground-950">{type.label}</span>
                </div>
                <button className="px-3 py-1.5 rounded-lg border border-background-200/70 text-sm text-foreground-700 hover:bg-background-100 transition-colors whitespace-nowrap">
                  <i className="ri-download-line mr-1"></i>Export
                </button>
              </div>
            ))}
          </div>

          <div className="bg-background-50 border border-background-200/70 rounded-xl p-5 mt-6">
            <h4 className="text-sm font-semibold text-foreground-950 mb-2">Direct accounting export</h4>
            <p className="text-sm text-foreground-600">
              Connected accounting providers support direct export — no CSV needed. Connect Xero or QuickBooks for seamless push of invoices, bills, and payments.
            </p>
          </div>
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div>
          {batches.length === 0 ? (
            <div className="bg-background-50 border border-background-200/70 rounded-xl p-12 text-center">
              <i className="ri-file-excel-2-line text-4xl text-foreground-300 mb-3 block"></i>
              <p className="text-foreground-600">No import history yet.</p>
            </div>
          ) : (
            <div className="bg-background-50 border border-background-200/70 rounded-xl overflow-hidden">
              <div className="grid grid-cols-8 gap-3 px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider border-b border-background-200/70">
                <div className="col-span-2">Reference</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-1">Rows</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Date</div>
              </div>
              {batches.map(batch => (
                <div key={batch.id} className="grid grid-cols-8 gap-3 px-5 py-3 border-b border-background-100/60 last:border-b-0 items-center text-sm">
                  <div className="col-span-2"><span className="text-foreground-950 font-mono text-xs">{batch.batch_reference}</span></div>
                  <div className="col-span-2"><span className="text-foreground-600 capitalize">{batch.import_type.replace(/_/g, ' ')}</span></div>
                  <div className="col-span-1"><span className="text-foreground-600">{batch.total_rows}</span></div>
                  <div className="col-span-2"><span className="text-xs font-medium capitalize text-foreground-600">{batch.status}</span></div>
                  <div className="col-span-1"><span className="text-foreground-500 text-xs">{new Date(batch.created_at).toLocaleDateString()}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}