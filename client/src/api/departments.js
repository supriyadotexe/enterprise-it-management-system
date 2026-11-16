import { compactParams, request } from './client.js';

export const departmentsApi = {
  list: (params = {}) =>
    request({ method: 'get', url: '/departments', params: compactParams(params) }),
  create: (payload) => request({ method: 'post', url: '/departments', data: payload }),
  update: (id, payload) =>
    request({ method: 'patch', url: `/departments/${id}`, data: payload }),
  setStatus: (id, isActive) =>
    request({ method: 'patch', url: `/departments/${id}/status`, data: { is_active: isActive } }),
};
