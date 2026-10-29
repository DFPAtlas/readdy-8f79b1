export interface PortalProject {
    id: string;
    reference: string;
    project_name: string;
    project_manager_name?: string | null;
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
    currency: string;
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
    updated_at: string;
}
export interface PortalPayment {
    currency: string;
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
export interface PortalDocument {
    id: string;
    job_id: string;
    name: string;
    filename: string;
    mime_type: string;
    version: number;
    uploaded_at: string;
}
export interface PortalPhoto {
    id: string;
    job_id: string;
    caption: string | null;
    filename: string;
    captured_at: string | null;
}
export interface PortalMessage {
    id: string;
    job_id: string;
    body: string;
    sender_type: string;
    created_at: string;
}
export interface PortalResponse {
    reviewed_snapshot: Record<string, unknown>;
    id: string;
    variation_id: string;
    version: number;
    type: string;
    name: string;
    message: string | null;
    created_at: string;
}
export interface PortalDailySummary { id: string; job_id: string; log_date: string; summary: string; revision: number; published_at: string }
export interface PortalOverview {
    daily_summaries: PortalDailySummary[];
    daily_summary_total: number;
    can_respond: boolean;
    can_message: boolean;
    documents: PortalDocument[];
    photos: PortalPhoto[];
    messages: PortalMessage[];
    responses: PortalResponse[];
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
    if (!data || !Array.isArray(data.daily_summaries) || !Number.isSafeInteger(data.daily_summary_total) || data.daily_summary_total < 0 || !Array.isArray(data.projects) || !Array.isArray(data.events) || !Array.isArray(data.variations) || !Array.isArray(data.payments) || !Array.isArray(data.documents) || !Array.isArray(data.photos) || !Array.isArray(data.messages) || !Array.isArray(data.responses) || typeof data.can_respond !== 'boolean' || typeof data.can_message !== 'boolean' || !data.permissions)
        throw new Error('Could not load your project. Please try again.');
    return data;
}
export async function portalAction(token: string, body: Record<string, unknown>): Promise<{
    id?: string;
    url?: string;
}> {
    const url = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
    const key = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key)
        throw new Error('Portal service unavailable.');
    const response = await fetch(`${url}/functions/v1/get-portal-schedule`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key }, body: JSON.stringify({ ...body, token }), cache: 'no-store', referrerPolicy: 'no-referrer' });
    const data = await response.json().catch(() => null);
    if (!response.ok)
        throw new Error(data?.error ?? 'Could not complete this action.');
    if (!data?.id && !data?.url)
        throw new Error('The server did not confirm this action.');
    return data;
}
