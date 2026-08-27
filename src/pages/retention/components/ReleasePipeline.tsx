import { pipelineStages, type PipelineStage } from '@/mocks/retentionLifecycle';

const stateConfig: Record<PipelineStage['state'], { dot: string; ring: string; label: string }> = {
  active: {
    dot: 'bg-status-green text-white',
    ring: 'ring-status-green/30',
    label: 'In progress',
  },
  next: {
    dot: 'bg-status-amber text-white',
    ring: 'ring-status-amber/30',
    label: 'Next',
  },
  upcoming: {
    dot: 'bg-status-purple text-white',
    ring: 'ring-status-purple/30',
    label: 'Scheduled',
  },
};

export default function ReleasePipeline() {
  return (
    <div className="bg-white border border-border rounded-xl p-4 md:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
        <div>
          <h2 className="text-base font-semibold text-main">Two-stage retention release pipeline</h2>
          <p className="text-sm text-muted mt-0.5">
            Retention is withheld at 5%, released 50% at Practical Completion, then the final 50% at end of DLP.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted bg-page rounded-full px-3 py-1 whitespace-nowrap">
          <i className="ri-road-map-line text-sm"></i>
          JCT / NEC two-stage standard
        </span>
      </div>

      <div className="relative">
        {/* Connector line (desktop) */}
        <div className="hidden md:block absolute top-6 left-0 right-0 h-0.5 bg-border" style={{ margin: '0 12.5%' }} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {pipelineStages.map((stage) => {
            const cfg = stateConfig[stage.state];
            return (
              <div key={stage.key} className="relative flex md:flex-col gap-4 md:gap-3 items-start md:items-center text-left md:text-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ring-4 z-10 ${cfg.dot} ${cfg.ring}`}
                >
                  <span className="text-sm font-semibold">{stage.step}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex md:flex-col items-center md:items-center gap-2 md:gap-1">
                    <h3 className="text-sm font-semibold text-main">{stage.title}</h3>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 whitespace-nowrap bg-page text-muted">
                      {stage.badge}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1.5 leading-relaxed">{stage.description}</p>
                  <p className="text-xs font-medium mt-2 uppercase tracking-wide" style={{ color: cfg.dot.includes('green') ? '#3D8B6E' : cfg.dot.includes('amber') ? '#B96C22' : '#7664A8' }}>
                    {cfg.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DLP countdown strip */}
      <div className="mt-5 bg-status-purple-pale border border-status-purple/30 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-status-purple text-white flex items-center justify-center flex-shrink-0">
            <i className="ri-timer-flash-line text-lg"></i>
          </div>
          <div>
            <p className="text-sm font-semibold text-main">Defects Liability Period countdown</p>
            <p className="text-xs text-muted">Final 50% release unlocks automatically when the 12-month DLP expires.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-purple bg-white border border-status-purple/30 rounded-full px-3 py-1.5 whitespace-nowrap">
            <i className="ri-hourglass-line text-sm"></i>
            12-Month DLP Standard
          </span>
        </div>
      </div>
    </div>
  );
}