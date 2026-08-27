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
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
      }));
    }).catch(() => {
      setState((prev) => ({ ...prev, loading: false }));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
      }));
    });

    return () => {
      subscription.unsubscribe();
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

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      setState((prev) => ({ ...prev, error: 'Supabase is not configured.' }));
      return { error: { message: 'Supabase is not configured.', name: 'AuthError', status: 500 } as unknown as AuthError };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/confirmed`,
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