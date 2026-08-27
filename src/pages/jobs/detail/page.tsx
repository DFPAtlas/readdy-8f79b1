import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { demoFullJobs } from '@/mocks/jobs';
import { useToast } from '@/components/base/Toast';
import type { FullJob } from '@/mocks/jobs';
import { getVariationsByJob, getVariationStatusLabel, getVariationStatusColor, getPortalAccessByClientId, getPortalStatusLabel } from '@/mocks/clients';
import { getEvidenceByJob, getEvidenceTypeLabel, getEvidenceTypeIcon, getReviewStatusLabel, getReviewStatusColor, getVisibilityLabel, getVisibilityColor, getTimelineEventsByJob, getEventCategoryLabel, getEventCategoryColor } from '@/mocks/evidence';

const TABS = ['overview', 'timeline', 'schedule', 'team', 'variations', 'evidence', 'financials', 'documents', 'compliance', 'clientPortal'];

const statusColorMap: Record<string, string> = {
  green: 'bg-primary-50 text-primary-700',
  amber: 'bg-status-amber-pale text-status-amber',
  blue: 'bg-status-blue-pale text-status-blue',
  red: 'bg-status-red-pale text-status-red',
};

const statusDotMap: Record<string, string> = {
  green: 'bg-primary-500',
  amber: 'bg-status-amber',
  blue: 'bg-status-blue',
  red: 'bg-status-red',
};

const workerColors = ['bg-primary-500', 'bg-status-amber', 'bg-status-blue', 'bg-status-purple', 'bg-status-red'];

function formatMoney(v: number): string {
  return '£' + v.toLocaleString('en-GB');
}

const progressStages = [
  { name: 'Pre-start', key: 'prestart' },
  { name: 'Groundworks', key: 'groundworks' },
  { name: 'Structure', key: 'structure' },
  { name: 'First fix', key: 'firstfix' },
  { name: 'Second fix', key: 'secondfix' },
  { name: 'Finishing', key: 'finishing' },
  { name: 'Handover', key: 'handover' },
];

const evidenceItems = [
  { date: '5 Aug', time: '09:42', by: 'Martin Hewett', caption: 'Steel beams delivered to site. Checked against schedule.', internal: false, img: 'https://readdy.ai/api/search-image?query=Steel%20beams%20on%20construction%20site%20under%20natural%20light%20with%20professional%20building%20documentation%20style&width=96&height=96&seq=evidence-01&orientation=squarish' },
  { date: '5 Aug', time: '08:15', by: 'James Lawrence', caption: 'Site set-up complete. Welfare checked and working.', internal: true, img: 'https://readdy.ai/api/search-image?query=Clean%20organized%20construction%20site%20welfare%20area%20with%20safety%20signage%20and%20professional%20layout&width=96&height=96&seq=evidence-02&orientation=squarish' },
  { date: '4 Aug', time: '16:30', by: 'Adam Khan', caption: 'Brickwork to rear elevation complete. Pointing started.', internal: false, img: 'https://readdy.ai/api/search-image?query=Completed%20brickwork%20on%20building%20extension%20with%20clean%20pointing%20and%20professional%20finish%20under%20daylight&width=96&height=96&seq=evidence-03&orientation=squarish' },
  { date: '4 Aug', time: '11:20', by: 'Martin Hewett', caption: 'Building Control inspection — footings passed.', internal: false, img: 'https://readdy.ai/api/search-image?query=Building%20foundation%20footings%20on%20construction%20site%20with%20measuring%20tape%20and%20inspection%20documentation&width=96&height=96&seq=evidence-04&orientation=squarish' },
  { date: '3 Aug', time: '14:05', by: 'James Lawrence', caption: 'Floor insulation installed. DPM checked.', internal: true, img: 'https://readdy.ai/api/search-image?query=Floor%20insulation%20being%20installed%20in%20construction%20project%20with%20damp%20proof%20membrane%20visible&width=96&height=96&seq=evidence-05&orientation=squarish' },
  { date: '3 Aug', time: '10:15', by: 'Martin Hewett', caption: 'Client meeting — kitchen door colour approved.', internal: false, img: 'https://readdy.ai/api/search-image?query=Kitchen%20design%20samples%20and%20color%20swatches%20on%20wooden%20table%20during%20client%20construction%20meeting&width=96&height=96&seq=evidence-06&orientation=squarish' },
];

