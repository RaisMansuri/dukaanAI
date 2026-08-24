import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string => {
  const val = process.env[key] || '';
  return val.replace(/^["']|["']$/g, '').trim();
};

const rawUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const rawKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const supabaseUrl = rawUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = rawKey || 'placeholder-key';

export const isSupabaseConfigured = (): boolean => {
  return (
    !!rawUrl &&
    !!rawKey &&
    rawUrl !== 'https://placeholder.supabase.co' &&
    !rawUrl.includes('placeholder')
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'dukaanai-auth-token',
  },
});

// Development-only structured debug logging
if (process.env.NODE_ENV === 'development') {
  if (isSupabaseConfigured()) {
    console.log('[Supabase Client] Configured and connected to:', supabaseUrl);
  } else {
    console.warn('[Supabase Client] Not configured or using placeholder credentials.');
  }
}
