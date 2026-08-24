'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Store, ShieldCheck, CheckCircle2, Save, AlertCircle } from 'lucide-react';
import { generateUuid } from '@/lib/utils';

export default function ShopSetupPage() {
  const router = useRouter();
  const { user, refreshShop } = useAuth();

  const [shopName, setShopName] = useState('Shree Ganesh Super Market');
  const [ownerName, setOwnerName] = useState(user?.user_metadata?.full_name || 'Rais Mansuri');
  const [phone, setPhone] = useState('+91 98200 12345');
  const [businessType, setBusinessType] = useState('Kirana / Retail General Store');
  const [address, setAddress] = useState('Shop No. 12, Main Market Road, Andheri West');
  const [stateCode, setStateCode] = useState('27 (Maharashtra)');
  const [pincode, setPincode] = useState('400058');
  const [gstNumber, setGstNumber] = useState('27AAACG1234F1Z5');
  const [defaultGstRate, setDefaultGstRate] = useState(18);
  const [isGstEnabled, setIsGstEnabled] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!shopName.trim()) {
      setErrorMsg('Shop Name is required.');
      return;
    }

    setLoading(true);

    if (!isSupabaseConfigured()) {
      setTimeout(() => {
        setLoading(false);
        router.push('/dashboard');
      }, 500);
      return;
    }

    try {
      // 1. Get current authenticated user
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        setErrorMsg('You must be signed in to create a shop.');
        setLoading(false);
        return;
      }

      const shopId = generateUuid();
      const fullAddress = `${address.trim()}${pincode ? ', PIN: ' + pincode : ''}`;

      // 2. Insert into public.shops with owner_id = currentUser.id
      const { error: shopErr } = await supabase.from('shops').insert({
        id: shopId,
        owner_id: currentUser.id,
        shop_name: shopName.trim(),
        address: fullAddress,
        phone: phone.trim(),
      });

      if (shopErr) {
        console.error('[Shop Creation Error]', shopErr);
        setErrorMsg(`[${shopErr.code}] ${shopErr.message}`);
        setLoading(false);
        return;
      }

      // 3. Insert into public.gst_settings
      const { error: gstErr } = await supabase.from('gst_settings').insert({
        id: generateUuid(),
        shop_id: shopId,
        is_gst_enabled: isGstEnabled,
        default_gst_rate: Number(defaultGstRate),
      });

      if (gstErr) {
        console.warn('[GST Settings Insert Note]', gstErr.message);
      }

      // 4. Refresh auth context and redirect to dashboard
      await refreshShop();
      router.push('/dashboard');
    } catch (err: any) {
      console.error('[Shop Setup Exception]', err);
      setErrorMsg(err?.message || 'Failed to setup shop. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Shop Onboarding & Setup</h1>
            <p className="text-sm text-slate-500">Configure your business profile, tax settings, and store details</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-extrabold text-emerald-800 border border-emerald-300">
            <Store className="h-4 w-4" /> Setup Wizard
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-800">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleCreateShop} className="space-y-6">
          {/* Business Details Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
              <Store className="h-5 w-5 text-emerald-600" /> Business Profile
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Shop / Business Name *</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Shree Ganesh Super Market"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Owner Name *</label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Rais Mansuri"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Phone *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98200 12345"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Business Category / Type</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Kirana / Retail General Store">Kirana / Retail General Store</option>
                  <option value="Apparel & Clothing">Apparel & Clothing</option>
                  <option value="Electronics & Mobile">Electronics & Mobile</option>
                  <option value="Supermarket / Grocery">Supermarket / Grocery</option>
                  <option value="Pharmacy / Medical">Pharmacy / Medical</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Store Address & Area *</label>
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Shop No. 12, Main Market Road, Andheri West"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">State / Code</label>
                <input
                  type="text"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  placeholder="27 (Maharashtra)"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pincode</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="400058"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Tax & GST Settings Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600" /> GST Billing Settings
            </h2>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200">
              <div>
                <div className="font-semibold text-xs text-slate-900">Enable GST Calculation</div>
                <div className="text-[11px] text-slate-500">Automatically compute tax breakdown on POS sales</div>
              </div>
              <input
                type="checkbox"
                checked={isGstEnabled}
                onChange={(e) => setIsGstEnabled(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">GSTIN Number (Optional)</label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="27AAACG1234F1Z5"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs uppercase focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Default GST Rate (%)</label>
                <select
                  value={defaultGstRate}
                  onChange={(e) => setDefaultGstRate(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value={0}>0% (Exempted)</option>
                  <option value={5}>5% (Groceries/Food)</option>
                  <option value={12}>12% (Processed items/Dairy)</option>
                  <option value={18}>18% (Standard Retail)</option>
                  <option value={28}>28% (Luxury/Aerated)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Creating Shop...' : 'Save & Launch Shop'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
