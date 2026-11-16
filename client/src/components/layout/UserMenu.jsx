import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../ui/Avatar.jsx';
import Badge from '../ui/Badge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLE_LABELS } from '../../utils/constants.js';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar name={user.full_name} size="sm" />
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-[10rem] truncate text-xs font-semibold text-slate-800">
            {user.full_name}
          </span>
          <span className="block text-[11px] text-slate-500">{ROLE_LABELS[user.role]}</span>
        </span>
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-slate-400" fill="none" aria-hidden="true">
          <path d="m5 8 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
        >
          <div className="border-b border-slate-100 px-3 py-2.5">
            <p className="text-sm font-semibold text-slate-900">{user.full_name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
            <div className="mt-2">
              <Badge tone="indigo">{ROLE_LABELS[user.role] ?? user.role}</Badge>
            </div>
          </div>
          <Link
            to="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Profile
          </Link>
          <Link
            to="/change-password"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Change password
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="mt-1 block w-full rounded-lg border-t border-slate-100 px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
