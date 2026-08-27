import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '@/components/feature/AuthLayout';

export default function AcceptInvitePage() {
  const [accepted] = useState(false);

  return (
    <AuthLayout
      title={accepted ? 'Invitation accepted' : 'Accept your invitation'}
      subtitle={accepted ? 'Your account is ready.' : 'You\'ve been invited to join an organisation on BuildNerve.'}
    >
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
            <i className="ri-user-add-line text-white text-lg" />
          </div>
          <div>
            <p className="text-sm text-main font-medium">Demo invitation page</p>
            <p className="text-sm text-muted mt-1">
              In production, this page validates the invitation token, presents the organisation details, and allows the invited user to create an account or sign in to accept.
            </p>
            <p className="text-xs text-muted mt-2">
              Invitation tokens are high-entropy, single-use, and expire after the configured period.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <Link
          to="/sign-up"
          className="block w-full h-11 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center whitespace-nowrap cursor-pointer"
        >
          Create account to accept
        </Link>
        <p className="text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-primary-500 hover:text-primary-600 font-medium whitespace-nowrap">
            Sign in to accept
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}