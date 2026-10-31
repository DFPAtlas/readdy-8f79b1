import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { createScheduledReportHandler } from './handler.ts';
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',{auth:{persistSession:false}});
Deno.serve(createScheduledReportHandler({emailKey:Deno.env.get('RESEND_API_KEY') ?? '',fetch,rpc:async args=>await admin.rpc('process_job_report_delivery',args)}));
