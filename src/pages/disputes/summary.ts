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
