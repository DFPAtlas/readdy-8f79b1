import type { Dispute, DisputeClaim } from '@/types/disputes';
import { DISPUTE_CATEGORY_LABELS, JURISDICTION_LABELS, DISPUTE_RELATIONSHIP_LABELS } from '@/types/disputes';
import { formatPence } from '@/pages/disputes/helpers';

interface OverviewCardProps {
  dispute: Dispute;
  claims: DisputeClaim[];
  projectName: string | null;
}

export default function OverviewCard({ dispute, claims, projectName }: OverviewCardProps) {
  const originalClaim = claims.find((c) => c.claim_type === 'claim');
  const breakdown = originalClaim?.calculation_breakdown as
    | { items?: { label?: string; amount_pence?: number }[] }
    | null
    | undefined;

  return (
    <section className="bg-white border border-border rounded-2xl p-5">
      <h2 className="text-base font-semibold text-main">Overview</h2>

      <dl className="mt-4 space-y-4">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted font-semibold">Issue</dt>
          <dd className="text-sm text-main mt-1">
            {DISPUTE_CATEGORY_LABELS[dispute.dispute_category] ?? dispute.dispute_category}
          </dd>
        </div>

        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted font-semibold">Summary</dt>
          <dd className="text-sm text-main mt-1 whitespace-pre-wrap">
            {dispute.summary || 'No summary provided.'}
          </dd>
        </div>

        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted font-semibold">Desired resolution</dt>
          <dd className="text-sm text-main mt-1 whitespace-pre-wrap">
            {dispute.desired_resolution || 'Not specified.'}
          </dd>
        </div>

        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted font-semibold">Amount calculation</dt>
          <dd className="text-sm text-main mt-1">
            <span className="font-semibold">{formatPence(dispute.amount_disputed_pence, dispute.currency)}</span>
            {breakdown?.items && breakdown.items.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {breakdown.items.map((it, i) => (
                  <li key={i} className="flex justify-between text-xs text-muted">
                    <span>{it.label ?? 'Item'}</span>
                    <span className="text-main font-medium">{formatPence(it.amount_pence ?? null, dispute.currency)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="block text-xs text-muted mt-1">No itemised breakdown provided.</span>
            )}
          </dd>
        </div>

        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted font-semibold">Linked project</dt>
          <dd className="text-sm text-main mt-1">{projectName ?? '—'}</dd>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted font-semibold">Relationship</dt>
            <dd className="text-sm text-main mt-1">{DISPUTE_RELATIONSHIP_LABELS[dispute.relationship_type] ?? dispute.relationship_type}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-muted font-semibold">Jurisdiction</dt>
            <dd className="text-sm text-main mt-1">{JURISDICTION_LABELS[dispute.jurisdiction] ?? dispute.jurisdiction}</dd>
          </div>
        </div>
      </dl>
    </section>
  );
}