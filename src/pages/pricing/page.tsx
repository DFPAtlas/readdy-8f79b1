import { useState } from 'react';
import Navbar from '@/pages/landing/components/Navbar';
import Footer from '@/pages/landing/components/Footer';
import PricingHeader from './components/PricingHeader';
import PlanCard from './components/PlanCard';
import ComparisonMatrix from './components/ComparisonMatrix';
import FaqSection from './components/FaqSection';
import TrustFooter from './components/TrustFooter';
import { plans, type BillingInterval } from '@/mocks/pricing';

export default function PricingPage() {
  const [interval, setInterval] = useState<BillingInterval>('annual');

  return (
    <div className="min-h-screen bg-page">
      <Navbar />
      <main>
        <PricingHeader interval={interval} onIntervalChange={setInterval} />

        {/* Plan matrix */}
        <section className="max-w-6xl mx-auto px-4 md:px-6 -mt-2 pt-12 md:pt-16 pb-16 md:pb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-7 items-start">
            {plans.map((plan) => (
              <PlanCard key={plan.key} plan={plan} interval={interval} />
            ))}
          </div>
        </section>

        <ComparisonMatrix />
        <FaqSection />
        <TrustFooter />
      </main>
      <Footer />
    </div>
  );
}