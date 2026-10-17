import { createContext, useContext } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  exiting?: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}


export { ToastProvider } from './ToastProvider';
