import { compactParams, request } from './client.js';

export const assignmentsApi = {
  list: (params = {}) =>
    request({ method: 'get', url: '/assignments', params: compactParams(params) }),
  return: (id, payload) =>
    request({ method: 'post', url: `/assignments/${id}/return`, data: payload }),
};
