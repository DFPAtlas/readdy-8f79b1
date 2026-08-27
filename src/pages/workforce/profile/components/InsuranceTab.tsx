import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/base/Toast';
import {
  getInsuranceTypeLabel,
  getExpiryBadgeColor,
  getExpiryStatusLabel,
  computeDaysRemaining,
  type InsurancePolicy,
} from '@/mocks/workforce';

interface InsuranceTabProps {
  insurance: InsurancePolicy[];
}

export default function InsuranceTab({ insurance }: InsuranceTabProps) {
  const { t } = useTranslation();
  const { showToast: addToast } = useToast();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-main">{t('workforce.insurance')}</h2>
        <span className="text-sm text-muted">{insurance.length} policies</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insurance.map((policy) => {
          const days = computeDaysRemaining(policy.expiryDate);
          return (
            <div key={policy.id} className="bg-white border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getExpiryBadgeColor(policy.status)}`}>
                    {getExpiryStatusLabel(policy.status)}
                  </span>
                  <h3 className="text-base font-semibold text-main mt-2">{getInsuranceTypeLabel(policy.type)}</h3>
                  <p className="text-sm text-muted">{policy.provider}</p>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === policy.id ? null : policy.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:bg-background-100 hover:text-main transition-colors cursor-pointer"
                  >
                    <i className="ri-more-line"></i>
                  </button>
                  {openMenuId === policy.id && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)}></div>
                      <div className="absolute right-0 mt-1 w-48 bg-white border border-border rounded-xl shadow-lg z-40 overflow-hidden">
                        <button
                          onClick={() => { addToast(t('workforce.demoViewEvidence')); setOpenMenuId(null); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-background-50 cursor-pointer"
                        >
                          {t('workforce.viewEvidence')}
                        </button>
                        <button
                          onClick={() => { addToast(t('workforce.demoRequestRenewal')); setOpenMenuId(null); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-background-50 cursor-pointer"
                        >
                          {t('workforce.requestRenewal')}
                        </button>
                        <button
                          onClick={() => { addToast(t('workforce.demoReplaceDoc')); setOpenMenuId(null); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-background-50 cursor-pointer"
                        >
                          {t('workforce.replaceDocument')}
                        </button>
                        <button
                          onClick={() => { addToast(t('workforce.demoAddNote')); setOpenMenuId(null); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-background-50 cursor-pointer"
                        >
                          {t('workforce.addReviewNote')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted">{t('workforce.coverAmount')}</p>
                  <p className="text-main font-medium mt-0.5">{policy.coverAmount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">{t('workforce.reference')}</p>
                  <p className="text-main font-medium mt-0.5 font-mono">{policy.reference}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">{t('workforce.startDate')}</p>
                  <p className="text-main mt-0.5">
                    {new Date(policy.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">{t('workforce.expiryDate')}</p>
                  <p className={`mt-0.5 font-medium ${days <= 7 ? 'text-status-red' : days <= 30 ? 'text-status-amber' : 'text-main'}`}>
                    {new Date(policy.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between text-sm">
                <div className="text-muted">
                  {t('workforce.reviewed')}: {policy.reviewedBy} · {policy.reviewedAt}
                </div>
                {days > 0 ? (
                  <span className={`font-medium ${days <= 7 ? 'text-status-red' : days <= 30 ? 'text-status-amber' : 'text-status-green'}`}>
                    {days} {days === 1 ? 'day' : 'days'} remaining
                  </span>
                ) : (
                  <span className="font-medium text-status-red">Expired</span>
                )}
              </div>
            </div>
          );
        })}
        {insurance.length === 0 && (
          <div className="md:col-span-2 bg-white border border-border rounded-xl p-12 text-center text-muted">
            <p className="text-base font-medium">{t('workforce.noInsurance')}</p>
            <p className="text-sm mt-1">{t('workforce.noInsuranceDesc')}</p>
          </div>
        )}
      </div>
    </div>
  );
}