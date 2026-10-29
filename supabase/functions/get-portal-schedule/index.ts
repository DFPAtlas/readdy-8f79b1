import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const headers={...cors,"Content-Type":"application/json","Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"};
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers});}
serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const url=Deno.env.get('SUPABASE_URL');const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)return json({error:'Portal service unavailable'},503);
 try{
  const text=await req.text();if(text.length>20000)return json({error:'Request too large'},413);let body;try{body=JSON.parse(text);}catch{return json({error:'Invalid request'},400);}
  const token=typeof body?.token==='string'?body.token.trim():'';if(token.length<32||token.length>512)return json({error:'Invalid portal link'},400);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(byte=>byte.toString(16).padStart(2,'0')).join('');
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const action=body.action??'overview';let result;
  if(action==='overview')result=await client.rpc('client_portal_overview',{p_hash:hash});
  else if(action==='respond')result=await client.rpc('client_portal_write',{p_hash:hash,p_request:body.request_id,p_action:body.response_type,p_data:body.data});
  else if(action==='asset'){
   const {data:asset,error}=await client.rpc('client_portal_asset',{p_hash:hash,p_kind:body.kind,p_id:body.id});
   if(error)result={data:null,error};
   else{const {data,error:storageError}=await client.storage.from(asset.bucket).createSignedUrl(asset.path,60,{download:asset.filename});if(storageError)return json({error:'This file is unavailable. Contact your contractor.'},404);return json({url:data.signedUrl,expires_in:60});}
  }else return json({error:'Invalid portal action'},400);
  if(action==='overview' && !result.error){
  const summaries=await client.rpc('client_portal_daily_summaries',{p_hash:hash});
  if(summaries.error)result={data:null,error:summaries.error};
  else if(!summaries.data || !Array.isArray(summaries.data.items) || !Number.isSafeInteger(summaries.data.total) || summaries.data.total<0)return json({error:'Portal service unavailable'},503);
  else result={data:{...result.data,daily_summaries:summaries.data.items,daily_summary_total:summaries.data.total},error:null};
 }
 const {data,error}=result;if(error){if(error.code==='42501')return json({error:action==='overview'?'This link is invalid, expired, revoked or has no viewing permissions. Contact your contractor.':'This action is unavailable. Refresh or contact your contractor.'},403);if(error.code==='P0001'||error.code?.startsWith('22'))return json({error:'The record changed or the response is invalid. Refresh, review the latest details and try again.'},409);console.error('Portal request failed',error.code);return json({error:'Portal service unavailable'},503);}
  return json(action==='respond'?{id:data}:data);
 }catch{return json({error:'Portal service unavailable'},503);}
});
