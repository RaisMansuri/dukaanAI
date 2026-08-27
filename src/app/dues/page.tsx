'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { ApiService } from '@/services/api';
import { formatRupee, formatDate } from '@/lib/utils';
import {
  CreditCard,
  Search,
  IndianRupee,
  Phone,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  ArrowRight,
  History,
  X,
  Plus,
  ExternalLink,
  Users,
  Clock,
  Filter,
  Eye,
} from 'lucide-react';
import Pagination from '@/components/common/Pagination';
import { TableSkeleton, DataGridEmptyState, DataGridErrorState } from '@/components/common/GridStateComponents';
import { Customer, Payment, PaymentMode } from '@/types/database';

export default function DuesOverviewPage() {
  const [activeTab, setActiveTab] = useState<'DUE_CUSTOMERS' | 'PAYMENT_HISTORY'>('DUE_CUSTOMERS');

  // Customer Dues State
  const [dueCustomers, setDueCustomers] = useState<(Customer & { unpaid_invoice_count: number; oldest_due_date: string | null; last_payment_date: string | null })[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Payment History State
  const [payments, setPayments] = useState<Payment[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Receive Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payCustomer, setPayCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<PaymentMode>('UPI');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('Udhar recovery payment');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDueData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const paginatedRes = await ApiService.getCustomersWithDue({
        page,
        pageSize,
        search: searchTerm,
      });

      setDueCustomers(paginatedRes.data);
      setTotalCount(paginatedRes.totalCount);
      setTotalPages(paginatedRes.totalPages);
    } catch (err: any) {
      console.error('[loadDueData Error]', err);
      setErrorMsg(err?.message || 'Failed to load outstanding customer dues');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentHistory = async () => {
    setHistoryLoading(true);
    try {
      const paginatedRes = await ApiService.getPaginatedPayments({
        page: historyPage,
        pageSize,
        search: searchTerm,
      });
      setPayments(paginatedRes.data);
      setHistoryTotalCount(paginatedRes.totalCount);
      setHistoryTotalPages(paginatedRes.totalPages);
    } catch (err: any) {
      console.error('[loadPaymentHistory Error]', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'DUE_CUSTOMERS') {
      loadDueData();
    } else {
      loadPaymentHistory();
    }
  }, [activeTab, page, historyPage, pageSize, searchTerm]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPage(1);
    setHistoryPage(1);
  };

  const handleOpenPaymentModal = (cust: Customer) => {
    setPayCustomer(cust);
    setPayAmount(cust.total_due);
    setPayMode('UPI');
    setPayRef('');
    setPayNotes('Udhar clearance payment');
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCustomer) return;
    if (payAmount <= 0) {
      alert('Please enter a valid payment amount greater than ₹0.');
      return;
    }
    if (payAmount > payCustomer.total_due) {
      alert(`Payment amount (₹${payAmount}) cannot exceed total outstanding due (₹${payCustomer.total_due}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await ApiService.receiveCustomerPayment({
        customerId: payCustomer.id,
        amount: payAmount,
        paymentMode: payMode,
        referenceNo: payRef,
        notes: payNotes,
      });

      setShowPaymentModal(false);
      setPayCustomer(null);
      loadDueData();
      if (activeTab === 'PAYMENT_HISTORY') loadPaymentHistory();
    } catch (err: any) {
      alert('Failed to record payment: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const grandTotalDue = dueCustomers.reduce((sum, c) => sum + (c.total_due || 0), 0);
  const totalPendingInvoices = dueCustomers.reduce((sum, c) => sum + (c.unpaid_invoice_count || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-7 w-7 text-amber-600" />
              Udhar & Due Recovery Ledger
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Track outstanding customer credit balances, unpaid invoices, and payment recovery history.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center rounded-2xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => {
                setActiveTab('DUE_CUSTOMERS');
                setSearchTerm('');
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'DUE_CUSTOMERS'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>Customers with Due</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('PAYMENT_HISTORY');
                setSearchTerm('');
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'PAYMENT_HISTORY'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="h-3.5 w-3.5 text-emerald-600" />
              <span>Payment History</span>
            </button>
          </div>
        </div>

        {/* Udhar Summary Cards Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-5 text-white shadow-lg space-y-1">
            <div className="text-xs font-bold text-amber-100 uppercase tracking-wider">Total Outstanding Udhar</div>
            <div className="text-3xl font-black">{formatRupee(grandTotalDue)}</div>
            <div className="text-[11px] text-amber-100">Across all active customer accounts</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-slate-500" /> Due Customers
            </div>
            <div className="text-3xl font-black text-slate-900">{totalCount}</div>
            <div className="text-[11px] text-slate-400">Customers with pending balance</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-1">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Receipt className="h-3.5 w-3.5 text-slate-500" /> Unpaid / Partial Invoices
            </div>
            <div className="text-3xl font-black text-slate-900">{totalPendingInvoices}</div>
            <div className="text-[11px] text-slate-400">Pending checkout transactions</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'DUE_CUSTOMERS'
                  ? 'Search due customer by name or mobile...'
                  : 'Search payment history by customer, invoice #, or UTR...'
              }
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing {activeTab === 'DUE_CUSTOMERS' ? dueCustomers.length : payments.length} records
          </div>
        </div>

        {/* TAB 1: CUSTOMERS WITH DUE */}
        {activeTab === 'DUE_CUSTOMERS' && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-4">Customer Name</th>
                    <th className="p-4">Mobile Number</th>
                    <th className="p-4 text-right">Total Outstanding Due</th>
                    <th className="p-4 text-center">Unpaid Invoices</th>
                    <th className="p-4 text-center">Oldest Due Date</th>
                    <th className="p-4 text-center">Last Payment Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                  {loading ? (
                    <TableSkeleton columns={7} rows={10} />
                  ) : errorMsg ? (
                    <DataGridErrorState columns={7} error={errorMsg} onRetry={loadDueData} />
                  ) : dueCustomers.length === 0 ? (
                    <DataGridEmptyState
                      columns={7}
                      title="No outstanding customer dues"
                      description="Great news! All customer credit balances are fully settled."
                    />
                  ) : (
                    dueCustomers.map((cust) => {
                      const oldestDue = cust.oldest_due_date ? formatDate(cust.oldest_due_date) : 'N/A';
                      const lastPay = cust.last_payment_date ? formatDate(cust.last_payment_date) : 'No payment yet';

                      return (
                        <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Customer Name */}
                          <td className="p-4">
                            <Link
                              href={`/dues/${cust.id}`}
                              className="font-bold text-sm text-slate-900 hover:text-emerald-700 flex items-center gap-1.5 group"
                            >
                              <span>{cust.name}</span>
                              <ExternalLink className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          </td>

                          {/* Mobile */}
                          <td className="p-4 font-mono font-semibold text-slate-800">
                            {cust.phone}
                          </td>

                          {/* Total Due */}
                          <td className="p-4 text-right">
                            <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 border border-amber-300">
                              {formatRupee(cust.total_due)}
                            </span>
                          </td>

                          {/* Unpaid Invoices Count */}
                          <td className="p-4 text-center">
                            <span className="inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-700">
                              {cust.unpaid_invoice_count} bills
                            </span>
                          </td>

                          {/* Oldest Due Date */}
                          <td className="p-4 text-center text-slate-600 font-medium text-[11px]">
                            {oldestDue}
                          </td>

                          {/* Last Payment Date */}
                          <td className="p-4 text-center text-slate-600 font-medium text-[11px]">
                            {lastPay}
                          </td>

                          {/* Action Buttons */}
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenPaymentModal(cust)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
                              >
                                Receive Payment
                              </button>

                              <Link
                                href={`/dues/${cust.id}`}
                                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-sm transition-all"
                                title="View Customer Outstanding Dues Details"
                              >
                                <Eye className="h-4 w-4 text-slate-600" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              totalPages={totalPages}
              loading={loading}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}

        {/* TAB 2: PAYMENT HISTORY */}
        {activeTab === 'PAYMENT_HISTORY' && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Customer Name</th>
                    <th className="p-4 text-right">Amount Received</th>
                    <th className="p-4 text-center">Payment Mode</th>
                    <th className="p-4">UTR / Ref Number</th>
                    <th className="p-4 text-right">Invoice Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                  {historyLoading ? (
                    <TableSkeleton columns={6} rows={10} />
                  ) : payments.length === 0 ? (
                    <DataGridEmptyState
                      columns={6}
                      title="No payment history recorded"
                      description="Recorded Udhar recovery payments will appear here."
                    />
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 text-slate-600 font-medium">
                          {formatDate(p.created_at)}
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-slate-900">{p.customer_name || 'Customer'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{p.customer_phone}</div>
                        </td>

                        <td className="p-4 text-right font-black text-emerald-700">
                          {formatRupee(p.amount)}
                        </td>

                        <td className="p-4 text-center">
                          <span className="inline-block rounded-lg bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                            {p.payment_mode}
                          </span>
                        </td>

                        <td className="p-4 font-mono text-slate-700">
                          {p.reference_no || '-'}
                        </td>

                        <td className="p-4 text-right font-mono font-bold text-slate-900">
                          {p.invoice_number || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              page={historyPage}
              pageSize={pageSize}
              totalCount={historyTotalCount}
              totalPages={historyTotalPages}
              loading={historyLoading}
              onPageChange={(p) => setHistoryPage(p)}
            />
          </div>
        )}
      </div>

      {/* RECEIVE PAYMENT MODAL */}
      {showPaymentModal && payCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" /> Receive Udhar Payment
              </h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="rounded-full bg-slate-100 p-1 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-amber-50 p-3.5 text-xs font-medium text-amber-900 border border-amber-200 space-y-1">
              <div>Customer: <span className="font-extrabold text-slate-900">{payCustomer.name}</span> ({payCustomer.phone})</div>
              <div>Current Total Due: <span className="font-extrabold text-base text-amber-700">{formatRupee(payCustomer.total_due)}</span></div>
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Amount Received (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  max={payCustomer.total_due}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-base font-black text-emerald-700 focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">Payment will be automatically allocated across oldest due invoices first (FIFO).</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white font-semibold focus:border-emerald-500 focus:outline-none"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {payMode === 'UPI' ? 'UTR / UPI Transaction ID (Optional)' : payMode === 'CARD' ? 'Card Ref Number (Optional)' : 'Notes / Remarks (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={payMode === 'UPI' ? 'e.g. UPI/1029830192' : 'e.g. Card Ref 981290'}
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="w-1/2 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Allocating...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
