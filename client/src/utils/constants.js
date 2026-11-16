export const ASSET_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'allocated', label: 'Allocated' },
  { value: 'under_maintenance', label: 'Under maintenance' },
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'retired', label: 'Retired' },
];

export const ASSET_CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'damaged', label: 'Damaged' },
];

export const REQUEST_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const REQUEST_PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export const MAINTENANCE_STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const MAINTENANCE_TYPES = [
  { value: 'preventive', label: 'Preventive' },
  { value: 'corrective', label: 'Corrective' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'upgrade', label: 'Upgrade' },
];

export const MAINTENANCE_OUTCOMES = [
  {
    value: 'returned_to_service',
    label: 'Return to service',
    description: 'Returns an allocatable asset to circulation.',
  },
  {
    value: 'held_unavailable',
    label: 'Hold unavailable',
    description: 'Keeps a poor or damaged asset in custody, not allocatable.',
  },
  {
    value: 'retired',
    label: 'Retire asset',
    description: 'Permanently withdraws the asset. The asset must be returned first.',
  },
];

export const ELIGIBLE_CONDITIONS = ['new', 'good', 'fair'];
export const INELIGIBLE_CONDITIONS = ['poor', 'damaged'];

export const ROLE_LABELS = {
  admin: 'Administrator',
  employee: 'Employee',
  technician: 'Technician',
};

export const ROLE_PATHS = {
  admin: {
    dashboard: '/admin/dashboard',
    assets: '/admin/assets',
    assignments: '/admin/assignments',
    requests: '/admin/requests',
    maintenance: '/admin/maintenance',
    employees: '/admin/employees',
    users: '/admin/users',
    departments: '/admin/departments',
    categories: '/admin/categories',
    reports: '/admin/reports',
  },
  employee: {
    dashboard: '/me/dashboard',
    assets: '/me/assets',
    requests: '/me/requests',
    newRequest: '/me/requests/new',
  },
  technician: {
    dashboard: '/tech/dashboard',
    assets: '/tech/assets',
    requests: '/tech/requests',
    maintenance: '/tech/maintenance',
  },
};

export function pathsForRole(role) {
  return ROLE_PATHS[role] ?? ROLE_PATHS.employee;
}

export function labelFor(options, value) {
  return options.find((option) => option.value === value)?.label ?? value ?? '';
}
