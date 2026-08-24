'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { ApiService } from '@/services/api';
import { formatRupee, calculateGST } from '@/lib/utils';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Clock,
  QrCode,
  CreditCard,
  Banknote,
  AlertCircle,
  Printer,
  Sparkles,
  Users,
  X,
  Zap,
  Package,
} from 'lucide-react';
import { Product, Customer, PaymentMode, Invoice, HeldBill } from '@/types/database';

interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // Flat discount per item in ₹
}

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [notes, setNotes] = useState('');

  // UI Modals & Drawers
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [showHeldDrawer, setShowHeldDrawer] = useState(false);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPosData();
    const handleUpdate = () => loadPosData();
    window.addEventListener('dukaan_storage_update', handleUpdate);
    return () => window.removeEventListener('dukaan_storage_update', handleUpdate);
  }, []);

  const loadPosData = async () => {
    setLoadingProducts(true);
    setProductsError(null);

    const { data: prods, error: pErr } = await ApiService.getProducts();
    const custs = await ApiService.getCustomers();
    const held = await ApiService.getHeldBills();

    if (pErr) {
      setProductsError(pErr);
    }

    setProducts(prods);
    setCustomers(custs);
    setHeldBills(held);

    const cats = Array.from(new Set(prods.map((p) => p.category)));
    setCategories(cats);
    setLoadingProducts(false);
  };

  const handleSeedProducts = async () => {
    setLoadingProducts(true);
    try {
      await ApiService.seedProductsToSupabase();
      await loadPosData();
      alert('Sample Kirana products seeded to Supabase successfully!');
    } catch (e: any) {
      alert('Failed to seed products: ' + e.message);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Barcode Scanner Handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = products.find(
      (p) => p.barcode === barcodeInput.trim() || p.barcode.endsWith(barcodeInput.trim())
    );

    if (matched) {
      addToCart(matched);
      setBarcodeInput('');
    } else {
      alert(`No product found matching barcode: ${barcodeInput}`);
    }
  };

  // Cart Operations
  const addToCart = (product: Product) => {
    if (product.stock_qty <= 0) {
      alert(`"${product.name}" is out of stock!`);
      return;
    }

    setCart((prev) => {
      const index = prev.findIndex((item) => item.product.id === product.id);
      if (index !== -1) {
        const existing = prev[index];
        if (existing.quantity >= product.stock_qty) {
          alert(`Cannot add more than available stock (${product.stock_qty})`);
          return prev;
        }
        const updated = [...prev];
        updated[index] = { ...existing, quantity: existing.quantity + 1 };
        return updated;
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  };

  const updateQuantity = (productId: string, newQty: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (newQty > product.stock_qty) {
      alert(`Available stock is only ${product.stock_qty}`);
      return;
    }

    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity: newQty } : item))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity - item.discount, 0);
  const totalGst = cart.reduce((sum, item) => {
    const lineTotal = item.product.price * item.quantity - item.discount;
    const { gstAmount } = calculateGST(lineTotal, 1, item.product.gst_rate);
    return sum + gstAmount;
  }, 0);

  const grandTotal = Math.max(0, Math.round(subtotal - globalDiscount));

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Complete Sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert('POS Cart is empty! Add products to proceed.');
      return;
    }

    if (paymentMode === 'CREDIT' && !selectedCustomerId) {
      alert('Please select a customer for Credit (Udhar) sale!');
      return;
    }

    if (paymentMode === 'UPI' && !showUpiModal) {
      setShowUpiModal(true);
      return;
    }

    setLoading(true);
    try {
      const inv = await ApiService.createInvoice({
        customerId: selectedCustomerId || null,
        customerName: selectedCustomer?.name,
        customerPhone: selectedCustomer?.phone,
        items: cart,
        discountAmount: globalDiscount,
        paymentMode,
        notes,
      });

      setCreatedInvoice(inv);
      setCart([]);
      setGlobalDiscount(0);
      setSelectedCustomerId('');
      setNotes('');
      setShowUpiModal(false);
    } catch (e) {
      console.error(e);
      alert('Failed to complete sale. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Hold Bill
  const handleHoldBill = async () => {
    if (cart.length === 0) return;
    await ApiService.holdBill({
      customerId: selectedCustomerId || null,
      customerName: selectedCustomer?.name || 'Walk-in Customer',
      items: cart,
      notes,
    });
    setCart([]);
    setSelectedCustomerId('');
    setNotes('');
    alert('Bill saved to Held Bills list!');
  };

  const handleResumeBill = async (held: HeldBill) => {
    setCart(held.items);
    setSelectedCustomerId(held.customer_id || '');
    await ApiService.deleteHeldBill(held.id);
    setShowHeldDrawer(false);
  };

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.name_hindi && p.name_hindi.includes(searchTerm)) ||
      p.barcode.includes(searchTerm);
    return matchesCat && matchesSearch;
  });

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)]">
        {/* LEFT COLUMN: Product Catalog & Search (60% width on Desktop) */}
        <div className="flex-1 flex flex-col space-y-4 min-w-0">
          {/* Search Bar & Barcode Scanner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            {/* Product Name Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search product name or Hindi label..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Barcode Scanner Input */}
            <form onSubmit={handleBarcodeSubmit} className="relative">
              <Barcode className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan / Type Barcode (e.g. 8906007280012)"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full rounded-xl border border-amber-300 bg-amber-50/40 py-2 pl-9 pr-14 text-sm font-mono text-slate-900 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-700"
              >
                Scan
              </button>
            </form>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Items ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {loadingProducts ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="h-32 rounded-2xl bg-white p-4 animate-pulse border border-slate-200 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="h-3 w-16 bg-slate-200 rounded" />
                      <div className="h-4 w-28 bg-slate-200 rounded" />
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <div className="h-4 w-12 bg-slate-200 rounded" />
                      <div className="h-7 w-7 bg-slate-200 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : productsError ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-8 bg-amber-50/60 rounded-3xl border border-amber-200">
                <AlertCircle className="h-10 w-10 text-amber-600 mb-2" />
                <h3 className="text-base font-bold text-amber-900 mb-1">Supabase Connection Notice</h3>
                <p className="text-xs text-amber-800 max-w-md mb-4">{productsError}</p>
                <button
                  onClick={loadPosData}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-amber-700"
                >
                  Retry Connection
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-center p-8 bg-white rounded-3xl border border-dashed border-slate-300">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3 shadow-sm">
                  <Package className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">No Products in Supabase Inventory</h3>
                <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
                  Your Supabase <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700">products</code> table is empty. Add your first product or seed sample Kirana items to get started!
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/products"
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
                  >
                    <Plus className="h-4 w-4" /> Add Your First Product
                  </Link>

                  <button
                    onClick={handleSeedProducts}
                    className="flex items-center gap-2 rounded-xl border border-amber-400 bg-amber-50 px-5 py-2.5 text-xs font-bold text-amber-900 shadow-sm hover:bg-amber-100 active:scale-95 transition-all"
                  >
                    <Sparkles className="h-4 w-4 text-amber-600" /> Seed Sample Kirana Items
                  </button>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-center p-6 bg-white rounded-2xl border border-slate-200 text-slate-400">
                <Search className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs font-medium">No products match your search or filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const inCart = cart.find((item) => item.product.id === product.id);
                  const isOut = product.stock_qty <= 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOut && addToCart(product)}
                      className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 transition-all cursor-pointer bg-white shadow-sm hover:shadow-md ${
                        isOut
                          ? 'opacity-50 cursor-not-allowed border-slate-200'
                          : inCart
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      {inCart && (
                        <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-extrabold text-white">
                          {inCart.quantity}
                        </span>
                      )}

                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {product.category}
                        </div>
                        <div className="font-bold text-xs text-slate-900 line-clamp-2">
                          {product.name}
                        </div>
                        {product.name_hindi && (
                          <div className="text-[11px] text-slate-500 font-medium truncate">
                            {product.name_hindi}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-end justify-between pt-2 border-t border-slate-100">
                        <div>
                          <div className="font-black text-sm text-emerald-700">
                            {formatRupee(product.price)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            GST {product.gst_rate}% &bull; {product.stock_qty} {product.unit}
                          </div>
                        </div>

                        <button
                          disabled={isOut}
                          className={`rounded-lg p-1.5 transition-colors ${
                            isOut
                              ? 'bg-slate-100 text-slate-400'
                              : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                          }`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: POS Cart & Checkout (40% width on Desktop) */}
        <div className="w-full lg:w-96 flex flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-xl justify-between space-y-4">
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Zap className="h-4 w-4 fill-emerald-700" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-900">Current POS Cart</h2>
                <p className="text-[11px] text-slate-500">{cart.length} items selected</p>
              </div>
            </div>

            {/* Held Bills Shortcut */}
            <button
              onClick={() => setShowHeldDrawer(true)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span>Held Bills ({heldBills.length})</span>
            </button>
          </div>

          {/* Customer Selection Dropdown */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-slate-400" /> Customer Account
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Walk-in Customer (Cash Sale)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) - Due: ₹{c.total_due}
                </option>
              ))}
            </select>

            {selectedCustomer && selectedCustomer.total_due > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 border border-amber-200">
                <span>Existing Pending Udhar:</span>
                <span className="font-bold">{formatRupee(selectedCustomer.total_due)}</span>
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-56 pr-1">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                <Barcode className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-xs font-medium">Cart is empty</p>
                <p className="text-[10px] text-slate-400">Click products or scan barcode to add</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200/80"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-bold text-xs text-slate-900 truncate">
                      {item.product.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      ₹{item.product.price} x {item.quantity} = ₹{item.product.price * item.quantity}
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-slate-300 bg-white">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
                      >
                        -
                      </button>
                      <span className="px-2 text-xs font-extrabold text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Discount & Payment Mode Controls */}
          <div className="space-y-3 border-t pt-3">
            {/* Global Discount */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">Bill Discount (₹)</span>
              <input
                type="number"
                min={0}
                value={globalDiscount || ''}
                onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                placeholder="0"
                className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-right text-xs font-bold focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Payment Mode Selector */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Mode
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { mode: 'UPI', label: 'UPI / QR', icon: QrCode },
                  { mode: 'CASH', label: 'Cash', icon: Banknote },
                  { mode: 'CARD', label: 'Card', icon: CreditCard },
                  { mode: 'CREDIT', label: 'Udhar', icon: Users },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = paymentMode === item.mode;
                  return (
                    <button
                      key={item.mode}
                      onClick={() => setPaymentMode(item.mode as PaymentMode)}
                      className={`flex flex-col items-center gap-1 rounded-xl p-2 text-[10px] font-bold transition-all ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Total Math Summary */}
            <div className="rounded-2xl bg-slate-900 p-3.5 text-white space-y-1.5 shadow-inner">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Subtotal ({cart.length} items)</span>
                <span>{formatRupee(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Total GST Included</span>
                <span>{formatRupee(totalGst)}</span>
              </div>
              {globalDiscount > 0 && (
                <div className="flex justify-between text-xs text-amber-400">
                  <span>Discount Off</span>
                  <span>-{formatRupee(globalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-800 pt-2 text-base font-black text-emerald-400">
                <span>Grand Total</span>
                <span>{formatRupee(grandTotal)}</span>
              </div>
            </div>

            {/* Action Buttons: Hold & Complete Sale */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleHoldBill}
                disabled={cart.length === 0}
                className="col-span-1 flex items-center justify-center gap-1 rounded-xl border border-amber-300 bg-amber-50 py-3 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                <Clock className="h-4 w-4" /> Hold
              </button>

              <button
                type="button"
                onClick={handleCompleteSale}
                disabled={cart.length === 0 || loading}
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{loading ? 'Saving...' : 'Complete Sale'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* UPI QR CODE MODAL */}
      {showUpiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-center">
            <div className="font-extrabold text-lg text-slate-900">Scan & Pay via UPI</div>
            <p className="text-xs text-slate-500">Ask customer to scan using Google Pay, PhonePe, or Paytm</p>

            <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500 bg-emerald-50/50 p-4">
              <QrCode className="h-36 w-36 text-emerald-700" />
            </div>

            <div className="text-xl font-black text-slate-900">{formatRupee(grandTotal)}</div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowUpiModal(false)}
                className="w-1/2 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteSale}
                className="w-1/2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
              >
                Payment Received
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HELD BILLS DRAWER */}
      {showHeldDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white p-6 shadow-2xl flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-extrabold text-lg text-slate-900">Held Bills (Drafts)</h2>
              <button
                onClick={() => setShowHeldDrawer(false)}
                className="rounded-full bg-slate-100 p-1 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {heldBills.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No held bills saved right now.
                </div>
              ) : (
                heldBills.map((held) => (
                  <div
                    key={held.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3 bg-slate-50"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">{held.customer_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {held.items.length} items &bull; Saved {new Date(held.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <button
                      onClick={() => handleResumeBill(held)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                    >
                      Resume Cart
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS RECEIPT MODAL */}
      {createdInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h2 className="text-xl font-extrabold text-slate-900">Bill Created Successfully!</h2>
            <p className="text-xs text-slate-500">Invoice #{createdInvoice.invoice_number}</p>

            <div className="rounded-2xl bg-slate-50 p-4 border text-left text-xs space-y-1">
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-bold">{createdInvoice.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="font-bold">{createdInvoice.payment_mode}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-black text-sm text-slate-900">
                <span>Total Amount Paid:</span>
                <span className="text-emerald-600">{formatRupee(createdInvoice.total_amount)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCreatedInvoice(null)}
                className="w-1/2 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Close & Next Sale
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
