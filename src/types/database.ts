export type Role = 'owner' | 'cashier' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  mobile_number?: string;
  role: Role;
  created_at: string;
}

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  phone: string;
  gst_number: string;
  state_code: string;
  logo_url?: string;
  created_at: string;
}

export interface GstSettings {
  id: string;
  shop_id: string;
  is_gst_enabled: boolean;
  default_gst_rate: number;
  composite_scheme: boolean;
  composition_rate: number;
}

export type UnitType = 'Pcs' | 'Kg' | 'Gm' | 'Ltr' | 'Ml' | 'Pack' | 'Box' | 'Bottle';

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  name_hindi?: string;
  category: string;
  barcode: string;
  price: number; // Selling price (incl or excl tax)
  cost_price: number;
  gst_rate: number; // e.g. 0, 5, 12, 18, 28
  hsn_code: string;
  stock_qty: number;
  min_stock_alert: number;
  unit: UnitType;
  created_at: string;
}

export interface Customer {
  id: string;
  shop_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  total_due: number; // Pending credit (udhar) amount
  credit_limit: number;
  created_at: string;
}

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'CREDIT';
export type InvoiceStatus = 'COMPLETED' | 'CANCELLED' | 'HELD';

export interface Invoice {
  id: string;
  shop_id: string;
  customer_id?: string | null;
  customer_name?: string;
  customer_phone?: string;
  invoice_number: string;
  subtotal: number;
  discount_amount: number;
  gst_amount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_status: PaymentStatus;
  payment_mode: PaymentMode;
  status: InvoiceStatus;
  notes?: string;
  created_at: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  gst_amount: number;
  total: number;
}

export interface Payment {
  id: string;
  invoice_id?: string | null;
  customer_id: string;
  amount: number;
  payment_mode: PaymentMode;
  reference_no?: string;
  notes?: string;
  created_at: string;
}

export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  product_id: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
  created_at: string;
}

export interface HeldBill {
  id: string;
  customer_id?: string | null;
  customer_name?: string;
  items: {
    product: Product;
    quantity: number;
    discount: number;
  }[];
  notes?: string;
  created_at: string;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
