import { Link } from 'react-router-dom';

const trustBadges = [
  { icon: 'ri-shield-check-line', label: 'HMRC Compliant' },
  { icon: 'ri-lock-2-line', label: '256-Bit SSL Encryption' },
  { icon: 'ri-close-circle-line', label: 'Cancel Anytime' },
  { icon: 'ri-bank-card-line', label: 'No Credit Card Required for Trial' },
];

export default function TrustFooter() {
  return (
    <section className="py-16 md:py-20 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-main font-display tracking-tight">
          Start managing your jobs with confidence
        </h2>
        <p className="text-sm text-muted mt-3 max-w-xl mx-auto leading-relaxed">
          Join 500+ UK contractors already running procurement, compliance and payments on SterlingLet Contractor.
        </p>

        <div className="mt-8">
          <Link
            to="/sign-up"
            className="inline-block px-7 py-3.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            Start 14-Day Free Trial
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {trustBadges.map((badge) => (
            <div key={badge.label} className="flex items-center gap-2 text-muted">
              <i className={`${badge.icon} text-status-green`}></i>
              <span className="text-xs font-medium whitespace-nowrap">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}