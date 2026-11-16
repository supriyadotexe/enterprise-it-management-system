import { useId } from 'react';

export function Field({ label, htmlFor, error, hint, required = false, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-slate-700">
          {label}
          {required && (
            <span className="ml-0.5 text-rose-600" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-rose-600" id={htmlFor ? `${htmlFor}-error` : undefined}>
          {error}
        </p>
      ) : (
        hint && (
          <p className="mt-1.5 text-xs leading-5 text-slate-500" id={htmlFor ? `${htmlFor}-hint` : undefined}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

const CONTROL =
  'block w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
const NORMAL = 'border-slate-300 focus:border-blue-500 focus:ring-blue-100';
const INVALID = 'border-rose-400 focus:border-rose-500 focus:ring-rose-100';

export function Input({ error, className = '', id, ...props }) {
  const generated = useId();
  const controlId = id ?? generated;
  return (
    <input
      id={controlId}
      className={`${CONTROL} h-9 ${error ? INVALID : NORMAL} ${className}`}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${controlId}-error` : undefined}
      {...props}
    />
  );
}

export function Select({ error, className = '', id, children, ...props }) {
  const generated = useId();
  const controlId = id ?? generated;
  return (
    <select
      id={controlId}
      className={`${CONTROL} h-9 ${error ? INVALID : NORMAL} ${className}`}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${controlId}-error` : undefined}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ error, className = '', id, rows = 3, ...props }) {
  const generated = useId();
  const controlId = id ?? generated;
  return (
    <textarea
      id={controlId}
      rows={rows}
      className={`${CONTROL} py-2 ${error ? INVALID : NORMAL} ${className}`}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? `${controlId}-error` : undefined}
      {...props}
    />
  );
}

export function Checkbox({ label, description, className = '', id, ...props }) {
  const generated = useId();
  const controlId = id ?? generated;
  return (
    <div className={`flex items-start gap-2.5 ${className}`}>
      <input
        id={controlId}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
        {...props}
      />
      <div>
        <label htmlFor={controlId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>}
      </div>
    </div>
  );
}

export function FormActions({ children }) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
      {children}
    </div>
  );
}

export function FormGrid({ children, className = '' }) {
  return <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>{children}</div>;
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800"
    >
      {message}
    </div>
  );
}
