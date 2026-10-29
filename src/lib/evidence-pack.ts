import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { zip, strToU8 } from 'fflate';

export interface PackFile { id: string; recordId: string; filename: string; mimeType: string; bytes: Uint8Array }
export interface PackRecord { id: string; caption: string | null; evidenceType: string; capturedAt: string | null; capturedByUserId: string | null; projectStage: string | null; visibility: string; reviewStatus: string; locationLabel: string | null; internalNote: string | null }
export interface EvidencePackInput {
  job: { id: string; reference: string; project: string }; organisationId: string;
  generatedAt: string; selectionPage: number; records: PackRecord[]; files: PackFile[];
}
const safe = (value: string) => value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^[.]+/,'').slice(0,140) || 'file';
const ascii = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e\n]/g,'?');
export async function buildEvidenceArchive(input: EvidencePackInput): Promise<Uint8Array> {
  if (!input.records.length || input.records.length > 50 || input.files.length > 100) throw new Error('Reduce the pack selection');
  const ids = new Set(input.records.map(row => row.id));
  if (ids.size !== input.records.length || input.files.some(file => !ids.has(file.recordId)) || new Set(input.files.map(file => file.id)).size !== input.files.length) throw new Error('Invalid pack contents');
  const entries: Record<string, Uint8Array> = {};
  const manifest = [];
  let size = 0;
  for (const file of input.files) {
    size += file.bytes.length;
    if (size > 50 * 1024 * 1024) throw new Error('Pack exceeds 50 MB; select fewer records');
    const path = `evidence/${safe(file.recordId)}/${safe(file.id)}-${safe(file.filename)}`;
    if (entries[path]) throw new Error('Duplicate pack filename');
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(file.bytes).buffer));
    manifest.push({ id: file.id, recordId: file.recordId, originalFilename: file.filename, mimeType: file.mimeType, sizeBytes: file.bytes.length, archivePath: path, sha256: [...digest].map(byte => byte.toString(16).padStart(2,'0')).join('') });
    entries[path] = file.bytes;
  }
  const pdf = await PDFDocument.create();
  pdf.setTitle(`BuildNerve evidence pack - ${input.job.reference}`); pdf.setAuthor('BuildNerve');
  pdf.setCreationDate(new Date(input.generatedAt)); pdf.setModificationDate(new Date(input.generatedAt));
  const normal = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595.28,841.89]), y = 760, continuation = '';
  const addPage = (continued = true) => {
    if (pdf.getPageCount() >= 200) throw new Error('PDF index is too large; select fewer records');
    page = pdf.addPage([595.28,841.89]); y = 760;
    if (continued && continuation) { page.drawText(continuation,{x:50,y,size:10,font:bold,color:rgb(.12,.16,.22)}); y -= 20; }
  };
  function line(value: string, strong = false) {
    const font = strong ? bold : normal, fontSize = strong ? 11 : 9;
    for (const paragraph of ascii(value).split('\n')) {
      let text = '';
      for (const character of paragraph) {
        if (font.widthOfTextAtSize(text + character,fontSize) > 495) {
          if (y < 65) addPage();
          const space = text.lastIndexOf(' ');
          const end = space > 0 ? space : text.length;
          page.drawText(text.slice(0,end),{x:50,y,size:fontSize,font,color:rgb(.12,.16,.22)}); y -= 14;
          text = space > 0 ? text.slice(space + 1) : '';
        }
        text += character;
      }
      if (y < 65) addPage();
      page.drawText(text,{x:50,y,size:fontSize,font,color:rgb(.12,.16,.22)}); y -= 14;
    }
  }
  line(`${input.job.reference} - ${input.job.project}`,true);
  line(`Generated ${input.generatedAt}`);
  line(`${input.records.length} selected records / ${manifest.length} original files / selection page ${input.selectionPage}`);
  line('INTERNAL: contains private notes. Review before sharing.');
  line('Selected records and accessible files only; not a complete job export or compliance certificate.');
  line('Original files are in evidence/. Full source text and file hashes are in register.json.');
  line('PDF text uses a standard font; unsupported characters appear as ?. Original JSON is unchanged.');
  line('');
  for (const [index,record] of input.records.entries()) {
    continuation = `Record ${index + 1} (continued)`;
    if (y < 150) addPage(false);
    line(`${index + 1}. ${record.caption || record.evidenceType}`,true);
    line(`Record: ${record.id}`);
    line(`Captured: ${record.capturedAt || 'Not recorded'} | Author ID: ${record.capturedByUserId || 'Not recorded'}`);
    line(`Type: ${record.evidenceType} | Stage: ${record.projectStage || 'Not recorded'}`);
    line(`Visibility: ${record.visibility} | Review: ${record.reviewStatus}`);
    line(`Location: ${record.locationLabel || 'Not recorded'}`);
    line(`Internal notes: ${record.internalNote || 'None recorded'}`);
    const files = manifest.filter(file => file.recordId === record.id);
    if (!files.length) line('No accessible, unarchived files returned for this record.');
    for (const file of files) { line(`File: ${file.originalFilename} (${file.sizeBytes} bytes)`); line(`In archive: ${file.archivePath}`); }
    line('');
  }
  for (const [index,p] of pdf.getPages().entries()) {
    p.drawRectangle({x:0,y:788,width:596,height:54,color:rgb(.07,.11,.18)});
    p.drawText('BUILDNERVE  |  EVIDENCE PACK',{x:50,y:807,font:bold,size:12,color:rgb(1,1,1)});
    p.drawText(`Internal / Page ${index + 1} of ${pdf.getPageCount()}`,{x:50,y:32,font:normal,size:8,color:rgb(.35,.39,.44)});
  }
  entries['index.pdf'] = await pdf.save();
  entries['register.json'] = strToU8(JSON.stringify({ format:'buildnerve-evidence-pack-v1', audience:'internal', generatedAt:input.generatedAt,
    organisationId:input.organisationId, job:input.job, scope:{selectionPage:input.selectionPage,completeJobExport:false,accessibleFilesOnly:true,records:input.records.length,files:manifest.length}, records:input.records, files:manifest },null,2));
  return new Promise((resolve,reject) => zip(entries,{level:0},(error,data) => error ? reject(error) : resolve(data)));
}
