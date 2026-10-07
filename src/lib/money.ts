export const SUPPORTED_CURRENCIES = ['GBP', 'EUR', 'USD', 'AUD', 'CAD', 'NZD'] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

const DEFAULT_CURRENCY: CurrencyCode = 'GBP';

// Locale used purely for symbol placement and grouping so each currency reads
// naturally (e.g. "1.234,56 €" for EUR, "$1,234.56" for USD).
const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  GBP: 'en-GB',
  EUR: 'de-DE',
  USD: 'en-US',
  AUD: 'en-AU',
  CAD: 'en-CA',
  NZD: 'en-NZ',
};

export interface CurrencyFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

// Coerce any organisation currency value to a supported ISO code, falling back
// to GBP so a page never renders empty or crashes on unexpected data.
export function normalizeCurrency(code?: string | null): CurrencyCode {
  const upper = (code || '').toUpperCase();
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(upper)
    ? (upper as CurrencyCode)
    : DEFAULT_CURRENCY;
}

export function getCurrencySymbol(code?: string | null): string {
  const currency = normalizeCurrency(code);
  try {
    const parts = new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value ?? '£';
  } catch {
    return '£';
  }
}

export function poundsToPence(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

// Format a whole-unit amount (e.g. 12500 -> "£12,500.00") in the given currency.
export function formatAmount(
  value: number | null | undefined,
  currency?: string | null,
  options?: CurrencyFormatOptions,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const code = normalizeCurrency(currency);
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALES[code], {
      style: 'currency',
      currency: code,
      minimumFractionDigits: options?.minimumFractionDigits ?? 2,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    }).format(value);
  } catch {
    return `${getCurrencySymbol(code)}${value.toLocaleString()}`;
  }
}

// Format integer pence in the given currency. Never treats pence as pounds.
// Returns an em dash when no value is present.
export function formatPence(
  pence: number | null | undefined,
  currency?: string | null,
  options?: CurrencyFormatOptions,
): string {
  if (pence === null || pence === undefined || !Number.isFinite(pence)) return '—';
  return formatAmount(pence / 100, currency, {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  });
}

// Backwards-compatible GBP helper retained for existing callers.
export function formatPenceGBP(pence: number | null | undefined): string {
  return formatPence(pence, DEFAULT_CURRENCY);
}