// Maps the wizard's human-readable option labels to the canonical values enforced by
// the `jobs` table CHECK constraints.
//
// Root cause of the "Could not create the job" failure: the wizard submitted display
// labels (e.g. "Fixed price", "Standard VAT", "another") directly into columns such as
// jobs.pricing_type, which only accept snake_case enum values. The insert was rejected
// with a 23514 check_violation, surfaced as a generic error. These helpers normalise
// the payload before it reaches Supabase.

const PRICING_TYPE_MAP: Record<string, string | null> = {
  fixed: 'fixed',
  'fixed price': 'fixed',
  estimate: 'estimate',
  'day rate': 'day_rate',
  day_rate: 'day_rate',
  'cost plus': 'cost_plus',
  cost_plus: 'cost_plus',
  'schedule of rates': 'schedule_of_rates',
  schedule_of_rates: 'schedule_of_rates',
  'to be confirmed': null,
  tbc: null,
};

const VAT_TREATMENT_MAP: Record<string, string | null> = {
  standard: 'standard',
  'standard vat': 'standard',
  reduced: 'reduced',
  'reduced vat': 'reduced',
  zero: 'zero',
  'zero rated': 'zero',
  exempt: 'exempt',
  'not vat registered': 'outside_scope',
  outside_scope: 'outside_scope',
  reverse_charge: 'reverse_charge',
  'vat reverse charge': 'reverse_charge',
  'to be confirmed': null,
  tbc: null,
};

const PRINCIPAL_CONTRACTOR_MAP: Record<string, string | null> = {
  our_company: 'our_company',
  'our company': 'our_company',
  another: 'another_contractor',
  another_contractor: 'another_contractor',
  'another contractor': 'another_contractor',
  client: 'client_managed',
  client_managed: 'client_managed',
  'client managed': 'client_managed',
  tbc: null,
  'to be confirmed': null,
};

function lookup(map: Record<string, string | null>, value?: string | null): string | null {
  if (value === null || value === undefined) return null;
  const key = value.trim().toLowerCase();
  if (!key) return null;
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
}

/** Canonical jobs.pricing_type value (fixed | day_rate | cost_plus | estimate | schedule_of_rates) or null. */
export function normalizePricingType(value?: string | null): string | null {
  return lookup(PRICING_TYPE_MAP, value);
}

/** Canonical jobs.vat_treatment value or null. */
export function normalizeVatTreatment(value?: string | null): string | null {
  return lookup(VAT_TREATMENT_MAP, value);
}

/** Canonical jobs.principal_contractor value (our_company | another_contractor | client_managed) or null. */
export function normalizePrincipalContractor(value?: string | null): string | null {
  return lookup(PRINCIPAL_CONTRACTOR_MAP, value);
}

/** jobs.duration_unit allows only days | weeks | months. */
export function normalizeDurationUnit(value?: string | null): string | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  return ['days', 'weeks', 'months'].includes(key) ? key : null;
}

/** jobs.rams_required allows only yes | no | tbc. */
export function normalizeRamsRequired(value?: string | null): string | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  return ['yes', 'no', 'tbc'].includes(key) ? key : null;
}