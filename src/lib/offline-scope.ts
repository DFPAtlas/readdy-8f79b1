/** Offline records belong to both the signed-in account and selected company. */
export function ownedOfflineRecords<T extends { organisationId: string; userId: string }>(rows: T[], orgId: string | null | undefined, userId: string | null | undefined): T[] {
  if (!orgId || !userId) return [];
  return rows.filter(row => row.organisationId === orgId && row.userId === userId);
}
