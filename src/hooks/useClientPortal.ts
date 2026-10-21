import { useEffect, useState } from 'react';
import { getClientPortal, type PortalOverview } from '@/services/client-portal.service';
export function useClientPortal(token: string | undefined) {
    const [state, setState] = useState<{
        token?: string;
        data: PortalOverview | null;
        error: string;
        loading: boolean;
    }>({ data: null, error: '', loading: true });
    const [retry, setRetry] = useState(0);
    useEffect(() => { const controller = new AbortController(); setState({ token, data: null, error: '', loading: true }); if (!token) {
        setState({ token, data: null, error: 'Invalid project link.', loading: false });
        return;
    } getClientPortal(token, controller.signal).then(data => { if (!controller.signal.aborted)
        setState({ token, data, error: '', loading: false }); }).catch(reason => { if (!controller.signal.aborted)
        setState({ token, data: null, error: reason instanceof Error ? reason.message : 'Could not load your project.', loading: false }); }); return () => controller.abort(); }, [token, retry]);
    useEffect(() => {
        if (state.token !== token || !state.data) return;
        const expiresAt = Date.parse(state.data.expires_at);
        let timer: ReturnType<typeof setTimeout>;
        const checkExpiry = () => {
            const remaining = expiresAt - Date.now();
            if (!Number.isFinite(remaining) || remaining <= 0) {
                setState({ token, data: null, loading: false, error: 'This project link has expired. Contact your contractor for a new link.' });
                return;
            }
            clearTimeout(timer);
            timer = setTimeout(checkExpiry, Math.min(remaining, 2147483647));
        };
        checkExpiry();
        window.addEventListener('focus', checkExpiry);
        document.addEventListener('visibilitychange', checkExpiry);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('focus', checkExpiry);
            document.removeEventListener('visibilitychange', checkExpiry);
        };
    }, [state.token, state.data, token]);
    return { ...(state.token === token ? state : { data: null, error: '', loading: true }), reload: () => setRetry(v => v + 1) };
}
