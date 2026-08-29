import { useEffect, useState } from 'react';
import { disputeAdminService } from '@/services/dispute-admin.service';
import type { GuidanceVersion } from '@/types/dispute-admin';
import { GUIDANCE_VERSION_STATUS_LABELS } from '@/types/dispute-admin';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-800 text-slate-300',
  published: 'bg-emerald-500/10 text-emerald-400',
  retired: 'bg-slate-800 text-slate-500',
};

export default function GuidanceGovernance() {
  const [items, setItems] = useState<GuidanceVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [sectionId, setSectionId] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    disputeAdminService
      .listGuidanceVersions()
      .then((d) => setItems(d.items))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load guidance'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    disputeAdminService
      .listGuidanceVersions()
      .then((d) => {
        if (active) setItems(d.items);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load guidance');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const submitDraft = async () => {
    if (!sectionId.trim() || !title.trim()) {
      setMsg('Section ID and title are required.');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await disputeAdminService.draftGuidance(sectionId.trim(), title.trim(), summary.trim() || null, { blocks: [] });
      setMsg('Draft created.');
      setDrafting(false);
      setSectionId('');
      setTitle('');
      setSummary('');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to draft');
    } finally {
      setBusy(false);
    }
  };

  const publish = async (id: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await disputeAdminService.publishGuidance(id);
      setMsg(r.message);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to publish');
    } finally {
      setBusy(false);
    }
  };

  const retire = async (id: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await disputeAdminService.retireGuidance(id);
      setMsg(r.message);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to retire');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">Published versions are preserved — publishing a new version retires the previous one, never overwrites it.</p>
        <button
          onClick={() => setDrafting((v) => !v)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-add-line mr-1.5"></i>Draft version
        </button>
      </div>

      {msg && <p className="text-emerald-400 text-xs">{msg}</p>}

      {drafting && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <input
            type="text"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            placeholder="Section ID (e.g. construction-engineering)"
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Summary"
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
          <button
            disabled={busy}
            onClick={submitDraft}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            Save draft
          </button>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Section</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Version</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Status</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden md:table-cell">Published</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.map((v) => (
                <tr key={v.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{v.title}</p>
                    <p className="text-slate-500 text-[11px] font-mono">{v.section_id}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-sm">v{v.version}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[v.status]}`}>
                      {GUIDANCE_VERSION_STATUS_LABELS[v.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-slate-400 text-xs">{v.published_at ? new Date(v.published_at).toLocaleDateString('en-GB') : '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {v.status === 'draft' && (
                        <button
                          disabled={busy}
                          onClick={() => publish(v.id)}
                          className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/20 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                        >
                          Publish
                        </button>
                      )}
                      {v.status === 'published' && (
                        <button
                          disabled={busy}
                          onClick={() => retire(v.id)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
                        >
                          Retire
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-sm">No guidance versions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}