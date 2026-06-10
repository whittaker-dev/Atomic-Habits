'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type ToastVariant = 'error' | 'success' | 'info';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 5000;

const variantClasses: Record<ToastVariant, string> = {
  error: 'border-error/40 text-[var(--color-semantic-error)]',
  success: 'border-primary/40 text-[var(--color-primary)]',
  info: 'border-hairline text-[var(--color-ink)]',
};

function ToastViewport({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 right-6 z-[200] flex w-[min(calc(100vw-2rem),24rem)] flex-col gap-3"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={cn(
            'panel-lift pointer-events-auto rounded-md border bg-surface-2 px-4 py-3',
            'font-sans text-sm leading-normal',
            variantClasses[toast.variant],
          )}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  const idRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const text = message.trim();
    if (!text) return;

    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message: text, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted ? createPortal(<ToastViewport toasts={toasts} />, document.body) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return {
    error: (message: string) => context.showToast(message, 'error'),
    success: (message: string) => context.showToast(message, 'success'),
    info: (message: string) => context.showToast(message, 'info'),
  };
}
