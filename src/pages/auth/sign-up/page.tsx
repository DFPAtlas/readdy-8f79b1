import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AuthLayout from '@/components/feature/AuthLayout';

export default function SignUpPage() {
  const { signUp, user, loading: authLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<{ fullName?: string; email?: string; password?: string }>({});

  if (!authLoading && user && !success) {
    navigate('/', { replace: true });
    return null;
  }

  function validate(): boolean {
    const errors: { fullName?: string; email?: string; password?: string } = {};
    if (!fullName.trim()) {
      errors.fullName = 'Full name is required.';
    }
    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    if (!validate()) return;

    setSubmitting(true);
    const { error: signUpError } = await signUp(email.trim(), password, fullName.trim());
    setSubmitting(false);

    if (!signUpError) {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <AuthLayout title="Check your email" subtitle="We've sent a verification link to your inbox.">
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
              <i className="ri-mail-send-line text-white text-lg" />
            </div>
            <div>
              <p className="text-sm text-main font-medium">Verification email sent</p>
              <p className="text-sm text-muted mt-1">
                Please check <strong>{email}</strong> and click the verification link to activate your account.
              </p>
              <p className="text-xs text-muted mt-2">
                If you don&apos;t see it, check your spam folder or{' '}
                <Link to="/sign-in" className="text-primary-500 hover:underline font-medium whitespace-nowrap">return to sign in</Link>.
              </p>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start managing your construction projects with BuildNerve.">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {error && (
          <div className="bg-status-red-pale border border-status-red/20 rounded-xl p-3 flex items-start gap-3">
            <i className="ri-error-warning-line text-status-red mt-0.5" />
            <p className="text-sm text-status-red">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="signup-name" className="block text-sm font-medium text-main mb-1.5">
            Full name
          </label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => { setFullName(e.target.value); setFormErrors((p) => ({ ...p, fullName: undefined })); }}
            className={`w-full h-11 px-4 bg-white border rounded-xl text-sm text-main placeholder:text-muted outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-50 ${formErrors.fullName ? 'border-status-red' : 'border-border'}`}
            placeholder="e.g. Martin Taylor"
          />
          {formErrors.fullName && <p className="text-status-red text-xs mt-1">{formErrors.fullName}</p>}
        </div>

        <div>
          <label htmlFor="signup-email" className="block text-sm font-medium text-main mb-1.5">
            Email address
          </label>
          <input
            id="signup-email"
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
          <label htmlFor="signup-password" className="block text-sm font-medium text-main mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFormErrors((p) => ({ ...p, password: undefined })); }}
              className={`w-full h-11 px-4 pr-11 bg-white border rounded-xl text-sm text-main placeholder:text-muted outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-50 ${formErrors.password ? 'border-status-red' : 'border-border'}`}
              placeholder="At least 8 characters"
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
          <p className="text-xs text-muted mt-1.5">Must be at least 8 characters.</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </button>

        <p className="text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-primary-500 hover:text-primary-600 font-medium whitespace-nowrap">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}