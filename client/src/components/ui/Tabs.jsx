export default function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div className={`overflow-x-auto border-b border-slate-200 ${className}`} role="tablist">
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const selected = tab.value === active;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab.value)}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                selected
                  ? 'border-blue-700 text-blue-800'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
