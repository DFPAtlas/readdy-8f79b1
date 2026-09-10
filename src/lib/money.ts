export function poundsToPence(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

// Format integer pence as a human-friendly GBP string.
// Never treats pence as pounds. Returns an em dash when no value is present.
export function formatPenceGBP(pence: number | null | undefined): string {
  if (pence === null || pence === undefined || !Number.isFinite(pence)) return '—';
  const pounds = pence / 100;
  return '£' + pounds.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}