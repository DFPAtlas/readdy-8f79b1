import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '@/components/feature/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import { invitationsService, InvitationError, type InvitePreview } from '@/services/invitations.service';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  project_manager: 'Project manager',
  site_supervisor: 'Site supervisor',
  finance: 'Finance',
  employee: 'Employee',
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ');
}

function buildAppUrl(path: string): string {
  const basePath = __BASE_PATH__.split('/').filter(Boolean).join('/');
  const pathPrefix = basePath ? `/${basePath}` : '';
  return `${pathPrefix}${path}`;
}

type InviteView =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'not-found' }
  | { kind: 'revoked' }
  | { kind: 'accepted' }
  | { kind: 'expired' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; preview: InvitePreview };

function headerCopy(view: InviteView): { title: string; subtitle: string } {
  switch (view.kind) {
    case 'loading':
      return { title: 'Your invitation', subtitle: 'Checking your invitation details...' };
    case 'missing':
      return { title: 'This invitation link is incomplete', subtitle: 'The link is missing its invitation token.' };
    case 'not-found':
      return { title: 'Invitation not found', subtitle: 'We could not find an invitation for this link.' };
    case 'revoked':
      return { title: 'Invitation revoked', subtitle: 'This invitation is no longer available.' };
    case 'accepted':
      return { title: 'Invitation already accepted', subtitle: 'This invitation has already been used.' };
    case 'expired':
      return { title: 'Invitation expired', subtitle: 'Ask your admin to resend it.' };
    case 'error':
      return { title: 'Something went wrong', subtitle: 'We could not load this invitation.' };
    case 'ready':
    default:
      return { title: 'Accept your invitation', subtitle: 'Review the details below to join the team.' };
  }
}

