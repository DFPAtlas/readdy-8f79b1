// Safe conversion of user-entered GBP amounts to integer pence.
// The database stores money in pence; never insert pounds directly.

export function poundsToPence(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}