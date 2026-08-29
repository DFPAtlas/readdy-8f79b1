// Phase 23 — Snagging & defects demo data
// Drives the job-detail "Snagging" tab. Mirrors the mock-driven pattern
// used elsewhere in the job detail page.

export type SnagDefectType = 'snag' | 'defect';
export type SnagSeverity = 'low' | 'medium' | 'high' | 'critical';
export type SnagStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface DemoSnag {
  id: string;
  reference: string;
  title: string;
  description: string;
  area: string;
  trade: string;
  defectType: SnagDefectType;
  severity: SnagSeverity;
  status: SnagStatus;
  assignedTo?: string;
  raisedBy: string;
  targetDate?: string;
  resolutionNote?: string;
  updatedAt: string;
}

const snagsByJob: Record<string, DemoSnag[]> = {
  'sl-1048': [
    {
      id: 'sng-1',
      reference: 'SNG-001',
      title: 'Bi-fold door threshold not level',
      description: 'Threshold sits 4mm low on the left end, water could pool and the door drags on closing.',
      area: 'Kitchen / rear elevation',
      trade: 'Carpentry',
      defectType: 'snag',
      severity: 'medium',
      status: 'open',
      assignedTo: 'James Lawrence',
      raisedBy: 'Martin Hewett',
      targetDate: '2026-08-14',
      updatedAt: '6 Aug 2026',
    },
    {
      id: 'sng-2',
      reference: 'SNG-002',
      title: 'Skirting gap at floor junction',
      description: 'Noticeable gap between skirting and new floor in the kitchen run.',
      area: 'Kitchen',
      trade: 'General building',
      defectType: 'snag',
      severity: 'low',
      status: 'in_progress',
      assignedTo: 'Adam Khan',
      raisedBy: 'Martin Hewett',
      updatedAt: '5 Aug 2026',
    },
    {
      id: 'sng-3',
      reference: 'SNG-003',
      title: 'Plaster crack above doorway',
      description: 'Hairline crack visible above the kitchen doorway following steel works.',
      area: 'Kitchen / hallway',
      trade: 'Plastering',
      defectType: 'defect',
      severity: 'medium',
      status: 'open',
      assignedTo: 'Plastering sub-contractor',
      raisedBy: 'Martin Hewett',
      targetDate: '2026-08-18',
      updatedAt: '4 Aug 2026',
    },
    {
      id: 'sng-4',
      reference: 'SNG-004',
      title: 'Downlighter not seated flush',
      description: 'One downlighter in the ceiling sits proud of the board.',
      area: 'Kitchen ceiling',
      trade: 'Electrical',
      defectType: 'snag',
      severity: 'low',
      status: 'resolved',
      assignedTo: 'David Hughes',
      raisedBy: 'Martin Hewett',
      resolutionNote: 'Re-seated and clipped flush.',
      updatedAt: '3 Aug 2026',
    },
    {
      id: 'sng-5',
      reference: 'SNG-005',
      title: 'Roof lantern glass marked',
      description: 'Protective film residue and smears on inner face of the lantern glass.',
      area: 'Roof lantern',
      trade: 'General building',
      defectType: 'snag',
      severity: 'low',
      status: 'closed',
      assignedTo: 'Adam Khan',
      raisedBy: 'Sarah Miller',
      resolutionNote: 'Cleaned and verified with client.',
      updatedAt: '2 Aug 2026',
    },
  ],
  'sl-1051': [
    {
      id: 'sng-6',
      reference: 'SNG-006',
      title: 'Floor box not level',
      description: 'Floor box in the meeting room sits proud and rocks underfoot.',
      area: 'Ground floor meeting room',
      trade: 'Electrical',
      defectType: 'snag',
      severity: 'medium',
      status: 'open',
      assignedTo: 'David Hughes',
      raisedBy: 'Martin Hewett',
      targetDate: '2026-08-12',
      updatedAt: '6 Aug 2026',
    },
    {
      id: 'sng-7',
      reference: 'SNG-007',
      title: 'Data outlet not terminated',
      description: 'Two data outlets in the open-plan area have no termination.',
      area: 'First floor open plan',
      trade: 'Electrical',
      defectType: 'snag',
      severity: 'medium',
      status: 'in_progress',
      assignedTo: 'Ruth Pearson',
      raisedBy: 'Martin Hewett',
      updatedAt: '5 Aug 2026',
    },
    {
      id: 'sng-8',
      reference: 'DEF-001',
      title: 'Emergency lighting circuit fault',
      description: 'Emergency luminaire test fails on the south stair — likely a faulty unit or wiring.',
      area: 'South stairwell',
      trade: 'Electrical',
      defectType: 'defect',
      severity: 'high',
      status: 'open',
      assignedTo: 'David Hughes',
      raisedBy: 'Martin Hewett',
      targetDate: '2026-08-10',
      updatedAt: '4 Aug 2026',
    },
    {
      id: 'sng-9',
      reference: 'SNG-008',
      title: 'Switch plate loose to wall',
      description: 'Light switch in the reception area is loose.',
      area: 'Reception',
      trade: 'Electrical',
      defectType: 'snag',
      severity: 'low',
      status: 'resolved',
      assignedTo: 'Ruth Pearson',
      raisedBy: 'James North',
      resolutionNote: 'Tightened and reseated.',
      updatedAt: '3 Aug 2026',
    },
  ],
  'sl-1039': [
    {
      id: 'sng-10',
      reference: 'SNG-009',
      title: 'Shopfront glazing seal gap',
      description: 'External sealant gap on the lower glazing bead, risk of water ingress.',
      area: 'Shopfront',
      trade: 'General building',
      defectType: 'defect',
      severity: 'high',
      status: 'open',
      assignedTo: 'Shopfront Solutions Ltd',
      raisedBy: 'Martin Hewett',
      targetDate: '2026-08-11',
      updatedAt: '6 Aug 2026',
    },
    {
      id: 'sng-11',
      reference: 'SNG-010',
      title: 'Suspended ceiling tile damaged',
      description: 'Two ceiling tiles cracked during HVAC install.',
      area: 'Sales floor',
      trade: 'Ceiling & Partition Co',
      defectType: 'snag',
      severity: 'low',
      status: 'in_progress',
      assignedTo: 'Ceiling & Partition Co',
      raisedBy: 'Martin Hewett',
      updatedAt: '5 Aug 2026',
    },
    {
      id: 'sng-12',
      reference: 'DEF-002',
      title: 'Floor screed cracking at entrance',
      description: 'Hairline cracks radiating from the main entrance door reveal.',
      area: 'Entrance',
      trade: 'Groundworks',
      defectType: 'defect',
      severity: 'high',
      status: 'open',
      assignedTo: 'Martin Hewett',
      raisedBy: 'Martin Hewett',
      targetDate: '2026-08-20',
      updatedAt: '4 Aug 2026',
    },
    {
      id: 'sng-13',
      reference: 'SNG-011',
      title: 'Paint run on column',
      description: 'Paint run on the west structural column below the HVAC bulkhead.',
      area: 'Sales floor',
      trade: 'Decorating',
      defectType: 'snag',
      severity: 'low',
      status: 'resolved',
      assignedTo: 'Decorating sub-contractor',
      raisedBy: 'Mark Stevens',
      resolutionNote: 'Sanded and repainted.',
      updatedAt: '3 Aug 2026',
    },
  ],
  'sl-1042': [
    {
      id: 'sng-14',
      reference: 'SNG-012',
      title: 'Silicon beading uneven around bath',
      description: 'Uneven bead and a small gap at the tap end of the bath.',
      area: 'Bathroom',
      trade: 'Plumbing',
      defectType: 'snag',
      severity: 'low',
      status: 'in_progress',
      assignedTo: 'Chris Walker',
      raisedBy: 'Martin Hewett',
      updatedAt: '5 Aug 2026',
    },
    {
      id: 'sng-15',
      reference: 'SNG-013',
      title: 'Tile lippage in shower',
      description: 'One tile in the shower sits proud of the adjacent course.',
      area: 'Shower enclosure',
      trade: 'Tiling',
      defectType: 'snag',
      severity: 'medium',
      status: 'open',
      assignedTo: 'TilePro',
      raisedBy: 'Martin Hewett',
      targetDate: '2026-08-09',
      updatedAt: '4 Aug 2026',
    },
    {
      id: 'sng-16',
      reference: 'DEF-003',
      title: 'Extractor fan not venting',
      description: 'Inline extractor runs but no airflow at the vent — ducting may be crushed.',
      area: 'Bathroom ceiling',
      trade: 'Plumbing',
      defectType: 'defect',
      severity: 'high',
      status: 'open',
      assignedTo: 'Chris Walker',
      raisedBy: 'Priya Shah',
      targetDate: '2026-08-10',
      updatedAt: '3 Aug 2026',
    },
  ],
  'sl-1054': [
    {
      id: 'sng-17',
      reference: 'SNG-014',
      title: 'Boiler flue bracket loose',
      description: 'Flue support bracket needs tightening to manufacturer spec.',
      area: 'Garage',
      trade: 'Heating and gas',
      defectType: 'snag',
      severity: 'medium',
      status: 'open',
      assignedTo: 'James Lawrence',
      raisedBy: 'Martin Hewett',
      targetDate: '2026-08-09',
      updatedAt: '6 Aug 2026',
    },
  ],
};

