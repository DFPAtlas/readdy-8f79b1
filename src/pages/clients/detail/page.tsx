import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getClientById,
  getPortalAccessByClientId,
  getCommunicationsByProject,
  getDecisionsByClient,
  getCommunicationTypeIcon,
  getCommunicationTypeLabel,
  getDecisionStatusLabel,
  getDecisionStatusColor,
  getPortalStatusLabel,
  getPortalStatusColor,
} from '@/mocks/clients';
import { demoFullJobs } from '@/mocks/jobs';
import type { ClientRecord, ClientPortalAccess, PortalPermission } from '@/mocks/clients';
import { useToast } from '@/components/base/Toast';
import ConfirmDialog from '@/components/base/ConfirmDialog';

const CLIENT_TABS = ['overview', 'communications', 'decisions', 'portalAccess'];

export default function ClientDetail() {
  const { t } = useTranslation();
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [showCommsModal, setShowCommsModal] = useState(false);
  const [commsType, setCommsType] = useState<'internal_note' | 'client_message'>('internal_note');

  const client: ClientRecord | undefined = getClientById(clientId || '');
  const portalAccess: ClientPortalAccess | undefined = clientId ? getPortalAccessByClientId(clientId) : undefined;
  const projectId = client?.activeJobIds[0];
  const communications = getCommunicationsByProject(projectId);
  const decisions = getDecisionsByClient(clientId || '');
  const job = client?.activeJobIds[0] ? demoFullJobs.find((j) => j.id === client.activeJobIds[0]) : undefined;

  if (!client) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
          <i className="ri-user-search-line text-2xl text-muted"></i>
        </div>
        <h2 className="text-lg font-semibold text-main mb-2">{t('dashboard.clientDetail.notFound')}</h2>
        <p className="text-sm text-muted mb-4">{t('dashboard.clientDetail.notFoundDesc')}</p>
        <button className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold cursor-pointer" onClick={() => navigate('/clients')}>
          {t('dashboard.clientDetail.backToClients')}
        </button>
      </div>
    );
  }

  const formatMoney = (v: number) => '£' + v.toLocaleString('en-GB');
  const primaryContact = client.contacts.find((c) => c.isPrimary) || client.contacts[0];
  const portalStatusLabel = getPortalStatusLabel(client.portalStatus);
  const portalStatusColor = getPortalStatusColor(client.portalStatus);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Contact info + Active project side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('dashboard.clientDetail.contactInformation')}</h3>
          <div className="space-y-3">
            {client.contacts.map((ct) => (
              <div key={ct.id} className="flex items-start gap-3 p-3 bg-page rounded-xl">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-primary-700">{ct.firstName[0]}{ct.lastName[0]}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-main">{ct.firstName} {ct.lastName} {ct.isPrimary && <span className="text-[10px] text-primary-500 font-medium">({t('dashboard.clientDetail.primaryContact')})</span>}</p>
                  <p className="text-xs text-muted">{ct.email}</p>
                  <p className="text-xs text-muted">{ct.mobile}</p>
                  <p className="text-[10px] text-muted mt-1">{t('dashboard.clientDetail.preferredContactMethod')}: {ct.preferredContact}</p>
                </div>
              </div>
            ))}
            <div className="text-xs text-muted space-y-1 mt-3">
              <p><strong>{t('dashboard.clientDetail.billingAddress')}:</strong> {client.billingAddress.addressLine1}, {client.billingAddress.town}, {client.billingAddress.postcode}</p>
              {client.siteAddress && (
                <p><strong>{t('dashboard.clientDetail.siteAddress')}:</strong> {client.siteAddress.addressLine1}, {client.siteAddress.town}, {client.siteAddress.postcode}</p>
              )}
            </div>
          </div>
        </div>

        {/* Active Project */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('dashboard.clientDetail.activeProject')}</h3>
          {job ? (
            <div className="space-y-4">
              <div>
                <p className="text-lg font-bold text-main">{job.project}</p>
                <p className="text-sm text-muted">{job.reference} · {job.status}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-page rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full" style={{ width: `${job.progress}%` }} />
                </div>
                <span className="text-sm font-bold text-main">{job.progress}%</span>
              </div>
              <div className="text-xs text-muted space-y-1">
                <p>{t('dashboard.targetCompletion')}: {new Date(job.programme?.targetCompletion || '').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p>{t('dashboard.projectManager')}: {job.projectManager}</p>
              </div>
              <button
                className="text-sm font-semibold text-primary-500 hover:text-primary-600 cursor-pointer"
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                Open job <i className="ri-arrow-right-line ml-1"></i>
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted">{t('dashboard.clientDetail.noActiveProjects')}</p>
          )}
        </div>
      </div>

      {/* Client action required */}
      {client.waitingActions > 0 && (
        <div className="bg-status-amber-pale border border-[#F5E0C0] rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-status-amber uppercase tracking-wider mb-3">{t('dashboard.clientDetail.clientActionRequired')}</h3>
          {decisions.filter((d) => d.status === 'viewed' || d.status === 'requested').map((dec) => (
            <div key={dec.id} className="flex items-center justify-between p-3 bg-white rounded-xl">
              <div>
                <p className="text-sm font-semibold text-main">{dec.question}</p>
                <p className="text-xs text-muted">
                  {dec.relatedVariationRef && `${dec.relatedVariationRef} · `}
                  {dec.costImpact && `${dec.costImpact} · `}
                  {t('dashboard.clientDetail.waitingDays', { days: Math.ceil((new Date('2026-08-05').getTime() - new Date(dec.dueDate).getTime()) / (1000 * 3600 * 24)) * -1 || 2 })}
                </p>
              </div>
              <button
                className="text-xs font-semibold text-status-amber bg-status-amber/10 px-3 py-1.5 rounded-lg hover:bg-status-amber/20 cursor-pointer whitespace-nowrap"
                onClick={() => navigate(`/variations/${dec.relatedVariationId}`)}
              >
                {t('dashboard.portal.reviewVariation')}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('dashboard.clientDetail.recentActivity')}</h3>
        <div className="space-y-2">
          {communications.slice(0, 5).map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.visibility === 'internal_only' ? 'bg-status-amber-pale' : 'bg-primary-50'}`}>
                <i className={`${getCommunicationTypeIcon(c.type)} text-sm ${c.visibility === 'internal_only' ? 'text-status-amber' : 'text-primary-500'}`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-main font-medium truncate">{c.subject}</p>
                <p className="text-[11px] text-muted">{new Date(c.dateTime).toLocaleDateString('en-GB', { day: 'short', month: 'short' })} · {new Date(c.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {c.sender}</p>
              </div>
              {c.visibility === 'internal_only' && (
                <span className="text-[9px] font-medium text-status-amber bg-status-amber-pale px-1.5 py-0.5 rounded-full">{t('dashboard.clientDetail.internalOnly')}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCommunications = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          className="h-9 px-3.5 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          onClick={() => { setCommsType('internal_note'); setShowCommsModal(true); }}
        >
          <i className="ri-sticky-note-line"></i>{t('dashboard.clientDetail.addInternalNote')}
        </button>
        <button
          className="h-9 px-3.5 border border-border text-main text-xs font-semibold rounded-xl hover:bg-page cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          onClick={() => { setCommsType('client_message'); setShowCommsModal(true); }}
        >
          <i className="ri-chat-1-line"></i>{t('dashboard.clientDetail.sendClientMessage')}
        </button>
      </div>

      {communications.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-xl bg-page flex items-center justify-center mx-auto mb-3">
            <i className="ri-chat-history-line text-xl text-muted"></i>
          </div>
          <p className="text-sm text-muted">{t('dashboard.clientDetail.noCommunications')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {communications.map((c) => (
            <div key={c.id} className={`bg-white border rounded-2xl p-4 ${c.visibility === 'internal_only' ? 'border-l-status-amber border-l-[3px]' : 'border-border'}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.visibility === 'internal_only' ? 'bg-status-amber-pale' : 'bg-primary-50'}`}>
                    <i className={`${getCommunicationTypeIcon(c.type)} text-xs ${c.visibility === 'internal_only' ? 'text-status-amber' : 'text-primary-500'}`}></i>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-main">{c.subject}</p>
                    <p className="text-[10px] text-muted">{getCommunicationTypeLabel(c.type)} · {new Date(c.dateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {new Date(c.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.visibility === 'internal_only' && (
                    <span className="text-[9px] font-medium text-status-amber bg-status-amber-pale px-1.5 py-0.5 rounded-full whitespace-nowrap">{t('dashboard.clientDetail.internalOnly')}</span>
                  )}
                  <span className="text-[10px] text-muted">{c.sender}</span>
                </div>
              </div>
              <p className="text-sm text-main leading-relaxed ml-9">{c.message}</p>
              {c.projectName && (
                <p className="text-[10px] text-muted mt-2 ml-9">{c.projectName} · Ref: {c.auditRef}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Comms Modal */}
      {showCommsModal && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCommsModal(false)}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-[90vw] max-w-lg p-6">
            <h2 className="text-lg font-semibold text-main mb-1">
              {commsType === 'internal_note' ? t('dashboard.clientDetail.addInternalNote') : t('dashboard.clientDetail.sendClientMessage')}
            </h2>
            {commsType === 'internal_note' && (
              <p className="text-xs text-status-amber mb-4">{t('dashboard.clientDetail.internalNoteWarning')}</p>
            )}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">{t('dashboard.clientDetail.messageSubject')}</label>
                <input type="text" className="w-full h-10 px-3 border border-border rounded-xl text-sm text-main focus:outline-none focus:border-primary-300" placeholder="Subject..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1">{t('dashboard.clientDetail.messageText')}</label>
                <textarea className="w-full h-24 px-3 py-2 border border-border rounded-xl text-sm text-main focus:outline-none focus:border-primary-300 resize-none" placeholder="Write your message..." />
              </div>
              <div className="flex gap-3">
                <button
                  className="flex-1 h-10 border border-border text-main rounded-xl text-sm font-semibold hover:bg-page cursor-pointer"
                  onClick={() => setShowCommsModal(false)}
                >
                  {t('dashboard.cancel')}
                </button>
                <button
                  className="flex-1 h-10 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold cursor-pointer"
                  onClick={() => { showToast('Message sent (demo).', 'success'); setShowCommsModal(false); }}
                >
                  {commsType === 'internal_note' ? t('dashboard.clientDetail.addInternalNote') : t('dashboard.clients.sendUpdate')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderDecisions = () => (
    <div className="space-y-4">
      {decisions.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-xl bg-page flex items-center justify-center mx-auto mb-3">
            <i className="ri-question-answer-line text-xl text-muted"></i>
          </div>
          <p className="text-sm text-muted">{t('dashboard.clientDetail.noDecisions')}</p>
        </div>
      ) : (
        decisions.map((dec) => {
          const statusColor = getDecisionStatusColor(dec.status);
          const statusLabel = getDecisionStatusLabel(dec.status);
          return (
            <div key={dec.id} className="bg-white border border-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h4 className="text-base font-semibold text-main">{dec.question}</h4>
                  {dec.description && <p className="text-sm text-muted mt-1">{dec.description}</p>}
                </div>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${statusColor}`}>{statusLabel}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                {dec.options.length > 0 && (
                  <div>
                    <p className="text-muted mb-1">{t('dashboard.clientDetail.options')}</p>
                    {dec.options.map((o, i) => (
                      <p key={i} className={`text-main ${dec.selectedOption === o ? 'font-semibold text-primary-500' : ''}`}>{o}</p>
                    ))}
                  </div>
                )}
                {dec.costImpact && <div><p className="text-muted mb-1">{t('dashboard.clientDetail.costImpact')}</p><p className="text-main font-medium">{dec.costImpact}</p></div>}
                {dec.programmeImpact && <div><p className="text-muted mb-1">{t('dashboard.clientDetail.programmeImpact')}</p><p className="text-main font-medium">{dec.programmeImpact}</p></div>}
                <div><p className="text-muted mb-1">{t('dashboard.clientDetail.dueDate')}</p><p className="text-main font-medium">{new Date(dec.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
              </div>
              {dec.relatedVariationRef && (
                <button className="text-xs text-primary-500 hover:text-primary-600 font-medium cursor-pointer mb-3" onClick={() => navigate(`/variations/${dec.relatedVariationId}`)}>
                  {dec.relatedVariationRef} <i className="ri-arrow-right-line ml-1"></i>
                </button>
              )}
              {dec.selectedOption && (
                <div className="bg-primary-50 rounded-xl p-3 mb-3">
                  <p className="text-xs text-primary-700 font-medium">{t('dashboard.clientDetail.selected')}: {dec.selectedOption}</p>
                  {dec.respondedBy && <p className="text-[10px] text-muted mt-1">{t('dashboard.clientDetail.approvedBy')}: {dec.respondedBy} · {dec.respondedAt && new Date(dec.respondedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>}
                </div>
              )}
              {/* Audit History */}
              <div className="border-t border-border pt-3 mt-3">
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">{t('dashboard.clientDetail.auditHistory')}</p>
                <div className="space-y-1">
                  {dec.auditHistory.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <span className="text-muted">{new Date(entry.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {new Date(entry.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="w-1 h-1 rounded-full bg-muted"></span>
                      <span className="text-main">{entry.event}</span>
                      <span className="text-muted">— {entry.actor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderPortalAccess = () => {
    if (!portalAccess) {
      return (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-xl bg-page flex items-center justify-center mx-auto mb-3">
            <i className="ri-lock-line text-xl text-muted"></i>
          </div>
          <p className="text-sm text-muted">{t('dashboard.clientDetail.portalComingSoon')}</p>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        {/* Status */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('dashboard.clientDetail.portalStatus')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-muted uppercase mb-1">{t('dashboard.clientDetail.portalStatus')}</p>
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${portalStatusColor}`}>{portalStatusLabel}</span>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase mb-1">{t('dashboard.clientDetail.invitedContacts')}</p>
              <div className="space-y-0.5">
                {portalAccess.invitedContacts.map((e, i) => <p key={i} className="text-sm text-main">{e}</p>)}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase mb-1">{t('dashboard.clientDetail.lastAccessed')}</p>
              <p className="text-sm text-main">{portalAccess.lastAccessed ? new Date(portalAccess.lastAccessed).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : t('dashboard.clientDetail.never')}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase mb-1">{t('dashboard.clientDetail.accessExpiry')}</p>
              <p className="text-sm text-main">{portalAccess.accessExpiry ? new Date(portalAccess.accessExpiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : t('dashboard.clientDetail.noExpiry')}</p>
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('dashboard.clientDetail.permissions')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {portalAccess.permissions.map((perm: PortalPermission) => (
              <div key={perm.id} className="flex items-center gap-2 p-2 rounded-lg bg-page">
                <i className={`ri-${perm.granted ? 'checkbox-circle-line text-primary-500' : 'checkbox-blank-circle-line text-muted'}`}></i>
                <span className={`text-xs ${perm.granted ? 'text-main' : 'text-muted'}`}>{perm.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('dashboard.clientDetail.projectsAvailable')}</h3>
          {client.activeJobRefs.map((ref, i) => (
            <div key={ref} className="flex items-center justify-between py-2">
              <span className="text-sm text-main">{ref} · {client.activeJobNames[i]}</span>
              <button className="text-xs text-primary-500 hover:text-primary-600 font-medium cursor-pointer" onClick={() => window.open(`/client/${portalAccess.token}`, '_blank')}>
                {t('dashboard.clientDetail.openPortalView')} <i className="ri-external-link-line ml-1"></i>
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            className="h-10 px-4 border border-status-red text-status-red text-sm font-semibold rounded-xl hover:bg-status-red-pale cursor-pointer whitespace-nowrap"
            onClick={() => setShowRevokeConfirm(true)}
          >
            {t('dashboard.clientDetail.revokeAccess')}
          </button>
          <button
            className="h-10 px-4 border border-border text-main text-sm font-semibold rounded-xl hover:bg-page cursor-pointer whitespace-nowrap"
            onClick={() => setShowRegenConfirm(true)}
          >
            {t('dashboard.clientDetail.regenerateAccess')}
          </button>
        </div>

        <ConfirmDialog
          open={showRevokeConfirm}
          title={t('dashboard.clientDetail.revokeConfirmTitle')}
          description={t('dashboard.clientDetail.revokeConfirmDesc', { name: client.displayName })}
          confirmText={t('dashboard.clientDetail.confirmRevoke')}
          variant="danger"
          onConfirm={() => { showToast('Portal access revoked (demo).', 'warning'); setShowRevokeConfirm(false); }}
          onCancel={() => setShowRevokeConfirm(false)}
        />
        <ConfirmDialog
          open={showRegenConfirm}
          title={t('dashboard.clientDetail.regenerateConfirmTitle')}
          description={t('dashboard.clientDetail.regenerateConfirmDesc')}
          confirmText={t('dashboard.clientDetail.confirmRegenerate')}
          variant="warning"
          onConfirm={() => { showToast('Access link regenerated (demo).', 'info'); setShowRegenConfirm(false); }}
          onCancel={() => setShowRegenConfirm(false)}
        />
      </div>
    );
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
      <button className="text-sm font-medium text-muted hover:text-main transition-colors cursor-pointer flex items-center gap-1" onClick={() => navigate('/clients')}>
        <i className="ri-arrow-left-line text-base"></i>
        {t('dashboard.clientDetail.backToClients')}
      </button>

      {/* Header */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                {client.type === 'individual' ? t('dashboard.clients.typeIndividual') : t('dashboard.clients.typeBusiness')} {t('dashboard.clients.colClient').toLowerCase()}
              </span>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${portalStatusColor}`}>{portalStatusLabel}</span>
            </div>
            <h1 className="text-xl font-bold text-main">{client.displayName}</h1>
            {client.companyName && <p className="text-sm text-muted mt-1">{client.companyName}</p>}
            {client.activeJobNames.length > 0 && (
              <p className="text-sm text-muted mt-1">{client.activeJobNames[0]}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {portalAccess && (
              <button
                className="h-9 px-3.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                onClick={() => window.open(`/client/${portalAccess.token}`, '_blank')}
              >
                <i className="ri-eye-line"></i>{t('dashboard.clientDetail.openPortalView')}
              </button>
            )}
            <button
              className="h-9 px-3.5 border border-border text-main text-sm font-medium rounded-xl hover:bg-page cursor-pointer whitespace-nowrap"
              onClick={() => showToast(t('dashboard.clients.demoSendUpdate'), 'info')}
            >
              {t('dashboard.clientDetail.sendUpdate')}
            </button>
            <button
              className="h-9 px-3.5 border border-border text-main text-sm font-medium rounded-xl hover:bg-page cursor-pointer whitespace-nowrap"
              onClick={() => navigate('/variations/new')}
            >
              {t('dashboard.clientDetail.createVariation')}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex items-center gap-1 border-b border-border pb-0 min-w-max">
          {CLIENT_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 -mb-[1px] ${
                activeTab === tab ? 'text-primary-500 border-primary-500' : 'text-muted border-transparent hover:text-main'
              }`}
            >
              {t(`dashboard.clientDetail.${tab}`)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'communications' && renderCommunications()}
      {activeTab === 'decisions' && renderDecisions()}
      {activeTab === 'portalAccess' && renderPortalAccess()}
    </div>
  );
}