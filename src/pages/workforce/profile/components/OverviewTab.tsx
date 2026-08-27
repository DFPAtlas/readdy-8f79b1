import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/base/Toast';
import {
  getReadinessChecks,
  getPersonAssignments,
  getAvailabilityLabel,
  getRelationshipLabel,
  maskSensitive,
  maskNiNumber,
  type WorkforcePerson,
  type ReadinessCheck,
  type WorkforceAssignment,
} from '@/mocks/workforce';

interface OverviewTabProps {
  person: WorkforcePerson;
  readinessChecks: ReadinessCheck[];
  assignments: WorkforceAssignment[];
}

export default function OverviewTab({ person, readinessChecks, assignments }: OverviewTabProps) {
  const { t } = useTranslation();
  const { showToast: addToast } = useToast();

  const overallCheck = readinessChecks.find((r) => r.category === 'Overall');
  const nonOverall = readinessChecks.filter((r) => r.category !== 'Overall');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left column */}
      <div className="lg:col-span-2 space-y-4">
        {/* Key info */}
        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-base font-semibold text-main">{t('workforce.keyInformation')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <InfoRow label={t('workforce.relationship')} value={getRelationshipLabel(person.relationship)} />
            {person.tradingName && <InfoRow label={t('workforce.tradingName')} value={person.tradingName} />}
            {person.business?.businessType && (
              <InfoRow label={t('workforce.businessType')} value={person.business.businessType} />
            )}
            <InfoRow label={t('workforce.primaryTrade')} value={person.primaryTrade} />
            {person.secondaryTrades.length > 0 && (
              <InfoRow label={t('workforce.secondaryTrades')} value={person.secondaryTrades.join(', ')} />
            )}
            {person.phone && <InfoRow label={t('workforce.phone')} value={person.phone} />}
            {person.email && <InfoRow label={t('workforce.email')} value={person.email} />}
          </div>
        </div>

        {/* Readiness */}
        <div className="bg-white border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-base font-semibold text-main">{t('workforce.siteReadiness')}</h3>
          <div className="space-y-2">
            {nonOverall.map((check) => (
              <div
                key={check.category}
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm ${
                  check.state === 'accepted'
                    ? 'bg-status-green/10'
                    : check.state === 'expiring_soon'
                    ? 'bg-status-amber/10'
                    : check.state === 'restricted'
                    ? 'bg-gray-100'
                    : 'bg-background-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      check.state === 'accepted'
                        ? 'bg-status-green'
                        : check.state === 'recorded'
                        ? 'bg-blue-400'
                        : check.state === 'expiring_soon'
                        ? 'bg-status-amber'
                        : check.state === 'restricted'
                        ? 'bg-gray-400'
                        : 'bg-gray-300'
                    }`}
                  ></span>
                  <span className="text-main font-medium">{check.category}</span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-medium ${
                      check.state === 'expiring_soon'
                        ? 'text-status-amber'
                        : check.state === 'restricted'
                        ? 'text-muted'
                        : 'text-main'
                    }`}
                  >
                    {check.label}
                  </span>
                  {check.detail && <p className="text-xs text-muted mt-0.5">{check.detail}</p>}
                </div>
              </div>
            ))}
            {overallCheck && (
              <div className="flex items-center justify-between px-4 py-3 rounded-lg text-sm bg-primary-50 border border-primary-100 mt-3">
                <span className="text-main font-semibold">{overallCheck.category}</span>
                <span
                  className={`font-semibold ${
                    overallCheck.state === 'accepted' ? 'text-status-green' : 'text-status-amber'
                  }`}
                >
                  {overallCheck.label}
                </span>
              </div>
            )}
          </div>

          {readinessChecks.find((r) => r.category === 'Insurance')?.state === 'expiring_soon' && (
            <div className="mt-3 p-3 rounded-lg bg-status-amber/10 border border-status-amber/20">
              <p className="text-sm text-status-amber font-medium">{t('workforce.reason')}</p>
              <p className="text-sm text-main mt-1">
                {readinessChecks.find((r) => r.category === 'Insurance')?.detail}
              </p>
              <button
                onClick={() => addToast(t('workforce.demoRequestRenewal'))}
                className="mt-2 px-3 py-1.5 rounded-lg bg-status-amber text-white text-sm font-medium hover:bg-amber-600 transition-colors cursor-pointer"
              >
                {t('workforce.requestRenewal')}
              </button>
            </div>
          )}
        </div>

        {/* Current assignment */}
        {assignments.length > 0 && (
          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-main">{t('workforce.currentAssignment')}</h3>
            {assignments.map((a) => (
              <div key={a.id} className="space-y-2 text-sm">
                <p className="font-medium text-main">{a.jobName}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted">
                  <span>{t('workforce.reference')}: <span className="text-main">{a.jobRef}</span></span>
                  <span>{t('workforce.role')}: <span className="text-main">{a.role}</span></span>
                  <span className="sm:col-span-2">{t('workforce.package')}: <span className="text-main">{a.package}</span></span>
                  <span>{t('workforce.start')}: <span className="text-main">{new Date(a.startDate).toLocaleDateString('en-GB')}</span></span>
                  <span>{t('workforce.expectedFinish')}: <span className="text-main">{new Date(a.expectedFinish).toLocaleDateString('en-GB')}</span></span>
                  <span>{t('workforce.siteInduction')}: <span className="text-main">{a.siteInductionComplete ? 'Completed' : 'Pending'}</span></span>
                  <span>{t('workforce.ramsAcknowledged')}: <span className="text-main">{a.ramsAcknowledged ? 'Yes' : 'No'}</span></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right column */}
      <div className="space-y-4">
        <div className="bg-white border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-main uppercase tracking-wider">{t('workforce.availability')}</h3>
          <p className="text-sm text-main">{getAvailabilityLabel(person.availability)}</p>
        </div>

        <div className="bg-white border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-main uppercase tracking-wider">{t('workforce.nextExpiry')}</h3>
          {person.nextExpiryLabel ? (
            <div>
              <p className="text-sm text-main">{person.nextExpiryLabel}</p>
              <p className="text-xs text-muted mt-0.5">
                {person.nextExpiryDate
                  ? new Date(person.nextExpiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                  : ''}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">{t('workforce.noExpiries')}</p>
          )}
        </div>

        {person.identity && (
          <div className="bg-white border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-main uppercase tracking-wider">{t('workforce.identitySummary')}</h3>
            <div className="text-sm space-y-1.5">
              <p className="text-muted">{t('workforce.legalName')}: <span className="text-main">{person.identity.legalName}</span></p>
              <p className="text-muted">{t('workforce.dob')}: <span className="text-main">{person.identity.dateOfBirth}</span></p>
              <p className="text-muted">
                {t('workforce.niNumber')}: <span className="text-main">{maskNiNumber(person.identity.niNumber)}</span>
              </p>
            </div>
          </div>
        )}

        {person.emergencySiteInfo && (
          <div className="bg-white border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-main uppercase tracking-wider">{t('workforce.emergencyContact')}</h3>
            <div className="text-sm space-y-1.5">
              <p className="text-muted">{t('workforce.contactName')}: <span className="text-main">{person.emergencySiteInfo.emergencyContact}</span></p>
              <p className="text-muted">{t('workforce.contactPhone')}: <span className="text-main">{person.emergencySiteInfo.emergencyPhone}</span></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-main font-medium mt-0.5">{value}</p>
    </div>
  );
}