export function getDemoSnagsByJob(jobId: string): DemoSnag[] {
  return snagsByJob[jobId] ?? [];
}

export const SNAG_STATUS_LABELS: Record<SnagStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const SNAG_SEVERITY_LABELS: Record<SnagSeverity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export function getSnagStatusColor(status: SnagStatus): string {
  const colors: Record<SnagStatus, string> = {
    open: 'bg-status-red-pale text-status-red',
    in_progress: 'bg-status-amber-pale text-status-amber',
    resolved: 'bg-status-blue-pale text-status-blue',
    closed: 'bg-primary-50 text-primary-700',
  };
  return colors[status];
}

export function getSnagSeverityColor(severity: SnagSeverity): string {
  const colors: Record<SnagSeverity, string> = {
    low: 'bg-status-green text-white',
    medium: 'bg-status-amber text-white',
    high: 'bg-status-red text-white',
    critical: 'bg-status-red text-white',
  };
  return colors[severity];
}

export function getSnagDefectTypeLabel(defectType: SnagDefectType): string {
  return defectType === 'snag' ? 'Snag' : 'Defect';
}

export function getSnagDefectTypeColor(defectType: SnagDefectType): string {
  return defectType === 'snag'
    ? 'bg-status-blue-pale text-status-blue'
    : 'bg-status-red-pale text-status-red';
}

export const SNAG_TRADES = [
  'General building',
  'Electrical',
  'Plumbing',
  'Heating and gas',
  'Carpentry',
  'Roofing',
  'Plastering',
  'Decorating',
  'Groundworks',
  'Tiling',
  'Multi-trade',
];