import { useState } from 'react';
import { useToast } from '@/components/base/Toast';

export default function IngestionHub() {
  const { showToast } = useToast();
  const [dragging, setDragging] = useState(false);

  const handleUpload = () => {
    showToast('Upload dialog opening — drop a receipt, invoice or docket for OCR.', 'info');
  };

  const handleVoice = () => {
    showToast('Opening Mobile Voice Daily Log...', 'info');
  };

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-base font-semibold text-main">Field-to-Office Ingestion Hub</h3>
        <p className="text-xs text-muted mt-0.5">Bring paperwork from site straight into the ledger</p>
      </div>

      <div className="p-5 space-y-3">
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            showToast('Files queued for OCR extraction.', 'success');
          }}
          onClick={handleUpload}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
            dragging ? 'border-primary-400 bg-primary-50' : 'border-border hover:border-primary-300 hover:bg-page'
          }`}
        >
          <span className="w-12 h-12 rounded-xl bg-primary-100 text-primary-500 flex items-center justify-center mb-3">
            <i className="ri-upload-cloud-2-line text-2xl"></i>
          </span>
          <p className="text-sm font-semibold text-main">Upload Material Receipt, Invoice or Docket</p>
          <p className="text-xs text-muted mt-1">Drag &amp; drop, or click to browse · OCR auto-extracts line items</p>
        </div>

        {/* Voice log */}
        <button
          onClick={handleVoice}
          className="w-full h-12 px-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
        >
          <i className="ri-mic-line text-lg"></i>
          Open Mobile Voice Daily Log
        </button>
      </div>
    </div>
  );
}