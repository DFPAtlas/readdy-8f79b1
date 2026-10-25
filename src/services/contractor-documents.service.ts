export interface ContractorDocument { id: string; name: string; category: string; filename: string; size: number; status: string; uploaded_at: string }
export interface ContractorDocumentList { company: string; expires_at: string; documents: ContractorDocument[] }
const endpoint=()=>`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/contractor-documents`;
async function request(body: string | FormData) {
  const response=await fetch(endpoint(),{method:'POST',headers:{apikey:import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,...(typeof body==='string'?{'Content-Type':'application/json'}:{})},body,cache:'no-store',referrerPolicy:'no-referrer'});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error || 'The document request could not be confirmed.');
  return result;
}
export async function listContractorDocuments(token: string): Promise<ContractorDocumentList> {
  const result=await request(JSON.stringify({action:'list',token}));
  if(!result || !Array.isArray(result.documents) || typeof result.company!=='string')throw new Error('Document list could not be confirmed.');
  return result;
}
export async function uploadContractorDocument(token: string,name: string,category: string,file: File): Promise<{id:string;status:string}> {
  if(!name.trim() || name.trim().length>160)throw new Error('Enter a document name of up to 160 characters.');
  if(file.size<1 || file.size>5*1024*1024)throw new Error('Choose a file up to 5 MB.');
  const form=new FormData();form.set('action','upload');form.set('token',token);form.set('name',name.trim());form.set('category',category);form.set('file',file);
  const result=await request(form);
  if(!result || typeof result.id!=='string' || !['saved','awaiting_review'].includes(result.status))throw new Error('The document save could not be confirmed. Retry with the same file.');
  return result;
}
