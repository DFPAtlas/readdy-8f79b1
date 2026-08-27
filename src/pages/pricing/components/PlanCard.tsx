import { Link } from 'react-router-dom';
import type { PlanTier, BillingInterval } from '@/mocks/pricing';

interface PlanCardProps {
  plan: PlanTier;
  interval: BillingInterval;
}

export default function PlanCard({ plan, interval }: PlanCardProps) {
  const price = interval === 'annual' ? plan.annualPrice : plan.monthlyPrice;
  const isMailto = plan.ctaHref.startsWith('mailto');

  const ctaClass = plan.featured
    ? 'bg-primary-500 text-white hover:bg-primary-600'
    : plan.key === 'enterprise'
      ? 'bg-sidebar text-white hover:bg-sidebar-hover'
      : 'bg-transparent text-primary-500 border border-primary-500 hover:bg-primary-50';

  return (
    <div
      className={`relative flex flex-col bg-white rounded-2xl border p-6 md:p-7 ${
        plan.featured
          ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-xl lg:-mt-4 lg:mb-4'
          : 'border-border'
      }`}
    >
      {plan.featured && plan.badge && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 bg-primary-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full whitespace-nowrap">
          <i className="ri-star-fill"></i>
          {plan.badge}
        </span>
      )}

      <div className={plan.featured ? 'pt-3' : ''}>
        <h3 className="text-lg md:text-xl font-bold text-main font-display">{plan.name}</h3>
        <p className="text-xs text-muted mt-1.5 leading-relaxed">{plan.audience}</p>
        <p className="text-sm text-muted mt-2 leading-relaxed">{plan.description}</p>
      </div>

      <div className="mt-6 flex items-end gap-1.5">
        <span className="text-4xl font-bold text-main font-display">£{price}</span>
        <span className="text-sm text-muted mb-1.5">/month</span>
      </div>
      <p className="text-xs text-muted mt-1">
        {interval === 'annual' ? 'billed annually' : 'billed monthly'}
        {plan.featured && interval === 'annual' && (
          <span className="ml-1.5 text-status-green font-medium">· save 20%</span>
        )}
      </p>

      <div className="mt-6 pt-6 border-t border-border flex-1">
        {plan.includesLabel && (
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">{plan.includesLabel}</p>
        )}
        <ul className="space-y-2.5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-main">
              <i className="ri-check-line text-status-green mt-0.5 flex-shrink-0"></i>
              <span className="leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-7">
        {isMailto ? (
          <a href={plan.ctaHref} className={ctaClass + ' block w-full py-3 rounded-lg text-sm font-semibold text-center transition-colors whitespace-nowrap cursor-pointer'}>
            {plan.cta}
          </a>
        ) : (
          <Link to={plan.ctaHref} className={ctaClass + ' block w-full py-3 rounded-lg text-sm font-semibold text-center transition-colors whitespace-nowrap cursor-pointer'}>
            {plan.cta}
          </Link>
        )}
      </div>

      {plan.key === 'trades' && (
        <p className="mt-3 text-center text-xs text-muted">No credit card required</p>
      )}
    </div>
  );
}