import { useState, type FormEvent } from 'react';

export default function CtaSection() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus('loading');
    setError('');

    const formData = new FormData(form);
    try {
      const response = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/request-demo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          company: formData.get('company'),
          website_alt: formData.get('website_alt'),
        }),
      });

      if (!response.ok) throw new Error('Demo access requests are temporarily unavailable. Please contact us for a guided demo.');
      setStatus('success');
      form.reset();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Demo access requests are temporarily unavailable.');
    }
  }

  return (
    <section id="demo" className="relative py-20 md:py-28 overflow-hidden bg-sidebar">
      <div className="absolute inset-0">
        <img
          src="https://readdy.ai/api/search-image?query=Minimal%20abstract%20architectural%20render%20of%20a%20modern%20building%20under%20construction%20layered%20geometric%20scaffolding%20forms%20emerald%20teal%20and%20slate%20tones%20soft%20gradient%20lighting%20clean%20premium%20enterprise%20aesthetic%20wide%20panoramic%20composition%20subtle%20grid%20texture&width=1600&height=600&seq=landing-cta-01&orientation=landscape"
          alt=""
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-sidebar/90"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-white font-display tracking-tight leading-tight">
            Ready to run your business with clarity?
          </h2>
          <p className="mt-4 text-base text-white/70 leading-relaxed max-w-lg">
            See how BuildNerve can tighten your commercial control, speed up your valuations and keep you
            compliant — in a free 14-day trial with no credit card required.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              '14-day free trial, full feature access',
              'Onboarding with a UK construction specialist',
              'Cancel anytime — keep your data',
            ].map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm text-white/90">
                <span className="w-5 h-5 rounded-full bg-white/10 text-primary-300 flex items-center justify-center">
                  <i className="ri-check-line text-sm"></i>
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-2xl">
          <h3 className="text-lg font-semibold text-main font-display">Try the BuildNerve demo</h3>
          <p className="mt-1 text-sm text-muted">Enter your details and we&apos;ll email a secure sign-in link to your private sample workspace.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="demo-name" className="mb-1.5 block text-xs font-medium text-main">Full name</label>
              <input id="demo-name" name="name" type="text" required maxLength={120} autoComplete="name" className="w-full h-11 px-3.5 rounded-lg border border-border bg-page text-sm text-main focus:border-primary-300 focus:ring-2 focus:ring-primary-50 outline-none" />
            </div>
            <div>
              <label htmlFor="demo-email" className="mb-1.5 block text-xs font-medium text-main">Work email</label>
              <input id="demo-email" name="email" type="email" required maxLength={254} autoComplete="email" className="w-full h-11 px-3.5 rounded-lg border border-border bg-page text-sm text-main focus:border-primary-300 focus:ring-2 focus:ring-primary-50 outline-none" />
            </div>
            <div>
              <label htmlFor="demo-company" className="mb-1.5 block text-xs font-medium text-main">Company</label>
              <input id="demo-company" name="company" type="text" required maxLength={120} autoComplete="organization" className="w-full h-11 px-3.5 rounded-lg border border-border bg-page text-sm text-main focus:border-primary-300 focus:ring-2 focus:ring-primary-50 outline-none" />
            </div>
            <input name="website_alt" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <button type="submit" disabled={status === 'loading'} className="w-full h-11 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors">
              {status === 'loading' ? 'Sending link…' : 'Email me a demo link'}
            </button>
            {status === 'success' && <p role="status" className="text-sm text-status-green font-medium">If the request is valid, a secure sign-in link will arrive shortly.</p>}
            {status === 'error' && <p role="alert" className="text-sm text-status-red font-medium">{error}</p>}
          </form>
          <p className="mt-3 text-xs text-muted text-center">Each visitor receives a separate workspace with fictional sample data. No shared passwords.</p>
        </div>
      </div>
    </section>
  );
}
