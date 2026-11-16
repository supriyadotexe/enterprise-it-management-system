import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { navigationForRole } from '../router/navigation.js';
import { ROLE_LABELS } from '../utils/constants.js';
import Brand from '../components/layout/Brand.jsx';
import Breadcrumbs from '../components/layout/Breadcrumbs.jsx';
import NavIcon from '../components/layout/NavIcon.jsx';
import UserMenu from '../components/layout/UserMenu.jsx';
import PageErrorBoundary from '../components/layout/PageErrorBoundary.jsx';

export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [drawerPath, setDrawerPath] = useState(null);
  const drawerOpen = drawerPath === location.pathname;
  const navigation = useMemo(() => navigationForRole(user?.role), [user?.role]);

  const allItems = useMemo(() => navigation.flatMap((group) => group.items), [navigation]);
  const activeTo = useMemo(() => {
    const candidates = allItems
      .filter(
        (item) =>
          location.pathname === item.to ||
          (item.to !== '/me/requests' && location.pathname.startsWith(`${item.to}/`)) ||
          (item.to === '/me/requests' && location.pathname === '/me/requests/new'),
      )
      .sort((a, b) => b.to.length - a.to.length);
    return candidates[0]?.to;
  }, [allItems, location.pathname]);

  return (
    <div className="min-h-screen bg-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-blue-700 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>

      {drawerOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setDrawerPath(null)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-slate-800 bg-[#101C32] transition-transform duration-200 lg:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Primary navigation"
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
          <Brand />
          <button
            type="button"
            onClick={() => setDrawerPath(null)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Close navigation"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navigation.map((group) => (
            <div key={group.section} className="mb-5">
              <p className="px-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {group.section}
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {group.items.map((item) => {
                  const active = item.to === activeTo;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                          active
                            ? 'bg-blue-600 font-semibold text-white'
                            : 'font-medium text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span className={active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}>
                          <NavIcon name={item.icon} />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <NavLink
            to="/profile"
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
              location.pathname === '/profile'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <NavIcon name="profile" className="h-[18px] w-[18px] text-slate-400" />
            My profile
          </NavLink>
          <p className="mt-2 px-2.5 text-[10px] leading-4 text-slate-400">
            EITAMS academic prototype · v0.1.0
          </p>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerPath(location.pathname)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 lg:hidden"
            aria-label="Open navigation"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <Breadcrumbs />
          </div>
          <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 sm:inline-flex">
            {ROLE_LABELS[user?.role] ?? user?.role}
          </span>
          <UserMenu />
        </header>

        <main id="main-content" className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          <PageErrorBoundary key={location.pathname}>
            <Outlet />
          </PageErrorBoundary>
        </main>
      </div>
    </div>
  );
}
