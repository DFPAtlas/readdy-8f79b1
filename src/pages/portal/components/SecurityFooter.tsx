export default function SecurityFooter() {
  return (
    <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <span className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 shrink-0">
        <i className="ri-lock-2-line text-xl"></i>
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold">Secure Client Portal</p>
        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
          All variations signed here update contract totals automatically and create an immutable audit record.
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 whitespace-nowrap">
        <i className="ri-shield-check-line text-emerald-400"></i>
        256-bit encrypted
      </span>
    </div>
  );
}