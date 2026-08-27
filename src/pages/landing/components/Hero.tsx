import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-sidebar">
      {/* Background image + dark overlay */}
      <div className="absolute inset-0">
        <img
          src="https://readdy.ai/api/search-image?query=Abstract%20geometric%20construction%20site%20illustration%20overlapping%20steel%20beams%20scaffolding%20and%20crane%20silhouettes%20deep%20slate%20and%20emerald%20teal%20gradient%20subtle%20blueprint%20grid%20lines%20topographic%20contours%20soft%20ambient%20light%20premium%20enterprise%20software%20aesthetic%20clean%20minimal%20vector%20composition%20generous%20negative%20space%20amber%20accent%20highlights&width=1600&height=1000&seq=landing-hero-01&orientation=landscape"
          alt="Abstract construction operations illustration"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-sidebar/90 via-sidebar/70 to-sidebar/95"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 pt-32 md:pt-40 pb-16 md:pb-24 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-medium">
            <i className="ri-check-double-line"></i>
            Built for UK contractors &amp; commercial teams
          </span>

          <h1 className="mt-6 text-4xl md:text-6xl font-bold text-white tracking-tight font-display leading-[1.05]">
            Run your entire contracting business from one command centre
          </h1>

          <p className="mt-6 text-base md:text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">
            BuildNerve brings your projects, procurement, valuations, variations, retention, CIS compliance, workforce
            and field operations into one real-time workspace — so every job stays connected, controlled and fully
            accounted for.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/sign-up"
              className="w-full sm:w-auto px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Start free trial
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Book a demo
            </a>
          </div>

          <p className="mt-6 text-xs text-white/60 flex items-center justify-center gap-2 flex-wrap">
            <span className="flex items-center gap-0.5">
              <i className="ri-star-fill text-amber-400"></i>
              <i className="ri-star-fill text-amber-400"></i>
              <i className="ri-star-fill text-amber-400"></i>
              <i className="ri-star-fill text-amber-400"></i>
              <i className="ri-star-fill text-amber-400"></i>
            </span>
            4.8/5 from 500+ UK contractors · No credit card required
          </p>
        </div>

        {/* Product preview mockup */}
        <div className="mt-14 md:mt-20 max-w-4xl mx-auto text-left">
          <div className="bg-white rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-page">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-status-red/70"></span>
                <span className="w-3 h-3 rounded-full bg-status-amber/70"></span>
                <span className="w-3 h-3 rounded-full bg-status-green/70"></span>
              </div>
              <span className="text-xs text-muted font-medium">Oakridge Phase 2 — Commercial Dashboard</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-green-pale text-status-green font-semibold whitespace-nowrap">
                Synced
              </span>
            </div>

            <div className="p-5 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted font-medium">Active portfolio value</p>
                  <p className="mt-1 text-xl font-bold text-main">£4.28M</p>
                  <p className="text-xs text-status-green font-medium mt-1">
                    <i className="ri-arrow-up-line"></i> +8.2% vs Q2
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted font-medium">Gross margin</p>
                  <p className="mt-1 text-xl font-bold text-main">18.4%</p>
                  <p className="text-xs text-status-green font-medium mt-1">On budget</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted font-medium">Completion</p>
                  <p className="mt-1 text-xl font-bold text-main">64%</p>
                  <div className="mt-2 h-1.5 bg-page rounded-full overflow-hidden">
                    <div className="h-full w-[64%] bg-primary-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="md:col-span-3 rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-main">Cash flow forecast</p>
                    <span className="text-[10px] text-muted">Next 12 weeks</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-24 mt-3">
                    {[42, 55, 38, 70, 60, 78, 52, 66, 82, 58, 72, 88].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-primary-500/70" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2 rounded-xl border border-border p-4">
                  <p className="text-xs font-semibold text-main">Action needed</p>
                  <ul className="mt-3 space-y-2">
                    <li className="flex items-center gap-2 text-xs text-muted">
                      <span className="w-2 h-2 rounded-full bg-status-red flex-shrink-0"></span>
                      Pay-less deadline · 36h
                    </li>
                    <li className="flex items-center gap-2 text-xs text-muted">
                      <span className="w-2 h-2 rounded-full bg-status-amber flex-shrink-0"></span>
                      VO-007 sign-off · +£12.4k
                    </li>
                    <li className="flex items-center gap-2 text-xs text-muted">
                      <span className="w-2 h-2 rounded-full bg-status-purple flex-shrink-0"></span>
                      UTR verification pending
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}