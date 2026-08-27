// OCR Receipt & Delivery Note Scanner — AI extraction and cost-code matching
import { useState, useRef } from 'react';
import { ocrLineItems, ocrMerchant } from '@/mocks/field';

type ScanState = 'idle' | 'scanning' | 'done';

export default function ScannerTab() {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [approved, setApproved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const total = ocrLineItems.reduce((sum, item) => sum + item.amount, 0);

  const triggerScan = () => {
    setApproved(false);
    setScanState('scanning');
    setTimeout(() => setScanState('done'), 1900);
  };

  const retake = () => {
    setApproved(false);
    setScanState('idle');
  };

  const approve = () => {
    setApproved(true);
  };

  const costCodeTone = (code: string) => {
    if (code.startsWith('01')) return 'bg-slate-100 text-slate-700';
    if (code.startsWith('03')) return 'bg-amber-100 text-amber-700';
    if (code.startsWith('04')) return 'bg-sky-100 text-sky-700';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-4">
      {/* Camera viewfinder / ingestion */}
      {scanState !== 'done' && (
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="relative h-64 bg-slate-900 flex items-center justify-center">
            {/* Corner alignment guides */}
            <span className="absolute top-4 left-4 w-10 h-10 border-t-2 border-l-2 border-amber-400 rounded-tl-lg" />
            <span className="absolute top-4 right-4 w-10 h-10 border-t-2 border-r-2 border-amber-400 rounded-tr-lg" />
            <span className="absolute bottom-4 left-4 w-10 h-10 border-b-2 border-l-2 border-amber-400 rounded-bl-lg" />
            <span className="absolute bottom-4 right-4 w-10 h-10 border-b-2 border-r-2 border-amber-400 rounded-br-lg" />

            {scanState === 'idle' ? (
              <div className="text-center text-slate-400">
                <i className="ri-scan-2-line text-5xl mb-3 block"></i>
                <p className="text-sm font-medium text-slate-300">Align Delivery Note or Invoice</p>
                <p className="text-xs text-slate-500 mt-1">Keep the document flat and well-lit</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="relative w-40 h-1.5 bg-slate-700 rounded-full overflow-hidden mx-auto mb-4">
                  <span className="scan-line absolute inset-y-0 w-1/2 bg-amber-400 rounded-full" />
                </div>
                <p className="text-sm font-medium text-amber-300 animate-pulse">Reading document…</p>
                <p className="text-xs text-slate-500 mt-1">Running OCR &amp; AI extraction</p>
              </div>
            )}
          </div>

          <div className="p-4 grid grid-cols-2 gap-3">
            <button
              onClick={triggerScan}
              className="h-12 rounded-xl bg-amber-500 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-amber-600 active:scale-[0.98] transition-all"
            >
              <i className="ri-camera-line"></i>
              Take Photo
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-12 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
            >
              <i className="ri-upload-2-line"></i>
              Upload / PDF
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={triggerScan}
            />
          </div>
        </section>
      )}

      {/* Post-scan extraction */}
      {scanState === 'done' && !approved && (
        <section className="space-y-4 animate-fade-in">
          {/* Merchant receipt thumbnail + confidence */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-20 h-28 bg-slate-50 border border-slate-200 rounded-lg flex-shrink-0 flex flex-col items-center justify-center text-center px-2">
                <i className="ri-store-2-line text-xl text-slate-400 mb-1"></i>
                <p className="text-[9px] font-semibold text-slate-600 leading-tight">
                  {ocrMerchant.name}
                </p>
                <p className="text-[8px] text-slate-400 mt-0.5">{ocrMerchant.docket}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-900">{ocrMerchant.name}</span>
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full px-2.5 py-1">
                    <i className="ri-sparkling-2-line"></i>
                    {ocrMerchant.confidence}%
                  </span>
                </div>
                <p className="text-xs text-slate-500">{ocrMerchant.branch}</p>
                <p className="text-xs text-slate-500">{ocrMerchant.docket} · {ocrMerchant.date}</p>
                <p className="text-xs font-semibold text-slate-700 mt-1.5">
                  AI Extraction Confidence: {ocrMerchant.confidence}%
                </p>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Extracted Line Items
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {ocrLineItems.map((item) => (
                <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 leading-snug">{item.description}</p>
                    <span className={`inline-block mt-1 text-[11px] font-semibold rounded-md px-2 py-0.5 ${costCodeTone(item.costCode)}`}>
                      {item.costCode}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                    £{item.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Total</span>
              <span className="text-sm font-bold text-slate-900">£{total.toFixed(2)}</span>
            </div>
          </div>

          {/* PO match alert */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <i className="ri-check-line text-lg"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-800">
                Matched to {ocrMerchant.poRef}
              </p>
              <p className="text-xs text-emerald-600">Variance: {ocrMerchant.variance}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={retake}
              className="h-12 px-5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Retake Photo
            </button>
            <button
              onClick={approve}
              className="flex-1 h-12 rounded-xl bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
            >
              <i className="ri-check-line"></i>
              Approve &amp; Post to Job Costs
            </button>
          </div>
        </section>
      )}

      {/* Approved state */}
      {approved && (
        <section className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
            <i className="ri-check-line text-3xl"></i>
          </div>
          <p className="text-lg font-semibold text-slate-900">Posted to job costs</p>
          <p className="text-sm text-slate-500 mt-1">
            £{total.toFixed(2)} allocated across {ocrLineItems.length} cost codes.
          </p>
          <div className="flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
            <i className="ri-cloud-line"></i>
            Matched to {ocrMerchant.poRef}
          </div>
          <button
            onClick={retake}
            className="mt-5 h-11 px-6 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors"
          >
            Scan Another Document
          </button>
        </section>
      )}
    </div>
  );
}