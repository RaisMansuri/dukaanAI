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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white p-4">
        <div className="w-full max-w-sm rounded-3xl bg-slate-800 p-8 border border-slate-700 shadow-2xl space-y-4 animate-pulse">
          <div className="flex items-center gap-3 justify-center">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30" />
            <div className="h-6 w-32 bg-slate-700 rounded-lg" />
          </div>
          <div className="h-4 w-48 bg-slate-700/60 rounded mx-auto" />
          <div className="space-y-2 pt-2">
            <div className="h-10 bg-slate-700 rounded-xl" />
            <div className="h-10 bg-slate-700 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
