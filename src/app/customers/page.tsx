'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { ApiService } from '@/services/api';
import { formatRupee, formatDate } from '@/lib/utils';
import {
  Users,
  Plus,
  Search,
  IndianRupee,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  History,
  X,
} from 'lucide-react';
import Pagination from '@/components/common/Pagination';
import { TableSkeleton, DataGridEmptyState, DataGridErrorState } from '@/components/common/GridStateComponents';
import { Customer, PaymentMode } from '@/types/database';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [displayedCustomers, setDisplayedCustomers] = useState<Customer[]>([]);

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [onlyPendingDue, setOnlyPendingDue] = useState(false);

  // Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payCustomer, setPayCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState<number>(500);
  const [payMode, setPayMode] = useState<PaymentMode>('UPI');
  const [payRef, setPayRef] = useState('UPI/891829182');
  const [payNotes, setPayNotes] = useState('Udhar cleared by customer');

  // Sync initial page from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPage = parseInt(urlParams.get('page') || '1', 10);
      if (urlPage > 0) setPage(urlPage);
    }
  }, []);

  const updateUrlPage = (newPage: number) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('page', String(newPage));
      url.searchParams.set('pageSize', String(pageSize));
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrlPage(newPage);
  };

  const loadCustomers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await ApiService.getCustomers();
      setCustomers(data);

      const paginatedRes = await ApiService.getPaginatedCustomers({
        page,
        pageSize,
        search: searchTerm,
      });

      let resultData = paginatedRes.data;
      if (onlyPendingDue) {
        resultData = resultData.filter((c) => c.total_due > 0);
      }

      setDisplayedCustomers(resultData);
      setTotalCount(onlyPendingDue ? resultData.length : paginatedRes.totalCount);
      setTotalPages(onlyPendingDue ? Math.ceil(resultData.length / pageSize) || 1 : paginatedRes.totalPages);
    } catch (err: any) {
      console.error('[loadCustomers Error]', err);
      setErrorMsg(err?.message || 'Failed to load customer records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    const handleUpdate = () => loadCustomers();
    window.addEventListener('dukaan_storage_update', handleUpdate);
    return () => window.removeEventListener('dukaan_storage_update', handleUpdate);
  }, [page, pageSize, searchTerm, onlyPendingDue]);

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer?.name || !editingCustomer?.phone) {
      alert('Name and Phone number are required!');
      return;
    }
    await ApiService.saveCustomer(editingCustomer as any);
    setShowCustomerModal(false);
    setEditingCustomer(null);
    loadCustomers();
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCustomer) return;
    if (payAmount <= 0) {
      alert('Please enter a valid payment amount!');
      return;
    }

    await ApiService.recordCustomerPayment(
      payCustomer.id,
      payAmount,
      payMode,
      payRef,
      payNotes
    );

    setShowPaymentModal(false);
    setPayCustomer(null);
    loadCustomers();
    alert(`Payment of ₹${payAmount} recorded for ${payCustomer.name}!`);
  };

  const totalUdharAll = customers.reduce((sum, c) => sum + c.total_due, 0);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDue = !onlyPendingDue || c.total_due > 0;
    return matchesSearch && matchesDue;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header & Udhar Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Customers & Udhar Credit Ledger</h1>
            <p className="text-sm text-slate-500">Track customer phone directory, credit balances, and payments</p>
          </div>

          <button
            onClick={() => {
              setEditingCustomer({
                name: '',
                phone: '+91 ',
                email: '',
                address: '',
                credit_limit: 5000,
              });
              setShowCustomerModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" /> Add New Customer
          </button>
        </div>

        {/* Pending Udhar Banner */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-500 to-amber-600 p-5 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-amber-100 uppercase tracking-wider">
              Total Outstanding Customer Udhar (Pending Due)
            </div>
            <div className="text-3xl font-black">{formatRupee(totalUdharAll)}</div>
          </div>

          <div className="text-xs font-medium text-amber-100 bg-amber-700/50 p-3 rounded-xl border border-amber-400/30">
            Click <span className="font-bold text-white">&quot;Record Payment&quot;</span> beside any customer to clear credit
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer by name, phone, address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Pending Due Only Toggle */}
          <button
            onClick={() => setOnlyPendingDue(!onlyPendingDue)}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all border ${
              onlyPendingDue
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="h-4 w-4 text-amber-600" />
            <span>Show Customers With Pending Due Only</span>
          </button>
        </div>

        {/* Customers Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Customer Info</th>
                  <th className="p-4">Phone & Address</th>
                  <th className="p-4 text-center">Credit Limit</th>
                  <th className="p-4 text-right">Current Udhar Due</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {loading ? (
                  <TableSkeleton columns={5} rows={10} />
                ) : errorMsg ? (
                  <DataGridErrorState columns={5} error={errorMsg} onRetry={loadCustomers} />
                ) : displayedCustomers.length === 0 ? (
                  <DataGridEmptyState
                    columns={5}
                    title="No customers found"
                    description="Try changing your search query or filter options."
                  />
                ) : (
                  displayedCustomers.map((cust) => {
                    const hasDue = cust.total_due > 0;
                    return (
                      <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-sm text-slate-900">{cust.name}</div>
                          <div className="text-[10px] text-slate-400">
                            Member since {formatDate(cust.created_at)}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="font-semibold text-slate-800 flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-slate-400" /> {cust.phone}
                          </div>
                          {cust.address && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 max-w-xs truncate">
                              <MapPin className="h-3 w-3 text-slate-400" /> {cust.address}
                            </div>
                          )}
                        </td>

                        <td className="p-4 text-center font-semibold text-slate-600">
                          {formatRupee(cust.credit_limit)}
                        </td>

                        <td className="p-4 text-right font-black text-sm">
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs ${
                              hasDue
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                                : 'bg-emerald-50 text-emerald-800 font-bold'
                            }`}
                          >
                            {formatRupee(cust.total_due)}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasDue && (
                              <button
                                onClick={() => {
                                  setPayCustomer(cust);
                                  setPayAmount(cust.total_due);
                                  setShowPaymentModal(true);
                                }}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                              >
                                Record Payment
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setEditingCustomer(cust);
                                setShowCustomerModal(true);
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Reusable Server-Side Pagination Footer */}
          <Pagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            totalPages={totalPages}
            loading={loading}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* ADD / EDIT CUSTOMER MODAL */}
      {showCustomerModal && editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-extrabold text-lg text-slate-900">
                {editingCustomer.id ? 'Edit Customer' : 'Add New Customer Profile'}
              </h2>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="rounded-full bg-slate-100 p-1 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Ramesh Gupta"
                  value={editingCustomer.name || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={editingCustomer.phone || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address / Landmark</label>
                <textarea
                  rows={2}
                  placeholder="Flat 302, Green Acres..."
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Credit Limit (₹)</label>
                <input
                  type="number"
                  value={editingCustomer.credit_limit || 5000}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, credit_limit: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && payCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <h2 className="font-extrabold text-base text-slate-900">
              Record Payment: {payCustomer.name}
            </h2>

            <div className="rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-900 border border-amber-200">
              Current Outstanding Udhar: <span className="font-extrabold text-sm">{formatRupee(payCustomer.total_due)}</span>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  max={payCustomer.total_due}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm font-black text-emerald-700 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">UPI Ref / Transaction ID</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="w-1/2 rounded-xl border border-slate-300 py-2 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
