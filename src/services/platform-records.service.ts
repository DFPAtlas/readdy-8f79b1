import { getSupabase } from '@/lib/supabase';
export const platformRegisters = {
  support: { table: 'platform_support_cases', title: 'Support cases', columns: ['title', 'organisation_id', 'priority', 'status', 'created_at'], note: 'Saved support records. Case editing and replies are not available on this screen.' },
  audit: { table: 'platform_audit_events', title: 'Platform audit', columns: ['event_type', 'actor_id', 'platform_role', 'target_org_id', 'reason', 'created_at'], note: 'Saved audit records. A missing event is not evidence that an action did not occur.' },
  requests: { table: 'platform_access_requests', title: 'Support access requests', columns: ['organisation_id', 'access_type', 'reason', 'status', 'customer_approved', 'expires_at'], note: 'Read-only request register. Viewing a request does not grant or approve tenant access.' },
  grants: { table: 'platform_access_grants', title: 'Recorded access grants', columns: ['organisation_id', 'staff_user_id', 'access_type', 'status', 'expires_at', 'revoked_at'], note: 'Recorded grants, including expired and revoked records. Effective access must also satisfy the server policies.' },
  staff: { table: 'platform_staff', title: 'Platform staff', columns: ['user_id', 'role', 'status', 'mfa_enrolled', 'last_sign_in_at'], note: 'MFA enrolled is a stored staff flag; it does not establish another user’s current authenticator session. Staff changes are not available here.' },
  flags: { table: 'platform_feature_flags', title: 'Feature flag records', columns: ['flag_key', 'description', 'enabled', 'default_state', 'start_at', 'end_at'], note: 'Saved global flags. Tenant overrides and application enforcement may also affect availability. Flag editing is not available here.' },
  announcements: { table: 'platform_announcements', title: 'Announcements', columns: ['title', 'status', 'target_type', 'scheduled_at', 'published_at', 'ended_at'], note: 'Saved announcement records. Published status does not confirm delivery. Creation and sending are not available here.' },
} as const;
export type PlatformRegister = keyof typeof platformRegisters;
export async function loadPlatformRegister(kind: PlatformRegister, offset: number) {
  const config = platformRegisters[kind];
  const client = getSupabase();
  if (!client) throw new Error('Backend unavailable');
  const { data, error, count } = await client.from(config.table).select(['id', ...config.columns].join(','), { count: 'exact' }).order('id').range(offset, offset + 49);
  if (error) throw error;
  return { rows: (data ?? []) as unknown as Array<Record<string, string | boolean | null>>, total: count ?? 0 };
}
