import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.warn('[Auth Callback Error]', error.message);
    } catch (err) {
      console.error('[Auth Callback Exception]', err);
    }
  }

  // Redirect to login page with clear error query param
  return NextResponse.redirect(`${origin}/auth/login?error=Invalid%20or%20expired%20verification%20link.`);
}
