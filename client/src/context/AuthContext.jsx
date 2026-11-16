import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.js';
import { clearToken, getToken, setToken } from '../utils/tokenStore.js';

const AuthContext = createContext(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [state, setState] = useState({
    status: getToken() ? 'loading' : 'anonymous',
    user: null,
    sessionExpired: false,
  });

  useEffect(() => {
    let active = true;
    if (!getToken()) return undefined;

    authApi
      .me()
      .then((user) => {
        if (active) setState({ status: 'authenticated', user, sessionExpired: false });
      })
      .catch(() => {
        if (active) {
          clearToken();
          setState({ status: 'anonymous', user: null, sessionExpired: true });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      setState((current) => {
        if (current.status === 'anonymous' && current.sessionExpired) return current;
        return { status: 'anonymous', user: null, sessionExpired: true };
      });
      navigate('/login', { replace: true, state: { sessionExpired: true } });
    }

    window.addEventListener('eitams:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('eitams:unauthorized', handleUnauthorized);
  }, [navigate]);

  const login = useCallback(async (credentials) => {
    const result = await authApi.login(credentials);
    setToken(result.token);
    setState({ status: 'authenticated', user: result.user, sessionExpired: false });
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // The prototype has no server-side revocation; clearing the local token
      // is the authoritative client action even if the request fails.
    }
    clearToken();
    // Navigate before publishing the anonymous state so a protected route does
    // not briefly redirect to /login with the old path in location state.
    navigate('/login', { replace: true, state: null });
    setState({ status: 'anonymous', user: null, sessionExpired: false });
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    const user = await authApi.me();
    setState((current) => ({ ...current, status: 'authenticated', user }));
    return user;
  }, []);

  const clearSessionExpired = useCallback(() => {
    setState((current) => ({ ...current, sessionExpired: false }));
  }, []);

  const value = useMemo(
    () => ({ ...state, login, logout, refreshUser, clearSessionExpired }),
    [state, login, logout, refreshUser, clearSessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
