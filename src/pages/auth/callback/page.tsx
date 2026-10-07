import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSupabase } from '@/lib/supabase';
import AuthLayout from '@/components/feature/AuthLayout';
import AuthLoadingScreen from '@/components/feature/AuthLoadingScreen';

/**
 * Captured synchronously at module load - before the Supabase client is created and
 * before `detectSessionInUrl` can consume and clear the URL. This guarantees that
 * recovery / verification links (and their error payloads such as expired or
 * already-used tokens) are never lost, no matter when the client initialises.
 */
const initialQuery = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search)
  : new URLSearchParams();
const initialHash = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.hash.replace(/^#/, ''))
  : new URLSearchParams();

function pick(key: string): string | null {
  return initialQuery.get(key) ?? initialHash.get(key);
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'error'>('pending');
  const [message, setMessage] = useState('');
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const nextParam = pick('next') ?? '';
    const next = nextParam.startsWith('/') ? nextParam : '/app';

    async function run() {
      const supabase = getSupabase();
      if (!supabase) {
        setStatus('error');
        setMessage('Authentication is not configured. Please contact support.');
        return;
      }

      // 1. Supabase passes failures (expired / already-used links) as error params.
      const errorCode = pick('error_code');
      const errorParam = pick('error');
      const errorDescription = pick('error_description');
      if (errorCode || errorParam || errorDescription) {
        setStatus('error');
        if (errorCode === 'otp_expired' || /expired/i.test(errorDescription ?? '')) {
          setMessage('This link has expired. Reset links are only valid for a short time — please request a new one.');
        } else if (errorCode === 'access_denied') {
          setMessage('This link is no longer valid — it may have already been used. Please request a new one.');
        } else {
          setMessage(errorDescription
            ? errorDescription.replace(/\+/g, ' ')
            : 'We could not verify this link. Please request a new one.');
        }
        return;
      }

      // 2. PKCE authorisation code (modern flow).
      const code = pick('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setStatus('error');
          setMessage('This link is invalid or has expired. Please request a new one.');
          return;
        }
      }

      // 3. Implicit-flow tokens (fallback if the client hasn't consumed them yet).
      const accessToken = initialHash.get('access_token');
      const refreshToken = initialHash.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setStatus('error');
          setMessage('This link is invalid or has expired. Please request a new one.');
          return;
        }
      }

      // 4. Wait briefly for the session to resolve (covers async detectSessionInUrl).
      let session = (await supabase.auth.getSession()).data.session;
      for (let attempt = 0; attempt < 12 && !session; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        session = (await supabase.auth.getSession()).data.session;
      }

      if (!session) {
        setStatus('error');
        setMessage('This link is invalid or has expired. Please request a new one.');
        return;
      }

      navigate(next, { replace: true });
    }

    void run();
  }, [navigate]);

  if (status === 'pending') {
    return <AuthLoadingScreen />;
  }

  return (
    <AuthLayout title="Link problem" subtitle="We couldn't complete that link.">
      <div className="bg-status-red-pale border border-status-red/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-status-red flex items-center justify-center flex-shrink-0">
            <i className="ri-error-warning-line text-white text-lg" style={{ width: '20px', height: '20px' }} />
          </div>
          <div>
            <p className="text-sm text-main font-medium">This link didn&apos;t work</p>
            <p className="text-sm text-muted mt-1">{message}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <Link
          to="/forgot-password"
          className="w-full h-11 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <i className="ri-mail-send-line" />
          Request a new link
        </Link>
        <p className="text-center text-sm text-muted">
          <Link to="/sign-in" className="text-primary-500 hover:text-primary-600 font-medium whitespace-nowrap">
            &larr; Back to sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}