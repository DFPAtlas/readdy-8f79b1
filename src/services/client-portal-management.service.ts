import { getSupabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/supabase';
export type PortalGrant = Pick<Database['public']['Tables']['portal_access']['Row'], 'id' | 'client_id' | 'email' | 'job_scope' | 'permissions' | 'status' | 'expires_at' | 'created_at' | 'revision'>;
export interface InboxMessage {
    id: string;
    conversation_id: string;
    client_id: string;
    job_id: string;
    body: string;
    sender_type: string;
    created_at: string;
}
function client() { const c = getSupabase(); if (!c)
    throw new Error('The backend is unavailable.'); return c; }
export const portalManagement = {
    async documents(org: string) { const { data, error } = await client().from('project_documents').select('id,job_id,name,version,visibility,project:jobs(project_name,reference)').eq('organisation_id', org).is('archived_at', null).order('uploaded_at', { ascending: false }); if (error)
        throw new Error(error.message); return data; },
    async photos(org: string) { const { data, error } = await client().from('evidence_files').select('id,original_filename,visibility,record:evidence_records!inner(id,job_id,caption,review_status,visibility,updated_at,project:jobs(project_name,reference))').eq('organisation_id', org).eq('record.organisation_id', org).eq('record.review_status', 'accepted').is('record.archived_at', null).is('archived_at', null).in('mime_type', ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']); if (error)
        throw new Error(error.message); return data; },
    async getLinks(org: string): Promise<PortalGrant[]> { const { data, error } = await client().from('portal_access').select('id,client_id,email,job_scope,permissions,status,expires_at,created_at,revision').eq('organisation_id', org).eq('access_type', 'client').order('created_at', { ascending: false }); if (error)
        throw new Error(error.message); return data; },
    async inbox(org: string): Promise<InboxMessage[]> { const { data, error } = await client().rpc('client_portal_inbox', { p_org: org }); if (error)
        throw new Error(error.message); if (!Array.isArray(data))
        throw new Error('Could not load messages.'); return data as unknown as InboxMessage[]; },
    async save(org: string, request: string, action: 'create_link' | 'revoke_link' | 'create_client' | 'reply_message' | 'set_document_visibility' | 'set_photo_visibility', data: Json): Promise<string> { const { data: result, error } = await client().rpc('client_portal_manage', { p_org: org, p_request: request, p_action: action, p_data: data }); if (error)
        throw new Error(error.message); if (!result)
        throw new Error('The server did not confirm this change.'); return result; }
};
export function createPortalToken() { const bytes = crypto.getRandomValues(new Uint8Array(32)); return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''); }
export async function hashPortalToken(token: string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))).map(b => b.toString(16).padStart(2, '0')).join(''); }
