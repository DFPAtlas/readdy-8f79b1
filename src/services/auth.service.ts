import { getSupabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  },

  async getProfile(userId: string): Promise<Profile | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'job_title'>>): Promise<Profile> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async signOut(): Promise<void> {
    const supabase = getSupabase();
    await supabase.auth.signOut();
  },
};