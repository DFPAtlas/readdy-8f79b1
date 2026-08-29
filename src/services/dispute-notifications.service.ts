// BuildNerve — Dispute notifications, reminders & deadline tracking service.
// Reads and writes go through the `dispute-notifications` edge function so
// recipients, deadlines and preferences are always resolved server-side.

import { getSupabase } from '@/lib/supabase';
import type {
  DisputeNotificationsWorkspace,
  DisputeNotificationPreferences,
} from '@/types/dispute-notifications';

const FUNCTION_URL = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/dispute-notifications`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Backend not connected');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function call<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
  const headers = await getAuthHeaders();
  const resp = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error((data as { error?: string })?.error || 'Operation failed');
  return data as T;
}

export const disputeNotificationsService = {
  async getWorkspace(disputeId: string): Promise<DisputeNotificationsWorkspace> {
    return call<DisputeNotificationsWorkspace>('get_workspace', { disputeId });
  },

  async updatePreferences(
    organisationId: string,
    preferences: {
      emailRemindersEnabled: boolean;
      overdueReminderEnabled: boolean;
      reminderDays: number[];
    },
  ): Promise<{ preferences: DisputeNotificationPreferences }> {
    return call('update_preferences', {
      organisationId,
      emailRemindersEnabled: preferences.emailRemindersEnabled,
      overdueReminderEnabled: preferences.overdueReminderEnabled,
      reminderDays: preferences.reminderDays,
    });
  },

  async markRead(notificationId: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);
  },

  async markAllRead(notificationIds: string[]): Promise<void> {
    const supabase = getSupabase();
    if (!supabase || notificationIds.length === 0) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', notificationIds);
  },
};