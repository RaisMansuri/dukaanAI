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
import { generateInvoiceNumber, generateUuid, isValidUuid, calculateGST } from '@/lib/utils';
import { INITIAL_SHOP, INITIAL_GST_SETTINGS, INITIAL_PRODUCTS } from './mockData';

export const ApiService = {
  // --- AUTHENTICATED SHOP RESOLUTION ---
  async getAuthenticatedShop(): Promise<Shop> {
    if (isSupabaseConfigured()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: shopData } = await supabase
            .from('shops')
            .select('*')
            .eq('owner_id', user.id)
            .limit(1)
            .maybeSingle();

          if (shopData) {
            return {
              id: shopData.id,
              owner_id: shopData.owner_id,
              name: shopData.name || shopData.shop_name || 'My Shop',
              address: shopData.address || '',
              phone: shopData.phone || '',
              gst_number: shopData.gst_number || shopData.gstin || '',
              state_code: shopData.state_code || '',
              created_at: shopData.created_at,
            };
          }
        }
      } catch (err) {
        console.warn('[Supabase getAuthenticatedShop Exception]', err);
      }
    }
    return Storage.getShop();
  },

  async getShop(): Promise<Shop> {
    return this.getAuthenticatedShop();
  },

  async updateShop(shop: Partial<Shop>): Promise<Shop> {
    const current = await this.getAuthenticatedShop();
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
        const shop = await this.getAuthenticatedShop();
        const { data, error } = await supabase
          .from('gst_settings')
          .select('*')
          .eq('shop_id', shop.id)
          .maybeSingle();

        if (!error && data) return data as GstSettings;

        if (!data && shop) {
          const defaultGst = { ...INITIAL_GST_SETTINGS, id: generateUuid(), shop_id: shop.id };
          await supabase.from('gst_settings').insert({
            id: defaultGst.id,
            shop_id: defaultGst.shop_id,
            is_gst_enabled: defaultGst.is_gst_enabled,
            default_gst_rate: defaultGst.default_gst_rate,
          });
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
      await supabase.from('gst_settings').update({
        is_gst_enabled: updated.is_gst_enabled,
        default_gst_rate: updated.default_gst_rate,
      }).eq('shop_id', current.shop_id);
    }
    Storage.setGstSettings(updated);
    return updated;
  },

  // --- PRODUCTS ---
  async getProducts(): Promise<{ data: Product[]; error: string | null }> {
    if (isSupabaseConfigured()) {
      try {
        const shop = await this.getAuthenticatedShop();
        
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
            fullError: JSON.stringify(error, null, 2),
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
    const shop = await this.getAuthenticatedShop();

    if (!shop || !isValidUuid(shop.id)) {
      throw new Error('No valid shop registered for your account. Please complete Shop Setup.');
    }

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
        const { error } = await supabase.from('products').update(supabasePayload).eq('id', productData.id).eq('shop_id', shop.id);
        if (error) {
          console.error('[Supabase updateProduct Error]', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            fullError: JSON.stringify(error, null, 2),
          });
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
        console.error('[Supabase saveProduct Insert Error]', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: JSON.stringify(error, null, 2),
        });
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
      const shop = await this.getAuthenticatedShop();
      const { error } = await supabase.from('products').delete().eq('id', id).eq('shop_id', shop.id);
      if (error) {
        console.error('[Supabase deleteProduct Error]', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: JSON.stringify(error, null, 2),
        });
        throw new Error(`[${error.code}] ${error.message}`);
      }
    }
    return true;
  },

  async seedProductsToSupabase(): Promise<number> {
    if (!isSupabaseConfigured()) return 0;
    const shop = await this.getAuthenticatedShop();
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
      console.error('[Supabase Seed Error]', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: JSON.stringify(error, null, 2),
      });
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
      await supabase.from('stock_movements').insert({
        id: movement.id,
        product_id: productId,
        type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason,
      });
    }
  },

  // --- CUSTOMERS ---
  async getCustomers(): Promise<Customer[]> {
    if (isSupabaseConfigured()) {
      try {
        const shop = await this.getAuthenticatedShop();
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
    const shop = await this.getAuthenticatedShop();
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
          await supabase.from('customers').update({
            name: customerData.name,
            phone: customerData.phone,
            address: customerData.address || '',
          }).eq('id', customerData.id).eq('shop_id', shop.id);
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
      await supabase.from('customers').insert({
        id: newCustomer.id,
        shop_id: shop.id,
        name: newCustomer.name,
        phone: newCustomer.phone,
        address: newCustomer.address,
      });
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
      await supabase.from('payments').insert({
        id: payment.id,
        customer_id: customerId,
        amount: payment.amount,
      });
    }
  },

  // --- POS & INVOICES ---
  async getInvoices(): Promise<Invoice[]> {
    if (isSupabaseConfigured()) {
      try {
        const shop = await this.getAuthenticatedShop();
        let query = supabase.from('invoices').select('*, items:invoice_items(*)');
        if (shop && isValidUuid(shop.id)) {
          query = query.eq('shop_id', shop.id);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) {
          const customers = await this.getCustomers();

          const normalized: Invoice[] = data.map((inv: any) => {
            const cust = customers.find((c) => c.id === inv.customer_id);
            const customerName = inv.customer_name || (cust ? cust.name : 'Walk-in Customer');
            const customerPhone = inv.customer_phone || (cust ? cust.phone : '');
            
            const rawStatus = String(inv.payment_status || 'paid').toUpperCase();
            const paymentMode = inv.payment_mode || (rawStatus === 'UNPAID' ? 'CREDIT' : 'CASH');

            const normalizedItems = (inv.items || []).map((it: any) => {
              const qty = Number(it.quantity || 0);
              const price = Number(it.unit_price || 0);
              const gstRate = Number(it.gst_rate || 0);
              const itemSubtotal = qty * price;
              const basePrice = itemSubtotal / (1 + gstRate / 100);
              const gstAmt = itemSubtotal - basePrice;

              return {
                id: it.id,
                invoice_id: it.invoice_id,
                product_id: it.product_id,
                product_name: it.product_name,
                quantity: qty,
                unit_price: price,
                gst_rate: gstRate,
                gst_amount: Number(gstAmt.toFixed(2)),
                total: Number(itemSubtotal.toFixed(2)),
              };
            });

            const subtotal = Number(inv.subtotal || 0);
            const discountAmount = Number(inv.discount_amount || 0);
            const totalAmount = Number(inv.total_amount || (subtotal - discountAmount));
            const totalGst = normalizedItems.reduce((sum: number, it: any) => sum + (it.gst_amount || 0), 0);

            return {
              id: inv.id,
              shop_id: inv.shop_id,
              customer_id: inv.customer_id,
              customer_name: customerName,
              customer_phone: customerPhone,
              invoice_number: inv.invoice_number,
              subtotal,
              discount_amount: discountAmount,
              gst_amount: Number(totalGst.toFixed(2)),
              total_amount: totalAmount,
              paid_amount: rawStatus === 'UNPAID' ? 0 : totalAmount,
              due_amount: rawStatus === 'UNPAID' ? totalAmount : 0,
              payment_status: rawStatus as any,
              payment_mode: paymentMode as any,
              status: String(inv.status || 'COMPLETED').toUpperCase() as any,
              notes: inv.notes || '',
              created_at: inv.created_at || new Date().toISOString(),
              items: normalizedItems,
            };
          });

          return normalized;
        }
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
    referenceNo?: string;
    notes?: string;
  }): Promise<Invoice> {
    // 1. Get current authenticated user & shop
    const shop = await this.getAuthenticatedShop();
    
    if (!shop || !isValidUuid(shop.id)) {
      throw new Error('No valid shop registered for your account. Please complete Shop Setup.');
    }

    const { data: products } = await this.getProducts();
    const customers = await this.getCustomers();

    let grossTotal = 0;
    let taxableSubtotal = 0;
    let totalGst = 0;

    const invoiceId = generateUuid();
    const invoiceNumber = generateInvoiceNumber('INV');

    const invoiceItems = params.items.map((item) => {
      const lineTotal = item.product.price * item.quantity - item.discount;
      const { taxableAmount, gstAmount } = calculateGST(lineTotal, 1, item.product.gst_rate);

      grossTotal += lineTotal;
      taxableSubtotal += taxableAmount;
      totalGst += gstAmount;

      return {
        id: generateUuid(),
        invoice_id: invoiceId,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        gst_rate: item.product.gst_rate,
        gst_amount: Number(gstAmount.toFixed(2)),
        total: Number(lineTotal.toFixed(2)),
      };
    });

    const totalAmount = Math.round(grossTotal - params.discountAmount);

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
      subtotal: Number(taxableSubtotal.toFixed(2)),
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

    // 2. Insert Invoice into public.invoices using exact database columns & normalized status values
    if (isSupabaseConfigured()) {
      const invoicePayload = {
        id: invoiceId,
        shop_id: shop.id,
        customer_id: (params.customerId && isValidUuid(params.customerId)) ? params.customerId : null,
        invoice_number: invoiceNumber,
        subtotal: newInvoice.subtotal,
        discount_amount: newInvoice.discount_amount,
        total_amount: newInvoice.total_amount,
        payment_status: paymentStatus.toLowerCase(), // 'paid', 'unpaid', 'partial'
        status: 'completed', // 'completed'
        notes: params.notes || '',
      };

      const { data: invData, error: invErr } = await supabase
        .from('invoices')
        .insert(invoicePayload)
        .select()
        .single();

      if (invErr) {
        console.error('Supabase Invoice Insert Error', {
          message: invErr?.message,
          code: invErr?.code,
          details: invErr?.details,
          hint: invErr?.hint,
          fullError: JSON.stringify(invErr, null, 2),
        });
        if (invErr.code === '42501') {
          throw new Error('Supabase RLS Policy: Row Level Security is preventing invoice creation. Please enable INSERT policy on table "invoices".');
        }
        if (invErr.code === '23514') {
          throw new Error(`Database Constraint Error: [23514] ${invErr.message} (Hint: Ensure payment_status check constraint permits values 'paid', 'unpaid', 'partial').`);
        }
        throw new Error(`Invoice Insert Error: [${invErr.code}] ${invErr.message}`);
      }

      const insertedInvoiceId = invData?.id || invoiceId;

      // 3. Insert Invoice Items into public.invoice_items using exact database columns
      if (newInvoice.items && newInvoice.items.length > 0) {
        const insertItemsPayload = newInvoice.items.map((it) => ({
          id: it.id,
          invoice_id: insertedInvoiceId,
          product_id: isValidUuid(it.product_id) ? it.product_id : null,
          product_name: it.product_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
          gst_rate: it.gst_rate,
        }));

        const { error: itemErr } = await supabase.from('invoice_items').insert(insertItemsPayload);

        if (itemErr) {
          console.error('Supabase Invoice Items Insert Error', {
            message: itemErr?.message,
            code: itemErr?.code,
            details: itemErr?.details,
            hint: itemErr?.hint,
            fullError: JSON.stringify(itemErr, null, 2),
          });
          if (itemErr.code === '42501') {
            throw new Error('Supabase RLS Policy: Row Level Security is preventing items creation. Please enable INSERT policy on table "invoice_items".');
          }
        }
      }

      // 3.5 Insert Payment record into public.payments table
      try {
        const paymentPayload = {
          id: generateUuid(),
          shop_id: shop.id,
          invoice_id: insertedInvoiceId,
          amount: newInvoice.total_amount,
          payment_method: params.paymentMode.toLowerCase(),
          reference_number: params.referenceNo || null,
          created_at: new Date().toISOString(),
        };

        const { error: payErr } = await supabase.from('payments').insert(paymentPayload);
        if (payErr) {
          console.warn('[Supabase Payment Insert Note]', {
            message: payErr.message,
            code: payErr.code,
            details: payErr.details,
          });
        }
      } catch (pErr) {
        console.warn('[Payment Insert Catch Exception]', pErr);
      }
    }

    // 4. Update stock for sold products
    for (const item of params.items) {
      await this.recordStockMovement(item.product.id, 'OUT', item.quantity, `Sale #${invoiceNumber}`);
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
