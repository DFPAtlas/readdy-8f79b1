import { useState } from 'react';
import type { FullJob } from '@/mocks/jobs';
import { getDemoHealthSafetyByJob, CDM_ROLE_LABELS, type DemoRams, type RamsStatus } from '@/mocks/health-safety';
import RamsGeneratorModal, { type RamsDraft } from './RamsGeneratorModal';
import { useOrg } from '@/contexts/OrgContext';
import { healthSafetyService } from '@/services/health-safety.service';
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

export default function HealthSafetyTab({ jobId, job }: HealthSafetyTabProps) {
  const { organisation } = useOrg();
  const { showToast } = useToast();
  const demo = getDemoHealthSafetyByJob(jobId);

  const [rams, setRams] = useState<DemoRams[]>(demo.rams);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleGenerate = (draft: RamsDraft) => {
    const newRams: DemoRams = {
      id: `rams-${Date.now()}`,
      title: draft.title,
      status: 'ai_generated',
      generatedByAi: true,
      version: 1,
      updatedAt: 'Just now',
      hazards: draft.hazards,
      controlMeasures: draft.controlMeasures,
    };
    setRams((prev) => [newRams, ...prev]);
    showToast('RAMS draft created — review and approve before use.', 'success');

    // Best-effort persist when a real organisation + job exist
    if (organisation?.id) {
      healthSafetyService
        .createRams({
          organisationId: organisation.id,
          jobId: job.id,
          title: draft.title,
          scopeSummary: draft.scopeSummary,
          hazards: draft.hazards,
          controlMeasures: draft.controlMeasures,
          generatedByAi: true,
        })
        .catch(() => {
          /* demo job ids are not persisted yet — local draft is kept */
        });
    }
  };

  const handleStatusChange = (id: string, status: RamsStatus) => {
    setRams((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              ...(status === 'approved' ? { approvedAt: 'Just now', approvedByName: 'You' } : {}),
            }
          : r,
      ),
    );
    if (organisation?.id) {
      healthSafetyService.updateRamsStatus(id, status).catch(() => {});
    }
    showToast(status === 'approved' ? 'RAMS approved.' : 'RAMS marked as reviewed.', 'success');
  };

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
          className="h-10 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
        >
          <i className="ri-sparkling-2-line"></i> Generate RAMS with Nerve
        </button>
      </div>

      {/* RAMS documents */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
            RAMS &amp; method statements <span className="text-muted normal-case">({rams.length})</span>
          </h3>
        </div>

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
              const status = RAMS_STATUS[r.status];
              const expanded = expandedId === r.id;
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
                        {r.generatedByAi && (
                          <span className="text-[10px] font-medium text-status-blue bg-status-blue-pale px-2 py-0.5 rounded-full flex items-center gap-1">
                            <i className="ri-robot-line"></i> AI
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted mt-1">
                        <span>v{r.version}</span>
                        <span>Updated {r.updatedAt}</span>
                        {r.reviewedByName && <span>Reviewed by {r.reviewedByName}</span>}
                        {r.approvedByName && <span>Approved by {r.approvedByName}</span>}
                      </div>
                    </div>
                    <i className={`ri-arrow-down-s-line text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}></i>
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 pl-[72px] grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-semibold text-main uppercase tracking-wider mb-2">Hazards</h4>
                        <ul className="space-y-1.5">
                          {r.hazards.map((h) => (
                            <li key={h} className="flex items-start gap-2 text-sm text-main">
                              <i className="ri-alert-line text-status-amber mt-0.5"></i>
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-main uppercase tracking-wider mb-2">Control measures</h4>
                        <ul className="space-y-1.5">
                          {r.controlMeasures.map((c) => (
                            <li key={c} className="flex items-start gap-2 text-sm text-main">
                              <i className="ri-shield-check-line text-primary-500 mt-0.5"></i>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {/* Status actions */}
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
          Toolbox talks <span className="text-muted normal-case">({demo.toolboxTalks.length})</span>
        </h3>
        {demo.toolboxTalks.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-6 text-center text-sm text-muted">
            No toolbox talks recorded for this job yet.
          </div>
        ) : (
          <div className="space-y-2">
            {demo.toolboxTalks.map((tt) => (
              <div key={tt.id} className="bg-white border border-border rounded-2xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-status-blue-pale flex items-center justify-center flex-shrink-0">
                  <i className="ri-megaphone-line text-status-blue"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-main">{tt.topic}</p>
                  <p className="text-xs text-muted mt-0.5">
                    Delivered {tt.deliveredAt} by {tt.deliveredByName}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <i className="ri-team-line text-muted text-xs"></i>
                    <span className="text-xs text-muted">{tt.attendees.length} attendees</span>
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
          CDM duty holders <span className="text-muted normal-case">({demo.dutyHolders.length})</span>
        </h3>
        {demo.dutyHolders.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl p-6 text-center text-sm text-muted">
            No CDM duty holders recorded for this job.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {demo.dutyHolders.map((dh) => (
              <div key={dh.id} className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <i className="ri-user-star-line text-primary-600"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-semibold text-primary-600 uppercase tracking-wider">
                    {CDM_ROLE_LABELS[dh.role]}
                  </span>
                  <p className="text-sm font-semibold text-main truncate">{dh.name}</p>
                  {dh.appointedAt && <p className="text-xs text-muted">Appointed {dh.appointedAt}</p>}
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