import { useState, useEffect, useRef, useCallback } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { assistService, type IngestionJob, type IngestionJobDetail, type ExtractionDetail, type ExtractedField } from '@/services/assist.service';
import { useToast } from '@/components/base/Toast';

const DOCUMENT_TYPES = [
  { value: 'invoice', label: 'Invoice / Receipt', icon: 'ri-bill-line', color: 'text-amber-600 bg-amber-50' },
  { value: 'certificate', label: 'Competency Certificate', icon: 'ri-award-line', color: 'text-emerald-600 bg-emerald-50' },
  { value: 'insurance', label: 'Insurance Certificate', icon: 'ri-shield-check-line', color: 'text-sky-600 bg-sky-50' },
  { value: 'rams', label: 'RAMS', icon: 'ri-file-warning-line', color: 'text-red-600 bg-red-50' },
  { value: 'coshh', label: 'COSHH Assessment', icon: 'ri-flask-line', color: 'text-purple-600 bg-purple-50' },
  { value: 'delivery_note', label: 'Delivery Note', icon: 'ri-truck-line', color: 'text-teal-600 bg-teal-50' },
  { value: 'purchase_order', label: 'Purchase Order', icon: 'ri-shopping-cart-line', color: 'text-indigo-600 bg-indigo-50' },
  { value: 'quote', label: 'Quote / Estimate', icon: 'ri-file-list-3-line', color: 'text-rose-600 bg-rose-50' },
  { value: 'timesheet', label: 'Timesheet', icon: 'ri-time-line', color: 'text-cyan-600 bg-cyan-50' },
  { value: 'other', label: 'Other Document', icon: 'ri-file-line', color: 'text-gray-600 bg-gray-50' },
];

