import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSupabase } from '@/lib/supabase';
import { paymentApplicationsService, type PaymentApplication, type PaymentSummary } from '@/services/payment-applications.service';

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: string }> = {
  paid:        { label: 'Paid',       cls: 'bg-status-green-pale text-status-green',    icon: 'ri-check-double-line' },
  certified:   { label: 'Certified',  cls: 'bg-status-blue-pale text-status-blue',      icon: 'ri-verified-badge-line' },
  submitted:   { label: 'Submitted',  cls: 'bg-status-amber-pale text-status-amber',    icon: 'ri-send-plane-line' },
  draft:       { label: 'Draft',      cls: 'bg-[#F3F4F6] text-muted',                   icon: 'ri-draft-line' },
  disputed:    { label: 'Disputed',   cls: 'bg-status-red-pale text-status-red',        icon: 'ri-error-warning-line' },
  void:        { label: 'Void',       cls: 'bg-[#F3F4F6] text-muted line-through',      icon: 'ri-close-circle-line' },
};

export default function JobPaymentsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [apps, setApps] = useState<PaymentApplication[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [jobName, setJobName] = useState('');
  const [jobRef, setJobRef] = useState('');
  const [jobEstimated, setJobEstimated] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [jobId]);

  async function loadData() {
    if (!jobId) return;
    try {
      setLoading(true);
      const supabase = getSupabase();
      if (!supabase) throw new Error('No Supabase');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const orgId = localStorage.getItem('buildnerveOrgId') || localStorage.getItem('siteLedgerOrgId');
      if (!orgId) {
        const { data: memberships } = await supabase
          .from('organisation_members')
          .select('organisation_id')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .limit(1);
        if (!memberships?.length) throw new Error('No organisation');

        const { data: job } = await supabase
          .from('jobs')
          .select('project_name, reference, estimated_value_pence')
          .eq('id', jobId)
          .maybeSingle();
        if (job) {
          setJobName(job.project_name || 'Unknown job');
          setJobRef(job.reference || '');
          setJobEstimated(job.estimated_value_pence || 0);
        }
        const result = await paymentApplicationsService.getByJob(jobId, memberships[0].organisation_id);
        setApps(result);
        setSummary(paymentApplicationsService.getSummary(result));
      } else {
        const { data: job } = await supabase
          .from('jobs')
          .select('project_name, reference, estimated_value_pence')
          .eq('id', jobId)
          .maybeSingle();
        if (job) {
          setJobName(job.project_name || 'Unknown job');
          setJobRef(job.reference || '');
          setJobEstimated(job.estimated_value_pence || 0);
        }
        const result = await paymentApplicationsService.getByJob(jobId, orgId);
        setApps(result);
        setSummary(paymentApplicationsService.getSummary(result));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment applications');
    } finally {
      setLoading(false);
    }
  }

  const formatMoney = (pence: number): string => {
    return '£' + (pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (d: string | null): string => {
    if (!d) return '\u2014';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-56 bg-background-100 rounded-lg" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1,2,3,4].map((i) => <div key={i} className="h-24 bg-background-100 rounded-xl" />)}
          </div>
          <div className="h-96 bg-background-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6">
        <div className="bg-status-red-pale text-status-red p-4 rounded-xl text-sm">{error}</div>
      </div>
    );
  }

  const pctCertified = jobEstimated > 0 && summary
    ? Math.round((summary.total_certified_pence / jobEstimated) * 100)
    : 0;

  const progressWidth = Math.min(pctCertified, 100);

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/jobs/${jobId}`)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 text-muted hover:text-main transition-colors cursor-pointer"
          >
            <i className="ri-arrow-left-line"></i>
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {jobRef && <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">{jobRef}</span>}
              <span className="text-[11px] text-muted bg-background-100 px-2 py-0.5 rounded-md">{summary?.application_count || 0} applications</span>
            </div>
            <h1 className="text-xl font-bold text-main">{jobName}</h1>
            <p className="text-sm text-muted mt-1">Payment applications and certification history</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-background-50 border border-border rounded-xl p-4">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Total certified</p>
            <p className="text-lg font-bold text-main">{formatMoney(summary.total_certified_pence)}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1.5 bg-background-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full" style={{ width: `${progressWidth}%` }} />
              </div>
              <span className="text-[10px] text-muted whitespace-nowrap">{pctCertified}% of estimate</span>
            </div>
          </div>

          <div className="bg-background-50 border border-border rounded-xl p-4">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Paid to date</p>
            <p className="text-lg font-bold text-status-green">{formatMoney(summary.total_paid_pence)}</p>
            {summary.total_outstanding_pence > 0 && (
              <p className="text-[10px] text-status-amber mt-1">{formatMoney(summary.total_outstanding_pence)} outstanding</p>
            )}
          </div>

          <div className="bg-background-50 border border-border rounded-xl p-4">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Retention held</p>
            <p className="text-lg font-bold text-main">{formatMoney(summary.total_retention_held_pence)}</p>
            <p className="text-[10px] text-muted mt-1">{((summary.total_retention_held_pence / (summary.total_certified_pence || 1)) * 100).toFixed(1)}% of certified</p>
          </div>

          <div className="bg-background-50 border border-border rounded-xl p-4">
            <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Latest valuation</p>
            <p className="text-lg font-bold text-main">{formatMoney(summary.total_valuation_pence)}</p>
            <p className="text-[10px] text-muted mt-1">{apps[0]?.reference || '\u2014'}</p>
          </div>
        </div>
      )}

      {/* Stage Flow Visual */}
      {apps.length > 0 && (
        <div className="bg-background-50 border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Application pipeline</h3>
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {apps.slice().reverse().map((app, i) => {
              const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.draft;
              const isLast = i === apps.length - 1;
              return (
                <div key={app.id} className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${app.status === 'paid' ? 'bg-primary-500' : app.status === 'certified' ? 'bg-status-blue' : app.status === 'submitted' ? 'bg-status-amber' : 'bg-background-200'}`}>
                      <i className={`${cfg.icon} text-sm ${['paid','certified','submitted'].includes(app.status) ? 'text-white' : 'text-muted'}`}></i>
                    </div>
                    <span className="text-[9px] font-medium text-main mt-1.5 whitespace-nowrap">{app.reference?.split('-').pop()}</span>
                    <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${cfg.cls}`}>{cfg.label}</span>
                  </div>
                  {!isLast && (
                    <div className={`w-8 sm:w-12 h-0.5 mx-1 ${['paid','certified','submitted'].includes(app.status) ? 'bg-primary-300' : 'bg-background-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Applications Table */}
      <div className="bg-background-50 border border-border rounded-xl overflow-hidden">
        {apps.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-4">
              <i className="ri-file-list-3-line text-2xl text-muted"></i>
            </div>
            <h3 className="text-base font-semibold text-main mb-1">No payment applications yet</h3>
            <p className="text-sm text-muted">Applications will appear here once submitted for this job.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Application</th>
                    <th className="text-left px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Date</th>
                    <th className="text-left px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Status</th>
                    <th className="text-right px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Valuation</th>
                    <th className="text-right px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Prev. certified</th>
                    <th className="text-right px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Amount due</th>
                    <th className="text-right px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Retention</th>
                    <th className="text-right px-5 py-3 text-xs text-muted uppercase tracking-wider font-medium">Submitted by</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((app) => {
                    const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.draft;
                    return (
                      <tr key={app.id} className="border-b border-border last:border-0 hover:bg-background-100/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-main font-mono text-xs">{app.reference}</span>
                        </td>
                        <td className="px-5 py-3.5 text-muted text-xs">
                          {formatDate(app.application_date)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full ${cfg.cls}`}>
                            <i className={`${cfg.icon} text-[10px]`}></i>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-main">
                          {formatMoney(app.valuation_pence)}
                        </td>
                        <td className="px-5 py-3.5 text-right text-muted">
                          {app.previous_certified_pence > 0 ? formatMoney(app.previous_certified_pence) : '\u2014'}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-main">
                          {app.amount_due_pence > 0 ? formatMoney(app.amount_due_pence) : '\u2014'}
                        </td>
                        <td className="px-5 py-3.5 text-right text-muted">
                          {app.retention_pence > 0 ? formatMoney(app.retention_pence) : '\u2014'}
                        </td>
                        <td className="px-5 py-3.5 text-right text-xs text-muted whitespace-nowrap">
                          {app.creator_name || 'Unknown'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {apps.map((app) => {
                const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.draft;
                return (
                  <div key={app.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-main">{app.reference}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
                        <i className={`${cfg.icon} text-[9px]`}></i>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted">{formatDate(app.application_date)}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted">Valuation</span>
                        <p className="font-medium text-main">{formatMoney(app.valuation_pence)}</p>
                      </div>
                      <div>
                        <span className="text-muted">Amount due</span>
                        <p className="font-semibold text-main">{app.amount_due_pence > 0 ? formatMoney(app.amount_due_pence) : '\u2014'}</p>
                      </div>
                      <div>
                        <span className="text-muted">Prev. certified</span>
                        <p className="font-medium text-main">{app.previous_certified_pence > 0 ? formatMoney(app.previous_certified_pence) : '\u2014'}</p>
                      </div>
                      <div>
                        <span className="text-muted">Retention</span>
                        <p className="font-medium text-main">{app.retention_pence > 0 ? formatMoney(app.retention_pence) : '\u2014'}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted">By {app.creator_name || 'Unknown'}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Info banner */}
      <div className="bg-status-blue-pale text-status-blue p-4 rounded-xl text-sm flex items-start gap-3">
        <i className="ri-information-line mt-0.5 flex-shrink-0"></i>
        <div>
          <p className="font-medium">Construction payment applications</p>
          <p className="mt-0.5">These are job-specific payment applications between contractor and client. They are separate from BuildNerve subscription billing. CIS deductions and subcontractor payments are managed separately.</p>
        </div>
      </div>
    </div>
  );
}