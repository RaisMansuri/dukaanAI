'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { CardSkeleton } from '@/components/common/GridStateComponents';
import { ApiService } from '@/services/api';
import { formatRupee, calculateGST, formatDate, generateInvoiceNumber } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
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
  const { shop } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Cart & Customer State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [notes, setNotes] = useState('');

  // POS Quick Add Customer Modal
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  const [quickCustEmail, setQuickCustEmail] = useState('');
  const [quickCustAddress, setQuickCustAddress] = useState('');
  const [quickCustGstin, setQuickCustGstin] = useState('');
  const [quickAddError, setQuickAddError] = useState<string | null>(null);

  // UI Modals & Drawers
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiTimer, setUpiTimer] = useState<number>(60);
  const [upiStatus, setUpiStatus] = useState<'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED'>('PENDING');
  const [upiUtrNumber, setUpiUtrNumber] = useState('');
  const [upiSessionId, setUpiSessionId] = useState('');
  const [isProcessingUpi, setIsProcessingUpi] = useState(false);
  const [copiedUpiId, setCopiedUpiId] = useState(false);

  const [showCardModal, setShowCardModal] = useState(false);
  const [cardRefNumber, setCardRefNumber] = useState('');
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [showHeldDrawer, setShowHeldDrawer] = useState(false);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showUpiModal && upiStatus === 'PENDING') {
      interval = setInterval(() => {
        setUpiTimer((prev) => {
          if (prev <= 1) {
            setUpiStatus('EXPIRED');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showUpiModal, upiStatus]);

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

  // GST-Inclusive Math Calculations
  const grossTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity - item.discount, 0);

  const taxableSubtotal = cart.reduce((sum, item) => {
    const lineTotal = item.product.price * item.quantity - item.discount;
    const { taxableAmount } = calculateGST(lineTotal, 1, item.product.gst_rate);
    return sum + taxableAmount;
  }, 0);

  const totalGst = cart.reduce((sum, item) => {
    const lineTotal = item.product.price * item.quantity - item.discount;
    const { gstAmount } = calculateGST(lineTotal, 1, item.product.gst_rate);
    return sum + gstAmount;
  }, 0);

  const grandTotal = Math.max(0, Math.round(grossTotal - globalDiscount));

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // UPI QR Workflow Helpers
  const handleResetUpiSession = () => {
    setUpiSessionId(generateInvoiceNumber('INV'));
    setUpiTimer(60);
    setUpiStatus('PENDING');
    setUpiUtrNumber('');
  };

  const handleCancelUpi = () => {
    setShowUpiModal(false);
    setUpiStatus('CANCELLED');
    setUpiUtrNumber('');
    setUpiTimer(60);
  };

  const handleConfirmUpiPayment = async () => {
    if (upiStatus === 'EXPIRED') {
      alert('Payment session has expired. Please click "Generate New QR" to start a new session.');
      return;
    }
    setIsProcessingUpi(true);
    try {
      setUpiStatus('CONFIRMED');
      await executeSale(upiUtrNumber);
    } catch (err: any) {
      console.error('[UPI Payment Error]', err);
      alert('Failed to confirm UPI sale: ' + (err.message || 'Unknown database error'));
      setUpiStatus('PENDING');
    } finally {
      setIsProcessingUpi(false);
    }
  };

  // Customer Quick Add Handler
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustName.trim() || !quickCustPhone.trim()) {
      setQuickAddError('Customer Name and Mobile Number are required.');
      return;
    }
    setQuickAddError(null);
    try {
      const newCust = await ApiService.saveCustomer({
        name: quickCustName.trim(),
        phone: quickCustPhone.trim(),
        email: quickCustEmail.trim(),
        address: quickCustAddress.trim(),
        gstin: quickCustGstin.trim(),
        credit_limit: 5000,
      });

      const freshCusts = await ApiService.getCustomers();
      setCustomers(freshCusts);

      setSelectedCustomerId(newCust.id);
      setCustomerPhone(newCust.phone ? newCust.phone.replace(/\D/g, '').slice(-10) : '');
      setCustomerName(newCust.name);
      setIsExistingCustomer(true);
      setIsNewCustomer(false);

      setShowQuickAddCustomer(false);
      setQuickCustName('');
      setQuickCustPhone('');
      setQuickCustEmail('');
      setQuickCustAddress('');
      setQuickCustGstin('');
    } catch (err: any) {
      setQuickAddError(err?.message || 'Failed to add customer');
    }
  };

  // Customer Search & Selection Handlers
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 10);
    setCustomerPhone(raw);

    if (raw.length === 10) {
      const matched = customers.find(
        (c) => c.phone && (c.phone.endsWith(raw) || c.phone.replace(/\D/g, '').endsWith(raw))
      );
      if (matched) {
        setSelectedCustomerId(matched.id);
        setCustomerName(matched.name);
        setIsExistingCustomer(true);
        setIsNewCustomer(false);
      } else {
        setSelectedCustomerId('');
        setIsExistingCustomer(false);
        setIsNewCustomer(true);
      }
    } else {
      if (isExistingCustomer) {
        setSelectedCustomerId('');
        setCustomerName('');
        setIsExistingCustomer(false);
        setIsNewCustomer(false);
      } else {
        setIsNewCustomer(false);
      }
    }
  };

  const handleSelectCustomerDropdown = (id: string) => {
    setSelectedCustomerId(id);
    if (!id) {
      setCustomerPhone('');
      setCustomerName('');
      setIsExistingCustomer(false);
      setIsNewCustomer(false);
      return;
    }
    const cust = customers.find((c) => c.id === id);
    if (cust) {
      const cleanPhone = cust.phone ? cust.phone.replace(/\D/g, '').slice(-10) : '';
      setCustomerPhone(cleanPhone);
      setCustomerName(cust.name);
      setIsExistingCustomer(true);
      setIsNewCustomer(false);
    }
  };

  // Complete Sale Logic
  const handleCompleteSale = async () => {
    if (loading) return;
    if (cart.length === 0) {
      alert('POS Cart is empty! Add products to proceed.');
      return;
    }

    // Udhar (Credit) Payment Validation: Mobile number is MANDATORY!
    if (paymentMode === 'CREDIT') {
      const cleanPhone = customerPhone.replace(/\D/g, '');
      if (!selectedCustomerId && cleanPhone.length < 10) {
        alert('Mobile number is required for Udhar customers.');
        return;
      }
    }

    if (paymentMode === 'UPI' && !showUpiModal) {
      handleResetUpiSession();
      setShowUpiModal(true);
      return;
    }

    if (paymentMode === 'CARD' && !showCardModal) {
      setCardRefNumber('');
      setShowCardModal(true);
      return;
    }

    await executeSale();
  };

  const executeSale = async (referenceNo?: string) => {
    setLoading(true);
    try {
      let activeCustomerId = selectedCustomerId || null;
      let activeCustomerName = customerName.trim() || selectedCustomer?.name || 'Walk-in Customer';
      let activeCustomerPhone = customerPhone.trim();

      // If a 10-digit mobile number was entered for a new customer, save customer first
      if (!activeCustomerId && activeCustomerPhone.replace(/\D/g, '').length === 10) {
        try {
          const newCust = await ApiService.saveCustomer({
            name: customerName.trim() || `Customer ${activeCustomerPhone}`,
            phone: activeCustomerPhone,
            credit_limit: 5000,
          });
          activeCustomerId = newCust.id;
          activeCustomerName = newCust.name;

          // Refresh customers list
          const freshCusts = await ApiService.getCustomers();
          setCustomers(freshCusts);
        } catch (err: any) {
          console.warn('[Auto Save Customer Exception]', err);
        }
      }

      const inv = await ApiService.createInvoice({
        customerId: activeCustomerId,
        customerName: activeCustomerName,
        customerPhone: activeCustomerPhone,
        items: cart,
        discountAmount: globalDiscount,
        paymentMode,
        referenceNo,
        notes,
      });

      setCreatedInvoice(inv);
      setCart([]);
      setGlobalDiscount(0);
      setSelectedCustomerId('');
      setCustomerPhone('');
      setCustomerName('');
      setIsExistingCustomer(false);
      setIsNewCustomer(false);
      setNotes('');
      setShowUpiModal(false);
      setShowCardModal(false);
      setCardRefNumber('');
    } catch (e: any) {
      console.error('[POS executeSale Error]', e);
      alert('Failed to complete sale: ' + (e.message || 'Unknown database error'));
    } finally {
      setLoading(false);
      setIsProcessingUpi(false);
      setIsProcessingCard(false);
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
      <div className="flex flex-col lg:flex-row gap-6 min-h-0 lg:h-[calc(100vh-7.5rem)] pb-12 lg:pb-0">
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
              <CardSkeleton count={8} />
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
                          {product.stock_qty === 0 ? (
                            <span className="inline-block mt-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-black text-red-800">
                              OUT OF STOCK
                            </span>
                          ) : product.stock_qty <= product.min_stock_alert ? (
                            <span className="inline-block mt-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-900">
                              Only {product.stock_qty} left!
                            </span>
                          ) : null}
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

          {/* Customer Selection & Mobile Number Section */}
          <div className="space-y-2 border-b pb-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-slate-400" /> Customer Account
                </label>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickCustName('');
                      setQuickCustPhone('');
                      setQuickCustEmail('');
                      setQuickCustAddress('');
                      setQuickCustGstin('');
                      setQuickAddError(null);
                      setShowQuickAddCustomer(true);
                    }}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition-all flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Quick Add
                  </button>

                  {isExistingCustomer && (
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Found
                    </span>
                  )}
                  {isNewCustomer && (
                    <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      + New Customer
                    </span>
                  )}
                </div>
              </div>

              <select
                value={selectedCustomerId}
                onChange={(e) => handleSelectCustomerDropdown(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Walk-in Customer (Cash Sale)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) - Due: ₹{c.total_due}
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile Number & Customer Name Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-600">Mobile Number</label>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-xs font-bold text-slate-400">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10 digit mobile"
                    value={customerPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-1.5 pl-9 pr-2 text-xs font-mono font-medium focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-600">Customer Name</label>
                <input
                  type="text"
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  readOnly={isExistingCustomer}
                  className={`w-full rounded-xl border py-1.5 px-2.5 text-xs font-medium focus:outline-none ${
                    isExistingCustomer
                      ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                      : 'border-slate-300 focus:border-emerald-500 bg-white'
                  }`}
                />
              </div>
            </div>

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
                <span>Taxable Value ({cart.length} items)</span>
                <span>{formatRupee(taxableSubtotal)}</span>
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

      {/* ENHANCED COMPACT DYNAMIC UPI QR PAYMENT MODAL */}
      {showUpiModal && (() => {
        const merchantName = (shop as any)?.name || 'KM Super Market';
        const upiId = (shop as any)?.upi_id || 'kmsupermarket@upi';
        const currentRef = upiSessionId || 'INV-POS-SALE';
        const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(currentRef)}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;

        const formatTimer = (seconds: number) => {
          const mins = Math.floor(seconds / 60);
          const secs = seconds % 60;
          return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-4 sm:p-5 shadow-2xl space-y-3 text-left border border-slate-100 max-h-[90dvh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Pay via UPI / QR Code</h3>
                    <p className="text-[11px] text-slate-500">Google Pay, PhonePe, Paytm, BHIM</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelUpi}
                  disabled={isProcessingUpi}
                  className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* QR Code Container with Compact Timer Below */}
              <div className="relative mx-auto flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-center">
                {upiStatus === 'EXPIRED' ? (
                  <div className="flex h-44 w-44 flex-col items-center justify-center space-y-2 rounded-xl bg-slate-100 text-center p-3">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                    <span className="text-xs font-bold text-slate-700">QR Expired</span>
                    <button
                      type="button"
                      onClick={handleResetUpiSession}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all"
                    >
                      Refresh QR
                    </button>
                  </div>
                ) : (
                  <>
                    <img
                      src={qrCodeUrl}
                      alt="UPI Payment QR Code"
                      className="h-44 w-44 rounded-xl bg-white p-1.5 shadow-sm border border-slate-200"
                    />
                    <p className="mt-1 text-[11px] font-semibold text-slate-600">
                      Scan with any UPI App to pay
                    </p>
                  </>
                )}

                {/* Compact Timer Directly Below QR Instructions */}
                <div className="mt-1 flex items-center justify-center gap-1 text-xs">
                  {upiStatus === 'EXPIRED' ? (
                    <div className="flex items-center gap-1.5 text-red-600 font-bold">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>QR Expired</span>
                      <button
                        type="button"
                        onClick={handleResetUpiSession}
                        className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700 transition-all ml-1"
                      >
                        Refresh QR
                      </button>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-1 font-semibold ${
                      upiTimer <= 15 ? 'text-red-600 font-extrabold animate-pulse' : 'text-slate-500'
                    }`}>
                      <Clock className="h-3.5 w-3.5" />
                      <span>Expires in <span className="font-mono font-bold">{formatTimer(upiTimer)}</span></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Destination Details */}
              <div className="rounded-xl bg-slate-900 px-3.5 py-2.5 text-white space-y-1.5 shadow-inner text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Paying To:</span>
                  <span className="font-extrabold text-white">{merchantName}</span>
                </div>

                <div className="flex justify-between items-center border-t border-slate-800 pt-1.5 text-slate-300">
                  <span>UPI ID:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-400 text-xs">
                    <span>{upiId}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(upiId);
                        setCopiedUpiId(true);
                        setTimeout(() => setCopiedUpiId(false), 2000);
                      }}
                      className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700 transition-all"
                    >
                      {copiedUpiId ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-800 pt-1.5 font-bold text-slate-300">
                  <span>Payable Amount:</span>
                  <span className="text-base font-black text-emerald-400">{formatRupee(grandTotal)}</span>
                </div>
              </div>

              {/* Cashier Payment Confirmation Section */}
              <div className="space-y-2 border-t pt-2.5">
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="UPI Transaction ID / UTR Number (Optional)"
                    value={upiUtrNumber}
                    onChange={(e) => setUpiUtrNumber(e.target.value)}
                    disabled={upiStatus === 'EXPIRED' || isProcessingUpi}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition-all"
                  />
                </div>

                <div className="flex gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleCancelUpi}
                    disabled={isProcessingUpi}
                    className="w-1/3 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmUpiPayment}
                    disabled={upiStatus === 'EXPIRED' || isProcessingUpi}
                    className="w-2/3 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    {isProcessingUpi ? (
                      <span>Confirming...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Confirm Payment</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* MANUAL CARD PAYMENT CONFIRMATION MODAL */}
      {showCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 text-left border border-slate-100 max-h-[90dvh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Confirm Card Payment</h3>
                  <p className="text-xs text-slate-500">Physical POS Terminal Transaction</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCardModal(false)}
                disabled={isProcessingCard}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Total Amount Container */}
            <div className="rounded-2xl bg-slate-900 p-4 text-white space-y-1 shadow-inner">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Card Payment Amount</div>
              <div className="text-2xl font-black text-emerald-400">{formatRupee(grandTotal)}</div>
            </div>

            {/* Status Instructions */}
            <div className="rounded-xl bg-amber-50 p-3 border border-amber-200/60 text-amber-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Physical Machine Notice:</span>
                <span>Please collect payment using your physical card machine / POS terminal before confirming.</span>
              </div>
            </div>

            {/* Reference Number Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Transaction / Reference Number <span className="font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="Enter card terminal reference number"
                value={cardRefNumber}
                onChange={(e) => setCardRefNumber(e.target.value)}
                disabled={isProcessingCard}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCardModal(false)}
                disabled={isProcessingCard}
                className="w-1/2 rounded-xl border border-slate-300 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingCard}
                onClick={async () => {
                  setIsProcessingCard(true);
                  await executeSale(cardRefNumber);
                }}
                className="w-1/2 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {isProcessingCard ? (
                  <span>Recording...</span>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>✓ Confirm Payment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS RECEIPT MODAL */}
      {createdInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 no-print">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h2 className="text-xl font-extrabold text-slate-900 no-print">Bill Created Successfully!</h2>
            <p className="text-xs text-slate-500 no-print">Invoice #{createdInvoice.invoice_number}</p>

            {/* Printable Receipt Container */}
            <div id="printable-receipt" className="rounded-2xl bg-slate-50 p-4 border text-left text-xs space-y-3">
              <div className="text-center space-y-0.5 border-b pb-2">
                <div className="font-extrabold text-base text-slate-900">{(shop as any)?.name || 'Shree Ganesh Super Market'}</div>
                <div>{(shop as any)?.address || 'Main Market Road, Andheri West, Mumbai'}</div>
                <div>GSTIN: {(shop as any)?.gst_number || '27AAACG1234F1Z5'} &bull; Ph: {(shop as any)?.phone || '+91 98200 12345'}</div>
              </div>

              <div className="flex justify-between border-b pb-2 text-[11px]">
                <div>
                  <div><span className="font-bold">Invoice #:</span> {createdInvoice.invoice_number}</div>
                  <div><span className="font-bold">Customer:</span> {createdInvoice.customer_name || 'Walk-in Customer'}</div>
                </div>
                <div className="text-right">
                  <div><span className="font-bold">Date:</span> {formatDate(createdInvoice.created_at)}</div>
                  <div><span className="font-bold">Mode:</span> {createdInvoice.payment_mode || 'CASH'}</div>
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
                  {createdInvoice.items?.map((item) => {
                    const lineTotal = item.total ?? (item.quantity * item.unit_price);
                    return (
                      <tr key={item.id}>
                        <td className="py-1 max-w-[140px] truncate">{item.product_name}</td>
                        <td className="py-1 text-center">{item.quantity}</td>
                        <td className="py-1 text-right">{formatRupee(item.unit_price)}</td>
                        <td className="py-1 text-right font-bold">{formatRupee(lineTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="border-t pt-2 space-y-1 text-right font-semibold">
                <div className="flex justify-between">
                  <span>Taxable Value:</span>
                  <span>{formatRupee(createdInvoice.subtotal)}</span>
                </div>
                {createdInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Discount:</span>
                    <span>-{formatRupee(createdInvoice.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>GST Included:</span>
                  <span>{formatRupee(createdInvoice.gst_amount || 0)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-black text-sm text-slate-900">
                  <span>Total Payable:</span>
                  <span>{formatRupee(createdInvoice.total_amount)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 no-print">
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

      {/* POS QUICK ADD CUSTOMER MODAL */}
      {showQuickAddCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" /> Quick Register Customer
              </h2>
              <button
                onClick={() => setShowQuickAddCustomer(false)}
                className="rounded-full bg-slate-100 p-1 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {quickAddError && (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-800 border border-red-200 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>{quickAddError}</div>
              </div>
            )}

            <form onSubmit={handleQuickAddCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Sharma"
                  value={quickCustName}
                  onChange={(e) => setQuickCustName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  maxLength={15}
                  placeholder="10-digit Indian mobile number"
                  value={quickCustPhone}
                  onChange={(e) => setQuickCustPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={quickCustEmail}
                  onChange={(e) => setQuickCustEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="27AAAAA0000A1Z5"
                    value={quickCustGstin}
                    onChange={(e) => setQuickCustGstin(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono uppercase focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Address (Optional)</label>
                  <input
                    type="text"
                    placeholder="Area / Locality"
                    value={quickCustAddress}
                    onChange={(e) => setQuickCustAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowQuickAddCustomer(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
                >
                  Add & Select Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
