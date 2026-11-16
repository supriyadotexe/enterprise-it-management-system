import { Link, useLocation } from 'react-router-dom';
import { resolveBreadcrumb } from '../../router/routeMeta.js';

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const trail = resolveBreadcrumb(pathname);

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 overflow-hidden text-xs text-slate-400">
        {trail.map((item, index) => {
          const last = index === trail.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && (
                <span className="shrink-0 text-slate-300" aria-hidden="true">
                  /
                </span>
              )}
              {item.to && !last ? (
                <Link
                  to={item.to}
                  className="truncate rounded transition hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={`truncate ${last ? 'font-medium text-slate-600' : ''}`} aria-current={last ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
