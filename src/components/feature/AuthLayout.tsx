import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-page flex flex-col lg:flex-row">
      {/* Left panel — brand + visual */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] bg-sidebar relative overflow-hidden flex-col justify-between p-10">
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">BN</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-white font-semibold text-base">BuildNerve</span>
              <span className="text-[#9DB5AE] text-xs">Contractor workspace</span>
            </div>
          </Link>
        </div>

        <div className="relative z-10">
          <blockquote className="text-white/80 text-lg leading-relaxed max-w-sm">
            &ldquo;The single source of truth for every UK construction project &mdash; connecting contractors, subcontractors and clients around one trusted record.&rdquo;
          </blockquote>
          <p className="text-[#9DB5AE] text-sm mt-4">Trusted by contractors across the UK</p>
        </div>

        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full border border-white/20" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full border border-white/10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5" />
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 lg:px-10">
        <div className="w-full max-w-[420px]">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">BN</span>
            </div>
            <span className="text-main font-semibold text-lg">BuildNerve</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-main">{title}</h1>
            {subtitle && <p className="text-muted text-sm mt-1.5">{subtitle}</p>}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}