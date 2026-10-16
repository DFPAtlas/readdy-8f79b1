import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import { useWidgetData } from '@/hooks/useWidgetData';
import { getCisSummary, type CisSummary } from '@/services/dashboard.service';
import { WidgetError, WidgetEmpty, WidgetLoading } from './WidgetState';

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
            <h3 className="text-base font-semibold text-main">CIS records</h3>
            <p className="text-xs text-muted mt-0.5">Internal register · HMRC is not connected</p>
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
          text="No internal CIS records have been added for this organisation"
          actionLabel="Open CIS register"
          onAction={() => navigate('/compliance')}
        />
      ) : (
        <div className="p-5 space-y-4">
          {/* Internal record summary */}
          <div className="bg-status-purple-pale rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-status-purple uppercase tracking-wider">
                Internal records
              </p>
              <p className="text-lg font-bold text-main mt-0.5">{data.total} record{data.total === 1 ? '' : 's'}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-status-purple tabular-nums">{data.utrRecorded}</p>
              <p className="text-[11px] text-muted">UTR marked on file</p>
            </div>
          </div>

          {/* Manual record status */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold text-status-amber">{data.noUtrRecorded} without a UTR recorded</p>
              <p className="text-xs text-muted mt-1">This summary does not confirm an HMRC check.</p>
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
