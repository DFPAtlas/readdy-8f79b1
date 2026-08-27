// AI & Automation Settings Page
import { useState, useEffect } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { assistService } from '@/services/assist.service';

export default function AiAutomationSettingsPage() {
  const { organisation } = useOrg();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [aiEnabled, setAiEnabled] = useState(false);
  const [permittedFeatures, setPermittedFeatures] = useState<string[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState(1000);
  const [dataRetention, setDataRetention] = useState(30);
  const [allowTraining, setAllowTraining] = useState(false);
  const [conversationHistory, setConversationHistory] = useState(true);
  const [providerKey, setProviderKey] = useState('openai');
  const [emergencyProcedure, setEmergencyProcedure] = useState('');
  const [perRoleAccess, setPerRoleAccess] = useState<Record<string, string>>({});
  const [redactionRules, setRedactionRules] = useState<string[]>([]);

  const [usageMonthCost, setUsageMonthCost] = useState(0);
  const [usageMonthLimit, setUsageMonthLimit] = useState(100000);
  const [isAdmin, setIsAdmin] = useState(false);

  const orgId = organisation?.id;

  useEffect(() => {
    if (!orgId) return;
    loadSettings();
  }, [orgId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await assistService.getSettings(orgId);
      const s = data.settings || {};
      setAiEnabled(s.ai_enabled ?? false);
      setPermittedFeatures(s.permitted_features || []);
      setMonthlyBudget((s.monthly_budget_limit_pence || 100000) / 100);
      setDataRetention(s.data_retention_days ?? 30);
      setAllowTraining(s.allow_model_training ?? false);
      setConversationHistory(s.conversation_history_enabled ?? true);
      setProviderKey(s.provider_key || 'openai');
      setEmergencyProcedure(s.emergency_procedure_text || '');
      setPerRoleAccess(s.per_role_access || {});
      setRedactionRules(s.redaction_rules || []);
      setUsageMonthCost(data.usage?.monthCostPence || 0);
      setUsageMonthLimit(data.usage?.monthLimitPence || 100000);
      setIsAdmin(data.isAdmin);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!orgId) return;
    try {
      setSaving(true);
      setError(null);
      await assistService.saveSettings(orgId, {
        ai_enabled: aiEnabled,
        permitted_features: permittedFeatures,
        monthly_budget_limit_pence: Math.round(monthlyBudget * 100),
        data_retention_days: dataRetention,
        allow_model_training: allowTraining,
        conversation_history_enabled: conversationHistory,
        provider_key: providerKey,
        emergency_procedure_text: emergencyProcedure,
        per_role_access: perRoleAccess,
        redaction_rules: redactionRules,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const featureOptions = [
    { key: 'job_briefing', label: 'Job briefing summaries' },
    { key: 'document_qa', label: 'Document Q&A' },
    { key: 'extraction', label: 'Document extraction' },
    { key: 'search', label: 'Natural language search' },
    { key: 'drafts', label: 'Draft generation' },
    { key: 'comparison', label: 'Document comparison' },
  ];

  const roles = ['owner', 'admin', 'project_manager', 'supervisor', 'finance', 'employee'];
  const roleLabels: Record<string, string> = {
    owner: 'Owner', admin: 'Admin', project_manager: 'Project Manager',
    supervisor: 'Supervisor', finance: 'Finance', employee: 'Employee',
  };

  const redactionOptions = [
    { key: 'bank_details', label: 'Bank details (sort codes, account numbers)' },
    { key: 'ni_number', label: 'National Insurance numbers' },
    { key: 'medical', label: 'Medical / health data' },
    { key: 'identity', label: 'Identity documents (passport, driving licence)' },
    { key: 'salary', label: 'Salary / pay information' },
    { key: 'witness', label: 'Witness statements' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <i className="ri-loader-4-line animate-spin text-2xl text-foreground-400"></i>
      </div>
    );
  }

  const usagePct = usageMonthLimit > 0 ? Math.round((usageMonthCost / usageMonthLimit) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground-950">AI &amp; Automation</h1>
        <p className="text-sm text-foreground-500 mt-1">Configure SiteLedger Assist for your organisation</p>
      </div>

      {!isAdmin && (
        <div className="p-4 rounded-xl bg-status-amber-pale border border-status-amber/20 mb-8">
          <p className="text-sm text-status-amber">Only organisation admins can modify AI settings. You are viewing these in read-only mode.</p>
        </div>
      )}

      {/* Enable toggle */}
      <section className="bg-white rounded-2xl border border-background-200 p-5 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground-950">Enable SiteLedger Assist</h2>
            <p className="text-xs text-foreground-500 mt-0.5">AI is disabled by default for all organisations</p>
          </div>
          <button
            onClick={() => isAdmin && setAiEnabled(!aiEnabled)}
            disabled={!isAdmin}
            className={`w-11 h-6 rounded-full transition-colors relative ${aiEnabled ? 'bg-primary-500' : 'bg-foreground-200'} ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${aiEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`}></span>
          </button>
        </div>
      </section>

      {/* Usage */}
      <section className="bg-white rounded-2xl border border-background-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-foreground-950 mb-3">Monthly Usage</h2>
        <div className="flex items-end justify-between mb-2">
          <span className="text-2xl font-bold text-foreground-950">£{(usageMonthCost / 100).toFixed(2)}</span>
          <span className="text-xs text-foreground-500">of £{(usageMonthLimit / 100).toFixed(2)} limit</span>
        </div>
        <div className="w-full h-2 rounded-full bg-background-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${usagePct > 90 ? 'bg-status-red' : usagePct > 70 ? 'bg-status-amber' : 'bg-primary-500'}`}
            style={{ width: `${Math.min(usagePct, 100)}%` }}
          ></div>
        </div>
        <p className="text-[11px] text-foreground-400 mt-1.5">{usagePct}% of monthly budget used</p>
      </section>

      {/* Budget */}
      <section className="bg-white rounded-2xl border border-background-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-foreground-950 mb-3">Budget</h2>
        <div>
          <label className="text-xs font-medium text-foreground-700">Monthly budget (£)</label>
          <input
            type="number"
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(Number(e.target.value))}
            disabled={!isAdmin}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-background-200 text-sm focus:outline-none focus:border-primary-300 disabled:opacity-50"
            min={1}
          />
          <p className="text-[11px] text-foreground-400 mt-1">The assistant will stop when the monthly budget is reached</p>
        </div>
      </section>

      {/* Permitted Features */}
      <section className="bg-white rounded-2xl border border-background-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-foreground-950 mb-3">Permitted Features</h2>
        <div className="space-y-2">
          {featureOptions.map((feat) => (
            <label key={feat.key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={permittedFeatures.includes(feat.key)}
                onChange={() => {
                  if (!isAdmin) return;
                  setPermittedFeatures(prev =>
                    prev.includes(feat.key) ? prev.filter(f => f !== feat.key) : [...prev, feat.key]
                  );
                }}
                disabled={!isAdmin}
                className="w-4 h-4 rounded border-background-300 text-primary-500 focus:ring-primary-400"
              />
              <span className="text-sm text-foreground-800">{feat.label}</span>
            </label>
          ))}
        </div>
        <p className="text-[11px] text-foreground-400 mt-2">If none are selected, all features are permitted</p>
      </section>

      {/* Role Access */}
      <section className="bg-white rounded-2xl border border-background-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-foreground-950 mb-3">Per-Role Access</h2>
        <div className="space-y-2">
          {roles.map((role) => (
            <div key={role} className="flex items-center justify-between">
              <span className="text-sm text-foreground-800">{roleLabels[role] || role}</span>
              <select
                value={perRoleAccess[role] || 'assist'}
                onChange={(e) => {
                  if (!isAdmin) return;
                  setPerRoleAccess(prev => ({ ...prev, [role]: e.target.value }));
                }}
                disabled={!isAdmin}
                className="px-2.5 py-1.5 rounded-lg border border-background-200 text-sm bg-background-50 disabled:opacity-50"
              >
                <option value="full">Full access</option>
                <option value="assist">Assist only</option>
                <option value="none">None</option>
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* Redaction Rules */}
      <section className="bg-white rounded-2xl border border-background-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-foreground-950 mb-3">Redaction Rules</h2>
        <p className="text-xs text-foreground-500 mb-3">Sensitive data categories that will be automatically redacted from AI output</p>
        <div className="space-y-2">
          {redactionOptions.map((opt) => (
            <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={redactionRules.includes(opt.key)}
                onChange={() => {
                  if (!isAdmin) return;
                  setRedactionRules(prev =>
                    prev.includes(opt.key) ? prev.filter(f => f !== opt.key) : [...prev, opt.key]
                  );
                }}
                disabled={!isAdmin}
                className="w-4 h-4 rounded border-background-300 text-primary-500 focus:ring-primary-400"
              />
              <span className="text-sm text-foreground-800">{opt.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Data Controls */}
      <section className="bg-white rounded-2xl border border-background-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-foreground-950 mb-3">Data Controls</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground-800">Conversation history</p>
              <p className="text-xs text-foreground-500">Save chat history for future reference</p>
            </div>
            <button
              onClick={() => isAdmin && setConversationHistory(!conversationHistory)}
              disabled={!isAdmin}
              className={`w-11 h-6 rounded-full transition-colors relative ${conversationHistory ? 'bg-primary-500' : 'bg-foreground-200'} ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${conversationHistory ? 'translate-x-[22px]' : 'translate-x-0.5'}`}></span>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground-800">Allow model training</p>
              <p className="text-xs text-foreground-500">Permit OpenAI to use data for model improvement (default: deny)</p>
            </div>
            <button
              onClick={() => isAdmin && setAllowTraining(!allowTraining)}
              disabled={!isAdmin}
              className={`w-11 h-6 rounded-full transition-colors relative ${allowTraining ? 'bg-status-amber' : 'bg-foreground-200'} ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${allowTraining ? 'translate-x-[22px]' : 'translate-x-0.5'}`}></span>
            </button>
          </div>
          <div>
            <label className="text-sm text-foreground-800 block">Data retention (days)</label>
            <input
              type="number"
              value={dataRetention}
              onChange={(e) => setDataRetention(Number(e.target.value))}
              disabled={!isAdmin}
              className="mt-1 w-32 px-3 py-2 rounded-lg border border-background-200 text-sm focus:outline-none focus:border-primary-300 disabled:opacity-50"
              min={1}
              max={365}
            />
          </div>
        </div>
      </section>

      {/* Emergency Procedure */}
      <section className="bg-white rounded-2xl border border-background-200 p-5 mb-4">
        <h2 className="text-sm font-semibold text-foreground-950 mb-3">Emergency Procedure</h2>
        <p className="text-xs text-foreground-500 mb-2">Displayed when the assistant detects emergency-related language</p>
        <textarea
          value={emergencyProcedure}
          onChange={(e) => setEmergencyProcedure(e.target.value)}
          disabled={!isAdmin}
          placeholder="If this is an emergency, call 999 immediately. Site emergency contact: [name] - [phone]. Site address: [address]. Nearest A&amp;E: [hospital]."
          className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm focus:outline-none focus:border-primary-300 resize-none h-24 disabled:opacity-50"
          maxLength={500}
        />
      </section>

      {/* Privacy notice */}
      <section className="bg-status-amber-pale rounded-2xl border border-status-amber/20 p-5 mb-6">
        <h2 className="text-sm font-semibold text-foreground-950 mb-2">Data Privacy</h2>
        <ul className="space-y-1.5 text-xs text-foreground-600">
          <li>&bull; Data sent to {providerKey === 'openai' ? 'OpenAI' : providerKey} for processing</li>
          <li>&bull; Data is subject to the provider's data processing terms</li>
          <li>&bull; AI-generated content is labelled AI-assisted until reviewed</li>
          <li>&bull; Source deletion removes associated AI indexes</li>
          <li>&bull; Conversation deletion does not delete source records</li>
        </ul>
      </section>

      {/* Save */}
      {isAdmin && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && (
            <span className="text-sm text-primary-600 font-medium flex items-center gap-1">
              <i className="ri-check-line"></i> Saved
            </span>
          )}
          {error && <span className="text-sm text-status-red">{error}</span>}
        </div>
      )}
    </div>
  );
}