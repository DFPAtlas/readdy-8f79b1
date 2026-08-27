// ─── Types ───────────────────────────────────────────────

export type NotificationCategory =
  | 'jobs'
  | 'workforce'
  | 'variations'
  | 'payments'
  | 'documents'
  | 'client_activity'
  | 'security'
  | 'system';

export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';

export type ConversationType =
  | 'internal_job'
  | 'client'
  | 'subcontractor'
  | 'commercial'
  | 'direct_internal'
  | 'system';

export type ParticipantType = 'user' | 'client' | 'subcontractor' | 'system';

export interface NotificationRecord {
  id: string;
  organisationId: string;
  recipientUserId: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body: string;
  priority: NotificationPriority;
  relatedEntityType?: string;
  relatedEntityId?: string;
  jobId?: string;
  jobName?: string;
  actionRoute?: string;
  actionLabel?: string;
  readAt?: string;
  archivedAt?: string;
  createdAt: string;
  dedupeKey?: string;
}

export interface ConversationRecord {
  id: string;
  organisationId: string;
  jobId?: string;
  jobName?: string;
  jobRef?: string;
  type: ConversationType;
  title: string;
  clientId?: string;
  clientName?: string;
  workforceBusinessId?: string;
  workforceBusinessName?: string;
  variationId?: string;
  variationRef?: string;
  paymentApplicationId?: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  lastMessageSender?: string;
  unreadCount: number;
  starred: boolean;
  archivedAt?: string;
  participants: ConversationParticipant[];
  messages: MessageRecord[];
}

export interface ConversationParticipant {
  userId?: string;
  portalIdentity?: string;
  participantType: ParticipantType;
  name: string;
  avatarInitials: string;
  addedAt: string;
  lastReadAt?: string;
  muted: boolean;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderType: ParticipantType;
  body: string;
  replyToId?: string;
  clientVisible: boolean;
  editedAt?: string;
  withdrawnAt?: string;
  createdAt: string;
  attachments: MessageAttachment[];
  mentions: string[];
  deliveryState: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  storagePath?: string;
}

