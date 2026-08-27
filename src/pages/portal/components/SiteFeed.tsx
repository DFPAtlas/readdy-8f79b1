import { useState } from 'react';
import { sitePhotos, type SitePhoto } from '@/mocks/clientHub';

export default function SiteFeed() {
  const [activePhoto, setActivePhoto] = useState<SitePhoto | null>(null);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-slate-900">Live Site Feed</h2>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Live
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-4">Geotagged photo updates from your site manager</p>

      <div className="grid grid-cols-2 gap-2.5">
        {sitePhotos.map((photo) => (
          <button
            key={photo.id}
            className="text-left cursor-pointer group"
            onClick={() => setActivePhoto(photo)}
          >
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-100">
              <img
                src={photo.imageUrl}
                alt={photo.caption}
                className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                <i className="ri-map-pin-line"></i>
                <span>{photo.location}</span>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-800 mt-1.5 leading-snug line-clamp-2">{photo.caption}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {new Date(photo.dateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {activePhoto && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/70" onClick={() => setActivePhoto(null)}></div>
          <div className="relative bg-white rounded-2xl overflow-hidden w-[92vw] max-w-3xl z-10">
            <img src={activePhoto.imageUrl} alt={activePhoto.caption} className="w-full max-h-[70vh] object-cover" />
            <div className="p-4">
              <p className="text-sm font-medium text-slate-900">{activePhoto.caption}</p>
              <p className="text-xs text-slate-500 mt-1">
                <i className="ri-map-pin-line"></i> {activePhoto.location} ·{' '}
                {new Date(activePhoto.dateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white cursor-pointer"
              onClick={() => setActivePhoto(null)}
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}