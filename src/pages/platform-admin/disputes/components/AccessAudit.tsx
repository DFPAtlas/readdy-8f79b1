import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { disputeAdminService } from '@/services/dispute-admin.service';
import type { AdminAccessRecord, AdminAccessAlerts } from '@/types/dispute-admin';

export default function AccessAudit() {
  const [items, setItems] = useState<AdminAccessRecord[]>([]);
  const [alerts, setAlerts] = useState<AdminAccessAlerts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    disputeAdminService
      .listAccessAudit()
      .then((d) => {
        if (active) {
          setItems(d.items);
          setAlerts(d.alerts);
        }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load access audit');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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

  const hasAlerts =
    alerts &&
    (alerts.repeatedAccessWithoutAction.length > 0 ||
      alerts.largeVolumeDownloads.length > 0 ||
      alerts.repeatedFailedPermissionChecks.length > 0);

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {hasAlerts && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <h2 className="text-white text-sm font-semibold flex items-center gap-2">
            <i className="ri-alert-line text-amber-400"></i>Rule-based alerts
          </h2>
          {alerts!.repeatedAccessWithoutAction.map((a) => (
            <p key={`ra-${a.admin_name}`} className="text-amber-400/90 text-xs">
              {a.admin_name}: {a.count} case accesses without a recorded action.
            </p>
          ))}
          {alerts!.largeVolumeDownloads.map((a) => (
            <p key={`lv-${a.admin_name}`} className="text-amber-400/90 text-xs">
              {a.admin_name}: {a.files} evidence files downloaded.
            </p>
          ))}
          {alerts!.repeatedFailedPermissionChecks.map((a) => (
            <p key={`rf-${a.admin_name}`} className="text-amber-400/90 text-xs">
              {a.admin_name}: {a.count} failed permission checks.
            </p>
          ))}
          <p className="text-slate-500 text-[11px]">These are simple threshold checks, not anomaly detection.</p>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Admin</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Case</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden md:table-cell">Reason</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden lg:table-cell">Evidence previewed</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs hidden xl:table-cell">Files</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{r.admin_name || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/platform-admin/disputes/${r.dispute_id}`} className="text-amber-400 text-xs font-mono hover:underline">
                      {r.case_reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-slate-400 text-xs truncate max-w-[240px]">{r.access_reason || '—'}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <p className="text-slate-400 text-xs">{r.evidence_previewed.length > 0 ? r.evidence_previewed.join(', ') : '—'}</p>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <p className="text-slate-400 text-xs">{r.files_downloaded.length}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500 text-xs">
                    {new Date(r.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">No access records yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-slate-500 text-xs">Every case open and evidence preview is recorded with the admin's identity and reason.</p>
    </div>
  );
}