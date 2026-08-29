// ─── Client & Property Owner Project Hub — demo data ───────────────────

export interface HubClient {
  greeting: string;
  projectName: string;
  projectBadge: string;
  initials: string;
}

export interface HubKpi {
  key: string;
  label: string;
  value: string;
  sub: string;
  accent: 'indigo' | 'emerald' | 'slate' | 'amber';
  progress?: number;
  icon: string;
}

export type PhaseStatus = 'completed' | 'in_progress' | 'upcoming' | 'scheduled';

export interface TimelinePhase {
  id: string;
  name: string;
  status: PhaseStatus;
  completedDate?: string;
  progress?: number;
  targetDate?: string;
}

export interface HubAttachment {
  name: string;
  type: 'pdf' | 'image';
}

export interface HubVariation {
  reference: string;
  title: string;
  description: string;
  costImpact: number;
  timeImpactDays: number;
  attachments: HubAttachment[];
}

export type PaymentStatus = 'paid' | 'due' | 'upcoming';

export interface PaymentScheduleItem {
  id: string;
  reference: string;
  period: string;
  certifiedAmount: number;
  retentionWithheld: number;
  status: PaymentStatus;
  dueDate?: string;
}

export interface SitePhoto {
  id: string;
  caption: string;
  dateTime: string;
  location: string;
  imageUrl: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  meta: string;
  icon: string;
}

export interface TeamMember {
  name: string;
  role: string;
  initials: string;
  phone: string;
  email: string;
}

export type CalendarEventType = 'site_visit' | 'milestone' | 'payment' | 'meeting' | 'handover';

export interface ProjectCalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  time?: string;
  type: CalendarEventType;
  location?: string;
}

