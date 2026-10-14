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
  StockNotification,
  StockNotificationSettings,
  StockNotificationLog,
  NotificationChannel,
  HeldBill,
  PaymentMode,
  StockMovementType,
  PaginatedResult,
} from '@/types/database';
import { generateInvoiceNumber, generateUuid, isValidUuid, calculateGST, isValidIndianMobile, isValidGstin } from '@/lib/utils';
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
      const { error } = await supabase.from('shops').update({
        shop_name: updated.name,
        address: updated.address,
        phone: updated.phone,
        gst_number: updated.gst_number,
        state_code: updated.state_code,
      }).eq('id', current.id);

      if (error) {
        console.error('[Supabase updateShop Error]', error);
        throw new Error(`[${error.code}] ${error.message}`);
      }
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
      const { error } = await supabase.from('gst_settings').update({
        is_gst_enabled: updated.is_gst_enabled,
        default_gst_rate: updated.default_gst_rate,
      }).eq('shop_id', current.shop_id);

      if (error) {
        console.error('[Supabase updateGstSettings Error]', error);
        throw new Error(`[${error.code}] ${error.message}`);
      }
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
      name_hindi: productData.name_hindi || '',
      category: productData.category || 'General',
      sku: productData.barcode || `SKU-${Date.now().toString().slice(-6)}`,
      barcode: productData.barcode || '',
      selling_price: Number(productData.price),
      purchase_price: Number(productData.cost_price || 0),
      gst_rate: Number(productData.gst_rate || 0),
      hsn_code: productData.hsn_code || '9999',
      unit: productData.unit || 'Pcs',
      stock_qty: Number(productData.stock_qty || 0),
      min_stock_alert: Number(productData.min_stock_alert || 5),
    };

    const executeResilientMutation = async (
      action: 'insert' | 'update',
      productId: string,
      payload: Record<string, any>
    ) => {
      let currentPayload = { ...payload };

      for (let attempt = 0; attempt < 8; attempt++) {
        const query =
          action === 'insert'
            ? supabase.from('products').insert({ id: productId, ...currentPayload })
            : supabase.from('products').update(currentPayload).eq('id', productId).eq('shop_id', shop.id);

        const { error } = await query;
        if (!error) return null;

        console.warn(`[Supabase saveProduct Attempt ${attempt + 1} Failed]`, error);

        // Extract any missing column name from error message (e.g. Could not find the 'category' column)
        const missingColMatch = error.message?.match(/Could not find the ['"]([^'"]+)['"] column/i);
        if (missingColMatch && missingColMatch[1] && missingColMatch[1] in currentPayload) {
          const colToRemove = missingColMatch[1];
          console.warn(`[Supabase Product Schema Retry] Removing unsupported column '${colToRemove}' from payload`);
          delete currentPayload[colToRemove];
          continue;
        }

        // Generic column error or PGRST204 / 42703
        if (error.code === 'PGRST204' || error.code === '42703' || error.message?.toLowerCase().includes('column')) {
          if ('stock_qty' in currentPayload) {
            currentPayload.stock_quantity = currentPayload.stock_qty;
            delete currentPayload.stock_qty;
          }
          if ('min_stock_alert' in currentPayload) {
            currentPayload.low_stock_threshold = currentPayload.min_stock_alert;
            delete currentPayload.min_stock_alert;
          }
          if ('category' in currentPayload) delete currentPayload.category;
          if ('name_hindi' in currentPayload) delete currentPayload.name_hindi;
          if ('hsn_code' in currentPayload) delete currentPayload.hsn_code;
          if ('barcode' in currentPayload) delete currentPayload.barcode;
          if ('sku' in currentPayload) delete currentPayload.sku;
          continue;
        }

        return error;
      }
      return null;
    };

    if (productData.id && isValidUuid(productData.id)) {
      if (isSupabaseConfigured()) {
        try {
          const error = await executeResilientMutation('update', productData.id, supabasePayload);
          if (error) {
            console.warn('[Supabase updateProduct Warning - Falling back to local storage cache]', error);
          }
        } catch (sbErr) {
          console.warn('[Supabase updateProduct Exception - Local fallback]', sbErr);
        }
      }
      const localProducts = Storage.getProducts();
      const idx = localProducts.findIndex((p) => p.id === productData.id);
      const updatedProd: Product = {
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
        created_at: idx !== -1 ? localProducts[idx].created_at : new Date().toISOString(),
      };
      if (idx !== -1) localProducts[idx] = updatedProd;
      else localProducts.push(updatedProd);
      Storage.setProducts(localProducts);
      return updatedProd;
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
      try {
        const error = await executeResilientMutation('insert', newId, supabasePayload);
        if (error) {
          console.warn('[Supabase saveProduct Insert Warning - Falling back to local storage cache]', error);
        }
      } catch (sbErr) {
        console.warn('[Supabase saveProduct Exception - Local fallback]', sbErr);
      }
    }

    const localProds = Storage.getProducts();
    Storage.setProducts([newProduct, ...localProds]);
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
    const localProducts = Storage.getProducts();
    Storage.setProducts(localProducts.filter((p) => p.id !== id));
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

  async getNotificationSettings(): Promise<StockNotificationSettings> {
    const shop = await this.getAuthenticatedShop();
    const defaultPhone = shop?.phone || '+919820012345';

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('stock_notification_settings')
          .select('*')
          .eq('shop_id', shop.id)
          .single();

        if (!error && data) {
          return {
            id: data.id,
            shop_id: data.shop_id,
            stock_alerts_enabled: data.stock_alerts_enabled ?? true,
            sms_alerts_enabled: data.sms_alerts_enabled ?? true,
            whatsapp_alerts_enabled: data.whatsapp_alerts_enabled ?? true,
            notification_phone: data.notification_phone || defaultPhone,
            updated_at: data.updated_at,
          };
        }
      } catch (err) {
        console.warn('[Supabase getNotificationSettings Error]', err);
      }
    }

    const localSettings = Storage.getNotificationSettings();
    if (localSettings) return localSettings;

    const initialSettings: StockNotificationSettings = {
      shop_id: shop?.id || 'shop_101',
      stock_alerts_enabled: true,
      sms_alerts_enabled: true,
      whatsapp_alerts_enabled: true,
      notification_phone: defaultPhone,
    };
    Storage.setNotificationSettings(initialSettings);
    return initialSettings;
  },

  async updateNotificationSettings(settings: StockNotificationSettings): Promise<StockNotificationSettings> {
    const shop = await this.getAuthenticatedShop();

    if (!isValidIndianMobile(settings.notification_phone)) {
      throw new Error('Please enter a valid 10-digit Indian mobile number for notifications.');
    }

    const payload: StockNotificationSettings = {
      ...settings,
      shop_id: shop?.id || settings.shop_id,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('stock_notification_settings')
        .upsert({
          shop_id: shop.id,
          stock_alerts_enabled: payload.stock_alerts_enabled,
          sms_alerts_enabled: payload.sms_alerts_enabled,
          whatsapp_alerts_enabled: payload.whatsapp_alerts_enabled,
          notification_phone: payload.notification_phone,
          updated_at: payload.updated_at,
        });

      if (error) {
        console.error('[Supabase updateNotificationSettings Error]', error);
      }
    }

    Storage.setNotificationSettings(payload);
    return payload;
  },

  async checkAndTriggerStockAlert(
    product: Product,
    previousStock?: number
  ): Promise<void> {
    try {
      const shop = await this.getAuthenticatedShop();
      if (!shop) return;

      const settings = await this.getNotificationSettings();
      if (!settings.stock_alerts_enabled) return;

      const currentStock = product.stock_qty;
      const minStock = product.min_stock_alert;

      let alertType: 'LOW_STOCK' | 'OUT_OF_STOCK' | null = null;
      if (currentStock === 0) {
        alertType = 'OUT_OF_STOCK';
      } else if (currentStock <= minStock) {
        alertType = 'LOW_STOCK';
      }

      if (!alertType) return;

      // Duplicate prevention rule:
      if (previousStock !== undefined) {
        if (alertType === 'LOW_STOCK' && previousStock <= minStock) return;
        if (alertType === 'OUT_OF_STOCK' && previousStock === 0) return;
      }

      const notifPhone = settings.notification_phone || shop.phone;
      const smsMessage =
        alertType === 'OUT_OF_STOCK'
          ? `🚨 Out of Stock Alert\n\nProduct: ${product.name}\nCurrent Stock: 0 ${product.unit || 'Pcs'}\n\nThis product is currently out of stock.`
          : `⚠️ Low Stock Alert\n\nProduct: ${product.name}\nCurrent Stock: ${currentStock} ${product.unit || 'Pcs'}\nMinimum Stock Level: ${minStock} ${product.unit || 'Pcs'}\n\nPlease restock this product soon.`;

      const channels: NotificationChannel[] = [];
      if (settings.sms_alerts_enabled) channels.push('SMS');
      if (settings.whatsapp_alerts_enabled) channels.push('WHATSAPP');

      const createdLogs: StockNotificationLog[] = [];

      for (const ch of channels) {
        const logId = generateUuid();
        const logEntry: StockNotificationLog = {
          id: logId,
          shop_id: shop.id,
          product_id: product.id,
          product_name: product.name,
          alert_type: alertType,
          channel: ch,
          recipient_phone: notifPhone,
          message_body: smsMessage,
          status: 'SIMULATED',
          provider_response: `${ch}_PROVIDER_SIMULATED_200`,
          sent_at: new Date().toISOString(),
        };

        if (isSupabaseConfigured()) {
          await supabase.from('stock_notification_logs').insert({
            id: logId,
            shop_id: shop.id,
            product_id: product.id,
            product_name: product.name,
            alert_type: alertType,
            channel: ch,
            recipient_phone: notifPhone,
            message_body: smsMessage,
            status: 'SIMULATED',
            provider_response: logEntry.provider_response,
            sent_at: logEntry.sent_at,
          });
        }

        createdLogs.push(logEntry);
      }

      const existingStorageLogs = Storage.getNotificationLogs();
      Storage.setNotificationLogs([...createdLogs, ...existingStorageLogs]);
    } catch (err) {
      console.warn('[Stock Notification Alert Error]', err);
    }
  },

  async sendTestNotification(): Promise<{ success: boolean; message: string }> {
    const shop = await this.getAuthenticatedShop();
    const settings = await this.getNotificationSettings();

    const notifPhone = settings.notification_phone || shop.phone;
    const testMsg = `🔔 Test Stock Alert Notification\n\nThis is a test alert from DukaanAI for ${shop.name}.\nChannels configured: SMS: ${settings.sms_alerts_enabled ? 'ON' : 'OFF'}, WhatsApp: ${settings.whatsapp_alerts_enabled ? 'ON' : 'OFF'}.`;

    const channels: NotificationChannel[] = [];
    if (settings.sms_alerts_enabled) channels.push('SMS');
    if (settings.whatsapp_alerts_enabled) channels.push('WHATSAPP');

    if (channels.length === 0) {
      throw new Error('Please enable at least SMS or WhatsApp alerts in notification settings.');
    }

    const createdLogs: StockNotificationLog[] = [];

    for (const ch of channels) {
      const logId = generateUuid();
      const logEntry: StockNotificationLog = {
        id: logId,
        shop_id: shop.id,
        product_id: 'test_prod',
        product_name: 'System Test Product',
        alert_type: 'LOW_STOCK',
        channel: ch,
        recipient_phone: notifPhone,
        message_body: testMsg,
        status: 'SIMULATED',
        provider_response: `${ch}_TEST_SIMULATED_SUCCESS`,
        sent_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        await supabase.from('stock_notification_logs').insert({
          id: logId,
          shop_id: shop.id,
          product_id: 'test_prod',
          product_name: 'System Test Product',
          alert_type: 'LOW_STOCK',
          channel: ch,
          recipient_phone: notifPhone,
          message_body: testMsg,
          status: 'SIMULATED',
          provider_response: logEntry.provider_response,
          sent_at: logEntry.sent_at,
        });
      }

      createdLogs.push(logEntry);
    }

    const existingStorageLogs = Storage.getNotificationLogs();
    Storage.setNotificationLogs([...createdLogs, ...existingStorageLogs]);

    return {
      success: true,
      message: `Test notification sent via ${channels.join(' & ')} to ${notifPhone}`,
    };
  },

  async getPaginatedNotificationLogs(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    channelFilter?: string;
    alertTypeFilter?: string;
  }): Promise<PaginatedResult<StockNotificationLog>> {
    const page = Math.max(1, options?.page || 1);
    const pageSize = Math.max(1, options?.pageSize || 10);
    const from = (page - 1) * pageSize;

    let logs: StockNotificationLog[] = [];

    if (isSupabaseConfigured()) {
      try {
        const shop = await this.getAuthenticatedShop();
        let query = supabase.from('stock_notification_logs').select('*');
        if (shop && isValidUuid(shop.id)) {
          query = query.eq('shop_id', shop.id);
        }
        const { data, error } = await query.order('sent_at', { ascending: false });

        if (!error && data) {
          logs = data.map((l: any) => ({
            id: l.id,
            shop_id: l.shop_id || shop.id,
            product_id: l.product_id,
            product_name: l.product_name || 'Product',
            alert_type: l.alert_type || 'LOW_STOCK',
            channel: l.channel || 'SMS',
            recipient_phone: l.recipient_phone || '',
            message_body: l.message_body || '',
            status: l.status || 'SIMULATED',
            provider_response: l.provider_response || '',
            sent_at: l.sent_at || new Date().toISOString(),
            error_message: l.error_message || '',
          }));
        }
      } catch (err) {
        console.warn('[Supabase getPaginatedNotificationLogs Error]', err);
      }
    }

    if (logs.length === 0) {
      logs = Storage.getNotificationLogs();
    }

    if (options?.search) {
      const s = options.search.toLowerCase().trim();
      logs = logs.filter(
        (l) =>
          l.product_name.toLowerCase().includes(s) ||
          l.recipient_phone.includes(s) ||
          l.message_body.toLowerCase().includes(s)
      );
    }

    if (options?.channelFilter && options.channelFilter !== 'ALL') {
      logs = logs.filter((l) => l.channel === options.channelFilter);
    }

    if (options?.alertTypeFilter && options.alertTypeFilter !== 'ALL') {
      logs = logs.filter((l) => l.alert_type === options.alertTypeFilter);
    }

    const totalCount = logs.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const paginatedData = logs.slice(from, from + pageSize);

    return {
      data: paginatedData,
      page,
      pageSize,
      totalCount,
      totalPages,
    };
  },

  async recordStockMovement(params: {
    productId: string;
    movementType: StockMovementType;
    quantityChange: number;
    notes?: string;
    referenceType?: string;
    referenceId?: string;
  }): Promise<void> {
    const shop = await this.getAuthenticatedShop();
    const { data: products } = await this.getProducts();
    const product = products.find((p) => p.id === params.productId);
    if (!product) return;

    const previousStock = product.stock_qty;
    let newStock = previousStock;

    if (
      params.movementType === 'SALE' ||
      params.movementType === 'STOCK_REDUCED' ||
      params.movementType === 'DAMAGED_GOODS' ||
      params.movementType === 'OUT'
    ) {
      newStock = Math.max(0, previousStock - Math.abs(params.quantityChange));
    } else if (
      params.movementType === 'STOCK_ADDED' ||
      params.movementType === 'SUPPLIER_PURCHASE' ||
      params.movementType === 'RETURN' ||
      params.movementType === 'CANCELLED_SALE_RESTOCK' ||
      params.movementType === 'IN'
    ) {
      newStock = previousStock + Math.abs(params.quantityChange);
    } else if (params.movementType === 'ADJUSTMENT') {
      newStock = Math.max(0, params.quantityChange);
    }

    product.stock_qty = newStock;
    const actualQtyChange = newStock - previousStock;
    const movementId = generateUuid();

    const movement: StockMovement = {
      id: movementId,
      shop_id: shop?.id,
      product_id: product.id,
      product_name: product.name,
      movement_type: params.movementType,
      quantity_change: actualQtyChange,
      previous_stock: previousStock,
      new_stock: newStock,
      reference_type: params.referenceType || 'MANUAL',
      reference_id: params.referenceId || '',
      notes: params.notes || '',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured() && isValidUuid(product.id)) {
      await supabase
        .from('products')
        .update({ stock_qty: newStock })
        .eq('id', product.id);

      await supabase.from('stock_movements').insert({
        id: movementId,
        shop_id: shop?.id,
        product_id: product.id,
        product_name: product.name,
        movement_type: params.movementType,
        quantity_change: actualQtyChange,
        previous_stock: previousStock,
        new_stock: newStock,
        reference_type: movement.reference_type,
        reference_id: movement.reference_id,
        notes: movement.notes,
        created_at: movement.created_at,
      });
    }

    await this.checkAndTriggerStockAlert(product, previousStock);
  },

  async adjustProductStock(
    productId: string,
    mode: 'ADD' | 'REDUCE' | 'SET',
    qty: number,
    reason: string
  ): Promise<void> {
    let movementType: StockMovementType = 'ADJUSTMENT';
    if (mode === 'ADD') movementType = 'STOCK_ADDED';
    else if (mode === 'REDUCE') movementType = 'STOCK_REDUCED';
    else movementType = 'ADJUSTMENT';

    await this.recordStockMovement({
      productId,
      movementType,
      quantityChange: qty,
      notes: reason || `Stock ${mode.toLowerCase()} operation`,
      referenceType: 'MANUAL_ADJUSTMENT',
    });
  },

  async getPaginatedStockMovements(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    productId?: string;
    typeFilter?: string;
  }): Promise<PaginatedResult<StockMovement>> {
    const page = Math.max(1, options?.page || 1);
    const pageSize = Math.max(1, options?.pageSize || 10);
    const from = (page - 1) * pageSize;

    let movements: StockMovement[] = [];

    if (isSupabaseConfigured()) {
      try {
        const shop = await this.getAuthenticatedShop();
        let query = supabase.from('stock_movements').select('*, products(name)');
        if (shop && isValidUuid(shop.id)) {
          query = query.eq('shop_id', shop.id);
        }
        if (options?.productId) {
          query = query.eq('product_id', options.productId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });

        if (!error && data) {
          movements = data.map((m: any) => ({
            id: m.id,
            shop_id: m.shop_id || shop?.id,
            product_id: m.product_id,
            product_name: m.products?.name || m.product_name || 'Product',
            movement_type: m.movement_type || m.type || 'ADJUSTMENT',
            quantity_change: Number(m.quantity_change !== undefined ? m.quantity_change : m.quantity || 0),
            previous_stock: Number(m.previous_stock || 0),
            new_stock: Number(m.new_stock || 0),
            reference_type: m.reference_type || 'MANUAL',
            reference_id: m.reference_id || '',
            notes: m.notes || m.reason || '',
            created_at: m.created_at || new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.warn('[Supabase getPaginatedStockMovements Error]', err);
      }
    }

    if (options?.search) {
      const s = options.search.toLowerCase().trim();
      movements = movements.filter(
        (m) =>
          (m.product_name && m.product_name.toLowerCase().includes(s)) ||
          (m.notes && m.notes.toLowerCase().includes(s)) ||
          (m.reference_id && m.reference_id.toLowerCase().includes(s)) ||
          m.movement_type.toLowerCase().includes(s)
      );
    }

    if (options?.typeFilter && options.typeFilter !== 'ALL') {
      movements = movements.filter((m) => m.movement_type === options.typeFilter);
    }

    const totalCount = movements.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const paginatedData = movements.slice(from, from + pageSize);

    return {
      data: paginatedData,
      page,
      pageSize,
      totalCount,
      totalPages,
    };
  },

  async getInventoryMetrics() {
    const { data: products } = await this.getProducts();
    const totalItems = products.length;

    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalValuation = 0;

    for (const p of products) {
      const stock = Number(p.stock_qty || 0);
      const minAlert = Number(p.min_stock_alert || 0);
      const costPrice = Number(p.cost_price || p.price || 0);

      totalValuation += stock * costPrice;

      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= minAlert) {
        lowStockCount++;
      } else {
        inStockCount++;
      }
    }

    return {
      totalItems,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      totalValuation,
    };
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

    // 1. Indian Mobile Number Validation
    if (!isValidIndianMobile(customerData.phone)) {
      throw new Error('Please enter a valid 10-digit Indian mobile number.');
    }

    // 2. GSTIN Validation if provided
    if (customerData.gstin && !isValidGstin(customerData.gstin)) {
      throw new Error('Invalid GSTIN format. Example format: 27AAAAA0000A1Z5');
    }

    // 3. Shop-scoped Duplicate Mobile Check
    const cleanPhoneInput = customerData.phone.replace(/\D/g, '').slice(-10);
    const existingCustomers = await this.getCustomers();
    const duplicate = existingCustomers.find((c) => {
      if (customerData.id && c.id === customerData.id) return false;
      const existingClean = c.phone ? c.phone.replace(/\D/g, '').slice(-10) : '';
      return existingClean === cleanPhoneInput && cleanPhoneInput.length === 10;
    });

    if (duplicate) {
      throw new Error(`Customer with mobile number "${customerData.phone}" already exists in your shop.`);
    }

    const payload = {
      name: customerData.name.trim(),
      phone: customerData.phone.trim(),
      email: (customerData.email || '').trim(),
      address: (customerData.address || '').trim(),
      gstin: (customerData.gstin || '').trim().toUpperCase(),
      credit_limit: Number(customerData.credit_limit || 5000),
    };

    if (customerData.id && isValidUuid(customerData.id)) {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', customerData.id)
          .eq('shop_id', shop.id);

        if (error) {
          console.error('[Supabase updateCustomer Error]', error);
          throw new Error(`[${error.code}] ${error.message}`);
        }
      }

      const index = existingCustomers.findIndex((c) => c.id === customerData.id);
      const updated: Customer = {
        ...(index !== -1 ? existingCustomers[index] : {}),
        id: customerData.id,
        shop_id: shop.id,
        ...payload,
        total_due: index !== -1 ? existingCustomers[index].total_due : 0,
        created_at: index !== -1 ? existingCustomers[index].created_at : new Date().toISOString(),
      };
      if (index !== -1) existingCustomers[index] = updated;
      Storage.setCustomers(existingCustomers);
      return updated;
    }

    const newId = generateUuid();
    const newCustomer: Customer = {
      id: newId,
      shop_id: shop.id,
      ...payload,
      total_due: 0,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('customers').insert({
        id: newId,
        shop_id: shop.id,
        ...payload,
        total_due: 0,
      });

      if (error) {
        console.error('[Supabase saveCustomer Insert Error]', error);
        throw new Error(`[${error.code}] ${error.message}`);
      }
    }

    Storage.setCustomers([newCustomer, ...existingCustomers]);
    return newCustomer;
  },

  async deleteCustomer(id: string): Promise<boolean> {
    const shop = await this.getAuthenticatedShop();
    if (isSupabaseConfigured() && isValidUuid(id)) {
      const { error } = await supabase.from('customers').delete().eq('id', id).eq('shop_id', shop.id);
      if (error) {
        console.error('[Supabase deleteCustomer Error]', error);
        throw new Error(`[${error.code}] ${error.message}`);
      }
    }
    const existing = Storage.getCustomers();
    Storage.setCustomers(existing.filter((c) => c.id !== id));
    return true;
  },

  async receiveCustomerPayment(params: {
    customerId: string;
    amount: number;
    paymentMode: PaymentMode;
    referenceNo?: string;
    notes?: string;
    invoiceId?: string;
  }): Promise<Payment[]> {
    const shop = await this.getAuthenticatedShop();
    const customers = await this.getCustomers();
    const customer = customers.find((c) => c.id === params.customerId);
    if (!customer) throw new Error('Customer not found');

    const paymentAmount = Number(params.amount);
    if (paymentAmount <= 0) throw new Error('Payment amount must be greater than 0');

    const allInvoices = await this.getInvoices();
    let targetInvoices = allInvoices.filter(
      (inv) => inv.customer_id === params.customerId && inv.status !== 'CANCELLED' && inv.due_amount > 0
    );

    if (params.invoiceId) {
      targetInvoices = targetInvoices.filter((inv) => inv.id === params.invoiceId);
    } else {
      // Sort oldest due date first (FIFO allocation)
      targetInvoices.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    let remainingPayment = paymentAmount;
    const createdPayments: Payment[] = [];

    for (const inv of targetInvoices) {
      if (remainingPayment <= 0) break;

      const allocation = Math.min(remainingPayment, inv.due_amount);
      const newPaidAmount = inv.paid_amount + allocation;
      const newDueAmount = Math.max(0, inv.total_amount - newPaidAmount);
      const newStatus = newDueAmount === 0 ? 'paid' : (newPaidAmount > 0 ? 'partially_paid' : 'unpaid');

      if (isSupabaseConfigured() && isValidUuid(inv.id)) {
        await supabase
          .from('invoices')
          .update({
            paid_amount: newPaidAmount,
            due_amount: newDueAmount,
            payment_status: newStatus,
          })
          .eq('id', inv.id)
          .eq('shop_id', shop.id);
      }

      const paymentId = generateUuid();
      const paymentRecord: Payment = {
        id: paymentId,
        shop_id: shop.id,
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        amount: allocation,
        payment_mode: params.paymentMode,
        reference_no: params.referenceNo || '',
        notes: params.notes || 'Udhar clearance payment',
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured()) {
        await supabase.from('payments').insert({
          id: paymentId,
          shop_id: shop.id,
          invoice_id: inv.id,
          customer_id: customer.id,
          amount: allocation,
          payment_method: params.paymentMode.toLowerCase(),
          reference_number: params.referenceNo || null,
          notes: params.notes || null,
          created_at: paymentRecord.created_at,
        });
      }

      createdPayments.push(paymentRecord);
      remainingPayment -= allocation;
    }

    // Update customer total_due
    const newCustomerDue = Math.max(0, customer.total_due - paymentAmount);
    customer.total_due = newCustomerDue;
    if (isSupabaseConfigured() && isValidUuid(customer.id)) {
      await supabase
        .from('customers')
        .update({ total_due: newCustomerDue })
        .eq('id', customer.id)
        .eq('shop_id', shop.id);
    }

    const existingPayments = Storage.getPayments();
    Storage.setPayments([...createdPayments, ...existingPayments]);
    Storage.setCustomers(customers);

    return createdPayments;
  },

  async recordCustomerPayment(
    customerId: string,
    amount: number,
    paymentMode: PaymentMode,
    referenceNo?: string,
    notes?: string
  ): Promise<void> {
    await this.receiveCustomerPayment({ customerId, amount, paymentMode, referenceNo, notes });
  },

  async getCustomersWithDue(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<PaginatedResult<Customer & { unpaid_invoice_count: number; oldest_due_date: string | null; last_payment_date: string | null }>> {
    const page = Math.max(1, options?.page || 1);
    const pageSize = Math.max(1, options?.pageSize || 10);
    const from = (page - 1) * pageSize;

    const allCustomers = await this.getCustomers();
    const allInvoices = await this.getInvoices();
    const allPaymentsRes = await this.getPaginatedPayments({ pageSize: 1000 });
    const allPayments = allPaymentsRes.data;

    let dueCustomers = allCustomers
      .map((cust) => {
        const custInvoices = allInvoices.filter(
          (inv) => inv.customer_id === cust.id && inv.status !== 'CANCELLED' && inv.due_amount > 0
        );
        const unpaid_invoice_count = custInvoices.length;

        const sortedInvoiceDates = custInvoices
          .map((inv) => inv.created_at)
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        const oldest_due_date = sortedInvoiceDates.length > 0 ? sortedInvoiceDates[0] : null;

        const custPayments = allPayments.filter((p) => p.customer_id === cust.id);
        const sortedPaymentDates = custPayments
          .map((p) => p.created_at)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        const last_payment_date = sortedPaymentDates.length > 0 ? sortedPaymentDates[0] : null;

        const totalDueFromInvoices = custInvoices.reduce((sum, inv) => sum + inv.due_amount, 0);
        const totalDue = totalDueFromInvoices > 0 ? totalDueFromInvoices : cust.total_due;

        return {
          ...cust,
          total_due: totalDue,
          unpaid_invoice_count,
          oldest_due_date,
          last_payment_date,
        };
      })
      .filter((cust) => cust.total_due > 0 || cust.unpaid_invoice_count > 0);

    if (options?.search) {
      const search = options.search.toLowerCase().trim();
      dueCustomers = dueCustomers.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          (c.phone && c.phone.includes(search)) ||
          (c.email && c.email.toLowerCase().includes(search))
      );
    }

    const totalCount = dueCustomers.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const paginatedData = dueCustomers.slice(from, from + pageSize);

    return {
      data: paginatedData,
      page,
      pageSize,
      totalCount,
      totalPages,
    };
  },

  async getCustomerDueDetails(customerId: string): Promise<{
    customer: Customer | null;
    invoices: Invoice[];
    totalDue: number;
  }> {
    const customers = await this.getCustomers();
    const customer = customers.find((c) => c.id === customerId) || null;

    const allInvoices = await this.getInvoices();
    const customerDueInvoices = allInvoices.filter(
      (inv) => inv.customer_id === customerId && inv.status !== 'CANCELLED' && inv.due_amount > 0
    );

    const totalDue = customerDueInvoices.reduce((sum, inv) => sum + inv.due_amount, 0);

    return {
      customer,
      invoices: customerDueInvoices,
      totalDue: totalDue || (customer ? customer.total_due : 0),
    };
  },

  async getPaginatedPayments(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    customerId?: string;
  }): Promise<PaginatedResult<Payment>> {
    const page = Math.max(1, options?.page || 1);
    const pageSize = Math.max(1, options?.pageSize || 10);
    const from = (page - 1) * pageSize;

    let payments: Payment[] = [];

    if (isSupabaseConfigured()) {
      try {
        const shop = await this.getAuthenticatedShop();
        let query = supabase.from('payments').select('*, invoices(invoice_number), customers(name, phone)');
        if (shop && isValidUuid(shop.id)) {
          query = query.eq('shop_id', shop.id);
        }
        if (options?.customerId) {
          query = query.eq('customer_id', options.customerId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });

        if (!error && data) {
          payments = data.map((p: any) => ({
            id: p.id,
            shop_id: p.shop_id || shop.id,
            invoice_id: p.invoice_id,
            invoice_number: p.invoices?.invoice_number || p.invoice_number || '',
            customer_id: p.customer_id,
            customer_name: p.customers?.name || p.customer_name || 'Customer',
            customer_phone: p.customers?.phone || p.customer_phone || '',
            amount: Number(p.amount || 0),
            payment_mode: (String(p.payment_method || 'UPI').toUpperCase()) as PaymentMode,
            reference_no: p.reference_number || p.reference_no || '',
            notes: p.notes || '',
            created_at: p.created_at || new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.warn('[Supabase getPaginatedPayments Error]', err);
      }
    }

    if (payments.length === 0) {
      payments = Storage.getPayments();
      if (options?.customerId) {
        payments = payments.filter((p) => p.customer_id === options.customerId);
      }
    }

    if (options?.search) {
      const s = options.search.toLowerCase().trim();
      payments = payments.filter(
        (p) =>
          (p.customer_name && p.customer_name.toLowerCase().includes(s)) ||
          (p.customer_phone && p.customer_phone.includes(s)) ||
          (p.invoice_number && p.invoice_number.toLowerCase().includes(s)) ||
          (p.reference_no && p.reference_no.toLowerCase().includes(s)) ||
          p.payment_mode.toLowerCase().includes(s)
      );
    }

    const totalCount = payments.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const paginatedData = payments.slice(from, from + pageSize);

    return {
      data: paginatedData,
      page,
      pageSize,
      totalCount,
      totalPages,
    };
  },

  async getCustomerById(customerId: string): Promise<{
    customer: Customer | null;
    stats: {
      totalPurchases: number;
      orderCount: number;
      totalPaid: number;
      totalDue: number;
      lastPurchaseDate: string | null;
    };
  }> {
    const customers = await this.getCustomers();
    const customer = customers.find((c) => c.id === customerId) || null;

    const allInvoices = await this.getInvoices();
    const customerInvoices = allInvoices.filter((inv) => inv.customer_id === customerId);
    const nonCancelledInvoices = customerInvoices.filter((inv) => inv.status !== 'CANCELLED');

    const totalPurchases = nonCancelledInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const orderCount = nonCancelledInvoices.length;
    const totalPaid = nonCancelledInvoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
    const totalDue = customer ? customer.total_due : nonCancelledInvoices.reduce((sum, inv) => sum + inv.due_amount, 0);

    const sortedDates = nonCancelledInvoices
      .map((inv) => inv.created_at)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const lastPurchaseDate = sortedDates.length > 0 ? sortedDates[0] : null;

    return {
      customer,
      stats: {
        totalPurchases,
        orderCount,
        totalPaid,
        totalDue,
        lastPurchaseDate,
      },
    };
  },

  async getCustomerInvoices(
    customerId: string,
    options?: { page?: number; pageSize?: number; search?: string }
  ): Promise<PaginatedResult<Invoice>> {
    const page = Math.max(1, options?.page || 1);
    const pageSize = Math.max(1, options?.pageSize || 10);
    const from = (page - 1) * pageSize;

    const allInvoices = await this.getInvoices();
    let customerInvoices = allInvoices.filter((inv) => inv.customer_id === customerId);

    if (options?.search) {
      const s = options.search.toLowerCase().trim();
      customerInvoices = customerInvoices.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(s) ||
          inv.payment_mode.toLowerCase().includes(s) ||
          inv.payment_status.toLowerCase().includes(s)
      );
    }

    const totalCount = customerInvoices.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const paginatedData = customerInvoices.slice(from, from + pageSize);

    return {
      data: paginatedData,
      page,
      pageSize,
      totalCount,
      totalPages,
    };
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
          
          let payments: any[] = [];
          try {
            const { data: payData } = await supabase.from('payments').select('*');
            if (payData) payments = payData;
          } catch {
            // Silently handle if payments table is empty or missing columns
          }

          const normalized: Invoice[] = data.map((inv: any) => {
            const cust = customers.find((c) => c.id === inv.customer_id);
            const customerName = inv.customer_name || (cust ? cust.name : 'Walk-in Customer');
            const customerPhone = inv.customer_phone || (cust ? cust.phone : '');
            
            const rawStatus = String(inv.payment_status || 'paid').toUpperCase();
            const paymentMode = inv.payment_mode || (rawStatus === 'UNPAID' ? 'CREDIT' : 'CASH');

            const matchedPayment = payments.find((p) => p.invoice_id === inv.id);
            const referenceNo = matchedPayment?.reference_number || matchedPayment?.reference_no || '';

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

            const invPayments = payments.filter((p) => p.invoice_id === inv.id);
            const totalPaymentsForInv = invPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

            let paidAmount = inv.paid_amount !== undefined && inv.paid_amount !== null
              ? Number(inv.paid_amount)
              : (rawStatus === 'UNPAID' ? totalPaymentsForInv : (rawStatus === 'PARTIAL' || rawStatus === 'PARTIALLY_PAID' ? totalPaymentsForInv : totalAmount));

            let dueAmount = inv.due_amount !== undefined && inv.due_amount !== null
              ? Number(inv.due_amount)
              : Math.max(0, totalAmount - paidAmount);

            let normStatus = rawStatus;
            if (dueAmount <= 0) {
              normStatus = 'PAID';
            } else if (paidAmount > 0) {
              normStatus = 'PARTIALLY_PAID';
            } else {
              normStatus = 'UNPAID';
            }

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
              paid_amount: paidAmount,
              due_amount: dueAmount,
              payment_status: normStatus as any,
              payment_mode: paymentMode as any,
              status: String(inv.status || 'COMPLETED').toUpperCase() as any,
              notes: referenceNo ? `Ref: ${referenceNo}` : (inv.notes || ''),
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

  async getPaginatedInvoices(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    statusFilter?: string;
    modeFilter?: string;
    dateFilter?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResult<Invoice>> {
    const page = Math.max(1, options?.page || 1);
    const pageSize = Math.max(1, options?.pageSize || 10);
    const from = (page - 1) * pageSize;

    const allInvoices = await this.getInvoices();

    let filtered = allInvoices.filter((inv) => {
      const statusUpper = String(inv.payment_status || '').toUpperCase();
      const modeUpper = String(inv.payment_mode || '').toUpperCase();

      const matchesStatus = !options?.statusFilter || options.statusFilter === 'ALL' || statusUpper === options.statusFilter.toUpperCase();
      const matchesMode = !options?.modeFilter || options.modeFilter === 'ALL' || modeUpper === options.modeFilter.toUpperCase();

      const search = (options?.search || '').toLowerCase().trim();
      const matchesSearch =
        !search ||
        inv.invoice_number.toLowerCase().includes(search) ||
        (inv.customer_name && inv.customer_name.toLowerCase().includes(search)) ||
        (inv.customer_phone && inv.customer_phone.includes(search));

      let matchesDate = true;
      const invDateStr = inv.created_at ? inv.created_at.slice(0, 10) : '';
      const todayStr = new Date().toISOString().slice(0, 10);

      if (options?.dateFilter === 'TODAY') {
        matchesDate = invDateStr === todayStr;
      } else if (options?.dateFilter === 'THIS_WEEK') {
        const now = new Date();
        const weekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString().slice(0, 10);
        matchesDate = invDateStr >= weekAgo;
      } else if (options?.dateFilter === 'THIS_MONTH') {
        const currentMonth = new Date().toISOString().slice(0, 7);
        matchesDate = invDateStr.startsWith(currentMonth);
      } else if (options?.dateFilter === 'CUSTOM') {
        if (options.startDate && invDateStr < options.startDate) matchesDate = false;
        if (options.endDate && invDateStr > options.endDate) matchesDate = false;
      }

      return matchesStatus && matchesMode && matchesSearch && matchesDate;
    });

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const paginatedData = filtered.slice(from, from + pageSize);

    return {
      data: paginatedData,
      page,
      pageSize,
      totalCount,
      totalPages,
    };
  },

  async getPaginatedProducts(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
  }): Promise<{ data: Product[]; page: number; pageSize: number; totalCount: number; totalPages: number; error: string | null }> {
    const page = Math.max(1, options?.page || 1);
    const pageSize = Math.max(1, options?.pageSize || 10);
    const from = (page - 1) * pageSize;

    const { data: allProds, error } = await this.getProducts();
    if (error) {
      return { data: [], page: 1, pageSize, totalCount: 0, totalPages: 1, error };
    }

    let filtered = allProds;
    if (options?.category && options.category !== 'ALL') {
      filtered = filtered.filter((p) => p.category === options.category);
    }

    if (options?.search) {
      const search = options.search.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          (p.name_hindi && p.name_hindi.toLowerCase().includes(search)) ||
          (p.barcode && p.barcode.includes(search)) ||
          (p.category && p.category.toLowerCase().includes(search))
      );
    }

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const paginatedData = filtered.slice(from, from + pageSize);

    return {
      data: paginatedData,
      page,
      pageSize,
      totalCount,
      totalPages,
      error: null,
    };
  },

  async getPaginatedCustomers(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    onlyPendingDue?: boolean;
  }): Promise<PaginatedResult<Customer>> {
    const page = Math.max(1, options?.page || 1);
    const pageSize = Math.max(1, options?.pageSize || 10);
    const from = (page - 1) * pageSize;

    const allCustomers = await this.getCustomers();
    const allInvoices = await this.getInvoices();

    const enriched = allCustomers.map((cust) => {
      const custInvoices = allInvoices.filter((inv) => inv.customer_id === cust.id && inv.status !== 'CANCELLED');
      const total_purchases = custInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      const order_count = custInvoices.length;
      const sortedDates = custInvoices
        .map((inv) => inv.created_at)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      const last_purchase_date = sortedDates.length > 0 ? sortedDates[0] : undefined;

      return {
        ...cust,
        total_purchases,
        order_count,
        last_purchase_date,
      };
    });

    let filtered = enriched;

    if (options?.onlyPendingDue) {
      filtered = filtered.filter((c) => c.total_due > 0);
    }

    if (options?.search) {
      const search = options.search.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          (c.phone && c.phone.includes(search)) ||
          (c.email && c.email.toLowerCase().includes(search)) ||
          (c.gstin && c.gstin.toLowerCase().includes(search))
      );
    }

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const paginatedData = filtered.slice(from, from + pageSize);

    return {
      data: paginatedData,
      page,
      pageSize,
      totalCount,
      totalPages,
    };
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

    // Stock availability validation
    for (const item of params.items) {
      const liveProduct = products.find((p) => p.id === item.product.id) || item.product;
      if (liveProduct.stock_qty < item.quantity) {
        throw new Error(
          `Insufficient stock for "${liveProduct.name}". Available stock: ${liveProduct.stock_qty} ${liveProduct.unit || 'Pcs'}, Requested: ${item.quantity}`
        );
      }
    }

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

    // 4. Update stock for sold products and record SALE movement history
    for (const item of params.items) {
      await this.recordStockMovement({
        productId: item.product.id,
        movementType: 'SALE',
        quantityChange: item.quantity,
        notes: `POS Sale Invoice #${invoiceNumber}`,
        referenceType: 'INVOICE',
        referenceId: invoiceNumber,
      });
    }

    // 5. Update customer's outstanding total_due if Udhar or partial payment
    if (newInvoice.customer_id && newInvoice.due_amount > 0) {
      try {
        const customers = await this.getCustomers();
        const targetCustomer = customers.find((c) => c.id === newInvoice.customer_id);
        if (targetCustomer) {
          const updatedDue = targetCustomer.total_due + newInvoice.due_amount;
          targetCustomer.total_due = updatedDue;
          Storage.setCustomers(customers);

          if (isSupabaseConfigured() && isValidUuid(newInvoice.customer_id)) {
            await supabase.from('customers').update({ total_due: updatedDue }).eq('id', newInvoice.customer_id).eq('shop_id', shop.id);
          }
        }
      } catch (custErr) {
        console.warn('[Customer Total Due Sync Error]', custErr);
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
