import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { createHandler } from './handler.ts';

const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
const roles = new Set(['owner', 'admin', 'project_manager', 'site_supervisor']);
Deno.serve(createHandler({
  env: key => Deno.env.get(key),
  fetch,
  authenticate: async authorization => {
    const { data, error } = await client.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
    return !error && data.user && !data.user.is_anonymous ? data.user.id : null;
  },
  authorize: async (user, org, job) => {
    const [member, assignment, project, company, subscription] = await Promise.all([
      client.from('organisation_members').select('role').eq('organisation_id', org).eq('user_id', user).eq('status', 'active').maybeSingle(),
      client.from('job_members').select('user_id').eq('organisation_id', org).eq('job_id', job).eq('user_id', user).maybeSingle(),
      client.from('jobs').select('id').eq('organisation_id', org).eq('id', job).is('archived_at', null).maybeSingle(),
      client.from('organisations').select('id').eq('id', org).is('archived_at', null).maybeSingle(),
      client.from('organisation_subscriptions').select('access_state,status,trial_end').eq('organisation_id', org).maybeSingle(),
    ]);
    if ([member, assignment, project, company, subscription].some(result => result.error)) return false;
    if (!member.data || !roles.has(member.data.role) || !assignment.data || !project.data || !company.data) return false;
    const sub = subscription.data;
    return !sub || (!['read_only', 'billing_locked', 'suspended_by_platform'].includes(sub.access_state) && !(sub.status === 'trialing' && sub.trial_end && Date.parse(sub.trial_end) < Date.now()));
  },
}));