export default function JobDetail() {
  const { t } = useTranslation();
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  const job: FullJob | undefined = demoFullJobs.find((j) => j.id === jobId);

  if (!job) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
          <i className="ri-error-warning-line text-2xl text-muted"></i>
        </div>
        <h2 className="text-lg font-semibold text-main mb-2">Job not found</h2>
        <p className="text-sm text-muted mb-4">The job you&apos;re looking for doesn&apos;t exist or has been archived.</p>
        <button
          className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
          onClick={() => navigate('/jobs')}
        >
          Return to jobs
        </button>
      </div>
    );
  }

  const progressStagesDone = (job.progress / 100) * progressStages.length;
  const financials = job.financials;

  const renderOverview = () => (
    <div className="space-y-6">
      {/* 1. Next action */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">{t('dashboard.nextActionLabel')}</h3>
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${statusDotMap[job.statusColor]} bg-opacity-20`}>
            <i className="ri-arrow-right-circle-line text-xl" style={{ color: statusDotMap[job.statusColor] === 'bg-primary-500' ? '#176C5B' : statusDotMap[job.statusColor] === 'bg-status-amber' ? '#B96C22' : statusDotMap[job.statusColor] === 'bg-status-blue' ? '#3779A7' : '#B94747' }}></i>
          </div>
          <div>
            <p className="text-base font-semibold text-main">{job.nextAction}</p>
            <p className="text-sm text-muted mt-0.5">{job.nextActionTime}</p>
            <p className="text-xs text-muted mt-1">{t('dashboard.assignedTo')}: {job.workers.join(', ')}</p>
          </div>
        </div>
      </div>

      {/* 2. Project Progress */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('dashboard.projectProgress')}</h3>
        <div className="space-y-2">
          {progressStages.map((stage, i) => {
            const status: 'done' | 'in-progress' | 'upcoming' =
              i < Math.floor(progressStagesDone) ? 'done' :
              i === Math.floor(progressStagesDone) ? 'in-progress' : 'upcoming';
            return (
              <div key={stage.key} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  status === 'done' ? 'bg-primary-500' :
                  status === 'in-progress' ? 'bg-primary-100 border-2 border-primary-500' :
                  'bg-page border-2 border-border'
                }`}>
                  {status === 'done' ? (
                    <i className="ri-check-line text-xs text-white"></i>
                  ) : status === 'in-progress' ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                  )}
                </div>
                <span className={`text-sm ${status === 'upcoming' ? 'text-muted' : 'text-main font-medium'}`}>{stage.name}</span>
                {status === 'done' && <span className="text-[10px] text-primary-500 font-medium ml-auto">Complete</span>}
                {status === 'in-progress' && <span className="text-[10px] text-status-amber font-medium ml-auto">In progress</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Financial Position */}
      <div className="bg-white border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">{t('dashboard.financialPosition')}</h3>
          <a
            href={`/jobs/${jobId}/payments`}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
            onClick={(e) => { e.preventDefault(); navigate(`/jobs/${jobId}/payments`); }}
          >
            Payment applications <i className="ri-arrow-right-line"></i>
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t('dashboard.originalContract'), value: formatMoney(financials.contractValue) },
            { label: t('dashboard.approvedVariations'), value: formatMoney(financials.approvedVariations), color: 'text-status-amber' },
            { label: t('dashboard.revisedContract'), value: formatMoney(financials.revisedContract), bold: true },
            { label: t('dashboard.invoiced'), value: formatMoney(financials.invoiced) },
            { label: t('dashboard.paid'), value: formatMoney(financials.paid), color: 'text-primary-500' },
            { label: t('dashboard.outstanding'), value: formatMoney(financials.outstanding), color: financials.outstanding > 0 ? 'text-status-red' : 'text-muted' },
            { label: t('dashboard.retentionHeld'), value: formatMoney(financials.retentionHeld) },
            { label: '', value: '', spacer: true },
          ].map((item, i) => (
            item.spacer ? <div key={i} /> : (
              <div key={i}>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{item.label}</p>
                <p className={`text-sm ${item.bold ? 'font-bold text-main text-base' : 'font-semibold text-main'} ${item.color || ''}`}>{item.value}</p>
              </div>
            )
            ))}
          </div>
        </div>

        {/* 4. Client Decisions + 5. Evidence side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client Decisions */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('dashboard.clientDecisions')}</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                  <i className="ri-check-line text-white text-sm"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-main">Kitchen door colour</p>
                  <p className="text-[11px] text-primary-700">Approved</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-status-amber-pale rounded-xl">
                <div className="w-8 h-8 rounded-full bg-status-amber/20 flex items-center justify-center flex-shrink-0">
                  <i className="ri-time-line text-status-amber text-sm"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-main">Additional sockets</p>
                  <p className="text-[11px] text-status-amber">Awaiting approval</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-status-blue-pale rounded-xl">
                <div className="w-8 h-8 rounded-full bg-status-blue/20 flex items-center justify-center flex-shrink-0">
                  <i className="ri-calendar-line text-status-blue text-sm"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-main">Flooring selection</p>
                  <p className="text-[11px] text-status-blue">Due Friday</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Evidence */}
          <div className="bg-white border border-border rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('dashboard.recentSiteEvidence')}</h3>
            <div className="space-y-3 max-h-[280px] overflow-y-auto">
              {evidenceItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-page transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-page flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <img
                      src={item.img}
                      alt={item.caption}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-main leading-snug line-clamp-2">{item.caption}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted">{item.date} · {item.time}</span>
                      <span className="text-[10px] text-muted">by {item.by}</span>
                      {item.internal && <span className="text-[9px] font-medium text-status-amber bg-status-amber-pale px-1.5 py-0.5 rounded-full">Internal</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 6. Team & Compliance */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('dashboard.teamAndCompliance')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {job.teamMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 border border-border rounded-xl">
                <div className={`w-9 h-9 rounded-full ${workerColors[job.teamMembers.indexOf(m) % workerColors.length]} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-xs font-semibold text-white">{m.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-main truncate">{m.name}</p>
                  <p className="text-[11px] text-muted truncate">{m.trade}</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                  m.complianceState === 'compliant' ? 'bg-primary-50 text-primary-700' :
                  m.complianceState === 'attention' ? 'bg-status-amber-pale text-status-amber' :
                  'bg-status-red-pale text-status-red'
                }`}>
                  {m.complianceState === 'compliant' ? t('dashboard.compliant') : t('dashboard.needsAttention')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 7. Important Job Information */}
        {job.programme && (
          <div className="bg-white border border-border rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('dashboard.jobInformation')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{t('dashboard.startDate')}</p>
                <p className="text-sm font-medium text-main">{new Date(job.programme.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{t('dashboard.targetCompletion')}</p>
                <p className="text-sm font-medium text-main">{new Date(job.programme.targetCompletion).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{t('dashboard.workingHours')}</p>
                <p className="text-sm font-medium text-main">{job.programme.siteWorkingHours}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{t('dashboard.siteAccess')}</p>
                <p className="text-sm font-medium text-main">{job.siteAddress?.accessNotes ? 'See notes' : 'Standard'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{t('dashboard.parking')}</p>
                <p className="text-sm font-medium text-main">{job.siteAddress?.accessNotes?.includes('driveway') ? 'Driveway' : 'On street'}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{t('dashboard.wasteArrangements')}</p>
                <p className="text-sm font-medium text-main">Skip on site</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{t('dashboard.buildingControl')}</p>
                <p className="text-sm font-medium text-main">Notified</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider mb-1">{t('dashboard.ramsStatus')}</p>
                <p className="text-sm font-medium text-primary-500">Approved</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );

    const renderPlaceholder = () => (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
            <i className="ri-tools-line text-2xl text-muted"></i>
          </div>
          <h3 className="text-base font-semibold text-main">{t('dashboard.comingSoon')}</h3>
          <p className="text-sm text-muted mt-1">{t('dashboard.comingSoonDesc')}</p>
        </div>
      </div>
    );

    const renderVariations = () => {
      const variations = getVariationsByJob(jobId || '');
      if (variations.length === 0) {
        return (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
                <i className="ri-price-tag-3-line text-2xl text-muted"></i>
              </div>
              <h3 className="text-base font-semibold text-main">No variations yet</h3>
              <p className="text-sm text-muted mt-1">Create a variation to track project changes.</p>
              <button
                className="mt-4 h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl cursor-pointer"
                onClick={() => navigate('/variations/new')}
              >
                {t('dashboard.variations.newVariation')}
              </button>
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          {variations.map((v) => {
            const vStatusColor = getVariationStatusColor(v.status);
            const vStatusLabel = getVariationStatusLabel(v.status);
            return (
              <div
                key={v.id}
                className="bg-white border border-border rounded-2xl p-5 cursor-pointer hover:border-primary-200 transition-colors flex items-center justify-between gap-4"
                onClick={() => navigate(`/variations/${v.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-primary-500">{v.reference}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${vStatusColor}`}>{vStatusLabel}</span>
                  </div>
                  <p className="text-sm font-semibold text-main">{v.title}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mt-1">
                    <span>£{v.latestTotalPrice.toLocaleString('en-GB')} total</span>
                    <span>{v.programmeImpactDays > 0 ? `${v.programmeImpactDays} day${v.programmeImpactDays > 1 ? 's' : ''}` : 'No programme impact'}</span>
                    {v.approvalDeadline && <span>Due {new Date(v.approvalDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                  </div>
                </div>
                <i className="ri-arrow-right-s-line text-muted"></i>
              </div>
            );
          })}
          <button
            className="w-full h-10 border border-dashed border-border rounded-xl text-sm font-semibold text-muted hover:text-primary-500 hover:border-primary-300 cursor-pointer"
            onClick={() => navigate('/variations/new')}
          >
            <i className="ri-add-line mr-1"></i>{t('dashboard.variations.newVariation')}
          </button>
        </div>
      );
    };

    const renderClientPortalTab = () => {
      const portalAccess = job?.clientDetails ? getPortalAccessByClientId(job.clientDetails.id || job.clientId) : undefined;
      if (!portalAccess) {
        return (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
                <i className="ri-lock-line text-2xl text-muted"></i>
              </div>
              <h3 className="text-base font-semibold text-main">Portal not configured</h3>
              <p className="text-sm text-muted mt-1">Invite this client to the portal to share progress, decisions and variations.</p>
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-6">
          <div className="bg-white border border-border rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">{t('dashboard.clientDetail.portalStatus')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[10px] text-muted uppercase mb-1">{t('dashboard.clientDetail.portalStatus')}</p>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${getPortalStatusLabel(job.clientDetails ? getPortalAccessByClientId(job.clientDetails.id)?.status || 'not_invited' : 'not_invited') === 'Active' ? 'bg-status-green text-white' : 'bg-gray-300 text-gray-700'}`}>
                  {getPortalStatusLabel(portalAccess.status)}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase mb-1">{t('dashboard.clientDetail.lastAccessed')}</p>
                <p className="text-sm text-main">{portalAccess.lastAccessed ? new Date(portalAccess.lastAccessed).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : t('dashboard.clientDetail.never')}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase mb-1">{t('dashboard.clientDetail.invitedContacts')}</p>
                <div className="space-y-0.5">
                  {portalAccess.invitedContacts.map((e, i) => <p key={i} className="text-sm text-main">{e}</p>)}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted uppercase mb-1">Actions</p>
                <button
                  className="text-sm font-semibold text-primary-500 hover:text-primary-600 cursor-pointer"
                  onClick={() => window.open(`/client/${portalAccess.token}`, '_blank')}
                >
                  {t('dashboard.clientDetail.openPortalView')} <i className="ri-external-link-line ml-1 text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    };

    const renderEvidenceTab = () => {
      const evidence = getEvidenceByJob(jobId || '');
      if (evidence.length === 0) {
        return (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
                <i className="ri-camera-line text-2xl text-muted"></i>
              </div>
              <h3 className="text-base font-semibold text-main">No evidence yet</h3>
              <p className="text-sm text-muted mt-1">Evidence will appear as the project progresses.</p>
              <button className="mt-4 h-10 px-5 bg-primary-500 text-white text-sm font-semibold rounded-xl cursor-pointer" onClick={() => navigate(`/site/${jobId}/capture`)}>
                <i className="ri-camera-line mr-1.5"></i>Capture evidence
              </button>
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{evidence.length} items</span>
            <div className="flex gap-1">
              <button className="h-8 px-3 text-xs font-medium bg-primary-500 text-white rounded-lg cursor-pointer whitespace-nowrap" onClick={() => navigate(`/site/${jobId}/capture`)}>
                <i className="ri-add-line mr-1"></i>Capture
              </button>
              <button className="h-8 px-3 text-xs font-medium border border-border text-main rounded-lg hover:bg-page cursor-pointer whitespace-nowrap" onClick={() => navigate('/evidence')}>
                View all evidence
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {evidence.map((ev) => (
              <div key={ev.id} className="bg-white border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-primary-200 transition-colors" onClick={() => navigate(`/evidence/${ev.id}`)}>
                <div className="aspect-[4/3] bg-page relative">
                  {ev.attachments.find((a) => a.previewUrl) ? (
                    <img src={ev.attachments.find((a) => a.previewUrl)?.previewUrl} alt={ev.caption} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <i className={`${getEvidenceTypeIcon(ev.evidenceType)} text-2xl text-muted`}></i>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <span className="text-[9px] font-medium bg-white/90 backdrop-blur-sm text-main px-1.5 py-0.5 rounded-full">{getEvidenceTypeLabel(ev.evidenceType)}</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${getVisibilityColor(ev.visibility)}`}>{getVisibilityLabel(ev.visibility)}</span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-main leading-snug line-clamp-2">{ev.caption}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted">{new Date(ev.capturedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {ev.capturedBy}</span>
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${getReviewStatusColor(ev.reviewStatus)}`}>{getReviewStatusLabel(ev.reviewStatus)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    };

    const renderTimelineTab = () => {
      const events = getTimelineEventsByJob(jobId || '');
      if (events.length === 0) {
        return (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
                <i className="ri-timeline-view text-2xl text-muted"></i>
              </div>
              <h3 className="text-base font-semibold text-main">No timeline events yet</h3>
              <p className="text-sm text-muted mt-1">Events will appear as the project progresses.</p>
            </div>
          </div>
        );
      }
      const recentEvents = events.slice(0, 12);
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{events.length} events</span>
            <button className="h-8 px-3 text-xs font-medium border border-border text-main rounded-lg hover:bg-page cursor-pointer whitespace-nowrap" onClick={() => navigate(`/jobs/${jobId}/timeline`)}>
              Open full timeline
            </button>
          </div>
          <div className="space-y-2">
            {recentEvents.map((ev) => (
              <div key={ev.id} className="flex gap-3">
                <div className="flex flex-col items-center flex-shrink-0 w-7">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${getEventCategoryColor(ev.eventCategory)}`}>
                    <i className={`${ev.eventCategory === 'milestone' ? 'ri-flag-line' : ev.eventCategory === 'photo' ? 'ri-camera-line' : ev.eventCategory === 'variation' ? 'ri-price-tag-3-line' : ev.eventCategory === 'delay' ? 'ri-timer-line' : ev.eventCategory === 'decision' ? 'ri-question-answer-line' : 'ri-record-circle-line'} text-white text-xs`}></i>
                  </div>
                  <div className="w-0.5 flex-1 bg-border min-h-[8px]"></div>
                </div>
                <div className="flex-1 pb-2">
                  <div className="bg-white border border-border rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-medium text-muted bg-page px-1.5 py-0.5 rounded-full">{getEventCategoryLabel(ev.eventCategory)}</span>
                      <span className="text-[10px] text-muted">{new Date(ev.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <p className="text-xs font-semibold text-main">{ev.title}</p>
                    <p className="text-[10px] text-muted mt-0.5">{ev.summary}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-4 h-4 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-primary-600">{ev.actorInitials}</span>
                      </div>
                      <span className="text-[9px] text-muted">{ev.actor}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Breadcrumb + Back */}
        <button
          className="text-sm font-medium text-muted hover:text-main transition-colors cursor-pointer flex items-center gap-1"
          onClick={() => navigate('/jobs')}
        >
          <i className="ri-arrow-left-line text-base"></i>
          Back to Jobs
        </button>

        {/* Job Header */}
        <div className="bg-white border border-border rounded-2xl p-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">{job.reference}</span>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusColorMap[job.statusColor]}`}>{job.status}</span>
                <span className="text-[10px] text-muted bg-page px-2 py-0.5 rounded-md">{job.trade}</span>
              </div>
              <h1 className="text-xl font-bold text-main">{job.project}</h1>
              <p className="text-sm text-muted mt-1">{job.client} · {job.site}</p>
              {/* Progress bar */}
              <div className="flex items-center gap-3 mt-3 max-w-sm">
                <div className="flex-1 h-2 bg-page rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${statusDotMap[job.statusColor]}`} style={{ width: `${job.progress}%` }} />
                </div>
                <span className="text-sm font-bold text-main">{job.progress}%</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted">
                <span>PM: {job.projectManager}</span>
                <span>·</span>
                <span>Updated {job.updated}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                className="h-9 px-4 border border-border text-main text-sm font-medium rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                onClick={() => showToast('Edit will be added in the next build.', 'info')}
              >
                <i className="ri-edit-line text-sm"></i>
                {t('dashboard.editJob')}
              </button>
              <button
                className="h-9 w-9 flex items-center justify-center border border-border rounded-xl hover:bg-page transition-colors cursor-pointer"
                onClick={() => showToast('More actions coming soon.', 'info')}
                aria-label={t('dashboard.moreActions')}
              >
                <i className="ri-more-2-fill text-lg text-muted"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex items-center gap-1 border-b border-border pb-0 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 -mb-[1px] ${
                  activeTab === tab
                    ? 'text-primary-500 border-primary-500'
                    : 'text-muted border-transparent hover:text-main'
                }`}
              >
                {t(`dashboard.detailTabs.${tab}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' ? renderOverview() :
         activeTab === 'timeline' ? renderTimelineTab() :
         activeTab === 'evidence' ? renderEvidenceTab() :
         activeTab === 'variations' ? renderVariations() :
         activeTab === 'clientPortal' ? renderClientPortalTab() :
         renderPlaceholder()}
      </div>
    );
}