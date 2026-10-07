interface WidgetErrorProps {
  message?: string | null;
  onRetry: () => void;
}

/** Small error state with a retry button, shown inside a single widget. */
export function WidgetError({ message, onRetry }: WidgetErrorProps) {
  return (
    <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-status-red-pale text-status-red flex items-center justify-center">
        <i className="ri-error-warning-line text-2xl"></i>
      </div>
      <p className="text-sm text-muted max-w-xs">
        {message || 'We could not load this widget right now.'}
      </p>
      <button
        onClick={onRetry}
        className="h-9 px-4 bg-white border border-border text-main text-sm font-semibold rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
      >
        <i className="ri-refresh-line text-sm"></i>
        Try again
      </button>
    </div>
  );
}

interface WidgetLoadingProps {
  rows?: number;
}

/** Skeleton loading state sized to roughly match the widget it replaces. */
export function WidgetLoading({ rows = 3 }: WidgetLoadingProps) {
  return (
    <div className="p-4 space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-page rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

interface WidgetEmptyProps {
  icon: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Friendly empty state — a short line of text plus an optional action. */
export function WidgetEmpty({ icon, text, actionLabel, onAction }: WidgetEmptyProps) {
  return (
    <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-page text-muted flex items-center justify-center">
        <i className={`${icon} text-2xl`}></i>
      </div>
      <p className="text-sm text-muted max-w-[18rem] leading-relaxed">{text}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="h-9 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}