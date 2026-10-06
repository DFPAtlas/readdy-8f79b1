import { useEffect, useState } from 'react';
import type { SelectedEvidenceFile } from '@/lib/evidence';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

interface SelectedFilesListProps {
  files: SelectedEvidenceFile[];
  onRemove: (id: string) => void;
  labels: { heading: string; remove: string };
}

export default function SelectedFilesList({ files, onRemove, labels }: SelectedFilesListProps) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    files.forEach((f) => {
      if (f.file.type.startsWith('image/')) next[f.id] = URL.createObjectURL(f.file);
    });
    setUrls(next);
    return () => {
      Object.values(next).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  if (files.length === 0) return null;

  return (
    <div className="bg-white border border-border rounded-2xl p-4">
      <p className="text-xs font-semibold text-main mb-3">
        {labels.heading.replace('{{count}}', String(files.length))}
      </p>
      <div className="space-y-2">
        {files.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-2.5 bg-page rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-white border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
              {urls[item.id] ? (
                <img src={urls[item.id]} alt={item.file.name} className="w-full h-full object-cover" />
              ) : (
                <i className={`${item.file.type.startsWith('audio/') ? 'ri-mic-line' : 'ri-file-line'} text-muted`}></i>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-main truncate">{item.file.name}</p>
              <p className="text-[10px] text-muted">{formatBytes(item.file.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="h-8 px-2.5 text-[11px] font-medium text-status-red hover:bg-status-red-pale rounded-lg cursor-pointer whitespace-nowrap"
            >
              {labels.remove}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}