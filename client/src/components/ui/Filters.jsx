export function SearchField({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="m13 13 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

export function FilterBar({ children, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 border-b border-slate-100 px-5 py-3 sm:flex-row sm:flex-wrap sm:items-center ${className}`}>
      {children}
    </div>
  );
}

export function SelectFilter({ value, onChange, options, label, className = '' }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      className={`h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 ${className}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
