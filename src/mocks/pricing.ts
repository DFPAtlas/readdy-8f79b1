export type BillingInterval = 'monthly' | 'annual';

export interface PlanTier {
  key: 'trades' | 'general' | 'enterprise';
  name: string;
  shortName: string;
  audience: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  includesLabel?: string;
  features: string[];
  cta: string;
  ctaHref: string;
  featured?: boolean;
  badge?: string;
}

export const plans: PlanTier[] = [
  {
    key: 'trades',
    name: 'Sole Trader & Trades',
    shortName: 'Sole Trader',
    audience: 'Subcontractors, single tradespeople & small specialty teams',
    description: 'Essential tools for site logs, digital receipts, and basic job tracking.',
    monthlyPrice: 36,
    annualPrice: 29,
    features: [
      'Up to 3 Active Jobs',
      'Mobile Voice-to-Text Daily Site Logs',
      'OCR Receipt & Delivery Docket Scanner',
      'Client Photo Sharing Feed',
      'Unlimited Subcontractor Invites',
    ],
    cta: 'Start 14-Day Free Trial',
    ctaHref: '/sign-up',
  },
  {
    key: 'general',
    name: 'General Contractor',
    shortName: 'General Contractor',
    audience: 'Growing residential builders & main contractors',
    description: 'Complete operational engine including CIS verification, payment applications, and retainage tracking.',
    monthlyPrice: 111,
    annualPrice: 89,
    includesLabel: 'Everything in Trades, plus:',
    features: [
      'Unlimited Active Jobs',
      'Automated HMRC CIS Verification & Monthly CIS300 Returns',
      'Domestic Reverse Charge (DRC) VAT Calculations',
      'Client & Tenant Portal with Variation E-Signatures',
      'Certified Payment Applications & Statutory Pay-Less Engine',
      'Retention Release Lifecycle Scheduler',
      'Bi-Directional Xero & QuickBooks Accounting Sync',
    ],
    cta: 'Get Started Now',
    ctaHref: '/sign-up',
    featured: true,
    badge: 'Most Popular for UK Contractors',
  },
  {
    key: 'enterprise',
    name: 'Enterprise & Commercial',
    shortName: 'Enterprise',
    audience: 'Multi-site regional contractors, commercial developers & high-volume firms',
    description: 'Advanced financial command center, custom API integrations, and dedicated account support.',
    monthlyPrice: 311,
    annualPrice: 249,
    includesLabel: 'Everything in General Contractor, plus:',
    features: [
      'Executive Cash Flow & Predictive Financial Forecasting Dashboard',
      'Plant & Equipment Tool Hire Tracking with Idle Burn Rate Alerts',
      'Unlimited Client & Developer Sub-Accounts',
      'Custom PDF Branding for Payment Certificates & Notices',
      'Priority Phone & On-Site Support + Dedicated Account Manager',
      'Custom API Access & Backend Database Connectors',
    ],
    cta: 'Contact Sales / Request Demo',
    ctaHref: 'mailto:sales@sterlinglet.co.uk',
  },
];

export type ComparisonCell = string | boolean;

export interface ComparisonRow {
  label: string;
  cells: [ComparisonCell, ComparisonCell, ComparisonCell];
}

export interface ComparisonCategory {
  title: string;
  icon: string;
  rows: ComparisonRow[];
}

export const comparisonCategories: ComparisonCategory[] = [
  {
    title: 'HMRC CIS & Tax Compliance',
    icon: 'ri-file-shield-2-line',
    rows: [
      { label: 'Subcontractor UTR lookup', cells: [false, true, true] },
      { label: 'CIS300 XML export', cells: [false, true, true] },
      { label: 'Domestic Reverse Charge (DRC) VAT', cells: [false, true, true] },
      { label: 'Monthly CIS statement', cells: [false, true, true] },
    ],
  },
  {
    title: 'Commercial & Financials',
    icon: 'ri-coins-line',
    rows: [
      { label: 'Variations & e-signatures', cells: [false, true, true] },
      { label: 'Statutory Pay-Less notices', cells: [false, true, true] },
      { label: 'Retainage waterfalls', cells: [false, true, true] },
      { label: 'Certified payment applications', cells: [false, true, true] },
    ],
  },
  {
    title: 'Field Ops & Safety',
    icon: 'ri-clipboard-line',
    rows: [
      { label: 'Voice-to-text site diaries', cells: [true, true, true] },
      { label: 'Client photo evidence feed', cells: [true, true, true] },
      { label: 'Snagging & defect tracking', cells: [false, true, true] },
      { label: 'Drawing pin locators', cells: [false, true, true] },
    ],
  },
  {
    title: 'Security & Integrations',
    icon: 'ri-shield-keyhole-line',
    rows: [
      { label: 'Immutable audit trails', cells: [true, true, true] },
      { label: 'Multi-tenant isolation', cells: [true, true, true] },
      { label: 'Tailscale support', cells: [false, false, true] },
      { label: 'Custom API access', cells: [false, false, true] },
    ],
  },
];

export interface Faq {
  q: string;
  a: string;
}

export const faqs: Faq[] = [
  {
    q: 'How does the HMRC CIS verification integration work?',
    a: 'When you invite a subcontractor, we run a real-time verification against HMRC using their UTR number and verify their employment status. Their verification status is stored against every payment application, and our monthly CIS300 return is generated automatically from your certified payments — ready to review and submit in XML format.',
  },
  {
    q: 'Can I invite external clients and property owners for free?',
    a: 'Yes. On the General Contractor plan and above, external clients, tenants and property owners get unlimited free access to a secure portal where they can view live progress, approve variations with e-signatures, and download payment certificates — at no extra cost.',
  },
  {
    q: 'Are statutory Pay-Less Notices legally binding under UK Construction Act rules?',
    a: 'Our Pay-Less engine is built around the Housing Grants, Construction and Regeneration Act (as amended). It calculates statutory deadlines from your contract dates, formats notices with the required wording, and timestamps every issue into an immutable audit trail so you have a defensible record if a dispute ever reaches adjudication.',
  },
  {
    q: 'Can I change or upgrade my plan mid-project?',
    a: 'Absolutely. You can upgrade at any time and the new capabilities take effect immediately, with the difference pro-rated to your next billing date. Downgrades apply at the end of your current billing period, and we never lock or restrict access to your historical project data.',
  },
];