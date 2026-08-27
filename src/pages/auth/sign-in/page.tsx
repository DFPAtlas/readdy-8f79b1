import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AuthLayout from '@/components/feature/AuthLayout';

export default function SignInPage() {
  const { signIn, user, loading: authLoading, error, clearError } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/app';

  if (!authLoading && user) {
    navigate(from, { replace: true });
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center">
          <span className="text-white font-bold text-sm">SL</span>
        </div>
      </div>
    );
  }

  function validate(): boolean {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    if (!validate()) return;

    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);

    if (!error) {
      navigate(from, { replace: true });
    }
  }

  return (
    <AuthLayout title="Sign in to SiteLedger" subtitle="Access your contractor workspace.">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {error && (
          <div className="bg-status-red-pale border border-status-red/20 rounded-xl p-3 flex items-start gap-3">
            <i className="ri-error-warning-line text-status-red mt-0.5" />
            <p className="text-sm text-status-red">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="signin-email" className="block text-sm font-medium text-main mb-1.5">
            Email address
          </label>
          <input
            id="signin-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFormErrors((p) => ({ ...p, email: undefined })); }}
            className={`w-full h-11 px-4 bg-white border rounded-xl text-sm text-main placeholder:text-muted outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-50 ${formErrors.email ? 'border-status-red' : 'border-border'}`}
            placeholder="you@example.com"
          />
          {formErrors.email && <p className="text-status-red text-xs mt-1">{formErrors.email}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="signin-password" className="text-sm font-medium text-main">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs text-primary-500 hover:text-primary-600 font-medium whitespace-nowrap">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="signin-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFormErrors((p) => ({ ...p, password: undefined })); }}
              className={`w-full h-11 px-4 pr-11 bg-white border rounded-xl text-sm text-main placeholder:text-muted outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-50 ${formErrors.password ? 'border-status-red' : 'border-border'}`}
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-colors p-1 cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <i className={`${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-lg`} />
            </button>
          </div>
          {formErrors.password && <p className="text-status-red text-xs mt-1">{formErrors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </button>

        <p className="text-center text-sm text-muted">
          Don&apos;t have an account?{' '}
          <Link to="/sign-up" className="text-primary-500 hover:text-primary-600 font-medium whitespace-nowrap">
            Create one
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}