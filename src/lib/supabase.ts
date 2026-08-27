import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;
let initAttempted = false;

export function hasSupabaseCredentials(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}

export function getSupabase(): ReturnType<typeof createClient<Database>> | null {
  if (!initAttempted) {
    initAttempted = true;
    if (supabaseUrl && supabaseAnonKey) {
      supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }
  }
  return supabaseInstance;
}

export type SupabaseClient = ReturnType<typeof createClient<Database>>;