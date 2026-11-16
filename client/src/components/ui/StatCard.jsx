import { Link } from 'react-router-dom';

export default function StatCard({ label, value, hint, tone = 'indigo', to }) {
  const tones = {
    indigo: 'bg-blue-50 text-blue-800',
    emerald: 'bg-emerald-50 text-emerald-700',
    sky: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <span className={`h-2 w-2 rounded-full ${tones[tone] ?? tones.indigo}`} aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-950">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>}
    </>
  );

  const className =
    'block rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40';

  if (to) {
    return (
      <Link
        to={to}
        className={`${className} transition hover:border-blue-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`}
      >
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
