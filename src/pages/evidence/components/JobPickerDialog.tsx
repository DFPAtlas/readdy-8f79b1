import { useMemo, useState } from 'react';

export interface PickerJob {
  id: string;
  reference: string;
  project_name: string;
}

interface JobPickerDialogProps {
  open: boolean;
  jobs: PickerJob[];
  title: string;
  description: string;
  emptyText: string;
  searchPlaceholder: string;
  selectLabel: string;
  cancelLabel: string;
  onSelect: (jobId: string) => void;
  onCancel: () => void;
}

/**
 * Lets the user choose which job a capture / daily log / evidence pack belongs to.
 * Displays only real jobs loaded from the backend — never sample data.
 */
export default function JobPickerDialog({
  open,
  jobs,
  title,
  description,
  emptyText,
  searchPlaceholder,
  selectLabel,
  cancelLabel,
  onSelect,
  onCancel,
}: JobPickerDialogProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return jobs;
    return jobs.filter(
      (j) =>
        j.reference.toLowerCase().includes(s) ||
        (j.project_name || '').toLowerCase().includes(s),
    );
  }, [jobs, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl w-[92vw] max-w-md p-5 max-h-[80vh] flex flex-col">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
            <i className="ri-briefcase-line text-lg"></i>
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-main">{title}</h2>
            <p className="text-xs text-muted mt-0.5">{description}</p>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-page flex items-center justify-center mx-auto mb-3">
              <i className="ri-briefcase-line text-xl text-muted"></i>
            </div>
            <p className="text-sm text-muted">{emptyText}</p>
          </div>
        ) : (
          <>
            <div className="relative mb-3">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-10 pl-9 pr-3 bg-page border border-border rounded-xl text-sm focus:outline-none focus:border-primary-300"
              />
            </div>
            <div className="overflow-y-auto -mx-1 px-1 space-y-1.5 flex-1">
              {filtered.map((job) => (
                <button
                  key={job.id}
                  onClick={() => onSelect(job.id)}
                  className="w-full flex items-center gap-3 p-3 border border-border rounded-xl hover:border-primary-200 hover:bg-primary-50/40 transition-colors cursor-pointer text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-page flex items-center justify-center flex-shrink-0">
                    <i className="ri-briefcase-4-line text-muted"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-main truncate">{job.project_name}</p>
                    <p className="text-[11px] text-muted">{job.reference}</p>
                  </div>
                  <span className="text-xs font-medium text-primary-600 whitespace-nowrap flex items-center gap-1">
                    {selectLabel}
                    <i className="ri-arrow-right-s-line"></i>
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-muted text-center py-6">{emptyText}</p>
              )}
            </div>
          </>
        )}

        <button
          onClick={onCancel}
          className="mt-4 h-10 border border-border text-main rounded-xl text-sm font-semibold hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}