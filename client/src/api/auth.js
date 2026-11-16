import { request } from './client.js';

export const authApi = {
  login: (credentials) =>
    request({ method: 'post', url: '/auth/login', data: credentials }),
  me: () => request({ method: 'get', url: '/auth/me' }),
  changePassword: (payload) =>
    request({ method: 'patch', url: '/auth/password', data: payload }),
  logout: () => request({ method: 'post', url: '/auth/logout' }),
};
