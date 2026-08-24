'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Store, Phone, ShieldCheck, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('9820012345');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('OTP');
    }, 600);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push('/dashboard');
    }, 600);
  };

  const handleDemoLogin = () => {
    setLoading(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 400);
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
            Smart Billing & Retail Management for Indian Shopkeepers
          </p>
        </div>

        {/* Login Form Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-100">Welcome Back</h2>
            <p className="text-xs text-slate-400">Sign in using your mobile number</p>
          </div>

          {step === 'PHONE' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mobile Number (Phone)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-semibold text-slate-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'Sending OTP...' : 'Get OTP'} <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Enter 4-Digit OTP sent to +91 {phone}
                </label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="1 2 3 4"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 px-4 text-center text-lg tracking-widest text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-500 active:scale-95 transition-all"
              >
                {loading ? 'Verifying...' : 'Verify & Enter Shop'}
              </button>

              <button
                type="button"
                onClick={() => setStep('PHONE')}
                className="w-full text-center text-xs text-slate-400 hover:text-white"
              >
                Change Phone Number
              </button>
            </form>
          )}

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 border-t border-slate-800" />
            <span className="relative bg-slate-900 px-3 text-xs font-medium text-slate-500">
              OR TEST INSTANTLY
            </span>
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 py-3 text-sm font-bold text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>Login as Demo Shop Owner</span>
          </button>
        </div>

        {/* Value Highlights */}
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-slate-400">
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>GST Tax Ready</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Udhar Credit Tracker</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>UPI QR Payments</span>
          </div>
        </div>
      </div>
    </div>
  );
}
