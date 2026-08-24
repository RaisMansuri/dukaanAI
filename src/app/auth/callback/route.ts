import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';

  // Determine origin safely across localhost, Vercel previews, and production domains
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host') || requestUrl.host;
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const protocol = forwardedProto || (requestUrl.protocol.startsWith('https') ? 'https' : 'http');
  const origin = `${protocol}://${host}`;

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