export const calendarEventMeta: Record<CalendarEventType, { label: string; dot: string; chip: string }> = {
  site_visit: { label: 'Site Visit', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700' },
  milestone: { label: 'Milestone', dot: 'bg-indigo-500', chip: 'bg-indigo-50 text-indigo-700' },
  payment: { label: 'Payment', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700' },
  meeting: { label: 'Meeting', dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-700' },
  handover: { label: 'Handover', dot: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700' },
};

export const projectCalendarEvents: ProjectCalendarEvent[] = [
  { id: 'ev-01', date: '2026-09-02', title: 'Site visit — MEP first fix review', time: '10:00', type: 'site_visit', location: '42 Park Lane' },
  { id: 'ev-02', date: '2026-09-05', title: 'Phase 4 target — MEP & plastering complete', type: 'milestone' },
  { id: 'ev-03', date: '2026-09-10', title: 'Interim Valuation #4 due', time: '17:00', type: 'payment' },
  { id: 'ev-04', date: '2026-09-12', title: 'Kitchen design final sign-off', time: '11:30', type: 'meeting', location: 'Showroom' },
  { id: 'ev-05', date: '2026-09-15', title: 'Site visit — second fix walkthrough', time: '14:00', type: 'site_visit', location: '42 Park Lane' },
  { id: 'ev-06', date: '2026-09-18', title: 'Joinery measuring on site', time: '09:30', type: 'site_visit', location: '42 Park Lane' },
  { id: 'ev-07', date: '2026-09-22', title: 'Second fix & joinery begins', type: 'milestone' },
  { id: 'ev-08', date: '2026-09-28', title: 'Client progress meeting', time: '15:00', type: 'meeting', location: 'Video call' },
  { id: 'ev-09', date: '2026-10-05', title: 'Kitchen installation begins', type: 'milestone' },
  { id: 'ev-10', date: '2026-10-12', title: 'Final snagging inspection', time: '10:00', type: 'site_visit', location: '42 Park Lane' },
  { id: 'ev-11', date: '2026-10-24', title: 'Practical completion & handover', time: '13:00', type: 'handover', location: '42 Park Lane' },
];

// ─── Client context ─────────────────────────────────────

export const hubClient: HubClient = {
  greeting: 'Welcome back, Sarah & David',
  projectName: '42 Park Lane Extension & Refurbishment',
  projectBadge: 'Active Project',
  initials: 'SD',
};

// ─── KPI metrics ────────────────────────────────────────

export const hubKpis: HubKpi[] = [
  {
    key: 'progress',
    label: 'Overall Progress',
    value: '64% Complete',
    sub: 'On Schedule',
    accent: 'emerald',
    progress: 64,
    icon: 'ri-line-chart-line',
  },
  {
    key: 'contract',
    label: 'Contract Financial Total',
    value: '£245,000.00',
    sub: 'Includes £12,500.00 approved variations',
    accent: 'indigo',
    icon: 'ri-file-text-line',
  },
  {
    key: 'paid',
    label: 'Total Paid to Date',
    value: '£140,000.00',
    sub: 'Across 3 certified valuations',
    accent: 'slate',
    icon: 'ri-bank-card-line',
  },
  {
    key: 'pending',
    label: 'Pending Approvals',
    value: '1 Variation',
    sub: 'Awaiting client sign-off',
    accent: 'amber',
    icon: 'ri-error-warning-line',
  },
];

// ─── Project timeline ───────────────────────────────────

export const timelinePhases: TimelinePhase[] = [
  {
    id: 'ph-1',
    name: 'Substructure & Groundworks',
    status: 'completed',
    completedDate: '14 May 2026',
  },
  {
    id: 'ph-2',
    name: 'Superstructure & Timber Frame',
    status: 'completed',
    completedDate: '28 Jun 2026',
  },
  {
    id: 'ph-3',
    name: 'Roofing & External Envelope',
    status: 'completed',
    completedDate: '02 Aug 2026',
  },
  {
    id: 'ph-4',
    name: 'MEP First Fix & Plastering',
    status: 'in_progress',
    progress: 75,
    targetDate: 'Target 05 Sept 2026',
  },
  {
    id: 'ph-5',
    name: 'Kitchen, Joinery & Second Fix',
    status: 'upcoming',
  },
  {
    id: 'ph-6',
    name: 'Final Snagging & Handover',
    status: 'scheduled',
    targetDate: 'Scheduled Oct 2026',
  },
];

// ─── Pending variation ──────────────────────────────────

export const hubVariation: HubVariation = {
  reference: 'VO-004',
  title: 'Integrated Roof Skylights Upgrade',
  description: 'Add 2x Velux solar-powered rooflights to the kitchen extension.',
  costImpact: 3200,
  timeImpactDays: 0,
  attachments: [
    { name: 'Roofline_Drawing_v2.pdf', type: 'pdf' },
    { name: 'Velux_Spec.pdf', type: 'pdf' },
  ],
};

// ─── Certified payment schedule ─────────────────────────

export const paymentSchedule: PaymentScheduleItem[] = [
  {
    id: 'pay-1',
    reference: 'Interim Valuation #1',
    period: 'May 2026',
    certifiedAmount: 52000,
    retentionWithheld: 2600,
    status: 'paid',
  },
  {
    id: 'pay-2',
    reference: 'Interim Valuation #2',
    period: 'Jun 2026',
    certifiedAmount: 48000,
    retentionWithheld: 2400,
    status: 'paid',
  },
  {
    id: 'pay-3',
    reference: 'Interim Valuation #3',
    period: 'Jul 2026',
    certifiedAmount: 40000,
    retentionWithheld: 2000,
    status: 'paid',
  },
  {
    id: 'pay-4',
    reference: 'Interim Valuation #4',
    period: 'Aug 2026',
    certifiedAmount: 38000,
    retentionWithheld: 1900,
    status: 'due',
    dueDate: '10 Sept',
  },
  {
    id: 'pay-5',
    reference: 'Final Account',
    period: 'Completion',
    certifiedAmount: 0,
    retentionWithheld: 0,
    status: 'upcoming',
  },
];

// ─── Site photo feed ────────────────────────────────────

export const sitePhotos: SitePhoto[] = [
  {
    id: 'sp-1',
    caption: 'Plastering complete in Master Bedroom',
    dateTime: '2026-08-25',
    location: 'First Floor',
    imageUrl:
      'https://readdy.ai/api/search-image?query=Photograph%20of%20a%20freshly%20plastered%20master%20bedroom%20interior%20in%20a%20residential%20extension%2C%20smooth%20pale%20skimmed%20walls%2C%20large%20window%20with%20soft%20natural%20daylight%2C%20clean%20empty%20room%20ready%20for%20second%20fix%2C%20professional%20interior%20construction%20photography%2C%20bright%20airy%20atmosphere%2C%20warm%20neutral%20tones%2C%20high%20detail&width=1200&height=800&seq=clienthub-sp-001&orientation=landscape',
  },
  {
    id: 'sp-2',
    caption: 'Velux rooflight openings formed on kitchen roof',
    dateTime: '2026-08-22',
    location: 'Roof',
    imageUrl:
      'https://readdy.ai/api/search-image?query=Photograph%20of%20a%20residential%20kitchen%20extension%20roof%20under%20construction%20with%20two%20freshly%20formed%20skylight%20openings%2C%20timber%20rafters%20and%20insulation%20visible%2C%20soft%20overcast%20daylight%2C%20professional%20site%20documentation%20photography%2C%20clean%20organised%20worksite%2C%20warm%20neutral%20colour%20palette%2C%20crisp%20detail&width=1200&height=800&seq=clienthub-sp-002&orientation=landscape',
  },
  {
    id: 'sp-3',
    caption: 'Timber frame erected to rear elevation',
    dateTime: '2026-08-18',
    location: 'Rear Garden',
    imageUrl:
      'https://readdy.ai/api/search-image?query=Photograph%20of%20a%20new%20timber%20frame%20extension%20structure%20erected%20against%20the%20rear%20elevation%20of%20a%20UK%20brick%20home%2C%20exposed%20timber%20studwork%20and%20engineered%20joists%2C%20bright%20morning%20daylight%2C%20professional%20construction%20photography%2C%20clean%20composition%2C%20warm%20natural%20tones%2C%20high%20detail&width=1200&height=800&seq=clienthub-sp-003&orientation=landscape',
  },
  {
    id: 'sp-4',
    caption: 'External brickwork & envelope weathertight',
    dateTime: '2026-08-10',
    location: 'West Elevation',
    imageUrl:
      'https://readdy.ai/api/search-image?query=Photograph%20of%20a%20newly%20completed%20brickwork%20external%20wall%20on%20a%20residential%20extension%2C%20neat%20red%20brick%20with%20lime%20mortar%20joints%2C%20new%20windows%20and%20roof%20line%20in%20place%2C%20soft%20daylight%2C%20professional%20construction%20site%20photography%2C%20crisp%20detail%2C%20clean%20warm%20tones&width=1200&height=800&seq=clienthub-sp-004&orientation=landscape',
  },
  {
    id: 'sp-5',
    caption: 'Groundworks & foundations poured',
    dateTime: '2026-05-06',
    location: 'Substructure',
    imageUrl:
      'https://readdy.ai/api/search-image?query=Photograph%20of%20freshly%20poured%20concrete%20strip%20foundations%20and%20substructure%20brickwork%20for%20a%20residential%20extension%2C%20steel%20reinforcement%20and%20damp%20proof%20membrane%20visible%2C%20bright%20daylight%2C%20professional%20groundworks%20photography%2C%20clean%20organised%20excavation%2C%20warm%20neutral%20tones&width=1200&height=800&seq=clienthub-sp-005&orientation=landscape',
  },
  {
    id: 'sp-6',
    caption: 'First fix MEP services routed through ceiling',
    dateTime: '2026-08-15',
    location: 'Ground Floor',
    imageUrl:
      'https://readdy.ai/api/search-image?query=Photograph%20of%20first%20fix%20mechanical%20electrical%20and%20plumbing%20services%20routed%20through%20a%20residential%20extension%20ceiling%20void%2C%20neat%20copper%20pipework%20and%20cable%20runs%20with%20insulation%2C%20bright%20interior%20lighting%2C%20professional%20construction%20photography%2C%20crisp%20detail%2C%20neutral%20warm%20palette&width=1200&height=800&seq=clienthub-sp-006&orientation=landscape',
  },
];

// ─── Document library ───────────────────────────────────

export const documentLibrary: DocumentItem[] = [
  { id: 'doc-1', name: 'Architectural Drawings (Rev D)', meta: 'PDF · 24 pages', icon: 'ri-draft-line' },
  { id: 'doc-2', name: 'Planning Permission Approval', meta: 'PDF · Council issued', icon: 'ri-government-line' },
  { id: 'doc-3', name: 'Building Control Full Plans', meta: 'PDF · Approved', icon: 'ri-building-2-line' },
  { id: 'doc-4', name: 'Party Wall Agreement', meta: 'PDF · Signed', icon: 'ri-file-list-3-line' },
  { id: 'doc-5', name: 'Structural Warranty (LABC)', meta: 'PDF · 10 year', icon: 'ri-shield-check-line' },
];

// ─── Assigned project team ──────────────────────────────

export const projectTeam: TeamMember = {
  name: 'Marcus Vance',
  role: 'Lead Project Manager',
  initials: 'MV',
  phone: '020 7946 0912',
  email: 'marcus.vance@buildnerve.co.uk',
};