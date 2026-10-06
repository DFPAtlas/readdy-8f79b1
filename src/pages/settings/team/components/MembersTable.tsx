import { useState } from 'react';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import {
  ROLE_LABELS,
  STATUS_BADGE_CLASSES,
  TEAM_ROLES,
  formatDate,
  initialsFor,
  roleLabel,
  statusLabel,
} from '@/pages/settings/team/team.constants';
import type { TeamMemberRow } from '@/services/team.service';

interface MembersTableProps {
  members: TeamMemberRow[];
  currentUserId: string | null;
  viewerRole: string | null;
  actingMemberId: string | null;
  onRoleChange: (member: TeamMemberRow, role: string) => void;
  onStatusChange: (member: TeamMemberRow, status: string) => void;
}

export default function MembersTable({
  members,
  currentUserId,
  viewerRole,
  actingMemberId,
  onRoleChange,
  onStatusChange,
}: MembersTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmMember, setConfirmMember] = useState<TeamMemberRow | null>(null);

  const isOwner = viewerRole === 'owner';
  const canManage = isOwner || viewerRole === 'admin';
  const roleOptions = TEAM_ROLES.filter((r) => r !== 'owner' || isOwner);

  const handleConfirmRemove = () => {
    if (confirmMember) {
      onStatusChange(confirmMember, 'removed');
    }
    setConfirmMember(null);
  };

  return (
    <section className="bg-white rounded-2xl border border-background-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-background-100">
        <div>
          <h2 className="text-sm font-semibold text-foreground-950">Members</h2>
          <p className="text-xs text-foreground-500 mt-0.5">
            {members.length} {members.length === 1 ? 'person' : 'people'} in this workspace
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-foreground-400 border-b border-background-100">
              <th className="px-5 py-3 font-medium">Member</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Joined</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              const showControls = canManage && (!isSelf || isOwner);
              const isBusy = actingMemberId === member.id;

              return (
                <tr key={member.id} className="border-b border-background-50 last:border-0">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold">
                          {initialsFor(member.fullName, member.email)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground-950 truncate">
                          {member.fullName || member.email || 'Unnamed member'}
                          {isSelf && <span className="text-foreground-400 font-normal"> (you)</span>}
                        </p>
                        {member.email && (
                          <p className="text-xs text-foreground-500 truncate">{member.email}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    {showControls ? (
                      <select
                        value={member.role}
                        disabled={isBusy}
                        onChange={(e) => onRoleChange(member, e.target.value)}
                        className="h-9 px-2.5 border border-background-200 rounded-lg text-sm text-foreground-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer disabled:opacity-50"
                      >
                        {roleOptions.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-foreground-800">{roleLabel(member.role)}</span>
                    )}
                  </td>

                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE_CLASSES[member.status] ?? 'bg-background-100 text-foreground-500'}`}>
                      {statusLabel(member.status)}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 text-sm text-foreground-600 whitespace-nowrap">
                    {formatDate(member.joinedAt)}
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    {showControls ? (
                      <div className="relative inline-block">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setOpenMenuId((prev) => (prev === member.id ? null : member.id))}
                          className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-foreground-500 hover:bg-background-100 hover:text-foreground-800 transition-colors cursor-pointer disabled:opacity-50"
                          aria-label={`Actions for ${member.fullName || member.email || 'member'}`}
                        >
                          {isBusy ? (
                            <i className="ri-loader-4-line animate-spin"></i>
                          ) : (
                            <i className="ri-more-2-line"></i>
                          )}
                        </button>

                        {openMenuId === member.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                              aria-hidden="true"
                            ></div>
                            <div className="absolute right-0 top-10 z-20 w-44 bg-white border border-background-200 rounded-xl shadow-lg py-1.5">
                              {member.status !== 'suspended' && member.status !== 'removed' && (
                                <button
                                  type="button"
                                  onClick={() => { setOpenMenuId(null); onStatusChange(member, 'suspended'); }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-foreground-700 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  <i className="ri-pause-circle-line"></i>
                                  Suspend
                                </button>
                              )}
                              {(member.status === 'suspended' || member.status === 'removed') && (
                                <button
                                  type="button"
                                  onClick={() => { setOpenMenuId(null); onStatusChange(member, 'active'); }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-foreground-700 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  <i className="ri-play-circle-line"></i>
                                  Reactivate
                                </button>
                              )}
                              {member.status !== 'removed' && (
                                <button
                                  type="button"
                                  onClick={() => { setOpenMenuId(null); setConfirmMember(member); }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-status-red hover:bg-status-red/5 transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  <i className="ri-delete-bin-line"></i>
                                  Remove
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-foreground-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!confirmMember}
        variant="danger"
        title="Remove team member"
        description={`${confirmMember?.fullName || confirmMember?.email || 'This member'} will lose access to this workspace. You can reactivate them later.`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmMember(null)}
      />
    </section>
  );
}