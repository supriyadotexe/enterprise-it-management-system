import axios from 'axios';

// Relative URL: Vite proxies /health in development, and the reverse proxy
// serves the API from the same origin in a deployed build.
const http = axios.create({
  timeout: 5_000,
  headers: { Accept: 'application/json' },
});

export async function getHealth(signal) {
  const { data } = await http.get('/health', { signal });
  return data.data;
}
