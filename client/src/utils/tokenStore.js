/**
 * The approved prototype stores the bearer JWT in localStorage. This keeps the
 * demo simple; the documented trade-off is a higher XSS exposure than an
 * HttpOnly cookie. All rendering goes through React escaping and the app never
 * injects HTML.
 */
const TOKEN_KEY = 'eitams.access_token';

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage can be unavailable in private browsing; the in-memory session
    // still works until the next reload.
  }
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage errors.
  }
}
