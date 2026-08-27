'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { ApiService } from '@/services/api';
import { formatRupee, formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertTriangle,
  CheckCircle2,
  X,
  Receipt,
} from 'lucide-react';
import { TableSkeleton, DataGridEmptyState, DataGridErrorState } from '@/components/common/GridStateComponents';
import { Customer, Invoice, PaymentMode } from '@/types/database';

export default function CustomerDueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [dueInvoices, setDueInvoices] = useState<Invoice[]>([]);
  const [totalDue, setTotalDue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [targetInvoice, setTargetInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<PaymentMode>('UPI');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('Udhar clearance payment');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDueDetails = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await ApiService.getCustomerDueDetails(customerId);
      if (!res.customer) {
        setErrorMsg('Customer profile not found');
      } else {
        setCustomer(res.customer);
        setDueInvoices(res.invoices);
        setTotalDue(res.totalDue);
      }
    } catch (err: any) {
      console.error('[loadDueDetails Error]', err);
      setErrorMsg(err?.message || 'Failed to load customer due details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDueDetails();
  }, [customerId]);

  const handleOpenPaymentModal = (inv?: Invoice) => {
    if (inv) {
      setTargetInvoice(inv);
      setPayAmount(inv.due_amount);
    } else {
      setTargetInvoice(null);
      setPayAmount(totalDue);
    }
    setPayMode('UPI');
    setPayRef('');
    setPayNotes('Udhar settlement payment');
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    if (payAmount <= 0) {
      alert('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    const maxLimit = targetInvoice ? targetInvoice.due_amount : totalDue;
    if (payAmount > maxLimit) {
      alert(`Payment amount (₹${payAmount}) cannot exceed remaining due (₹${maxLimit}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await ApiService.receiveCustomerPayment({
        customerId: customer.id,
        amount: payAmount,
        paymentMode: payMode,
        referenceNo: payRef,
        notes: payNotes,
        invoiceId: targetInvoice ? targetInvoice.id : undefined,
      });

      setShowPaymentModal(false);
      setTargetInvoice(null);
      loadDueDetails();
    } catch (err: any) {
      alert('Failed to process payment: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dues"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 shadow-sm transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Customer Due Details</h1>
              <p className="text-xs text-slate-500">Breakdown of outstanding invoices and payment settlement</p>
            </div>
          </div>

          {customer && totalDue > 0 && (
            <button
              onClick={() => handleOpenPaymentModal()}
              className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-amber-700 active:scale-95 transition-all"
            >
              <CreditCard className="h-4 w-4" /> Clear All Due ({formatRupee(totalDue)})
            </button>
          )}
        </div>

        {loading ? (
          <TableSkeleton columns={6} rows={5} />
        ) : errorMsg || !customer ? (
          <DataGridErrorState columns={1} error={errorMsg || 'Customer not found'} onRetry={loadDueDetails} />
        ) : (
          <>
            {/* Customer Summary Banner */}
            <div className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-extrabold">{customer.name}</span>
                  <span className="font-mono text-xs bg-amber-800/40 px-2 py-0.5 rounded-md border border-amber-400/30">
                    {customer.phone}
                  </span>
                </div>
                <div className="text-xs text-amber-100 flex flex-wrap items-center gap-4 pt-1">
                  {customer.email && <span>Email: {customer.email}</span>}
                  {customer.address && <span>Address: {customer.address}</span>}
                  {customer.gstin && <span>GSTIN: {customer.gstin}</span>}
                </div>
              </div>

              <div className="text-right sm:text-right bg-amber-800/40 p-4 rounded-2xl border border-amber-400/30">
                <div className="text-xs font-bold text-amber-100 uppercase tracking-wider">Current Outstanding Due</div>
                <div className="text-3xl font-black">{formatRupee(totalDue)}</div>
                <div className="text-[11px] text-amber-100">{dueInvoices.length} pending invoices</div>
              </div>
            </div>

            {/* Outstanding Invoices List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-slate-600" /> Pending Invoices Breakdown
                </h2>
                <div className="text-xs text-slate-500 font-medium">
                  {dueInvoices.length} unpaid / partially paid invoices
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <th className="p-4">Invoice Number</th>
                        <th className="p-4">Invoice Date</th>
                        <th className="p-4 text-right">Original Amount</th>
                        <th className="p-4 text-right">Amount Paid</th>
                        <th className="p-4 text-right">Remaining Due</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                      {dueInvoices.length === 0 ? (
                        <DataGridEmptyState
                          columns={7}
                          title="No pending invoices"
                          description="This customer does not have any unpaid or partially paid invoices."
                        />
                      ) : (
                        dueInvoices.map((inv) => {
                          const statusUpper = String(inv.payment_status || 'UNPAID').toUpperCase();

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
                                      : statusUpper === 'PARTIALLY_PAID' || statusUpper === 'PARTIAL'
                                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                                  }`}
                                >
                                  {statusUpper}
                                </span>
                              </td>

                              <td className="p-4 text-right">
                                <button
                                  onClick={() => handleOpenPaymentModal(inv)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
                                  title="Pay Invoice"
                                >
                                  <CreditCard className="h-3.5 w-3.5" /> Pay Invoice
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* RECEIVE PAYMENT MODAL */}
      {showPaymentModal && customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                {targetInvoice ? `Pay Invoice ${targetInvoice.invoice_number}` : 'Clear Customer Dues'}
              </h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="rounded-full bg-slate-100 p-1 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-amber-50 p-3.5 text-xs font-medium text-amber-900 border border-amber-200 space-y-1">
              <div>Customer: <span className="font-extrabold text-slate-900">{customer.name}</span></div>
              {targetInvoice ? (
                <div>Invoice Remaining Due: <span className="font-extrabold text-sm text-amber-700">{formatRupee(targetInvoice.due_amount)}</span></div>
              ) : (
                <div>Total Outstanding Due: <span className="font-extrabold text-sm text-amber-700">{formatRupee(totalDue)}</span></div>
              )}
            </div>

            <form onSubmit={handleProcessPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Amount Received (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  max={targetInvoice ? targetInvoice.due_amount : totalDue}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-base font-black text-emerald-700 focus:border-emerald-500 focus:outline-none"
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
                <label className="block font-semibold text-slate-700 mb-1">
                  {payMode === 'UPI' ? 'UTR / Transaction ID' : payMode === 'CARD' ? 'Card Reference Number' : 'Notes'}
                </label>
                <input
                  type="text"
                  placeholder={payMode === 'UPI' ? 'e.g. UPI/9012981029' : 'e.g. Card Ref 1234'}
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
                  {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
