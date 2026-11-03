import { getSupabase } from '@/lib/supabase';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;

export const accountClosureService = {
  async downloadOrganisationExport(organisationId: string): Promise<string> {
    const supabase = getSupabase();
    if (!supabase || !supabaseUrl) throw new Error('The backend is unavailable.');

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (sessionError || !token) throw new Error('Sign in again to download the export.');

    const response = await fetch(`${supabaseUrl}/functions/v1/organisation-closure-export`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ organisationId }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error || 'The organisation export could not be prepared.');
    }

    const archive = await response.blob();
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const match = /filename="([^"]+)"/.exec(disposition);
    const filename = match?.[1] || 'buildnerve-organisation-export.zip';
    const objectUrl = URL.createObjectURL(archive);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return filename;
  },
};
