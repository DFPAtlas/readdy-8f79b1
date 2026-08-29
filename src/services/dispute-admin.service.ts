// BuildNerve — Dispute administration service layer.
// All reads/writes go through the `dispute-admin` edge function, which resolves
// the caller's platform-staff role and dispute-admin permissions server-side,
// revalidates access on every request, and writes an audit entry per action.
// The browser never holds service-role credentials.

import { getSupabase } from '@/lib/supabase';
import type {
  DisputeAdminIdentity,
  DisputeAdminDashboard,
  AdminCaseOverview,
  AdminEvidencePreview,
  SafetyReport,
  AdminAccessRecord,
  AdminAccessAlerts,
  GuidanceVersion,
} from '@/types/dispute-admin';

const FUNCTION_URL = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/dispute-admin`;

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

export const disputeAdminService = {
  async getMyPermissions(): Promise<DisputeAdminIdentity> {
    const data = await call<{ role: string | null; permissions: string[] }>('get_my_permissions');
    return {
      isStaff: !!data.role,
      role: data.role,
      permissions: data.permissions as DisputeAdminIdentity['permissions'],
      has: (key) => (data.permissions || []).includes(key),
    };
  },

  async getDashboard(): Promise<DisputeAdminDashboard> {
    return call<DisputeAdminDashboard>('get_dashboard');
  },

  async getCaseOverview(disputeId: string, reason: string): Promise<AdminCaseOverview> {
    return call<AdminCaseOverview>('get_case_overview', { disputeId, reason });
  },

  async getEvidencePreview(evidenceId: string, reason: string): Promise<AdminEvidencePreview> {
    return call<AdminEvidencePreview>('get_evidence_preview', { evidenceId, reason });
  },

  async assignSupportOwner(disputeId: string, ownerUserId: string | null, reason: string): Promise<{ success: boolean; message: string }> {
    return call('assign_support_owner', { disputeId, ownerUserId, reason });
  },

  async correctStatus(disputeId: string, newStatus: string, reason: string): Promise<{ success: boolean; message: string }> {
    return call('correct_status', { disputeId, newStatus, reason });
  },

  async resendNotification(outboxId: string, reason: string): Promise<{ success: boolean; message: string }> {
    return call('resend_notification', { outboxId, reason });
  },

  async extendDeadline(deadlineId: string, newDueAt: string, reason: string): Promise<{ success: boolean; message: string }> {
    return call('extend_deadline', { deadlineId, newDueAt, reason });
  },

  async addAdminNote(disputeId: string, noteScope: 'shared' | 'internal', body: string): Promise<{ success: boolean; message: string }> {
    return call('add_admin_note', { disputeId, noteScope, body });
  },

  async restrictContent(disputeId: string, targetType: string, targetId: string, reason: string): Promise<{ success: boolean; message: string }> {
    return call('restrict_content', { disputeId, targetType, targetId, reason });
  },

  async suspendUpload(evidenceId: string, reason: string): Promise<{ success: boolean; message: string }> {
    return call('suspend_upload', { evidenceId, reason });
  },

  async recordExternalOutcome(disputeId: string, outcome: string): Promise<{ success: boolean; message: string }> {
    return call('record_external_outcome', { disputeId, outcome });
  },

  async closeDuplicateDraft(disputeId: string, duplicateOf: string, reason: string): Promise<{ success: boolean; message: string }> {
    return call('close_duplicate_draft', { disputeId, duplicateOf, reason });
  },

  async restoreAccess(restrictionId: string, reason: string): Promise<{ success: boolean; message: string }> {
    return call('restore_access', { restrictionId, reason });
  },

  async reportSafety(disputeId: string, category: string, description?: string, targetType?: string, targetId?: string, priority?: string): Promise<{ success: boolean }> {
    return call('report_safety', { disputeId, category, description, targetType, targetId, priority });
  },

  async listSafetyQueue(): Promise<{ items: SafetyReport[] }> {
    return call<{ items: SafetyReport[] }>('list_safety_queue');
  },

  async reviewSafetyReport(reportId: string, status: string, decision?: string, decisionReason?: string, assignedReviewerUserId?: string): Promise<{ success: boolean; message: string }> {
    return call('review_safety_report', { reportId, status, decision, decisionReason, assignedReviewerUserId });
  },

  async listAccessAudit(disputeId?: string): Promise<{ items: AdminAccessRecord[]; alerts: AdminAccessAlerts }> {
    return call('list_access_audit', disputeId ? { disputeId } : undefined);
  },

  async listGuidanceVersions(): Promise<{ items: GuidanceVersion[] }> {
    return call<{ items: GuidanceVersion[] }>('list_guidance_versions');
  },

  async draftGuidance(sectionId: string, title: string, summary: string | null, content: unknown): Promise<{ success: boolean }> {
    return call('draft_guidance', { sectionId, title, summary, content });
  },

  async publishGuidance(versionId: string): Promise<{ success: boolean; message: string }> {
    return call('publish_guidance', { versionId });
  },

  async retireGuidance(versionId: string): Promise<{ success: boolean; message: string }> {
    return call('retire_guidance', { versionId });
  },
};