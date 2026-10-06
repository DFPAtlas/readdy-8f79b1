import type { ReactNode } from 'react';

interface PanelEmptyProps {
  icon: string;
  title: string;
  description: string;
  children?: ReactNode;
}

export function PanelEmpty({ icon, title, description, children }: PanelEmptyProps) {
  return (
    <div className="bg-white border border-border rounded-2xl p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-page flex items-center justify-center mx-auto mb-3">
        <i className={`${icon} text-2xl text-muted`}></i>
      </div>
      <h4 className="text-sm font-semibold text-main">{title}</h4>
      <p className="text-sm text-muted mt-1 max-w-md mx-auto">{description}</p>
      {children}
    </div>
  );
}

interface PanelUnavailableProps {
  title?: string;
  description: string;
}

export function PanelUnavailable({ title, description }: PanelUnavailableProps) {
  return (
    <div className="bg-background-100 border border-dashed border-border rounded-2xl p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-background-200 flex items-center justify-center mx-auto mb-3">
        <i className="ri-plug-line text-2xl text-muted"></i>
      </div>
      <h4 className="text-sm font-semibold text-main">{title ?? 'Not connected yet'}</h4>
      <p className="text-sm text-muted mt-1 max-w-md mx-auto">{description}</p>
    </div>
  );
}

interface PanelErrorProps {
  description: string;
  retryLabel: string;
  onRetry: () => void;
}

export function PanelError({ description, retryLabel, onRetry }: PanelErrorProps) {
  return (
    <div className="bg-status-red-pale border border-status-red/20 rounded-2xl p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-white/60 flex items-center justify-center mx-auto mb-3">
        <i className="ri-error-warning-line text-xl text-status-red"></i>
      </div>
      <p className="text-sm font-medium text-status-red">{description}</p>
      <button
        className="mt-3 h-9 px-4 border border-status-red/30 text-status-red text-sm font-medium rounded-xl hover:bg-white/60 transition-colors cursor-pointer whitespace-nowrap"
        onClick={onRetry}
      >
        {retryLabel}
      </button>
    </div>
  );
}