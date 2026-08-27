import { useNavigate } from 'react-router-dom';
import { pendingApprovals, type ApprovalTone } from '@/mocks/commandCenter';
import { useToast } from '@/components/base/Toast';

const toneMap: Record<ApprovalTone, { border: string; dot: string; badgeBg: string; badgeText: string; actionBg: string; actionText: string }> = {
  red: {
    border: 'border-l-status-red',
    dot: 'bg-status-red',
    badgeBg: 'bg-status-red-pale',
    badgeText: 'text-status-red',
    actionBg: 'bg-status-red-pale hover:bg-[#FAD5D5]',
    actionText: 'text-status-red',
  },
  amber: {
    border: 'border-l-status-amber',
    dot: 'bg-status-amber',
    badgeBg: 'bg-status-amber-pale',
    badgeText: 'text-status-amber',
    actionBg: 'bg-status-amber-pale hover:bg-[#FDE8CC]',
    actionText: 'text-status-amber',
  },
  purple: {
    border: 'border-l-status-purple',
    dot: 'bg-status-purple',
    badgeBg: 'bg-status-purple-pale',
    badgeText: 'text-status-purple',
    actionBg: 'bg-status-purple-pale hover:bg-[#E6DFF2]',
    actionText: 'text-status-purple',
  },
};

export default function PendingApprovals() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleAction = (item: typeof pendingApprovals[0], action: string) => {
    if (item.route) {
      showToast(`${action}: ${item.title}`, 'info');
      navigate(item.route);
    } else {
      showToast(`${action}: ${item.title}`, 'warning');
    }
  };

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-main">Action Needed — Pending Approvals &amp; Deadlines</h3>
          <p className="text-xs text-muted mt-0.5">Statutory cutoffs and commercial sign-offs requiring attention</p>
        </div>
        <span className="text-[11px] font-medium text-muted bg-page px-2.5 py-1 rounded-full whitespace-nowrap">
          {pendingApprovals.length} open
        </span>
      </div>

      <div className="divide-y divide-border">
        {pendingApprovals.map((item) => {
          const c = toneMap[item.tone];
          return (
            <div key={item.id} className={`px-5 py-4 border-l-[3px] ${c.border} flex flex-col sm:flex-row sm:items-center gap-3`}>
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className={`w-2 h-2 rounded-full ${c.dot} mt-1.5 flex-shrink-0`} aria-hidden="true" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-main">{item.title}</p>
                    {item.deadline && (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${c.badgeBg} ${c.badgeText}`}>
                        {item.deadline}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1">{item.subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 sm:pl-3">
                {item.actions.map((action) => (
                  <button
                    key={action}
                    onClick={() => handleAction(item, action)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${c.actionBg} ${c.actionText}`}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}