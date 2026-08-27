import { useNavigate } from 'react-router-dom';
import { cisFiling, formatGBP } from '@/mocks/commandCenter';

export default function CisStatus() {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-status-purple-pale text-status-purple flex items-center justify-center">
            <i className="ri-government-line text-lg"></i>
          </span>
          <div>
            <h3 className="text-base font-semibold text-main">HMRC CIS &amp; Monthly Return</h3>
            <p className="text-xs text-muted mt-0.5">Subcontractor deductions &amp; filing status</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Countdown */}
        <div className="bg-status-purple-pale rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-status-purple uppercase tracking-wider">Next CIS300 filing</p>
            <p className="text-lg font-bold text-main mt-0.5">{cisFiling.deadlineLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-status-purple tabular-nums">{cisFiling.daysRemaining}</p>
            <p className="text-[11px] text-muted">days remaining</p>
          </div>
        </div>

        {/* Withheld */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-main tabular-nums">{formatGBP(cisFiling.withheldThisMonth)}</p>
            <p className="text-xs text-muted mt-1">CIS tax withheld this month</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-status-green">{cisFiling.verifiedSubcontractors} verified</p>
            <p className="text-xs text-muted mt-1">{cisFiling.overdueReturns} overdue returns</p>
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
    </div>
  );
}