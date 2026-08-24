'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { ApiService } from '@/services/api';
import { Store, ShieldCheck, CheckCircle, Save } from 'lucide-react';
import { Shop, GstSettings } from '@/types/database';

export default function ShopSetupPage() {
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [gst, setGst] = useState<GstSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = await ApiService.getShop();
    const g = await ApiService.getGstSettings();
    setShop(s);
    setGst(g);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !gst) return;
    setLoading(true);
    await ApiService.updateShop(shop);
    await ApiService.updateGstSettings(gst);
    setLoading(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      router.push('/dashboard');
    }, 800);
  };

  if (!shop || !gst) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="text-slate-500 font-medium">Loading Shop Config...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Shop Setup & Profile</h1>
            <p className="text-sm text-slate-500">Configure business info, GSTIN, and tax rules</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            <Store className="h-4 w-4" /> Active Shop
          </div>
        </div>

        {saved && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-600 p-4 text-sm font-semibold text-white shadow-lg animate-fade-in">
            <CheckCircle className="h-5 w-5" />
            <span>Shop setup saved successfully! Redirecting to Dashboard...</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Shop Details Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Store className="h-5 w-5 text-emerald-600" /> Business Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shop Name *
                </label>
                <input
                  type="text"
                  required
                  value={shop.name}
                  onChange={(e) => setShop({ ...shop, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={shop.phone}
                  onChange={(e) => setShop({ ...shop, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shop Address & Area *
                </label>
                <textarea
                  rows={2}
                  required
                  value={shop.address}
                  onChange={(e) => setShop({ ...shop, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* GST Configuration Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" /> GST Tax Settings
            </h2>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200">
              <div>
                <div className="font-semibold text-sm text-slate-900">Enable GST Billing</div>
                <div className="text-xs text-slate-500">Calculate CGST/SGST on POS bills</div>
              </div>
              <input
                type="checkbox"
                checked={gst.is_gst_enabled}
                onChange={(e) => setGst({ ...gst, is_gst_enabled: e.target.checked })}
                className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GSTIN Number (15 Digits)
                </label>
                <input
                  type="text"
                  placeholder="27AAACG1234F1Z5"
                  value={shop.gst_number}
                  onChange={(e) => setShop({ ...shop, gst_number: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm uppercase focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  State Code & Name
                </label>
                <input
                  type="text"
                  placeholder="27 (Maharashtra)"
                  value={shop.state_code}
                  onChange={(e) => setShop({ ...shop, state_code: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Default GST Rate (%)
                </label>
                <select
                  value={gst.default_gst_rate}
                  onChange={(e) => setGst({ ...gst, default_gst_rate: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                >
                  <option value={0}>0% (Exempted)</option>
                  <option value={5}>5% (Groceries/Food)</option>
                  <option value={12}>12% (Processed items/Dairy)</option>
                  <option value={18}>18% (Standard Retail)</option>
                  <option value={28}>28% (Luxury/Aerated)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="comp"
                  checked={gst.composite_scheme}
                  onChange={(e) => setGst({ ...gst, composite_scheme: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="comp" className="text-xs font-medium text-slate-700">
                  Composition Scheme (1% flat)
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving Setup...' : 'Save & Continue'}
            </button>
          </div>
        </form>
      </div >
    </AppLayout>
  );
}
