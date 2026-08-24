'use client';

import React, { useEffect, useState, useTransition } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Pagination from '@/components/common/Pagination';
import { ApiService } from '@/services/api';
import { formatRupee, formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
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
  QrCode,
  Banknote,
  Users,
  Calendar,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { Invoice } from '@/types/database';

export default function InvoicesPage() {
  const { shop } = useAuth();
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [displayedInvoices, setDisplayedInvoices] = useState<Invoice[]>([]);

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID' | 'PARTIAL'>('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'CASH' | 'UPI' | 'CARD' | 'CREDIT'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Sync initial page from URL query string
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPage = parseInt(urlParams.get('page') || '1', 10);
      if (urlPage > 0) setPage(urlPage);
    }
  }, []);

  // Update URL query string without reloading page
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

  // Load all invoices once to derive tab count badges accurately
  useEffect(() => {
    const fetchAll = async () => {
      const data = await ApiService.getInvoices();
      setAllInvoices(data);
    };
    fetchAll();
    const handleUpdate = () => fetchAll();
    window.addEventListener('dukaan_storage_update', handleUpdate);
    return () => window.removeEventListener('dukaan_storage_update', handleUpdate);
  }, []);

  // Fetch paginated records whenever page or filters change
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchPaginated = async () => {
      const res = await ApiService.getPaginatedInvoices({
        page,
        pageSize,
        search: searchTerm,
        statusFilter,
        modeFilter,
        dateFilter,
        startDate,
        endDate,
      });

      if (isMounted) {
        setDisplayedInvoices(res.data);
        setTotalCount(res.totalCount);
        setTotalPages(res.totalPages);
        setLoading(false);
      }
    };

    fetchPaginated();
    return () => {
      isMounted = false;
    };
  }, [page, pageSize, searchTerm, statusFilter, modeFilter, dateFilter, startDate, endDate]);

  // Reset to page 1 on search or filter change
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPage(1);
    updateUrlPage(1);
  };

  const handleStatusFilterChange = (status: 'ALL' | 'PAID' | 'UNPAID' | 'PARTIAL') => {
    setStatusFilter(status);
    setPage(1);
    updateUrlPage(1);
  };

  const handleModeFilterChange = (mode: 'ALL' | 'CASH' | 'UPI' | 'CARD' | 'CREDIT') => {
    setModeFilter(mode);
    setPage(1);
    updateUrlPage(1);
  };

  const handleDateFilterChange = (dateF: 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM') => {
    setDateFilter(dateF);
    setPage(1);
    updateUrlPage(1);
  };

  const paidCount = allInvoices.filter((inv) => String(inv.payment_status || '').toUpperCase() === 'PAID').length;
  const unpaidCount = allInvoices.filter((inv) => String(inv.payment_status || '').toUpperCase() === 'UNPAID').length;
  const partialCount = allInvoices.filter((inv) => String(inv.payment_status || '').toUpperCase() === 'PARTIAL').length;

  const getModeBadge = (mode: string) => {
    const m = mode.toUpperCase();
    switch (m) {
      case 'CASH':
        return <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-800 font-bold text-[11px] border border-emerald-200">Cash</span>;
      case 'UPI':
        return <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-indigo-800 font-bold text-[11px] border border-indigo-200">UPI / QR</span>;
      case 'CARD':
        return <span className="rounded-md bg-blue-50 px-2.5 py-1 text-blue-800 font-bold text-[11px] border border-blue-200">Card</span>;
      case 'CREDIT':
        return <span className="rounded-md bg-amber-50 px-2.5 py-1 text-amber-800 font-bold text-[11px] border border-amber-200">Udhar / Credit</span>;
      default:
        return <span className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-800 font-bold text-[11px] border border-slate-200">{mode}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case 'PAID':
        return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 border border-emerald-200">PAID</span>;
      case 'UNPAID':
        return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-extrabold text-amber-900 border border-amber-200">UNPAID</span>;
      case 'PARTIAL':
        return <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-extrabold text-purple-900 border border-purple-200">PARTIAL</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold text-slate-800 border border-slate-200">{status}</span>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Invoices & Billing Archive</h1>
            <p className="text-sm text-slate-500">History of all generated tax receipts and sales for {shop?.name || 'your shop'}</p>
          </div>
        </div>

        {/* Comprehensive Filter Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          {/* Row 1: Search & Status Tabs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by invoice #, customer name or phone..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => handleStatusFilterChange('ALL')}
                className={`flex-1 min-w-[90px] rounded-xl py-2 text-xs font-bold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All ({allInvoices.length})
              </button>
              <button
                onClick={() => handleStatusFilterChange('PAID')}
                className={`flex-1 min-w-[90px] rounded-xl py-2 text-xs font-bold transition-all ${
                  statusFilter === 'PAID'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Paid ({paidCount})
              </button>
              <button
                onClick={() => handleStatusFilterChange('UNPAID')}
                className={`flex-1 min-w-[90px] rounded-xl py-2 text-xs font-bold transition-all ${
                  statusFilter === 'UNPAID'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Udhar ({unpaidCount})
              </button>
              {partialCount > 0 && (
                <button
                  onClick={() => handleStatusFilterChange('PARTIAL')}
                  className={`flex-1 min-w-[90px] rounded-xl py-2 text-xs font-bold transition-all ${
                    statusFilter === 'PARTIAL'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Partial ({partialCount})
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Payment Mode & Date Filters */}
          <div className="flex flex-wrap items-center gap-3 border-t pt-3">
            {/* Payment Mode Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5 text-slate-400" /> Mode:
              </span>
              <select
                value={modeFilter}
                onChange={(e) => handleModeFilterChange(e.target.value as any)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">All Payment Modes</option>
                <option value="CASH">Cash Only</option>
                <option value="UPI">UPI / QR Only</option>
                <option value="CARD">Card Only</option>
                <option value="CREDIT">Udhar / Credit Only</option>
              </select>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" /> Date:
              </span>
              <select
                value={dateFilter}
                onChange={(e) => handleDateFilterChange(e.target.value as any)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="THIS_WEEK">This Week (Last 7 Days)</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="CUSTOM">Custom Date Range</option>
              </select>
            </div>

            {/* Custom Date Pickers */}
            {dateFilter === 'CUSTOM' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}
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
                  <th className="p-4 text-center">Items</th>
                  <th className="p-4 text-center">Payment Mode</th>
                  <th className="p-4 text-right">Total Amount</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                      Loading invoices...
                    </td>
                  </tr>
                ) : displayedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                      No invoices found matching current search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  displayedInvoices.map((inv) => {
                    const isPaid = String(inv.payment_status || '').toUpperCase() === 'PAID';
                    const modeDisplay = inv.payment_mode || (isPaid ? 'CASH' : 'CREDIT');

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Invoice Number */}
                        <td className="p-4 font-mono font-bold text-slate-900">
                          {inv.invoice_number}
                        </td>

                        {/* Customer Info */}
                        <td className="p-4">
                          <div className="font-bold text-slate-900">
                            {inv.customer_name || 'Walk-in Customer'}
                          </div>
                          {inv.customer_phone && (
                            <div className="text-[10px] text-slate-400 font-mono">{inv.customer_phone}</div>
                          )}
                        </td>

                        {/* Date */}
                        <td className="p-4 text-slate-600 font-medium">
                          {formatDate(inv.created_at)}
                        </td>

                        {/* Items Count */}
                        <td className="p-4 text-center font-bold">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                            {inv.items?.length || 0} items
                          </span>
                        </td>

                        {/* Payment Mode */}
                        <td className="p-4 text-center">
                          {getModeBadge(modeDisplay)}
                        </td>

                        {/* Amount */}
                        <td className="p-4 text-right font-black text-sm text-slate-900">
                          {formatRupee(inv.total_amount)}
                          {inv.due_amount > 0 && (
                            <div className="text-[10px] font-bold text-amber-600">
                              Due: {formatRupee(inv.due_amount)}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-4 text-center">
                          {getStatusBadge(inv.payment_status || 'PAID')}
                        </td>

                        {/* Action */}
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 transition-all"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" /> View & Print
                          </button>
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
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* DETAILED INVOICE MODAL & PRINT RECEIPT CONTAINER */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto border border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3 no-print">
              <h2 className="font-extrabold text-base text-slate-900">Tax Invoice View</h2>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Printable Thermal Receipt */}
            <div id="printable-receipt" className="space-y-3 text-xs text-slate-800">
              {/* Shop Header */}
              <div className="text-center space-y-0.5 border-b pb-2.5">
                <div className="font-extrabold text-base text-slate-900">{shop?.name || 'Shree Ganesh Super Market'}</div>
                <div>{shop?.address || 'Main Market Road, Andheri West, Mumbai'}</div>
                <div>GSTIN: {shop?.gst_number || '27AAACG1234F1Z5'} &bull; Ph: {shop?.phone || '+91 98200 12345'}</div>
              </div>

              {/* Invoice Meta Details */}
              <div className="flex justify-between border-b pb-2 text-[11px] space-y-0.5">
                <div>
                  <div><span className="font-bold">Invoice #:</span> {selectedInvoice.invoice_number}</div>
                  <div><span className="font-bold">Customer:</span> {selectedInvoice.customer_name || 'Walk-in Customer'}</div>
                  {selectedInvoice.customer_phone && (
                    <div><span className="font-bold">Mobile:</span> {selectedInvoice.customer_phone}</div>
                  )}
                </div>
                <div className="text-right">
                  <div><span className="font-bold">Date:</span> {formatDate(selectedInvoice.created_at)}</div>
                  <div><span className="font-bold">Mode:</span> {selectedInvoice.payment_mode || 'CASH'}</div>
                  <div><span className="font-bold">Status:</span> {String(selectedInvoice.payment_status || 'PAID').toUpperCase()}</div>
                </div>
              </div>

              {/* Transaction Reference / UTR Note */}
              {selectedInvoice.notes && selectedInvoice.notes.includes('Ref:') && (
                <div className="rounded-md bg-slate-50 p-2 text-[10px] font-mono border border-slate-200">
                  <span className="font-bold text-slate-700">Transaction Reference:</span> {selectedInvoice.notes.replace('Ref:', '').trim()}
                </div>
              )}

              {/* Items Table */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b font-bold text-slate-700 text-[11px]">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Price</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.items?.map((item) => {
                    const lineTotal = item.total ?? (item.quantity * item.unit_price);
                    return (
                      <tr key={item.id}>
                        <td className="py-1 max-w-[130px] truncate">
                          <div className="font-semibold text-slate-900">{item.product_name}</div>
                          {item.gst_rate > 0 && (
                            <div className="text-[9px] text-slate-400">GST {item.gst_rate}%</div>
                          )}
                        </td>
                        <td className="py-1 text-center">{item.quantity}</td>
                        <td className="py-1 text-right">{formatRupee(item.unit_price)}</td>
                        <td className="py-1 text-right font-bold">{formatRupee(lineTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Summary Calculations */}
              <div className="border-t pt-2 space-y-1 text-right font-semibold">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Value:</span>
                  <span>{formatRupee(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Bill Discount:</span>
                    <span>-{formatRupee(selectedInvoice.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Total GST Included:</span>
                  <span>{formatRupee(selectedInvoice.gst_amount || 0)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 font-black text-sm text-slate-900">
                  <span>Grand Total:</span>
                  <span>{formatRupee(selectedInvoice.total_amount)}</span>
                </div>
                {selectedInvoice.due_amount > 0 && (
                  <div className="flex justify-between text-amber-700 text-xs font-extrabold border-t border-amber-200 pt-1">
                    <span>Remaining Due (Udhar):</span>
                    <span>{formatRupee(selectedInvoice.due_amount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 border-t pt-3 no-print">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-1/2 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="w-1/2 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-all"
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
