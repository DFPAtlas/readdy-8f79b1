// BuildNerve — UK Legal Guidance Centre: central structured source of truth.
//
// This file is the single place where legal guidance wording lives. It is
// deliberately neutral, general information — not legal advice — and every
// section carries its jurisdiction, review dates and official source links so
// an administrator can update the wording in one place when rules change.
//
// BuildNerve does not decide liability, predict outcomes, calculate limitation
// dates or tell users what to claim.

import type { DisputeCategory, DisputeRelationshipType, DisputeStage, Jurisdiction } from '@/types/disputes';

// ─── Guidance model ──────────────────────────────────────────────────────────

export type GuidanceJurisdiction = 'england_wales' | 'scotland' | 'northern_ireland';

export type GuidanceContentStatus = 'current' | 'under_review';

export interface GuidanceSourceLink {
  label: string;
  organisation: string;
  url: string;
}

export type GuidanceBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'note'; text: string }
  | { type: 'links'; items: GuidanceSourceLink[] };

export interface GuidanceSection {
  id: string;
  title: string;
  summary: string;
  // 'england_wales' → procedural court steps for England & Wales only.
  // 'all' → general evidence-preservation / negotiation guidance shown for every jurisdiction.
  appliesTo: 'england_wales' | 'all';
  // Optional filters used to surface relevant contextual cards on a dispute.
  relationshipTypes?: DisputeRelationshipType[];
  disputeCategories?: DisputeCategory[];
  stages?: DisputeStage[];
  sources: GuidanceSourceLink[];
  lastReviewed: string;
  reviewDue: string;
  contentStatus: GuidanceContentStatus;
  blocks: GuidanceBlock[];
}

// ─── Official sources (real UK URLs, labelled) ──────────────────────────────

export const OFFICIAL_SOURCES = {
  consumerRightsAct: {
    label: 'Consumer Rights Act 2015',
    organisation: 'legislation.gov.uk',
    url: 'https://www.legislation.gov.uk/ukpga/2015/15/contents',
  },
  cpr: {
    label: 'Civil Procedure Rules',
    organisation: 'Ministry of Justice',
    url: 'https://www.justice.gov.uk/courts/procedure-rules/civil',
  },
  cedProtocol: {
    label: 'Pre-Action Protocol for Construction and Engineering Disputes',
    organisation: 'Ministry of Justice',
    url: 'https://www.justice.gov.uk/courts/procedure-rules/civil/protocol/prot_ced',
  },
  moneyClaim: {
    label: 'Make a court claim for money',
    organisation: 'GOV.UK',
    url: 'https://www.gov.uk/make-court-claim-for-money',
  },
  adr: {
    label: 'Alternative dispute resolution',
    organisation: 'GOV.UK',
    url: 'https://www.gov.uk/guidance/alternative-dispute-resolution-for-consumers',
  },
  citizensAdvice: {
    label: 'Citizens Advice consumer service',
    organisation: 'Citizens Advice',
    url: 'https://www.citizensadvice.org.uk/consumer/',
  },
  findSolicitor: {
    label: 'Find a solicitor',
    organisation: 'The Law Society',
    url: 'https://solicitors.lawsociety.org.uk/',
  },
} satisfies Record<string, GuidanceSourceLink>;

// ─── Guidance sections ───────────────────────────────────────────────────────

