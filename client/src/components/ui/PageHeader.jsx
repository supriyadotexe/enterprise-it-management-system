import { Link } from 'react-router-dom';

export default function PageHeader({ title, description, actions, backTo, backLabel, meta }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {backTo && (
          <Link
            to={backTo}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <span aria-hidden="true">←</span> {backLabel ?? 'Back'}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{title}</h1>
          {meta}
        </div>
        {description && (
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
    </div>
  );
}
