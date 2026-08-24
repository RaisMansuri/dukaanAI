'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { DashboardSkeleton } from '@/components/common/GridStateComponents';
import { ApiService } from '@/services/api';
import { formatRupee, formatDate } from '@/lib/utils';
import {
  IndianRupee,
  Receipt,
  Package,
  Users,
  AlertTriangle,
  Zap,
  Plus,
  ArrowRight,
  Printer,
  Sparkles,
  TrendingUp,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import { Invoice, Product } from '@/types/database';

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    todaySales: number;
    totalBillsToday: number;
    totalProductsCount: number;
    totalCustomersCount: number;
    totalDueAmount: number;
    lowStockProducts: Product[];
    recentInvoices: Invoice[];
  } | null>(null);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadDashboard();
    const handleUpdate = () => loadDashboard();
    window.addEventListener('dukaan_storage_update', handleUpdate);
    return () => window.removeEventListener('dukaan_storage_update', handleUpdate);
  }, []);

  const loadDashboard = async () => {
    const res = await ApiService.getDashboardStats();
    setStats(res);
  };

  if (!stats) {
    return (
      <AppLayout>
        <DashboardSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome & Quick Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Retail Overview Dashboard
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Real-time sales, inventory, and customer credit tracking
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/pos"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <Zap className="h-4 w-4 fill-white" />
              <span>Create New Bill</span>
            </Link>

            <Link
              href="/products"
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
            >
              <Plus className="h-4 w-4 text-emerald-600" />
              <span>Add Product</span>
            </Link>

            <Link
              href="/customers"
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
            >
              <Users className="h-4 w-4 text-amber-600" />
              <span>Add Customer</span>
            </Link>
          </div>
        </div>

        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          {/* Today's Sales */}
          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-500 to-teal-700 p-4 text-white shadow-lg relative overflow-hidden">
            <div className="absolute right-2 top-2 opacity-20">
              <IndianRupee className="h-16 w-16" />
            </div>
            <div className="flex items-center gap-1.5 text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Today&apos;s Sales</span>
            </div>
            <div className="text-2xl font-black tracking-tight">{formatRupee(stats.todaySales)}</div>
            <div className="text-[11px] text-emerald-100 mt-2 font-medium">
              {stats.totalBillsToday} bills completed today
            </div>
          </div>

          {/* Total Bills Today */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span>Total Bills</span>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{stats.totalBillsToday}</div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">Invoices generated</div>
          </div>

          {/* Pending Due Amount */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-amber-800 text-xs font-semibold mb-2">
              <span>Customer Due (Udhar)</span>
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-900">{formatRupee(stats.totalDueAmount)}</div>
            <div className="text-[11px] text-amber-700 mt-1 font-medium">
              <Link href="/customers" className="underline hover:text-amber-900">Collect pending udhar &rarr;</Link>
            </div>
          </div>

          {/* Active Products */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span>Catalog Products</span>
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{stats.totalProductsCount}</div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">Items in inventory</div>
          </div>

          {/* Customers Count */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
              <span>Total Customers</span>
              <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{stats.totalCustomersCount}</div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">Registered profiles</div>
          </div>
        </div>

        {/* Main Content Grid: Recent Invoices + Low Stock Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Invoices Feed (2 Columns) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Recent Bills</h2>
                <p className="text-xs text-slate-500">Latest checkout transactions generated today</p>
              </div>
              <Link
                href="/invoices"
                className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
              >
                View All Invoices <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                {stats.recentInvoices.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    No invoices generated yet today. Go to POS to create a bill!
                  </div>
                ) : (
                  stats.recentInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50/80 transition-colors gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {inv.invoice_number}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                              inv.payment_status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {inv.payment_status}
                          </span>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            {inv.payment_mode}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {inv.customer_name || 'Walk-in Customer'} &bull; {inv.items?.length || 0} items &bull; {formatDate(inv.created_at)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="text-right">
                          <div className="font-extrabold text-base text-slate-900">
                            {formatRupee(inv.total_amount)}
                          </div>
                          {inv.due_amount > 0 && (
                            <div className="text-[11px] font-semibold text-amber-600">
                              Due: {formatRupee(inv.due_amount)}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100 transition-colors"
                        >
                          <Printer className="h-3.5 w-3.5 text-slate-500" />
                          <span>View</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Low Stock Alert Sidebar (1 Column) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900">Low Stock Alerts</h2>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-extrabold text-amber-800">
                {stats.lowStockProducts.length} Items
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              {stats.lowStockProducts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  All inventory items are well above minimum alert threshold.
                </div>
              ) : (
                stats.lowStockProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="flex items-center justify-between rounded-xl bg-amber-50/60 p-3 border border-amber-200/80"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 truncate max-w-[160px]">
                        {prod.name}
                      </div>
                      <div className="text-[11px] text-amber-800">
                        Remaining: <span className="font-bold">{prod.stock_qty} {prod.unit}</span> (Min: {prod.min_stock_alert})
                      </div>
                    </div>
                    <Link
                      href="/products"
                      className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-amber-700 transition-colors"
                    >
                      Restock
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Invoice Receipt Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="font-bold text-lg text-slate-900">Tax Invoice Receipt</div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
                >
                  ✕ Close
                </button>
              </div>

              {/* Printable Receipt Area */}
              <div id="printable-receipt" className="space-y-3 text-xs text-slate-800">
                <div className="text-center space-y-0.5 border-b pb-2">
                  <div className="font-extrabold text-base text-slate-900">Shree Ganesh Super Market</div>
                  <div>Main Market Road, Andheri West, Mumbai</div>
                  <div>GSTIN: 27AAACG1234F1Z5 &bull; Ph: +91 98200 12345</div>
                </div>

                <div className="flex justify-between border-b pb-2 text-[11px]">
                  <div>
                    <div><span className="font-bold">Invoice:</span> {selectedInvoice.invoice_number}</div>
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
                    <span>Includes GST:</span>
                    <span>{formatRupee(selectedInvoice.gst_amount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-black text-sm text-slate-900">
                    <span>Total Amount:</span>
                    <span>{formatRupee(selectedInvoice.total_amount)}</span>
                  </div>
                </div>

                <div className="text-center pt-3 text-[10px] text-slate-500 border-t">
                  *** Thank You For Shopping With Us! ***
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <Printer className="h-4 w-4" /> Print Thermal Receipt
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
