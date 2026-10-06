import {
  daysUntil,
  formatDate,
  roleLabel,
} from '@/pages/settings/team/team.constants';
import type { PendingInvitationRow } from '@/services/team.service';

interface InvitationsTableProps {
  invitations: PendingInvitationRow[];
  actingInvitationId: string | null;
  onResend: (invitation: PendingInvitationRow) => void;
  onRevoke: (invitation: PendingInvitationRow) => void;
}

export default function InvitationsTable({
  invitations,
  actingInvitationId,
  onResend,
  onRevoke,
}: InvitationsTableProps) {
  return (
    <section className="bg-white rounded-2xl border border-background-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-background-100">
        <div>
          <h2 className="text-sm font-semibold text-foreground-950">Pending invitations</h2>
          <p className="text-xs text-foreground-500 mt-0.5">
            {invitations.length} awaiting a response
          </p>
        </div>
      </div>

      {invitations.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="w-11 h-11 rounded-full bg-background-100 text-foreground-400 flex items-center justify-center mx-auto mb-3">
            <i className="ri-mail-check-line text-lg"></i>
          </div>
          <p className="text-sm text-foreground-600">No pending invitations</p>
          <p className="text-xs text-foreground-400 mt-1">Invitations you send will appear here until they&apos;re accepted.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-foreground-400 border-b border-background-100">
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Invited by</th>
                <th className="px-5 py-3 font-medium">Expires</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((invitation) => {
                const isBusy = actingInvitationId === invitation.id;
                const remaining = daysUntil(invitation.expiresAt);
                const expiringSoon = remaining !== null && remaining <= 2;
                return (
                  <tr key={invitation.id} className="border-b border-background-50 last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-secondary-100 text-secondary-700 flex items-center justify-center flex-shrink-0">
                          <i className="ri-mail-line text-base"></i>
                        </div>
                        <span className="text-sm text-foreground-900 truncate">{invitation.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-foreground-800">{roleLabel(invitation.role)}</td>
                    <td className="px-5 py-3.5 text-sm text-foreground-600">
                      {invitation.invitedByName || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-sm ${expiringSoon ? 'text-status-amber' : 'text-foreground-600'} whitespace-nowrap`}>
                        {formatDate(invitation.expiresAt)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => onResend(invitation)}
                          className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border border-background-200 bg-white text-xs font-medium text-foreground-700 hover:bg-background-100 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                        >
                          <i className="ri-refresh-line"></i>
                          Resend
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => onRevoke(invitation)}
                          className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border border-background-200 bg-white text-xs font-medium text-status-red hover:bg-status-red/5 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                        >
                          {isBusy ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-close-circle-line"></i>}
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}