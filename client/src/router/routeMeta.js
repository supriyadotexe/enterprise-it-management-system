export const HOME_BY_ROLE = {
  admin: '/admin/dashboard',
  employee: '/me/dashboard',
  technician: '/tech/dashboard',
};

export function homeForRole(role) {
  return HOME_BY_ROLE[role] ?? '/login';
}

export const ROUTE_META = [
  {
    pattern: '/admin/dashboard',
    trail: [{ label: 'Administration' }, { label: 'Dashboard' }],
  },
  {
    pattern: '/admin/assets',
    trail: [{ label: 'Administration' }, { label: 'Assets', to: '/admin/assets' }],
  },
  {
    pattern: '/admin/assets/:id',
    trail: [
      { label: 'Administration' },
      { label: 'Assets', to: '/admin/assets' },
      { label: 'Asset details' },
    ],
  },
  {
    pattern: '/admin/assignments',
    trail: [{ label: 'Administration' }, { label: 'Allocations' }],
  },
  {
    pattern: '/admin/requests',
    trail: [{ label: 'Administration' }, { label: 'Service requests', to: '/admin/requests' }],
  },
  {
    pattern: '/admin/requests/:id',
    trail: [
      { label: 'Administration' },
      { label: 'Service requests', to: '/admin/requests' },
      { label: 'Request details' },
    ],
  },
  {
    pattern: '/admin/maintenance',
    trail: [{ label: 'Administration' }, { label: 'Maintenance', to: '/admin/maintenance' }],
  },
  {
    pattern: '/admin/maintenance/:id',
    trail: [
      { label: 'Administration' },
      { label: 'Maintenance', to: '/admin/maintenance' },
      { label: 'Maintenance details' },
    ],
  },
  {
    pattern: '/admin/employees',
    trail: [{ label: 'Organisation' }, { label: 'Employees', to: '/admin/employees' }],
  },
  {
    pattern: '/admin/employees/:id',
    trail: [
      { label: 'Organisation' },
      { label: 'Employees', to: '/admin/employees' },
      { label: 'Employee details' },
    ],
  },
  {
    pattern: '/admin/users',
    trail: [{ label: 'Organisation' }, { label: 'Users & technicians' }],
  },
  {
    pattern: '/admin/departments',
    trail: [{ label: 'Organisation' }, { label: 'Departments' }],
  },
  {
    pattern: '/admin/categories',
    trail: [{ label: 'Organisation' }, { label: 'Categories' }],
  },
  {
    pattern: '/admin/reports',
    trail: [{ label: 'Insights' }, { label: 'Reports' }],
  },
  {
    pattern: '/me/dashboard',
    trail: [{ label: 'My workspace' }, { label: 'Dashboard' }],
  },
  {
    pattern: '/me/assets',
    trail: [{ label: 'My workspace' }, { label: 'My assets' }],
  },
  {
    pattern: '/me/assets/:id',
    trail: [
      { label: 'My workspace' },
      { label: 'My assets', to: '/me/assets' },
      { label: 'Asset details' },
    ],
  },
  {
    pattern: '/me/requests',
    trail: [{ label: 'My workspace' }, { label: 'My requests', to: '/me/requests' }],
  },
  {
    pattern: '/me/requests/new',
    trail: [
      { label: 'My workspace' },
      { label: 'My requests', to: '/me/requests' },
      { label: 'New request' },
    ],
  },
  {
    pattern: '/me/requests/:id',
    trail: [
      { label: 'My workspace' },
      { label: 'My requests', to: '/me/requests' },
      { label: 'Request details' },
    ],
  },
  {
    pattern: '/tech/dashboard',
    trail: [{ label: 'Technician workspace' }, { label: 'Dashboard' }],
  },
  {
    pattern: '/tech/requests',
    trail: [
      { label: 'Technician workspace' },
      { label: 'Assigned requests', to: '/tech/requests' },
    ],
  },
  {
    pattern: '/tech/requests/:id',
    trail: [
      { label: 'Technician workspace' },
      { label: 'Assigned requests', to: '/tech/requests' },
      { label: 'Request details' },
    ],
  },
  {
    pattern: '/tech/assets',
    trail: [{ label: 'Technician workspace' }, { label: 'Assets', to: '/tech/assets' }],
  },
  {
    pattern: '/tech/assets/:id',
    trail: [
      { label: 'Technician workspace' },
      { label: 'Assets', to: '/tech/assets' },
      { label: 'Asset details' },
    ],
  },
  {
    pattern: '/tech/maintenance',
    trail: [
      { label: 'Technician workspace' },
      { label: 'Maintenance', to: '/tech/maintenance' },
    ],
  },
  {
    pattern: '/tech/maintenance/:id',
    trail: [
      { label: 'Technician workspace' },
      { label: 'Maintenance', to: '/tech/maintenance' },
      { label: 'Maintenance details' },
    ],
  },
  { pattern: '/profile', trail: [{ label: 'Account' }, { label: 'Profile' }] },
  {
    pattern: '/change-password',
    trail: [{ label: 'Account' }, { label: 'Change password' }],
  },
  { pattern: '/403', trail: [{ label: 'Access' }, { label: 'Forbidden' }] },
];

function matches(pattern, segments) {
  const patternSegments = pattern.split('/').filter(Boolean);
  if (patternSegments.length !== segments.length) return false;
  return patternSegments.every(
    (part, index) => part.startsWith(':') || part === segments[index],
  );
}

export function resolveBreadcrumb(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  const match = ROUTE_META.find((entry) => matches(entry.pattern, segments));
  return match?.trail ?? [{ label: 'EITAMS' }];
}
