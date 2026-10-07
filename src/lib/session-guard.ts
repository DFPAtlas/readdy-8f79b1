import { getExistingSupabase } from '@/lib/supabase';

const GUARD_FLAG = '__buildnerveSessionGuardInstalled__';

/**
 * Detects the "stale refresh token" family of errors Supabase throws when the
 * session persisted in the browser is no longer valid (expired, revoked, or from
 * a wiped server-side session). In those cases the only correct recovery is to
 * discard the dead local session and treat the user as signed out, instead of
 * surfacing a scary unhandled auth error.
 */
export function isInvalidRefreshTokenError(err: unknown): boolean {
  const message = typeof err === 'string'
    ? err
    : (err as { message?: string } | null | undefined)?.message ?? '';
  const normalized = message.toLowerCase();
  return (
    normalized.includes('invalid refresh token') ||
    normalized.includes('refresh token not found') ||
    normalized.includes('refresh_token_not_found')
  );
}

/**
 * Drops the unusable local session. Scope "local" only clears the browser copy and
 * never calls the server, so it cannot fail because the token is already gone
 * server-side. Uses the already-created client only - it never triggers creation,
 * so it can never re-enter the token-refresh path that caused the error.
 */
export async function purgeStaleSession(): Promise<void> {
  const supabase = getExistingSupabase();
  if (!supabase) return;
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Ignore - the goal is simply to drop the unusable local session.
  }
}

/**
 * Installs a global "unhandled rejection" guard exactly once. It must be called as
 * early as possible (before React renders and before the Supabase client is
 * created) so that the automatic token-refresh failure thrown during client
 * construction is caught, suppressed, and turned into a clean sign-out.
 */
export function installSessionGuard(): void {
  if (typeof window === 'undefined') return;
  const globalScope = window as unknown as Record<string, unknown>;
  if (globalScope[GUARD_FLAG]) return;
  globalScope[GUARD_FLAG] = true;

  window.addEventListener('unhandledrejection', (event) => {
    if (!isInvalidRefreshTokenError(event.reason)) return;
    // Mark it handled so the browser does not log it as an uncaught rejection.
    event.preventDefault();
    void purgeStaleSession();
  });
}