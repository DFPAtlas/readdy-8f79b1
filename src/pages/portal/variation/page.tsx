import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { getPortalAccessByToken, getVariationById, getVariationStatusLabel, getVariationStatusColor } from '@/mocks/clients';
import { useToast } from '@/components/base/Toast';

export default function ClientVariationDetail() {
  const { t } = useTranslation();
  const { accessToken, variationId } = useParams<{ accessToken: string; variationId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [fullName, setFullName] = useState('');
  const [priceChecked, setPriceChecked] = useState(false);
  const [authorityChecked, setAuthorityChecked] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [questionText, setQuestionText] = useState('');

  const portalAccess = getPortalAccessByToken(accessToken || '');
  const variation = getVariationById(variationId || '');
  const currentVersion = variation?.versions.find((v) => v.version === variation.currentVersion);

  if (!portalAccess || portalAccess.status !== 'active' || !variation || !currentVersion) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-white border border-border flex items-center justify-center mx-auto mb-6">
            <i className="ri-file-search-line text-3xl text-muted"></i>
          </div>
          <h1 className="text-2xl font-bold text-main mb-2">Variation not found</h1>
          <p className="text-muted">This variation may have been withdrawn or the link has expired.</p>
          <button className="mt-4 h-10 px-5 bg-primary-500 text-white rounded-xl" onClick={() => navigate(`/client/${accessToken}`)}>
            Back to portal
          </button>
        </div>
      </div>
    );
  }

  const formatMoney = (v: number) => '£' + v.toLocaleString('en-GB');
  const statusColor = getVariationStatusColor(variation.status);
  const statusLabel = getVariationStatusLabel(variation.status);

  const canApprove = ['sent', 'viewed', 'question_received'].includes(variation.status);
  const canDecline = canApprove;

  const handleApprove = () => {
    showToast(t('dashboard.portal.variationApproved'), 'success');
    setShowApproveConfirm(false);
  };

  const handleDecline = () => {
    showToast(t('dashboard.portal.variationDeclined'), 'info');
    setShowDecline(false);
  };

  const handleAskQuestion = () => {
    showToast(t('dashboard.portal.questionSent'), 'info');
    setShowQuestion(false);
    setQuestionText('');
  };

  return (
    <div className="min-h-screen bg-page">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="max-w-[800px] mx-auto px-4 md:px-6 py-4">
          <button className="text-sm font-medium text-muted hover:text-main cursor-pointer flex items-center gap-1 mb-3" onClick={() => navigate(`/client/${accessToken}`)}>
            <i className="ri-arrow-left-line"></i> Back to portal
          </button>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-semibold text-primary-500">{variation.reference}</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
          </div>
          <h1 className="text-xl font-bold text-main">{variation.title}</h1>
          <p className="text-sm text-muted mt-1">Project: {variation.jobName}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[800px] mx-auto px-4 md:px-6 py-6 space-y-5">
        {/* What is changing */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h3 className="text-sm font-bold text-main mb-3">What is changing</h3>
          <p className="text-sm text-main leading-relaxed">{currentVersion.description}</p>
        </div>

        {/* Included / Excluded */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentVersion.includedWork && (
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-sm font-bold text-main mb-3">What is included</h3>
              <p className="text-sm text-main whitespace-pre-wrap">{currentVersion.includedWork}</p>
            </div>
          )}
          {currentVersion.excludedWork && (
            <div className="bg-white border border-border rounded-2xl p-5">
              <h3 className="text-sm font-bold text-main mb-3">What is excluded</h3>
              <p className="text-sm text-main whitespace-pre-wrap">{currentVersion.excludedWork}</p>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h3 className="text-sm font-bold text-main mb-4">Price</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-muted uppercase mb-1">Price (excl. VAT)</p>
              <p className="text-base font-semibold text-main">{formatMoney(currentVersion.clientPrice)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase mb-1">VAT</p>
              <p className="text-base font-semibold text-main">{formatMoney(currentVersion.vatAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase mb-1">Total</p>
              <p className="text-xl font-bold text-primary-500">{formatMoney(currentVersion.totalPrice)}</p>
            </div>
          </div>
        </div>

        {/* Programme Impact */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h3 className="text-sm font-bold text-main mb-3">Programme impact</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-muted uppercase mb-1">Additional working days</p>
              <p className="text-sm font-semibold text-main">{currentVersion.programmeImpact}</p>
            </div>
            {currentVersion.revisedCompletion && (
              <div>
                <p className="text-[10px] text-muted uppercase mb-1">Revised completion date</p>
                <p className="text-sm font-semibold text-main">{new Date(currentVersion.revisedCompletion).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            )}
          </div>
        </div>

        {/* Approval Deadline */}
        {variation.approvalDeadline && (
          <div className="bg-status-amber-pale border border-[#F5E0C0] rounded-2xl p-4">
            <p className="text-sm font-semibold text-status-amber">
              Approval requested by {new Date(variation.approvalDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        )}

        {/* Questions */}
        {variation.questions.length > 0 && (
          <div className="bg-white border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-main mb-3">Questions & Answers</h3>
            <div className="space-y-3">
              {variation.questions.map((q) => (
                <div key={q.id} className="p-3 bg-page rounded-xl">
                  <p className="text-sm text-main font-medium">{q.question}</p>
                  <p className="text-[10px] text-muted mt-1">{q.askedBy} · {new Date(q.askedAt).toLocaleDateString('en-GB')}</p>
                  {q.answer && (
                    <div className="mt-2 pl-3 border-l-2 border-primary-200">
                      <p className="text-sm text-main">{q.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {canApprove && (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              className="h-11 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap"
              onClick={() => setShowApproveConfirm(true)}
            >
              {t('dashboard.portal.approveVariation')}
            </button>
            <button
              className="h-11 px-5 border border-border text-main text-sm font-semibold rounded-xl hover:bg-page cursor-pointer whitespace-nowrap"
              onClick={() => setShowQuestion(true)}
            >
              {t('dashboard.portal.askQuestion')}
            </button>
            <button
              className="h-11 px-5 border border-status-red text-status-red text-sm font-semibold rounded-xl hover:bg-status-red-pale cursor-pointer whitespace-nowrap"
              onClick={() => setShowDecline(true)}
            >
              {t('dashboard.portal.declineVariation')}
            </button>
          </div>
        )}
      </div>

      {/* Approve Confirm Modal */}
      {showApproveConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowApproveConfirm(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-[90vw] max-w-md p-6 z-10">
            <h2 className="text-lg font-bold text-main mb-2">{t('dashboard.portal.approveReviewTitle')}</h2>
            <div className="bg-page rounded-xl p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">Total:</span><span className="font-bold text-primary-500">{formatMoney(currentVersion.totalPrice)}</span></div>
              <div className="flex justify-between"><span className="text-muted">{t('dashboard.portal.programmeChange')}:</span><span className="font-semibold">{currentVersion.programmeImpact}</span></div>
              {currentVersion.revisedCompletion && (
                <div className="flex justify-between"><span className="text-muted">{t('dashboard.portal.revisedTarget')}:</span><span className="font-semibold">{new Date(currentVersion.revisedCompletion).toLocaleDateString('en-GB')}</span></div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-main block mb-1">{t('dashboard.portal.enterFullName')}</label>
                <input
                  type="text"
                  className="w-full h-10 px-3 border border-border rounded-xl text-sm focus:outline-none focus:border-primary-300"
                  placeholder={t('dashboard.portal.fullNamePlaceholder')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={priceChecked} onChange={(e) => setPriceChecked(e.target.checked)} className="mt-0.5 accent-primary-500" />
                <span className="text-xs text-main">{t('dashboard.portal.priceProgrammeCheckbox')}</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={authorityChecked} onChange={(e) => setAuthorityChecked(e.target.checked)} className="mt-0.5 accent-primary-500" />
                <span className="text-xs text-main">{t('dashboard.portal.confirmationCheckbox')}</span>
              </label>
            </div>
            <p className="text-[10px] text-muted mt-3">{t('dashboard.portal.confirmApproval')}</p>
            <div className="flex gap-3 mt-5">
              <button className="flex-1 h-10 border border-border text-main rounded-xl text-sm font-semibold hover:bg-page cursor-pointer" onClick={() => setShowApproveConfirm(false)}>
                {t('dashboard.cancel')}
              </button>
              <button
                className="flex-1 h-10 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!fullName || !priceChecked || !authorityChecked}
                onClick={handleApprove}
              >
                {t('dashboard.portal.approveVariation')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {showDecline && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDecline(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-[90vw] max-w-md p-6 z-10">
            <h2 className="text-lg font-bold text-main mb-2">{t('dashboard.portal.declineVariation')}</h2>
            <p className="text-sm text-muted mb-3">Declining will not delete the variation. Please provide a reason.</p>
            <div>
              <label className="text-xs font-semibold text-main block mb-1">Reason</label>
              <textarea
                className="w-full h-20 px-3 py-2 border border-border rounded-xl text-sm resize-none focus:outline-none focus:border-primary-300"
                placeholder={t('dashboard.portal.declineReasonPlaceholder')}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button className="flex-1 h-10 border border-border text-main rounded-xl text-sm font-semibold hover:bg-page cursor-pointer" onClick={() => setShowDecline(false)}>
                {t('dashboard.cancel')}
              </button>
              <button
                className="flex-1 h-10 bg-status-red hover:bg-red-700 text-white rounded-xl text-sm font-semibold cursor-pointer"
                onClick={handleDecline}
              >
                {t('dashboard.portal.declineVariation')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ask Question Modal */}
      {showQuestion && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowQuestion(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-[90vw] max-w-md p-6 z-10">
            <h2 className="text-lg font-bold text-main mb-2">{t('dashboard.portal.askQuestion')}</h2>
            <div>
              <textarea
                className="w-full h-20 px-3 py-2 border border-border rounded-xl text-sm resize-none focus:outline-none focus:border-primary-300"
                placeholder={t('dashboard.portal.questionPlaceholder')}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button className="flex-1 h-10 border border-border text-main rounded-xl text-sm font-semibold hover:bg-page cursor-pointer" onClick={() => setShowQuestion(false)}>
                {t('dashboard.cancel')}
              </button>
              <button
                className="flex-1 h-10 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold cursor-pointer"
                onClick={handleAskQuestion}
              >
                {t('dashboard.portal.sendQuestion')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}