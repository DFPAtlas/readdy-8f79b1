import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { getVariationById, getVariationStatusLabel, getVariationStatusColor } from '@/mocks/clients';
import { demoFullJobs } from '@/mocks/jobs';
import { useToast } from '@/components/base/Toast';
import ConfirmDialog from '@/components/base/ConfirmDialog';

export default function VariationDetail() {
  const { t } = useTranslation();
  const { variationId } = useParams<{ variationId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showWithdraw, setShowWithdraw] = useState(false);

  const variation = getVariationById(variationId || '');
  const job = variation ? demoFullJobs.find((j) => j.id === variation.jobId) : undefined;
  const currentVersion = variation?.versions.find((v) => v.version === variation.currentVersion);

  if (!variation || !currentVersion) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
          <i className="ri-price-tag-3-line text-2xl text-muted"></i>
        </div>
        <h2 className="text-lg font-semibold text-main mb-2">Variation not found</h2>
        <p className="text-sm text-muted mb-4">This variation doesn&apos;t exist or has been archived.</p>
        <button className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold cursor-pointer" onClick={() => navigate('/variations')}>
          Back to variations
        </button>
      </div>
    );
  }

  const statusColor = getVariationStatusColor(variation.status);
  const statusLabel = getVariationStatusLabel(variation.status);
  const formatMoney = (v: number) => '£' + v.toLocaleString('en-GB');

  const canEdit = ['draft', 'internal_review'].includes(variation.status);
  const canSend = ['draft', 'internal_review', 'ready_to_send'].includes(variation.status);

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
      <button className="text-sm font-medium text-muted hover:text-main transition-colors cursor-pointer flex items-center gap-1" onClick={() => navigate('/variations')}>
        <i className="ri-arrow-left-line text-base"></i>
        Back to variations
      </button>

      {/* Header */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="text-[11px] font-semibold text-primary-500 uppercase tracking-wider">{variation.reference}</span>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
              <span className="text-[10px] text-muted bg-page px-2 py-0.5 rounded-md">{variation.requestedBy}</span>
            </div>
            <h1 className="text-xl font-bold text-main">{variation.title}</h1>
            <p className="text-sm text-muted mt-1">
              {variation.jobRef} · {variation.jobName} · {variation.clientName}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted">
              <span>Created {new Date(variation.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              {variation.sentAt && <span>· Sent {new Date(variation.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
              {variation.viewedAt && <span>· Viewed {new Date(variation.viewedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
              {variation.approvedAt && <span>· Approved {new Date(variation.approvedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <button
              className="h-9 px-3.5 border border-border text-main text-sm font-medium rounded-xl hover:bg-page cursor-pointer whitespace-nowrap"
              onClick={() => showToast('Edit variation (demo).', 'info')}
            >
              <i className="ri-edit-line mr-1"></i>{t('dashboard.editJob')}
            </button>
            <button
              className="h-9 px-3.5 border border-status-red text-status-red text-sm font-medium rounded-xl hover:bg-status-red-pale cursor-pointer whitespace-nowrap"
              onClick={() => setShowWithdraw(true)}
            >
              {t('dashboard.variations.withdrawVariation')}
            </button>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Description</h3>
            <p className="text-sm text-main leading-relaxed mb-4">{currentVersion.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentVersion.includedWork && (
                <div>
                  <p className="text-[10px] font-semibold text-muted uppercase mb-2">Included work</p>
                  <p className="text-sm text-main whitespace-pre-wrap">{currentVersion.includedWork}</p>
                </div>
              )}
              {currentVersion.excludedWork && (
                <div>
                  <p className="text-[10px] font-semibold text-muted uppercase mb-2">Excluded work</p>
                  <p className="text-sm text-main whitespace-pre-wrap">{currentVersion.excludedWork}</p>
                </div>
              )}
            </div>
            {variation.reason && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-[10px] font-semibold text-muted uppercase mb-1">Reason</p>
                <p className="text-sm text-main">{variation.reason}</p>
              </div>
            )}
          </div>

          {/* Commercial */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Commercial</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-muted uppercase mb-1">Internal cost</p>
                <p className="text-sm font-semibold text-main">{formatMoney(currentVersion.internalCost)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase mb-1">Client price</p>
                <p className="text-sm font-semibold text-main">{formatMoney(currentVersion.clientPrice)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase mb-1">VAT</p>
                <p className="text-sm font-semibold text-main">{formatMoney(currentVersion.vatAmount)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase mb-1">Total client price</p>
                <p className="text-base font-bold text-primary-500">{formatMoney(currentVersion.totalPrice)}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] text-muted bg-page px-2 py-0.5 rounded-md">{variation.vatTreatment}</span>
              <span className="text-[10px] text-status-amber bg-status-amber-pale px-2 py-0.5 rounded-md">Internal cost not visible to client</span>
            </div>
          </div>

          {/* Programme */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Programme impact</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-muted uppercase mb-1">Additional days</p>
                <p className="text-sm font-semibold text-main">{currentVersion.programmeImpactDays || variation.programmeImpactDays} day{(currentVersion.programmeImpactDays || variation.programmeImpactDays) !== 1 ? 's' : ''}</p>
              </div>
              {currentVersion.revisedCompletion && (
                <div>
                  <p className="text-[10px] text-muted uppercase mb-1">Revised completion</p>
                  <p className="text-sm font-semibold text-main">{new Date(currentVersion.revisedCompletion).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              )}
              {variation.approvalDeadline && (
                <div>
                  <p className="text-[10px] text-muted uppercase mb-1">Approval deadline</p>
                  <p className="text-sm font-semibold text-status-amber">{new Date(variation.approvalDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                </div>
              )}
            </div>
          </div>

          {/* Questions */}
          {variation.questions.length > 0 && (
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Questions & Answers</h3>
              <div className="space-y-3">
                {variation.questions.map((q) => (
                  <div key={q.id} className="p-3 bg-page rounded-xl">
                    <div className="flex items-start gap-2">
                      <i className="ri-question-answer-line text-status-amber mt-0.5"></i>
                      <div>
                        <p className="text-sm text-main">{q.question}</p>
                        <p className="text-[10px] text-muted mt-1">{q.askedBy} · {new Date(q.askedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                        {q.answer && (
                          <div className="mt-2 pl-3 border-l-2 border-primary-200">
                            <p className="text-sm text-main">{q.answer}</p>
                            <p className="text-[10px] text-muted mt-1">{q.answeredBy} · {q.answeredAt && new Date(q.answeredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Version History */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Version history</h3>
            <div className="space-y-2">
              {variation.versions.map((ver) => (
                <div key={ver.version} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-page flex items-center justify-center text-xs font-semibold text-muted">v{ver.version}</span>
                    <div>
                      <p className="text-sm text-main font-medium">{getVariationStatusLabel(ver.status)}</p>
                      <p className="text-[10px] text-muted">{new Date(ver.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {ver.createdBy}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${getVariationStatusColor(ver.status)}`}>{getVariationStatusLabel(ver.status)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Job Card */}
          {job && (
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Related job</h3>
              <p className="text-sm font-semibold text-main">{job.project}</p>
              <p className="text-xs text-muted">{job.reference} · {job.client}</p>
              <p className="text-xs text-muted mt-1">{job.sitePostcode}</p>
              <button className="mt-3 text-xs font-semibold text-primary-500 hover:text-primary-600 cursor-pointer" onClick={() => navigate(`/jobs/${job.id}`)}>
                Open job <i className="ri-arrow-right-line ml-1"></i>
              </button>
            </div>
          )}

          {/* Client Card */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Client</h3>
            <p className="text-sm font-semibold text-main">{variation.clientName}</p>
            {variation.approvedBy && (
              <p className="text-xs text-muted mt-1">Approved by: {variation.approvedBy}</p>
            )}
            {variation.declinedBy && (
              <p className="text-xs text-muted mt-1">Declined by: {variation.declinedBy}</p>
            )}
            <button className="mt-3 text-xs font-semibold text-primary-500 hover:text-primary-600 cursor-pointer" onClick={() => navigate(`/clients/${variation.clientId}`)}>
              Open client <i className="ri-arrow-right-line ml-1"></i>
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showWithdraw}
        title={t('dashboard.variations.confirmWithdrawTitle')}
        description={t('dashboard.variations.confirmWithdrawDesc')}
        confirmText={t('dashboard.variations.confirmWithdraw')}
        variant="warning"
        onConfirm={() => { showToast('Variation withdrawn (demo).', 'warning'); setShowWithdraw(false); }}
        onCancel={() => setShowWithdraw(false)}
      />
    </div>
  );
}