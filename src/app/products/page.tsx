'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { ApiService } from '@/services/api';
import { formatRupee } from '@/lib/utils';
import {
  Package,
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  Edit2,
  Pencil,
  Trash2,
  Barcode,
  Save,
  X,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import Pagination from '@/components/common/Pagination';
import { TableSkeleton, DataGridEmptyState, DataGridErrorState } from '@/components/common/GridStateComponents';
import { Product, UnitType, StockMovementType } from '@/types/database';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const [showStockModal, setShowStockModal] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState<number>(10);
  const [adjustmentType, setAdjustmentType] = useState<'IN' | 'OUT'>('IN');
  const [stockReason, setStockReason] = useState('New stock arrived from distributor');

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const loadProducts = async () => {
    setLoading(true);
    setErrorMsg(null);

    // Fetch all for category counts and low stock lists
    const { data: allProds, error } = await ApiService.getProducts();
    if (error) setErrorMsg(error);
    setProducts(allProds);

    // Fetch paginated
    const paginatedRes = await ApiService.getPaginatedProducts({
      page,
      pageSize,
      search: searchTerm,
      category: selectedCategory,
    });

    let resultData = paginatedRes.data;
    if (onlyLowStock) {
      resultData = resultData.filter((p) => p.stock_qty <= p.min_stock_alert);
    }

    setDisplayedProducts(resultData);
    setTotalCount(onlyLowStock ? resultData.length : paginatedRes.totalCount);
    setTotalPages(onlyLowStock ? Math.ceil(resultData.length / pageSize) || 1 : paginatedRes.totalPages);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
    const handleUpdate = () => loadProducts();
    window.addEventListener('dukaan_storage_update', handleUpdate);
    return () => window.removeEventListener('dukaan_storage_update', handleUpdate);
  }, [page, pageSize, searchTerm, selectedCategory, onlyLowStock]);

  const handleSeedProducts = async () => {
    setLoading(true);
    try {
      await ApiService.seedProductsToSupabase();
      await loadProducts();
      alert('Sample Kirana products seeded to Supabase successfully!');
    } catch (e: any) {
      alert('Failed to seed products: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || editingProduct?.price === undefined || editingProduct?.price === null) {
      alert('Product Name and Selling Price are required!');
      return;
    }

    if (Number(editingProduct.stock_qty || 0) < 0) {
      alert('Stock quantity cannot be negative.');
      return;
    }

    if (Number(editingProduct.min_stock_alert || 0) < 0) {
      alert('Minimum stock alert level cannot be negative.');
      return;
    }

    if (Number(editingProduct.price || 0) < 0 || Number(editingProduct.cost_price || 0) < 0) {
      alert('Prices cannot be negative.');
      return;
    }

    console.log('[Dev Log: saveProduct Payload]', editingProduct);
    setIsSavingProduct(true);

    try {
      await ApiService.saveProduct(editingProduct as any);
      setShowProductModal(false);
      setEditingProduct(null);
      await loadProducts();
    } catch (err: any) {
      console.error('[handleSaveProduct Error]', err);
      alert('Failed to save product: ' + (err?.message || 'Database update failed.'));
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" from inventory?`)) {
      await ApiService.deleteProduct(id);
      loadProducts();
    }
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockProduct) return;

    let movType: StockMovementType = 'ADJUSTMENT';
    if (adjustmentType === 'IN') movType = 'STOCK_ADDED';
    else if (adjustmentType === 'OUT') movType = 'STOCK_REDUCED';

    await ApiService.recordStockMovement({
      productId: stockProduct.id,
      movementType: movType,
      quantityChange: stockAdjustment,
      notes: stockReason || 'Stock adjustment',
    });
    setShowStockModal(false);
    setStockProduct(null);
    loadProducts();
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.name_hindi && p.name_hindi.includes(searchTerm)) ||
      p.barcode.includes(searchTerm);
    const matchesLowStock = !onlyLowStock || p.stock_qty <= p.min_stock_alert;
    return matchesCat && matchesSearch && matchesLowStock;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inventory & Products</h1>
            <p className="text-sm text-slate-500">Manage stock quantities, GST rates, and price catalog</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/inventory"
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
            >
              <Boxes className="h-4 w-4 text-emerald-600" /> Stock Ledger
            </Link>

            <button
              onClick={() => {
                setEditingProduct({
                  name: '',
                  name_hindi: '',
                  category: 'Groceries',
                  barcode: Math.floor(1000000000000 + Math.random() * 9000000000000).toString(),
                  price: 100,
                  cost_price: 80,
                  gst_rate: 5,
                  hsn_code: '1902',
                  stock_qty: 20,
                  min_stock_alert: 5,
                  unit: 'Pcs',
                });
                setShowProductModal(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" /> Add New Product
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search product, Hindi name, barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 bg-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="ALL">All Categories ({products.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Low Stock Toggle */}
          <button
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all border ${
              onlyLowStock
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>Low Stock Alert Items Only</span>
          </button>
        </div>

        {/* Products Table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Product Details</th>
                  <th className="p-4">Category</th>
                  <th className="p-4 text-right">Selling Price</th>
                  <th className="p-4 text-center">GST Rate</th>
                  <th className="p-4 text-center">Stock Level</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {loading ? (
                  <TableSkeleton columns={6} rows={10} />
                ) : errorMsg ? (
                  <DataGridErrorState columns={6} error={errorMsg} onRetry={loadProducts} />
                ) : displayedProducts.length === 0 ? (
                  <DataGridEmptyState
                    columns={6}
                    title="No products found"
                    description="Try changing your search query or category filter."
                    actionButton={
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct({
                              name: '',
                              name_hindi: '',
                              category: 'Groceries',
                              barcode: Math.floor(1000000000000 + Math.random() * 9000000000000).toString(),
                              price: 100,
                              cost_price: 80,
                              gst_rate: 5,
                              hsn_code: '1902',
                              stock_qty: 20,
                              min_stock_alert: 5,
                              unit: 'Pcs',
                            });
                            setShowProductModal(true);
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
                        >
                          <Plus className="h-4 w-4" /> Add Product
                        </button>
                        <button
                          type="button"
                          onClick={handleSeedProducts}
                          className="flex items-center gap-1.5 rounded-xl border border-amber-400 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 shadow-sm hover:bg-amber-100"
                        >
                          <Sparkles className="h-4 w-4 text-amber-600" /> Seed Samples
                        </button>
                      </div>
                    }
                  />
                ) : (
                  displayedProducts.map((product) => {
                    const isLow = product.stock_qty <= product.min_stock_alert;
                    return (
                      <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-sm text-slate-900">{product.name}</div>
                          {product.name_hindi && (
                            <div className="text-[11px] text-slate-500">{product.name_hindi}</div>
                          )}
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Barcode className="h-3 w-3" /> {product.barcode} &bull; HSN: {product.hsn_code}
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                            {product.category}
                          </span>
                        </td>

                        <td className="p-4 text-right font-black text-sm text-emerald-700">
                          {formatRupee(product.price)}
                          <div className="text-[10px] text-slate-400 font-normal">
                            Cost: {formatRupee(product.cost_price)}
                          </div>
                        </td>

                        <td className="p-4 text-center font-bold">
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-blue-700">
                            {product.gst_rate}% GST
                          </span>
                        </td>

                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center">
                            <span
                              className={`font-black text-sm ${
                                isLow ? 'text-amber-600' : 'text-slate-900'
                              }`}
                            >
                              {product.stock_qty} {product.unit}
                            </span>
                            {isLow && (
                              <span className="text-[10px] font-bold text-amber-600 mt-0.5 flex items-center gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" /> Low Stock
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setStockProduct(product);
                                setShowStockModal(true);
                              }}
                              className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                            >
                              Adjust Stock
                            </button>

                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setShowProductModal(true);
                              }}
                              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 shadow-sm transition-all"
                              title="Edit Product"
                            >
                              <Pencil className="h-4 w-4 text-slate-600 hover:text-emerald-700" />
                            </button>

                            <button
                              onClick={() => handleDeleteProduct(product.id, product.name)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* ADD / EDIT PRODUCT MODAL */}
      {showProductModal && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-extrabold text-lg text-slate-900">
                {editingProduct.id ? 'Edit Product Details' : 'Add New Inventory Item'}
              </h2>
              <button
                onClick={() => setShowProductModal(false)}
                className="rounded-full bg-slate-100 p-1 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">English Product Name *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hindi Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="टाटा नमक"
                    value={editingProduct.name_hindi || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name_hindi: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editingProduct.category || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={editingProduct.barcode || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={editingProduct.price === 0 && editingProduct.price !== undefined ? 0 : (editingProduct.price ?? '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingProduct({ ...editingProduct, price: val === '' ? 0 : Number(val) });
                    }}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cost / Purchase Price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editingProduct.cost_price === 0 && editingProduct.cost_price !== undefined ? 0 : (editingProduct.cost_price ?? '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingProduct({ ...editingProduct, cost_price: val === '' ? 0 : Number(val) });
                    }}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                  <select
                    value={editingProduct.gst_rate || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, gst_rate: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value={0}>0% GST</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={editingProduct.hsn_code || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, hsn_code: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editingProduct.stock_qty === 0 && editingProduct.stock_qty !== undefined ? 0 : (editingProduct.stock_qty ?? '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingProduct({ ...editingProduct, stock_qty: val === '' ? 0 : Number(val) });
                    }}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Type</label>
                  <select
                    value={editingProduct.unit || 'Pcs'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value as UnitType })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs bg-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Kg">Kg</option>
                    <option value="Gm">Gm</option>
                    <option value="Ltr">Ltr</option>
                    <option value="Ml">Ml</option>
                    <option value="Pack">Pack</option>
                    <option value="Box">Box</option>
                    <option value="Bottle">Bottle</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  disabled={isSavingProduct}
                  onClick={() => setShowProductModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSavingProduct ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Save Product
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {showStockModal && stockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <h2 className="font-extrabold text-base text-slate-900">
              Update Stock Level: {stockProduct.name}
            </h2>

            <form onSubmit={handleSaveStock} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('IN')}
                    className={`p-2 rounded-xl font-bold ${
                      adjustmentType === 'IN' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    + Add Stock (IN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('OUT')}
                    className={`p-2 rounded-xl font-bold ${
                      adjustmentType === 'OUT' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    - Remove Stock (OUT)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={stockAdjustment}
                  onChange={(e) => setStockAdjustment(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Note</label>
                <input
                  type="text"
                  required
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="w-1/2 rounded-xl border border-slate-300 py-2 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
