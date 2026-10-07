import { useOrg } from '@/contexts/OrgContext';
import { useWidgetData } from '@/hooks/useWidgetData';
import { getDashboardKpis, type DashboardKpis } from '@/services/dashboard.service';
import { useCurrency } from '@/hooks/useCurrency';
import { WidgetError } from './WidgetState';

type KpiTone = 'primary' | 'blue' | 'green' | 'amber';

const toneMap: Record<KpiTone, { iconWrap: string; accentText: string }> = {
  primary: { iconWrap: 'bg-primary-100 text-primary-500', accentText: 'text-primary-600' },
  blue: { iconWrap: 'bg-status-blue-pale text-status-blue', accentText: 'text-status-blue' },
  green: { iconWrap: 'bg-status-green-pale text-status-green', accentText: 'text-status-green' },
  amber: { iconWrap: 'bg-status-amber-pale text-status-amber', accentText: 'text-status-amber' },
};

interface KpiCard {
  id: string;
  icon: string;
  tone: KpiTone;
  label: string;
  value: string;
  supporting: string;
}

function buildCards(kpis: DashboardKpis, formatPence: (v: number) => string): KpiCard[] {
  return [
    {
      id: 'jobs',
      icon: 'ri-briefcase-line',
      tone: 'primary',
      label: 'Active Jobs',
      value: String(kpis.activeJobs),
      supporting:
        kpis.activeJobs === 1 ? '1 job in your portfolio' : `${kpis.activeJobs} jobs in your portfolio`,
    },
    {
      id: 'variations',
      icon: 'ri-file-edit-line',
      tone: 'amber',
      label: 'Variations Awaiting Approval',
      value: formatPence(kpis.variationsAwaitingPence),
      supporting:
        kpis.variationsAwaitingCount === 1
          ? '1 awaiting a client response'
          : `${kpis.variationsAwaitingCount} awaiting a client response`,
    },
    {
      id: 'payments',
      icon: 'ri-bank-card-line',
      tone: 'blue',
      label: 'Payment Applications Outstanding',
      value: formatPence(kpis.paymentOutstandingPence),
      supporting:
        kpis.paymentOutstandingCount === 1
          ? '1 application outstanding'
          : `${kpis.paymentOutstandingCount} applications outstanding`,
    },
    {
      id: 'retention',
      icon: 'ri-safe-2-line',
      tone: 'green',
      label: 'Retention Currently Held',
      value: formatPence(kpis.retentionHeldPence),
      supporting: 'withheld across your retention records',
    },
  ];
}

export default function KpiBar() {
  const { organisation } = useOrg();
  const { formatPence } = useCurrency();
  const { data, loading, error, reload } = useWidgetData<DashboardKpis>(
    organisation?.id ?? null,
    getDashboardKpis,
  );

  if (error) {
    return (
      <div className="bg-white border border-border rounded-xl">
        <WidgetError message={error} onRetry={reload} />
      </div>
    );
  }

  const cards = data ? buildCards(data, (v) => formatPence(v, { maximumFractionDigits: 0 })) : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {loading && !data
        ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-xl p-5 h-[168px] animate-pulse" />
          ))
        : cards.map((kpi) => {
            const tone = toneMap[kpi.tone];
            return (
              <div key={kpi.id} className="bg-white border border-border rounded-xl p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${tone.iconWrap}`}
                  >
                    <i className={`${kpi.icon} text-lg`}></i>
                  </span>
                </div>

                <p className="text-sm text-muted font-medium mt-4">{kpi.label}</p>
                <p className="text-2xl font-bold text-main tabular-nums mt-1">{kpi.value}</p>
                <p className="text-xs text-muted mt-1">{kpi.supporting}</p>
              </div>
            );
          })}
    </div>
  );
}