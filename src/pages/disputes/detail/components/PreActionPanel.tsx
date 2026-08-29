import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Dispute, DisputePartyView } from '@/types/disputes';
import type { PreActionWorkspace, LetterOfClaim } from '@/types/dispute-preaction';
import { LETTER_STATUS_LABELS } from '@/types/dispute-preaction';
import { disputePreactionService } from '@/services/dispute-preaction.service';
import { formatPence } from '@/pages/disputes/helpers';
import { getContextualGuidance } from '@/pages/disputes/legal-guidance/guidance';
import PreActionChecklist from '@/pages/disputes/detail/components/PreActionChecklist';
import IssuesSchedule from '@/pages/disputes/detail/components/IssuesSchedule';
import LetterList from '@/pages/disputes/detail/components/LetterList';
import LetterEditorModal from '@/pages/disputes/detail/components/LetterEditorModal';

interface PreActionPanelProps {
  dispute: Dispute;
  parties: DisputePartyView[];
  myRole: 'claimant' | 'respondent' | null;
  currentUserId: string | null;
  onChanged: () => void;
}

export default function PreActionPanel({
  dispute,
  parties,
  myRole,
  currentUserId,
  onChanged,
}: PreActionPanelProps) {
  const [ws, setWs] = useState<PreActionWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'checklist' | 'issues' | 'letter'>('checklist');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editLetter, setEditLetter] = useState<LetterOfClaim | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await disputePreactionService.getWorkspace(dispute.id);
      setWs(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pre-action workspace');
    } finally {
      setLoading(false);
    }
  }, [dispute.id]);

  useEffect(() => {
    load();
  }, [load]);

  const partyPrefill = useMemo(() => {
    const claimant = parties.find((p) => p.party_role === 'claimant');
    const respondent = parties.find((p) => p.party_role === 'respondent');
    return {
      claimantName: claimant?.profile_name ?? claimant?.display_name_snapshot ?? '',
      claimantAddress: claimant?.service_address_snapshot ?? '',
      defendantName: respondent?.profile_name ?? respondent?.display_name_snapshot ?? '',
      defendantAddress: respondent?.service_address_snapshot ?? '',
    };
  }, [parties]);

  const guidance = useMemo(() => getContextualGuidance(dispute), [dispute]);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <i className="ri-loader-4-line text-2xl text-primary-500 animate-spin"></i>
        <p className="text-sm text-muted mt-3">Loading pre-action workspace…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-status-red-pale flex items-center justify-center mx-auto mb-3">
          <i className="ri-error-warning-line text-xl text-status-red"></i>
        </div>
        <p className="text-sm text-muted">{error}</p>
        <button type="button" onClick={load} className="mt-4 h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap">
          Try again
        </button>
      </div>
    );
  }

  if (!ws) return null;

  // Eligibility gate
  if (!ws.eligible) {
    return (
      <section className="bg-white border border-border rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-status-amber-pale text-status-amber flex items-center justify-center flex-shrink-0">
            <i className="ri-lock-line text-lg"></i>
          </span>
          <div>
            <h2 className="text-base font-semibold text-main">Pre-Action Workspace unavailable</h2>
            <p className="text-sm text-muted mt-1">
              This workspace is only available for a formally submitted England &amp; Wales dispute that is still open,
              where both parties have had access.
            </p>
            <ul className="mt-3 space-y-1">
              {ws.reasons.map((r) => (
                <li key={r} className="text-sm text-main flex items-start gap-2">
                  <i className="ri-arrow-right-s-line text-muted mt-0.5"></i>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    );
  }

  const summary = ws.summary;
  const canEdit = myRole === 'claimant' || myRole === 'respondent';

  return (
    <section className="bg-white border border-border rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-main">Pre-Action Workspace</h2>
            <span className="text-[11px] font-medium text-muted bg-page px-2 py-0.5 rounded-full">England &amp; Wales</span>
          </div>
          <p className="text-xs text-muted mt-1">
            Prepare your position. Creating a draft does not mean you are ready or required to start court proceedings.
          </p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4">
        <div className="rounded-xl bg-page p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Checklist</p>
          <p className="text-sm font-semibold text-main mt-1">{summary.checklistComplete}/{summary.checklistTotal}</p>
        </div>
        <div className="rounded-xl bg-page p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Unresolved issues</p>
          <p className="text-sm font-semibold text-main mt-1">{summary.unresolvedIssues}</p>
        </div>
        <div className="rounded-xl bg-page p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Claim amount</p>
          <p className="text-sm font-semibold text-main mt-1">{formatPence(summary.claimAmountPence, dispute.currency)}</p>
        </div>
        <div className="rounded-xl bg-page p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Negotiation</p>
          <p className="text-sm font-semibold text-main mt-1">{summary.negotiationOffers} offer{summary.negotiationOffers === 1 ? '' : 's'}{summary.hasAcceptedOffer ? ' · accepted' : ''}</p>
        </div>
        <div className="rounded-xl bg-page p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">ADR considered</p>
          <p className="text-sm font-semibold text-main mt-1">{summary.adrConsidered ? 'Yes' : 'No'}</p>
        </div>
        <div className="rounded-xl bg-page p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Letter status</p>
          <p className="text-sm font-semibold text-main mt-1">
            {summary.letterStatus ? `${LETTER_STATUS_LABELS[summary.letterStatus]}${summary.latestLetterVersion ? ` v${summary.latestLetterVersion}` : ''}` : 'Not started'}
          </p>
        </div>
      </div>

      {/* Recommended guidance */}
      {guidance.length > 0 && (
        <div className="mt-4 rounded-xl border border-border p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Recommended guidance to review</p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {guidance.map((g) => (
              <Link
                key={g.id}
                to="/disputes/legal-guidance"
                className="h-8 px-3 rounded-full bg-secondary-100 text-secondary-900 text-xs font-medium hover:bg-secondary-200 transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <i className="ri-book-open-line"></i>
                {g.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Internal tabs */}
      <div className="flex items-center gap-1 bg-page rounded-full p-1 w-fit mt-5">
        <button type="button" onClick={() => setTab('checklist')} className={`h-9 px-4 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${tab === 'checklist' ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'}`}>
          Checklist
        </button>
        <button type="button" onClick={() => setTab('issues')} className={`h-9 px-4 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${tab === 'issues' ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'}`}>
          Issues schedule
        </button>
        <button type="button" onClick={() => setTab('letter')} className={`h-9 px-4 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${tab === 'letter' ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'}`}>
          Letter of Claim
        </button>
      </div>

      <div className="mt-4">
        {tab === 'checklist' && (
          <PreActionChecklist items={ws.checklist} canEdit={canEdit} onChanged={load} />
        )}
        {tab === 'issues' && (
          <IssuesSchedule
            disputeId={dispute.id}
            issues={ws.issues}
            myRole={myRole}
            evidenceOptions={ws.evidenceOptions}
            currency={dispute.currency}
            onChanged={load}
          />
        )}
        {tab === 'letter' && (
          <LetterList
            dispute={dispute}
            letters={ws.letters}
            currentUserId={currentUserId}
            canGenerate={ws.canGenerate}
            onEdit={(letter) => {
              setEditLetter(letter);
              setEditorOpen(true);
            }}
            onChanged={load}
          />
        )}
      </div>

      <p className="mt-4 text-[11px] text-muted flex items-start gap-1.5">
        <i className="ri-scales-3-line flex-shrink-0 mt-0.5"></i>
        <span>
          BuildNerve provides a neutral record. It does not decide liability, predict outcomes, calculate limitation
          dates, or confirm legal compliance. This is not a court filing or a solicitor-approved agreement.
        </span>
      </p>

      <LetterEditorModal
        open={editorOpen}
        dispute={dispute}
        letter={editLetter}
        evidenceOptions={ws.evidenceOptions}
        partyPrefill={partyPrefill}
        onClose={() => {
          setEditorOpen(false);
          setEditLetter(null);
        }}
        onChanged={load}
      />
    </section>
  );
}