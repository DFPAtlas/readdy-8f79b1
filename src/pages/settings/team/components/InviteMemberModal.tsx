import { useEffect, useState, type FormEvent } from 'react';
import { ROLE_LABELS, TEAM_ROLES } from '@/pages/settings/team/team.constants';

interface InviteMemberModalProps {
  open: boolean;
  viewerRole: string | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (email: string, role: string) => void;
}

export default function InviteMemberModal({
  open,
  viewerRole,
  submitting,
  error,
  onClose,
  onSubmit,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('employee');
  const [touched, setTouched] = useState(false);

  const isOwner = viewerRole === 'owner';
  const availableRoles = TEAM_ROLES.filter((r) => r !== 'owner' || isOwner);

  useEffect(() => {
    if (open) {
      setEmail('');
      setRole('employee');
      setTouched(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailValid || submitting) return;
    onSubmit(email.trim(), role);
  };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="invite-title">
      <div className="absolute inset-0 bg-black/40" onClick={() => !submitting && onClose()}></div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-[92vw] max-w-md p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
              <i className="ri-user-add-line text-lg"></i>
            </div>
            <div>
              <h2 id="invite-title" className="text-lg font-semibold text-foreground-950">Invite member</h2>
              <p className="text-xs text-foreground-500 mt-0.5">They&apos;ll get an email with a link to join.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 hover:text-foreground-700 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-foreground-800 mb-1.5">
              Email address
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              autoComplete="off"
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="name@company.co.uk"
              className="w-full px-3 py-2.5 border border-background-200 rounded-lg text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            {touched && !emailValid && (
              <p className="text-xs text-status-red mt-1">Enter a valid email address.</p>
            )}
          </div>

          <div>
            <label htmlFor="invite-role" className="block text-sm font-medium text-foreground-800 mb-1.5">
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 border border-background-200 rounded-lg text-sm text-foreground-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer"
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <p className="text-xs text-foreground-400 mt-1">
              You can change this at any time from the members table.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-status-red/10 border border-status-red/20 px-3 py-2.5">
              <p className="text-xs text-status-red">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => !submitting && onClose()}
              className="flex-1 h-10 border border-background-200 bg-white text-foreground-800 rounded-xl text-sm font-semibold hover:bg-background-100 transition-colors whitespace-nowrap cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-10 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  Sending…
                </>
              ) : (
                'Send invitation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}