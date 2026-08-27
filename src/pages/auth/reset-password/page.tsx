import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AuthLayout from '@/components/feature/AuthLayout';

export default function ResetPasswordPage() {
  const { updatePassword, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<{ password?: string; confirm?: string }>({});

  function validate(): boolean {
    const errors: { password?: string; confirm?: string } = {};
    if (!password) {
      errors.password = 'New password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }
    if (!confirmPassword) {
      errors.confirm = 'Please confirm your new password.';
    } else if (password !== confirmPassword) {
      errors.confirm = 'Passwords do not match.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    if (!validate()) return;

    setSubmitting(true);
    const { error: updateError } = await updatePassword(password);
    setSubmitting(false);

    if (!updateError) {
      setSuccess(true);
      setTimeout(() => navigate('/sign-in', { replace: true }), 3000);
    }
  }

  if (success) {
    return (
      <AuthLayout title="Password updated" subtitle="Your password has been successfully reset.">
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
              <i className="ri-check-line text-white text-lg" />
            </div>
            <div>
              <p className="text-sm text-main font-medium">Password reset successful</p>
              <p className="text-sm text-muted mt-1">
                You can now sign in with your new password. Redirecting...
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 text-center">
          <Link to="/sign-in" className="text-sm text-primary-500 hover:text-primary-600 font-medium whitespace-nowrap">
            Sign in now
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password for your account.">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {error && (
          <div className="bg-status-red-pale border border-status-red/20 rounded-xl p-3 flex items-start gap-3">
            <i className="ri-error-warning-line text-status-red mt-0.5" />
            <p className="text-sm text-status-red">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="reset-password" className="block text-sm font-medium text-main mb-1.5">
            New password
          </label>
          <div className="relative">
            <input
              id="reset-password"
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
        </div>

        <div>
          <label htmlFor="reset-confirm" className="block text-sm font-medium text-main mb-1.5">
            Confirm new password
          </label>
          <input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setFormErrors((p) => ({ ...p, confirm: undefined })); }}
            className={`w-full h-11 px-4 bg-white border rounded-xl text-sm text-main placeholder:text-muted outline-none transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-50 ${formErrors.confirm ? 'border-status-red' : 'border-border'}`}
            placeholder="Re-enter your new password"
          />
          {formErrors.confirm && <p className="text-status-red text-xs mt-1">{formErrors.confirm}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Updating...
            </>
          ) : (
            'Reset password'
          )}
        </button>
      </form>
    </AuthLayout>
  );
}