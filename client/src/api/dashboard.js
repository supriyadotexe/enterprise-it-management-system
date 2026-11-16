import { compactParams, request } from './client.js';

export const dashboardApi = {
  admin: () => request({ method: 'get', url: '/dashboard/admin' }),
  employee: () => request({ method: 'get', url: '/dashboard/employee' }),
  technician: () => request({ method: 'get', url: '/dashboard/technician' }),
};

export const lookupsApi = {
  get: () => request({ method: 'get', url: '/lookups' }),
};

export const reportsApi = {
  assetsByDepartment: () => request({ method: 'get', url: '/reports/assets-by-department' }),
  technicianWorkload: () => request({ method: 'get', url: '/reports/technician-workload' }),
  maintenanceCost: (params = {}) =>
    request({ method: 'get', url: '/reports/maintenance-cost', params: compactParams(params) }),
  requestSummary: (params = {}) =>
    request({ method: 'get', url: '/reports/request-summary', params: compactParams(params) }),
};
