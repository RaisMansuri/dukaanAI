'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { ApiService } from '@/services/api';
import { formatRupee, formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  ShoppingBag,
  Calendar,
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  Edit,
  Pencil,
  X,
  Printer,
  Search,
  History,
  Receipt,
  Eye,
} from 'lucide-react';
import Pagination from '@/components/common/Pagination';
import { TableSkeleton, DataGridEmptyState, DataGridErrorState } from '@/components/common/GridStateComponents';
import { Customer, Invoice, Payment, PaymentMode } from '@/types/database';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<{
    totalPurchases: number;
    orderCount: number;
    totalPaid: number;
    totalDue: number;
    lastPurchaseDate: string | null;
  }>({
    totalPurchases: 0,
    orderCount: 0,
    totalPaid: 0,
    totalDue: 0,
    lastPurchaseDate: null,
  });

  // Purchase History Pagination & Search
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Payment History State
  const [customerPayments, setCustomerPayments] = useState<Payment[]>([]);
  const [payPage, setPayPage] = useState(1);
  const [payTotalCount, setPayTotalCount] = useState(0);
  const [payTotalPages, setPayTotalPages] = useState(1);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<Partial<Customer> | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<PaymentMode>('UPI');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('Udhar clearance payment');

  const loadCustomerData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await ApiService.getCustomerById(customerId);
      if (!res.customer) {
        setErrorMsg('Customer profile not found.');
      } else {
        setCustomer(res.customer);
        setStats(res.stats);
      }
    } catch (err: any) {
      console.error('[loadCustomerData Error]', err);
      setErrorMsg(err?.message || 'Failed to load customer profile');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const paginatedRes = await ApiService.getCustomerInvoices(customerId, {
        page,
        pageSize,
        search: historySearch,
      });
      setInvoices(paginatedRes.data);
      setTotalCount(paginatedRes.totalCount);
      setTotalPages(paginatedRes.totalPages);
    } catch (err: any) {
      console.error('[loadCustomerInvoices Error]', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const loadCustomerPayments = async () => {
    setPaymentsLoading(true);
    try {
      const res = await ApiService.getPaginatedPayments({
        customerId,
        page: payPage,
        pageSize: 5,
      });
      setCustomerPayments(res.data);
      setPayTotalCount(res.totalCount);
      setPayTotalPages(res.totalPages);
    } catch (err) {
      console.error('[loadCustomerPayments Error]', err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [customerId]);

  useEffect(() => {
    loadCustomerInvoices();
  }, [customerId, page, pageSize, historySearch]);

  useEffect(() => {
    loadCustomerPayments();
  }, [customerId, payPage]);

  const handleOpenEdit = () => {
    if (!customer) return;
    setEditData({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      gstin: customer.gstin || '',
      credit_limit: customer.credit_limit || 5000,
    });
    setEditError(null);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData?.name?.trim() || !editData?.phone?.trim()) {
      setEditError('Customer Name and Mobile Number are required.');
      return;
    }

    try {
      await ApiService.saveCustomer(editData as any);
      setShowEditModal(false);
      loadCustomerData();
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update customer profile.');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    if (payAmount <= 0) {
      alert('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    try {
      await ApiService.recordCustomerPayment(
        customer.id,
        payAmount,
        payMode,
        payRef,
        payNotes
      );
      setShowPaymentModal(false);
      loadCustomerData();
      loadCustomerInvoices();
      loadCustomerPayments();
    } catch (err: any) {
      alert('Failed to record payment: ' + (err?.message || 'Unknown error'));
    }
  };

  const pendingInvoicesCount = invoices.filter((inv) => inv.due_amount > 0).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/customers"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 shadow-sm transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Customer Profile</h1>
              <p className="text-xs text-slate-500">Detailed record, financial metrics, and purchase history</p>
            </div>
          </div>

          {customer && (
            <div className="flex items-center gap-2">
              {customer.total_due > 0 && (
                <button
                  onClick={() => {
                    setPayAmount(customer.total_due);
                    setShowPaymentModal(true);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-amber-700 active:scale-95 transition-all"
                >
                  <CreditCard className="h-4 w-4" /> Record Payment
                </button>
              )}

              <button
                onClick={handleOpenEdit}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
              >
                <Pencil className="h-4 w-4 text-emerald-600" /> Edit Profile
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            <TableSkeleton columns={4} rows={3} />
          </div>
        ) : errorMsg || !customer ? (
          <DataGridErrorState columns={1} error={errorMsg || 'Customer not found'} onRetry={loadCustomerData} />
        ) : (
          <>
            {/* Customer Information & Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Customer Information Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b pb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 font-extrabold text-xl">
                    {customer.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg text-slate-900">{customer.name}</h2>
                    <div className="text-xs text-slate-500">Member since {formatDate(customer.created_at)}</div>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2.5 text-slate-700">
                    <Phone className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span className="font-mono font-semibold">{customer.phone}</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-slate-700">
                    <Mail className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>{customer.email || 'No email provided'}</span>
                  </div>

                  <div className="flex items-start gap-2.5 text-slate-700">
                    <MapPin className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{customer.address || 'No address registered'}</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-slate-700">
                    <FileText className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      GSTIN: <span className="font-mono font-bold text-slate-900">{customer.gstin || 'N/A'}</span>
                    </span>
                  </div>

                  <div className="pt-2 border-t flex justify-between items-center text-slate-600">
                    <span>Credit Limit:</span>
                    <span className="font-bold text-slate-900">{formatRupee(customer.credit_limit || 5000)}</span>
                  </div>
                </div>
              </div>

              {/* Business Summary Grid */}
              <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* Total Purchases */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <ShoppingBag className="h-4 w-4 text-emerald-600" /> Total Purchases
                  </div>
                  <div className="text-2xl font-black text-slate-900">{formatRupee(stats.totalPurchases)}</div>
                  <div className="text-[11px] text-slate-400">Gross sales to customer</div>
                </div>

                {/* Total Paid */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Total Paid
                  </div>
                  <div className="text-2xl font-black text-emerald-700">{formatRupee(stats.totalPaid)}</div>
                  <div className="text-[11px] text-slate-400">Total cleared amount</div>
                </div>

                {/* Current Outstanding Due */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                    <AlertTriangle className="h-4 w-4 text-amber-600" /> Outstanding Due
                  </div>
                  <div className="text-2xl font-black text-amber-700">{formatRupee(stats.totalDue)}</div>
                  <div className="text-[11px] text-amber-800 font-medium">Pending credit (Udhar)</div>
                </div>

                {/* Number of Pending Invoices */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Receipt className="h-4 w-4 text-amber-600" /> Pending Invoices
                  </div>
                  <div className="text-2xl font-black text-slate-900">{pendingInvoicesCount}</div>
                  <div className="text-[11px] text-slate-400">Unpaid/partial bills</div>
                </div>

                {/* Last Purchase Date */}
                <div className="col-span-2 sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Calendar className="h-4 w-4 text-purple-600" /> Last Purchase Date
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    {stats.lastPurchaseDate ? formatDate(stats.lastPurchaseDate) : 'No transactions recorded'}
                  </div>
                  <div className="text-[11px] text-slate-400">Latest active checkout</div>
                </div>
              </div>
            </div>

            {/* Purchase History Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Purchase & Invoice History</h2>
                  <p className="text-xs text-slate-500">All invoices and checkout billing history for this customer</p>
                </div>

                {/* Search Invoices */}
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search invoice number or status..."
                    value={historySearch}
                    onChange={(e) => {
                      setHistorySearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-300 py-1.5 pl-9 pr-3 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Invoices Table */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <th className="p-4">Invoice No</th>
                        <th className="p-4">Date</th>
                        <th className="p-4 text-right">Total Amount</th>
                        <th className="p-4 text-right">Paid Amount</th>
                        <th className="p-4 text-right">Due Amount</th>
                        <th className="p-4 text-center">Payment Status</th>
                        <th className="p-4 text-center">Payment Mode</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                      {invoicesLoading ? (
                        <TableSkeleton columns={8} rows={5} />
                      ) : invoices.length === 0 ? (
                        <DataGridEmptyState
                          columns={8}
                          title="No invoice history found"
                          description="This customer does not have any recorded transactions yet."
                        />
                      ) : (
                        invoices.map((inv) => {
                          const statusUpper = String(inv.payment_status || 'PAID').toUpperCase();
                          const modeUpper = String(inv.payment_mode || 'CASH').toUpperCase();

                          return (
                            <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-4 font-mono font-bold text-slate-900">
                                {inv.invoice_number}
                              </td>

                              <td className="p-4 text-slate-600 font-medium">
                                {formatDate(inv.created_at)}
                              </td>

                              <td className="p-4 text-right font-black text-slate-900">
                                {formatRupee(inv.total_amount)}
                              </td>

                              <td className="p-4 text-right font-bold text-emerald-700">
                                {formatRupee(inv.paid_amount)}
                              </td>

                              <td className="p-4 text-right font-bold text-amber-700">
                                {formatRupee(inv.due_amount)}
                              </td>

                              <td className="p-4 text-center">
                                <span
                                  className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                    statusUpper === 'PAID'
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : statusUpper === 'UNPAID'
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                      : 'bg-blue-50 text-blue-800 border border-blue-200'
                                  }`}
                                >
                                  {statusUpper}
                                </span>
                              </td>

                              <td className="p-4 text-center">
                                <span className="inline-block rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                  {modeUpper}
                                </span>
                              </td>

                              <td className="p-4 text-right">
                                <Link
                                  href={`/invoices?search=${inv.invoice_number}`}
                                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-sm transition-all"
                                  title="View & Print Invoice Receipt"
                                >
                                  <Eye className="h-4 w-4 text-slate-600" />
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  page={page}
                  pageSize={pageSize}
                  totalCount={totalCount}
                  totalPages={totalPages}
                  loading={invoicesLoading}
                  onPageChange={(p) => setPage(p)}
                />
              </div>
            </div>

            {/* Payment History Section */}
            <div className="space-y-4 pt-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <History className="h-5 w-5 text-emerald-600" /> Recent Payment Recovery Transactions
                </h2>
                <p className="text-xs text-slate-500">Log of cleared credit payments received from this customer</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <th className="p-4">Payment Date</th>
                        <th className="p-4 text-right">Amount Paid</th>
                        <th className="p-4 text-center">Payment Mode</th>
                        <th className="p-4">UTR / Ref No</th>
                        <th className="p-4 text-right">Invoice Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                      {paymentsLoading ? (
                        <TableSkeleton columns={5} rows={3} />
                      ) : customerPayments.length === 0 ? (
                        <DataGridEmptyState
                          columns={5}
                          title="No payments recorded"
                          description="This customer does not have any recorded Udhar recovery payments yet."
                        />
                      ) : (
                        customerPayments.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-4 text-slate-600 font-medium">
                              {formatDate(p.created_at)}
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
                  page={payPage}
                  pageSize={5}
                  totalCount={payTotalCount}
                  totalPages={payTotalPages}
                  loading={paymentsLoading}
                  onPageChange={(p) => setPayPage(p)}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* EDIT CUSTOMER MODAL */}
      {showEditModal && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-extrabold text-lg text-slate-900">Edit Customer Information</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="rounded-full bg-slate-100 p-1 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-800 border border-red-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>{editError}</div>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mobile Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  maxLength={15}
                  value={editData.phone || ''}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editData.email || ''}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address / Landmark</label>
                <textarea
                  rows={2}
                  value={editData.address || ''}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={editData.gstin || ''}
                    onChange={(e) => setEditData({ ...editData, gstin: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono uppercase focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={editData.credit_limit || 5000}
                    onChange={(e) => setEditData({ ...editData, credit_limit: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-extrabold text-base text-slate-900">Record Udhar Payment</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="rounded-full bg-slate-100 p-1 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-amber-50 p-3 text-xs font-medium text-amber-900 border border-amber-200 space-y-1">
              <div>Customer: <span className="font-extrabold">{customer.name}</span></div>
              <div>Current Outstanding Udhar: <span className="font-extrabold text-sm text-amber-700">{formatRupee(customer.total_due)}</span></div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Amount (₹)</label>
                <input
                  type="number"
                  max={customer.total_due}
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
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white font-semibold focus:border-emerald-500 focus:outline-none"
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
                  placeholder="e.g. UPI/8912981928"
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
