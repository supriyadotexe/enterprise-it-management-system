import { request } from './client.js';

export const usersApi = {
  create: (payload) => request({ method: 'post', url: '/users', data: payload }),
  update: (id, payload) => request({ method: 'patch', url: `/users/${id}`, data: payload }),
  resetPassword: (id, password) =>
    request({ method: 'post', url: `/users/${id}/reset-password`, data: { password } }),
};
