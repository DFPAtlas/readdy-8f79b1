import { getSupabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/supabase';
export type WorkforceRow = Database['public']['Tables']['workforce_people']['Row'] & { revision: number };
export type WorkforceJob = Pick<Database['public']['Tables']['jobs']['Row'], 'id' | 'reference' | 'project_name'>;
export type WorkforceAssignment = Database['public']['Tables']['workforce_assignments']['Row'];
export type WorkforceQualification = Database['public']['Tables']['qualifications']['Row'];
export type WorkforceInsurance = Database['public']['Tables']['insurance_policies']['Row'];
export type WorkforceDocument = Database['public']['Tables']['workforce_documents']['Row'];
export type WorkforceCheck = Database['public']['Tables']['passport_checks']['Row'];
export type WorkforceHistory = { id: string; organisation_id: string; person_id: string; actor_id: string; action: string; reason: string; before_record: Json | null; after_record: Json; created_at: string };
function client(): any { const value = getSupabase(); if (!value)
    throw new Error('The backend is unavailable.'); return value; }
export const workforceLiveService = {
    async load(org: string) {
        const [people, jobs] = await Promise.all([
            client().from('workforce_people').select('*').eq('organisation_id', org).order('last_name').order('first_name'),
            client().from('jobs').select('id,reference,project_name').eq('organisation_id', org).is('archived_at', null).order('created_at', { ascending: false }),
        ]);
        if (people.error)
            throw new Error(people.error.message);
        if (jobs.error)
            throw new Error(jobs.error.message);
        return { people: people.data || [], jobs: jobs.data || [] };
    },
    async loadProfile(org: string, personId: string) {
        const person = await client().from('workforce_people').select('*').eq('organisation_id', org).eq('id', personId).maybeSingle();
        if (person.error)
            throw new Error(person.error.message);
        if (!person.data)
            return null;
        const results = await Promise.all([
            client().from('workforce_assignments').select('*').eq('organisation_id', org).eq('person_id', personId).order('start_date', { ascending: false }),
            client().from('qualifications').select('*').eq('organisation_id', org).eq('person_id', personId).order('created_at', { ascending: false }),
            client().from('insurance_policies').select('*').eq('organisation_id', org).eq('person_id', personId).order('expiry_date'),
            client().from('workforce_documents').select('id,name,category,original_filename,mime_type,size_bytes,visibility,review_status,review_note,reviewed_at,version,uploaded_at,archived_at').eq('organisation_id', org).eq('person_id', personId).is('archived_at', null).order('uploaded_at', { ascending: false }),
            client().from('passport_checks').select('*').eq('organisation_id', org).eq('person_id', personId).order('check_category'),
            client().from('workforce_history').select('*').eq('organisation_id', org).eq('person_id', personId).order('created_at', { ascending: false }),
            client().from('jobs').select('id,reference,project_name').eq('organisation_id', org),
        ]);
        for (let index = 0; index < results.length; index += 1) {
            const result = results[index];
            if (result.error && index !== 3)
                throw new Error(result.error.message);
        }
        return { person: person.data, assignments: results[0].data || [], qualifications: results[1].data || [], insurance: results[2].data || [], documents: results[3].error ? [] : results[3].data || [], checks: results[4].data || [], history: results[5].data || [], jobs: (results[6].data || []) as WorkforceJob[] };
    },
    async write(org: string, action: string, data: Record<string, Json>, requestId: string = crypto.randomUUID()) {
        const { data: result, error } = await client().rpc('workforce_write', { p_org: org, p_request: requestId, p_action: action, p_data: data });
        if (error)
            throw new Error(error.message);
        if (!result)
            throw new Error('The server did not confirm the workforce change.');
        return result;
    },
};
export function relationshipName(value: string) { return ({ employee: 'Employee', subcontractor_individual: 'Individual subcontractor', subcontractor_company: 'Subcontractor company', agency: 'Agency worker', consultant: 'Consultant' } as Record<string, string>)[value] || value; }
export function statusName(value: string) { return value.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase()); }
