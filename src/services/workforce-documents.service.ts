import { getSupabase } from '@/lib/supabase';

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.ms-excel',
]);

export type WorkforceDocumentCategory =
  | 'identity' | 'business' | 'cis' | 'insurance' | 'qualification'
  | 'training' | 'right_to_work' | 'site_induction' | 'rams' | 'contract'
  | 'bank_change' | 'other';

function backend(): any {
  const client = getSupabase();
  if (!client) throw new Error('The backend is unavailable.');
  return client;
}

export const workforceDocumentsService = {
  async upload(orgId: string, personId: string, name: string, category: WorkforceDocumentCategory, file: File) {
    if (!name.trim() || name.trim().length > 160) throw new Error('Enter a document name of up to 160 characters.');
    if (!allowedMimeTypes.has(file.type)) throw new Error('Use a PDF, image, Word or Excel document.');
    if (file.size < 1 || file.size > 20 * 1024 * 1024) throw new Error('The document must be under 20 MB.');

    const client = backend();
    const documentId = crypto.randomUUID();
    const requestId = crypto.randomUUID();
    const objectPath = `${orgId}/workforce/${personId}/${documentId}/file`;
    const { error: uploadError } = await client.storage.from('documents').upload(objectPath, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw new Error(uploadError.message || 'The document could not be uploaded.');

    const { error: registerError } = await client.rpc('workforce_document_register', {
      p_org: orgId,
      p_person: personId,
      p_document: documentId,
      p_request: requestId,
      p_name: name.trim(),
      p_category: category,
      p_filename: file.name,
      p_mime: file.type,
      p_size: file.size,
    });
    if (registerError) throw new Error(`The file uploaded but its register entry could not be saved: ${registerError.message}`);
    return documentId;
  },

  async signedUrl(orgId: string, personId: string, documentId: string) {
    const client = backend();
    const { data: document, error } = await client.from('workforce_documents')
      .select('bucket,object_path')
      .eq('organisation_id', orgId)
      .eq('person_id', personId)
      .eq('id', documentId)
      .is('archived_at', null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!document) throw new Error('This document is no longer available.');
    const { data, error: urlError } = await client.storage.from(document.bucket).createSignedUrl(document.object_path, 300);
    if (urlError) throw new Error(urlError.message);
    return data.signedUrl as string;
  },

  async review(orgId: string, documentId: string, status: 'accepted' | 'rejected', note: string) {
    if (status === 'rejected' && !note.trim()) throw new Error('Add a reason before rejecting a document.');
    const { error } = await backend().rpc('workforce_document_review', {
      p_org: orgId,
      p_document: documentId,
      p_request: crypto.randomUUID(),
      p_status: status,
      p_note: note.trim(),
    });
    if (error) throw new Error(error.message);
  },
};
