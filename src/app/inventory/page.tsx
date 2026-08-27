'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { ApiService } from '@/services/api';
import { formatRupee, formatDate } from '@/lib/utils';
import {
  Boxes,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  Search,
  RefreshCw,
  History,
  Pencil,
  Eye,
  SlidersHorizontal,
  X,
  IndianRupee,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  Bell,
  MessageSquare,
  Send,
  Phone,
} from 'lucide-react';
import Pagination from '@/components/common/Pagination';
import { TableSkeleton, DataGridEmptyState, DataGridErrorState } from '@/components/common/GridStateComponents';
import { Product, StockMovement, StockMovementType, UnitType, StockNotificationLog } from '@/types/database';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'MOVEMENTS' | 'NOTIFICATIONS'>('SUMMARY');

  // Inventory Metrics State
  const [metrics, setMetrics] = useState({
    totalItems: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalValuation: 0,
  });

  // Product Inventory Tab State
  const [products, setProducts] = useState<Product[]>([]);
  const [prodPage, setProdPage] = useState(1);
  const [pageSize] = useState(10);
  const [prodTotalCount, setProdTotalCount] = useState(0);
  const [prodTotalPages, setProdTotalPages] = useState(1);
  const [prodLoading, setProdLoading] = useState(true);
  const [prodError, setProdError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');

  // Stock Movements Tab State
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movPage, setMovPage] = useState(1);
  const [movTotalCount, setMovTotalCount] = useState(0);
  const [movTotalPages, setMovTotalPages] = useState(1);
  const [movLoading, setMovLoading] = useState(false);

  // Notification Logs Tab State
  const [notifLogs, setNotifLogs] = useState<StockNotificationLog[]>([]);
  const [notifPage, setNotifPage] = useState(1);
  const [notifTotalCount, setNotifTotalCount] = useState(0);
  const [notifTotalPages, setNotifTotalPages] = useState(1);
  const [notifLoading, setNotifLoading] = useState(false);

  // Stock Adjustment Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustMode, setAdjustMode] = useState<'ADD' | 'REDUCE' | 'SET'>('ADD');
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState<string>('Supplier Purchase');
  const [adjustNotes, setAdjustNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMetrics = async () => {
    try {
      const res = await ApiService.getInventoryMetrics();
      setMetrics(res);
    } catch (err) {
      console.warn('[loadMetrics Error]', err);
    }
  };

  const loadInventoryProducts = async () => {
    setProdLoading(true);
    setProdError(null);
    try {
      const res = await ApiService.getPaginatedProducts({
        page: prodPage,
        pageSize,
        search: searchTerm,
      });

      if (res.error) {
        setProdError(res.error);
        setProducts([]);
      } else {
        let filtered = res.data;
        if (statusFilter === 'IN_STOCK') {
          filtered = filtered.filter((p) => p.stock_qty > p.min_stock_alert);
        } else if (statusFilter === 'LOW_STOCK') {
          filtered = filtered.filter((p) => p.stock_qty > 0 && p.stock_qty <= p.min_stock_alert);
        } else if (statusFilter === 'OUT_OF_STOCK') {
          filtered = filtered.filter((p) => p.stock_qty === 0);
        }

        setProducts(filtered);
        setProdTotalCount(res.totalCount);
        setProdTotalPages(res.totalPages);
      }
    } catch (err: any) {
      console.error('[loadInventoryProducts Error]', err);
      setProdError(err?.message || 'Failed to load inventory data');
    } finally {
      setProdLoading(false);
    }
  };

  const loadStockMovements = async () => {
    setMovLoading(true);
    try {
      const res = await ApiService.getPaginatedStockMovements({
        page: movPage,
        pageSize,
        search: searchTerm,
        productId: selectedProduct ? selectedProduct.id : undefined,
        typeFilter: movementTypeFilter,
      });
      setMovements(res.data);
      setMovTotalCount(res.totalCount);
      setMovTotalPages(res.totalPages);
    } catch (err: any) {
      console.error('[loadStockMovements Error]', err);
    } finally {
      setMovLoading(false);
    }
  };

  const loadNotificationLogs = async () => {
    setNotifLoading(true);
    try {
      const res = await ApiService.getPaginatedNotificationLogs({
        page: notifPage,
        pageSize,
        search: searchTerm,
        channelFilter: channelFilter,
      });
      setNotifLogs(res.data);
      setNotifTotalCount(res.totalCount);
      setNotifTotalPages(res.totalPages);
    } catch (err: any) {
      console.error('[loadNotificationLogs Error]', err);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  useEffect(() => {
    if (activeTab === 'SUMMARY') {
      loadInventoryProducts();
    } else if (activeTab === 'MOVEMENTS') {
      loadStockMovements();
    } else if (activeTab === 'NOTIFICATIONS') {
      loadNotificationLogs();
    }
  }, [activeTab, prodPage, movPage, notifPage, pageSize, searchTerm, statusFilter, movementTypeFilter, channelFilter, selectedProduct]);

  const handleOpenAdjustModal = (product: Product) => {
    setSelectedProduct(product);
    setAdjustMode('ADD');
    setAdjustQty(1);
    setAdjustReason('Supplier Purchase');
    setAdjustNotes('');
    setShowAdjustModal(true);
  };

  const handleProcessStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (adjustQty < 0) {
      alert('Quantity cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    try {
      const notesCombined = `${adjustReason}${adjustNotes ? ' - ' + adjustNotes : ''}`;
      await ApiService.adjustProductStock(
        selectedProduct.id,
        adjustMode,
        adjustQty,
        notesCombined
      );

      setShowAdjustModal(false);
      setSelectedProduct(null);
      loadMetrics();
      loadInventoryProducts();
      if (activeTab === 'MOVEMENTS') loadStockMovements();
    } catch (err: any) {
      alert('Failed to update stock: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStockStatusBadge = (stock: number, minAlert: number) => {
    if (stock === 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-black text-red-800 border border-red-300">
          <XCircle className="h-3 w-3 text-red-600" /> OUT OF STOCK
        </span>
      );
    }
    if (stock <= minAlert) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-900 border border-amber-300">
          <AlertTriangle className="h-3 w-3 text-amber-600" /> LOW STOCK
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> IN STOCK
      </span>
    );
  };

  const getMovementTypeBadge = (type: StockMovementType) => {
    switch (type) {
      case 'SALE':
      case 'OUT':
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
            <ArrowDownRight className="h-3 w-3 text-blue-600" /> SALE DEDUCTION
          </span>
        );
      case 'STOCK_ADDED':
      case 'SUPPLIER_PURCHASE':
      case 'IN':
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
            <ArrowUpRight className="h-3 w-3 text-emerald-600" /> STOCK ADDED
          </span>
        );
      case 'STOCK_REDUCED':
      case 'DAMAGED_GOODS':
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
            <Minus className="h-3 w-3 text-amber-600" /> REDUCED / DAMAGED
          </span>
        );
      case 'RETURN':
      case 'CANCELLED_SALE_RESTOCK':
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-200">
            <RefreshCw className="h-3 w-3 text-purple-600" /> RETURN RESTOCK
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
            <SlidersHorizontal className="h-3 w-3 text-slate-500" /> ADJUSTMENT
          </span>
        );
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="h-7 w-7 text-emerald-600" />
              Inventory & Stock Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time product stock tracking, stock adjustments, low stock alerts, and audit history.
            </p>
          </div>

          {/* Navigation / Tab Switcher */}
          <div className="flex items-center rounded-2xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => {
                setActiveTab('SUMMARY');
                setSearchTerm('');
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'SUMMARY'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="h-3.5 w-3.5 text-emerald-600" />
              <span>Inventory Summary</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('MOVEMENTS');
                setSearchTerm('');
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'MOVEMENTS'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="h-3.5 w-3.5 text-purple-600" />
              <span>Stock Movements Ledger</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('NOTIFICATIONS');
                setSearchTerm('');
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'NOTIFICATIONS'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bell className="h-3.5 w-3.5 text-amber-600" />
              <span>Notification Audit Log</span>
            </button>
          </div>
        </div>

        {/* Inventory Summary Cards Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Products</div>
            <div className="text-2xl font-black text-slate-900">{metrics.totalItems}</div>
            <div className="text-[10px] text-slate-400">SKUs in catalog</div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm space-y-1">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">In Stock</div>
            <div className="text-2xl font-black text-emerald-700">{metrics.inStockCount}</div>
            <div className="text-[10px] text-emerald-700 font-medium">Sufficient stock level</div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm space-y-1">
            <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-600" /> Low Stock
            </div>
            <div className="text-2xl font-black text-amber-700">{metrics.lowStockCount}</div>
            <div className="text-[10px] text-amber-800 font-medium">At or below alert level</div>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm space-y-1">
            <div className="text-[11px] font-bold text-red-900 uppercase tracking-wider flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-600" /> Out of Stock
            </div>
            <div className="text-2xl font-black text-red-700">{metrics.outOfStockCount}</div>
            <div className="text-[10px] text-red-800 font-medium">Zero stock remaining</div>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stock Valuation</div>
            <div className="text-xl font-black text-slate-900">{formatRupee(metrics.totalValuation)}</div>
            <div className="text-[10px] text-slate-400">At purchase cost price</div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'SUMMARY'
                  ? 'Search item by product name, barcode or SKU...'
                  : 'Search movements by product name, notes or reference...'
              }
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setProdPage(1);
                setMovPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-xs focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Tab 1 Status Filter */}
          {activeTab === 'SUMMARY' ? (
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  setProdPage(1);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Status
              </button>
              <button
                onClick={() => {
                  setStatusFilter('LOW_STOCK');
                  setProdPage(1);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  statusFilter === 'LOW_STOCK'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Low Stock ({metrics.lowStockCount})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('OUT_OF_STOCK');
                  setProdPage(1);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  statusFilter === 'OUT_OF_STOCK'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Out of Stock ({metrics.outOfStockCount})
              </button>
            </div>
          ) : activeTab === 'MOVEMENTS' ? (
            /* Tab 2 Movement Filter */
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Filter Type:</span>
              <select
                value={movementTypeFilter}
                onChange={(e) => {
                  setMovementTypeFilter(e.target.value);
                  setMovPage(1);
                }}
                className="rounded-xl border border-slate-300 py-1.5 px-3 text-xs bg-white font-semibold focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">All Movements</option>
                <option value="SALE">Sale Deductions</option>
                <option value="STOCK_ADDED">Stock Added</option>
                <option value="STOCK_REDUCED">Stock Reduced</option>
                <option value="ADJUSTMENT">Adjustments</option>
                <option value="RETURN">Returns</option>
              </select>
            </div>
          ) : (
            /* Tab 3 Notification Channel Filter */
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Channel Filter:</span>
              <select
                value={channelFilter}
                onChange={(e) => {
                  setChannelFilter(e.target.value);
                  setNotifPage(1);
                }}
                className="rounded-xl border border-slate-300 py-1.5 px-3 text-xs bg-white font-semibold focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">All Channels (SMS & WhatsApp)</option>
                <option value="SMS">SMS Text</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </div>
          )}
        </div>

        {/* TAB 1: PRODUCT INVENTORY SUMMARY */}
        {activeTab === 'SUMMARY' && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="p-4">Product Details</th>
                    <th className="p-4">SKU / Barcode</th>
                    <th className="p-4 text-right">Current Stock</th>
                    <th className="p-4 text-right">Min Stock Alert</th>
                    <th className="p-4 text-right">Prices (Cost / Selling)</th>
                    <th className="p-4 text-center">Stock Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                  {prodLoading ? (
                    <TableSkeleton columns={7} rows={10} />
                  ) : prodError ? (
                    <DataGridErrorState columns={7} error={prodError} onRetry={loadInventoryProducts} />
                  ) : products.length === 0 ? (
                    <DataGridEmptyState
                      columns={7}
                      title="No inventory products found"
                      description="Try adjusting your search query or status filters."
                    />
                  ) : (
                    products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Product Details */}
                        <td className="p-4">
                          <div className="font-bold text-sm text-slate-900">{p.name}</div>
                          {p.name_hindi && <div className="text-[11px] text-slate-500">{p.name_hindi}</div>}
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Tag className="h-3 w-3 text-slate-400" /> {p.category || 'General'}
                          </div>
                        </td>

                        {/* SKU / Barcode */}
                        <td className="p-4 font-mono font-medium text-slate-700">
                          {p.barcode || '-'}
                        </td>

                        {/* Current Stock */}
                        <td className="p-4 text-right">
                          <span
                            className={`text-sm font-black ${
                              p.stock_qty === 0
                                ? 'text-red-600'
                                : p.stock_qty <= p.min_stock_alert
                                ? 'text-amber-700'
                                : 'text-slate-900'
                            }`}
                          >
                            {p.stock_qty} {p.unit || 'Pcs'}
                          </span>
                        </td>

                        {/* Minimum Stock Level */}
                        <td className="p-4 text-right font-semibold text-slate-600">
                          {p.min_stock_alert} {p.unit || 'Pcs'}
                        </td>

                        {/* Prices */}
                        <td className="p-4 text-right">
                          <div className="font-bold text-slate-900">Sell: {formatRupee(p.price)}</div>
                          <div className="text-[10px] text-slate-500">Cost: {formatRupee(p.cost_price || 0)}</div>
                        </td>

                        {/* Stock Status Badge */}
                        <td className="p-4 text-center">
                          {getStockStatusBadge(p.stock_qty, p.min_stock_alert)}
                        </td>

                        {/* Actions (Icon Buttons) */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Adjust Stock Button */}
                            <button
                              onClick={() => handleOpenAdjustModal(p)}
                              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 shadow-sm transition-all"
                              title="Add / Adjust Product Stock"
                            >
                              <Layers className="h-4 w-4 text-slate-600 hover:text-emerald-700" />
                            </button>

                            {/* Edit Product Button */}
                            <Link
                              href="/products"
                              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-sm transition-all"
                              title="Edit Product Details"
                            >
                              <Pencil className="h-4 w-4 text-slate-600" />
                            </Link>

                            {/* View Stock Movements Button */}
                            <button
                              onClick={() => {
                                setSelectedProduct(p);
                                setActiveTab('MOVEMENTS');
                              }}
                              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 shadow-sm transition-all"
                              title="View Movement History"
                            >
                              <History className="h-4 w-4 text-slate-600 hover:text-purple-700" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              page={prodPage}
              pageSize={pageSize}
              totalCount={prodTotalCount}
              totalPages={prodTotalPages}
              loading={prodLoading}
              onPageChange={(p) => setProdPage(p)}
            />
          </div>
        )}

        {/* TAB 2: STOCK MOVEMENT HISTORY */}
        {activeTab === 'MOVEMENTS' && (
          <div className="space-y-4">
            {selectedProduct && (
              <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-3.5 text-xs font-semibold text-purple-900 flex items-center justify-between">
                <div>Filter by Product: <span className="font-extrabold text-slate-900">{selectedProduct.name}</span></div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 shadow-sm"
                >
                  Clear Filter
                </button>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="p-4">Date & Time</th>
                      <th className="p-4">Product Name</th>
                      <th className="p-4 text-center">Movement Type</th>
                      <th className="p-4 text-right">Quantity Change</th>
                      <th className="p-4 text-center">Previous → New Stock</th>
                      <th className="p-4">Notes / Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                    {movLoading ? (
                      <TableSkeleton columns={6} rows={10} />
                    ) : movements.length === 0 ? (
                      <DataGridEmptyState
                        columns={6}
                        title="No stock movements recorded"
                        description="Stock additions, sales, and manual adjustments will appear here."
                      />
                    ) : (
                      movements.map((m) => {
                        const isPositive = m.quantity_change > 0;
                        const qtyText = isPositive ? `+${m.quantity_change}` : `${m.quantity_change}`;

                        return (
                          <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-4 text-slate-600 font-medium">
                              {formatDate(m.created_at)}
                            </td>

                            <td className="p-4 font-bold text-slate-900">
                              {m.product_name || 'Product'}
                            </td>

                            <td className="p-4 text-center">
                              {getMovementTypeBadge(m.movement_type)}
                            </td>

                            <td className={`p-4 text-right font-black text-sm ${isPositive ? 'text-emerald-700' : 'text-red-600'}`}>
                              {qtyText}
                            </td>

                            <td className="p-4 text-center font-mono font-semibold text-slate-700">
                              {m.previous_stock} → <span className="font-extrabold text-slate-900">{m.new_stock}</span>
                            </td>

                            <td className="p-4 text-slate-600">
                              {m.notes || m.reference_id || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={movPage}
                pageSize={pageSize}
                totalCount={movTotalCount}
                totalPages={movTotalPages}
                loading={movLoading}
                onPageChange={(p) => setMovPage(p)}
              />
            </div>
          </div>
        )}

        {/* TAB 3: NOTIFICATION HISTORY AUDIT LOG */}
        {activeTab === 'NOTIFICATIONS' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="p-4">Sent Date & Time</th>
                      <th className="p-4">Product Name</th>
                      <th className="p-4 text-center">Alert Type</th>
                      <th className="p-4 text-center">Channel</th>
                      <th className="p-4 font-mono">Recipient Phone</th>
                      <th className="p-4 text-center">Delivery Status</th>
                      <th className="p-4">Message Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                    {notifLoading ? (
                      <TableSkeleton columns={7} rows={10} />
                    ) : notifLogs.length === 0 ? (
                      <DataGridEmptyState
                        columns={7}
                        title="No notification logs recorded"
                        description="SMS and WhatsApp low stock and out of stock alert logs will appear here."
                      />
                    ) : (
                      notifLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 text-slate-600 font-medium whitespace-nowrap">
                            {formatDate(log.sent_at)}
                          </td>

                          <td className="p-4 font-bold text-slate-900">
                            {log.product_name || 'Product'}
                          </td>

                          <td className="p-4 text-center">
                            {log.alert_type === 'OUT_OF_STOCK' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-black text-red-800 border border-red-300">
                                🚨 OUT OF STOCK
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-900 border border-amber-300">
                                ⚠️ LOW STOCK
                              </span>
                            )}
                          </td>

                          <td className="p-4 text-center">
                            {log.channel === 'WHATSAPP' ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 border border-emerald-200">
                                <Send className="h-3 w-3 text-emerald-600" /> WhatsApp
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold text-blue-800 border border-blue-200">
                                <MessageSquare className="h-3 w-3 text-blue-600" /> SMS Text
                              </span>
                            )}
                          </td>

                          <td className="p-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {log.recipient_phone}
                          </td>

                          <td className="p-4 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {log.status}
                            </span>
                          </td>

                          <td className="p-4 text-slate-600 font-mono text-[11px] max-w-xs truncate" title={log.message_body}>
                            {log.message_body}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={notifPage}
                pageSize={pageSize}
                totalCount={notifTotalCount}
                totalPages={notifTotalPages}
                loading={notifLoading}
                onPageChange={(p) => setNotifPage(p)}
              />
            </div>
          </div>
        )}
      </div>

      {/* STOCK ADJUSTMENT MODAL */}
      {showAdjustModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-emerald-600" /> Stock Adjustment
              </h2>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="rounded-full bg-slate-100 p-1 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-slate-100 p-3.5 text-xs font-medium text-slate-800 border border-slate-200 space-y-1">
              <div>Product: <span className="font-extrabold text-slate-900">{selectedProduct.name}</span></div>
              <div>Current Stock: <span className="font-extrabold text-emerald-700">{selectedProduct.stock_qty} {selectedProduct.unit || 'Pcs'}</span></div>
            </div>

            <form onSubmit={handleProcessStockAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adjustment Action</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustMode('ADD')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 ${
                      adjustMode === 'ADD'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Stock
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustMode('REDUCE')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 ${
                      adjustMode === 'REDUCE'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Minus className="h-3.5 w-3.5" /> Reduce Stock
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustMode('SET')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1 ${
                      adjustMode === 'SET'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" /> Set Stock
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {adjustMode === 'SET' ? 'Target Stock Quantity' : 'Quantity to ' + (adjustMode === 'ADD' ? 'Add' : 'Reduce')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-base font-black text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Category</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white font-semibold focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Supplier Purchase">Supplier Purchase</option>
                  <option value="Damaged Goods">Damaged Goods</option>
                  <option value="Manual Correction">Manual Correction</option>
                  <option value="Return Adjustment">Return Adjustment</option>
                  <option value="Cancelled Sale Restock">Cancelled Sale Restock</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Optional Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Received batch #9012"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="w-1/2 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Confirm Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
