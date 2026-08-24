'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Store,
  Database,
  Zap,
  User as UserIcon,
  LogOut,
  Settings,
  CheckCircle2,
  ChevronDown,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export default function Navbar() {
  const router = useRouter();
  const { user, profile, shop, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSupabase = isSupabaseConfigured();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    router.push('/auth/login');
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Shop Owner';

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
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                Dukaan<span className="text-emerald-600">AI</span>
              </span>
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                IND
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate max-w-[180px] sm:max-w-[260px]">
              {shop?.name || 'Retail Billing System'}
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
              <span>Mock Engine</span>
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

        {/* Profile Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1.5 sm:px-3 sm:py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline font-bold text-slate-900 max-w-[100px] truncate">
              {displayName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50 text-xs animate-fade-in">
              {user ? (
                <>
                  {/* User Profile Header */}
                  <div className="border-b border-slate-100 p-3 space-y-1">
                    <div className="font-extrabold text-sm text-slate-900 truncate">{displayName}</div>
                    <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                    {shop && (
                      <div className="mt-1 flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200/60">
                        <Store className="h-3 w-3" />
                        <span className="truncate">{shop.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Menu Options */}
                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100 font-semibold"
                    >
                      <Settings className="h-4 w-4 text-slate-500" />
                      <span>Shop Settings</span>
                    </Link>

                    <Link
                      href="/setup"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100 font-semibold"
                    >
                      <Store className="h-4 w-4 text-slate-500" />
                      <span>Edit Shop Info</span>
                    </Link>
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-red-600 hover:bg-red-50 font-bold transition-colors"
                    >
                      <LogOut className="h-4 w-4 text-red-600" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-1 space-y-1">
                  <Link
                    href="/auth/login"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100 font-semibold"
                  >
                    <LogIn className="h-4 w-4 text-emerald-600" />
                    <span>Sign In</span>
                  </Link>

                  <Link
                    href="/auth/signup"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-emerald-700 font-bold hover:bg-emerald-50"
                  >
                    <UserPlus className="h-4 w-4 text-emerald-600" />
                    <span>Create Account</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
