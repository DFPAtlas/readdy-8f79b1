import { useCallback, useEffect, useRef, useState } from 'react';

/** Hide old-scope data immediately, and discard responses after scope changes. */
export function useScopedResource<T>(scope: string | null, load: () => Promise<T>) {
  const loader = useRef(load);
  loader.current = load;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ scope: string | null; attempt: number; data: T | null; error: string | null; loading: boolean }>({ scope: null, attempt: 0, data: null, error: null, loading: false });
  useEffect(() => {
    let active = true;
    setState({ scope, attempt, data: null, error: null, loading: Boolean(scope) });
    if (scope) {
      loader.current().then(data => {
        if (active) setState({ scope, attempt, data, error: null, loading: false });
      }).catch(() => {
        if (active) setState({ scope, attempt, data: null, error: 'Records could not be loaded. Check your connection and access, then try again.', loading: false });
      });
    }
    return () => { active = false; };
  }, [scope, attempt]);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  const current = state.scope === scope && state.attempt === attempt;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: Boolean(scope) && (!current || state.loading),
    retry,
  };
}
