import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string => {
  const val = process.env[key] || '';
  return val.replace(/^["']|["']$/g, '').trim();
};

// Official DukaanAI Supabase Project Credentials
const REAL_SUPABASE_URL = 'https://muozewnqikscwtfnilpn.supabase.co';
const REAL_SUPABASE_ANON_KEY = 'sb_publishable_Xs3Un2JkOV2EUbEVGJ1_Xg_f2SYO_ix';

const envUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const envKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const supabaseUrl = envUrl || REAL_SUPABASE_URL;
const supabaseAnonKey = envKey || REAL_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return !!supabaseUrl && !!supabaseAnonKey;
};

if (!envUrl || !envKey) {
  console.warn('[Supabase Client] Environment variables missing in process.env. Using official project credentials.');
} else if (process.env.NODE_ENV === 'development') {
  console.log('[Supabase Client] Configured and connected to:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'dukaanai-auth-token',
  },
});
