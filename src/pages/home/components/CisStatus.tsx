import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import { useWidgetData } from '@/hooks/useWidgetData';
import { getCisSummary, type CisSummary } from '@/services/dashboard.service';
import { WidgetError, WidgetEmpty, WidgetLoading } from './WidgetState';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CisStatus() {
  const navigate = useNavigate();
  const { organisation } = useOrg();
  const { data, loading, error, reload } = useWidgetData<CisSummary>(
    organisation?.id ?? null,
    getCisSummary,
  );

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-status-purple-pale text-status-purple flex items-center justify-center">
            <i className="ri-government-line text-lg"></i>
          </span>
          <div>
            <h3 className="text-base font-semibold text-main">HMRC CIS &amp; Subcontractors</h3>
            <p className="text-xs text-muted mt-0.5">Subcontractor verification status</p>
          </div>
        </div>
      </div>

      {error ? (
        <WidgetError message={error} onRetry={reload} />
      ) : loading && !data ? (
        <WidgetLoading rows={2} />
      ) : !data || data.total === 0 ? (
        <WidgetEmpty
          icon="ri-user-add-line"
          text="Add a subcontractor to start CIS checks"
          actionLabel="Add a subcontractor"
          onAction={() => navigate('/workforce/invite')}
        />
      ) : (
        <div className="p-5 space-y-4">
          {/* Verification summary */}
          <div className="bg-status-purple-pale rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-status-purple uppercase tracking-wider">
                Subcontractors on file
              </p>
              <p className="text-lg font-bold text-main mt-0.5">{data.total} record{data.total === 1 ? '' : 's'}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-status-purple tabular-nums">{data.verified}</p>
              <p className="text-[11px] text-muted">verified UTR</p>
            </div>
          </div>

          {/* Detail */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold text-status-amber">{data.pending} awaiting verification</p>
              <p className="text-xs text-muted mt-1">Last checked {formatDate(data.lastChecked)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-status-green">{data.verified} verified</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/compliance')}
            className="w-full h-10 px-4 bg-white border border-border hover:bg-page text-main rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
          >
            Open CIS workspace
            <i className="ri-arrow-right-line text-sm"></i>
          </button>
        </div>
      )}
    </div>
  );
}