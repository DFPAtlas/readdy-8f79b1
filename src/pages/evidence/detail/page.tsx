import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { getEvidenceById, getEvidenceTypeLabel, getEvidenceTypeIcon, getReviewStatusLabel, getReviewStatusColor, getVisibilityLabel, getVisibilityColor, getDelayCategoryLabel, getDelayStatusLabel, type EvidenceRecord } from '@/mocks/evidence';
import { useToast } from '@/components/base/Toast';
import ConfirmDialog from '@/components/base/ConfirmDialog';

export default function EvidenceDetail() {
  const { t } = useTranslation();
  const { evidenceId } = useParams<{ evidenceId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [publishConfirm, setPublishConfirm] = useState(false);
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);

  const evidence: EvidenceRecord | undefined = getEvidenceById(evidenceId || '');

  if (!evidence) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
          <i className="ri-error-warning-line text-2xl text-muted"></i>
        </div>
        <h2 className="text-lg font-semibold text-main mb-2">{t('evidence.evidenceDetail.notFound')}</h2>
        <p className="text-sm text-muted mb-4">{t('evidence.evidenceDetail.notFoundDesc')}</p>
        <button
          className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl cursor-pointer"
          onClick={() => navigate('/evidence')}
        >
          {t('evidence.evidenceDetail.backToEvidence')}
        </button>
      </div>
    );
  }

  const previewUrl = evidence.attachments.find((a) => a.previewUrl)?.previewUrl;
  const formatMoney = (v: number) => '£' + v.toLocaleString('en-GB');

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Back */}
      <button
        className="text-sm font-medium text-muted hover:text-main cursor-pointer flex items-center gap-1"
        onClick={() => navigate('/evidence')}
      >
        <i className="ri-arrow-left-line text-base"></i>
        {t('evidence.evidenceDetail.backToEvidence')}
      </button>

      {/* Header */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-[10px] font-medium text-muted bg-page px-2 py-1 rounded-full flex items-center gap-1">
                <i className={`${getEvidenceTypeIcon(evidence.evidenceType)} text-xs`}></i>
                {getEvidenceTypeLabel(evidence.evidenceType)}
              </span>
              <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${getReviewStatusColor(evidence.reviewStatus)}`}>
                {getReviewStatusLabel(evidence.reviewStatus)}
              </span>
              <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${getVisibilityColor(evidence.visibility)}`}>
                {getVisibilityLabel(evidence.visibility)}
              </span>
            </div>
            <h1 className="text-xl font-bold text-main">{evidence.title}</h1>
            <p className="text-sm text-muted mt-1">{evidence.caption}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted">
              <span>{evidence.jobRef} · {evidence.jobName}</span>
              <span>{evidence.projectStage}</span>
              <span>{new Date(evidence.capturedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {new Date(evidence.capturedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
              <span>by {evidence.capturedBy}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <button
              className="h-9 px-3 text-xs font-medium border border-border rounded-xl hover:bg-page cursor-pointer whitespace-nowrap"
              onClick={() => showToast('Correction added (demo).', 'info')}
            >
              <i className="ri-edit-line mr-1"></i>{t('evidence.evidenceDetail.addCorrection')}
            </button>
            <button
              className="h-9 px-3 text-xs font-medium border border-border rounded-xl hover:bg-page cursor-pointer whitespace-nowrap"
              onClick={() => showToast('Review requested (demo).', 'info')}
            >
              <i className="ri-eye-line mr-1"></i>{t('evidence.evidenceDetail.requestReview')}
            </button>
            {evidence.visibility !== 'client_visible' && (
              <button
                className="h-9 px-3 text-xs font-medium text-primary-500 border border-primary-200 bg-primary-50 rounded-xl hover:bg-primary-100 cursor-pointer whitespace-nowrap"
                onClick={() => setPublishConfirm(true)}
              >
                <i className="ri-send-plane-line mr-1"></i>{t('evidence.evidenceDetail.publishToClient')}
              </button>
            )}
            {evidence.visibility === 'client_visible' && (
              <button
                className="h-9 px-3 text-xs font-medium text-status-amber border border-[#F5E0C0] rounded-xl hover:bg-status-amber-pale cursor-pointer whitespace-nowrap"
                onClick={() => setWithdrawConfirm(true)}
              >
                <i className="ri-close-circle-line mr-1"></i>{t('evidence.evidenceDetail.withdrawFromClient')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      {previewUrl && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <div className="aspect-[16/9] bg-page">
            <img src={previewUrl} alt={evidence.caption} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Type-Specific Fields */}
          {evidence.evidenceType === 'voice_note' && (
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Voice Note</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-status-amber/20 flex items-center justify-center">
                  <i className="ri-mic-line text-lg text-status-amber"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-main">{evidence.duration}</p>
                  <p className="text-[10px] text-muted">{t('evidence.evidenceDetail.transcriptUnavailable')}</p>
                </div>
                <button className="ml-auto w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center cursor-pointer">
                  <i className="ri-play-fill text-white text-lg"></i>
                </button>
              </div>
            </div>
          )}

          {evidence.evidenceType === 'site_instruction' && (
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Site Instruction</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.instructionSource')}:</span><p className="font-medium">{evidence.instructionSource}</p></div>
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.personGiving')}:</span><p className="font-medium">{evidence.personGivingInstruction}</p></div>
                <div className="col-span-2"><span className="text-muted text-xs">{t('evidence.evidenceDetail.instructionText')}:</span><p className="text-sm mt-1">{evidence.instructionText}</p></div>
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.acknowledgedBy')}:</span><p className="font-medium">{evidence.acknowledgedBy}</p></div>
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.costImpactExpected')}:</span><p className="font-medium">{evidence.costImpactExpected ? 'Yes' : 'No'}</p></div>
              </div>
            </div>
          )}

          {evidence.evidenceType === 'delay' && (
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Delay Record</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.delayCategory')}:</span><p className="font-medium">{evidence.delayCategory ? getDelayCategoryLabel(evidence.delayCategory) : '—'}</p></div>
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.delayStatus')}:</span><p className="font-medium">{evidence.delayStatus ? getDelayStatusLabel(evidence.delayStatus) : '—'}</p></div>
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.responsibleParty')}:</span><p className="font-medium">{evidence.delayResponsibleParty || '—'}</p></div>
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.estimatedHours')}:</span><p className="font-medium">{evidence.delayEstimatedHours}h</p></div>
                <div className="col-span-2"><span className="text-muted text-xs">{t('evidence.evidenceDetail.workAffected')}:</span><p className="text-sm">{evidence.delayWorkAffected || '—'}</p></div>
                <div className="col-span-2"><span className="text-muted text-xs">{t('evidence.evidenceDetail.actionRequired')}:</span><p className="text-sm">{evidence.delayActionRequired || '—'}</p></div>
              </div>
            </div>
          )}

          {evidence.evidenceType === 'inspection' && (
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Inspection</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.inspectionOutcome')}:</span><p className="font-semibold text-status-green">{evidence.inspectionOutcome}</p></div>
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.inspectionReference')}:</span><p className="font-medium">{evidence.inspectionReference || '—'}</p></div>
              </div>
            </div>
          )}

          {evidence.evidenceType === 'delivery' && (
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Delivery</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.supplier')}:</span><p className="font-medium">{evidence.supplier || '—'}</p></div>
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.deliveryRef')}:</span><p className="font-medium">{evidence.deliveryRef || '—'}</p></div>
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.purchaseOrder')}:</span><p className="font-medium">{evidence.purchaseOrderRef || '—'}</p></div>
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.condition')}:</span><p className="font-medium">{evidence.deliveryCondition || '—'}</p></div>
                <div className="col-span-2"><span className="text-muted text-xs">{t('evidence.evidenceDetail.items')}:</span><p className="text-sm whitespace-pre-line">{evidence.deliveryItems || '—'}</p></div>
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.acceptedBy')}:</span><p className="font-medium">{evidence.acceptedBy || '—'}</p></div>
              </div>
            </div>
          )}

          {evidence.evidenceType === 'material_record' && (
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Material Record</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.materialName')}:</span><p className="font-medium">{evidence.materialName || '—'}</p></div>
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.quantity')}:</span><p className="font-medium">{evidence.materialQuantity} {evidence.materialUnit}</p></div>
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.unitCost')}:</span><p className="font-medium">{evidence.materialUnitCost ? formatMoney(evidence.materialUnitCost) : '—'}</p></div>
                <div><span className="text-muted text-xs">{t('evidence.evidenceDetail.totalCost')}:</span><p className="font-semibold">{evidence.materialTotalCost ? formatMoney(evidence.materialTotalCost) : '—'}</p></div>
                {evidence.materialWaste && <div className="col-span-2"><span className="text-muted text-xs">{t('evidence.evidenceDetail.waste')}:</span><p className="text-sm">{evidence.materialWaste}</p></div>}
              </div>
            </div>
          )}

          {/* Internal Note */}
          {evidence.internalNote && (
            <div className="bg-status-amber-pale border border-[#F5E0C0] rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-status-amber uppercase tracking-wider mb-2">{t('evidence.evidenceDetail.internalNote')}</h3>
              <p className="text-sm text-main">{evidence.internalNote}</p>
            </div>
          )}

          {/* Related Records */}
          {evidence.relatedRecords.length > 0 && (
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('evidence.evidenceDetail.relatedRecords')}</h3>
              <div className="space-y-2">
                {evidence.relatedRecords.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 bg-page rounded-xl text-sm">
                    <span className="text-[10px] font-medium text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full">{r.ref}</span>
                    <span className="font-medium">{r.title}</span>
                    <span className="text-[10px] text-muted ml-auto">{r.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Version History */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('evidence.evidenceDetail.versionHistory')}</h3>
            <div className="space-y-3">
              {evidence.versions.map((v, i) => (
                <div key={i} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${i === 0 ? 'bg-primary-500' : 'bg-page'}`}>
                    <span className="text-[10px] font-bold text-white">{v.version}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-main">{v.changeNote}</p>
                    <p className="text-[10px] text-muted mt-1">{new Date(v.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {v.createdBy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-border rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">{t('evidence.evidenceDetail.type')}</h3>
            <p className="text-sm font-medium text-main">{getEvidenceTypeLabel(evidence.evidenceType)}</p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">{t('evidence.evidenceDetail.job')}</h3>
            <p className="text-sm font-medium text-main">{evidence.jobRef} — {evidence.jobName}</p>
            <p className="text-xs text-muted mt-1">{evidence.projectStage}</p>
          </div>
          {evidence.locationLabel && (
            <div className="bg-white border border-border rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Location</h3>
              <p className="text-sm text-main">{evidence.locationLabel}</p>
            </div>
          )}
          {evidence.tags.length > 0 && (
            <div className="bg-white border border-border rounded-2xl p-4">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {evidence.tags.map((tag) => (
                  <span key={tag} className="text-[10px] font-medium bg-page text-muted px-2 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Publish Confirm */}
      {publishConfirm && (
        <ConfirmDialog
          title={t('evidence.evidenceDetail.publishToClient')}
          message={t('evidence.evidenceDetail.publishConfirm')}
          confirmLabel={t('evidence.evidenceDetail.confirmPublish')}
          onConfirm={() => { setPublishConfirm(false); showToast('Published to client portal.', 'success'); }}
          onCancel={() => setPublishConfirm(false)}
        />
      )}

      {/* Withdraw Confirm */}
      {withdrawConfirm && (
        <ConfirmDialog
          title={t('evidence.evidenceDetail.withdrawFromClient')}
          message={t('evidence.evidenceDetail.withdrawConfirm')}
          confirmLabel={t('evidence.evidenceDetail.confirmWithdraw')}
          onConfirm={() => { setWithdrawConfirm(false); showToast('Withdrawn from client view.', 'success'); }}
          onCancel={() => setWithdrawConfirm(false)}
        />
      )}
    </div>
  );
}