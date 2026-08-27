import type { BillingInterval } from '@/mocks/pricing';

interface PricingHeaderProps {
  interval: BillingInterval;
  onIntervalChange: (interval: BillingInterval) => void;
}

export default function PricingHeader({ interval, onIntervalChange }: PricingHeaderProps) {
  return (
    <section className="relative overflow-hidden bg-sidebar">
      <div className="absolute inset-0">
        <img
          src="https://readdy.ai/api/search-image?query=Abstract%20geometric%20construction%20site%20illustration%20overlapping%20steel%20beams%20scaffolding%20and%20crane%20silhouettes%20deep%20slate%20and%20emerald%20teal%20gradient%20subtle%20blueprint%20grid%20lines%20topographic%20contours%20soft%20ambient%20light%20premium%20enterprise%20software%20aesthetic%20clean%20minimal%20vector%20composition%20generous%20negative%20space&width=1600&height=800&seq=landing-pricing-01&orientation=landscape"
          alt="Abstract construction operations illustration"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-sidebar/90 via-sidebar/75 to-sidebar/95"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 pt-32 md:pt-40 pb-16 md:pb-20 text-center">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-medium">
          <i className="ri-price-tag-3-line"></i>
          GBP (£) pricing · No hidden fees
        </span>

        <h1 className="mt-6 text-3xl md:text-5xl font-bold text-white tracking-tight font-display leading-tight">
          Transparent Construction Management Pricing
        </h1>
        <p className="mt-5 text-base md:text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">
          Choose the right plan to manage jobs, automate HMRC CIS compliance, and streamline client payments.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3">
          <div className="flex items-center gap-1 bg-white/10 border border-white/20 rounded-full p-1">
            <button
              onClick={() => onIntervalChange('monthly')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                interval === 'monthly' ? 'bg-white text-main' : 'text-white/70 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => onIntervalChange('annual')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                interval === 'annual' ? 'bg-white text-main' : 'text-white/70 hover:text-white'
              }`}
            >
              Annual Billing
              <span
                className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                  interval === 'annual' ? 'bg-status-green-pale text-status-green' : 'bg-status-green/20 text-status-green'
                }`}
              >
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}