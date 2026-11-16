import { useCallback, useMemo, useRef, useState } from 'react';
import { ToastContext } from '../../context/toastContext.js';

const TONES = {
  success: {
    border: 'border-emerald-200',
    icon: 'bg-emerald-100 text-emerald-700',
    title: 'text-emerald-900',
    path: 'M5 10.5 8.5 14 15 6.5',
  },
  error: {
    border: 'border-rose-200',
    icon: 'bg-rose-100 text-rose-700',
    title: 'text-rose-900',
    path: 'M6 6l8 8M14 6l-8 8',
  },
  info: {
    border: 'border-sky-200',
    icon: 'bg-sky-100 text-sky-700',
    title: 'text-sky-900',
    path: 'M10 9v5m0-8v.5',
  },
};

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-3), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), toast.duration ?? 5000);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      push,
      dismiss,
      success: (title, message) => push({ tone: 'success', title, message }),
      error: (title, message) => push({ tone: 'error', title, message }),
      info: (title, message) => push({ tone: 'info', title, message }),
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:items-end print:hidden"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const tone = TONES[toast.tone] ?? TONES.info;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex w-full max-w-sm gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg ${tone.border}`}
              role={toast.tone === 'error' ? 'alert' : 'status'}
            >
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${tone.icon}`}>
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                  <path
                    d={tone.path}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${tone.title}`}>{toast.title}</p>
                {toast.message && (
                  <p className="mt-0.5 text-xs leading-5 text-slate-600">{toast.message}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Dismiss notification"
              >
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                  <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
