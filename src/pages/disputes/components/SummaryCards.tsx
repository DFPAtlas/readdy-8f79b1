import type { DisputeListItem } from '@/types/disputes';

const ACTIVE_STATUSES = [
  'open',
  'awaiting_response',
  'under_discussion',
  'evidence_collection',
  'negotiation',
  'mediation_considered',
  'pre_action',
];

export interface DisputeSummary {
  open: number;
  awaitingMyResponse: number;
  inNegotiation: number;
  resolved: number;
}

export function computeSummary(items: DisputeListItem[]): DisputeSummary {
  return {
    open: items.filter((d) => ACTIVE_STATUSES.includes(d.status)).length,
    awaitingMyResponse: items.filter((d) => d.action_required).length,
    inNegotiation: items.filter((d) => d.status === 'negotiation' || d.status === 'mediation_considered').length,
    resolved: items.filter((d) => d.status === 'resolved' || d.status === 'closed').length,
  };
}

interface SummaryCardsProps {
  summary: DisputeSummary;
  onSelect: (kind: 'open' | 'awaiting' | 'negotiation' | 'resolved') => void;
  active: 'open' | 'awaiting' | 'negotiation' | 'resolved' | null;
}

export default function SummaryCards({ summary, onSelect, active }: SummaryCardsProps) {
  const cards: {
    kind: 'open' | 'awaiting' | 'negotiation' | 'resolved';
    label: string;
    value: number;
    icon: string;
    accent: string;
  }[] = [
    { kind: 'open', label: 'Open disputes', value: summary.open, icon: 'ri-scales-3-line', accent: 'text-primary-600 bg-primary-100' },
    { kind: 'awaiting', label: 'Awaiting my response', value: summary.awaitingMyResponse, icon: 'ri-time-line', accent: 'text-status-amber bg-status-amber-pale' },
    { kind: 'negotiation', label: 'In negotiation', value: summary.inNegotiation, icon: 'ri-exchange-line', accent: 'text-status-green bg-status-green-pale' },
    { kind: 'resolved', label: 'Resolved disputes', value: summary.resolved, icon: 'ri-check-double-line', accent: 'text-muted bg-page' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const isActive = active === c.kind;
        return (
          <button
            key={c.kind}
            type="button"
            onClick={() => onSelect(c.kind)}
            className={`text-left bg-white rounded-xl border p-4 transition-colors cursor-pointer ${
              isActive ? 'border-primary-300 ring-2 ring-primary-100' : 'border-border hover:border-primary-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.accent}`}>
                <i className={`${c.icon} text-base`}></i>
              </span>
            </div>
            <p className="text-2xl font-bold text-main mt-3">{c.value}</p>
            <p className="text-xs text-muted mt-1">{c.label}</p>
          </button>
        );
      })}
    </div>
  );
}