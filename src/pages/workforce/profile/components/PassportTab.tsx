import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/base/Toast';
import {
  maskNiNumber,
  maskDocumentRef,
  maskSensitive,
  type WorkforcePerson,
} from '@/mocks/workforce';

interface PassportTabProps {
  person: WorkforcePerson;
}

export default function PassportTab({ person }: PassportTabProps) {
  const { t } = useTranslation();
  const [showSensitive, setShowSensitive] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-main">{t('workforce.workPassport')}</h2>
        <button
          onClick={() => setShowSensitive((s) => !s)}
          className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 cursor-pointer"
        >
          {showSensitive ? (
            <i className="ri-eye-line"></i>
          ) : (
            <i className="ri-eye-off-line"></i>
          )}
          {showSensitive ? t('workforce.hideSensitive') : t('workforce.showSensitive')}
        </button>
      </div>

      {/* Identity */}
      {person.identity && (
        <Section title={t('workforce.sectionIdentity')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <DataRow label={t('workforce.legalName')} value={person.identity.legalName} />
            {person.identity.preferredName && (
              <DataRow label={t('workforce.preferredName')} value={person.identity.preferredName} />
            )}
            <DataRow label={t('workforce.dob')} value={person.identity.dateOfBirth} />
            <DataRow
              label={t('workforce.niNumber')}
              value={showSensitive ? person.identity.niNumber : maskNiNumber(person.identity.niNumber)}
              masked={!showSensitive}
            />
            <DataRow label={t('workforce.address')} value={person.identity.address} />
            <DataRow label={t('workforce.documentType')} value={person.identity.documentType} />
            <DataRow
              label={t('workforce.documentRef')}
              value={showSensitive ? person.identity.documentRef : maskDocumentRef(person.identity.documentRef)}
              masked={!showSensitive}
            />
            <DataRow
              label={t('workforce.reviewStatus')}
              value={person.identity.reviewStatus}
              statusColor={person.identity.reviewStatus === 'accepted' ? 'green' : undefined}
            />
            {person.identity.reviewedBy && (
              <DataRow label={t('workforce.reviewedBy')} value={`${person.identity.reviewedBy} · ${person.identity.reviewedAt}`} />
            )}
          </div>
        </Section>
      )}

      {/* Business */}
      {person.business && (
        <Section title={t('workforce.sectionBusiness')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <DataRow label={t('workforce.tradingName')} value={person.business.tradingName} />
            <DataRow label={t('workforce.legalBusinessName')} value={person.business.legalBusinessName} />
            <DataRow label={t('workforce.businessType')} value={person.business.businessType} />
            {person.business.companyNumber && (
              <DataRow label={t('workforce.companyNumber')} value={person.business.companyNumber} />
            )}
            {person.business.registeredOffice && (
              <DataRow label={t('workforce.registeredOffice')} value={person.business.registeredOffice} />
            )}
            {person.business.tradingAddress && (
              <DataRow label={t('workforce.tradingAddress')} value={person.business.tradingAddress} />
            )}
            <DataRow
              label={t('workforce.utr')}
              value={showSensitive ? person.business.utr : maskSensitive(person.business.utr)}
              masked={!showSensitive}
            />
            <DataRow label={t('workforce.vatStatus')} value={person.business.vatStatus} />
            {person.business.vatNumber && (
              <DataRow
                label={t('workforce.vatNumber')}
                value={showSensitive ? person.business.vatNumber : maskSensitive(person.business.vatNumber)}
                masked={!showSensitive}
              />
            )}
            <DataRow label={t('workforce.trades')} value={person.business.trades.join(', ')} />
            <DataRow label={t('workforce.yearsTrading')} value={`${person.business.yearsTrading} years`} />
            {person.business.phone && <DataRow label={t('workforce.businessPhone')} value={person.business.phone} />}
            {person.business.email && <DataRow label={t('workforce.businessEmail')} value={person.business.email} />}
          </div>
        </Section>
      )}

      {/* CIS */}
      {person.cis && (
        <Section title={t('workforce.sectionCis')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <DataRow label={t('workforce.cisRegistrationState')} value={person.cis.registrationState} />
            <DataRow
              label={t('workforce.utrRecorded')}
              value={showSensitive ? person.cis.utrRecorded : maskSensitive(person.cis.utrRecorded)}
              masked={!showSensitive}
            />
            {person.cis.verificationReference && (
              <DataRow label={t('workforce.verificationRef')} value={person.cis.verificationReference} />
            )}
            <DataRow label={t('workforce.deductionRate')} value={person.cis.deductionRate} />
            <DataRow
              label={t('workforce.grossPaymentStatus')}
              value={person.cis.grossPaymentStatus ? 'Yes' : 'No'}
            />
            <DataRow label={t('workforce.lastChecked')} value={person.cis.lastChecked} />
            <DataRow label={t('workforce.checkedBy')} value={person.cis.checkedBy} />
          </div>
          <div className="mt-4 p-3 rounded-lg bg-status-amber/10 border border-status-amber/20 text-sm">
            <div className="flex items-start gap-2">
              <i className="ri-information-line text-status-amber mt-0.5"></i>
              <p className="text-status-amber">{person.cis.statusNote}</p>
            </div>
          </div>
        </Section>
      )}

      {/* Bank and payment */}
      {person.bankDetails && (
        <Section title={t('workforce.sectionBank')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <DataRow label={t('workforce.accountName')} value={person.bankDetails.accountName} />
            <DataRow
              label={t('workforce.sortCode')}
              value={showSensitive ? person.bankDetails.sortCode : maskSensitive(person.bankDetails.sortCode)}
              masked={!showSensitive}
            />
            <DataRow
              label={t('workforce.accountNumber')}
              value={showSensitive ? person.bankDetails.accountNumber : maskSensitive(person.bankDetails.accountNumber)}
              masked={!showSensitive}
            />
            {person.bankDetails.paymentReference && (
              <DataRow label={t('workforce.paymentReference')} value={person.bankDetails.paymentReference} />
            )}
            <DataRow
              label={t('workforce.bankStatus')}
              value={person.bankDetails.status}
              statusColor={person.bankDetails.status === 'active' ? 'green' : 'amber'}
            />
            <DataRow label={t('workforce.lastChanged')} value={person.bankDetails.lastChanged} />
            <DataRow label={t('workforce.reviewedBy')} value={person.bankDetails.reviewedBy} />
          </div>
          {person.bankDetailsStatus === 'restricted' && (
            <div className="mt-4 p-3 rounded-lg bg-status-amber/10 border border-status-amber/20 text-sm">
              <div className="flex items-start gap-2">
                <i className="ri-error-warning-line text-status-amber mt-0.5"></i>
                <div>
                  <p className="font-medium text-status-amber">{t('workforce.bankChangePending')}</p>
                  <p className="text-muted mt-1">{t('workforce.bankChangeDesc')}</p>
                  <ul className="text-muted mt-2 space-y-1 list-disc list-inside">
                    <li>{t('workforce.bankChangeRule1')}</li>
                    <li>{t('workforce.bankChangeRule2')}</li>
                    <li>{t('workforce.bankChangeRule3')}</li>
                    <li>{t('workforce.bankChangeRule4')}</li>
                    <li>{t('workforce.bankChangeRule5')}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Emergency and site */}
      {person.emergencySiteInfo && (
        <Section title={t('workforce.sectionEmergency')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <DataRow label={t('workforce.emergencyContact')} value={person.emergencySiteInfo.emergencyContact} />
            <DataRow label={t('workforce.emergencyPhone')} value={person.emergencySiteInfo.emergencyPhone} />
            <DataRow label={t('workforce.ppeRequirements')} value={person.emergencySiteInfo.ppeRequirements.join(', ')} />
            {person.emergencySiteInfo.voluntaryAccessInfo && (
              <DataRow label={t('workforce.voluntaryAccess')} value={person.emergencySiteInfo.voluntaryAccessInfo} />
            )}
          </div>
          {person.emergencySiteInfo.medicalInfo && (
            <div className="mt-4 p-3 rounded-lg bg-secondary-100 border border-secondary-200 text-sm">
              <p className="font-medium text-secondary-700">{t('workforce.medicalInfoRestricted')}</p>
              <p className="text-secondary-600 mt-1">{t('workforce.medicalInfoOptional')}</p>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-main uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  );
}

function DataRow({
  label,
  value,
  masked,
  statusColor,
}: {
  label: string;
  value: string;
  masked?: boolean;
  statusColor?: 'green' | 'amber' | 'red';
}) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-main font-medium mt-0.5 ${masked ? 'font-mono tracking-wide' : ''}`}>
        {value}
        {statusColor && (
          <span
            className={`ml-2 inline-block w-2 h-2 rounded-full ${
              statusColor === 'green' ? 'bg-status-green' : statusColor === 'amber' ? 'bg-status-amber' : 'bg-status-red'
            }`}
          ></span>
        )}
      </p>
    </div>
  );
}