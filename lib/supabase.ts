'use client';

import { createClient } from '@supabase/supabase-js';
import { isMongoBackendMode } from './backendMode';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/** True only when Supabase backend is active (not overridden by NEXT_PUBLIC_DATA_BACKEND=mongo). */
export const isSupabaseConfigured =
  !isMongoBackendMode() &&
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.startsWith('your_') &&
  !supabaseAnonKey.startsWith('your_');

/** Throws if Supabase env vars are missing — app requires Supabase after Express removal. */
export function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  }
);

export async function getSupabaseAccessToken() {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export function normalizeAuthContact(email?: string | null, phone?: string | null) {
  return (email || phone || '').trim().toLowerCase();
}
