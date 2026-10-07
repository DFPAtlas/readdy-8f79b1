import { useMemo } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import {
  normalizeCurrency,
  getCurrencySymbol,
  formatPence,
  formatAmount,
  type CurrencyCode,
  type CurrencyFormatOptions,
} from '@/lib/money';

export interface CurrencyHelpers {
  currency: CurrencyCode;
  symbol: string;
  formatPence: (pence: number | null | undefined, options?: CurrencyFormatOptions) => string;
  formatAmount: (value: number | null | undefined, options?: CurrencyFormatOptions) => string;
}

// Central, org-aware currency formatting. Reads the active organisation's
// `default_currency` so any screen using this hook reflects the chosen currency
// automatically without hard-coding a symbol or code.
export function useCurrency(): CurrencyHelpers {
  const { organisation } = useOrg();
  const currency = normalizeCurrency(organisation?.default_currency);

  return useMemo(
    () => ({
      currency,
      symbol: getCurrencySymbol(currency),
      formatPence: (pence, options) => formatPence(pence, currency, options),
      formatAmount: (value, options) => formatAmount(value, currency, options),
    }),
    [currency],
  );
}