export interface NotificationPreference {
  category: NotificationCategory;
  categoryLabel: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  emailMode: 'immediate' | 'daily_digest' | 'weekly_digest' | 'disabled';
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface ReminderRule {
  id: string;
  ruleType: string;
  label: string;
  description: string;
  triggers: ReminderTrigger[];
  enabled: boolean;
}

export interface ReminderTrigger {
  daysBefore?: number;
  daysAfter?: number;
  interval: 'once' | 'daily' | 'weekly';
  maxOccurrences: number;
}

export interface DeliveryRecord {
  id: string;
  eventType: string;
  recipient: string;
  channel: 'email' | 'in_app';
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'permanent_failure';
  attempts: number;
  lastError?: string;
  scheduledAt: string;
  sentAt?: string;
  createdAt: string;
}

// ─── Demo Notifications ────────────────────────────────

export const demoNotifications: NotificationRecord[] = [
  {
    id: 'notif-1',
    organisationId: 'org-demo',
    recipientUserId: 'user-martin',
    type: 'variation_viewed',
    category: 'variations',
    title: 'Variation 004 viewed',
    body: 'Sarah Miller viewed Variation 004 — Additional kitchen sockets',
    priority: 'normal',
    relatedEntityType: 'variation',
    relatedEntityId: 'var-004',
    jobId: 'sl-1048',
    jobName: 'Oakfield kitchen extension',
    actionRoute: '/variations/var-004',
    actionLabel: 'View variation',
    createdAt: '2026-08-04T09:00:00Z',
    dedupeKey: 'var-viewed-var-004-sarah',
  },
  {
    id: 'notif-2',
    organisationId: 'org-demo',
    recipientUserId: 'user-martin',
    type: 'variation_response_overdue',
    category: 'variations',
    title: 'Variation response overdue',
    body: 'VAR-004 — Additional kitchen sockets was due for approval by 5 August 2026.',
    priority: 'urgent',
    relatedEntityType: 'variation',
    relatedEntityId: 'var-004',
    jobId: 'sl-1048',
    jobName: 'Oakfield kitchen extension',
    actionRoute: '/variations/var-004',
    actionLabel: 'Review now',
    createdAt: '2026-08-05T08:00:00Z',
    dedupeKey: 'var-overdue-var-004',
  },
  {
    id: 'notif-3',
    organisationId: 'org-demo',
    recipientUserId: 'user-martin',
    type: 'payment_overdue',
    category: 'payments',
    title: 'Payment overdue',
    body: 'Oakfield kitchen extension — Outstanding £8,640 is now 3 days overdue.',
    priority: 'high',
    relatedEntityType: 'job',
    relatedEntityId: 'sl-1048',
    jobId: 'sl-1048',
    jobName: 'Oakfield kitchen extension',
    actionRoute: '/jobs/sl-1048',
    actionLabel: 'View financials',
    createdAt: '2026-08-03T09:00:00Z',
    dedupeKey: 'pay-overdue-sl-1048',
  },
  {
    id: 'notif-4',
    organisationId: 'org-demo',
    recipientUserId: 'user-martin',
    type: 'insurance_expiring',
    category: 'workforce',
    title: 'Insurance expiring — D. Hughes Electrical',
    body: 'Public liability insurance for Daniel Hughes expires in 8 days. Renewal required before 13 August 2026.',
    priority: 'high',
    relatedEntityType: 'workforce_person',
    relatedEntityId: 'wf-dhughes',
    actionRoute: '/workforce/wf-dhughes',
    actionLabel: 'Review insurance',
    createdAt: '2026-08-05T07:00:00Z',
    dedupeKey: 'ins-exp-dhughes-8d',
  },
  {
    id: 'notif-5',
    organisationId: 'org-demo',
    recipientUserId: 'user-martin',
    type: 'job_milestone_approaching',
    category: 'jobs',
    title: 'Milestone approaching — Structure stage',
    body: 'Oakfield kitchen extension — Structure stage ends 10 August. First fix scheduled to begin 11 August.',
    priority: 'normal',
    relatedEntityType: 'job',
    relatedEntityId: 'sl-1048',
    jobId: 'sl-1048',
    jobName: 'Oakfield kitchen extension',
    actionRoute: '/jobs/sl-1048/timeline',
    actionLabel: 'View timeline',
    createdAt: '2026-08-05T06:00:00Z',
    dedupeKey: 'milestone-structure-sl-1048',
  },
  {
    id: 'notif-6',
    organisationId: 'org-demo',
    recipientUserId: 'user-martin',
    type: 'qualification_expiring',
    category: 'workforce',
    title: 'Qualification expiring — James Lawrence',
    body: 'CSCS Gold Card for James Lawrence expires in 21 days. Renewal required before 26 August 2026.',
    priority: 'normal',
    relatedEntityType: 'workforce_person',
    relatedEntityId: 'wf-jlawrence',
    actionRoute: '/workforce/wf-jlawrence',
    actionLabel: 'Review qualifications',
    createdAt: '2026-08-05T06:30:00Z',
    dedupeKey: 'qual-exp-jlawrence-21d',
  },
  {
    id: 'notif-7',
    organisationId: 'org-demo',
    recipientUserId: 'user-martin',
    type: 'client_decision_approved',
    category: 'client_activity',
    title: 'Kitchen door colour approved',
    body: 'Sarah Miller approved the kitchen door colour decision — Deep Forest Green selected.',
    priority: 'normal',
    relatedEntityType: 'decision',
    relatedEntityId: 'dec-1',
    jobId: 'sl-1048',
    jobName: 'Oakfield kitchen extension',
    actionRoute: '/clients/client-1',
    actionLabel: 'View decision',
    createdAt: '2026-08-04T11:00:00Z',
    dedupeKey: 'dec-approved-dec-1',
    readAt: '2026-08-04T11:30:00Z',
  },
  {
    id: 'notif-8',
    organisationId: 'org-demo',
    recipientUserId: 'user-martin',
    type: 'new_evidence',
    category: 'jobs',
    title: 'New site evidence — Steel beam preparation',
    body: 'Martin Hewett captured 3 photos — Steel bearing preparation, Oakfield kitchen extension.',
    priority: 'low',
    relatedEntityType: 'evidence',
    relatedEntityId: 'ev-demo-1',
    jobId: 'sl-1048',
    jobName: 'Oakfield kitchen extension',
    actionRoute: '/evidence/ev-demo-1',
    actionLabel: 'View evidence',
    createdAt: '2026-08-05T08:45:00Z',
    dedupeKey: 'ev-new-ev-demo-1',
  },
  {
    id: 'notif-9',
    organisationId: 'org-demo',
    recipientUserId: 'user-martin',
    type: 'daily_log_submitted',
    category: 'jobs',
    title: 'Daily log submitted — 4 August',
    body: 'Daily site log for Oakfield kitchen extension has been completed by Aisha Khan.',
    priority: 'low',
    relatedEntityType: 'daily_log',
    relatedEntityId: 'dl-2',
    jobId: 'sl-1048',
    jobName: 'Oakfield kitchen extension',
    actionRoute: '/jobs/sl-1048/daily-logs',
    actionLabel: 'View daily log',
    createdAt: '2026-08-04T18:00:00Z',
    dedupeKey: 'dl-submitted-dl-2',
    readAt: '2026-08-04T18:30:00Z',
  },
  {
    id: 'notif-10',
    organisationId: 'org-demo',
    recipientUserId: 'user-martin',
    type: 'client_message_received',
    category: 'client_activity',
    title: 'New client message — Northlight Studio',
    body: 'James North sent a message regarding data points in the ground floor meeting room.',
    priority: 'normal',
    relatedEntityType: 'conversation',
    relatedEntityId: 'conv-2',
    jobId: 'sl-1051',
    jobName: 'Harcourt office rewire',
    actionRoute: '/messages?conversation=conv-2',
    actionLabel: 'Reply',
    createdAt: '2026-08-04T16:45:00Z',
    dedupeKey: 'msg-new-conv-2-latest',
  },
  {
    id: 'notif-11',
    organisationId: 'org-demo',
    recipientUserId: 'user-martin',
    type: 'variation_approved',
    category: 'variations',
    title: 'Variation 001 approved',
    body: 'Sarah Miller approved VAR-001 — Underfloor heating manifold upgrade. £816 including VAT.',
    priority: 'normal',
    relatedEntityType: 'variation',
    relatedEntityId: 'var-001',
    jobId: 'sl-1048',
    jobName: 'Oakfield kitchen extension',
    actionRoute: '/variations/var-001',
    actionLabel: 'View variation',
    createdAt: '2026-07-12T14:00:00Z',
    dedupeKey: 'var-approved-var-001',
    readAt: '2026-07-12T14:15:00Z',
  },
  {
    id: 'notif-12',
    organisationId: 'org-demo',
    recipientUserId: 'user-martin',
    type: 'site_delay_reported',
    category: 'jobs',
    title: 'Site delay — Building Control inspection',
    body: 'Building Control inspection for Oakfield project moved. 1 working day delay due to inspector availability.',
    priority: 'normal',
    relatedEntityType: 'evidence',
    relatedEntityId: 'ev-demo-5',
    jobId: 'sl-1048',
    jobName: 'Oakfield kitchen extension',
    actionRoute: '/evidence/ev-demo-5',
    actionLabel: 'View delay record',
    createdAt: '2026-08-04T11:06:00Z',
    dedupeKey: 'delay-ev-demo-5',
  },
  {
    id: 'notif-13',
    organisationId: 'org-demo',
    recipientUserId: 'user-martin',
    type: 'retention_release_due',
    category: 'payments',
    title: 'Retention release approaching',
    body: 'Retention of £2,125 for Oakfield kitchen extension is due for review within 30 days.',
    priority: 'normal',
    relatedEntityType: 'job',
    relatedEntityId: 'sl-1048',
    jobId: 'sl-1048',
    jobName: 'Oakfield kitchen extension',
    actionRoute: '/jobs/sl-1048',
    actionLabel: 'View retention',
    createdAt: '2026-08-05T09:00:00Z',
    dedupeKey: 'retention-sl-1048-30d',
  },
  {
    id: 'notif-14',
    organisationId: 'org-demo',
    recipientUserId: 'user-martin',
    type: 'portal_access_granted',
    category: 'client_activity',
    title: 'Portal access granted — Robert Ellis',
    body: 'Robert Ellis has been invited to the client portal for Meadow View boiler replacement.',
    priority: 'low',
    relatedEntityType: 'client',
    relatedEntityId: 'client-4',
    jobId: 'sl-1054',
    jobName: 'Meadow View boiler replacement',
    actionRoute: '/clients/client-4',
    actionLabel: 'View client',
    createdAt: '2026-08-03T15:00:00Z',
    dedupeKey: 'portal-granted-client-4',
    readAt: '2026-08-03T15:10:00Z',
  },
  {
    id: 'notif-15',
    organisationId: 'org-demo',
    recipientUserId: 'user-martin',
    type: 'system_announcement',
    category: 'system',
    title: 'BuildNerve update — Phase 8 deployed',
    body: 'The communication centre, notifications and automated reminders are now available. Configure your preferences in Settings.',
    priority: 'low',
    actionRoute: '/settings/notifications',
    actionLabel: 'Configure preferences',
    createdAt: '2026-08-05T08:00:00Z',
    dedupeKey: 'sys-phase8-deployed',
  },
];

// ─── Demo Conversations ────────────────────────────────

export const demoConversations: ConversationRecord[] = [
  {
    id: 'conv-1',
    organisationId: 'org-demo',
    jobId: 'sl-1048',
    jobName: 'Oakfield kitchen extension',
    jobRef: 'SL-1048',
    type: 'client',
    title: 'Oakfield — Client updates (Sarah & Ben Miller)',
    clientId: 'client-1',
    clientName: 'Sarah & Ben Miller',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-08-05T09:20:00Z',
    lastMessageAt: '2026-08-05T09:20:00Z',
    lastMessagePreview: 'The steel beam has arrived on site and installation is proceeding as planned this morning.',
    lastMessageSender: 'Martin Hewett',
    unreadCount: 1,
    starred: true,
    participants: [
      { userId: 'user-martin', participantType: 'user', name: 'Martin Hewett', avatarInitials: 'MH', addedAt: '2026-06-01T00:00:00Z', lastReadAt: '2026-08-05T09:00:00Z', muted: false },
      { userId: 'user-aisha', participantType: 'user', name: 'Aisha Khan', avatarInitials: 'AK', addedAt: '2026-06-01T00:00:00Z', lastReadAt: '2026-08-05T09:15:00Z', muted: false },
      { portalIdentity: 'client-1-sarah', participantType: 'client', name: 'Sarah Miller', avatarInitials: 'SM', addedAt: '2026-06-01T00:00:00Z', lastReadAt: '2026-08-05T09:20:00Z', muted: false },
      { portalIdentity: 'client-1-ben', participantType: 'client', name: 'Ben Miller', avatarInitials: 'BM', addedAt: '2026-06-01T00:00:00Z', lastReadAt: '2026-08-04T18:00:00Z', muted: false },
    ],
    messages: [
      {
        id: 'msg-1a',
        conversationId: 'conv-1',
        senderId: 'user-martin',
        senderName: 'Martin Hewett',
        senderType: 'user',
        body: 'Good morning Sarah and Ben. Quick update — the steel beam has arrived on site and installation is proceeding as planned this morning. James and the team are on site from 08:00.',
        clientVisible: true,
        createdAt: '2026-08-05T09:20:00Z',
        attachments: [],
        mentions: [],
        deliveryState: 'delivered',
      },
      {
        id: 'msg-1b',
        conversationId: 'conv-1',
        senderId: 'portal-client-1-sarah',
        senderName: 'Sarah Miller',
        senderType: 'client',
        body: 'That\'s great news Martin, thank you. Will the steel installation be completed today? We are hoping to pop by this evening to see the progress.',
        clientVisible: true,
        createdAt: '2026-08-04T18:30:00Z',
        attachments: [],
        mentions: ['Martin Hewett'],
        deliveryState: 'read',
      },
      {
        id: 'msg-1c',
        conversationId: 'conv-1',
        senderId: 'user-martin',
        senderName: 'Martin Hewett',
        senderType: 'user',
        body: 'Hi Sarah — yes, the steel should be fully installed and signed off by late afternoon. You are welcome to come by after 17:00. Just let the team know you are arriving and keep clear of the work area. The opening will look quite different by then!',
        clientVisible: true,
        createdAt: '2026-08-04T18:45:00Z',
        attachments: [],
        mentions: [],
        deliveryState: 'read',
      },
      {
        id: 'msg-1d',
        conversationId: 'conv-1',
        senderId: 'user-aisha',
        senderName: 'Aisha Khan',
        senderType: 'user',
        body: '@Martin — Building Control confirmed for Thursday inspection. I have added it to the site diary.',
        clientVisible: false,
        createdAt: '2026-08-04T17:00:00Z',
        attachments: [],
        mentions: ['Martin Hewett'],
        deliveryState: 'read',
      },
    ],
  },
  {
    id: 'conv-2',
    organisationId: 'org-demo',
    jobId: 'sl-1051',
    jobName: 'Harcourt office rewire',
    jobRef: 'SL-1051',
    type: 'client',
    title: 'Harcourt — Client updates (Northlight Studio)',
    clientId: 'client-2',
    clientName: 'Northlight Studio Ltd',
    createdAt: '2026-06-10T00:00:00Z',
    updatedAt: '2026-08-04T16:45:00Z',
    lastMessageAt: '2026-08-04T16:45:00Z',
    lastMessagePreview: 'Could we also add two data points in the breakout area on the first floor? Let me know the extra cost.',
    lastMessageSender: 'James North',
    unreadCount: 3,
    starred: false,
    participants: [
      { userId: 'user-martin', participantType: 'user', name: 'Martin Hewett', avatarInitials: 'MH', addedAt: '2026-06-10T00:00:00Z', lastReadAt: '2026-08-04T12:00:00Z', muted: false },
      { portalIdentity: 'client-2-james', participantType: 'client', name: 'James North', avatarInitials: 'JN', addedAt: '2026-06-10T00:00:00Z', lastReadAt: '2026-08-04T16:45:00Z', muted: false },
    ],
    messages: [
      {
        id: 'msg-2a',
        conversationId: 'conv-2',
        senderId: 'portal-client-2-james',
        senderName: 'James North',
        senderType: 'client',
        body: 'Hi Martin — could we also add two data points in the breakout area on the first floor? Let me know the extra cost and whether it affects the programme.',
        clientVisible: true,
        createdAt: '2026-08-04T16:45:00Z',
        attachments: [],
        mentions: [],
        deliveryState: 'delivered',
      },
    ],
  },
  {
    id: 'conv-3',
    organisationId: 'org-demo',
    jobId: 'sl-1048',
    jobName: 'Oakfield kitchen extension',
    jobRef: 'SL-1048',
    type: 'internal_job',
    title: 'Oakfield — Site team',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-08-05T08:15:00Z',
    lastMessageAt: '2026-08-05T08:15:00Z',
    lastMessagePreview: 'James — can you grab extra wall ties from the merchant this morning? We are short.',
    lastMessageSender: 'Martin Hewett',
    unreadCount: 2,
    starred: true,
    participants: [
      { userId: 'user-martin', participantType: 'user', name: 'Martin Hewett', avatarInitials: 'MH', addedAt: '2026-06-01T00:00:00Z', lastReadAt: '2026-08-05T07:30:00Z', muted: false },
      { userId: 'user-aisha', participantType: 'user', name: 'Aisha Khan', avatarInitials: 'AK', addedAt: '2026-06-01T00:00:00Z', lastReadAt: '2026-08-05T08:00:00Z', muted: false },
      { userId: 'user-james', participantType: 'user', name: 'James Lawrence', avatarInitials: 'JL', addedAt: '2026-06-01T00:00:00Z', lastReadAt: '2026-08-05T08:15:00Z', muted: false },
    ],
    messages: [
      {
        id: 'msg-3a',
        conversationId: 'conv-3',
        senderId: 'user-martin',
        senderName: 'Martin Hewett',
        senderType: 'user',
        body: 'James — can you grab extra wall ties from the merchant this morning? We are short and the delivery isn\'t until Thursday.',
        clientVisible: false,
        createdAt: '2026-08-05T08:15:00Z',
        attachments: [],
        mentions: ['James Lawrence'],
        deliveryState: 'delivered',
      },
      {
        id: 'msg-3b',
        conversationId: 'conv-3',
        senderId: 'user-aisha',
        senderName: 'Aisha Khan',
        senderType: 'user',
        body: 'I have updated the daily log for yesterday. Everything looking on track — steel prep completed on schedule. Building Control inspection moved to Thursday morning — I\'ve noted it in the site diary.',
        clientVisible: false,
        createdAt: '2026-08-05T07:45:00Z',
        attachments: [],
        mentions: [],
        deliveryState: 'read',
      },
    ],
  },
  {
    id: 'conv-4',
    organisationId: 'org-demo',
    jobId: 'sl-1048',
    jobName: 'Oakfield kitchen extension',
    jobRef: 'SL-1048',
    type: 'subcontractor',
    title: 'Oakfield — D. Hughes Electrical',
    workforceBusinessId: 'wf-dhughes',
    workforceBusinessName: 'D. Hughes Electrical',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-08-03T14:30:00Z',
    lastMessageAt: '2026-08-03T14:30:00Z',
    lastMessagePreview: 'Socket positions marked up and ready for your review. Photos attached.',
    lastMessageSender: 'Daniel Hughes',
    unreadCount: 0,
    starred: false,
    participants: [
      { userId: 'user-martin', participantType: 'user', name: 'Martin Hewett', avatarInitials: 'MH', addedAt: '2026-07-01T00:00:00Z', lastReadAt: '2026-08-04T09:00:00Z', muted: false },
      { portalIdentity: 'sub-dhughes', participantType: 'subcontractor', name: 'Daniel Hughes', avatarInitials: 'DH', addedAt: '2026-07-01T00:00:00Z', lastReadAt: '2026-08-03T14:30:00Z', muted: false },
    ],
    messages: [
      {
        id: 'msg-4a',
        conversationId: 'conv-4',
        senderId: 'portal-sub-dhughes',
        senderName: 'Daniel Hughes',
        senderType: 'subcontractor',
        body: 'Socket positions marked up and ready for your review. I have positioned them per the revised kitchen layout. Photos attached of each position.',
        clientVisible: false,
        createdAt: '2026-08-03T14:30:00Z',
        attachments: [
          { id: 'att-4a-1', fileName: 'Socket-positions-kitchen.pdf', fileSize: 2450000, contentType: 'application/pdf' },
          { id: 'att-4a-2', fileName: 'Socket-positions-photo-1.jpg', fileSize: 3800000, contentType: 'image/jpeg' },
        ],
        mentions: [],
        deliveryState: 'read',
      },
      {
        id: 'msg-4b',
        conversationId: 'conv-4',
        senderId: 'user-martin',
        senderName: 'Martin Hewett',
        senderType: 'user',
        body: 'Thanks Daniel. I will review these this afternoon and confirm. The client has requested two additional positions — I\'ll include those in the variation and flag them separately.',
        clientVisible: false,
        createdAt: '2026-08-03T15:00:00Z',
        attachments: [],
        mentions: [],
        deliveryState: 'read',
      },
    ],
  },
  {
    id: 'conv-5',
    organisationId: 'org-demo',
    type: 'commercial',
    title: 'VAR-004 — Additional kitchen sockets',
    jobId: 'sl-1048',
    jobName: 'Oakfield kitchen extension',
    jobRef: 'SL-1048',
    variationId: 'var-004',
    variationRef: 'VAR-004',
    createdAt: '2026-08-03T10:00:00Z',
    updatedAt: '2026-08-04T09:00:00Z',
    lastMessageAt: '2026-08-04T09:00:00Z',
    lastMessagePreview: 'VAR-004 has been viewed by Sarah Miller. Awaiting approval decision.',
    lastMessageSender: 'System',
    unreadCount: 0,
    starred: false,
    participants: [
      { userId: 'user-martin', participantType: 'user', name: 'Martin Hewett', avatarInitials: 'MH', addedAt: '2026-08-03T10:00:00Z', lastReadAt: '2026-08-04T09:00:00Z', muted: false },
      { userId: 'user-aisha', participantType: 'user', name: 'Aisha Khan', avatarInitials: 'AK', addedAt: '2026-08-03T10:00:00Z', lastReadAt: '2026-08-04T09:00:00Z', muted: false },
      { portalIdentity: 'client-1-sarah', participantType: 'client', name: 'Sarah Miller', avatarInitials: 'SM', addedAt: '2026-08-03T10:00:00Z', lastReadAt: '2026-08-04T09:00:00Z', muted: false },
      { participantType: 'system', name: 'BuildNerve', avatarInitials: 'BN', addedAt: '2026-08-03T10:00:00Z', muted: true },
    ],
    messages: [
      {
        id: 'msg-5a',
        conversationId: 'conv-5',
        senderId: 'system',
        senderName: 'BuildNerve',
        senderType: 'system',
        body: 'Variation VAR-004 — Additional kitchen sockets has been created by Martin Hewett and sent to Sarah & Ben Miller for approval. Total: £1,536 including VAT. Programme impact: 1 additional working day. Approval required by 5 August 2026.',
        clientVisible: true,
        createdAt: '2026-08-03T10:00:00Z',
        attachments: [],
        mentions: [],
        deliveryState: 'read',
      },
      {
        id: 'msg-5b',
        conversationId: 'conv-5',
        senderId: 'system',
        senderName: 'BuildNerve',
        senderType: 'system',
        body: 'VAR-004 has been viewed by Sarah Miller on 4 August 2026 at 09:00. Awaiting approval decision.',
        clientVisible: false,
        createdAt: '2026-08-04T09:00:00Z',
        attachments: [],
        mentions: [],
        deliveryState: 'read',
      },
    ],
  },
  {
    id: 'conv-6',
    organisationId: 'org-demo',
    type: 'direct_internal',
    title: 'Project managers — Weekly stand-up',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-08-05T08:30:00Z',
    lastMessageAt: '2026-08-05T08:30:00Z',
    lastMessagePreview: 'Can everyone share their top 3 priorities for this week by 10am?',
    lastMessageSender: 'Martin Hewett',
    unreadCount: 4,
    starred: false,
    participants: [
      { userId: 'user-martin', participantType: 'user', name: 'Martin Hewett', avatarInitials: 'MH', addedAt: '2026-07-01T00:00:00Z', lastReadAt: '2026-08-04T18:00:00Z', muted: false },
      { userId: 'user-aisha', participantType: 'user', name: 'Aisha Khan', avatarInitials: 'AK', addedAt: '2026-07-01T00:00:00Z', lastReadAt: '2026-08-05T08:30:00Z', muted: false },
      { userId: 'user-amelia', participantType: 'user', name: 'Amelia Clarke', avatarInitials: 'AC', addedAt: '2026-07-01T00:00:00Z', lastReadAt: '2026-08-05T07:00:00Z', muted: false },
    ],
    messages: [
      {
        id: 'msg-6a',
        conversationId: 'conv-6',
        senderId: 'user-martin',
        senderName: 'Martin Hewett',
        senderType: 'user',
        body: 'Morning everyone. Can everyone share their top 3 priorities for this week by 10am? Want to make sure we are aligned before the steel installation kicks off.',
        clientVisible: false,
        createdAt: '2026-08-05T08:30:00Z',
        attachments: [],
        mentions: [],
        deliveryState: 'delivered',
      },
      {
        id: 'msg-6b',
        conversationId: 'conv-6',
        senderId: 'user-aisha',
        senderName: 'Aisha Khan',
        senderType: 'user',
        body: 'Morning! Mine:\n1. Complete compliance review for the two new subcontractor passports\n2. Daily logs catch-up for Oakfield and Kingsway\n3. Chase Daniel Hughes\' insurance renewal paperwork',
        clientVisible: false,
        createdAt: '2026-08-05T08:35:00Z',
        attachments: [],
        mentions: [],
        deliveryState: 'sent',
      },
    ],
  },
];

// ─── Demo Notification Preferences ────────────────────

export const demoNotificationPreferences: NotificationPreference[] = [
  { category: 'jobs', categoryLabel: 'Jobs', inAppEnabled: true, emailEnabled: true, emailMode: 'immediate', quietHoursEnabled: false },
  { category: 'workforce', categoryLabel: 'Workforce compliance', inAppEnabled: true, emailEnabled: true, emailMode: 'daily_digest', quietHoursEnabled: false },
  { category: 'variations', categoryLabel: 'Variations', inAppEnabled: true, emailEnabled: true, emailMode: 'immediate', quietHoursEnabled: false },
  { category: 'payments', categoryLabel: 'Payments', inAppEnabled: true, emailEnabled: true, emailMode: 'immediate', quietHoursEnabled: false },
  { category: 'documents', categoryLabel: 'Documents', inAppEnabled: true, emailEnabled: false, emailMode: 'disabled', quietHoursEnabled: false },
  { category: 'client_activity', categoryLabel: 'Client activity', inAppEnabled: true, emailEnabled: true, emailMode: 'daily_digest', quietHoursEnabled: true, quietHoursStart: '22:00', quietHoursEnd: '07:00' },
  { category: 'security', categoryLabel: 'Account and security', inAppEnabled: true, emailEnabled: true, emailMode: 'immediate', quietHoursEnabled: false },
  { category: 'system', categoryLabel: 'System', inAppEnabled: true, emailEnabled: false, emailMode: 'disabled', quietHoursEnabled: false },
];

// ─── Demo Reminder Rules ───────────────────────────────

export const demoReminderRules: ReminderRule[] = [
  {
    id: 'rule-compliance-1',
    ruleType: 'compliance_expiry',
    label: 'Qualification expiry',
    description: 'Reminders for qualifications approaching expiry',
    triggers: [
      { daysBefore: 30, interval: 'once', maxOccurrences: 1 },
      { daysBefore: 14, interval: 'once', maxOccurrences: 1 },
      { daysBefore: 7, interval: 'daily', maxOccurrences: 3 },
      { daysBefore: 0, interval: 'once', maxOccurrences: 1 },
    ],
    enabled: true,
  },
  {
    id: 'rule-compliance-2',
    ruleType: 'insurance_expiry',
    label: 'Insurance expiry',
    description: 'Reminders for insurance policies approaching expiry',
    triggers: [
      { daysBefore: 30, interval: 'once', maxOccurrences: 1 },
      { daysBefore: 14, interval: 'once', maxOccurrences: 1 },
      { daysBefore: 7, interval: 'daily', maxOccurrences: 3 },
      { daysBefore: 0, interval: 'once', maxOccurrences: 1 },
    ],
    enabled: true,
  },
  {
    id: 'rule-variation-1',
    ruleType: 'variation_response',
    label: 'Variation response',
    description: 'Reminders for unanswered variations',
    triggers: [
      { daysAfter: 3, interval: 'once', maxOccurrences: 1 },
      { daysAfter: 7, interval: 'weekly', maxOccurrences: 2 },
    ],
    enabled: true,
  },
  {
    id: 'rule-payment-1',
    ruleType: 'payment_due',
    label: 'Payment due',
    description: 'Reminders for upcoming and overdue payments',
    triggers: [
      { daysBefore: 7, interval: 'once', maxOccurrences: 1 },
      { daysBefore: 0, interval: 'once', maxOccurrences: 1 },
      { daysAfter: 1, interval: 'once', maxOccurrences: 1 },
      { daysAfter: 7, interval: 'weekly', maxOccurrences: 4 },
    ],
    enabled: true,
  },
  {
    id: 'rule-retention-1',
    ruleType: 'retention_release',
    label: 'Retention release',
    description: 'Reminders for retention money due for release',
    triggers: [
      { daysBefore: 30, interval: 'once', maxOccurrences: 1 },
      { daysBefore: 7, interval: 'once', maxOccurrences: 1 },
      { daysBefore: 0, interval: 'once', maxOccurrences: 1 },
    ],
    enabled: true,
  },
];

// ─── Demo Delivery Records ─────────────────────────────

export const demoDeliveryRecords: DeliveryRecord[] = [
  { id: 'del-1', eventType: 'variation_issued', recipient: 'sarah.miller@email.com', channel: 'email', status: 'sent', attempts: 1, scheduledAt: '2026-08-03T10:00:00Z', sentAt: '2026-08-03T10:00:05Z', createdAt: '2026-08-03T10:00:00Z' },
  { id: 'del-2', eventType: 'payment_overdue', recipient: 'sarah.miller@email.com', channel: 'email', status: 'sent', attempts: 1, scheduledAt: '2026-08-03T09:00:00Z', sentAt: '2026-08-03T09:00:03Z', createdAt: '2026-08-03T09:00:00Z' },
  { id: 'del-3', eventType: 'insurance_expiring', recipient: 'daniel@dhugheselectrical.co.uk', channel: 'email', status: 'sent', attempts: 1, scheduledAt: '2026-08-05T07:00:00Z', sentAt: '2026-08-05T07:00:02Z', createdAt: '2026-08-05T07:00:00Z' },
  { id: 'del-4', eventType: 'portal_invitation', recipient: 'robert.ellis@email.com', channel: 'email', status: 'sent', attempts: 1, scheduledAt: '2026-08-03T15:00:00Z', sentAt: '2026-08-03T15:00:04Z', createdAt: '2026-08-03T15:00:00Z' },
  { id: 'del-5', eventType: 'qualification_expiring', recipient: 'james.lawrence@buildnerve.co.uk', channel: 'email', status: 'failed', attempts: 2, lastError: 'Temporary SMTP error — connection timeout', scheduledAt: '2026-08-05T06:30:00Z', createdAt: '2026-08-05T06:30:00Z' },
  { id: 'del-6', eventType: 'daily_digest', recipient: 'martin@buildnerve.co.uk', channel: 'email', status: 'pending', attempts: 0, scheduledAt: '2026-08-05T21:00:00Z', createdAt: '2026-08-05T09:00:00Z' },
  { id: 'del-7', eventType: 'new_message', recipient: 'sarah.miller@email.com', channel: 'email', status: 'pending', attempts: 0, scheduledAt: '2026-08-05T09:20:00Z', createdAt: '2026-08-05T09:20:00Z' },
];

// ─── Service / Repository Helpers ──────────────────────

export function getAllNotifications(): NotificationRecord[] {
  return [...demoNotifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getUnreadNotifications(): NotificationRecord[] {
  return demoNotifications.filter((n) => !n.readAt);
}

export function getUnreadCount(): number {
  return demoNotifications.filter((n) => !n.readAt).length;
}

export function getUrgentUnreadCount(): number {
  return demoNotifications.filter((n) => !n.readAt && (n.priority === 'urgent' || n.priority === 'high')).length;
}

export function getNotificationById(id: string): NotificationRecord | undefined {
  return demoNotifications.find((n) => n.id === id);
}

export function getNotificationsByCategory(category: NotificationCategory): NotificationRecord[] {
  return demoNotifications.filter((n) => n.category === category).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAllConversations(): ConversationRecord[] {
  return [...demoConversations].sort((a, b) => new Date(b.lastMessageAt || b.updatedAt).getTime() - new Date(a.lastMessageAt || a.updatedAt).getTime());
}

export function getConversationById(id: string): ConversationRecord | undefined {
  return demoConversations.find((c) => c.id === id);
}

export function getConversationsByType(type: ConversationType): ConversationRecord[] {
  return demoConversations.filter((c) => c.type === type).sort((a, b) => new Date(b.lastMessageAt || b.updatedAt).getTime() - new Date(a.lastMessageAt || a.updatedAt).getTime());
}

export function getConversationsByJob(jobId: string): ConversationRecord[] {
  return demoConversations.filter((c) => c.jobId === jobId).sort((a, b) => new Date(b.lastMessageAt || b.updatedAt).getTime() - new Date(a.lastMessageAt || a.updatedAt).getTime());
}

export function getTotalUnreadMessages(): number {
  return demoConversations.reduce((sum, c) => sum + c.unreadCount, 0);
}

export function getNotificationPreferences(): NotificationPreference[] {
  return demoNotificationPreferences;
}

export function getReminderRules(): ReminderRule[] {
  return demoReminderRules;
}

export function getDeliveryRecords(): DeliveryRecord[] {
  return [...demoDeliveryRecords].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getDeliveryStats() {
  const records = demoDeliveryRecords;
  return {
    total: records.length,
    pending: records.filter((r) => r.status === 'pending').length,
    sent: records.filter((r) => r.status === 'sent').length,
    failed: records.filter((r) => r.status === 'failed').length,
    permanentFailure: records.filter((r) => r.status === 'permanent_failure').length,
  };
}

// ─── Helper Mappers ────────────────────────────────────

export function getNotificationCategoryIcon(category: NotificationCategory): string {
  const icons: Record<string, string> = {
    jobs: 'ri-briefcase-line',
    workforce: 'ri-team-line',
    variations: 'ri-price-tag-3-line',
    payments: 'ri-bank-card-line',
    documents: 'ri-file-line',
    client_activity: 'ri-user-heart-line',
    security: 'ri-shield-check-line',
    system: 'ri-settings-3-line',
  };
  return icons[category] || 'ri-notification-3-line';
}

export function getNotificationCategoryColor(category: NotificationCategory): string {
  const colors: Record<string, string> = {
    jobs: 'bg-status-blue/10 text-status-blue',
    workforce: 'bg-status-purple/10 text-status-purple',
    variations: 'bg-status-amber/10 text-status-amber',
    payments: 'bg-status-red/10 text-status-red',
    documents: 'bg-gray-400/10 text-gray-500',
    client_activity: 'bg-status-green/10 text-status-green',
    security: 'bg-status-red/10 text-status-red',
    system: 'bg-gray-400/10 text-gray-500',
  };
  return colors[category] || 'bg-gray-400/10 text-gray-500';
}

export function getPriorityColor(priority: NotificationPriority): string {
  const colors: Record<string, string> = {
    urgent: 'bg-status-red',
    high: 'bg-status-amber',
    normal: 'bg-status-blue',
    low: 'bg-gray-300',
  };
  return colors[priority] || 'bg-gray-300';
}

export function getConversationTypeIcon(type: ConversationType): string {
  const icons: Record<string, string> = {
    internal_job: 'ri-briefcase-line',
    client: 'ri-user-heart-line',
    subcontractor: 'ri-tools-line',
    commercial: 'ri-price-tag-3-line',
    direct_internal: 'ri-chat-1-line',
    system: 'ri-notification-3-line',
  };
  return icons[type] || 'ri-chat-1-line';
}

export function getConversationTypeLabel(type: ConversationType): string {
  const labels: Record<string, string> = {
    internal_job: 'Internal — Job',
    client: 'Client',
    subcontractor: 'Subcontractor',
    commercial: 'Commercial',
    direct_internal: 'Direct — Internal',
    system: 'System',
  };
  return labels[type] || type;
}

export function getConversationVisibilityLabel(type: ConversationType): string {
  if (type === 'internal_job' || type === 'direct_internal') return 'Internal only';
  if (type === 'client') return 'Client visible';
  if (type === 'subcontractor') return 'Subcontractor visible';
  if (type === 'commercial') return 'Restricted — commercial';
  return 'System';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatMessageDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Notification quick filter options
export const notificationCategoryFilters = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'action_required', label: 'Action required' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'workforce', label: 'Workforce' },
  { id: 'variations', label: 'Variations' },
  { id: 'payments', label: 'Payments' },
  { id: 'documents', label: 'Documents' },
  { id: 'client_activity', label: 'Client activity' },
  { id: 'system', label: 'System' },
];

// Message inbox filter options
export const inboxFilters = [
  { id: 'all', label: 'Inbox', icon: 'ri-inbox-line' },
  { id: 'unread', label: 'Unread', icon: 'ri-mail-unread-line' },
  { id: 'starred', label: 'Starred', icon: 'ri-star-line' },
  { id: 'internal', label: 'Internal', icon: 'ri-lock-line' },
  { id: 'client', label: 'Clients', icon: 'ri-user-heart-line' },
  { id: 'subcontractor', label: 'Subcontractors', icon: 'ri-tools-line' },
  { id: 'archived', label: 'Archived', icon: 'ri-archive-line' },
];