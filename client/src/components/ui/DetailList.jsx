export default function DetailList({ items, columns = 2, className = '' }) {
  return (
    <dl
      className={`grid gap-x-6 gap-y-4 ${columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'} ${className}`}
    >
      {items.map((item) => (
        <div key={item.label} className={item.full ? 'sm:col-span-2 lg:col-span-3' : ''}>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {item.label}
          </dt>
          <dd className="mt-1 break-words text-sm text-slate-800">{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
