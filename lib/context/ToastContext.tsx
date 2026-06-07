'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
  exiting?: boolean;
}

interface ShowToastOptions {
  variant?: ToastVariant;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, variantOrOptions?: ToastVariant | ShowToastOptions) => void;
}

const MAX_VISIBLE = 3;

const DURATION: Record<ToastVariant, number> = {
  success: 3000,
  error: 5000,
  info: 3000,
  warning: 4000,
};

const STYLES: Record<ToastVariant, string> = {
  success:
    'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
  error:
    'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  info: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
  warning:
    'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200',
};

const ICONS: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState<ToastItem[]>([]);
  const queueRef = useRef<ToastItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const scheduleDismiss = useCallback((item: ToastItem, duration: number) => {
    const t = setTimeout(() => {
      setVisible((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, exiting: true } : x))
      );
      setTimeout(() => {
        setVisible((prev) => prev.filter((x) => x.id !== item.id));
        timersRef.current.delete(item.id);
        const next = queueRef.current.shift();
        if (next) {
          setVisible((prev) => [...prev, next]);
          scheduleDismiss(next, DURATION[next.variant]);
        }
      }, 280);
    }, duration);
    timersRef.current.set(item.id, t);
  }, []);

  const dismiss = useCallback(
    (id: number) => {
      const timer = timersRef.current.get(id);
      if (timer) clearTimeout(timer);
      setVisible((prev) => prev.map((x) => (x.id === id ? { ...x, exiting: true } : x)));
      setTimeout(() => {
        setVisible((prev) => prev.filter((x) => x.id !== id));
        timersRef.current.delete(id);
        const next = queueRef.current.shift();
        if (next) {
          setVisible((prev) => [...prev, next]);
          scheduleDismiss(next, DURATION[next.variant]);
        }
      }, 280);
    },
    [scheduleDismiss]
  );

  const showToast = useCallback(
    (message: string, variantOrOptions: ToastVariant | ShowToastOptions = 'success') => {
      const opts: ShowToastOptions =
        typeof variantOrOptions === 'string' ? { variant: variantOrOptions } : variantOrOptions;
      const variant = opts.variant || 'success';
      const item: ToastItem = {
        id: Date.now() + Math.random(),
        message,
        variant,
        action: opts.action,
      };

      setVisible((current) => {
        if (current.length >= MAX_VISIBLE) {
          queueRef.current.push(item);
          return current;
        }
        scheduleDismiss(item, opts.duration ?? DURATION[variant]);
        return [...current, item];
      });
    },
    [scheduleDismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-20 md:bottom-6 right-4 z-[200] flex flex-col gap-2 max-w-sm pointer-events-none"
        aria-live="polite"
      >
        {visible.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 ease-out ${
              t.exiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100 toast-slide-in'
            } ${STYLES[t.variant]}`}
          >
            <span className="text-base shrink-0 mt-0.5">{ICONS[t.variant]}</span>
            <div className="flex-1 min-w-0">
              <p>{t.message}</p>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                  className="mt-1.5 text-xs font-bold underline hover:no-underline"
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-60 hover:opacity-100 text-xs"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { showToast: (_message: string, _variant?: ToastVariant | ShowToastOptions) => {} };
  }
  return ctx;
}
