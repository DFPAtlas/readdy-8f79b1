// BuildNerve — Dispute Resolution service layer.
// Reads go through the Supabase client (RLS limits each user to their own
// disputes); all writes go through the `dispute-operations` edge function so
// the browser never holds service-role credentials and cannot bypass the
// ownership / immutability rules.

import { getSupabase } from '@/lib/supabase';
import type {
  Dispute,
  DisputeClaim,
  DisputeEvent,
  DisputeAuditEntry,
  DisputeClarification,
  DisputePermittedActions,
  DisputeListItem,
  DisputeDetailView,
  SettlementOffer,
  SettlementObligation,
  OfferListResponse,
} from '@/types/disputes';

const FUNCTION_URL = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/dispute-operations`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Backend not connected');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function call<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
  const headers = await getAuthHeaders();
  const resp = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error((data as { error?: string })?.error || 'Operation failed');
  return data as T;
}

export interface CreateDraftInput {
  projectId: string;
  title: string;
  disputeCategory: string;
  relationshipType: string;
  claimantRole: string;
  summary?: string;
  amountDisputedPence?: number;
  currency?: string;
  desiredResolution?: string;
}

export interface SubmitInput {
  disputeId: string;
  respondentUserId?: string | null;
  respondentRole?: string | null;
  statement?: string | null;
  requestedRemedy?: string | null;
  amountPence?: number | null;
}

export interface AddClaimInput {
  disputeId: string;
  claimType?: string;
  statement?: string | null;
  amountPence?: number | null;
  calculationBreakdown?: unknown;
  requestedRemedy?: string | null;
}

export interface CorrectClaimInput {
  claimId: string;
  statement?: string;
  amountPence?: number;
  calculationBreakdown?: unknown;
  requestedRemedy?: string;
}

export interface SubmitResponseInput {
  disputeId: string;
  position: string;
  statement: string;
  factsAccepted?: string[];
  factsDisputed?: { point: string; reason: string }[];
  proposedResolution?: string | null;
  amountAcceptedPence?: number | null;
  counterclaim?: boolean;
  counterclaimCategory?: string | null;
  counterclaimSummary?: string | null;
  counterclaimAmountPence?: number | null;
  counterclaimBreakdown?: unknown;
  counterclaimRemedy?: string | null;
  linkedRecords?: { type: string; id: string; label: string }[] | null;
}

export interface RequestClarificationInput {
  disputeId: string;
  point: string;
  relevance: string;
  deadlineDays?: number;
  targetClaimId?: string | null;
}

export interface AnswerClarificationInput {
  clarificationId: string;
  response: string;
}

export interface CreateOfferInput {
  disputeId: string;
  offerType: string;
  summary: string;
  paymentAmountPence?: number | null;
  currency?: string;
  workDescription?: string | null;
  proposedCompletionDate?: string | null;
  paymentDueDate?: string | null;
  conditions?: string | null;
  referencedEvidence?: string | null;
  responseDeadline?: string | null;
}

export interface RespondOfferInput {
  offerId: string;
  response: 'accept' | 'reject' | 'counter' | 'clarify';
  // Counteroffer fields (when response === 'counter'):
  offerType?: string;
  summary?: string;
  paymentAmountPence?: number | null;
  currency?: string;
  workDescription?: string | null;
  proposedCompletionDate?: string | null;
  paymentDueDate?: string | null;
  conditions?: string | null;
  referencedEvidence?: string | null;
  responseDeadline?: string | null;
  // Clarification fields (when response === 'clarify'):
  point?: string;
  relevance?: string;
  deadlineDays?: number;
}

export interface UpdateObligationInput {
  obligationId: string;
  transition: 'start' | 'complete' | 'confirm' | 'dispute';
  reason?: string;
}

export const disputesService = {
  // ── Reads (RLS-scoped to the current user) ──────────────────────────────
  async listMyDisputes(): Promise<Dispute[]> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Dispute[];
  },

  // ── Server-side joined reads (list + detail) ────────────────────────────
  async listDisputes(): Promise<DisputeListItem[]> {
    const data = await call<{ items: DisputeListItem[] }>('list_disputes');
    return data.items ?? [];
  },

  async getDisputeDetail(disputeId: string): Promise<DisputeDetailView> {
    return call<DisputeDetailView>('get_dispute_detail', { disputeId });
  },

  async listMyProjects(): Promise<{ id: string; reference: string | null; project_name: string | null; status: string | null }[]> {
    const data = await call<{ projects: { id: string; reference: string | null; project_name: string | null; status: string | null }[] }>('list_my_projects');
    return data.projects ?? [];
  },

  async withdraw(disputeId: string): Promise<{ dispute: Dispute }> {
    return call('withdraw', { disputeId });
  },

  async requestResolution(disputeId: string): Promise<{ requested: boolean }> {
    return call('request_resolution', { disputeId });
  },

  async confirmResolution(disputeId: string): Promise<{ dispute: Dispute }> {
    return call('confirm_resolution', { disputeId });
  },

  async getDispute(disputeId: string): Promise<Dispute | null> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .eq('id', disputeId)
      .maybeSingle();
    if (error) throw error;
    return (data as Dispute) || null;
  },

  async getClaims(disputeId: string): Promise<DisputeClaim[]> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');
    const { data, error } = await supabase
      .from('dispute_claims')
      .select('*')
      .eq('dispute_id', disputeId)
      .order('submitted_at', { ascending: true });
    if (error) throw error;
    return (data || []) as DisputeClaim[];
  },

  async getEvents(disputeId: string): Promise<DisputeEvent[]> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');
    const { data, error } = await supabase
      .from('dispute_events')
      .select('*')
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as DisputeEvent[];
  },

  async getAuditLog(disputeId: string): Promise<DisputeAuditEntry[]> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend not connected');
    const { data, error } = await supabase
      .from('dispute_audit_log')
      .select('*')
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as DisputeAuditEntry[];
  },

  // ── Server-side helpers (edge function) ─────────────────────────────────
  async verifyParticipation(projectId: string): Promise<{ participant: boolean; organisation_id?: string }> {
    return call('verify_participation', { projectId });
  },

  async createDraft(input: CreateDraftInput): Promise<{ dispute: Dispute }> {
    return call('create_draft', { payload: input });
  },

  async updateDraft(disputeId: string, payload: Partial<CreateDraftInput>): Promise<{ dispute: Dispute }> {
    return call('update_draft', { disputeId, payload });
  },

  async submit(input: SubmitInput): Promise<{ dispute: Dispute; claim: DisputeClaim }> {
    return call('submit', { ...input });
  },

  async addClaim(input: AddClaimInput): Promise<{ claim: DisputeClaim }> {
    return call('add_claim', { ...input });
  },

  async correctClaim(input: CorrectClaimInput): Promise<{ claim: DisputeClaim }> {
    return call('correct_claim', { ...input });
  },

  async submitResponse(input: SubmitResponseInput): Promise<{ dispute: Dispute; claim: DisputeClaim; counterclaim: DisputeClaim | null }> {
    return call('submit_response', { ...input });
  },

  async requestClarification(input: RequestClarificationInput): Promise<{ clarification: DisputeClarification }> {
    return call('request_clarification', { ...input });
  },

  async answerClarification(input: AnswerClarificationInput): Promise<{ clarification: DisputeClarification }> {
    return call('answer_clarification', { ...input });
  },

  async permittedActions(disputeId: string): Promise<{ actions: DisputePermittedActions }> {
    return call('permitted_actions', { disputeId });
  },

  // ── Negotiation & settlement offers (Disputes 06) ───────────────────────
  async listOffers(disputeId: string): Promise<OfferListResponse> {
    return call<OfferListResponse>('list_offers', { disputeId });
  },

  async createOffer(input: CreateOfferInput): Promise<{ offer: SettlementOffer }> {
    return call('create_offer', { ...input });
  },

  async withdrawOffer(offerId: string): Promise<{ offer: SettlementOffer }> {
    return call('withdraw_offer', { offerId });
  },

  async respondOffer(input: RespondOfferInput): Promise<{ offer: SettlementOffer; counteroffer?: SettlementOffer; clarification?: DisputeClarification }> {
    return call('respond_offer', { ...input });
  },

  async updateObligation(input: UpdateObligationInput): Promise<{ obligation: SettlementObligation }> {
    return call('update_obligation', { ...input });
  },
};