import { useNavigate } from 'react-router-dom';
import { plantHireAlert, formatGBP } from '@/mocks/commandCenter';
import { useToast } from '@/components/base/Toast';

export default function ProcurementLeakage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  return (
    <div className="bg-white border border-status-amber/40 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-status-amber-pale text-status-amber flex items-center justify-center">
            <i className="ri-tools-line text-lg"></i>
          </span>
          <div>
            <h3 className="text-base font-semibold text-main">Procurement &amp; Plant Hire</h3>
            <p className="text-xs text-muted mt-0.5">Cost leakage alert</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Standing hire summary */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-main tabular-nums">{plantHireAlert.activeMachines}</p>
            <p className="text-xs text-muted mt-1">machines on hire</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-main tabular-nums">{formatGBP(plantHireAlert.standingRate)}/wk</p>
            <p className="text-xs text-muted mt-1">standing hire rate</p>
          </div>
        </div>

        {/* Idle asset alerts */}
        <div className="space-y-2.5">
          {plantHireAlert.idleAssets.map((asset) => (
            <div key={asset.id} className="bg-status-amber-pale border border-status-amber/25 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-main truncate">{asset.name}</p>
                  <p className="text-xs text-status-amber font-medium mt-0.5">idle for {asset.daysIdle} days</p>
                </div>
              </div>
              <button
                onClick={() => {
                  showToast(`Off-hire triggered for ${asset.name}.`, 'success');
                  navigate('/procurement');
                }}
                className="mt-2.5 w-full h-9 px-3 bg-status-amber text-white hover:bg-status-amber/90 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
              >
                <i className="ri-stop-circle-line text-sm"></i>
                Trigger Off-Hire
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}