import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/base/Toast';
import {
  getReviewBadgeColor,
  getReviewStatusLabel,
  computeDaysRemaining,
  type Qualification,
} from '@/mocks/workforce';
import ConfirmDialog from '@/components/base/ConfirmDialog';

interface QualificationsTabProps {
  qualifications: Qualification[];
}

export default function QualificationsTab({ qualifications }: QualificationsTabProps) {
  const { t } = useTranslation();
  const { showToast: addToast } = useToast();
  const [rejectTarget, setRejectTarget] = useState<Qualification | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const handleAccept = (q: Qualification) => {
    addToast(`${q.name} accepted by current user`);
  };

  const handleReject = () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    addToast(`${rejectTarget.name} rejected: ${rejectReason}`);
    setRejectTarget(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-main">{t('workforce.qualifications')}</h2>
        <span className="text-sm text-muted">{qualifications.length} records</span>
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background-50">
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colQualification')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colIssuer')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colReference')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colIssueDate')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colExpiry')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colStatus')}</th>
                <th className="text-left px-4 py-3 font-medium text-muted">{t('workforce.colReviewedBy')}</th>
                <th className="text-right px-4 py-3 font-medium text-muted">{t('workforce.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {qualifications.map((q) => {
                const daysToExpiry = q.expiryDate ? computeDaysRemaining(q.expiryDate) : undefined;
                return (
                  <tr key={q.id} className="border-b border-border last:border-0 hover:bg-background-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-main">{q.name}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">{q.issuer}</td>
                    <td className="px-4 py-3 text-muted">{q.reference}</td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(q.issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      {q.expiryDate ? (
                        <span className={`${daysToExpiry !== undefined && daysToExpiry <= 7 ? 'text-status-red font-medium' : 'text-muted'}`}>
                          {new Date(q.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {daysToExpiry !== undefined && daysToExpiry <= 30 && (
                            <span className="block text-xs mt-0.5">
                              {daysToExpiry <= 0 ? 'Expired' : `${daysToExpiry} days left`}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getReviewBadgeColor(q.status)}`}>
                        {getReviewStatusLabel(q.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {q.reviewedBy ? (
                        <div>
                          <p>{q.reviewedBy}</p>
                          <p className="text-xs">{q.reviewedAt}</p>
                        </div>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === q.id ? null : q.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-background-100 hover:text-main transition-colors cursor-pointer"
                        >
                          <i className="ri-more-line"></i>
                        </button>
                        {openMenuId === q.id && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)}></div>
                            <div className="absolute right-0 mt-1 w-48 bg-white border border-border rounded-xl shadow-lg z-40 overflow-hidden">
                              <button
                                onClick={() => { addToast(t('workforce.demoViewEvidence')); setOpenMenuId(null); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-background-50 cursor-pointer"
                              >
                                {t('workforce.viewEvidence')}
                              </button>
                              {q.status !== 'accepted' && (
                                <button
                                  onClick={() => { handleAccept(q); setOpenMenuId(null); }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-status-green hover:bg-background-50 cursor-pointer"
                                >
                                  {t('workforce.accept')}
                                </button>
                              )}
                              {q.status !== 'rejected' && (
                                <button
                                  onClick={() => { setRejectTarget(q); setOpenMenuId(null); }}
                                  className="w-full text-left px-4 py-2.5 text-sm text-status-red hover:bg-background-50 cursor-pointer"
                                >
                                  {t('workforce.reject')}
                                </button>
                              )}
                              <button
                                onClick={() => { addToast(t('workforce.demoRequestReplacement')); setOpenMenuId(null); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-background-50 cursor-pointer"
                              >
                                {t('workforce.requestReplacement')}
                              </button>
                              <button
                                onClick={() => { addToast(t('workforce.demoAddNote')); setOpenMenuId(null); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-background-50 cursor-pointer"
                              >
                                {t('workforce.addNote')}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {qualifications.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted">
                    {t('workforce.noQualifications')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!rejectTarget}
        title={t('workforce.rejectQualification')}
        description={t('workforce.rejectQualificationDesc', { name: rejectTarget?.name || '' })}
        confirmText={t('workforce.confirmReject')}
        onConfirm={handleReject}
        onCancel={() => { setRejectTarget(null); setRejectReason(''); }}
        variant="danger"
      >
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder={t('workforce.rejectReasonPlaceholder')}
          maxLength={200}
          rows={3}
          className="w-full mt-3 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
        />
      </ConfirmDialog>
    </div>
  );
}