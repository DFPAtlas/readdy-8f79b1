import { useState, useEffect, useCallback } from 'react';
import type { FullJob } from '@/mocks/jobs';
import RamsGeneratorModal, { type RamsDraft } from './RamsGeneratorModal';
import { useOrg } from '@/contexts/OrgContext';
import { healthSafetyService, type RamsDocument, type RamsStatus, type ToolboxTalk, type CdmDutyHolder, type CdmRole } from '@/services/health-safety.service';
import { useToast } from '@/components/base/Toast';

interface HealthSafetyTabProps {
  jobId: string;
  job: FullJob;
}

const RAMS_STATUS: Record<RamsStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-status-amber-pale text-status-amber' },
  ai_generated: { label: 'AI draft', cls: 'bg-status-blue-pale text-status-blue' },
  reviewed: { label: 'Reviewed', cls: 'bg-status-blue-pale text-status-blue' },
  approved: { label: 'Approved', cls: 'bg-primary-50 text-primary-700' },
  superseded: { label: 'Superseded', cls: 'bg-page text-muted' },
};

const CDM_ROLE_LABELS: Record<CdmRole, string> = {
  client: 'Client',
  principal_designer: 'Principal Designer',
  principal_contractor: 'Principal Contractor',
  contractor: 'Contractor',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function HealthSafetyTab({ jobId, job }: HealthSafetyTabProps) {
  const { organisation } = useOrg();
  const { showToast } = useToast();
  const orgId = organisation?.id ?? null;

  const [rams, setRams] = useState<RamsDocument[]>([]);
  const [toolboxTalks, setToolboxTalks] = useState<ToolboxTalk[]>([]);
  const [dutyHolders, setDutyHolders] = useState<CdmDutyHolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [ramsRows, talkRows, holderRows] = await Promise.all([
        healthSafetyService.listRams(orgId, jobId),
        healthSafetyService.listToolboxTalks(orgId, jobId),
        healthSafetyService.listDutyHolders(orgId, jobId),
      ]);
      setRams(ramsRows);
      setToolboxTalks(talkRows);
      setDutyHolders(holderRows);
    } catch (err) {
      console.error('Failed to load health & safety records:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load health & safety records.');
    } finally {
      setLoading(false);
    }
  }, [orgId, jobId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async (draft: RamsDraft) => {
    if (!orgId) return;
    setSaving(true);
    try {
      const created = await healthSafetyService.createRams({
        organisationId: orgId,
        jobId: job.id,
        title: draft.title,
        scopeSummary: draft.scopeSummary,
        hazards: draft.hazards,
        controlMeasures: draft.controlMeasures,
        generatedByAi: true,
      });
      setRams((prev) => [created, ...prev]);
      showToast('RAMS draft created — review and approve before use.', 'success');
    } catch (err) {
      console.error('Failed to save RAMS:', err);
      showToast('Could not save the RAMS draft. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: RamsStatus) => {
    try {
      await healthSafetyService.updateRamsStatus(id, status);
      setRams((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      showToast(status === 'approved' ? 'RAMS approved.' : 'RAMS updated.', 'success');
    } catch (err) {
      console.error('Failed to update RAMS status:', err);
      showToast('Could not update the RAMS status. Please try again.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <i className="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-status-red-pale border border-status-red/20 rounded-2xl p-6 text-center">
        <i className="ri-error-warning-line text-2xl text-status-red"></i>
        <p className="text-sm font-medium text-status-red mt-2">{loadError}</p>
        <button
          className="mt-3 h-9 px-4 border border-status-red/30 text-status-red text-sm font-medium rounded-xl hover:bg-white/60 transition-colors cursor-pointer whitespace-nowrap"
          onClick={loadData}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-main">Health &amp; safety</h2>
          <p className="text-sm text-muted">RAMS, toolbox talks and CDM duty holders for this job.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          disabled={saving}
          className="h-10 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2 disabled:opacity-60"
        >
          <i className="ri-sparkling-2-line"></i> Generate RAMS with Nerve
        </button>
      </div>

      {/* RAMS documents */}
      <section>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
          RAMS &amp; method statements <span className="text-muted normal-case">({rams.length})</span>
        </h3>

        {rams.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-page flex items-center justify-center mx-auto mb-3">
              <i className="ri-file-shield-line text-2xl text-muted"></i>
            </div>
            <h4 className="text-sm font-semibold text-main">No RAMS documents yet</h4>
            <p className="text-sm text-muted mt-1 max-w-md mx-auto">
              Generate a risk assessment &amp; method statement with Nerve to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rams.map((r) => {
              const status = RAMS_STATUS[r.status] || RAMS_STATUS.draft;
              const expanded = expandedId === r.id;
              const hazards = Array.isArray(r.hazards) ? r.hazards : [];
              const controls = Array.isArray(r.control_measures) ? r.control_measures : [];
              return (
                <div key={r.id} className="bg-white border border-border rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expanded ? null : r.id)}
                    className="w-full flex items-start gap-4 p-4 text-left cursor-pointer hover:bg-page/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-page flex items-center justify-center flex-shrink-0">
                      <i className="ri-file-shield-line text-xl text-muted"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-main">{r.title}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
                        {r.generated_by_ai && (
                          <span className="text-[10px] font-medium text-status-blue bg-status-blue-pale px-2 py-0.5 rounded-full flex items-center gap-1">
                            <i className="ri-robot-line"></i> AI
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted mt-1">
                        <span>v{r.version}</span>
                        <span>Updated {formatDate(r.updated_at)}</span>
                        {r.approved_at && <span>Approved {formatDate(r.approved_at)}</span>}
                      </div>
                    </div>
                    <i className={`ri-arrow-down-s-line text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}></i>
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 pl-[72px] grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-semibold text-main uppercase tracking-wider mb-2">Hazards</h4>
                        {hazards.length === 0 ? (
                          <p className="text-sm text-muted">No hazards recorded.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {hazards.map((h) => (
                              <li key={h} className="flex items-start gap-2 text-sm text-main">
                                <i className="ri-alert-line text-status-amber mt-0.5"></i>
                                <span>{h}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-main uppercase tracking-wider mb-2">Control measures</h4>
                        {controls.length === 0 ? (
                          <p className="text-sm text-muted">No control measures recorded.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {controls.map((c) => (
                              <li key={c} className="flex items-start gap-2 text-sm text-main">
                                <i className="ri-shield-check-line text-primary-500 mt-0.5"></i>
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {r.status !== 'approved' && r.status !== 'superseded' && (
                        <div className="lg:col-span-2 flex gap-2 pt-1">
                          {r.status === 'draft' && (
                            <button
                              onClick={() => handleStatusChange(r.id, 'reviewed')}
                              className="h-9 px-3 border border-border text-main text-xs font-medium rounded-lg hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Mark as reviewed
                            </button>
                          )}
                          <button
                            onClick={() => handleStatusChange(r.id, 'approved')}
                            className="h-9 px-3 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Approve
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Toolbox talks */}
      <section>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
          Toolbox talks <span className="text-muted normal-case">({toolboxTalks.length})</span>
        </h3>
        {toolboxTalks.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-6 text-center text-sm text-muted">
            No toolbox talks recorded for this job yet.
          </div>
        ) : (
          <div className="space-y-2">
            {toolboxTalks.map((tt) => (
              <div key={tt.id} className="bg-white border border-border rounded-2xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-status-blue-pale flex items-center justify-center flex-shrink-0">
                  <i className="ri-megaphone-line text-status-blue"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-main">{tt.topic}</p>
                  <p className="text-xs text-muted mt-0.5">Delivered {formatDate(tt.delivered_at)}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <i className="ri-team-line text-muted text-xs"></i>
                    <span className="text-xs text-muted">{(tt.attendees || []).length} attendees</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CDM duty holders */}
      <section>
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
          CDM duty holders <span className="text-muted normal-case">({dutyHolders.length})</span>
        </h3>
        {dutyHolders.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-6 text-center text-sm text-muted">
            No CDM duty holders recorded for this job.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dutyHolders.map((dh) => (
              <div key={dh.id} className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <i className="ri-user-star-line text-primary-600"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-semibold text-primary-600 uppercase tracking-wider">
                    {CDM_ROLE_LABELS[dh.role] || dh.role}
                  </span>
                  <p className="text-sm font-semibold text-main truncate">{dh.person_or_org_name}</p>
                  {dh.appointed_at && <p className="text-xs text-muted">Appointed {formatDate(dh.appointed_at)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {modalOpen && (
        <RamsGeneratorModal
          defaultTitle={`${job.trade} RAMS`}
          defaultScope={job.description}
          onClose={() => setModalOpen(false)}
          onSave={handleGenerate}
        />
      )}
    </div>
  );
}