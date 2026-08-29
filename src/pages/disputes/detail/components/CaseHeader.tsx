import { useNavigate } from 'react-router-dom';
import type { Dispute, DisputePartyView } from '@/types/disputes';
import {
  DISPUTE_STATUS_LABELS,
  DISPUTE_STAGE_LABELS,
  DISPUTE_CATEGORY_LABELS,
  getDisputeRoleLabel,
} from '@/types/disputes';
import { formatPence, formatDate, statusTone, daysUntil } from '@/pages/disputes/helpers';

interface CaseHeaderProps {
  dispute: Dispute;
  project: { id: string; reference: string | null; project_name: string | null } | null;
  parties: DisputePartyView[];
  myRole: 'claimant' | 'respondent' | null;
}

export default function CaseHeader({ dispute, project, parties, myRole }: CaseHeaderProps) {
  const navigate = useNavigate();
  const tone = statusTone(dispute.status);
  const claimant = parties.find((p) => p.party_role === 'claimant');
  const respondent = parties.find((p) => p.party_role === 'respondent');

  const claimantName = claimant?.profile_name ?? claimant?.display_name_snapshot ?? 'Claimant';
  const respondentName = respondent?.profile_name ?? respondent?.display_name_snapshot ?? 'Respondent';

  const isActive = ['open', 'awaiting_response', 'under_discussion', 'evidence_collection', 'negotiation', 'mediation_considered', 'pre_action'].includes(dispute.status);
  const dueDays = daysUntil(dispute.response_due_at);
  const overdue = isActive && dueDays !== null && dueDays < 0;

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <button
        type="button"
        onClick={() => navigate('/disputes')}
        className="text-xs text-muted hover:text-main font-medium transition-colors cursor-pointer flex items-center gap-1 mb-4"
      >
        <i className="ri-arrow-left-s-line"></i>
        Back to disputes
      </button>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-main">{dispute.title}</h1>
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${tone.bg} ${tone.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`}></span>
              {DISPUTE_STATUS_LABELS[dispute.status] ?? dispute.status}
            </span>
          </div>
          <p className="text-sm text-primary-600 font-semibold mt-1">{dispute.case_reference}</p>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-sm text-main">{DISPUTE_CATEGORY_LABELS[dispute.dispute_category] ?? dispute.dispute_category}</span>
            {project && (
              <>
                <span className="text-border">·</span>
                <span className="text-sm text-muted">{project.project_name ?? project.reference ?? 'Project'}</span>
              </>
            )}
          </div>

          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl bg-page p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Claimant</p>
              <p className="text-sm font-medium text-main mt-1">{claimantName}</p>
              <p className="text-xs text-muted">{getDisputeRoleLabel(dispute.claimant_role)}</p>
              {myRole === 'claimant' && (
                <span className="inline-block mt-1 text-[10px] font-semibold text-primary-600 bg-primary-100 rounded-full px-2 py-0.5">You</span>
              )}
            </div>
            <div className="rounded-xl bg-page p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Respondent</p>
              <p className="text-sm font-medium text-main mt-1">{respondentName}</p>
              <p className="text-xs text-muted">{getDisputeRoleLabel(dispute.respondent_role)}</p>
              {myRole === 'respondent' && (
                <span className="inline-block mt-1 text-[10px] font-semibold text-primary-600 bg-primary-100 rounded-full px-2 py-0.5">You</span>
              )}
            </div>
          </div>
        </div>

        {/* Key facts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-3 lg:w-56 flex-shrink-0">
          <div className="lg:text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Amount disputed</p>
            <p className="text-lg font-bold text-main mt-0.5">{formatPence(dispute.amount_disputed_pence, dispute.currency)}</p>
          </div>
          <div className="lg:text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Opened</p>
            <p className="text-sm font-medium text-main mt-0.5">{formatDate(dispute.opened_at ?? dispute.created_at)}</p>
          </div>
          <div className="lg:text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Response due</p>
            <p className="text-sm font-medium text-main mt-0.5">{formatDate(dispute.response_due_at)}</p>
            {dueDays !== null && isActive && (
              <p className={`text-[11px] mt-0.5 font-medium ${overdue ? 'text-status-red' : dueDays === 0 ? 'text-status-amber' : 'text-muted'}`}>
                {overdue ? `Overdue by ${Math.abs(dueDays)}d` : dueDays === 0 ? 'Due today' : `${dueDays}d remaining`}
              </p>
            )}
          </div>
          <div className="lg:text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">Stage</p>
            <p className="text-sm font-medium text-main mt-0.5">
              {DISPUTE_STAGE_LABELS[dispute.current_stage as keyof typeof DISPUTE_STAGE_LABELS] ?? dispute.current_stage}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}