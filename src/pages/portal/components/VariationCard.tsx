import { useState } from 'react';
import { hubVariation } from '@/mocks/clientHub';
import { useToast } from '@/components/base/Toast';

function formatMoney(v: number): string {
  return '£' + v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function VariationCard({ accessToken }: { accessToken?: string }) {
  const { showToast } = useToast();
  const [queryOpen, setQueryOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [authorityChecked, setAuthorityChecked] = useState(false);
  const [approved, setApproved] = useState(false);

  const handleQuery = () => {
    showToast('Query sent to project team for clarification', 'info');
    setQueryText('');
    setQueryOpen(false);
  };

  const handleApprove = () => {
    showToast('Variation approved & digitally signed', 'success');
    setFullName('');
    setAuthorityChecked(false);
    setApproveOpen(false);
    setApproved(true);
  };

  return (
    <div className="bg-white border border-amber-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
          <i className="ri-error-warning-line"></i>
          Action Required
        </span>
        {accessToken && (
          <a
            href={`/client/${accessToken}/variations/${hubVariation.reference}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            View Full Breakdown <i className="ri-arrow-right-line"></i>
          </a>
        )}
      </div>

      <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">{hubVariation.reference}</p>
      <h3 className="text-base font-semibold text-slate-900 mt-1">Scope Variation Order</h3>
      <p className="text-sm font-bold text-slate-900 mt-2">{hubVariation.title}</p>
      <p className="text-sm text-slate-600 mt-1 leading-relaxed">{hubVariation.description}</p>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-sm">
        <span className="font-semibold text-slate-900">Cost: +{formatMoney(hubVariation.costImpact)}</span>
        <span className="font-semibold text-slate-900">
          Time: {hubVariation.timeImpactDays === 0 ? '+0 Days' : `+${hubVariation.timeImpactDays} days`}
        </span>
      </div>

      {/* Attachments */}
      <div className="flex flex-wrap gap-2 mt-4">
        {hubVariation.attachments.map((att) => (
          <button
            key={att.name}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors"
            onClick={() => showToast(`Previewing ${att.name}`, 'info')}
          >
            <i className={`${att.type === 'pdf' ? 'ri-file-pdf-line text-rose-500' : 'ri-image-line text-indigo-500'}`}></i>
            {att.name}
          </button>
        ))}
      </div>

      {/* Actions */}
      {!approved ? (
        <div className="flex flex-col sm:flex-row gap-2 mt-5">
          <button
            className="flex-1 h-11 border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap transition-colors"
            onClick={() => setQueryOpen(true)}
          >
            Query Request
          </button>
          <button
            className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap transition-colors"
            onClick={() => setApproveOpen(true)}
          >
            Approve &amp; Sign (+{formatMoney(hubVariation.costImpact)})
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-5 text-sm text-emerald-600">
          <i className="ri-shield-check-line"></i>
          Approved &amp; signed — contract total updated automatically
        </div>
      )}

      {/* Query modal */}
      {queryOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setQueryOpen(false)}></div>
          <div className="relative bg-white rounded-2xl w-[90vw] max-w-md p-6 z-10">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Query {hubVariation.reference}</h3>
            <p className="text-sm text-slate-500 mb-4">Your query will be sent to the project team for clarification.</p>
            <textarea
              className="w-full h-24 px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300"
              placeholder="e.g. Can you confirm the Velux size and warranty cover…"
              maxLength={500}
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 text-right mt-1">{queryText.length}/500</p>
            <div className="flex gap-3 mt-5">
              <button
                className="flex-1 h-11 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                onClick={() => setQueryOpen(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!queryText.trim()}
                onClick={handleQuery}
              >
                Send Query
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve & Sign modal */}
      {approveOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setApproveOpen(false)}></div>
          <div className="relative bg-white rounded-2xl w-[90vw] max-w-md p-6 z-10">
            <h3 className="text-base font-semibold text-slate-900 mb-2">Approve &amp; Sign {hubVariation.reference}</h3>
            <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Variation value</span>
                <span className="font-semibold text-slate-900">{formatMoney(hubVariation.costImpact)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Schedule impact</span>
                <span className="font-semibold text-slate-900">No change</span>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Full legal name</label>
                <input
                  type="text"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300"
                  placeholder="e.g. Sarah Thompson"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={authorityChecked}
                  onChange={(e) => setAuthorityChecked(e.target.checked)}
                  className="mt-0.5 accent-indigo-600"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I confirm I have authority to approve this variation and agree to the revised contract total.
                </span>
              </label>
            </div>
            <p className="text-[10px] text-slate-400 mt-3">
              By signing you authorise BuildNerve to proceed. This action is audit-logged and time-stamped.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                className="flex-1 h-11 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                onClick={() => setApproveOpen(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!fullName.trim() || !authorityChecked}
                onClick={handleApprove}
              >
                Sign &amp; Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}