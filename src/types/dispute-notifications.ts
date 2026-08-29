// BuildNerve — Dispute notifications, reminders & deadline tracking shared types.
// Neutral domain model: platform deadlines are tracked for clarity only and
// never decide liability or close a dispute.

// ─── Deadline domain ────────────────────────────────────────────────────────

export type DisputeDeadlineType =
  | 'initial_response'
  | 'clarification_response'
  | 'offer_expiry'
  | 'settlement_obligation'
  | 'pre_action_response'
  | 'admin_review';

export type DisputeDeadlineStatus =
  | 'scheduled'
  | 'due_soon'
  | 'due_today'
  | 'overdue'
  | 'completed'
  | 'cancelled'
  | 'superseded';

export interface DisputeDeadline {
  id: string;
  dispute_id: string;
  deadline_type: DisputeDeadlineType;
  related_record_type: string | null;
  related_record_id: string | null;
  title: string;
  actor_user_id: string | null;
  actor_role: 'claimant' | 'respondent' | null;
  due_at: string;
  timezone: string;
  is_platform_deadline: boolean;
  status: DisputeDeadlineStatus;
  completed_at: string | null;
  superseded_by: string | null;
  created_at: string;
  updated_at: string;
  // Enriched
  actor_name: string | null;
  time_remaining: string | null;
  overdue: boolean;
}

// ─── Notification preferences ───────────────────────────────────────────────

export interface DisputeNotificationPreferences {
  id: string | null;
  email_reminders_enabled: boolean;
  reminder_days: number[];
  overdue_reminder_enabled: boolean;
}

export const ALLOWED_REMINDER_DAYS = [7, 3, 1, 0] as const;

export const REMINDER_DAY_LABELS: Record<number, string> = {
  7: 'Seven days before',
  3: 'Three days before',
  1: 'One day before',
  0: 'On the due date',
};

// ─── Notification history ───────────────────────────────────────────────────

export interface DisputeNotificationRecord {
  id: string;
  notification_type: string;
  category: string;
  title: string;
  body: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  action_route: string | null;
  action_label: string | null;
  read_at: string | null;
  created_at: string;
}

// ─── Workspace envelope ─────────────────────────────────────────────────────

export interface DisputeDeadlineSummary {
  nextDeadline: DisputeDeadline | null;
  openCount: number;
  overdueCount: number;
  completedCount: number;
  totalCount: number;
}

export interface DisputeNotificationsWorkspace {
  isParty: boolean;
  deadlines: DisputeDeadline[];
  summary: DisputeDeadlineSummary;
  preferences: DisputeNotificationPreferences;
  notifications: DisputeNotificationRecord[];
  unreadCount: number;
}

// ─── Label maps ─────────────────────────────────────────────────────────────

export const DISPUTE_DEADLINE_TYPE_LABELS: Record<DisputeDeadlineType, string> = {
  initial_response: 'Initial response',
  clarification_response: 'Clarification response',
  offer_expiry: 'Settlement offer response',
  settlement_obligation: 'Settlement obligation',
  pre_action_response: 'Pre-action response',
  admin_review: 'Admin review',
};

export const DISPUTE_DEADLINE_STATUS_LABELS: Record<DisputeDeadlineStatus, string> = {
  scheduled: 'Scheduled',
  due_soon: 'Due soon',
  due_today: 'Due today',
  overdue: 'Overdue',
  completed: 'Completed',
  cancelled: 'Cancelled',
  superseded: 'Superseded',
};

// Which party a deadline is "actionable" by — used for calm "who must act" copy.
export const DISPUTE_DEADLINE_ACTOR_LABELS: Record<DisputeDeadlineType, string> = {
  initial_response: 'the responding party',
  clarification_response: 'the other party',
  offer_expiry: 'the other party',
  settlement_obligation: 'the responsible party',
  pre_action_response: 'the other party',
  admin_review: 'a BuildNerve administrator',
};