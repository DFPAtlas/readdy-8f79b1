import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { disputesService } from '@/services/disputes.service';
import type { SubmitResponseInput, RequestClarificationInput } from '@/services/disputes.service';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/base/Toast';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import type { DisputeDetailView, DisputeClaim, DisputeClarification } from '@/types/disputes';
import CaseHeader from '@/pages/disputes/detail/components/CaseHeader';
import StatusBanner from '@/pages/disputes/detail/components/StatusBanner';
import OverviewCard from '@/pages/disputes/detail/components/OverviewCard';
import ClaimsPanel from '@/pages/disputes/detail/components/ClaimsPanel';
import ClarificationsPanel from '@/pages/disputes/detail/components/ClarificationsPanel';
import TimelinePanel from '@/pages/disputes/detail/components/TimelinePanel';
import NextActionPanel, { type DisputeAction } from '@/pages/disputes/detail/components/NextActionPanel';
import LegalNotice from '@/pages/disputes/detail/components/LegalNotice';
import ContextualGuidancePanel from '@/pages/disputes/detail/components/ContextualGuidancePanel';
import DisputeActionModal, { type SimpleAction, type ActionPayload } from '@/pages/disputes/detail/components/DisputeActionModal';
import FormalResponseModal from '@/pages/disputes/detail/components/FormalResponseModal';
import ClarificationModal, { type ClarificationMode } from '@/pages/disputes/detail/components/ClarificationModal';
import EvidencePanel from '@/pages/disputes/detail/components/EvidencePanel';
import NegotiationPanel from '@/pages/disputes/detail/components/NegotiationPanel';
import PreActionPanel from '@/pages/disputes/detail/components/PreActionPanel';
import ExportPanel from '@/pages/disputes/detail/components/ExportPanel';
import DeadlinesAndNoticesPanel from '@/pages/disputes/detail/components/DeadlinesAndNoticesPanel';

