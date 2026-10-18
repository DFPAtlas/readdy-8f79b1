export interface PortalProject {
    id: string;
    reference: string;
    project_name: string;
    status?: string;
    progress?: number;
    proposed_start_date?: string | null;
    target_completion_date?: string | null;
    short_description?: string | null;
}
export interface PortalEvent {
    id: string;
    job_id: string;
    title: string;
    event_date: string;
    event_type: string;
    event_time: string | null;
    location: string | null;
}
export interface PortalVariation {
    id: string;
    job_id: string;
    reference: string;
    title: string;
    description: string | null;
    included_work: string | null;
    excluded_work: string | null;
    assumptions: string | null;
    client_price_pence: number;
    vat_pence: number;
    total_pence: number;
    programme_days: number | null;
    revised_completion: string | null;
    approval_deadline: string | null;
    status: string;
    current_version: number;
}
export interface PortalPayment {
    id: string;
    job_id: string;
    reference: string;
    application_date: string;
    valuation_pence: number;
    previous_certified_pence: number;
    amount_due_pence: number;
    retention_pence: number;
    status: string;
}
export interface PortalOverview {
    client_name: string;
    currency: string;
    expires_at: string;
    permissions: {
        progress: boolean;
        schedule: boolean;
        variations: boolean;
        financials: boolean;
    };
    projects: PortalProject[];
    events: PortalEvent[];
    variations: PortalVariation[];
    payments: PortalPayment[];
}
export async function getClientPortal(token: string, signal?: AbortSignal): Promise<PortalOverview> {
    const url = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
    const key = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key)
        throw new Error('Portal service is unavailable. Please try again later.');
    const response = await fetch(`${url}/functions/v1/get-portal-schedule`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key }, body: JSON.stringify({ token }), signal, cache: 'no-store', referrerPolicy: 'no-referrer' });
    if (!response.ok)
        throw new Error(response.status === 400 || response.status === 403 ? 'This link is invalid, expired, revoked or has no viewing permissions. Contact your contractor.' : 'Could not load your project. Please try again.');
    const data = await response.json();
    if (!data || !Array.isArray(data.projects) || !Array.isArray(data.events) || !Array.isArray(data.variations) || !Array.isArray(data.payments) || !data.permissions)
        throw new Error('Could not load your project. Please try again.');
    return data;
}
