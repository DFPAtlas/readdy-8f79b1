import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getSupabase, hasSupabaseCredentials } from '@/lib/supabase';
import type { Session, User, AuthError } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string, nextPath?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Detects the "stale refresh token" family of errors that Supabase throws when the
 * session persisted in the browser is no longer valid (expired, revoked, or from a
 * wiped server-side session). In those cases the only correct recovery is to discard
 * the dead local session and treat the user as signed out, instead of surfacing a
 * scary unhandled auth error.
 */
function isInvalidRefreshTokenError(err: unknown): boolean {
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

async function purgeStaleSession(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    // Scope "local" only clears the browser copy; it never calls the server,
    // so it cannot fail because the token is already gone server-side.
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Ignore - the goal is simply to drop the unusable local session.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (cancelled) return;
      if (error && isInvalidRefreshTokenError(error)) {
        void purgeStaleSession();
        setState((prev) => ({ ...prev, session: null, user: null, loading: false }));
        return;
      }
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
      }));
    }).catch(async (err: unknown) => {
      if (cancelled) return;
      if (isInvalidRefreshTokenError(err)) {
        await purgeStaleSession();
      }
      setState((prev) => ({ ...prev, session: null, user: null, loading: false }));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
      }));
    });

    // Background token refreshes can reject outside of getSession(). Catch that
    // specific failure so a stale token signs the user out cleanly rather than
    // bubbling up as an unhandled rejection.
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (isInvalidRefreshTokenError(event.reason)) {
        event.preventDefault();
        void purgeStaleSession();
        setState((prev) => ({ ...prev, session: null, user: null, loading: false }));
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      setState((prev) => ({ ...prev, error: 'Supabase is not configured.' }));
      return { error: { message: 'Supabase is not configured.', name: 'AuthError', status: 500 } as unknown as AuthError };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState((prev) => ({ ...prev, error: error.message }));
    }
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string, nextPath?: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      setState((prev) => ({ ...prev, error: 'Supabase is not configured.' }));
      return { error: { message: 'Supabase is not configured.', name: 'AuthError', status: 500 } as unknown as AuthError };
    }
    // Carry an optional in-app return path (e.g. an invitation link) through the
    // email verification step so the user lands back where they started.
    const safeNext = nextPath && nextPath.startsWith('/') ? nextPath : '';
    const emailRedirectTo = `${window.location.origin}/auth/confirmed${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ''}`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo,
      },
    });
    if (error) {
      setState((prev) => ({ ...prev, error: error.message }));
    }
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setState({ session: null, user: null, loading: false, error: null });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      setState((prev) => ({ ...prev, error: 'Supabase is not configured.' }));
      return { error: { message: 'Supabase is not configured.', name: 'AuthError', status: 500 } as unknown as AuthError };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setState((prev) => ({ ...prev, error: error.message }));
    }
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      setState((prev) => ({ ...prev, error: 'Supabase is not configured.' }));
      return { error: { message: 'Supabase is not configured.', name: 'AuthError', status: 500 } as unknown as AuthError };
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setState((prev) => ({ ...prev, error: error.message }));
    }
    return { error };
  }, []);

  const value: AuthContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}