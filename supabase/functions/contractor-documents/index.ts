import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { createHandler } from './handler.ts';
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const admin=createClient(Deno.env.get('SUPABASE_URL') ?? '',serviceKey,{auth:{persistSession:false}});
Deno.serve(createHandler({admin,serviceKey}));
