'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { ApiService } from '@/services/api';
import { Storage } from '@/services/storage';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  Settings,
  Store,
  ShieldCheck,
  Database,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Shop, GstSettings } from '@/types/database';

export default function SettingsPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [gst, setGst] = useState<GstSettings | null>(null);
  const [isSupabase, setIsSupabase] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setIsSupabase(isSupabaseConfigured());
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await ApiService.getShop();
    const g = await ApiService.getGstSettings();
    setShop(s);
    setGst(g);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !gst) return;

    await ApiService.updateShop(shop);
    await ApiService.updateGstSettings(gst);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetData = () => {
    if (
      confirm(
        'Reset mock data to factory state? This will re-populate sample Indian Kirana items, customers, and invoices.'
      )
    ) {
      Storage.resetAll();
      loadSettings();
      alert('Mock data reset successfully!');
    }
  };

  if (!shop || !gst) return null;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">App & Shop Settings</h1>
            <p className="text-sm text-slate-500">Configure business info, GST taxation, and Supabase integration</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
            <Settings className="h-4 w-4" /> System Preferences
          </div>
        </div>

        {saved && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-600 p-4 text-xs font-bold text-white shadow-lg">
            <CheckCircle2 className="h-4 w-4" />
            <span>Settings updated successfully!</span>
          </div>
        )}



        {/* Master Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Business Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Store className="h-4 w-4 text-emerald-600" /> Shop Profile Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Shop Name</label>
                <input
                  type="text"
                  required
                  value={shop.name}
                  onChange={(e) => setShop({ ...shop, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  required
                  value={shop.phone}
                  onChange={(e) => setShop({ ...shop, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Store Address</label>
                <textarea
                  rows={2}
                  required
                  value={shop.address}
                  onChange={(e) => setShop({ ...shop, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* GST Configuration */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> GST Tax Settings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={shop.gst_number}
                  onChange={(e) => setShop({ ...shop, gst_number: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs uppercase focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">State Code</label>
                <input
                  type="text"
                  value={shop.state_code}
                  onChange={(e) => setShop({ ...shop, state_code: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Default GST Rate (%)</label>
                <select
                  value={gst.default_gst_rate}
                  onChange={(e) => setGst({ ...gst, default_gst_rate: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="gst_en"
                  checked={gst.is_gst_enabled}
                  onChange={(e) => setGst({ ...gst, is_gst_enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                <label htmlFor="gst_en" className="font-semibold text-slate-700">
                  Enable GST Calculation on Bills
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <Save className="h-4 w-4" /> Save All Preferences
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
