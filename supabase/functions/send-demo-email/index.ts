import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { createDemoHandler } from './handler.ts';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey, { auth: { persistSession: false } });
Deno.serve(createDemoHandler({ admin, serviceKey, emailKey: Deno.env.get('RESEND_API_KEY') ?? '', fromDomain: Deno.env.get('RESEND_FROM_DOMAIN') ?? '', siteUrl: Deno.env.get('SITE_URL') || 'https://buildnerve.co.uk', fetch }));
