export const ADMIN_NAV = [
  {
    section: 'Operations',
    items: [
      { label: 'Dashboard', to: '/admin/dashboard', icon: 'dashboard' },
      { label: 'Assets', to: '/admin/assets', icon: 'assets' },
      { label: 'Allocations', to: '/admin/assignments', icon: 'assignments' },
      { label: 'Service requests', to: '/admin/requests', icon: 'requests' },
      { label: 'Maintenance', to: '/admin/maintenance', icon: 'maintenance' },
    ],
  },
  {
    section: 'Organisation',
    items: [
      { label: 'Employees', to: '/admin/employees', icon: 'employees' },
      { label: 'Users & technicians', to: '/admin/users', icon: 'users' },
      { label: 'Departments', to: '/admin/departments', icon: 'departments' },
      { label: 'Categories', to: '/admin/categories', icon: 'categories' },
    ],
  },
  {
    section: 'Insights',
    items: [{ label: 'Reports', to: '/admin/reports', icon: 'reports' }],
  },
];

export const EMPLOYEE_NAV = [
  {
    section: 'My workspace',
    items: [
      { label: 'Dashboard', to: '/me/dashboard', icon: 'dashboard' },
      { label: 'My assets', to: '/me/assets', icon: 'assets' },
      { label: 'My requests', to: '/me/requests', icon: 'requests' },
      { label: 'Raise a request', to: '/me/requests/new', icon: 'plus' },
    ],
  },
];

export const TECHNICIAN_NAV = [
  {
    section: 'Technician workspace',
    items: [
      { label: 'Dashboard', to: '/tech/dashboard', icon: 'dashboard' },
      { label: 'Assigned requests', to: '/tech/requests', icon: 'requests' },
      { label: 'Assets', to: '/tech/assets', icon: 'assets' },
      { label: 'Maintenance', to: '/tech/maintenance', icon: 'maintenance' },
    ],
  },
];

export function navigationForRole(role) {
  if (role === 'admin') return ADMIN_NAV;
  if (role === 'employee') return EMPLOYEE_NAV;
  if (role === 'technician') return TECHNICIAN_NAV;
  return [];
}
