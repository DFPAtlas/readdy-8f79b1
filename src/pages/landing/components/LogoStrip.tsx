const logos = [
  { name: 'Apex Construction', icon: 'ri-building-4-line' },
  { name: 'Meridian Civils', icon: 'ri-road-map-line' },
  { name: 'Oakridge Group', icon: 'ri-home-5-line' },
  { name: 'Vanguard MEP', icon: 'ri-tools-line' },
  { name: 'Harbour & Holt', icon: 'ri-anchor-line' },
  { name: 'Stonebridge Interiors', icon: 'ri-pantone-line' },
];

export default function LogoStrip() {
  return (
    <section className="bg-page border-b border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-14">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Trusted by 500+ UK contractors &amp; commercial teams
        </p>

        <div className="mt-7 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-7 items-center">
          {logos.map((logo) => (
            <div
              key={logo.name}
              className="flex items-center justify-center gap-2 text-muted hover:text-main transition-colors cursor-default select-none"
            >
              <i className={`${logo.icon} text-lg text-muted/70`}></i>
              <span className="font-display font-semibold text-sm md:text-base whitespace-nowrap">
                {logo.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}