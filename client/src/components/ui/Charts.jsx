export function BarList({ items, valueLabel = 'Total', emptyLabel = 'No data for this view.' }) {
  if (!items?.length) {
    return <p className="py-6 text-center text-sm text-slate-500">{emptyLabel}</p>;
  }
  const max = Math.max(...items.map((item) => Number(item.value) || 0), 1);

  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const value = Number(item.value) || 0;
        const width = Math.max((value / max) * 100, value > 0 ? 3 : 0);
        return (
          <li key={item.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-slate-700">{item.label}</span>
              <span className="shrink-0 font-medium tabular-nums text-slate-900">
                {item.display ?? value}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${item.className ?? 'bg-blue-500'}`}
                style={{ width: `${width}%` }}
                role="img"
                aria-label={`${item.label}: ${item.display ?? value} ${valueLabel}`}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function StackedBar({ segments, emptyLabel = 'No data.' }) {
  const total = segments.reduce((sum, segment) => sum + (Number(segment.value) || 0), 0);
  if (!total) return <p className="py-6 text-center text-sm text-slate-500">{emptyLabel}</p>;

  return (
    <div>
      <div
        className="flex h-3 overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={segments
          .map((segment) => `${segment.label}: ${segment.value}`)
          .join(', ')}
      >
        {segments
          .filter((segment) => Number(segment.value) > 0)
          .map((segment) => (
            <div
              key={segment.label}
              style={{ width: `${(Number(segment.value) / total) * 100}%`, backgroundColor: segment.color }}
              title={`${segment.label}: ${segment.value}`}
            />
          ))}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
        {segments.map((segment) => (
          <li key={segment.label} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: segment.color }}
              aria-hidden="true"
            />
            {segment.label}
            <span className="font-semibold tabular-nums text-slate-800">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DonutChart({ segments, centerValue, centerLabel, size = 176, thickness = 22 }) {
  const total = segments.reduce((sum, segment) => sum + (Number(segment.value) || 0), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <title>Distribution chart</title>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={thickness}
          />
          {total > 0 &&
            segments.map((segment) => {
              const value = Number(segment.value) || 0;
              if (value === 0) return null;
              const length = (value / total) * circumference;
              const dashOffset = -offset;
              offset += length;
              return (
                <circle
                  key={segment.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={dashOffset}
                >
                  <title>{`${segment.label}: ${value}`}</title>
                </circle>
              );
            })}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <p className="text-2xl font-semibold tabular-nums text-slate-900">
            {centerValue ?? total}
          </p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {centerLabel}
          </p>
        </div>
      </div>
      <ul className="grid w-full max-w-xs gap-2 text-xs sm:w-auto">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 text-slate-600">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: segment.color }}
                aria-hidden="true"
              />
              {segment.label}
            </span>
            <span className="font-semibold tabular-nums text-slate-900">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