export const GUIDANCE_SECTIONS: GuidanceSection[] = [
  {
    id: 'start-here',
    title: 'Start here',
    summary: 'How the BuildNerve Legal Guidance Centre works, and what it can and cannot help with.',
    appliesTo: 'all',
    sources: [],
    lastReviewed: '27 August 2026',
    reviewDue: '27 February 2027',
    contentStatus: 'current',
    blocks: [
      {
        type: 'paragraph',
        text: 'BuildNerve is a neutral platform. It helps you record and work through issues on your projects, and keeps a reliable history of what happened. It does not take sides.',
      },
      {
        type: 'paragraph',
        text: 'This guidance is general information only. It is not legal advice, and it is not tailored to your particular situation.',
      },
      {
        type: 'paragraph',
        text: 'BuildNerve does not determine liability, and it does not predict what a court, tribunal or other body might decide.',
      },
      {
        type: 'paragraph',
        text: 'Court proceedings should normally be treated as a last resort. Many issues can be resolved through clear communication, negotiation or alternative dispute resolution (ADR).',
      },
      {
        type: 'paragraph',
        text: 'Deadlines, court fees, forms and procedures can change over time and may depend on the facts of your case. Always check current official sources before acting.',
      },
      {
        type: 'note',
        text: 'If you are unsure about your position or your rights, consider obtaining independent advice.',
      },
    ],
  },
  {
    id: 'consumer-trader',
    title: 'Consumer and trader disputes',
    summary: 'Plain-English guidance on common consumer rights where a trader provides a service to a consumer.',
    appliesTo: 'england_wales',
    relationshipTypes: ['homeowner_trader', 'trader_homeowner'],
    sources: [OFFICIAL_SOURCES.consumerRightsAct],
    lastReviewed: '27 August 2026',
    reviewDue: '27 February 2027',
    contentStatus: 'current',
    blocks: [
      {
        type: 'paragraph',
        text: 'Where a trader supplies a service to a consumer, the service should generally be performed with reasonable care and skill.',
      },
      {
        type: 'paragraph',
        text: 'Information that the consumer relies on about the service may form part of the contract, including what the trader said or provided before or when the contract was made.',
      },
      {
        type: 'paragraph',
        text: 'Where the contract does not fix a time or a price, rules about a reasonable time and a reasonable price may apply.',
      },
      {
        type: 'paragraph',
        text: 'Possible consumer remedies can include repeat performance or an appropriate reduction in price, depending on the circumstances.',
      },
      {
        type: 'paragraph',
        text: 'BuildNerve cannot determine whether a statutory right has been breached in any particular case.',
      },
      {
        type: 'note',
        text: 'The key statutory source is the Consumer Rights Act 2015. See the official link below.',
      },
    ],
  },
  {
    id: 'construction-engineering',
    title: 'Construction and engineering disputes',
    summary: 'What parties to a construction or engineering dispute may be expected to do before court proceedings.',
    appliesTo: 'england_wales',
    relationshipTypes: ['contractor_subcontractor', 'business_business'],
    disputeCategories: ['defective_work', 'incomplete_work', 'delay', 'contract_scope'],
    sources: [OFFICIAL_SOURCES.cedProtocol, OFFICIAL_SOURCES.cpr],
    lastReviewed: '27 August 2026',
    reviewDue: '27 February 2027',
    contentStatus: 'current',
    blocks: [
      {
        type: 'paragraph',
        text: 'A specific Pre-Action Protocol for Construction and Engineering Disputes may apply to many construction and engineering disputes in England and Wales.',
      },
      {
        type: 'paragraph',
        text: 'The general aim is for parties to exchange enough information to understand each other\u2019s positions before proceedings are started.',
      },
      {
        type: 'paragraph',
        text: 'Responses and the costs of the process should remain proportionate to the value and complexity of the matter.',
      },
      {
        type: 'paragraph',
        text: 'Parties should consider settlement and alternative dispute resolution (ADR) at an early stage.',
      },
      {
        type: 'paragraph',
        text: 'Complex or high-value matters may require specialist advice.',
      },
      {
        type: 'note',
        text: 'BuildNerve does not confirm whether any protocol applies to your specific dispute. See the official Civil Procedure Rules source below.',
      },
    ],
  },
  {
    id: 'pre-action',
    title: 'General pre-action conduct',
    summary: 'Steps a claimant and defendant are generally expected to take before starting court proceedings.',
    appliesTo: 'england_wales',
    stages: ['under_discussion', 'pre_action'],
    disputeCategories: ['non_payment', 'disputed_variation', 'damage', 'access_problem'],
    sources: [OFFICIAL_SOURCES.cpr],
    lastReviewed: '27 August 2026',
    reviewDue: '27 February 2027',
    contentStatus: 'current',
    blocks: [
      {
        type: 'paragraph',
        text: 'Before court proceedings, a claimant should clearly describe the basis of the claim and what happened.',
      },
      {
        type: 'paragraph',
        text: 'The remedy sought, and how any money claim is calculated, should be stated.',
      },
      {
        type: 'paragraph',
        text: 'The defendant should receive a reasonable opportunity to respond before proceedings are started.',
      },
      {
        type: 'paragraph',
        text: 'Key relevant documents should be exchanged where appropriate.',
      },
      {
        type: 'paragraph',
        text: 'Both parties should consider negotiation or ADR before issuing a claim.',
      },
      {
        type: 'note',
        text: 'Failure to follow applicable court procedures may have consequences, including on costs. This is general information and not a statement about your particular case.',
      },
    ],
  },
  {
    id: 'small-claims',
    title: 'Small-claims information',
    summary: 'General information about the small-claims track for England and Wales.',
    appliesTo: 'england_wales',
    disputeCategories: ['non_payment', 'refund'],
    sources: [OFFICIAL_SOURCES.moneyClaim],
    lastReviewed: '27 August 2026',
    reviewDue: '27 February 2027',
    contentStatus: 'current',
    blocks: [
      {
        type: 'paragraph',
        text: 'In England and Wales, the small-claims track normally deals with many money claims up to \u00a310,000.',
      },
      {
        type: 'paragraph',
        text: 'Track allocation is a decision for the court, not for the parties.',
      },
      {
        type: 'paragraph',
        text: 'Disputed qualifying money claims may require mediation before a hearing.',
      },
      {
        type: 'paragraph',
        text: 'Court directions determine document-exchange deadlines.',
      },
      {
        type: 'paragraph',
        text: 'Expert evidence generally requires the court\u2019s permission.',
      },
      {
        type: 'paragraph',
        text: 'The amount of costs that can be recovered can be limited.',
      },
      {
        type: 'note',
        text: 'Fees, forms and procedures change. Verify current information directly with GOV.UK or HMCTS before relying on it.',
      },
    ],
  },
  {
    id: 'evidence',
    title: 'Evidence guidance',
    summary: 'How to preserve information that may be relevant to a dispute.',
    appliesTo: 'all',
    stages: ['evidence_collection'],
    sources: [],
    lastReviewed: '27 August 2026',
    reviewDue: '27 February 2027',
    contentStatus: 'current',
    blocks: [
      {
        type: 'paragraph',
        text: 'Where a dispute may arise, keep a clear, dated record of relevant information. This can include:',
      },
      {
        type: 'bullets',
        items: [
          'Contracts and accepted quotations',
          'Scope and specifications',
          'Variations',
          'Messages and emails',
          'Invoices and payments',
          'Photographs and videos',
          'Inspection and defect reports',
          'Remedial estimates',
          'Witness information',
          'Settlement attempts',
        ],
      },
      {
        type: 'paragraph',
        text: 'Relevance, reliability and admissibility are ultimately matters for the court. Keeping a record does not by itself prove that a claim or defence is valid.',
      },
      {
        type: 'note',
        text: 'Use the Evidence tab on your dispute to store files safely. Files are served through private, time-limited links and are never exposed publicly.',
      },
    ],
  },
  {
    id: 'adr-mediation',
    title: 'ADR and mediation',
    summary: 'Options for resolving a dispute without going to court.',
    appliesTo: 'all',
    stages: ['negotiation', 'mediation_considered'],
    sources: [OFFICIAL_SOURCES.adr],
    lastReviewed: '27 August 2026',
    reviewDue: '27 February 2027',
    contentStatus: 'current',
    blocks: [
      {
        type: 'paragraph',
        text: 'Alternative dispute resolution (ADR) describes ways of resolving a dispute without court proceedings. Common forms include:',
      },
      {
        type: 'bullets',
        items: [
          'Direct negotiation',
          'Mediation',
          'Arbitration, where appropriate',
          'Early neutral evaluation',
          'Consumer ADR providers',
        ],
      },
      {
        type: 'paragraph',
        text: 'Check whether an ADR provider is currently accredited or approved before relying on it.',
      },
      {
        type: 'note',
        text: 'ADR may not be suitable for every dispute. BuildNerve does not recommend whether you should accept or reject a particular outcome.',
      },
    ],
  },
  {
    id: 'getting-help',
    title: 'Getting help',
    summary: 'Carefully labelled links to official and independent sources of help.',
    appliesTo: 'england_wales',
    sources: [],
    lastReviewed: '27 August 2026',
    reviewDue: '27 February 2027',
    contentStatus: 'current',
    blocks: [
      {
        type: 'paragraph',
        text: 'The following are official or independent sources that may help you understand your position. BuildNerve does not operate or control any of these services.',
      },
      {
        type: 'links',
        items: [
          OFFICIAL_SOURCES.moneyClaim,
          OFFICIAL_SOURCES.cpr,
          OFFICIAL_SOURCES.citizensAdvice,
          OFFICIAL_SOURCES.findSolicitor,
          OFFICIAL_SOURCES.adr,
        ],
      },
      {
        type: 'note',
        text: 'Always verify that information is current and that a provider is accredited or approved before acting on it.',
      },
    ],
  },
];

