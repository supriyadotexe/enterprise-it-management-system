import { compactParams, request } from './client.js';

export const maintenanceApi = {
  list: (params = {}) =>
    request({ method: 'get', url: '/maintenance', params: compactParams(params) }),
  create: (payload) => request({ method: 'post', url: '/maintenance', data: payload }),
  get: (id) => request({ method: 'get', url: `/maintenance/${id}` }),
  start: (id, payload = {}) =>
    request({ method: 'patch', url: `/maintenance/${id}/start`, data: payload }),
  complete: (id, payload) =>
    request({ method: 'patch', url: `/maintenance/${id}/complete`, data: payload }),
  cancel: (id, payload = {}) =>
    request({ method: 'patch', url: `/maintenance/${id}/cancel`, data: payload }),
};