export default function DisputeDetailPage() {
  const { disputeId } = useParams<{ disputeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [data, setData] = useState<DisputeDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  const [simpleAction, setSimpleAction] = useState<SimpleAction | null>(null);
  const [formalResponseOpen, setFormalResponseOpen] = useState(false);
  const [clarifyMode, setClarifyMode] = useState<ClarificationMode | null>(null);
  const [answerTarget, setAnswerTarget] = useState<DisputeClarification | null>(null);
  const [confirmAction, setConfirmAction] = useState<DisputeAction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'negotiation' | 'preaction' | 'export' | 'deadlines'>('overview');

  const load = useCallback(async () => {
    if (!disputeId) return;
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const detail = await disputesService.getDisputeDetail(disputeId);
      setData(detail);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load dispute';
      if (msg.toLowerCase().includes('access denied') || msg.toLowerCase().includes('not found')) {
        setDenied(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [disputeId]);

  useEffect(() => {
    load();
  }, [load]);

  const myClaims = useMemo<DisputeClaim[]>(() => {
    if (!data || !user) return [];
    return data.claims.filter(
      (c) => c.submitted_by_user_id === user.id && c.claim_type !== 'correction' && c.status !== 'superseded',
    );
  }, [data, user]);

  const originalClaim = useMemo<DisputeClaim | null>(() => {
    if (!data) return null;
    return data.claims.find((c) => c.claim_type === 'claim' && c.status !== 'superseded') ?? null;
  }, [data]);

  const openClarificationForMe = useMemo<DisputeClarification | null>(() => {
    if (!data || !user) return null;
    return (
      data.clarifications.find(
        (c) => c.status === 'open' && c.requested_by_user_id !== user.id,
      ) ?? null
    );
  }, [data, user]);

  const runSimpleSubmit = async (action: SimpleAction, payload: ActionPayload) => {
    if (!disputeId) return;
    setSubmitting(true);
    setActionError(null);
    try {
      if (action === 'submit') {
        await disputesService.submit({
          disputeId,
          statement: payload.statement,
          requestedRemedy: payload.requestedRemedy,
          amountPence: payload.amountPence,
        });
        showToast('Dispute submitted.', 'success');
      } else if (action === 'correct') {
        if (!payload.claimId) throw new Error('Please select a submission to correct.');
        await disputesService.correctClaim({
          claimId: payload.claimId,
          statement: payload.statement,
          requestedRemedy: payload.requestedRemedy,
          amountPence: payload.amountPence,
        });
        showToast('Correction saved as a new version.', 'success');
      }
      setSimpleAction(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const runFormalResponse = async (input: SubmitResponseInput) => {
    setSubmitting(true);
    setActionError(null);
    try {
      await disputesService.submitResponse(input);
      showToast('Formal response submitted.', 'success');
      setFormalResponseOpen(false);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const runClarificationRequest = async (input: RequestClarificationInput) => {
    setSubmitting(true);
    setActionError(null);
    try {
      await disputesService.requestClarification(input);
      showToast('Clarification requested.', 'success');
      setClarifyMode(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const runClarificationAnswer = async (input: { clarificationId: string; response: string }) => {
    setSubmitting(true);
    setActionError(null);
    try {
      await disputesService.answerClarification(input);
      showToast('Clarification answered.', 'success');
      setClarifyMode(null);
      setAnswerTarget(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const runConfirmAction = async () => {
    if (!disputeId || !confirmAction) return;
    setSubmitting(true);
    setActionError(null);
    try {
      if (confirmAction === 'withdraw') {
        await disputesService.withdraw(disputeId);
        showToast('Dispute withdrawn.', 'warning');
      } else if (confirmAction === 'request_resolution') {
        await disputesService.requestResolution(disputeId);
        showToast('Resolution requested — awaiting the other party.', 'success');
      } else if (confirmAction === 'confirm_resolution') {
        await disputesService.confirmResolution(disputeId);
        showToast('Resolution agreed. Case resolved.', 'success');
      }
      setConfirmAction(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
      setConfirmAction(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = (action: DisputeAction) => {
    setActionError(null);
    if (action === 'withdraw' || action === 'request_resolution' || action === 'confirm_resolution') {
      setConfirmAction(action);
    } else if (action === 'submit' || action === 'correct') {
      setSimpleAction(action);
    } else if (action === 'respond') {
      setFormalResponseOpen(true);
    } else if (action === 'request_clarification') {
      setClarifyMode('request');
    } else if (action === 'answer_clarification') {
      setAnswerTarget(openClarificationForMe);
      setClarifyMode('answer');
    }
  };

  const confirmMeta = (() => {
    switch (confirmAction) {
      case 'withdraw':
        return {
          title: 'Withdraw this dispute?',
          desc: 'This closes the case and records it as withdrawn. This cannot be undone.',
          confirmText: 'Withdraw dispute',
          variant: 'warning' as const,
        };
      case 'request_resolution':
        return {
          title: 'Request an agreed resolution?',
          desc: 'This notifies the other party that you\u2019re ready to mark the case as resolved by mutual agreement.',
          confirmText: 'Request resolution',
          variant: 'default' as const,
        };
      case 'confirm_resolution':
        return {
          title: 'Confirm the agreed resolution?',
          desc: 'Confirming will close this dispute as resolved. This cannot be undone.',
          confirmText: 'Confirm resolution',
          variant: 'default' as const,
        };
      default:
        return null;
    }
  })();

  if (loading) {
    return (
      <div className="py-24 text-center">
        <i className="ri-loader-4-line text-2xl text-primary-500 animate-spin"></i>
        <p className="text-sm text-muted mt-3">Loading dispute…</p>
      </div>
    );
  }

  if (denied || !data) {
    return (
      <div className="max-w-[560px] mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
          <i className="ri-lock-line text-2xl text-muted"></i>
        </div>
        <h1 className="text-xl font-bold text-main">Dispute not found</h1>
        <p className="text-sm text-muted mt-2">
          This dispute doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <button
          type="button"
          onClick={() => navigate('/disputes')}
          className="mt-6 h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
        >
          Back to disputes
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[560px] mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-status-red-pale flex items-center justify-center mx-auto mb-4">
          <i className="ri-error-warning-line text-2xl text-status-red"></i>
        </div>
        <h1 className="text-xl font-bold text-main">Something went wrong</h1>
        <p className="text-sm text-muted mt-2">{error}</p>
        <button
          type="button"
          onClick={load}
          className="mt-6 h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
        >
          Try again
        </button>
      </div>
    );
  }

  const { dispute, project, parties, claims, clarifications, events, actions, myRole, resolution } = data;
  const isRespondent = myRole === 'respondent';

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-4">
      <CaseHeader
        dispute={dispute}
        project={project}
        parties={parties}
        myRole={myRole}
      />

      <StatusBanner dispute={dispute} isRespondent={isRespondent} />

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-page rounded-full p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`h-9 px-4 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'overview' ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'
          }`}
        >
          Case overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('evidence')}
          className={`h-9 px-4 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'evidence' ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'
          }`}
        >
          Evidence
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('negotiation')}
          className={`h-9 px-4 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'negotiation' ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'
          }`}
        >
          Negotiation
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preaction')}
          className={`h-9 px-4 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'preaction' ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'
          }`}
        >
          Pre-action
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('export')}
          className={`h-9 px-4 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'export' ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'
          }`}
        >
          Evidence pack
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('deadlines')}
          className={`h-9 px-4 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'deadlines' ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'
          }`}
        >
          Deadlines &amp; notices
        </button>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 space-y-4">
            <OverviewCard dispute={dispute} claims={claims} projectName={project?.project_name ?? null} />
            <ClaimsPanel dispute={dispute} claims={claims} parties={parties} />
            <ClarificationsPanel dispute={dispute} clarifications={clarifications} parties={parties} />
            <TimelinePanel events={events} />
          </div>

          <div className="space-y-4 lg:sticky lg:top-20">
            <NextActionPanel
              actions={actions}
              resolutionPending={resolution.pendingRequest}
              resolutionRequestedByMe={resolution.requestedByMe}
              projectId={project?.id ?? null}
              onAction={handleAction}
              onViewProject={() => project && navigate(`/jobs/${project.id}`)}
            />
            <ContextualGuidancePanel dispute={dispute} />
            <LegalNotice />
          </div>
        </div>
      ) : activeTab === 'evidence' ? (
        <EvidencePanel
          dispute={dispute}
          parties={parties}
          myRole={myRole}
          onViewProject={() => project && navigate(`/jobs/${project.id}`)}
        />
      ) : activeTab === 'negotiation' ? (
        <NegotiationPanel
          dispute={dispute}
          parties={parties}
          myRole={myRole}
          currentUserId={user?.id ?? null}
          projectName={project?.project_name ?? null}
          onChanged={load}
        />
      ) : activeTab === 'preaction' ? (
        <PreActionPanel
          dispute={dispute}
          parties={parties}
          myRole={myRole}
          currentUserId={user?.id ?? null}
          onChanged={load}
        />
      ) : activeTab === 'deadlines' ? (
        <DeadlinesAndNoticesPanel
          dispute={dispute}
          currentUserId={user?.id ?? null}
          onChanged={load}
        />
      ) : (
        <ExportPanel
          dispute={dispute}
          parties={parties}
          myRole={myRole}
          currentUserId={user?.id ?? null}
          onChanged={load}
        />
      )}

      <DisputeActionModal
        action={simpleAction}
        myClaims={myClaims}
        currency={dispute.currency}
        submitting={submitting}
        error={actionError}
        onClose={() => setSimpleAction(null)}
        onSubmit={runSimpleSubmit}
      />

      <FormalResponseModal
        open={formalResponseOpen}
        dispute={dispute}
        projectName={project?.project_name ?? null}
        originalClaim={originalClaim}
        submitting={submitting}
        error={actionError}
        onClose={() => setFormalResponseOpen(false)}
        onSubmit={runFormalResponse}
      />

      <ClarificationModal
        mode={clarifyMode}
        claims={claims}
        clarification={answerTarget}
        currency={dispute.currency}
        submitting={submitting}
        error={actionError}
        onClose={() => {
          setClarifyMode(null);
          setAnswerTarget(null);
        }}
        onRequest={runClarificationRequest}
        onAnswer={runClarificationAnswer}
      />

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmMeta?.title ?? ''}
        description={confirmMeta?.desc ?? ''}
        confirmText={confirmMeta?.confirmText ?? 'Confirm'}
        variant={confirmMeta?.variant ?? 'default'}
        onConfirm={runConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}