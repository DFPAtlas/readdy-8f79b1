// BuildNerve — Pre-Action Workspace & Letter of Claim service layer.
// Reads and writes both go through the `dispute-preaction` edge function so
// the browser never holds service-role credentials and cannot bypass the
// party-access / immutability rules.

import { getSupabase } from '@/lib/supabase';
import type {
  PreActionWorkspace,
  PreActionChecklistItem,
  PreActionChecklistKey,
  PreActionChecklistStatus,
  PreActionIssue,
  LetterOfClaim,
  LetterLegalBasis,
  LetterEvidenceRef,
} from '@/types/dispute-preaction';

const FUNCTION_URL = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/dispute-preaction`;

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

export interface SaveLetterInput {
  disputeId: string;
  letterId?: string | null;
  status?: 'draft' | 'ready_for_review';
  title?: string;
  claimantName?: string | null;
  claimantAddress?: string | null;
  defendantName?: string | null;
  defendantAddress?: string | null;
  contractBasis?: string | null;
  chronology?: string | null;
  claimBasis?: string | null;
  legalProvisions?: LetterLegalBasis[] | null;
  otherBasis?: string | null;
  allegedWork?: string | null;
  amountPence?: number | null;
  calculationBreakdown?: string | null;
  requestedRemedy?: string | null;
  evidenceReferences?: LetterEvidenceRef[] | null;
  resolutionAttempts?: string | null;
  adrInvitation?: string | null;
  responseDate?: string | null;
  enclosures?: string[] | null;
  letterBody?: string | null;
}

export const disputePreactionService = {
  async getWorkspace(disputeId: string): Promise<PreActionWorkspace> {
    return call<PreActionWorkspace>('get_workspace', { disputeId });
  },

  async updateChecklistItem(input: {
    disputeId: string;
    itemKey: PreActionChecklistKey;
    status: PreActionChecklistStatus;
    note?: string | null;
  }): Promise<{ item: PreActionChecklistItem }> {
    return call('update_checklist_item', { ...input });
  },

  async createIssue(input: {
    disputeId: string;
    title: string;
    myPosition?: string | null;
    agreedFacts?: string | null;
    disputedFacts?: string | null;
    evidenceReferences?: LetterEvidenceRef[] | null;
    amountPence?: number | null;
  }): Promise<{ issue: PreActionIssue }> {
    return call('create_issue', { ...input });
  },

  async updateIssuePosition(input: {
    issueId: string;
    myPosition: string | null;
  }): Promise<{ issue: PreActionIssue }> {
    return call('update_issue_position', { ...input });
  },

  async updateIssueFacts(input: {
    issueId: string;
    agreedFacts?: string | null;
    disputedFacts?: string | null;
    resolutionStatus?: string;
  }): Promise<{ issue: PreActionIssue }> {
    return call('update_issue_facts', { ...input });
  },

  async saveLetter(input: SaveLetterInput): Promise<{ letter: LetterOfClaim }> {
    return call('save_letter', { ...input });
  },

  async finaliseLetter(letterId: string): Promise<{ letter: LetterOfClaim }> {
    return call('finalise_letter', { letterId });
  },

  async createLetterVersion(letterId: string): Promise<{ letter: LetterOfClaim }> {
    return call('create_letter_version', { letterId });
  },

  async recordDownload(letterId: string): Promise<{ letter: LetterOfClaim }> {
    return call('record_download', { letterId });
  },

  async recordSending(input: {
    letterId: string;
    method: string;
    sentDate: string;
    recipient?: string | null;
  }): Promise<{ letter: LetterOfClaim }> {
    return call('record_sending', { ...input });
  },
};