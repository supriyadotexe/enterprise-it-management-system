export default function NavIcon({ name, className = 'h-[18px] w-[18px]' }) {
  const paths = {
    dashboard: (
      <>
        <path d="M4 4h6v7H4zM14 4h6v4h-6zM14 12h6v8h-6zM4 15h6v5H4z" />
      </>
    ),
    assets: (
      <>
        <path d="M4 7h16v10H4z" />
        <path d="M8 7V5h8v2M9 17v2m6-2v2" />
      </>
    ),
    assignments: (
      <>
        <path d="M9 7h10M9 12h7M9 17h10" />
        <path d="M4 7h1M4 12h1M4 17h1" />
      </>
    ),
    requests: (
      <>
        <path d="M5 4h14v16H5z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    maintenance: (
      <>
        <path d="M14.7 5.3a4 4 0 0 0-5.4 5.4L4 16v4h4l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.7-.3-.3-2.7 2.5-2.5Z" />
      </>
    ),
    employees: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5M17 14a5 5 0 0 1 3.5 6" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 8h5m-2.5-2.5v5" />
      </>
    ),
    departments: (
      <>
        <path d="M4 20V5h10v15M14 9h6v11M8 9h2M8 13h2M8 17h2M17 13h1M17 17h1" />
      </>
    ),
    categories: (
      <>
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
      </>
    ),
    reports: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    logout: (
      <>
        <path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.dashboard}
    </svg>
  );
}
