import { getSupabase } from '@/lib/supabase';

const FUNCTION_URL = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/team-invitations`;
const ANON_KEY = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

export interface InvitePreview {
  organisation_name: string | null;
  role: string;
  email: string;
  status: string;
  expired: boolean;
}

export interface AcceptResult {
  organisation_id: string;
}

/**
 * Carries the HTTP status so callers can distinguish a 404 (not found) from a
 * 403 (wrong signed-in email) or 409 (expired / already used).
 */
export class InvitationError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'InvitationError';
    this.status = status;
  }
}

async function callFunction<T>(payload: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: ANON_KEY,
  };

  // Attach the caller's access token when present; the function ignores it for
  // public actions (preview) and validates it for authenticated ones (accept).
  const supabase = getSupabase();
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  }

  let response: Response;
  try {
    response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    throw new InvitationError('We could not reach the invitation service. Please check your connection and try again.', 0);
  }

  const text = await response.text();
  let parsed: { error?: string } | null = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const message = parsed?.error || 'Something went wrong. Please try again.';
    throw new InvitationError(message, response.status);
  }

  return parsed as unknown as T;
}

export const invitationsService = {
  preview: (token: string) => callFunction<InvitePreview>({ action: 'preview', token }),
  accept: (token: string) => callFunction<AcceptResult>({ action: 'accept', token }),
};