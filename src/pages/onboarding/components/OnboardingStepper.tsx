interface OnboardingStepperProps {
  current: 1 | 2;
}

const STEPS: { id: 1 | 2; label: string }[] = [
  { id: 1, label: 'Company' },
  { id: 2, label: 'Address & contact' },
];

export default function OnboardingStepper({ current }: OnboardingStepperProps) {
  return (
    <ol className="flex items-center gap-3 mb-6">
      {STEPS.map((step, index) => {
        const done = current > step.id;
        const active = current === step.id;
        return (
          <li key={step.id} className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                done || active
                  ? 'bg-primary-500 text-white'
                  : 'bg-primary-50 text-primary-600 border border-primary-200'
              }`}
            >
              {done ? <i className="ri-check-line" /> : step.id}
            </span>
            <span
              className={`text-xs font-medium whitespace-nowrap ${active || done ? 'text-main' : 'text-muted'}`}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 && <span className="flex-1 h-px bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}