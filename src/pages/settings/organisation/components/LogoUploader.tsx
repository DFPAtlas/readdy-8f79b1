import { useRef } from 'react';

interface LogoUploaderProps {
  canEdit: boolean;
  previewUrl: string | null;
  uploading: boolean;
  onSelectFile: (file: File) => void;
}

export default function LogoUploader({ canEdit, previewUrl, uploading, onSelectFile }: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="bg-white rounded-2xl border border-background-200 p-5">
      <h2 className="text-sm font-semibold text-foreground-950 mb-4">Company logo</h2>
      <div className="flex flex-wrap items-center gap-5">
        <div className="w-20 h-20 rounded-2xl border border-background-200 bg-background-50 flex items-center justify-center overflow-hidden flex-shrink-0">
          {previewUrl ? (
            <img src={previewUrl} alt="Company logo" className="w-full h-full object-contain p-1.5" />
          ) : (
            <i className="ri-image-2-line text-2xl text-foreground-300"></i>
          )}
        </div>

        {canEdit && (
          <div>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onSelectFile(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="h-10 px-4 inline-flex items-center gap-2 rounded-xl border border-background-300 bg-white text-sm font-semibold text-foreground-800 hover:bg-background-50 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              <i className={uploading ? 'ri-loader-4-line animate-spin' : 'ri-upload-2-line'}></i>
              {uploading ? 'Uploading…' : previewUrl ? 'Replace logo' : 'Upload logo'}
            </button>
            <p className="text-xs text-foreground-400 mt-2">PNG, JPEG or WebP up to 5 MB. Saved automatically.</p>
          </div>
        )}

        {!canEdit && !previewUrl && (
          <p className="text-sm text-foreground-500">No logo uploaded yet.</p>
        )}
      </div>
    </section>
  );
}