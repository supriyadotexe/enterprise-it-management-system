import Button from './Button.jsx';

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500" role="status">
      <span
        className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700"
        aria-hidden="true"
      />
      {label}
    </div>
  );
}

export function InlineLoader({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-slate-500" role="status">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700"
        aria-hidden="true"
      />
      {label}
    </div>
  );
}

export function EmptyState({ title, description, action, icon = 'inbox' }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-400">
        {icon === 'search' ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" />
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
            <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.7" />
            <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Unable to load this page', message, onRetry }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-white px-6 py-10 text-center shadow-sm">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-600">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M12 8v5m0 3.5v.5M10.3 4.9 3.4 17a2 2 0 0 0 1.7 3h13.8a2 2 0 0 0 1.7-3L13.7 4.9a2 2 0 0 0-3.4 0Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h2 className="mt-4 text-sm font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500">
        {message ?? 'An unexpected error occurred.'}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function InlineAlert({ tone = 'info', title, children }) {
  const tones = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'note'} className={`rounded-lg border px-3.5 py-3 text-sm leading-6 ${tones[tone] ?? tones.info}`}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="animate-pulse divide-y divide-slate-100" aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-6 px-5 py-4">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <div
              key={columnIndex}
              className="h-3 flex-1 rounded bg-slate-100"
              style={{ maxWidth: columnIndex === 0 ? '28%' : '20%' }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
