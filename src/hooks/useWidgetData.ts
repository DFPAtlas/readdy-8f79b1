import { useCallback, useEffect, useState } from 'react';

export interface WidgetData<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Loads data for a single dashboard widget, fully isolated so that a failure
 * in one widget can never break the rest of the page. When no organisation is
 * available the widget simply settles into an empty (non-loading) state.
 *
 * `loader` is intentionally not part of the dependency list — the widget
 * re-fetches when the organisation changes or when `reload()` is called.
 */
export function useWidgetData<T>(
  orgId: string | null,
  loader: (orgId: string) => Promise<T>,
): WidgetData<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;

    if (!orgId) {
      setData(null);
      setLoading(false);
      setError(null);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const result = await loader(orgId);
        if (!active) return;
        setData(result);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'We could not load this widget.');
        setData(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, reload };
}