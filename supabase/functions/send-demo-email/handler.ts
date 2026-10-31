const hex = (value: ArrayBuffer) => Array.from(new Uint8Array(value)).map(b => b.toString(16).padStart(2,'0')).join('');
const digest = async (text: string) => hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
const escape = (s: string) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function createDemoHandler(deps: {admin:any;serviceKey:string;emailKey:string;fromDomain:string;siteUrl:string;fetch:typeof fetch}) {
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, apikey, authorization, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 return async(req:Request)=>{
  if(req.method==='OPTIONS') return new Response(null,{headers});
  if(req.method!=='POST') return reply({error:'Use POST'},405);
  try {
   const raw=await req.text();if(raw.length>4096) return reply({error:'Request too large'},413);
   const body=JSON.parse(raw);
   if(body.action==='redeem') {
    if(typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token)||typeof body.session!=='string'||!/^[a-f0-9]{64}$/.test(body.session)) return reply({error:'Demo link is expired, invalid or already used'},403);
    const result=await deps.admin.rpc('demo_request_operation',{p_action:'redeem',p_data:{token_hash:await digest(body.token),session_hash:await digest(body.session)}});
    return result.error?reply({error:'Demo link is expired, invalid or already used'},403):reply(result.data);
   }
   if(body.action!=='create') return reply({error:'Unknown demo action'},400);
   if(body.website_alt) return reply({delivery_status:'accepted_by_provider'});
   if(!deps.emailKey||!/^[a-z0-9.-]+$/i.test(deps.fromDomain)) return reply({error:'Demo emails are temporarily unavailable'},503);
   if(typeof body.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)||typeof body.email!=='string'||typeof body.name!=='string'||(body.company!=null&&typeof body.company!=='string')) return reply({error:'Enter your name and work email'},400);
   const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(deps.serviceKey),{name:'HMAC',hash:'SHA-256'},false,['sign']);
   const token=hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`isolated-demo:${body.id}`)));
   const {data:record,error}=await deps.admin.rpc('demo_request_operation',{p_action:'create',p_data:{id:body.id,email:body.email,name:body.name,company:body.company??'',token_hash:await digest(token)}});
   if(error) return reply({error:'Could not create this demo request. Check your details or try again later.'},429);
   if(record.delivery_status==='accepted_by_provider') return reply({delivery_status:'accepted_by_provider'});
   const site=new URL(deps.siteUrl);if(site.protocol!=='https:') throw new Error('Invalid site URL');
   const link=`${site.origin}/demo#token=${token}`;
   let status='unknown';
   try {
    const response=await deps.fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${deps.emailKey}`,'Content-Type':'application/json','Idempotency-Key':`isolated-demo-${record.id}`},body:JSON.stringify({from:`BuildNerve <noreply@${deps.fromDomain}>`,to:[record.email],subject:'Your private BuildNerve sample workspace',text:`Hi ${record.name}, open your read-only sample workspace: ${link}\nThis link expires in 24 hours and opens in one browser session. All records are fictional. Payments, emails, uploads and HMRC actions are disabled.`,html:`<!doctype html><html lang="en"><body><h1>Your BuildNerve sample workspace</h1><p>Hi ${escape(record.name)},</p><p>Explore realistic, fictional projects and workforce records in your own read-only demo.</p><p><a href="${link}">Open your sample workspace</a></p><p>The link expires in 24 hours and can be activated in one browser session. Payments, emails, uploads and HMRC actions are disabled.</p><p>If you did not request this demo, ignore this email.</p></body></html>`}),signal:AbortSignal.timeout(15000)});
    const payload=await response.json();status=response.ok&&typeof payload.id==='string'?'accepted_by_provider':response.status>=500||response.status===429?'unknown':'failed';
   }catch{status='unknown';}
   const saved=await deps.admin.rpc('demo_request_operation',{p_action:'delivery',p_data:{id:record.id,status}});
   return reply({delivery_status:saved.error?'unknown':status});
  }catch{return reply({error:'Could not process the demo request'},400);}
 };
}
