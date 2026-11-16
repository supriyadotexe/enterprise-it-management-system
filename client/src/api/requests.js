import { compactParams, request } from './client.js';

export const requestsApi = {
  list: (params = {}) =>
    request({ method: 'get', url: '/requests', params: compactParams(params) }),
  create: (payload) => request({ method: 'post', url: '/requests', data: payload }),
  get: (id) => request({ method: 'get', url: `/requests/${id}` }),
  update: (id, payload) => request({ method: 'patch', url: `/requests/${id}`, data: payload }),
  assign: (id, payload) =>
    request({ method: 'post', url: `/requests/${id}/assign`, data: payload }),
  transition: (id, payload) =>
    request({ method: 'patch', url: `/requests/${id}/status`, data: payload }),
  history: (id) => request({ method: 'get', url: `/requests/${id}/history` }),
};
