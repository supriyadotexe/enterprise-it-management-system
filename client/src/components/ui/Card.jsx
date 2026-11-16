export default function Card({ children, className = '', as: Tag = 'section', ...props }) {
  return (
    <Tag
      className={`rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, actions, className = '' }) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 ${className}`}
    >
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}
