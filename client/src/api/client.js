import axios from 'axios';
import { clearToken, getToken } from '../utils/tokenStore.js';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const http = axios.create({
  baseURL,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLogin = error.config?.url?.includes('/auth/login');
    if (status === 401 && !isLogin) {
      clearToken();
      window.dispatchEvent(new CustomEvent('eitams:unauthorized'));
    }
    return Promise.reject(error);
  },
);

/**
 * Unwrap the API's `{ success, data }` envelope. List endpoints return
 * `{ items, meta }` inside `data`; detail endpoints return the entity.
 */
export async function request(config) {
  const response = await http.request(config);
  return response.data?.data;
}

export function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}
