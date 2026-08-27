import { Link } from 'react-router-dom';
import AuthLayout from '@/components/feature/AuthLayout';

export default function VerifyEmailPage() {
  return (
    <AuthLayout title="Verify your email" subtitle="One more step to activate your account.">
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
            <i className="ri-mail-check-line text-white text-lg" />
          </div>
          <div>
            <p className="text-sm text-main font-medium">Check your inbox</p>
            <p className="text-sm text-muted mt-1">
              We&apos;ve sent a verification link to your email address. Click the link to activate your account and get started with BuildNerve.
            </p>
            <p className="text-xs text-muted mt-2">
              If you don&apos;t see the email, check your spam folder. The link expires after 24 hours.
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