'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sparkles } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/client';

const PUBLIC_PATHS = ['/auth/login', '/auth/signup'];

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, shop, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (isSupabaseConfigured()) {
      const isPublicPath = PUBLIC_PATHS.includes(pathname);

      if (!user && !isPublicPath) {
        router.push('/auth/login');
        return;
      }

      if (user) {
        if (isPublicPath) {
          if (!shop) {
            router.push('/setup');
          } else {
            router.push('/dashboard');
          }
          return;
        }

        if (!shop && pathname !== '/setup') {
          router.push('/setup');
          return;
        }
      }
    }
  }, [user, shop, loading, pathname, router]);

  if (loading && isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Sparkles className="h-8 w-8 animate-spin text-emerald-400" />
          <p className="text-sm font-semibold text-slate-300">Authenticating DukaanAI...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
