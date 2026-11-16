import { compactParams, request } from './client.js';

export const assetsApi = {
  list: (params = {}) =>
    request({ method: 'get', url: '/assets', params: compactParams(params) }),
  create: (payload) => request({ method: 'post', url: '/assets', data: payload }),
  get: (id) => request({ method: 'get', url: `/assets/${id}` }),
  update: (id, payload) => request({ method: 'patch', url: `/assets/${id}`, data: payload }),
  retire: (id) => request({ method: 'post', url: `/assets/${id}/retire` }),
  history: (id, params = {}) =>
    request({ method: 'get', url: `/assets/${id}/history`, params: compactParams(params) }),
  maintenance: (id, params = {}) =>
    request({ method: 'get', url: `/assets/${id}/maintenance`, params: compactParams(params) }),
  assign: (id, payload) =>
    request({ method: 'post', url: `/assets/${id}/assign`, data: payload }),
};
