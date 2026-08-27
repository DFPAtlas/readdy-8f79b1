import { documentLibrary } from '@/mocks/clientHub';
import { useToast } from '@/components/base/Toast';

export default function DocumentLibrary() {
  const { showToast } = useToast();

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <h2 className="text-base font-semibold text-slate-900">Project Document Library</h2>
      <p className="text-xs text-slate-500 mt-1 mb-4">Key drawings, approvals &amp; certificates</p>

      <div className="space-y-1">
        {documentLibrary.map((doc) => (
          <button
            key={doc.id}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left cursor-pointer hover:bg-slate-50 transition-colors"
            onClick={() => showToast(`Downloading ${doc.name}`, 'info')}
          >
            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 shrink-0">
              <i className={`${doc.icon} text-base`}></i>
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-slate-900 truncate">{doc.name}</span>
              <span className="block text-xs text-slate-500">{doc.meta}</span>
            </span>
            <i className="ri-download-2-line text-slate-400"></i>
          </button>
        ))}
      </div>
    </div>
  );
}