import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BNWordmarkLight } from '@/components/base/BuildNerveLogo';

const NEWSLETTER_FORM_URL = 'https://readdy.ai/api/form/da7c0cmij9sffln41rr0';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#' },
      { label: 'Procurement', href: '#' },
      { label: 'Valuations', href: '#' },
      { label: 'CIS Compliance', href: '#' },
      { label: 'Client Portal', href: '#' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', href: '#' },
      { label: 'Customers', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Partners', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Help centre', href: '#' },
      { label: 'API documentation', href: '#' },
      { label: 'Status', href: '#' },
      { label: 'Changelog', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Terms', href: '/legal/terms' },
      { label: 'Cookies', href: '/legal/cookies' },
      { label: 'Security', href: '/legal/security' },
      { label: 'Legal & Trust Centre', href: '/legal' },
    ],
  },
];

export default function Footer() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubscribe(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const honeypot = (form.elements.namedItem('company_alt') as HTMLInputElement)?.value?.trim();
    if (honeypot) {
      setStatus('success');
      setErrorMsg('');
      form.reset();
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    const fd = new FormData(form);
    const params = new URLSearchParams();
    fd.forEach((value, key) => {
      if (key === 'company_alt') return;
      const str = String(value);
      if (str.trim() !== '') params.append(key, str);
    });

    try {
      const res = await fetch(NEWSLETTER_FORM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const responseText = await res.text();
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(responseText);
      } catch {
        /* ignore parse errors */
      }
      const serverMsg = parsed?.meta?.message || parsed?.message || parsed?.meta?.detail || responseText;

      if (res.ok && (parsed as { code?: string })?.code === 'OK') {
        setStatus('success');
        form.reset();
      } else {
        setStatus('error');
        setErrorMsg(typeof serverMsg === 'string' ? serverMsg : 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  }

  return (
    <footer className="bg-sidebar text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-14 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center cursor-pointer">
              <BNWordmarkLight height={28} />
            </Link>
            <p className="mt-4 text-sm text-white/60 leading-relaxed max-w-sm">
              The operating system for UK contractors. Run your procurement, commercial, compliance and field operations
              from one clear, real-time workspace.
            </p>

            <form data-readdy-form onSubmit={handleSubscribe} className="mt-6 max-w-sm" noValidate>
              <label htmlFor="newsletter-email" className="block text-xs font-medium text-white/70 mb-2">
                Get monthly construction management insights
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="newsletter-email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@company.co.uk"
                  className="flex-1 h-11 px-3.5 rounded-lg bg-white/10 border border-white/15 text-sm text-white placeholder:text-white/40 focus:border-primary-400 focus:ring-2 focus:ring-primary-500/30 outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="h-11 px-4 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  {status === 'loading' ? '…' : 'Subscribe'}
                </button>
              </div>

              {/* Anti-spam honeypot */}
              <input type="text" name="company_alt" tabIndex={-1} autoComplete="off" aria-hidden="true" readOnly />

              {status === 'success' && (
                <p className="mt-2 text-xs text-status-green font-medium flex items-center gap-1.5">
                  <i className="ri-checkbox-circle-line"></i> You&apos;re subscribed.
                </p>
              )}
              {status === 'error' && (
                <p className="mt-2 text-xs text-status-red font-medium flex items-center gap-1.5">
                  <i className="ri-error-warning-line"></i> {errorMsg}
                </p>
              )}
            </form>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href === '#' ? (
                      <a
                        href="#"
                        className="text-sm text-white/60 hover:text-white transition-colors whitespace-nowrap"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-sm text-white/60 hover:text-white transition-colors whitespace-nowrap"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/50">© 2026 BuildNerve Ltd. All rights reserved.</p>
          <div className="flex items-center gap-3">
            {['ri-linkedin-fill', 'ri-twitter-x-line', 'ri-youtube-line'].map((icon) => (
              <a
                key={icon}
                href="#"
                aria-label="Social link"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                <i className={`${icon} text-sm`}></i>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}