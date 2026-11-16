import { compactParams, request } from './client.js';

export const employeesApi = {
  list: (params = {}) =>
    request({ method: 'get', url: '/employees', params: compactParams(params) }),
  create: (payload) => request({ method: 'post', url: '/employees', data: payload }),
  get: (id) => request({ method: 'get', url: `/employees/${id}` }),
  update: (id, payload) =>
    request({ method: 'patch', url: `/employees/${id}`, data: payload }),
  setStatus: (id, isActive) =>
    request({ method: 'patch', url: `/employees/${id}/status`, data: { is_active: isActive } }),
  assets: (id, params = {}) =>
    request({ method: 'get', url: `/employees/${id}/assets`, params: compactParams(params) }),
  requests: (id, params = {}) =>
    request({ method: 'get', url: `/employees/${id}/requests`, params: compactParams(params) }),
};
