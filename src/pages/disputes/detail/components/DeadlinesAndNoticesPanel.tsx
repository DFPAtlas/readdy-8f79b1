import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { disputeNotificationsService } from '@/services/dispute-notifications.service';
import type { Dispute } from '@/types/disputes';
import type { DisputeNotificationsWorkspace } from '@/types/dispute-notifications';
import DeadlinesPanel from './DeadlinesPanel';
import NotificationsPanel from './NotificationsPanel';

interface DeadlinesAndNoticesPanelProps {
  dispute: Dispute;
  currentUserId: string | null;
  onChanged?: () => void;
}

export default function DeadlinesAndNoticesPanel({
  dispute,
  currentUserId,
  onChanged,
}: DeadlinesAndNoticesPanelProps) {
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<DisputeNotificationsWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ws = await disputeNotificationsService.getWorkspace(dispute.id);
      setWorkspace(ws);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deadlines');
    } finally {
      setLoading(false);
    }
  }, [dispute.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdatePreferences = async (prefs: {
    emailRemindersEnabled: boolean;
    overdueReminderEnabled: boolean;
    reminderDays: number[];
  }) => {
    if (!dispute.organisation_id) return;
    setSaving(true);
    try {
      const result = await disputeNotificationsService.updatePreferences(dispute.organisation_id, prefs);
      setWorkspace((prev) => prev ? { ...prev, preferences: { ...prev.preferences, ...result.preferences } } : prev);
    } catch {
      // keep local state; the toggle already reflected the user's intent
    } finally {
      setSaving(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    await disputeNotificationsService.markRead(id);
    setWorkspace((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        unreadCount: Math.max(0, prev.unreadCount - 1),
        notifications: prev.notifications.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
        ),
      };
    });
  };

  const handleMarkAllRead = async () => {
    if (!workspace) return;
    const unread = workspace.notifications.filter((n) => !n.read_at).map((n) => n.id);
    await disputeNotificationsService.markAllRead(unread);
    setWorkspace((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        unreadCount: 0,
        notifications: prev.notifications.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
      };
    });
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <i className="ri-loader-4-line text-2xl text-primary-500 animate-spin"></i>
        <p className="text-sm text-muted mt-3">Loading deadlines…</p>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-status-red-pale flex items-center justify-center mx-auto">
          <i className="ri-error-warning-line text-xl text-status-red"></i>
        </div>
        <p className="text-sm text-muted mt-3">{error ?? 'Could not load deadlines.'}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 h-10 px-5 rounded-xl border border-border bg-white hover:bg-page text-main text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DeadlinesPanel
        caseReference={dispute.case_reference}
        deadlines={workspace.deadlines}
        summary={workspace.summary}
        currentUserId={currentUserId}
      />

      <NotificationsPanel
        notifications={workspace.notifications}
        unreadCount={workspace.unreadCount}
        preferences={workspace.preferences}
        saving={saving}
        onUpdatePreferences={handleUpdatePreferences}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
      />

      <button
        type="button"
        onClick={() => navigate('/notifications')}
        className="w-full h-10 rounded-xl border border-border bg-white hover:bg-page text-main text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
      >
        <i className="ri-external-link-line text-muted"></i>
        View all notifications
      </button>
    </div>
  );
}