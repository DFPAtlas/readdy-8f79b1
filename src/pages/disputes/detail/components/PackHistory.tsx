import { useCallback } from 'react';
import type { DisputeExport } from '@/types/dispute-export';
import { EXPORT_PURPOSE_LABELS, EXPORT_PERSPECTIVE_LABELS, EXPORT_STATUS_LABELS } from '@/types/dispute-export';
import { disputeExportService } from '@/services/dispute-export.service';
import { formatDateTime } from '@/pages/disputes/helpers';
import { useToast } from '@/components/base/Toast';

interface PackHistoryProps {
  packs: DisputeExport[];
  onChanged: () => void;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function StatusPill({ status }: { status: DisputeExport['status'] }) {
  const tone =
    status === 'ready'
      ? 'bg-status-green-pale text-status-green'
      : status === 'failed'
        ? 'bg-status-red-pale text-status-red'
        : status === 'superseded'
          ? 'bg-page text-muted'
          : status === 'expired'
            ? 'bg-status-amber-pale text-status-amber'
            : 'bg-status-amber-pale text-status-amber';
  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${tone}`}>
      {EXPORT_STATUS_LABELS[status]}
    </span>
  );
}

export default function PackHistory({ packs, onChanged }: PackHistoryProps) {
  const { showToast } = useToast();

  const download = useCallback(
    async (pack: DisputeExport, kind: 'pdf' | 'zip') => {
      try {
        const res = await disputeExportService.download(pack.id, kind);
        triggerDownload(res.url, res.filename);
        onChanged();
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Download failed', 'error');
      }
    },
    [onChanged, showToast],
  );

  if (packs.length === 0) {
    return (
      <div className="mt-5 py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-page flex items-center justify-center mx-auto mb-3">
          <i className="ri-archive-line text-2xl text-muted"></i>
        </div>
        <h3 className="text-sm font-semibold text-main">No packs generated yet</h3>
        <p className="text-sm text-muted mt-1">Configure and generate your first evidence pack above.</p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-2.5">
      {packs.map((p) => (
        <div
          key={p.id}
          className={`rounded-xl border border-border p-4 ${p.status === 'superseded' ? 'opacity-70' : ''}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-main whitespace-nowrap">v{p.version}</span>
                <StatusPill status={p.status} />
                {p.supersedes_export_id && (
                  <span className="text-[11px] text-muted flex items-center gap-1">
                    <i className="ri-refresh-line"></i>Supersedes v{(p.version ?? 1) - 1}
                  </span>
                )}
              </div>
              <p className="text-sm text-main mt-1 truncate">{p.title}</p>
              <p className="text-xs text-muted mt-0.5">
                {EXPORT_PURPOSE_LABELS[p.purpose]} · {EXPORT_PERSPECTIVE_LABELS[p.perspective]}
              </p>
              <p className="text-xs text-muted mt-0.5">
                By {p.created_by_name ?? 'Party'} · {formatDateTime(p.created_at)} · {p.item_count} records · {p.file_count} files
              </p>
              {p.missing_items && p.missing_items.length > 0 && (
                <p className="text-[11px] text-status-amber mt-1 flex items-center gap-1">
                  <i className="ri-error-warning-line"></i>
                  {p.missing_items.length} item(s) could not be retrieved
                </p>
              )}
            </div>
            {p.status === 'ready' && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => download(p, 'pdf')}
                  className="h-9 px-3 rounded-lg border border-border text-main text-xs font-medium hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => download(p, 'zip')}
                  className="h-9 px-3 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  Download ZIP
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}