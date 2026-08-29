import type { Dispute, DisputeClaim, DisputePartyView } from '@/types/disputes';
import {
  DISPUTE_CLAIM_TYPE_LABELS,
  DISPUTE_CATEGORY_LABELS,
  DISPUTE_RESPONSE_POSITION_LABELS,
  getDisputeRoleLabel,
} from '@/types/disputes';
import { formatPence, formatDateTime } from '@/pages/disputes/helpers';

interface ClaimsPanelProps {
  dispute: Dispute;
  claims: DisputeClaim[];
  parties: DisputePartyView[];
}

export default function ClaimsPanel({ dispute, claims, parties }: ClaimsPanelProps) {
  const nameByUser = new Map<string, string>();
  parties.forEach((p) => {
    nameByUser.set(p.user_id, p.profile_name ?? p.display_name_snapshot ?? 'Party');
  });

  const roleFor = (userId: string): string => {
    if (userId === dispute.claimant_user_id) return getDisputeRoleLabel(dispute.claimant_role);
    if (userId === dispute.respondent_user_id) return getDisputeRoleLabel(dispute.respondent_role);
    return '';
  };

  const partyRoleFor = (userId: string): 'claimant' | 'respondent' | null => {
    if (userId === dispute.claimant_user_id) return 'claimant';
    if (userId === dispute.respondent_user_id) return 'respondent';
    return null;
  };

  const sorted = [...claims].sort(
    (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(),
  );

  return (
    <section className="bg-white border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-main">Claims &amp; positions</h2>
        <span className="text-xs text-muted">{sorted.length} {sorted.length === 1 ? 'entry' : 'entries'}</span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted mt-3">No claims or responses have been submitted yet.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {sorted.map((c) => {
            const isCorrection = c.claim_type === 'correction';
            const isSuperseded = c.status === 'superseded';
            const isResponse = c.claim_type === 'response';
            const isCounterclaim = c.claim_type === 'counterclaim';
            const name = nameByUser.get(c.submitted_by_user_id) ?? 'Party';
            const role = roleFor(c.submitted_by_user_id);
            const pr = partyRoleFor(c.submitted_by_user_id);
            const factsDisputed = (c.facts_disputed ?? []) as { point: string; reason: string }[];

            return (
              <div
                key={c.id}
                className={`rounded-xl border p-4 ${isSuperseded ? 'opacity-60 border-border' : isCorrection ? 'border-status-amber/40 bg-status-amber-pale/40' : isCounterclaim ? 'border-status-amber/40 bg-status-amber-pale/20' : 'border-border bg-page/40'}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${pr === 'claimant' ? 'bg-primary-500' : 'bg-status-amber'}`}>
                      {name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-main">{name}</p>
                      <p className="text-xs text-muted">{role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${isCorrection ? 'bg-status-amber-pale text-status-amber' : isCounterclaim ? 'bg-status-amber-pale text-status-amber' : 'bg-primary-100 text-primary-700'}`}>
                      {DISPUTE_CLAIM_TYPE_LABELS[c.claim_type] ?? c.claim_type}
                    </span>
                    <p className="text-[11px] text-muted mt-1">{formatDateTime(c.submitted_at)}</p>
                  </div>
                </div>

                {isResponse && c.position && (
                  <span className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-medium px-2.5 py-1 rounded-full bg-status-green-pale text-status-green">
                    <i className="ri-scales-3-line"></i>
                    {DISPUTE_RESPONSE_POSITION_LABELS[c.position as keyof typeof DISPUTE_RESPONSE_POSITION_LABELS] ?? c.position}
                  </span>
                )}

                {isCounterclaim && c.counterclaim_category && (
                  <span className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-medium px-2.5 py-1 rounded-full bg-status-amber-pale text-status-amber">
                    <i className="ri-shield-flash-line"></i>
                    {DISPUTE_CATEGORY_LABELS[c.counterclaim_category as keyof typeof DISPUTE_CATEGORY_LABELS] ?? c.counterclaim_category}
                  </span>
                )}

                {isCorrection && c.supersedes_claim_id && (
                  <p className="mt-3 text-[11px] text-status-amber flex items-center gap-1">
                    <i className="ri-refresh-line"></i>
                    This corrects an earlier submission (versioned — the original is preserved).
                  </p>
                )}
                {isSuperseded && (
                  <p className="mt-3 text-[11px] text-muted flex items-center gap-1">
                    <i className="ri-history-line"></i>
                    Superseded by a newer version.
                  </p>
                )}

                {c.statement && (
                  <p className="text-sm text-main mt-3 whitespace-pre-wrap">{c.statement}</p>
                )}

                {/* Facts accepted */}
                {Array.isArray(c.facts_accepted) && (c.facts_accepted as string[]).length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Facts accepted</p>
                    <ul className="mt-1 space-y-1">
                      {(c.facts_accepted as string[]).map((f, i) => (
                        <li key={i} className="text-sm text-main flex items-start gap-2">
                          <i className="ri-check-line text-status-green mt-0.5"></i>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Facts disputed */}
                {factsDisputed.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Facts disputed</p>
                    <div className="mt-1 space-y-2">
                      {factsDisputed.map((f, i) => (
                        <div key={i} className="text-sm">
                          <p className="text-main font-medium flex items-start gap-2">
                            <i className="ri-close-line text-status-red mt-0.5"></i>
                            {f.point}
                          </p>
                          <p className="text-muted mt-0.5 pl-5">{f.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Proposed resolution */}
                {isResponse && c.proposed_resolution && (
                  <p className="text-sm text-main mt-3">
                    <span className="text-muted">Proposed resolution: </span>
                    {c.proposed_resolution}
                  </p>
                )}

                {/* Amounts */}
                {(c.amount_pence !== null || c.amount_accepted_pence != null || c.requested_remedy) && (
                  <div className="mt-3 space-y-1">
                    {c.amount_pence !== null && (
                      <p className="text-sm text-main">
                        <span className="text-muted">Amount: </span>
                        <span className="font-semibold">{formatPence(c.amount_pence, dispute.currency)}</span>
                      </p>
                    )}
                    {isResponse && c.amount_accepted_pence != null && (
                      <p className="text-sm text-main">
                        <span className="text-muted">Amount accepted: </span>
                        <span className="font-semibold text-status-green">{formatPence(c.amount_accepted_pence, dispute.currency)}</span>
                      </p>
                    )}
                    {c.requested_remedy && (
                      <p className="text-sm text-main">
                        <span className="text-muted">Requested remedy: </span>
                        {c.requested_remedy}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}