import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
  exiting?: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = `toast-${++toastId}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 200);
    }, 2800);
  }, []);

  const bgMap = {
    success: 'bg-primary-500',
    info: 'bg-status-blue',
    warning: 'bg-status-amber',
  };

  const iconMap = {
    success: 'ri-check-line',
    info: 'ri-information-line',
    warning: 'ri-error-warning-line',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto ${toast.exiting ? 'toast-exit' : 'toast-enter'} ${bgMap[toast.type]} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[280px] max-w-[420px]`}
            role="status"
          >
            <div className={`w-8 h-8 flex items-center justify-center rounded-full bg-white/20 flex-shrink-0`}>
              <i className={`${iconMap[toast.type]} text-base`}></i>
            </div>
            <span className="text-sm font-medium flex-1">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}