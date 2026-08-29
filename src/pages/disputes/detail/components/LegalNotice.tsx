export default function LegalNotice() {
  return (
    <div className="bg-page rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
          <i className="ri-information-line text-primary-600"></i>
        </span>
        <h4 className="text-sm font-semibold text-main">Legal guidance</h4>
      </div>
      <ul className="space-y-2 text-xs text-muted">
        <li className="flex gap-2">
          <span className="text-primary-500 flex-shrink-0">•</span>
          <span>Initial guidance covers England and Wales.</span>
        </li>
        <li className="flex gap-2">
          <span className="text-primary-500 flex-shrink-0">•</span>
          <span>BuildNerve provides general information, not legal advice.</span>
        </li>
        <li className="flex gap-2">
          <span className="text-primary-500 flex-shrink-0">•</span>
          <span>BuildNerve does not determine liability or predict court outcomes.</span>
        </li>
        <li className="flex gap-2">
          <span className="text-primary-500 flex-shrink-0">•</span>
          <span>You may wish to obtain independent legal advice.</span>
        </li>
      </ul>
    </div>
  );
}