const TEMPLATE_MAP: Record<string, string> = {
  invoice: 'extraction_invoice',
  certificate: 'extraction_certificate',
  insurance: 'extraction_certificate',
  rams: 'extraction_rams',
  coshh: 'extraction_rams',
  delivery_note: 'extraction_invoice',
  purchase_order: 'extraction_invoice',
  quote: 'extraction_invoice',
  timesheet: 'extraction_invoice',
  other: 'extraction_invoice',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  queued: { label: 'Queued', color: 'bg-foreground-100 text-foreground-600', icon: 'ri-hourglass-line' },
  scanning: { label: 'Scanning', color: 'bg-sky-100 text-sky-700', icon: 'ri-scan-line' },
  extracting: { label: 'Extracting', color: 'bg-amber-100 text-amber-700', icon: 'ri-brain-line' },
  needs_review: { label: 'Needs Review', color: 'bg-orange-100 text-orange-700', icon: 'ri-edit-line' },
  ready: { label: 'Ready', color: 'bg-emerald-100 text-emerald-700', icon: 'ri-check-double-line' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: 'ri-error-warning-line' },
  excluded: { label: 'Excluded', color: 'bg-foreground-100 text-foreground-500', icon: 'ri-forbid-line' },
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getConfidenceBadge(confidence: string) {
  switch (confidence) {
    case 'high': return { label: 'High', cls: 'bg-emerald-100 text-emerald-700' };
    case 'medium': return { label: 'Medium', cls: 'bg-amber-100 text-amber-700' };
    case 'low': return { label: 'Low', cls: 'bg-red-100 text-red-700' };
    default: return { label: confidence, cls: 'bg-foreground-100 text-foreground-600' };
  }
}

export default function DocumentIngestionPage() {
  const { organisation } = useOrg();
  const { showToast } = useToast();
  const orgId = organisation?.id;

  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState('invoice');
  const [uploadJobId, setUploadJobId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detail panel
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [detail, setDetail] = useState<IngestionJobDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Extraction state
  const [extractingJobId, setExtractingJobId] = useState<number | null>(null);
  const [editedFields, setEditedFields] = useState<Record<number, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'jobs'>('jobs');

  const loadJobs = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await assistService.listIngestionJobs(orgId);
      setJobs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId) loadJobs();
  }, [orgId, loadJobs]);

  // Poll jobs every 5s when there are non-terminal jobs
  useEffect(() => {
    const hasPending = jobs.some((j) => !['ready', 'failed', 'excluded'].includes(j.status));
    if (!hasPending) return;
    const interval = setInterval(() => loadJobs(), 5000);
    return () => clearInterval(interval);
  }, [jobs, loadJobs]);

  const openDetail = async (jobId: number) => {
    setSelectedJobId(jobId);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    setEditedFields({});
    try {
      const data = await assistService.getIngestionJobDetail(jobId);
      setDetail(data);
    } catch (err: any) {
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedJobId(null);
    setDetail(null);
    setDetailError(null);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setUploadFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadFile(file);
  };

  const handleUpload = async () => {
    if (!uploadFile || !orgId) return;
    try {
      setUploading(true);
      await assistService.uploadDocument({
        file: uploadFile,
        organisationId: orgId,
        documentType: uploadDocType,
        jobId: uploadJobId || null,
      });
      showToast('Document uploaded. Ingestion queued.', 'success');
      setUploadFile(null);
      setUploadJobId('');
      setShowUpload(false);
      loadJobs();
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleExtract = async (jobId: number, docType: string) => {
    const templateName = TEMPLATE_MAP[docType] || 'extraction_invoice';
    try {
      setExtractingJobId(jobId);
      await assistService.triggerExtraction(jobId, templateName);
      showToast('AI extraction started', 'success');
      loadJobs();
      // Re-open detail after a moment
      setTimeout(() => openDetail(jobId), 1500);
    } catch (err: any) {
      showToast(err.message || 'Extraction failed', 'error');
    } finally {
      setExtractingJobId(null);
    }
  };

  const handleFieldEdit = (fieldId: number, value: string) => {
    setEditedFields((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleFieldConfirm = async (extractionId: number, fields: ExtractedField[]) => {
    try {
      setConfirming(true);
      const payload = fields.map((f) => ({
        id: f.id,
        is_confirmed: true,
        edited_value: editedFields[f.id] ?? f.extracted_value,
      }));
      await assistService.confirmExtraction(extractionId, payload);
      showToast('Extraction confirmed', 'success');
      if (selectedJobId) {
        openDetail(selectedJobId);
      }
      loadJobs();
    } catch (err: any) {
      showToast(err.message || 'Confirmation failed', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const handleConfirmAll = async (extraction: ExtractionDetail) => {
    try {
      setConfirming(true);
      const payload = extraction.fields.map((f) => ({
        id: f.id,
        is_confirmed: true,
        edited_value: editedFields[f.id] ?? f.extracted_value,
      }));
      await assistService.confirmExtraction(extraction.id, payload);
      showToast('All fields confirmed', 'success');
      if (selectedJobId) {
        openDetail(selectedJobId);
      }
      loadJobs();
    } catch (err: any) {
      showToast(err.message || 'Confirmation failed', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const hasPendingJobs = jobs.some((j) => !['ready', 'failed', 'excluded'].includes(j.status));
  const needsReviewCount = jobs.filter((j) => j.status === 'needs_review').length;
  const readyCount = jobs.filter((j) => j.status === 'ready').length;
  const failedCount = jobs.filter((j) => j.status === 'failed').length;

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground-950">Document Ingestion</h1>
          <p className="text-sm text-foreground-500 mt-1">Upload invoices, certs, RAMS, and more for AI-powered extraction</p>
        </div>
        <button
          onClick={() => { setShowUpload(!showUpload); setActiveTab('upload'); }}
          className="h-10 px-4 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 transition-colors whitespace-nowrap flex items-center gap-2"
        >
          <i className="ri-upload-cloud-2-line"></i>
          New Upload
        </button>
      </div>

      {/* Summary pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-foreground-500">{jobs.length} documents total</span>
        {needsReviewCount > 0 && (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
            {needsReviewCount} need review
          </span>
        )}
        {readyCount > 0 && (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
            {readyCount} confirmed
          </span>
        )}
        {failedCount > 0 && (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            {failedCount} failed
          </span>
        )}
        {hasPendingJobs && (
          <span className="flex items-center gap-1.5 text-xs text-foreground-400">
            <i className="ri-loader-4-line animate-spin"></i>
            Processing...
          </span>
        )}
      </div>

      {/* Upload Zone */}
      {showUpload && (
        <div className="bg-white rounded-2xl border border-background-200 overflow-hidden">
          <div className="p-5 border-b border-background-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground-950">Upload Document</h2>
            <button onClick={() => setShowUpload(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 transition-colors">
              <i className="ri-close-line"></i>
            </button>
          </div>
          <div className="p-5 space-y-4">
            {/* Drag & drop */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-primary-400 bg-primary-50/50' : 'border-background-200 hover:border-primary-300 hover:bg-background-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.doc,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
              {uploadFile ? (
                <div className="flex items-center gap-3 justify-center">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                    <i className="ri-file-line text-lg text-primary-600"></i>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground-900">{uploadFile.name}</p>
                    <p className="text-xs text-foreground-500">{formatBytes(uploadFile.size)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <i className="ri-close-line"></i>
                  </button>
                </div>
              ) : (
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-background-100 flex items-center justify-center mx-auto mb-3">
                    <i className="ri-file-upload-line text-xl text-foreground-400"></i>
                  </div>
                  <p className="text-sm font-medium text-foreground-700">Drag &amp; drop a file here, or click to browse</p>
                  <p className="text-xs text-foreground-400 mt-1">PDF, images, Word, Excel — up to 20MB</p>
                </div>
              )}
            </div>

            {/* Document type selector */}
            <div>
              <label className="text-xs font-medium text-foreground-600 block mb-2">Document Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {DOCUMENT_TYPES.map((dt) => (
                  <button
                    key={dt.value}
                    onClick={() => setUploadDocType(dt.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                      uploadDocType === dt.value
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'bg-background-50 text-foreground-600 hover:bg-background-100 border border-background-200'
                    }`}
                  >
                    <i className={`${dt.icon} text-sm`}></i>
                    {dt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Job association */}
            <div>
              <label className="text-xs font-medium text-foreground-600 block mb-1.5">Link to Job (optional)</label>
              <input
                type="text"
                value={uploadJobId}
                onChange={(e) => setUploadJobId(e.target.value)}
                placeholder="e.g. SL-1048"
                className="w-full max-w-xs px-3 py-2 rounded-lg border border-background-200 text-sm focus:outline-none focus:border-primary-300 bg-background-50"
              />
            </div>

            {/* Upload button */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Uploading...
                  </>
                ) : (
                  <>
                    <i className="ri-upload-cloud-2-line"></i>
                    Upload &amp; Queue
                  </>
                )}
              </button>
              <button
                onClick={() => { setShowUpload(false); setUploadFile(null); }}
                className="px-4 py-2.5 text-sm text-foreground-500 hover:text-foreground-700 transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jobs Table */}
      <div className="bg-white rounded-2xl border border-background-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-background-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground-950">Ingestion Jobs</h2>
          {loading && (
            <span className="flex items-center gap-1.5 text-xs text-foreground-400">
              <i className="ri-loader-4-line animate-spin"></i> Loading...
            </span>
          )}
        </div>

        {error && (
          <div className="p-5">
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3">
              <i className="ri-error-warning-line text-red-500"></i>
              <div>
                <p className="text-sm font-medium text-red-700">Failed to load jobs</p>
                <p className="text-xs text-red-500">{error}</p>
              </div>
              <button onClick={loadJobs} className="ml-auto px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition-colors whitespace-nowrap">
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-background-100 flex items-center justify-center mb-4">
              <i className="ri-inbox-line text-2xl text-foreground-300"></i>
            </div>
            <h3 className="text-base font-semibold text-foreground-900">No documents yet</h3>
            <p className="text-sm text-foreground-500 mt-1 text-center max-w-sm">
              Upload your first invoice, certificate, or RAMS document to get started with AI extraction
            </p>
            <button
              onClick={() => { setShowUpload(true); setActiveTab('upload'); }}
              className="mt-4 px-5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors whitespace-nowrap"
            >
              Upload a Document
            </button>
          </div>
        )}

        {jobs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-background-100">
                  <th className="px-5 py-3 text-xs font-semibold text-foreground-400 uppercase tracking-wider">Document</th>
                  <th className="px-5 py-3 text-xs font-semibold text-foreground-400 uppercase tracking-wider hidden sm:table-cell">Type</th>
                  <th className="px-5 py-3 text-xs font-semibold text-foreground-400 uppercase tracking-wider hidden md:table-cell">Size</th>
                  <th className="px-5 py-3 text-xs font-semibold text-foreground-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-foreground-400 uppercase tracking-wider hidden lg:table-cell">Date</th>
                  <th className="px-5 py-3 text-xs font-semibold text-foreground-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const st = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
                  const dt = DOCUMENT_TYPES.find((d) => d.value === job.document_type);
                  return (
                    <tr
                      key={job.id}
                      className={`border-b border-background-50 hover:bg-background-50/50 transition-colors ${
                        selectedJobId === job.id ? 'bg-primary-50/30' : ''
                      } ${['needs_review', 'ready'].includes(job.status) ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (['needs_review', 'ready'].includes(job.status)) openDetail(job.id);
                      }}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${dt?.color || 'bg-foreground-100'}`}>
                            <i className={`${dt?.icon || 'ri-file-line'} text-sm`}></i>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground-900 truncate max-w-[200px]">{job.document_name}</p>
                            {job.job_id && <p className="text-[11px] text-foreground-400">{job.job_id}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell">
                        <span className="text-xs text-foreground-600">{dt?.label || job.document_type}</span>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className="text-xs text-foreground-500">{formatBytes(job.file_size_bytes)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${st.color}`}>
                          <i className={`${st.icon} text-[10px]`}></i>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <span className="text-xs text-foreground-500">{formatDate(job.created_at)}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {job.status === 'queued' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleExtract(job.id, job.document_type); }}
                              disabled={extractingJobId === job.id}
                              className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-[11px] font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {extractingJobId === job.id ? 'Extracting...' : 'Extract'}
                            </button>
                          )}
                          {job.status === 'failed' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleExtract(job.id, job.document_type); }}
                              disabled={extractingJobId === job.id}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[11px] font-semibold hover:bg-amber-600 transition-colors whitespace-nowrap"
                            >
                              Retry
                            </button>
                          )}
                          {['needs_review', 'ready'].includes(job.status) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openDetail(job.id); }}
                              className="px-3 py-1.5 rounded-lg bg-background-100 text-foreground-700 text-[11px] font-semibold hover:bg-background-200 transition-colors whitespace-nowrap"
                            >
                              Review
                            </button>
                          )}
                          {job.status === 'excluded' && (
                            <span className="text-[11px] text-foreground-400">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Panel — Extraction Review */}
      {selectedJobId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closeDetail}></div>
          <div className="relative w-full max-w-3xl bg-white h-full overflow-y-auto shadow-2xl">
            {/* Panel header */}
            <div className="sticky top-0 bg-white z-10 border-b border-background-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground-950">Extraction Review</h2>
                {detail && (
                  <p className="text-xs text-foreground-500 mt-0.5">{detail.document_name}</p>
                )}
              </div>
              <button
                onClick={closeDetail}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-background-100 text-foreground-500 hover:bg-background-200 transition-colors"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>

            {/* Panel body */}
            <div className="p-6">
              {detailLoading && (
                <div className="flex items-center justify-center py-20">
                  <i className="ri-loader-4-line animate-spin text-2xl text-foreground-300"></i>
                </div>
              )}

              {detailError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-sm text-red-700">{detailError}</p>
                  <button onClick={() => selectedJobId && openDetail(selectedJobId)} className="mt-2 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition-colors">
                    Retry
                  </button>
                </div>
              )}

              {!detailLoading && !detailError && detail && (
                <div className="space-y-6">
                  {/* Document preview */}
                  {detail.signedUrl && (
                    <div className="rounded-xl border border-background-200 overflow-hidden bg-background-50">
                      <div className="px-4 py-2 border-b border-background-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground-500 uppercase tracking-wider">Document Preview</span>
                        <a
                          href={detail.signedUrl}
                          target="_blank"
                          rel="nofollow noopener noreferrer"
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium whitespace-nowrap"
                        >
                          <i className="ri-external-link-line mr-1"></i>Open in new tab
                        </a>
                      </div>
                      <div className="p-2">
                        {detail.mime_type?.startsWith('image/') ? (
                          <img src={detail.signedUrl} alt={detail.document_name} className="w-full max-h-[400px] object-contain rounded-lg" />
                        ) : (
                          <div className="flex items-center justify-center py-12 bg-background-100 rounded-lg">
                            <div className="text-center">
                              <i className="ri-file-pdf-line text-4xl text-foreground-300 mb-2 block"></i>
                              <p className="text-sm text-foreground-500">PDF / Document preview</p>
                              <a href={detail.signedUrl} target="_blank" rel="nofollow noopener noreferrer" className="text-xs text-primary-600 hover:underline mt-1 inline-block">
                                Open document
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Extraction results */}
                  {detail.extractions.length === 0 ? (
                    <div className="rounded-xl border border-background-200 p-8 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-background-100 flex items-center justify-center mx-auto mb-3">
                        <i className="ri-brain-line text-xl text-foreground-300"></i>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground-900">No extraction data yet</h3>
                      <p className="text-xs text-foreground-500 mt-1">Trigger AI extraction from the jobs list</p>
                    </div>
                  ) : (
                    detail.extractions.map((extraction) => (
                      <div key={extraction.id} className="space-y-4">
                        {/* Extraction header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground-950">
                              {extraction.template_name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                            </h3>
                            <p className="text-[11px] text-foreground-500">
                              {extraction.fields.length} fields extracted
                              {extraction.status === 'confirmed' && ' · Confirmed'}
                              {extraction.reviewed_at && ` · Reviewed ${formatDate(extraction.reviewed_at)}`}
                            </p>
                          </div>
                          {extraction.status !== 'confirmed' && (
                            <button
                              onClick={() => handleConfirmAll(extraction)}
                              disabled={confirming}
                              className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {confirming ? 'Confirming...' : 'Confirm All'}
                            </button>
                          )}
                        </div>

                        {/* Safety warning */}
                        {extraction.fields.some((f) => f.is_safety_critical) && (
                          <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2.5">
                            <i className="ri-alert-line text-red-500 mt-0.5"></i>
                            <div>
                              <p className="text-xs font-semibold text-red-700">Safety-Critical Fields</p>
                              <p className="text-[11px] text-red-600 mt-0.5">
                                Some fields relate to safety information. AI can help find and summarise information. A competent person must review safety decisions.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Financial warning */}
                        {extraction.fields.some((f) => f.is_financial) && (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2.5">
                            <i className="ri-money-pound-circle-line text-amber-500 mt-0.5"></i>
                            <div>
                              <p className="text-xs font-semibold text-amber-700">Financial Fields</p>
                              <p className="text-[11px] text-amber-600 mt-0.5">
                                Extracted financial values must be verified against the source document before use.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Fields */}
                        <div className="space-y-2">
                          {extraction.fields.map((field) => {
                            const currentValue = editedFields[field.id] ?? field.extracted_value ?? '';
                            const conf = getConfidenceBadge(field.confidence);
                            return (
                              <div
                                key={field.id}
                                className={`rounded-xl border p-4 transition-colors ${
                                  field.is_confirmed
                                    ? 'bg-emerald-50/30 border-emerald-100'
                                    : field.is_safety_critical
                                      ? 'bg-red-50/20 border-red-100'
                                      : field.is_financial
                                        ? 'bg-amber-50/20 border-amber-100'
                                        : 'bg-white border-background-200'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <p className="text-xs font-semibold text-foreground-700">
                                        {field.field_label || field.field_name}
                                      </p>
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${conf.cls}`}>
                                        {conf.label}
                                      </span>
                                      {field.is_safety_critical && (
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                                          Safety
                                        </span>
                                      )}
                                      {field.is_financial && (
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                          Financial
                                        </span>
                                      )}
                                    </div>
                                    {field.is_confirmed ? (
                                      <p className="text-sm text-foreground-900 font-medium">
                                        {field.edited_value || field.extracted_value}
                                        {field.edited_value && field.edited_value !== field.extracted_value && (
                                          <span className="text-[10px] text-foreground-400 ml-1.5">(edited)</span>
                                        )}
                                      </p>
                                    ) : (
                                      <input
                                        type="text"
                                        value={currentValue}
                                        onChange={(e) => handleFieldEdit(field.id, e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-background-200 text-sm focus:outline-none focus:border-primary-300 bg-white"
                                      />
                                    )}
                                    {field.source_highlight && (
                                      <p className="text-[10px] text-foreground-400 mt-1 truncate">
                                        Source: &ldquo;{field.source_highlight}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                  {!field.is_confirmed && (
                                    <button
                                      onClick={() => handleFieldConfirm(extraction.id, [field])}
                                      disabled={confirming}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors flex-shrink-0 disabled:opacity-50"
                                      title="Confirm this field"
                                    >
                                      <i className="ri-check-line text-sm"></i>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}