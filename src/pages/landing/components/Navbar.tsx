import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BNWordmarkLight, BNWordmarkDark } from '@/components/base/BuildNerveLogo';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#workflow' },
  { label: 'Product', href: '#product' },
  { label: 'Customers', href: '#customers' },
  { label: 'Pricing', href: '/pricing' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white border-b border-border' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center cursor-pointer" onClick={() => setOpen(false)}>
          {scrolled ? (
            <BNWordmarkDark height={30} />
          ) : (
            <BNWordmarkLight height={30} />
          )}
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((l) =>
            l.href.startsWith('#') ? (
              <a
                key={l.href}
                href={l.href}
                className={`text-sm font-medium whitespace-nowrap transition-colors ${
                  scrolled ? 'text-main hover:text-primary-500' : 'text-white/80 hover:text-white'
                }`}
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.href}
                to={l.href}
                className={`text-sm font-medium whitespace-nowrap transition-colors ${
                  scrolled ? 'text-main hover:text-primary-500' : 'text-white/80 hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            )
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/sign-in"
            className={`text-sm font-medium whitespace-nowrap transition-colors ${scrolled ? 'text-main hover:text-primary-500' : 'text-white/80 hover:text-white'}`}
          >
            Sign in
          </Link>
          <Link
            to="/sign-up"
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            Start free trial
          </Link>
        </div>

        <button
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <i className={`text-xl ${scrolled ? 'text-main' : 'text-white'} ${open ? 'ri-close-line' : 'ri-menu-line'}`}></i>
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-b border-border px-4 pb-4">
          <div className="flex flex-col gap-1 pt-2">
            {navLinks.map((l) =>
              l.href.startsWith('#') ? (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 text-sm font-medium text-main hover:bg-page rounded-lg whitespace-nowrap"
                >
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.href}
                  to={l.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 text-sm font-medium text-main hover:bg-page rounded-lg whitespace-nowrap"
                >
                  {l.label}
                </Link>
              )
            )}
            <Link
              to="/sign-in"
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 text-sm font-medium text-main hover:bg-page rounded-lg whitespace-nowrap"
            >
              Sign in
            </Link>
            <Link
              to="/sign-up"
              onClick={() => setOpen(false)}
              className="mt-1 px-4 py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-lg text-center whitespace-nowrap"
            >
              Start free trial
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}