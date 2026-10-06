import type { Database } from '@/types/supabase';

export type OrganisationRow = Database['public']['Tables']['organisations']['Row'];

export interface OrgFormValues {
  name: string;
  trading_name: string;
  company_number: string;
  utr_reference: string;
  vat_number: string;
  address_line1: string;
  address_line2: string;
  town_city: string;
  county: string;
  postcode: string;
  phone: string;
  email: string;
  default_currency: string;
}

export const EMPTY_ORG_FORM: OrgFormValues = {
  name: '',
  trading_name: '',
  company_number: '',
  utr_reference: '',
  vat_number: '',
  address_line1: '',
  address_line2: '',
  town_city: '',
  county: '',
  postcode: '',
  phone: '',
  email: '',
  default_currency: 'GBP',
};

export const CURRENCY_OPTIONS = [
  { value: 'GBP', label: 'GBP — British Pound (£)' },
  { value: 'EUR', label: 'EUR — Euro (€)' },
  { value: 'USD', label: 'USD — US Dollar ($)' },
  { value: 'AUD', label: 'AUD — Australian Dollar ($)' },
  { value: 'CAD', label: 'CAD — Canadian Dollar ($)' },
  { value: 'NZD', label: 'NZD — New Zealand Dollar ($)' },
];

export function organisationToForm(org: OrganisationRow): OrgFormValues {
  return {
    name: org.name ?? '',
    trading_name: org.trading_name ?? '',
    company_number: org.company_number ?? '',
    utr_reference: org.utr_reference ?? '',
    vat_number: org.vat_number ?? '',
    address_line1: org.address_line1 ?? '',
    address_line2: org.address_line2 ?? '',
    town_city: org.town_city ?? '',
    county: org.county ?? '',
    postcode: org.postcode ?? '',
    phone: org.phone ?? '',
    email: org.email ?? '',
    default_currency: org.default_currency ?? 'GBP',
  };
}

const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export function validateLogoFile(file: File): string | null {
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    return 'Please choose a PNG, JPEG or WebP image.';
  }
  if (file.size > MAX_LOGO_BYTES) {
    return 'The logo must be 5 MB or smaller.';
  }
  return null;
}