import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const headers={...cors,"Content-Type":"application/json","Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"};
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers});}
serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const url=Deno.env.get('SUPABASE_URL');const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)return json({error:'Portal service unavailable'},503);
 try{
  const body=await req.json().catch(()=>null);const token=typeof body?.token==='string'?body.token.trim():'';
  if(token.length<32||token.length>512)return json({error:'Invalid portal link'},400);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(byte=>byte.toString(16).padStart(2,'0')).join('');
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.rpc('client_portal_overview',{p_hash:hash});
  if(error){if(error.code==='42501')return json({error:'This link is invalid, expired, revoked or has no viewing permissions. Contact your contractor.'},403);console.error('Portal read failed',error.code);return json({error:'Portal service unavailable'},503);}
  return json(data);
 }catch{ return json({error:'Portal service unavailable'},503); }
});
