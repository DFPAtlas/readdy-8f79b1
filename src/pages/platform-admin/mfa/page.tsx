import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function PlatformAdminMfaPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (code.length < 6) {
      setError('Please enter a valid 6-digit authentication code.');
      setLoading(false);
      return;
    }

    // In production: verify TOTP via Supabase Auth MFA challenge
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/platform-admin';
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <i className="ri-smartphone-line text-3xl text-amber-400"></i>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Multi-factor authentication</h1>
          <p className="text-slate-400 text-sm">Enter the 6-digit code from your authenticator app to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
              <i className="ri-error-warning-line text-red-400 mt-0.5"></i>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5">Authentication code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-center text-2xl tracking-[0.5em] placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                Verifying...
              </span>
            ) : (
              'Verify and continue'
            )}
          </button>

          <div className="text-center">
            <button type="button" className="text-slate-500 hover:text-amber-400 text-sm transition-colors cursor-pointer">
              Use a recovery code instead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}