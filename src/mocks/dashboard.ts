export const dashboardStats = {
  activeJobs: {
    value: 12,
    label: 'Active jobs',
    supporting: '5 teams currently on site',
    change: '+2 this week',
    color: 'green',
  },
  variationsPending: {
    value: '£4,860',
    label: 'Variations pending',
    supporting: 'Oldest awaiting approval: 2 days',
    change: '3 waiting',
    color: 'amber',
  },
  dueIn14Days: {
    value: '£21,440',
    label: 'Due in 14 days',
    supporting: 'Across 6 payment applications',
    change: '£8,640 late',
    color: 'purple',
  },
  workforceCompliant: {
    value: '23/25',
    label: 'Workforce compliant',
    supporting: '2 documents need attention',
    change: '92% ready',
    color: 'blue',
  },
};

export const liveJobs = [
  {
    id: 'sl-1048',
    reference: 'SL-1048',
    trade: 'General build',
    project: 'Oakfield kitchen extension',
    client: 'Sarah & Ben Miller',
    status: 'On site',
    statusColor: 'green',
    progress: 68,
    nextAction: 'Steel installation · 10:30',
    workers: ['MT', 'JL', 'AK'],
  },
  {
    id: 'sl-1051',
    reference: 'SL-1051',
    trade: 'Electrical',
    project: 'Harcourt office rewire',
    client: 'Northlight Studio Ltd',
    status: 'Approval needed',
    statusColor: 'amber',
    progress: 42,
    nextAction: 'Variation 004 awaiting client',
    workers: ['DH', 'RP'],
  },
  {
    id: 'sl-1042',
    reference: 'SL-1042',
    trade: 'Plumbing',
    project: 'Riverside bathroom suite',
    client: 'Priya Shah',
    status: 'Finishing',
    statusColor: 'blue',
    progress: 91,
    nextAction: 'Client walkthrough · 15:00',
    workers: ['CW', 'MT'],
  },
];

export const attentionItems = [
  {
    id: 'alert-1',
    title: 'Public liability expires in 8 days',
    subtitle: 'D. Hughes Electrical · £2m cover',
    actionLabel: 'Request renewal',
    color: 'red',
  },
  {
    id: 'alert-2',
    title: 'Variation 004 needs approval',
    subtitle: 'Harcourt office rewire · £1,280 + VAT',
    actionLabel: 'Send reminder',
    color: 'amber',
  },
  {
    id: 'alert-3',
    title: 'Payment application overdue',
    subtitle: 'Oakfield extension · £8,640 · 3 days',
    actionLabel: 'View payment',
    color: 'purple',
  },
];

export const todayOnSite = [
  {
    id: 'site-1',
    project: 'Oakfield extension',
    activity: 'Steel delivery & installation',
    workers: ['MT', 'JL', 'AK'],
    color: 'green',
    startHour: 8,
    endHour: 13,
  },
  {
    id: 'site-2',
    project: 'Riverside bathroom',
    activity: 'Second fix & snagging',
    workers: ['CW', 'MT'],
    color: 'blue',
    startHour: 8,
    endHour: 14,
  },
  {
    id: 'site-3',
    project: 'Harcourt offices',
    activity: 'Containment installation',
    workers: ['DH', 'RP'],
    color: 'amber',
    startHour: 9,
    endHour: 15.5,
  },
];

export const userProfile = {
  initials: 'MH',
  name: 'Martin Hewett',
  role: 'Workspace owner',
};

export const businessPulse = {
  status: 'Healthy',
  forecastRevenue: '£74,280',
  caption: 'Forecast revenue · August',
};

export const sidebarNavItems = [
  { id: 'overview', label: 'Overview', icon: 'ri-dashboard-line', active: true },
  { id: 'jobs', label: 'Jobs', icon: 'ri-briefcase-line', active: false },
  { id: 'workforce', label: 'Workforce', icon: 'ri-team-line', active: false },
  { id: 'clients', label: 'Clients', icon: 'ri-user-line', active: false },
  { id: 'variations', label: 'Variations', icon: 'ri-price-tag-3-line', active: false, badge: '3' },
  { id: 'evidence', label: 'Evidence', icon: 'ri-camera-line', active: false },
  { id: 'messages', label: 'Messages', icon: 'ri-chat-1-line', active: false, badge: '4' },
  { id: 'reports', label: 'Reports', icon: 'ri-bar-chart-2-line', active: false },
  { id: 'payments', label: 'Payments', icon: 'ri-bank-card-line', active: false },
  { id: 'retention', label: 'Retention', icon: 'ri-inbox-archive-line', active: false },
  { id: 'compliance', label: 'Compliance', icon: 'ri-shield-check-line', active: false },
  { id: 'app/procurement', label: 'Procurement', icon: 'ri-shopping-cart-2-line', active: false },
  { id: 'procurement', label: 'Procurement Portal', icon: 'ri-price-tag-3-line', active: false },
  { id: 'app/settings/integrations', label: 'Integrations', icon: 'ri-plug-line', active: false },
  { id: 'app/documents/ingestion', label: 'Document Ingestion', icon: 'ri-file-search-line', active: false },
  { id: 'app/settings/ai-automation', label: 'AI & Automation', icon: 'ri-robot-line', active: false },
  { id: 'app/settings/billing', label: 'Billing', icon: 'ri-money-pound-circle-line', active: false },
];

export const mobileNavItems = [
  { id: 'overview', label: 'Overview', icon: 'ri-dashboard-line' },
  { id: 'jobs', label: 'Jobs', icon: 'ri-briefcase-line' },
  { id: 'workforce', label: 'Workforce', icon: 'ri-team-line' },
  { id: 'messages', label: 'Messages', icon: 'ri-chat-1-line' },
  { id: 'clients', label: 'Clients', icon: 'ri-user-line' },
];

export const periodOptions = ['Today', 'This week', 'This month'];