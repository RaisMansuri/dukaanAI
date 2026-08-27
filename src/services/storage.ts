import {
  Shop,
  GstSettings,
  Product,
  Customer,
  Invoice,
  Payment,
  StockMovement,
  Profile,
  HeldBill,
} from '@/types/database';
import {
  INITIAL_PROFILE,
  INITIAL_SHOP,
  INITIAL_GST_SETTINGS,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_STOCK_MOVEMENTS,
} from './mockData';

const KEYS = {
  PROFILE: 'dukaan_profile',
  SHOP: 'dukaan_shop',
  GST: 'dukaan_gst',
  PRODUCTS: 'dukaan_products',
  CUSTOMERS: 'dukaan_customers',
  INVOICES: 'dukaan_invoices',
  PAYMENTS: 'dukaan_payments',
  STOCK_MOVEMENTS: 'dukaan_stock_movements',
  HELD_BILLS: 'dukaan_held_bills',
  NOTIFICATION_SETTINGS: 'dukaan_notification_settings',
  NOTIFICATION_LOGS: 'dukaan_notification_logs',
};

const isBrowser = typeof window !== 'undefined';

function getItem<T>(key: string, defaultValue: T): T {
  if (!isBrowser) return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('dukaan_storage_update'));
  } catch (e) {
    console.error('Storage set error:', e);
  }
}

export const Storage = {
  getProfile: (): Profile => getItem(KEYS.PROFILE, INITIAL_PROFILE),
  setProfile: (profile: Profile) => setItem(KEYS.PROFILE, profile),

  getShop: (): Shop => getItem(KEYS.SHOP, INITIAL_SHOP),
  setShop: (shop: Shop) => setItem(KEYS.SHOP, shop),

  getGstSettings: (): GstSettings => getItem(KEYS.GST, INITIAL_GST_SETTINGS),
  setGstSettings: (gst: GstSettings) => setItem(KEYS.GST, gst),

  getProducts: (): Product[] => getItem(KEYS.PRODUCTS, INITIAL_PRODUCTS),
  setProducts: (products: Product[]) => setItem(KEYS.PRODUCTS, products),

  getCustomers: (): Customer[] => getItem(KEYS.CUSTOMERS, INITIAL_CUSTOMERS),
  setCustomers: (customers: Customer[]) => setItem(KEYS.CUSTOMERS, customers),

  getInvoices: (): Invoice[] => getItem(KEYS.INVOICES, INITIAL_INVOICES),
  setInvoices: (invoices: Invoice[]) => setItem(KEYS.INVOICES, invoices),

  getPayments: (): Payment[] => getItem(KEYS.PAYMENTS, INITIAL_PAYMENTS),
  setPayments: (payments: Payment[]) => setItem(KEYS.PAYMENTS, payments),

  getStockMovements: (): StockMovement[] => getItem(KEYS.STOCK_MOVEMENTS, INITIAL_STOCK_MOVEMENTS),
  setStockMovements: (movements: StockMovement[]) => setItem(KEYS.STOCK_MOVEMENTS, movements),

  getHeldBills: (): HeldBill[] => getItem(KEYS.HELD_BILLS, []),
  setHeldBills: (bills: HeldBill[]) => setItem(KEYS.HELD_BILLS, bills),

  getNotificationSettings: (): any => getItem(KEYS.NOTIFICATION_SETTINGS, null),
  setNotificationSettings: (settings: any) => setItem(KEYS.NOTIFICATION_SETTINGS, settings),

  getNotificationLogs: (): any[] => getItem(KEYS.NOTIFICATION_LOGS, []),
  setNotificationLogs: (logs: any[]) => setItem(KEYS.NOTIFICATION_LOGS, logs),

  resetAll: () => {
    if (!isBrowser) return;
    localStorage.clear();
    window.dispatchEvent(new Event('dukaan_storage_update'));
  },
};
