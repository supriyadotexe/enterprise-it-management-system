import { Link } from 'react-router-dom';

export default function Brand({ compact = false }) {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      aria-label="Nexora home"
    >
      <img
        src="/branding/logo.png"
        alt="Nexora logo"
        className="h-8 w-auto shrink-0 object-contain"
      />
      {!compact && (
        <span className="min-w-0">
          <span className="block text-sm font-semibold tracking-tight text-white">Nexora</span>
          <span className="block truncate text-[11px] text-slate-300">
            IT Operations Suite
          </span>
        </span>
      )}
    </Link>
  );
}
