import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/base/Toast';
import {
  getWorkforcePerson,
  getQualifications,
  getInsurancePolicies,
  getDocuments,
  getAuditEvents,
  getReadinessChecks,
  getPersonAssignments,
  getPersonStatusColor,
  getPassportStatusLabel,
  getRelationshipLabel,
  getAvailabilityLabel,
  computeDaysRemaining,
  maskNiNumber,
  maskDocumentRef,
  maskSensitive,
  type WorkforcePerson,
  type ReadinessCheck,
} from '@/mocks/workforce';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import OverviewTab from './components/OverviewTab';
import PassportTab from './components/PassportTab';
import QualificationsTab from './components/QualificationsTab';
import InsuranceTab from './components/InsuranceTab';
import DocumentsTab from './components/DocumentsTab';
import AuditTrailTab from './components/AuditTrailTab';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'passport', label: 'Work Passport' },
  { id: 'qualifications', label: 'Qualifications' },
  { id: 'insurance', label: 'Insurance' },
  { id: 'documents', label: 'Documents' },
  { id: 'history', label: 'Job History' },
  { id: 'payments', label: 'Payments and CIS' },
  { id: 'audit', label: 'Audit Trail' },
];

export default function WorkforceProfile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { personId } = useParams<{ personId: string }>();
  const { showToast: addToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [restrictionTarget, setRestrictionTarget] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(false);
  const [restrictionReason, setRestrictionReason] = useState('');
  const [archiveReason, setArchiveReason] = useState('');

  const person = useMemo(() => {
    if (!personId) return undefined;
    return getWorkforcePerson(personId);
  }, [personId]);

  const readinessChecks = useMemo(() => {
    if (!person) return [];
    return getReadinessChecks(person);
  }, [person]);
  const assignments = useMemo(() => {
    if (!person) return [];
    return getPersonAssignments(person.id);
  }, [person]);
  const qualifications = useMemo(() => {
    if (!person) return [];
    return getQualifications(person.id);
  }, [person]);
  const insurance = useMemo(() => {
    if (!person) return [];
    return getInsurancePolicies(person.id);
  }, [person]);
  const documents = useMemo(() => {
    if (!person) return [];
    return getDocuments(person.id);
  }, [person]);
  const auditEvents = useMemo(() => {
    if (!person) return [];
    return getAuditEvents(person.id);
  }, [person]);

  const daysToExpiry = useMemo(() => {
    return person?.nextExpiryDate ? computeDaysRemaining(person.nextExpiryDate) : undefined;
  }, [person]);
  const hasUrgentAlert = daysToExpiry !== undefined && daysToExpiry <= 30;

  if (!person) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 text-center">
        <div className="bg-white border border-border rounded-xl p-12 max-w-md mx-auto">
          <i className="ri-user-unfollow-line text-4xl text-muted mb-4 block"></i>
          <h2 className="text-lg font-semibold text-main mb-1">{t('workforce.personNotFound')}</h2>
          <p className="text-sm text-muted mb-6">{t('workforce.personNotFoundDesc')}</p>
          <button
            onClick={() => navigate('/workforce')}
            className="px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer"
          >
            {t('workforce.backToWorkforce')}
          </button>
        </div>
      </div>
    );
  }

  const handleRestriction = () => {
    if (!restrictionReason.trim()) return;
    addToast(`${person.displayName} restricted: ${restrictionReason}`);
    setRestrictionTarget(false);
    setRestrictionReason('');
  };

  const handleArchive = () => {
    if (!archiveReason.trim()) return;
    addToast(`${person.displayName} archived`);
    setArchiveTarget(false);
    setArchiveReason('');
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Back link */}
      <button
        onClick={() => navigate('/workforce')}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-main transition-colors cursor-pointer"
      >
        <i className="ri-arrow-left-line"></i>
        {t('workforce.backToWorkforce')}
      </button>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 text-lg font-semibold">{person.initials}</span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-main">{person.displayName}</h1>
            <p className="text-sm text-muted mt-0.5">
              {person.companyName || getRelationshipLabel(person.relationship)} · {person.primaryTrade}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`w-2 h-2 rounded-full ${getPersonStatusColor(person.passportStatus)}`}></span>
              <span className="text-sm font-medium text-main">{getPassportStatusLabel(person.passportStatus)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => addToast(t('workforce.demoAssign'))}
            className="px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2"
          >
            <i className="ri-briefcase-line"></i>
            {t('workforce.assignToJob')}
          </button>
          <button
            onClick={() => addToast(t('workforce.demoRequestDoc'))}
            className="px-4 py-2.5 rounded-lg border border-border bg-white text-main text-sm font-medium hover:bg-background-100 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2"
          >
            <i className="ri-file-add-line"></i>
            {t('workforce.requestDocument')}
          </button>
          <button
            onClick={() => addToast(t('workforce.demoReminder'))}
            className="px-4 py-2.5 rounded-lg border border-border bg-white text-main text-sm font-medium hover:bg-background-100 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2"
          >
            <i className="ri-notification-3-line"></i>
            {t('workforce.sendReminder')}
          </button>
          <button
            onClick={() => navigate(`/workforce/${person.id}/edit`)}
            className="px-4 py-2.5 rounded-lg border border-border bg-white text-main text-sm font-medium hover:bg-background-100 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2"
          >
            <i className="ri-pencil-line"></i>
            {t('workforce.editPassport')}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu((s) => !s)}
              className="px-3 py-2.5 rounded-lg border border-border bg-white text-main text-sm font-medium hover:bg-background-100 transition-colors whitespace-nowrap cursor-pointer"
            >
              <i className="ri-more-line"></i>
            </button>
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMoreMenu(false)}></div>
                <div className="absolute right-0 mt-1 w-56 bg-white border border-border rounded-xl shadow-lg z-40 overflow-hidden">
                  <button
                    onClick={() => { addToast(t('workforce.demoDownload')); setShowMoreMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-main hover:bg-background-50 cursor-pointer"
                  >
                    {t('workforce.downloadSummary')}
                  </button>
                  <button
                    onClick={() => { setRestrictionTarget(true); setShowMoreMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-status-amber hover:bg-background-50 cursor-pointer"
                  >
                    {t('workforce.restrictAssignments')}
                  </button>
                  <div className="border-t border-border"></div>
                  <button
                    onClick={() => { setArchiveTarget(true); setShowMoreMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-status-red hover:bg-background-50 cursor-pointer"
                  >
                    {t('workforce.archiveRecord')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Alert banner */}
      {hasUrgentAlert && person.nextExpiryLabel && (
        <div className={`rounded-xl px-4 py-3 flex items-start gap-3 ${daysToExpiry !== undefined && daysToExpiry <= 7 ? 'bg-status-red/10 border border-status-red/20' : 'bg-status-amber/10 border border-status-amber/20'}`}>
          <i className={`ri-error-warning-line text-lg ${daysToExpiry !== undefined && daysToExpiry <= 7 ? 'text-status-red' : 'text-status-amber'}`}></i>
          <div className="flex-1">
            <p className={`text-sm font-medium ${daysToExpiry !== undefined && daysToExpiry <= 7 ? 'text-status-red' : 'text-status-amber'}`}>
              {person.nextExpiryLabel} expires in {daysToExpiry} {daysToExpiry === 1 ? 'day' : 'days'}
            </p>
            <p className="text-xs text-muted mt-0.5">
              Expiry date: {person.nextExpiryDate ? new Date(person.nextExpiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
            </p>
          </div>
          <button
            onClick={() => addToast(t('workforce.demoRequestRenewal'))}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              daysToExpiry !== undefined && daysToExpiry <= 7
                ? 'bg-status-red text-white hover:bg-red-700'
                : 'bg-status-amber text-white hover:bg-amber-600'
            }`}
          >
            {t('workforce.requestRenewal')}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isComing = ['history', 'payments'].includes(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap cursor-pointer transition-colors relative ${
                  isActive ? 'text-primary-600' : 'text-muted hover:text-main'
                }`}
              >
                {tab.label}
                {isComing && (
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-secondary-100 text-secondary-700">Soon</span>
                )}
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-t-full"></span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab person={person} readinessChecks={readinessChecks} assignments={assignments} />
        )}
        {activeTab === 'passport' && <PassportTab person={person} />}
        {activeTab === 'qualifications' && <QualificationsTab qualifications={qualifications} />}
        {activeTab === 'insurance' && <InsuranceTab insurance={insurance} />}
        {activeTab === 'documents' && <DocumentsTab documents={documents} />}
        {activeTab === 'history' && <ComingSoonTab label={t('workforce.jobHistoryComingSoon')} />}
        {activeTab === 'payments' && <ComingSoonTab label={t('workforce.paymentsCisComingSoon')} />}
        {activeTab === 'audit' && <AuditTrailTab events={auditEvents} />}
      </div>

      {/* Restriction dialog */}
      <ConfirmDialog
        open={restrictionTarget}
        title={t('workforce.restrictTitle')}
        description={t('workforce.restrictDesc')}
        confirmText={t('workforce.confirmRestrict')}
        onConfirm={handleRestriction}
        onCancel={() => { setRestrictionTarget(false); setRestrictionReason(''); }}
        variant="warning"
      >
        <textarea
          value={restrictionReason}
          onChange={(e) => setRestrictionReason(e.target.value)}
          placeholder={t('workforce.restrictionReasonPlaceholder')}
          maxLength={200}
          rows={3}
          className="w-full mt-3 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
        />
      </ConfirmDialog>

      {/* Archive dialog */}
      <ConfirmDialog
        open={archiveTarget}
        title={t('workforce.archiveConfirmTitle')}
        description={t('workforce.archiveConfirmDesc', { name: person.displayName })}
        confirmText={t('workforce.confirmArchive')}
        onConfirm={handleArchive}
        onCancel={() => { setArchiveTarget(false); setArchiveReason(''); }}
        variant="danger"
      >
        <textarea
          value={archiveReason}
          onChange={(e) => setArchiveReason(e.target.value)}
          placeholder={t('workforce.archiveReasonPlaceholder')}
          maxLength={200}
          rows={3}
          className="w-full mt-3 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
        />
      </ConfirmDialog>
    </div>
  );
}

function ComingSoonTab({ label }: { label: string }) {
  return (
    <div className="bg-white border border-border rounded-xl p-12 text-center">
      <i className="ri-time-line text-3xl text-muted mb-3 block"></i>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}