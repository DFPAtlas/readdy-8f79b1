const headers = {
  'Content-Type': 'application/json', 'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
export function createHandler(admin: any, apiKey: string, fetcher: typeof fetch = fetch) {
  const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
  return async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers });
    if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
    try {
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
      if (!token) return reply({ error: 'Sign in first' }, 401);
      const { data: { user }, error: authError } = await admin.auth.getUser(token);
      if (authError || !user?.email_confirmed_at) return reply({ error: 'A confirmed account email is required' }, 401);
      const body = await req.json();
      const org = body.organisation_id;
      if (typeof org !== 'string' || !/^[0-9a-f-]{36}$/i.test(org)) return reply({ error: 'Organisation is required' }, 400);
      const { data: member, error: memberError } = await admin.from('organisation_members').select('role').eq('organisation_id', org).eq('user_id', user.id).eq('status', 'active').maybeSingle();
      if (memberError || !member || !['owner', 'admin'].includes(member.role)) return reply({ error: 'Owner or admin access required' }, 403);
      const { data: check, error: readError } = await admin.from('business_verifications').select('*').eq('organisation_id', org).maybeSingle();
      if (readError || !check || check.business_type !== 'limited_company' || !/^[A-Z0-9]{8}$/.test(check.company_number ?? '')) return reply({ error: 'Submit limited company details first' }, 400);
      if (!apiKey) return reply({ error: 'Company lookup is unavailable; manual review is available' }, 503);
      // Fetch only the server-stored number. Never accept a claimed result from the browser.
      const upstream = await fetcher(`https://api.company-information.service.gov.uk/company/${encodeURIComponent(check.company_number)}`, {
        headers: { Authorization: `Basic ${btoa(apiKey + ':')}` }, signal: AbortSignal.timeout(10000),
      });
      if (!upstream.ok) return reply({ error: 'Company lookup failed; verification remains unchanged' }, 503);
      const company = await upstream.json();
      if (company.company_number !== check.company_number || typeof company.company_name !== 'string' || typeof company.company_status !== 'string') return reply({ error: 'Company lookup returned incomplete information' }, 502);
      const normalise = (s: string) => s.trim().replace(/\s+/g, ' ').toUpperCase();
      const matches = normalise(company.company_name) === normalise(check.legal_name);
      const approved = company.company_status === 'active' && matches;
      const { data: updated, error: updateError } = await admin.from('business_verifications').update({
        company_status: company.company_status, company_checked_at: new Date().toISOString(),
        business_status: approved ? 'verified' : 'pending_review',
        review_reason: approved ? 'Active company number and legal name matched Companies House. Representative authority requires separate review.' : 'Company name or status requires manual review.',
        revision: check.revision + 1, updated_at: new Date().toISOString(),
      }).eq('organisation_id', org).eq('revision', check.revision).select('organisation_id').maybeSingle();
      if (updateError) return reply({ error: 'Could not save the company check' }, 500);
      if (!updated) return reply({ error: 'Submission changed. Reload and try again.' }, 409);
      return reply({ business_status: approved ? 'verified' : 'pending_review', company_status: company.company_status });
    } catch { return reply({ error: 'Company lookup could not be completed' }, 503); }
  };
}
