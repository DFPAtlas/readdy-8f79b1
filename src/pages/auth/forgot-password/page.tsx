import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AuthLayout from '@/components/feature/AuthLayout';

export default function ForgotPasswordPage() {
  const { resetPassword, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  function validate(): boolean {
    if (!email.trim()) {
      setFormError('Email address is required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Please enter a valid email address.');
      return false;
    }
    setFormError(undefined);
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    if (!validate()) return;

    setSubmitting(true);
    await resetPassword(email.trim());
    setSubmitting(false);
    setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="If an account exists, a reset link has been sent.">
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
              <i className="ri-mail-send-line text-white text-lg" />
            </div>
            <div>
              <p className="text-sm text-main font-medium">Reset link sent</p>
              <p className="text-sm text-muted mt-1">
                If <strong>{email}</strong> is registered, you&apos;ll receive a password reset link shortly.
              </p>
              <p className="text-xs text-muted mt-2">
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button onClick={() => setSent(false)} className="text-primary-500 hover:underline font-medium cursor-pointer">try again</button>.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/sign-in" className="text-sm text-primary-500 hover:text-primary-600 font-medium whitespace-nowrap">
            &larr; Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we'll send you a reset link.">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {(error || formError) && (
          <div className="bg-status-red-pale border border-status-red/20 rounded-xl p-3 flex items-start gap-3">
            <i className="ri-error-warning-line text-status-red mt-0.5" />
            <p className="text-sm text-status-red">{formError || error}</p>
          </div>
        )}

        <div>
          <label htmlFor="forgot-email" className="block text-sm font-medium text-main mb-1.5">
            Email address
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFormError(undefined); }}
            className={`w-full h-11 px-4 bg-white border rounded-xl text-sm text-main placeholder:text-muted outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-50 ${formError ? 'border-status-red' : 'border-border'}`}
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            'Send reset link'
          )}
        </button>

        <p className="text-center text-sm text-muted">
          <Link to="/sign-in" className="text-primary-500 hover:text-primary-600 font-medium whitespace-nowrap">
            &larr; Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}