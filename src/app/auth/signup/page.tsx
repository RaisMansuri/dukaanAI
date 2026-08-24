'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Store, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobileNumber(digits);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }

    if (!email.trim()) {
      setErrorMsg('Email Address is required.');
      return;
    }

    if (mobileNumber.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    const fullMobile = `+91${mobileNumber}`;

    if (!isSupabaseConfigured()) {
      setTimeout(() => {
        setLoading(false);
        router.push('/setup');
      }, 500);
      return;
    }

    try {
      // Check for duplicate mobile number in profiles table
      const { data: existingMobile } = await supabase
        .from('profiles')
        .select('id')
        .eq('mobile_number', fullMobile)
        .maybeSingle();

      if (existingMobile) {
        setErrorMsg('This mobile number is already registered with another account.');
        setLoading(false);
        return;
      }

      // 1. Create Auth User
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            mobile_number: fullMobile,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // 2. Insert Profile record in public.profiles
        const { error: profileErr } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: fullName.trim(),
          mobile_number: fullMobile,
        });

        if (profileErr) {
          console.warn('[Profile Insert Note]', profileErr.message);
        }

        setSuccessMsg('Account created successfully! Redirecting to Shop Setup...');

        setTimeout(() => {
          router.push('/setup');
        }, 1000);
      }
    } catch (err: any) {
      console.error('[Sign Up Error]', err);
      setErrorMsg(err?.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-xl shadow-emerald-500/20">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Dukaan<span className="text-emerald-400">AI</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Create Your Retail Business Account
          </p>
        </div>

        {/* Signup Form Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-100">Create Account</h2>
            <p className="text-xs text-slate-400">Register as a shop owner to manage your retail business</p>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs font-semibold text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            {/* 1. Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Rais Mansuri"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* 2. Email Address */}
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* 3. Mobile Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mobile Number *
              </label>
              <div className="flex items-center">
                <div className="flex h-[46px] items-center justify-center rounded-l-xl border border-r-0 border-slate-700 bg-slate-900 px-3.5 text-xs font-bold text-slate-300 shrink-0">
                  +91
                </div>
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={handleMobileChange}
                  placeholder="Enter 10 digit mobile number"
                  maxLength={10}
                  className="w-full h-[46px] rounded-r-xl border border-slate-700 bg-slate-950 py-3 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* 4. Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password (Min. 6 characters) *
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-4 pr-10 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* 5. Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Confirm Password *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 px-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-bold text-emerald-400 hover:text-emerald-300 underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
