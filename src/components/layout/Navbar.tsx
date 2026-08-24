'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Store, Database, Zap, User, RefreshCw, CheckCircle2 } from 'lucide-react';
import { ApiService } from '@/services/api';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { Shop } from '@/types/database';

export default function Navbar() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [isSupabase, setIsSupabase] = useState(false);

  useEffect(() => {
    setIsSupabase(isSupabaseConfigured());
    loadShop();

    const handleUpdate = () => loadShop();
    window.addEventListener('dukaan_storage_update', handleUpdate);
    return () => window.removeEventListener('dukaan_storage_update', handleUpdate);
  }, []);

  const loadShop = async () => {
    const data = await ApiService.getShop();
    setShop(data);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-emerald-900/10 bg-white/90 px-4 backdrop-blur-md md:px-6">
      {/* Brand & Shop Title */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">Dukaan<span className="text-emerald-600">AI</span></span>
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">IND</span>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate max-w-[180px] sm:max-w-[260px]">
              {shop?.name || 'Retail Billing'}
            </p>
          </div>
        </Link>
      </div>

      {/* Action Controls & Badges */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Data Source Badge */}
        <div className="hidden md:flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
          {isSupabase ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Supabase Live</span>
            </>
          ) : (
            <>
              <Database className="h-3.5 w-3.5 text-amber-600" />
              <span>Mock Engine Active</span>
            </>
          )}
        </div>

        {/* Quick POS Action */}
        <Link
          href="/pos"
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
        >
          <Zap className="h-4 w-4 fill-white" />
          <span className="hidden sm:inline">New Bill</span>
          <span className="sm:hidden">POS</span>
        </Link>

        {/* Profile / Settings link */}
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          title="Shop Settings"
        >
          <User className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
