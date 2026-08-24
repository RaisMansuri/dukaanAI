'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { ApiService } from '@/services/api';
import { formatRupee, formatDate } from '@/lib/utils';
import {
  FileText,
  Search,
  Printer,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
} from 'lucide-react';
import { Invoice } from '@/types/database';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadInvoices();
    const handleUpdate = () => loadInvoices();
    window.addEventListener('dukaan_storage_update', handleUpdate);
    return () => window.removeEventListener('dukaan_storage_update', handleUpdate);
  }, []);

  const loadInvoices = async () => {
    const data = await ApiService.getInvoices();
    setInvoices(data);
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === 'ALL' || inv.payment_status === statusFilter;
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customer_name && inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.customer_phone && inv.customer_phone.includes(searchTerm));
    return matchesStatus && matchesSearch;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Invoices & Billing Archive</h1>
            <p className="text-sm text-slate-500">History of all generated tax receipts and sales</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice number, customer name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Invoices ({invoices.length})
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                statusFilter === 'PAID'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Paid Only
            </button>
            <button
              onClick={() => setStatusFilter('UNPAID')}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                statusFilter === 'UNPAID'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Udhar / Unpaid
            </button>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4 text-center">Payment Mode</th>
                  <th className="p-4 text-right">Total Amount</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No invoices found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-900">
                        {inv.invoice_number}
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-900">
                          {inv.customer_name || 'Walk-in Customer'}
                        </div>
                        {inv.customer_phone && (
                          <div className="text-[10px] text-slate-400">{inv.customer_phone}</div>
                        )}
                      </td>

                      <td className="p-4 text-slate-600 font-medium">
                        {formatDate(inv.created_at)}
                      </td>

                      <td className="p-4 text-center font-semibold">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                          {inv.payment_mode}
                        </span>
                      </td>

                      <td className="p-4 text-right font-black text-sm text-slate-900">
                        {formatRupee(inv.total_amount)}
                        {inv.due_amount > 0 && (
                          <div className="text-[10px] font-bold text-amber-600">
                            Due: {formatRupee(inv.due_amount)}
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                            inv.payment_status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {inv.payment_status}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" /> View & Print
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-extrabold text-lg text-slate-900">GST Invoice View</h2>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="rounded-full bg-slate-100 p-1 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div id="printable-receipt" className="space-y-3 text-xs text-slate-800">
              <div className="text-center space-y-0.5 border-b pb-2">
                <div className="font-extrabold text-base text-slate-900">Shree Ganesh Super Market</div>
                <div>Main Market Road, Andheri West, Mumbai</div>
                <div>GSTIN: 27AAACG1234F1Z5 &bull; Ph: +91 98200 12345</div>
              </div>

              <div className="flex justify-between border-b pb-2 text-[11px]">
                <div>
                  <div><span className="font-bold">Invoice #:</span> {selectedInvoice.invoice_number}</div>
                  <div><span className="font-bold">Customer:</span> {selectedInvoice.customer_name}</div>
                </div>
                <div className="text-right">
                  <div><span className="font-bold">Date:</span> {formatDate(selectedInvoice.created_at)}</div>
                  <div><span className="font-bold">Mode:</span> {selectedInvoice.payment_mode}</div>
                </div>
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="border-b font-bold">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Price</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1 max-w-[140px] truncate">{item.product_name}</td>
                      <td className="py-1 text-center">{item.quantity}</td>
                      <td className="py-1 text-right">₹{item.unit_price}</td>
                      <td className="py-1 text-right font-bold">₹{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t pt-2 space-y-1 text-right font-semibold">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatRupee(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Discount:</span>
                    <span>-{formatRupee(selectedInvoice.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>GST Amount:</span>
                  <span>{formatRupee(selectedInvoice.gst_amount)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-black text-sm text-slate-900">
                  <span>Total Payable:</span>
                  <span>{formatRupee(selectedInvoice.total_amount)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-t pt-3">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-1/2 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="w-1/2 flex items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <Printer className="h-4 w-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
