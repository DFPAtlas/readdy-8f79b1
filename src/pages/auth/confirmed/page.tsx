import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/feature/AuthLayout';

export default function AuthConfirmedPage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/sign-in', { replace: true });
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  return (
    <AuthLayout title="Email verified" subtitle="Your account is ready to go.">
      <div className="bg-status-green-pale border border-status-green/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-status-green flex items-center justify-center flex-shrink-0">
            <i className="ri-check-line text-white text-xl" style={{ width: '20px', height: '20px' }} />
          </div>
          <div>
            <p className="text-sm text-main font-medium">You&apos;re all set</p>
            <p className="text-sm text-muted mt-1">
              Your email has been verified and your BuildNerve account is now active. You can sign in and start managing your construction projects.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <Link
          to="/sign-in"
          className="w-full h-11 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <i className="ri-login-box-line" />
          Sign in to your account
        </Link>

        <p className="text-center text-xs text-muted">
          Redirecting to sign in in {countdown}s...
        </p>
      </div>
    </AuthLayout>
  );
}