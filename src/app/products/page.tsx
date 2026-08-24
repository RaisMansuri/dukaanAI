'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { ApiService } from '@/services/api';
import { formatRupee } from '@/lib/utils';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Edit2,
  Trash2,
  Barcode,
  Save,
  X,
  TrendingUp,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Product, UnitType } from '@/types/database';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  const [showStockModal, setShowStockModal] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState<number>(10);
  const [adjustmentType, setAdjustmentType] = useState<'IN' | 'OUT'>('IN');
  const [stockReason, setStockReason] = useState('New stock arrived from distributor');

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
    const handleUpdate = () => loadProducts();
    window.addEventListener('dukaan_storage_update', handleUpdate);
    return () => window.removeEventListener('dukaan_storage_update', handleUpdate);
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    setErrorMsg(null);
    const { data, error } = await ApiService.getProducts();
    if (error) setErrorMsg(error);
    setProducts(data);
    setLoading(false);
  };

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
    if (!editingProduct?.name || !editingProduct?.price) {
      alert('Product Name and Selling Price are required!');
      return;
    }

    await ApiService.saveProduct(editingProduct as any);
    setShowProductModal(false);
    setEditingProduct(null);
    loadProducts();
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

    await ApiService.recordStockMovement(
      stockProduct.id,
      adjustmentType,
      stockAdjustment,
      stockReason
    );
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
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                        <span>Loading Supabase products inventory...</span>
                      </div>
                    </td>
                  </tr>
                ) : errorMsg ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-amber-800 bg-amber-50">
                      <div className="flex flex-col items-center gap-2">
                        <AlertTriangle className="h-6 w-6 text-amber-600" />
                        <span className="font-bold">Supabase Query Error: {errorMsg}</span>
                        <button
                          onClick={loadProducts}
                          className="mt-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-amber-700"
                        >
                          Retry Query
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                          <Package className="h-7 w-7" />
                        </div>
                        <div>
                          <div className="font-bold text-base text-slate-900">No Products Found in Supabase</div>
                          <div className="text-xs text-slate-500 mt-1 max-w-sm">
                            Your Supabase <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-mono">products</code> table is currently empty.
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
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
                            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
                          >
                            <Plus className="h-4 w-4" /> Add First Product
                          </button>

                          <button
                            onClick={handleSeedProducts}
                            className="flex items-center gap-2 rounded-xl border border-amber-400 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900 shadow-sm hover:bg-amber-100"
                          >
                            <Sparkles className="h-4 w-4 text-amber-600" /> Seed Sample Kirana Items
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No products found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
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
                              className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                                isLow
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-50 text-emerald-800'
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
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Edit2 className="h-4 w-4" />
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
                    required
                    value={editingProduct.price || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cost / Purchase Price (₹)</label>
                  <input
                    type="number"
                    value={editingProduct.cost_price || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, cost_price: Number(e.target.value) })}
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
                    value={editingProduct.stock_qty || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock_qty: Number(e.target.value) })}
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
                  onClick={() => setShowProductModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
                >
                  <Save className="h-4 w-4" /> Save Product
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
