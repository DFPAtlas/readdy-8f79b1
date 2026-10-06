import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { useToast } from '@/components/base/Toast';
import { teamService } from '@/services/team.service';
import type { PendingInvitationRow, TeamMemberRow } from '@/services/team.service';
import InviteMemberModal from '@/pages/settings/team/components/InviteMemberModal';
import InvitationsTable from '@/pages/settings/team/components/InvitationsTable';
import MembersTable from '@/pages/settings/team/components/MembersTable';
import RolesExplainer from '@/pages/settings/team/components/RolesExplainer';
import { roleLabel } from '@/pages/settings/team/team.constants';

export default function TeamSettingsPage() {
  const { user } = useAuth();
  const { organisation, membership } = useOrg();
  const { showToast } = useToast();

  const orgId = organisation?.id ?? null;
  const viewerRole = membership?.role ?? null;
  const canManage = viewerRole === 'owner' || viewerRole === 'admin';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitationRow[]>([]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [actingMemberId, setActingMemberId] = useState<string | null>(null);
  const [actingInvitationId, setActingInvitationId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [memberRows, invitationRows] = await Promise.all([
        teamService.listMembers(orgId),
        canManage ? teamService.listPendingInvitations(orgId) : Promise.resolve([]),
      ]);
      setMembers(memberRows);
      setInvitations(invitationRows);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load your team. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [orgId, canManage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRoleChange = async (member: TeamMemberRow, role: string) => {
    if (role === member.role) return;
    setActingMemberId(member.id);
    try {
      await teamService.setMemberRole(member.id, role);
      showToast(`${member.fullName || member.email || 'Member'} is now ${roleLabel(role)}`, 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not change the role', 'warning');
    } finally {
      setActingMemberId(null);
    }
  };

  const handleStatusChange = async (member: TeamMemberRow, status: string) => {
    setActingMemberId(member.id);
    try {
      await teamService.setMemberStatus(member.id, status);
      const verb = status === 'active' ? 'reactivated' : status === 'suspended' ? 'suspended' : 'removed';
      showToast(`${member.fullName || member.email || 'Member'} was ${verb}`, 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update the member', 'warning');
    } finally {
      setActingMemberId(null);
    }
  };

  const handleInvite = async (email: string, role: string) => {
    if (!orgId) return;
    setInviteSubmitting(true);
    setInviteError(null);
    try {
      const result = await teamService.createInvitation(orgId, email, role);
      setInviteOpen(false);
      if (result.email_sent) {
        showToast(`Invitation sent to ${email}`, 'success');
      } else {
        showToast(`Invitation created for ${email}, but the email could not be sent: ${result.email_error ?? 'unknown error'}`, 'warning');
      }
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send the invitation';
      setInviteError(message);
      showToast(message, 'warning');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleResend = async (invitation: PendingInvitationRow) => {
    setActingInvitationId(invitation.id);
    try {
      const result = await teamService.resendInvitation(invitation.id);
      if (result.email_sent) {
        showToast(`Invitation resent to ${invitation.email}`, 'success');
      } else {
        showToast(`Could not resend the email: ${result.email_error ?? 'unknown error'}`, 'warning');
      }
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not resend the invitation', 'warning');
    } finally {
      setActingInvitationId(null);
    }
  };

  const handleRevoke = async (invitation: PendingInvitationRow) => {
    setActingInvitationId(invitation.id);
    try {
      await teamService.revokeInvitation(invitation.id);
      showToast(`Invitation to ${invitation.email} revoked`, 'success');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not revoke the invitation', 'warning');
    } finally {
      setActingInvitationId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <i className="ri-loader-4-line animate-spin text-2xl text-foreground-400"></i>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="px-4 md:px-6 py-8 max-w-5xl mx-auto">
        <div className="bg-white border border-background-200 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-status-red/10 text-status-red flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-xl"></i>
          </div>
          <h2 className="text-base font-semibold text-foreground-950">Something went wrong</h2>
          <p className="text-sm text-foreground-500 mt-1">{loadError}</p>
          <button
            onClick={() => loadData()}
            className="mt-5 h-10 px-5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground-950">Team &amp; roles</h1>
          <p className="text-sm text-foreground-500 mt-1">
            Manage who can access {organisation?.name ?? 'your workspace'} and what they can do.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => { setInviteError(null); setInviteOpen(true); }}
            className="h-10 px-5 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer flex-shrink-0"
          >
            <i className="ri-user-add-line"></i>
            Invite member
          </button>
        )}
      </div>

      <MembersTable
        members={members}
        currentUserId={user?.id ?? null}
        viewerRole={viewerRole}
        actingMemberId={actingMemberId}
        onRoleChange={handleRoleChange}
        onStatusChange={handleStatusChange}
      />

      {canManage && (
        <InvitationsTable
          invitations={invitations}
          actingInvitationId={actingInvitationId}
          onResend={handleResend}
          onRevoke={handleRevoke}
        />
      )}

      <RolesExplainer />

      <InviteMemberModal
        open={inviteOpen}
        viewerRole={viewerRole}
        submitting={inviteSubmitting}
        error={inviteError}
        onClose={() => setInviteOpen(false)}
        onSubmit={handleInvite}
      />
    </div>
  );
}