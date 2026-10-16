export default function CtaSection() {
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
          <h3 className="text-lg font-semibold text-main font-display">Explore the BuildNerve demo</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            We&apos;re preparing a private, sample-data workspace for each visitor. Demo access requests are paused while that secure setup is completed.
          </p>
          <a
            href="mailto:Martin.hewett@digital-footprint.uk?subject=BuildNerve%20guided%20demo"
            className="mt-6 flex w-full h-11 items-center justify-center bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Ask for a guided demo
          </a>
          <p className="mt-3 text-xs text-muted text-center">
            No shared demo login is sent. The private sandbox link will be available once setup is complete.
          </p>
        </div>
      </div>
    </section>
  );
}
