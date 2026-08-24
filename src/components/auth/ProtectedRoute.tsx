'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const PUBLIC_PATHS = ['/auth/login', '/auth/signup'];

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (loading) return;

    // Unauthenticated users attempting to access protected routes
    if (!user && !isPublicPath) {
      router.replace('/auth/login');
      return;
    }

    // Authenticated users attempting to access public auth pages (/auth/login, /auth/signup)
    if (user && isPublicPath) {
      router.replace('/dashboard');
      return;
    }
  }, [user, loading, pathname, isPublicPath, router]);

  // Display Skeleton loading screen while checking session or performing auth redirects
  if (loading || (!user && !isPublicPath) || (user && isPublicPath)) {
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