function MessageCard({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="bg-primary-50 border border-primary-200 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
          <i className={`${icon} text-white text-lg`} />
        </div>
        <p className="text-sm text-muted leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function BackToSignIn({ label = 'Back to sign in' }: { label?: string }) {
  return (
    <div className="mt-6 text-center">
      <Link to="/sign-in" className="text-sm text-primary-500 hover:text-primary-600 font-medium whitespace-nowrap">
        {label}
      </Link>
    </div>
  );
}

export default function AcceptInvitePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') ?? '';
  const acceptUrl = `/accept-invite?token=${encodeURIComponent(token)}`;

  const [view, setView] = useState<InviteView>({ kind: 'loading' });
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setView({ kind: 'missing' });
      return;
    }
    let cancelled = false;
    setView({ kind: 'loading' });

    invitationsService
      .preview(token)
      .then((preview) => {
        if (cancelled) return;
        if (preview.status === 'revoked') setView({ kind: 'revoked' });
        else if (preview.status === 'accepted') setView({ kind: 'accepted' });
        else if (preview.status === 'expired' || preview.expired) setView({ kind: 'expired' });
        else setView({ kind: 'ready', preview });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof InvitationError && err.status === 404) {
          setView({ kind: 'not-found' });
        } else {
          setView({ kind: 'error', message: err instanceof Error ? err.message : 'We could not load this invitation.' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAccept = useCallback(async () => {
    if (!token) return;
    setAccepting(true);
    setAcceptError(null);
    try {
      const result = await invitationsService.accept(token);
      localStorage.setItem('buildnerveOrgId', result.organisation_id);
      window.location.assign(buildAppUrl('/app'));
    } catch (err) {
      setAccepting(false);
      if (err instanceof InvitationError && err.status === 403) {
        setAcceptError('This invitation was sent to a different email address.');
      } else {
        setAcceptError(err instanceof Error ? err.message : 'We could not accept the invitation. Please try again.');
      }
    }
  }, [token]);

  const handleSwitchAccount = useCallback(async () => {
    await signOut();
    navigate('/sign-in', { state: { from: { pathname: acceptUrl } } });
  }, [signOut, navigate, acceptUrl]);

  const copy = headerCopy(view);
  const busy = authLoading || view.kind === 'loading';

  function renderReady(preview: InvitePreview): ReactNode {
    const signedInEmail = (user?.email ?? '').trim().toLowerCase();
    const invitedEmail = preview.email.trim().toLowerCase();
    const emailMatches = signedInEmail !== '' && signedInEmail === invitedEmail;
    const signUpUrl = `/sign-up?email=${encodeURIComponent(preview.email)}&next=${encodeURIComponent(`/accept-invite?token=${token}`)}`;

    return (
      <>
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
              <i className="ri-building-2-line text-white text-lg" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-main break-words">
                {preview.organisation_name || 'An organisation'}
              </p>
              <p className="text-sm text-muted mt-1">
                invited you to join as{' '}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium align-middle">
                  {roleLabel(preview.role)}
                </span>
              </p>
              <p className="text-xs text-muted mt-2 break-all">Invitation sent to {preview.email}</p>
            </div>
          </div>
        </div>

        {!user && (
          <div className="mt-6 space-y-3">
            <Link
              to={signUpUrl}
              className="w-full h-11 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <i className="ri-user-add-line" />
              Create account
            </Link>
            <Link
              to="/sign-in"
              state={{ from: { pathname: acceptUrl } }}
              className="w-full h-11 bg-white border border-border hover:border-primary-300 text-main text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <i className="ri-login-box-line" />
              Sign in
            </Link>
            <p className="text-center text-xs text-muted">
              Use the email address this invitation was sent to.
            </p>
          </div>
        )}

        {user && !emailMatches && (
          <div className="mt-6 space-y-3">
            <div className="bg-status-red-pale border border-status-red/20 rounded-xl p-3 flex items-start gap-3">
              <i className="ri-error-warning-line text-status-red mt-0.5" />
              <p className="text-sm text-status-red">This invitation was sent to a different email address.</p>
            </div>
            <button
              type="button"
              onClick={handleSwitchAccount}
              className="w-full h-11 bg-white border border-border hover:border-primary-300 text-main text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <i className="ri-logout-box-r-line" />
              Sign out and switch account
            </button>
          </div>
        )}

        {user && emailMatches && (
          <div className="mt-6 space-y-3">
            {acceptError && (
              <div className="bg-status-red-pale border border-status-red/20 rounded-xl p-3 flex items-start gap-3">
                <i className="ri-error-warning-line text-status-red mt-0.5" />
                <p className="text-sm text-status-red">{acceptError}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleAccept}
              disabled={accepting}
              className="w-full h-11 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {accepting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <i className="ri-check-line" />
                  Accept invitation
                </>
              )}
            </button>
          </div>
        )}
      </>
    );
  }

  function renderBody(): ReactNode {
    if (busy) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    switch (view.kind) {
      case 'missing':
        return (
          <>
            <MessageCard icon="ri-link-unlink">
              This link doesn&apos;t include an invitation token. Ask your admin to send a new invitation, or sign in to continue.
            </MessageCard>
            <BackToSignIn />
          </>
        );
      case 'not-found':
        return (
          <>
            <MessageCard icon="ri-search-eye-line">
              We couldn&apos;t find an invitation for this link. It may have been replaced by a newer invitation.
            </MessageCard>
            <BackToSignIn />
          </>
        );
      case 'revoked':
        return (
          <>
            <MessageCard icon="ri-forbid-2-line">
              This invitation has been revoked by the organisation. Ask your admin to send a new invitation.
            </MessageCard>
            <BackToSignIn />
          </>
        );
      case 'accepted':
        return (
          <>
            <MessageCard icon="ri-checkbox-circle-line">
              This invitation has already been accepted. Sign in to access your organisation.
            </MessageCard>
            <BackToSignIn label="Go to sign in" />
          </>
        );
      case 'expired':
        return (
          <>
            <MessageCard icon="ri-time-line">
              This invitation has expired. Ask your admin to resend it.
            </MessageCard>
            <BackToSignIn />
          </>
        );
      case 'error':
        return (
          <>
            <MessageCard icon="ri-error-warning-line">{view.message}</MessageCard>
            <BackToSignIn />
          </>
        );
      case 'ready':
        return renderReady(view.preview);
      default:
        return null;
    }
  }

  return (
    <AuthLayout title={copy.title} subtitle={copy.subtitle}>
      {renderBody()}
    </AuthLayout>
  );
}