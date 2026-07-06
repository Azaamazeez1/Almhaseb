export interface Item {
  id: string;
  code: string; // Barcode or Item ID
  name: string;
  stock: number; // Quantity in stock
  unit: string; // e.g. "حبة", "متر"
  unitCost: number; // Cost price (سعر التكلفة)
  salePrice: number; // Selling price (سعر البيع)
  currency: string; // e.g. "YER", "SAR", "USD"
  lastPurchasePrice: number; // Price of the last purchase
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number; // Positive: we want money from them (لنا), Negative: they want money from us (علينا)
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  balance: number; // Positive: they want money from us (علينا), Negative: we want money from them (لنا)
}

export type TransactionType =
  | 'sale'             // مبيعات
  | 'purchase'         // مشتريات
  | 'sale_return'      // مرتجع مبيعات
  | 'purchase_return'  // مرتجع مشتريات
  | 'receipt_voucher'   // سند قبض (تحصيل)
  | 'payment_voucher'   // سند صرف (سداد)
  | 'initial_balance'; // رصيد افتتاحي

export interface Transaction {
  id: string;
  invoiceNumber?: string; // Document / invoice number
  date: string;
  type: TransactionType;
  partyId?: string; // Customer or Supplier ID
  partyName?: string; // Cached name
  amount: number;
  discount?: number;
  cashPaid: number; // Amount paid in cash (goes to الصندوق)
  creditAmount: number; // Remaining amount added to Customer/Supplier balance
  details: string;
  items?: {
    itemId: string;
    itemName: string;
    qty: number;
    price: number;
    cost?: number; // Cost at time of transaction for profit calculations
  }[];
}

export interface AppConfig {
  appName: string;
  logoUrl?: string;
  currency: string;
  financialYear: string;
  thermalPrinterWidth: '58mm' | '80mm';
}

export interface UserAccount {
  email: string;
  fullName: string;
  companyName: string;
  countryRegion: string;
  phone?: string;
}

