'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { ApiService } from '@/services/api';
import { formatRupee, formatDate, formatShortDate } from '@/lib/utils';
import {
  Users,
  Plus,
  Search,
  IndianRupee,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  X,
  ExternalLink,
  Edit,
  Pencil,
  Eye,
  Trash2,
  CheckCircle2,
  AlertTriangle,
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

  // Modal & Validation states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payCustomer, setPayCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<PaymentMode>('UPI');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('Udhar clearance payment');

  // Sync page from URL parameter on initial mount
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

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPage(1); // Auto-reset page to 1 on search filter change
    updateUrlPage(1);
  };

  const loadCustomers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const allData = await ApiService.getCustomers();
      setCustomers(allData);

      const paginatedRes = await ApiService.getPaginatedCustomers({
        page,
        pageSize,
        search: searchTerm,
        onlyPendingDue,
      });

      setDisplayedCustomers(paginatedRes.data);
      setTotalCount(paginatedRes.totalCount);
      setTotalPages(paginatedRes.totalPages);
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

  const handleOpenAddCustomer = () => {
    setEditingCustomer({
      name: '',
      phone: '',
      email: '',
      address: '',
      gstin: '',
      credit_limit: 5000,
    });
    setFormError(null);
    setShowCustomerModal(true);
  };

  const handleOpenEditCustomer = (cust: Customer) => {
    setEditingCustomer({
      id: cust.id,
      name: cust.name,
      phone: cust.phone,
      email: cust.email || '',
      address: cust.address || '',
      gstin: cust.gstin || '',
      credit_limit: cust.credit_limit || 5000,
    });
    setFormError(null);
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer?.name?.trim() || !editingCustomer?.phone?.trim()) {
      setFormError('Customer Name and Mobile Number are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await ApiService.saveCustomer(editingCustomer as any);
      setShowCustomerModal(false);
      setEditingCustomer(null);
      loadCustomers();
    } catch (err: any) {
      console.error('[saveCustomer Error]', err);
      setFormError(err?.message || 'Failed to save customer record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete customer "${name}"? This action cannot be undone.`)) {
      try {
        await ApiService.deleteCustomer(id);
        loadCustomers();
      } catch (err: any) {
        alert('Failed to delete customer: ' + (err?.message || 'Unknown error'));
      }
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCustomer) return;
    if (payAmount <= 0) {
      alert('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    try {
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
    } catch (err: any) {
      alert('Failed to record payment: ' + (err?.message || 'Unknown error'));
    }
  };

  const totalUdharAll = customers.reduce((sum, c) => sum + (c.total_due || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-7 w-7 text-emerald-600" />
              Customer Directory & Udhar Ledger
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage customer phonebook, outstanding credit balances, GSTIN details, and purchase history.
            </p>
          </div>

          <button
            onClick={handleOpenAddCustomer}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" /> Add New Customer
          </button>
        </div>

        {/* Udhar Outstanding Banner */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 p-5 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-amber-100 uppercase tracking-wider">
              Total Outstanding Customer Udhar (Pending Due)
            </div>
            <div className="text-3xl font-black">{formatRupee(totalUdharAll)}</div>
          </div>

          <div className="text-xs font-medium text-amber-100 bg-amber-800/40 p-3 rounded-xl border border-amber-400/30 max-w-sm">
            Click <span className="font-bold text-white">&quot;Record Payment&quot;</span> beside any customer row or profile to clear pending credit balance.
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer by name, mobile, email, or GSTIN..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Pending Due Only Filter */}
          <button
            onClick={() => {
              setOnlyPendingDue(!onlyPendingDue);
              setPage(1);
            }}
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

        {/* Customer Data Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Mobile Number</th>
                  <th className="p-4">Email</th>
                  <th className="p-4 text-right">Total Purchases</th>
                  <th className="p-4 text-right">Total Outstanding</th>
                  <th className="p-4 text-center">Last Purchase</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {loading ? (
                  <TableSkeleton columns={8} rows={10} />
                ) : errorMsg ? (
                  <DataGridErrorState columns={8} error={errorMsg} onRetry={loadCustomers} />
                ) : displayedCustomers.length === 0 ? (
                  <DataGridEmptyState
                    columns={8}
                    title="No customer records found"
                    description="Try adjusting your search term or pending due filter."
                  />
                ) : (
                  displayedCustomers.map((cust) => {
                    const hasDue = cust.total_due > 0;
                    const totalPurchases = cust.total_purchases || 0;
                    const lastPurchase = cust.last_purchase_date
                      ? formatDate(cust.last_purchase_date)
                      : 'No purchases';

                    return (
                      <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Customer Name */}
                        <td className="p-4">
                          <Link
                            href={`/customers/${cust.id}`}
                            className="font-bold text-sm text-slate-900 hover:text-emerald-700 flex items-center gap-1.5 group"
                          >
                            <span>{cust.name}</span>
                            <ExternalLink className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          {cust.gstin && (
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              GSTIN: <span className="font-semibold text-slate-700">{cust.gstin}</span>
                            </div>
                          )}
                        </td>

                        {/* Mobile Number */}
                        <td className="p-4">
                          <div className="font-mono font-semibold text-slate-800 flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-slate-400" /> {cust.phone}
                          </div>
                        </td>

                        {/* Email */}
                        <td className="p-4">
                          {cust.email ? (
                            <div className="text-slate-700 flex items-center gap-1 max-w-xs truncate">
                              <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{cust.email}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          )}
                        </td>

                        {/* Total Purchases */}
                        <td className="p-4 text-right font-black text-slate-900">
                          {formatRupee(totalPurchases)}
                        </td>

                        {/* Total Outstanding / Due */}
                        <td className="p-4 text-right">
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-black ${
                              hasDue
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {formatRupee(cust.total_due)}
                          </span>
                        </td>

                        {/* Last Purchase Date */}
                        <td className="p-4 text-center text-slate-600 font-medium text-[11px]">
                          {lastPurchase}
                        </td>

                        {/* Status Badge */}
                        <td className="p-4 text-center">
                          {hasDue ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800 border border-amber-200">
                              <AlertTriangle className="h-3 w-3 text-amber-600" /> Pending Udhar
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Active
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasDue && (
                              <button
                                onClick={() => {
                                  setPayCustomer(cust);
                                  setPayAmount(cust.total_due);
                                  setShowPaymentModal(true);
                                }}
                                className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 active:scale-95 transition-all"
                              >
                                Clear Udhar
                              </button>
                            )}

                            <Link
                              href={`/customers/${cust.id}`}
                              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-sm transition-all"
                              title="View Customer Profile & Purchase History"
                            >
                              <Eye className="h-4 w-4 text-slate-600" />
                            </Link>

                            <button
                              onClick={() => handleOpenEditCustomer(cust)}
                              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 shadow-sm transition-all"
                              title="Edit Customer Details"
                            >
                              <Pencil className="h-4 w-4 text-slate-600 hover:text-emerald-700" />
                            </button>

                            <button
                              onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 shadow-sm transition-all"
                              title="Delete Customer"
                            >
                              <Trash2 className="h-4 w-4 text-slate-600 hover:text-red-700" />
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

          {/* Reusable Pagination */}
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
                {editingCustomer.id ? 'Edit Customer Information' : 'Add New Customer Profile'}
              </h2>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="rounded-full bg-slate-100 p-1 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-800 border border-red-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>{formError}</div>
              </div>
            )}

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Gupta"
                  value={editingCustomer.name || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mobile Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="tel"
                    required
                    maxLength={15}
                    placeholder="e.g. 9876543210 or +91 98765 43210"
                    value={editingCustomer.phone || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Must be a valid 10-digit Indian mobile number</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="ramesh.gupta@example.com"
                  value={editingCustomer.email || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address / Landmark (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Flat 302, Green Acres, Andheri West..."
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="27AAAAA0000A1Z5"
                    value={editingCustomer.gstin || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, gstin: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono uppercase focus:border-emerald-500 focus:outline-none"
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
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Customer'}
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
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-extrabold text-base text-slate-900">
                Record Udhar Payment
              </h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="rounded-full bg-slate-100 p-1 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-900 border border-amber-200 space-y-1">
              <div>Customer: <span className="font-extrabold">{payCustomer.name}</span> ({payCustomer.phone})</div>
              <div>Current Outstanding Udhar: <span className="font-extrabold text-sm text-amber-700">{formatRupee(payCustomer.total_due)}</span></div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Amount (₹)</label>
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
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:border-emerald-500 focus:outline-none font-semibold"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference No / UTR</label>
                <input
                  type="text"
                  placeholder="e.g. UPI/1298492019"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="w-1/2 rounded-xl border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
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
