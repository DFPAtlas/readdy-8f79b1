import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type OrganisationMember = Database['public']['Tables']['organisation_members']['Row'];

const FUNCTION_URL = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/team-invitations`;
const ANON_KEY = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

export interface TeamMemberRow {
  id: string;
  userId: string;
  role: string;
  status: string;
  joinedAt: string | null;
  fullName: string | null;
  email: string | null;
  avatarPath: string | null;
}

export interface PendingInvitationRow {
  id: string;
  email: string;
  role: string | null;
  invitedByName: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface TeamInvitationResult {
  id: string;
  email_sent: boolean;
  email_error: string | null;
}

async function buildHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: ANON_KEY,
  };
  const supabase = getSupabase();
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

/**
 * Calls the team-invitations edge function and surfaces the server's message
 * verbatim so callers can show it directly to the user.
 */
async function callInvitationFunction<T>(payload: Record<string, unknown>): Promise<T> {
  const headers = await buildHeaders();

  let response: Response;
  try {
    response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('We could not reach the invitation service. Please check your connection and try again.');
  }

  const text = await response.text();
  let parsed: { error?: string } | null = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    throw new Error(parsed?.error || 'Something went wrong. Please try again.');
  }

  return parsed as unknown as T;
}

async function fetchProfileMap(userIds: string[]) {
  const supabase = getSupabase();
  const map = new Map<string, { full_name: string | null; email: string | null; avatar_path: string | null }>();
  if (!supabase || userIds.length === 0) return map;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_path')
    .in('id', userIds);
  if (error) throw error;

  (data ?? []).forEach((p) => {
    map.set(p.id, { full_name: p.full_name, email: p.email, avatar_path: p.avatar_path });
  });
  return map;
}

export const teamService = {
  async listMembers(orgId: string): Promise<TeamMemberRow[]> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend is not available');

    const { data, error } = await supabase
      .from('organisation_members')
      .select('*')
      .eq('organisation_id', orgId);
    if (error) throw error;

    const rows = (data ?? []) as OrganisationMember[];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const profileMap = await fetchProfileMap(userIds);

    return rows
      .map((row) => {
        const profile = profileMap.get(row.user_id);
        return {
          id: row.id,
          userId: row.user_id,
          role: row.role,
          status: row.status,
          joinedAt: row.joined_at,
          fullName: profile?.full_name ?? null,
          email: profile?.email ?? null,
          avatarPath: profile?.avatar_path ?? null,
        };
      })
      .sort((a, b) => a.role.localeCompare(b.role));
  },

  async listPendingInvitations(orgId: string): Promise<PendingInvitationRow[]> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend is not available');

    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('organisation_id', orgId)
      .eq('access_type', 'internal_member')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const rows = data ?? [];
    const inviterIds = Array.from(new Set(rows.map((r) => r.invited_by).filter((v): v is string => !!v)));
    const profileMap = await fetchProfileMap(inviterIds);

    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      invitedByName: row.invited_by ? profileMap.get(row.invited_by)?.full_name ?? null : null,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    }));
  },

  async setMemberRole(memberId: string, role: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend is not available');
    const { error } = await supabase.rpc('set_member_role', { p_member_id: memberId, p_role: role });
    if (error) throw error;
  },

  async setMemberStatus(memberId: string, status: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Backend is not available');
    const { error } = await supabase.rpc('set_member_status', { p_member_id: memberId, p_status: status });
    if (error) throw error;
  },

  createInvitation(organisationId: string, email: string, role: string): Promise<TeamInvitationResult> {
    return callInvitationFunction<TeamInvitationResult>({
      action: 'create',
      organisation_id: organisationId,
      email,
      role,
    });
  },

  resendInvitation(invitationId: string): Promise<TeamInvitationResult> {
    return callInvitationFunction<TeamInvitationResult>({ action: 'resend', invitation_id: invitationId });
  },

  revokeInvitation(invitationId: string): Promise<{ id: string }> {
    return callInvitationFunction<{ id: string }>({ action: 'revoke', invitation_id: invitationId });
  },
};