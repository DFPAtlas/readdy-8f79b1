import { Link } from 'react-router-dom';

export default function IngestionHub() {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-base font-semibold text-main">Field-to-Office Ingestion Hub</h3>
        <p className="text-xs text-muted mt-0.5">Review site documents and dictate daily-log drafts</p>
      </div>

      <div className="p-5 space-y-3">
        <Link
          to="/app/documents/ingestion"
          className="border-2 border-dashed border-border hover:border-primary-300 hover:bg-page rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors"
        >
          <span className="w-12 h-12 rounded-xl bg-primary-100 text-primary-500 flex items-center justify-center mb-3">
            <i className="ri-upload-cloud-2-line text-2xl" aria-hidden="true"></i>
          </span>
          <span className="text-sm font-semibold text-main">Open receipt, invoice or docket upload</span>
          <span className="text-xs text-muted mt-1">Choose a document in the upload workspace and review the result</span>
        </Link>

        <Link
          to="/mobile/field?tab=voice"
          className="w-full min-h-12 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <i className="ri-mic-line text-lg" aria-hidden="true"></i>
          Open Mobile Voice Daily Log
        </Link>
      </div>
    </div>
  );
}
