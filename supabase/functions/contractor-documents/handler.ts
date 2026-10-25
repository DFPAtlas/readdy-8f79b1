const MAX_FILE=5*1024*1024;
const MAX_BODY=MAX_FILE+65536;
const categories=new Set(['identity','business','cis','insurance','qualification','training','right_to_work','site_induction','rams','contract','other']);
export async function sha256(bytes: Uint8Array | string) {
 const buffer=typeof bytes==='string' ? new TextEncoder().encode(bytes) : bytes;
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function sniffMime(bytes: Uint8Array): string | null {
 if(bytes.length>=5 && String.fromCharCode(...bytes.slice(0,5))==='%PDF-')return 'application/pdf';
 if(bytes.length>=8 && [137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))return 'image/png';
 if(bytes.length>=3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255)return 'image/jpeg';
 if(bytes.length>=12 && String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';
 return null;
}
function documentId(hash: string) {return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;}
async function boundedBody(req: Request): Promise<Uint8Array | null> {
 if(!req.body)return new Uint8Array();
 const reader=req.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY){await reader.cancel();return null;}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
// Token-authorised, server-only storage writes. Never returns credentials or storage URLs.
export function createHandler(deps: {admin:any;serviceKey:string}) {
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
 const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
 return async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{headers});
  if(req.method!=='POST')return reply({error:'Use POST'},405);
  try {
   if(Number(req.headers.get('content-length') || 0)>MAX_BODY)return reply({error:'Use a file up to 5 MB'},413);
   const bytes=await boundedBody(req);if(!bytes)return reply({error:'Use a file up to 5 MB'},413);
   const contentType=req.headers.get('content-type') || '';
   let fields:Record<string,unknown>;let file:File | null=null;
   if(contentType.startsWith('multipart/form-data')) {
    const form=await new Request('https://upload.invalid',{method:'POST',headers:{'content-type':contentType},body:bytes}).formData();
    fields={action:form.get('action'),token:form.get('token'),name:form.get('name'),category:form.get('category')};
    const part=form.get('file');if(part && typeof part!=='string')file=part;
   } else {
    if(bytes.length>8192)return reply({error:'Request too large'},413);
    fields=JSON.parse(new TextDecoder().decode(bytes));
   }
   if(fields.action==='cleanup') {
    if(!deps.serviceKey || req.headers.get('authorization')!==`Bearer ${deps.serviceKey}`)return reply({error:'Maintenance access required'},401);
    const records=await deps.admin.rpc('contractor_document_operation',{p_action:'cleanup_list',p_data:{}});
    if(records.error)return reply({error:'Cleanup could not be loaded'},503);
    let removed=0;for(const record of records.data ?? []) {
     const removal=await deps.admin.storage.from('documents').remove([record.path]);
     if(!removal.error){const saved=await deps.admin.rpc('contractor_document_operation',{p_action:'cleanup_complete',p_data:{id:record.id}});if(!saved.error && saved.data?.removed)removed++;}
    }
    return reply({removed});
   }
   if(typeof fields.token!=='string' || !/^[a-f0-9]{64}$/.test(fields.token))return reply({error:'Invitation is unavailable or expired'},403);
   const token_hash=await sha256(fields.token);
   if(fields.action==='list') {
    const result=await deps.admin.rpc('contractor_document_operation',{p_action:'list',p_data:{token_hash}});
    if(result.error)return reply({error:'Invitation is unavailable or expired'},403);
    return reply(result.data);
   }
   if(fields.action!=='upload' || !file)return reply({error:'Choose a document to upload'},400);
   const name=typeof fields.name==='string'?fields.name.trim():'';
   if(!name || name.length>160 || typeof fields.category!=='string' || !categories.has(fields.category))return reply({error:'Choose a document name and category'},400);
   if(file.size<1 || file.size>MAX_FILE)return reply({error:'Use a file up to 5 MB'},413);
   const fileBytes=new Uint8Array(await file.arrayBuffer());const mime=sniffMime(fileBytes);
   if(!mime || mime!==file.type)return reply({error:'Use a PDF, PNG, JPEG or WebP file matching its declared type'},400);
   const filename=file.name.replace(/[\x00-\x1f\x7f\\/]/g,'_').trim();
   if(!filename || filename.length>255)return reply({error:'Use a filename of up to 255 characters'},400);
   const digest=await sha256(fileBytes);
   const id=documentId(await sha256(JSON.stringify([token_hash,digest,name,fields.category,filename])));
   const document={name,category:fields.category,filename,mime,size:file.size,sha256:digest};
   const prepared=await deps.admin.rpc('contractor_document_operation',{p_action:'prepare',p_data:{token_hash,id,document}});
   if(prepared.error)return reply({error:prepared.error.code==='54000'?'This invitation has reached its upload limit. Contact the company.':'Document upload is unavailable for this invitation'},403);
   if(prepared.data?.registered)return reply({id,status:'saved'});
   const path=prepared.data?.path;
   if(typeof path!=='string' || !new RegExp(`^[a-f0-9-]{36}/workforce/[a-f0-9-]{36}/${id}/file$`).test(path))return reply({error:'Upload could not be prepared'},503);
   const storage=deps.admin.storage.from('documents');
   const uploaded=await storage.upload(path,fileBytes,{contentType:mime,upsert:false});
   if(uploaded.error) {
    // An earlier upload may have succeeded even if its response was lost.
    const stored=await storage.download(path);
    if(stored.error || !stored.data || await sha256(new Uint8Array(await stored.data.arrayBuffer()))!==digest)return reply({error:'File save could not be confirmed. Retry with the same file.'},503);
   }
   const completed=await deps.admin.rpc('contractor_document_operation',{p_action:'complete',p_data:{token_hash,id}});
   if(completed.error)return reply({error:'Registration could not be confirmed. Retry with the same file or contact the company.'},503);
   return reply(completed.data);
  } catch {return reply({error:'Document request could not be completed. Retry or contact the company.'},400);}
 };
}
