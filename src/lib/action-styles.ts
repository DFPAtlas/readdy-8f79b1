// Shared visual hierarchy for the daily-log and client portal journeys.
const base = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none disabled:hover:bg-slate-100 disabled:hover:border-slate-300';
export const dailyLogPrimaryAction = `${base} border-primary-500 bg-primary-500 text-white hover:border-primary-600 hover:bg-primary-600`;
export const dailyLogSecondaryAction = `${base} border-slate-500 bg-white text-slate-800 hover:border-primary-600 hover:bg-primary-50`;
export const dailyLogCautionAction = `${base} border-red-700 bg-white text-red-700 hover:bg-red-50`;
