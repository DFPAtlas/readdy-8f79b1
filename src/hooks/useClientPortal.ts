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
    return { ...(state.token === token ? state : { data: null, error: '', loading: true }), reload: () => setRetry(v => v + 1) };
}
