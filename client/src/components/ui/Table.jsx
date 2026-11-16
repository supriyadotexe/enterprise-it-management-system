import Button from './Button.jsx';

export function TableFrame({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className = '', align = 'left' }) {
  const alignment = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <th
      scope="col"
      className={`whitespace-nowrap bg-slate-50 px-4 py-2.5 ${alignment} text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 align-middle text-slate-600 ${className}`}>{children}</td>;
}

export function Pagination({ meta, onPageChange, className = '' }) {
  if (!meta || meta.total === 0) return null;
  const { page, limit, total, totalPages } = meta;
  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <div
      className={`flex flex-col gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p>
        Showing <span className="font-medium text-slate-700">{first}</span>–
        <span className="font-medium text-slate-700">{last}</span> of{' '}
        <span className="font-medium text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <span className="px-1">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
