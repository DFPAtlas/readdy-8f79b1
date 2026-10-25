import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { useScopedResource } from '@/hooks/useScopedResource';
import { loadPlatformAccess } from '@/services/platform-access.service';
import LoadState from '@/components/live/LoadState';
export default function PlatformAdminMfaPage() {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Checking session…</p>;
  if (!user) return <Navigate to="/platform-admin/login" replace/>;
  return <MfaForm key={user.id} userId={user.id}/>;
}
function MfaForm({ userId }: { userId: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [enrollment, setEnrollment] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const state = useScopedResource(userId, async () => {
    await loadPlatformAccess(userId);
    const client = getSupabase();
    if (!client) throw new Error('Backend unavailable');
    const result = await client.auth.mfa.listFactors();
    if (result.error) throw result.error;
    return result.data.totp.filter(factor => factor.status === 'verified');
  });
  async function enroll() {
    if (busy || enrollment || !state.data) return;
    setBusy(true); setError('');
    try {
      const client = getSupabase();
      if (!client) throw new Error();
      const result = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: `BuildNerve ${new Date().toISOString()}` });
      if (result.error) throw result.error;
      setEnrollment({ id: result.data.id, qr: result.data.totp.qr_code, secret: result.data.totp.secret });
    } catch { setError('Authenticator setup could not be started.'); } finally { setBusy(false); }
  }
  async function verify(event: FormEvent) {
    event.preventDefault();
    const factorId = enrollment?.id || state.data?.[0]?.id;
    if (!factorId || busy || !/^\d{6}$/.test(code)) return;
    setBusy(true); setError('');
    try {
      const client = getSupabase();
      if (!client) throw new Error();
      const result = await client.auth.mfa.challengeAndVerify({ factorId, code });
      if (result.error) throw result.error;
      const verified = await loadPlatformAccess(userId);
      if (verified.assurance !== 'aal2') throw new Error();
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from?.startsWith('/platform-admin/') && !['/platform-admin/mfa', '/platform-admin/login'].includes(from) ? from : '/platform-admin', { replace: true });
    } catch { setError('Verification failed. Check your current authenticator code and retry.'); } finally { setBusy(false); }
  }
  return <main className="max-w-md mx-auto p-8 space-y-4"><h1 className="text-2xl font-bold">Platform authenticator verification</h1><LoadState {...state}/>{error && <p role="alert">{error}</p>}{state.data && <>{state.data.length === 0 && !enrollment && <><p>Set up an authenticator to continue to platform administration.</p><button disabled={busy} onClick={enroll}>Set up authenticator</button></>}{enrollment && <><p>Scan this QR code with your authenticator, then enter its code.</p><img alt="Authenticator setup QR code" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollment.qr)}`}/><p>Manual setup key: <code>{enrollment.secret}</code></p></>}{(enrollment || state.data.length > 0) && <form onSubmit={verify} className="space-y-3"><label className="block">Six-digit code<input className="block border rounded p-2" value={code} inputMode="numeric" autoComplete="one-time-code" onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}/></label><button disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify and continue'}</button></form>}</>}</main>;
}
