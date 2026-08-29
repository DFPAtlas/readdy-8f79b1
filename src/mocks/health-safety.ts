// Phase 21 — RAMS, toolbox talks & CDM duty holders demo data
// Drives the job-detail "Health & safety" tab. Mirrors the mock-driven
// pattern used elsewhere in the job detail page.

export type RamsStatus = 'draft' | 'ai_generated' | 'reviewed' | 'approved' | 'superseded';
export type CdmRole = 'client' | 'principal_designer' | 'principal_contractor' | 'contractor';

export interface DemoRams {
  id: string;
  title: string;
  status: RamsStatus;
  generatedByAi: boolean;
  version: number;
  reviewedByName?: string;
  approvedByName?: string;
  approvedAt?: string;
  updatedAt: string;
  hazards: string[];
  controlMeasures: string[];
}

export interface DemoToolboxTalk {
  id: string;
  topic: string;
  deliveredAt: string;
  deliveredByName: string;
  attendees: string[];
}

export interface DemoDutyHolder {
  id: string;
  role: CdmRole;
  name: string;
  appointedAt?: string;
}

export interface DemoHealthSafety {
  rams: DemoRams[];
  toolboxTalks: DemoToolboxTalk[];
  dutyHolders: DemoDutyHolder[];
}

const healthSafetyByJob: Record<string, DemoHealthSafety> = {
  'sl-1048': {
    rams: [
      {
        id: 'rams-1',
        title: 'Groundworks & foundations RAMS',
        status: 'approved',
        generatedByAi: false,
        version: 2,
        reviewedByName: 'Martin Hewett',
        approvedByName: 'Martin Hewett',
        approvedAt: '12 Jun 2026',
        updatedAt: '12 Jun 2026',
        hazards: ['Ground collapse during excavation', 'Strike of buried services', 'Noise and vibration from plant'],
        controlMeasures: ['CAT scan and utility plans before digging', 'Edge protection and barriers around excavations', 'Inspect excavations before each shift', 'Exclusion zone for plant movements'],
      },
      {
        id: 'rams-2',
        title: 'Structural steel installation RAMS',
        status: 'reviewed',
        generatedByAi: true,
        version: 1,
        reviewedByName: 'Martin Hewett',
        updatedAt: '28 Jul 2026',
        hazards: ['Crush injury from steel members', 'Working at height during lifting', 'Load swing during crane lift'],
        controlMeasures: ['Lifting plan with competent slinger/signaller', 'Never work under a suspended load', 'Fall protection while connecting at height', 'Exclusion zone beneath the lifting area'],
      },
      {
        id: 'rams-3',
        title: 'Brickwork & blockwork RAMS',
        status: 'draft',
        generatedByAi: true,
        version: 1,
        updatedAt: '5 Aug 2026',
        hazards: ['Silica dust from cutting', 'Manual handling of blocks', 'Work at height on scaffold'],
        controlMeasures: ['Wet cut and M-class dust extraction', 'Team lift blocks over 25kg', 'Scaffold with guardrails and toe boards'],
      },
    ],
    toolboxTalks: [
      { id: 'tt-1', topic: 'Working at height', deliveredAt: '2 Aug 2026', deliveredByName: 'Martin Hewett', attendees: ['Martin Hewett', 'James Lawrence', 'Adam Khan'] },
      { id: 'tt-2', topic: 'Manual handling', deliveredAt: '28 Jul 2026', deliveredByName: 'Martin Hewett', attendees: ['Martin Hewett', 'James Lawrence', 'Adam Khan'] },
      { id: 'tt-3', topic: 'Site housekeeping & waste', deliveredAt: '21 Jul 2026', deliveredByName: 'Martin Hewett', attendees: ['James Lawrence', 'Adam Khan'] },
    ],
    dutyHolders: [
      { id: 'cdm-1', role: 'client', name: 'Sarah & Ben Miller', appointedAt: 'Jun 2026' },
      { id: 'cdm-2', role: 'principal_designer', name: 'Alder Architects', appointedAt: 'Jun 2026' },
      { id: 'cdm-3', role: 'principal_contractor', name: 'BuildNerve Ltd', appointedAt: 'Jun 2026' },
      { id: 'cdm-4', role: 'contractor', name: 'BuildNerve Ltd', appointedAt: 'Jun 2026' },
    ],
  },
  'sl-1051': {
    rams: [
      {
        id: 'rams-4',
        title: 'Electrical installation RAMS',
        status: 'reviewed',
        generatedByAi: true,
        version: 1,
        reviewedByName: 'Martin Hewett',
        updatedAt: '18 Jul 2026',
        hazards: ['Electric shock from live circuits', 'Fire from faulty connections', 'Work at height for ceiling runs'],
        controlMeasures: ['Isolate and lock off circuits before work', 'Verify dead before starting (safe isolation)', '110V tools and PAT testing', 'Access equipment for ceiling work'],
      },
    ],
    toolboxTalks: [
      { id: 'tt-4', topic: 'Electrical safe isolation', deliveredAt: '18 Jul 2026', deliveredByName: 'David Hughes', attendees: ['David Hughes', 'Ruth Pearson'] },
    ],
    dutyHolders: [
      { id: 'cdm-5', role: 'client', name: 'Northlight Studio Ltd', appointedAt: 'Jul 2026' },
      { id: 'cdm-6', role: 'principal_designer', name: 'Not appointed', appointedAt: 'Jul 2026' },
      { id: 'cdm-7', role: 'principal_contractor', name: 'BuildNerve Ltd', appointedAt: 'Jul 2026' },
      { id: 'cdm-8', role: 'contractor', name: 'BuildNerve Ltd', appointedAt: 'Jul 2026' },
    ],
  },
  'sl-1039': {
    rams: [
      {
        id: 'rams-5',
        title: 'Strip-out & demolition RAMS',
        status: 'approved',
        generatedByAi: false,
        version: 3,
        reviewedByName: 'Martin Hewett',
        approvedByName: 'Martin Hewett',
        approvedAt: '28 May 2026',
        updatedAt: '28 May 2026',
        hazards: ['Asbestos exposure from suspect materials', 'Silica and general dust', 'Structural collapse during strip-out'],
        controlMeasures: ['Asbestos survey reviewed before start', 'M-class dust extraction and FFP3 respirators', 'Soft strip in sequence, avoid undermining structure'],
      },
      {
        id: 'rams-6',
        title: 'Working at height — shopfront & ceiling RAMS',
        status: 'reviewed',
        generatedByAi: true,
        version: 1,
        reviewedByName: 'Martin Hewett',
        updatedAt: '2 Aug 2026',
        hazards: ['Falls from scaffold or MEWP', 'Falling tools onto work area', 'Overhead services'],
        controlMeasures: ['Guardrails and toe boards on scaffold', 'Tool lanyards and exclusion zones', 'Check overhead services before drilling'],
      },
      {
        id: 'rams-7',
        title: 'Hot works RAMS',
        status: 'reviewed',
        generatedByAi: true,
        version: 1,
        reviewedByName: 'Martin Hewett',
        updatedAt: '30 Jul 2026',
        hazards: ['Fire from sparks or heat', 'Ignition of combustible materials', 'Smoke inhalation'],
        controlMeasures: ['Hot works permit in place', 'Fire watch for 60 minutes after work', 'Remove or shield combustibles', 'Fire extinguishers available'],
      },
    ],
    toolboxTalks: [
      { id: 'tt-5', topic: 'Asbestos awareness', deliveredAt: '28 May 2026', deliveredByName: 'Martin Hewett', attendees: ['Martin Hewett', 'Adam Khan', 'David Hughes', 'Ruth Pearson'] },
      { id: 'tt-6', topic: 'Hot works & fire watch', deliveredAt: '30 Jul 2026', deliveredByName: 'Martin Hewett', attendees: ['Martin Hewett', 'Adam Khan', 'David Hughes'] },
    ],
    dutyHolders: [
      { id: 'cdm-9', role: 'client', name: 'Kingsway Retail Group', appointedAt: 'May 2026' },
      { id: 'cdm-10', role: 'principal_designer', name: 'Alder Architects', appointedAt: 'May 2026' },
      { id: 'cdm-11', role: 'principal_contractor', name: 'BuildNerve Ltd', appointedAt: 'May 2026' },
      { id: 'cdm-12', role: 'contractor', name: 'BuildNerve Ltd', appointedAt: 'May 2026' },
    ],
  },
  'sl-1042': {
    rams: [
      {
        id: 'rams-8',
        title: 'Bathroom refurbishment RAMS',
        status: 'approved',
        generatedByAi: false,
        version: 1,
        reviewedByName: 'Martin Hewett',
        approvedByName: 'Martin Hewett',
        approvedAt: '5 Jul 2026',
        updatedAt: '5 Jul 2026',
        hazards: ['Water and electrical proximity', 'Dust from tile cutting', 'Manual handling of suite'],
        controlMeasures: ['Isolate electrics in work area', 'Wet cutting with dust suppression', 'Two-person lift for heavy suite items'],
      },
    ],
    toolboxTalks: [
      { id: 'tt-7', topic: 'Wet work & electrics', deliveredAt: '8 Jul 2026', deliveredByName: 'Chris Walker', attendees: ['Chris Walker', 'Martin Hewett'] },
    ],
    dutyHolders: [
      { id: 'cdm-13', role: 'client', name: 'Priya Shah', appointedAt: 'Jul 2026' },
      { id: 'cdm-14', role: 'principal_contractor', name: 'BuildNerve Ltd', appointedAt: 'Jul 2026' },
      { id: 'cdm-15', role: 'contractor', name: 'BuildNerve Ltd', appointedAt: 'Jul 2026' },
    ],
  },
  'sl-1054': {
    rams: [
      {
        id: 'rams-9',
        title: 'Boiler replacement RAMS',
        status: 'draft',
        generatedByAi: true,
        version: 1,
        updatedAt: '6 Aug 2026',
        hazards: ['Gas escape during disconnection', 'Working in confined garage space', 'Hot surfaces during commissioning'],
        controlMeasures: ['Gas Safe engineer only', 'Ventilation and gas tightness test', 'Allow system to cool before work'],
      },
    ],
    toolboxTalks: [],
    dutyHolders: [
      { id: 'cdm-16', role: 'client', name: 'Robert Ellis', appointedAt: 'Aug 2026' },
      { id: 'cdm-17', role: 'contractor', name: 'BuildNerve Ltd', appointedAt: 'Aug 2026' },
    ],
  },
};

export function getDemoHealthSafetyByJob(jobId: string): DemoHealthSafety {
  return (
    healthSafetyByJob[jobId] ?? {
      rams: [],
      toolboxTalks: [],
      dutyHolders: [],
    }
  );
}

export const HAZARD_CATEGORIES = [
  'Working at height',
  'Manual handling',
  'Electrical',
  'Fire / hot works',
  'Asbestos',
  'Dust / silica',
  'Noise / vibration',
  'Slips, trips & falls',
  'Plant & machinery',
  'Excavations',
  'Confined spaces',
  'Lifting operations',
  'COSHH (substances)',
  'Welfare & first aid',
  'Public & client safety',
  'Services / utilities',
];

export const CDM_ROLE_LABELS: Record<CdmRole, string> = {
  client: 'Client',
  principal_designer: 'Principal Designer',
  principal_contractor: 'Principal Contractor',
  contractor: 'Contractor',
};