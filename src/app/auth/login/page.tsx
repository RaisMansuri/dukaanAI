'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Store, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Automatically redirect authenticated user to Dashboard once AuthContext loads
  useEffect(() => {
    if (!authLoading && user) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Login Directing Authenticated User]:', user.email);
      }
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  // Check URL query params for error or confirmation notices
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlError = urlParams.get('error');
      const urlMsg = urlParams.get('message');
      if (urlError) setErrorMsg(urlError);
      if (urlMsg) setInfoMsg(urlMsg);
    }
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Email Address is required.');
      return;
    }

    if (!password) {
      setErrorMsg('Password is required.');
      return;
    }

    setLoading(true);

    if (process.env.NODE_ENV === 'development') {
      console.log('[Sign In Triggered]:', cleanEmail);
    }

    if (!isSupabaseConfigured()) {
      setErrorMsg('Supabase environment variables are missing or invalid.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        console.warn('[Sign In Response Error]', error.message);
        const lowerErr = error.message.toLowerCase();
        if (lowerErr.includes('invalid login credentials')) {
          setErrorMsg('Invalid email address or password. Please check your credentials.');
        } else if (lowerErr.includes('email not confirmed')) {
          setErrorMsg('Your email address has not been verified yet. Please check your inbox for the confirmation link.');
        } else {
          setErrorMsg(error.message);
        }
        setLoading(false);
        return;
      }

      if (data.session && data.user) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Sign In Success Session Established]:', data.user.email);
        }
        // AuthContext automatically receives session via onAuthStateChange and redirects to /dashboard
      }
    } catch (err: any) {
      console.error('[Sign In Exception]', err);
      setErrorMsg(err?.message || 'Failed to sign in. Please check your connection.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 text-white flex flex-col justify-center items-center py-8 px-4 relative overflow-y-auto">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10 my-auto">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-xl shadow-emerald-500/20">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Dukaan<span className="text-emerald-400">AI</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Smart Billing & Retail Management for Indian Shopkeepers
          </p>
        </div>

        {/* Login Form Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-100">Sign In to Your Shop</h2>
            <p className="text-xs text-slate-400">Enter your registered email and password</p>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 p-3.5 text-xs font-semibold text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="flex items-start gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@dukaanai.com"
                className="w-full h-[46px] rounded-xl border border-slate-700 bg-slate-950 py-3 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password *
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-[46px] rounded-xl border border-slate-700 bg-slate-950 py-3 pl-4 pr-10 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full h-[48px] flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50 touch-manipulation"
            >
              {loading || authLoading ? 'Signing In...' : 'Sign In'} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800/80">
            <p className="text-xs text-slate-400">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="font-bold text-emerald-400 hover:text-emerald-300 underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
