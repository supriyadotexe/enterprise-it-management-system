import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorSummary } from '../utils/errors.js';

/**
 * Small data-loading hook. `key` is a stable string representing the request
 * (filters, page, id); changing it reloads. The loader is kept in a ref so
 * callers can pass inline async functions without re-triggering on identity.
 */
export function useApiQuery(loader, key = '', { enabled = true } = {}) {
  const loaderRef = useRef(loader);
  const [state, setState] = useState({ data: null, loading: enabled, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    if (!enabled) {
      const timer = window.setTimeout(
        () => setState({ data: null, loading: false, error: null }),
        0,
      );
      return () => window.clearTimeout(timer);
    }

    let active = true;
    Promise.resolve()
      .then(() => {
        if (!active) return undefined;
        setState((current) => ({ ...current, loading: true, error: null }));
        return loaderRef.current();
      })
      .then((data) => {
        if (active && data !== undefined) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (active) {
          setState({ data: null, loading: false, error: getErrorSummary(error) });
        }
      });

    return () => {
      active = false;
    };
  }, [key, version, enabled]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  return { ...state, reload };
}
