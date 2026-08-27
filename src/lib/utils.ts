/**
 * Indian Rupee Formatting (e.g. ₹1,25,000.00)
 */
export function formatRupee(amount: number | null | undefined): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0.00';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatRupeeShort(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} Lakh`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}k`;
  }
  return formatRupee(amount);
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatShortDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function generateInvoiceNumber(prefix = 'INV'): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${randomNum}`;
}

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isValidUuid(str: string): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(str);
}

/**
 * Standard Indian GST-Inclusive Calculation Formula
 * taxableAmount = total * 100 / (100 + gstRate)
 * gstAmount = total - taxableAmount
 */
export function calculateGST(
  price: number,
  quantity: number,
  gstRate: number
): { taxableAmount: number; basePrice: number; gstAmount: number; total: number; cgst: number; sgst: number } {
  const lineTotal = price * quantity;
  const taxableAmount = (lineTotal * 100) / (100 + gstRate);
  const gstAmount = lineTotal - taxableAmount;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;

  return {
    taxableAmount: Number(taxableAmount.toFixed(2)),
    basePrice: Number(taxableAmount.toFixed(2)),
    gstAmount: Number(gstAmount.toFixed(2)),
    total: Number(lineTotal.toFixed(2)),
    cgst: Number(cgst.toFixed(2)),
    sgst: Number(sgst.toFixed(2)),
  };
}

export function isValidIndianMobile(phone: string): boolean {
  if (!phone) return false;
  const digitsOnly = phone.replace(/\D/g, '');
  // Should be 10 digits starting with 6, 7, 8, or 9 (or 12 digits if starting with 91)
  if (digitsOnly.length === 10) {
    return /^[6-9]\d{9}$/.test(digitsOnly);
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return /^[6-9]\d{9}$/.test(digitsOnly.slice(2));
  }
  return false;
}

export function isValidGstin(gstin: string): boolean {
  if (!gstin) return true; // optional
  const trimmed = gstin.trim().toUpperCase();
  if (trimmed.length === 0) return true;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(trimmed);
}

