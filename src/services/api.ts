import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { Storage } from './storage';
import {
  Shop,
  GstSettings,
  Product,
  Customer,
  Invoice,
  Payment,
  StockMovement,
  HeldBill,
  PaymentMode,
  StockMovementType,
} from '@/types/database';
import { generateInvoiceNumber, generateUuid, isValidUuid } from '@/lib/utils';
import { INITIAL_SHOP, INITIAL_GST_SETTINGS, INITIAL_PRODUCTS } from './mockData';

const DEFAULT_SHOP_ID = 'a1b2c3d4-e5f6-47a8-b901-c2d3e4f5a6b7';

export const ApiService = {
  // --- SHOP & GST ---
  async getShop(): Promise<Shop> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('shops').select('*').limit(1).maybeSingle();
        if (!error && data && isValidUuid(data.id)) return data as Shop;

        if (!data) {
          const newShop: Shop = {
            ...INITIAL_SHOP,
            id: DEFAULT_SHOP_ID,
          };
          const { error: insertErr } = await supabase.from('shops').insert({
            id: newShop.id,
            shop_name: newShop.name,
            address: newShop.address,
            phone: newShop.phone,
          });
          if (!insertErr) return newShop;
        }
      } catch (err) {
        console.warn('[Supabase Shop Fetch Exception]', err);
      }
    }
    return { ...Storage.getShop(), id: DEFAULT_SHOP_ID };
  },

  async updateShop(shop: Partial<Shop>): Promise<Shop> {
    const current = await this.getShop();
    const updated = { ...current, ...shop };
    if (isSupabaseConfigured() && isValidUuid(current.id)) {
      await supabase.from('shops').update({
        shop_name: updated.name,
        address: updated.address,
        phone: updated.phone,
      }).eq('id', current.id);
    }
    Storage.setShop(updated);
    return updated;
  },

  async getGstSettings(): Promise<GstSettings> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('gst_settings').select('*').limit(1).maybeSingle();
        if (!error && data) return data as GstSettings;

        if (!data) {
          const shop = await this.getShop();
          const defaultGst = { ...INITIAL_GST_SETTINGS, id: generateUuid(), shop_id: shop.id };
          await supabase.from('gst_settings').insert(defaultGst);
          return defaultGst;
        }
      } catch (err) {
        console.warn('[Supabase GST Fetch Exception]', err);
      }
    }
    return Storage.getGstSettings();
  },

  async updateGstSettings(gst: Partial<GstSettings>): Promise<GstSettings> {
    const current = await this.getGstSettings();
    const updated = { ...current, ...gst };
    if (isSupabaseConfigured()) {
      await supabase.from('gst_settings').update(gst).eq('id', current.id);
    }
    Storage.setGstSettings(updated);
    return updated;
  },

  // --- PRODUCTS ---
  async getProducts(): Promise<{ data: Product[]; error: string | null }> {
    if (isSupabaseConfigured()) {
      try {
        const shop = await this.getShop();
        let query = supabase.from('products').select('*');

        if (shop && isValidUuid(shop.id)) {
          query = query.eq('shop_id', shop.id);
        }

        const { data, error } = await query.order('name');

        if (error) {
          console.error('[Supabase getProducts Error]', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          const detailedErr = `[Supabase ${error.code}] ${error.message}${error.hint ? ' (Hint: ' + error.hint + ')' : ''}`;
          return { data: [], error: detailedErr };
        }

        const normalized: Product[] = (data || []).map((p: any) => ({
          id: p.id,
          shop_id: p.shop_id || shop.id,
          name: p.name || 'Unnamed Product',
          name_hindi: p.name_hindi || p.hindi_name || '',
          category: p.category || 'General',
          barcode: p.barcode || p.sku || '',
          price: Number(p.price ?? p.selling_price ?? 0),
          cost_price: Number(p.cost_price ?? p.purchase_price ?? 0),
          gst_rate: Number(p.gst_rate || 0),
          hsn_code: p.hsn_code || '9999',
          stock_qty: Number(p.stock_qty ?? p.stock_quantity ?? p.quantity ?? 50),
          min_stock_alert: Number(p.min_stock_alert ?? p.low_stock_threshold ?? 5),
          unit: p.unit || p.unit_type || 'Pcs',
          created_at: p.created_at || new Date().toISOString(),
        }));

        return { data: normalized, error: null };
      } catch (err: any) {
        console.error('[Supabase getProducts Exception]', err);
        return { data: [], error: err?.message || 'Failed to query Supabase products table' };
      }
    }
    return { data: Storage.getProducts(), error: null };
  },

  async saveProduct(productData: Omit<Product, 'id' | 'shop_id' | 'created_at'> & { id?: string }): Promise<Product> {
    const shop = await this.getShop();

    // Map application fields strictly to existing Supabase columns
    const supabasePayload: Record<string, any> = {
      shop_id: shop.id,
      name: productData.name,
      sku: productData.barcode || `SKU-${Date.now().toString().slice(-6)}`,
      barcode: productData.barcode || '',
      selling_price: Number(productData.price),
      purchase_price: Number(productData.cost_price || 0),
      gst_rate: Number(productData.gst_rate || 0),
      hsn_code: productData.hsn_code || '9999',
      unit: productData.unit || 'Pcs',
    };

    if (productData.id && isValidUuid(productData.id)) {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('products').update(supabasePayload).eq('id', productData.id);
        if (error) {
          console.error('[Supabase updateProduct Error]', error);
          if (error.code === '42501') {
            throw new Error('Supabase RLS Policy: Row Level Security is preventing write operations. Enable INSERT/UPDATE policies in your Supabase dashboard.');
          }
          throw new Error(`[${error.code}] ${error.message}`);
        }
      }
      return {
        id: productData.id,
        shop_id: shop.id,
        name: productData.name,
        name_hindi: productData.name_hindi || '',
        category: productData.category || 'General',
        barcode: productData.barcode || '',
        price: Number(productData.price),
        cost_price: Number(productData.cost_price || 0),
        gst_rate: Number(productData.gst_rate || 0),
        hsn_code: productData.hsn_code || '9999',
        stock_qty: Number(productData.stock_qty || 0),
        min_stock_alert: Number(productData.min_stock_alert || 5),
        unit: productData.unit || 'Pcs',
        created_at: new Date().toISOString(),
      };
    }

    const newId = generateUuid();
    const newProduct: Product = {
      id: newId,
      shop_id: shop.id,
      name: productData.name,
      name_hindi: productData.name_hindi || '',
      category: productData.category || 'General',
      barcode: productData.barcode || '',
      price: Number(productData.price),
      cost_price: Number(productData.cost_price || 0),
      gst_rate: Number(productData.gst_rate || 0),
      hsn_code: productData.hsn_code || '9999',
      stock_qty: Number(productData.stock_qty || 0),
      min_stock_alert: Number(productData.min_stock_alert || 5),
      unit: productData.unit || 'Pcs',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('products').insert({
        id: newId,
        ...supabasePayload,
      });
      if (error) {
        console.error('[Supabase saveProduct Insert Error]', error);
        if (error.code === '42501') {
          throw new Error('Supabase RLS Policy: Row Level Security is preventing write operations. Enable INSERT/UPDATE policies in your Supabase dashboard.');
        }
        throw new Error(`[${error.code}] ${error.message}`);
      }
    }

    return newProduct;
  },

  async deleteProduct(id: string): Promise<boolean> {
    if (isSupabaseConfigured() && isValidUuid(id)) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        console.error('[Supabase deleteProduct Error]', error);
        throw new Error(`[${error.code}] ${error.message}`);
      }
    }
    return true;
  },

  async seedProductsToSupabase(): Promise<number> {
    if (!isSupabaseConfigured()) return 0;
    const shop = await this.getShop();
    const productsToInsert = INITIAL_PRODUCTS.map((p) => ({
      id: generateUuid(),
      shop_id: shop.id,
      name: p.name,
      sku: p.barcode,
      barcode: p.barcode,
      selling_price: p.price,
      purchase_price: p.cost_price,
      gst_rate: p.gst_rate,
      hsn_code: p.hsn_code,
      unit: p.unit,
    }));

    const { error } = await supabase.from('products').insert(productsToInsert);
    if (error) {
      console.error('[Supabase Seed Error]', error);
      throw new Error(`[${error.code}] ${error.message}`);
    }
    return productsToInsert.length;
  },

  async recordStockMovement(
    productId: string,
    type: StockMovementType,
    quantity: number,
    reason: string
  ): Promise<void> {
    const { data: products } = await this.getProducts();
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    let newQty = product.stock_qty;
    if (type === 'IN') newQty += quantity;
    else if (type === 'OUT') newQty = Math.max(0, newQty - quantity);
    else if (type === 'ADJUSTMENT') newQty = quantity;

    product.stock_qty = newQty;

    const movement: StockMovement = {
      id: generateUuid(),
      product_id: productId,
      type,
      quantity,
      reason,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && isValidUuid(productId)) {
      await supabase.from('stock_movements').insert(movement);
    }
  },

  // --- CUSTOMERS ---
  async getCustomers(): Promise<Customer[]> {
    if (isSupabaseConfigured()) {
      try {
        const shop = await this.getShop();
        let query = supabase.from('customers').select('*');
        if (shop && isValidUuid(shop.id)) {
          query = query.eq('shop_id', shop.id);
        }
        const { data, error } = await query.order('name');
        if (!error && data) return data as Customer[];
      } catch (err) {
        console.warn('[Supabase getCustomers Error]', err);
      }
    }
    return Storage.getCustomers();
  },

  async saveCustomer(customerData: Omit<Customer, 'id' | 'shop_id' | 'total_due' | 'created_at'> & { id?: string }): Promise<Customer> {
    const shop = await this.getShop();
    const customers = await this.getCustomers();

    if (customerData.id && isValidUuid(customerData.id)) {
      const index = customers.findIndex((c) => c.id === customerData.id);
      if (index !== -1) {
        const updated: Customer = {
          ...customers[index],
          ...customerData,
        };
        customers[index] = updated;
        if (isSupabaseConfigured()) {
          await supabase.from('customers').update(updated).eq('id', updated.id);
        }
        return updated;
      }
    }

    const newCustomer: Customer = {
      id: generateUuid(),
      shop_id: shop.id,
      name: customerData.name,
      phone: customerData.phone,
      email: customerData.email || '',
      address: customerData.address || '',
      total_due: 0,
      credit_limit: Number(customerData.credit_limit || 5000),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      await supabase.from('customers').insert(newCustomer);
    }
    return newCustomer;
  },

  async recordCustomerPayment(
    customerId: string,
    amount: number,
    paymentMode: PaymentMode,
    referenceNo?: string,
    notes?: string
  ): Promise<void> {
    const customers = await this.getCustomers();
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    customer.total_due = Math.max(0, customer.total_due - amount);

    const payment: Payment = {
      id: generateUuid(),
      customer_id: customerId,
      amount,
      payment_mode: paymentMode,
      reference_no: referenceNo || '',
      notes: notes || 'Credit clearance payment',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && isValidUuid(customerId)) {
      await supabase.from('customers').update({ total_due: customer.total_due }).eq('id', customerId);
      await supabase.from('payments').insert(payment);
    }
  },

  // --- POS & INVOICES ---
  async getInvoices(): Promise<Invoice[]> {
    if (isSupabaseConfigured()) {
      try {
        const shop = await this.getShop();
        let query = supabase.from('invoices').select('*, items:invoice_items(*)');
        if (shop && isValidUuid(shop.id)) {
          query = query.eq('shop_id', shop.id);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) return data as Invoice[];
      } catch (err) {
        console.warn('[Supabase getInvoices Error]', err);
      }
    }
    return Storage.getInvoices();
  },

  async createInvoice(params: {
    customerId?: string | null;
    customerName?: string;
    customerPhone?: string;
    items: {
      product: Product;
      quantity: number;
      discount: number;
    }[];
    discountAmount: number;
    paymentMode: PaymentMode;
    notes?: string;
  }): Promise<Invoice> {
    const shop = await this.getShop();
    const { data: products } = await this.getProducts();
    const customers = await this.getCustomers();

    let subtotal = 0;
    let totalGst = 0;

    const invoiceId = generateUuid();
    const invoiceNumber = generateInvoiceNumber('INV');

    const invoiceItems = params.items.map((item, idx) => {
      const lineSubtotal = item.product.price * item.quantity - item.discount;
      const basePrice = lineSubtotal / (1 + item.product.gst_rate / 100);
      const gstAmt = lineSubtotal - basePrice;

      subtotal += lineSubtotal;
      totalGst += gstAmt;

      return {
        id: generateUuid(),
        invoice_id: invoiceId,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        gst_rate: item.product.gst_rate,
        gst_amount: Number(gstAmt.toFixed(2)),
        total: Number(lineSubtotal.toFixed(2)),
      };
    });

    const totalAmount = Math.round(subtotal - params.discountAmount);

    let paidAmount = totalAmount;
    let dueAmount = 0;
    let paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'PAID';

    if (params.paymentMode === 'CREDIT') {
      paidAmount = 0;
      dueAmount = totalAmount;
      paymentStatus = 'UNPAID';
    }

    const newInvoice: Invoice = {
      id: invoiceId,
      shop_id: shop.id,
      customer_id: (params.customerId && isValidUuid(params.customerId)) ? params.customerId : null,
      customer_name: params.customerName || (params.customerId ? customers.find((c) => c.id === params.customerId)?.name : 'Walk-in Customer'),
      customer_phone: params.customerPhone || (params.customerId ? customers.find((c) => c.id === params.customerId)?.phone : ''),
      invoice_number: invoiceNumber,
      subtotal: Number(subtotal.toFixed(2)),
      discount_amount: Number(params.discountAmount.toFixed(2)),
      gst_amount: Number(totalGst.toFixed(2)),
      total_amount: totalAmount,
      paid_amount: paidAmount,
      due_amount: dueAmount,
      payment_status: paymentStatus,
      payment_mode: params.paymentMode,
      status: 'COMPLETED',
      notes: params.notes || '',
      created_at: new Date().toISOString(),
      items: invoiceItems,
    };

    // Update stock for sold products
    for (const item of params.items) {
      await this.recordStockMovement(item.product.id, 'OUT', item.quantity, `Sale #${invoiceNumber}`);
    }

    // Save invoice in Supabase
    if (isSupabaseConfigured()) {
      const { error: invErr } = await supabase.from('invoices').insert({
        id: newInvoice.id,
        shop_id: newInvoice.shop_id,
        customer_id: newInvoice.customer_id,
        customer_name: newInvoice.customer_name,
        customer_phone: newInvoice.customer_phone,
        invoice_number: newInvoice.invoice_number,
        subtotal: newInvoice.subtotal,
        discount_amount: newInvoice.discount_amount,
        gst_amount: newInvoice.gst_amount,
        total_amount: newInvoice.total_amount,
        paid_amount: newInvoice.paid_amount,
        due_amount: newInvoice.due_amount,
        payment_status: newInvoice.payment_status,
        payment_mode: newInvoice.payment_mode,
        status: newInvoice.status,
        notes: newInvoice.notes,
        created_at: newInvoice.created_at,
      });
      if (invErr) console.error('[Supabase Invoice Insert Error]', invErr);

      if (newInvoice.items && newInvoice.items.length > 0) {
        const { error: itemErr } = await supabase.from('invoice_items').insert(newInvoice.items);
        if (itemErr) console.error('[Supabase Invoice Items Insert Error]', itemErr);
      }
    }

    return newInvoice;
  },

  // --- HELD BILLS ---
  async getHeldBills(): Promise<HeldBill[]> {
    return Storage.getHeldBills();
  },

  async holdBill(params: {
    customerId?: string | null;
    customerName?: string;
    items: { product: Product; quantity: number; discount: number }[];
    notes?: string;
  }): Promise<HeldBill> {
    const held: HeldBill = {
      id: generateUuid(),
      customer_id: params.customerId,
      customer_name: params.customerName || 'Walk-in Customer',
      items: params.items,
      notes: params.notes,
      created_at: new Date().toISOString(),
    };
    const current = Storage.getHeldBills();
    Storage.setHeldBills([held, ...current]);
    return held;
  },

  async deleteHeldBill(id: string): Promise<void> {
    const current = Storage.getHeldBills();
    Storage.setHeldBills(current.filter((h) => h.id !== id));
  },

  // --- DASHBOARD STATS ---
  async getDashboardStats() {
    const invoices = await this.getInvoices();
    const { data: products } = await this.getProducts();
    const customers = await this.getCustomers();

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayInvoices = invoices.filter((inv) => inv.created_at.startsWith(todayStr));

    const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalBillsToday = todayInvoices.length;
    const totalDue = customers.reduce((sum, c) => sum + c.total_due, 0);

    const lowStockProducts = products.filter((p) => p.stock_qty <= p.min_stock_alert);

    return {
      todaySales,
      totalBillsToday,
      totalProductsCount: products.length,
      totalCustomersCount: customers.length,
      totalDueAmount: totalDue,
      lowStockProducts,
      recentInvoices: invoices.slice(0, 5),
    };
  },
};