// ─── Section lookup helpers ─────────────────────────────────────────────────

export function getGuidanceSection(id: string): GuidanceSection | undefined {
  return GUIDANCE_SECTIONS.find((s) => s.id === id);
}

export function getSectionsForJurisdiction(jurisdiction: GuidanceJurisdiction): GuidanceSection[] {
  if (jurisdiction === 'england_wales') return GUIDANCE_SECTIONS;
  // Scotland / Northern Ireland: general guidance only, no England & Wales court steps.
  return GUIDANCE_SECTIONS.filter((s) => s.appliesTo === 'all');
}

// ─── Contextual guidance (surfaced on a dispute detail page) ───────────────

interface ContextualDispute {
  jurisdiction: Jurisdiction;
  relationship_type: DisputeRelationshipType;
  dispute_category: DisputeCategory;
  current_stage: DisputeStage;
}

export function getContextualGuidance(dispute: ContextualDispute): GuidanceSection[] {
  // Version one only produces England & Wales procedural guidance. If the
  // dispute is not England & Wales, only general guidance is relevant.
  const base = dispute.jurisdiction === 'england_wales' ? GUIDANCE_SECTIONS : getSectionsForJurisdiction('scotland');

  const matches: GuidanceSection[] = [];

  const push = (id: string) => {
    if (matches.some((m) => m.id === id)) return;
    const section = base.find((s) => s.id === id);
    if (section) matches.push(section);
  };

  // Stage-driven guidance first (most immediate context).
  if (dispute.current_stage === 'evidence_collection') push('evidence');
  if (dispute.current_stage === 'negotiation' || dispute.current_stage === 'mediation_considered') push('adr-mediation');
  if (dispute.current_stage === 'pre_action') {
    push('pre-action');
    push('small-claims');
  }

  // Relationship-driven guidance.
  if (dispute.relationship_type === 'homeowner_trader' || dispute.relationship_type === 'trader_homeowner') {
    push('consumer-trader');
  }
  if (dispute.relationship_type === 'contractor_subcontractor' || dispute.relationship_type === 'business_business') {
    push('construction-engineering');
  }
  if (dispute.relationship_type === 'unpaid_invoice') push('small-claims');

  // Category-driven guidance.
  if (dispute.dispute_category === 'non_payment') push('small-claims');
  if (
    dispute.dispute_category === 'defective_work' ||
    dispute.dispute_category === 'incomplete_work' ||
    dispute.dispute_category === 'delay' ||
    dispute.dispute_category === 'contract_scope'
  ) {
    push('construction-engineering');
  }

  // If nothing matched, always offer the neutral start-here guidance.
  if (matches.length === 0) push('start-here');

  return matches.slice(0, 3);
}