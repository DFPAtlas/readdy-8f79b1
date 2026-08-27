import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { integrationConnectionsService, integrationMappingsService } from '@/services/integrations.service';
import type { IntegrationConnection, AccountMapping, TaxMapping, TrackingMapping } from '@/services/integrations.service';
import { useOrg } from '@/contexts/OrgContext';

const COST_CODES = ['LAB-001', 'MAT-002', 'SUB-003', 'PLANT-004', 'RET-005', 'CIS-006', 'DEP-007', 'VAT-008', 'OH-009', 'PROF-010'];
const TAX_TREATMENTS = ['standard', 'reduced', 'zero', 'exempt', 'reverse_charge', 'cis_labour', 'cis_materials', 'no_vat'];

export default function MappingsPage() {
  const navigate = useNavigate();
  const { organisation } = useOrg();
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [accounts, setAccounts] = useState<AccountMapping[]>([]);
  const [taxes, setTaxes] = useState<TaxMapping[]>([]);
  const [tracking, setTracking] = useState<TrackingMapping[]>([]);
  const [activeTab, setActiveTab] = useState<'accounts' | 'tax' | 'tracking'>('accounts');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!organisation?.id) return;
    try {
      setLoading(true);
      const conns = await integrationConnectionsService.getConnections(organisation.id);
      setConnections(conns.filter(c => c.status === 'connected'));
      if (conns.length > 0 && !selectedConnectionId) {
        const first = conns.find(c => c.status === 'connected');
        if (first) setSelectedConnectionId(first.id);
      }
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }, [organisation?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!selectedConnectionId) return;
    Promise.all([
      integrationMappingsService.getAccountMappings(selectedConnectionId),
      integrationMappingsService.getTaxMappings(selectedConnectionId),
      integrationMappingsService.getTrackingMappings(selectedConnectionId),
    ]).then(([a, t, tr]) => {
      setAccounts(a);
      setTaxes(t);
      setTracking(tr);
    });
  }, [selectedConnectionId]);

  const getAccountForCostCode = (code: string) => accounts.find(a => a.cost_code === code);
  const getTaxForTreatment = (treatment: string) => taxes.find(t => t.siteledger_tax_treatment === treatment);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><i className="ri-loader-4-line animate-spin text-2xl text-foreground-400"></i></div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <button onClick={() => navigate('/app/settings/integrations')} className="text-sm text-foreground-500 hover:text-foreground-700 mb-4 flex items-center gap-1 whitespace-nowrap">
        <i className="ri-arrow-left-s-line"></i> Back to integrations
      </button>

      <h2 className="text-2xl font-semibold text-foreground-950 mb-1">Entity mappings</h2>
      <p className="text-sm text-foreground-600 mb-6">Map BuildNerve codes to your accounting software.</p>

      {/* Connection selector */}
      {connections.length > 0 && (
        <div className="mb-6">
          <select
            value={selectedConnectionId}
            onChange={e => setSelectedConnectionId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-background-200/70 text-sm bg-white text-foreground-950"
          >
            {connections.map(c => (
              <option key={c.id} value={c.id}>{c.provider?.display_name} — {c.external_tenant_name || 'Connected'}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-background-100 rounded-full p-1 mb-6 w-fit">
        {(['accounts', 'tax', 'tracking'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-white text-foreground-950 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'}`}
          >
            {tab === 'accounts' ? 'Chart of accounts' : tab === 'tax' ? 'Tax codes' : 'Job tracking'}
          </button>
        ))}
      </div>

      {/* Accounts */}
      {activeTab === 'accounts' && (
        <div className="bg-background-50 border border-background-200/70 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider border-b border-background-200/70">
            <div className="col-span-4">Cost code</div>
            <div className="col-span-4">Description</div>
            <div className="col-span-4">External account</div>
          </div>
          {COST_CODES.map(code => {
            const mapping = getAccountForCostCode(code);
            return (
              <div key={code} className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-background-100/60 last:border-b-0 items-center">
                <div className="col-span-4"><span className="text-sm font-mono text-foreground-950">{code}</span></div>
                <div className="col-span-4"><span className="text-sm text-foreground-600">{mapping?.cost_description || '—'}</span></div>
                <div className="col-span-4">
                  {mapping?.external_account_code ? (
                    <span className="text-sm text-foreground-950">{mapping.external_account_code} — {mapping.external_account_name}</span>
                  ) : (
                    <span className="text-sm text-amber-600">Not mapped</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tax */}
      {activeTab === 'tax' && (
        <div className="bg-background-50 border border-background-200/70 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-medium text-foreground-500 uppercase tracking-wider border-b border-background-200/70">
            <div className="col-span-4">BuildNerve tax treatment</div>
            <div className="col-span-4">Provider tax code</div>
            <div className="col-span-4">Rate</div>
          </div>
          {TAX_TREATMENTS.map(treatment => {
            const mapping = getTaxForTreatment(treatment);
            return (
              <div key={treatment} className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-background-100/60 last:border-b-0 items-center">
                <div className="col-span-4"><span className="text-sm font-medium text-foreground-950 capitalize">{treatment.replace(/_/g, ' ')}</span></div>
                <div className="col-span-4">
                  {mapping ? (
                    <span className="text-sm text-foreground-950">{mapping.external_tax_code} — {mapping.external_tax_name}</span>
                  ) : (
                    <span className="text-sm text-amber-600">Not mapped</span>
                  )}
                </div>
                <div className="col-span-4"><span className="text-sm text-foreground-600">{mapping?.tax_rate ? `${(mapping.tax_rate * 100).toFixed(1)}%` : '—'}</span></div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tracking */}
      {activeTab === 'tracking' && (
        <div className="bg-background-50 border border-background-200/70 rounded-xl p-6 text-center">
          <p className="text-foreground-600 text-sm">Job tracking category mappings will appear here once your jobs are linked to provider projects.</p>
          {tracking.length > 0 && (
            <div className="mt-4 text-left">
              {tracking.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-background-100/60">
                  <span className="text-sm text-foreground-950">{t.local_job_id || t.local_cost_code || 'Unknown'}</span>
                  <span className="text-sm text-foreground-600">{t.external_tracking_name || t.external_tracking_id || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}