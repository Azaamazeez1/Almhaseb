import { Item, Customer, Supplier, Transaction, AppConfig } from './types';

// Default mock items based on the user's screenshots
export const DEFAULT_ITEMS: Item[] = [
  { id: 'item-1', code: '101', name: 'زياتي تجاري', stock: 15, unit: 'حبة', unitCost: 6.0, salePrice: 8.5, currency: 'YER', lastPurchasePrice: 6.0 },
  { id: 'item-2', code: '102', name: 'عازل زيتي', stock: 24, unit: 'حبة', unitCost: 1.50, salePrice: 2.50, currency: 'YER', lastPurchasePrice: 1.50 },
  { id: 'item-3', code: '103', name: 'قشرة رول عادي شبك', stock: 40, unit: 'حبة', unitCost: 0.68, salePrice: 1.20, currency: 'YER', lastPurchasePrice: 0.68 },
  { id: 'item-4', code: '104', name: 'قطرونة', stock: 35, unit: 'حبة', unitCost: 0.90, salePrice: 1.50, currency: 'YER', lastPurchasePrice: 0.90 },
  { id: 'item-5', code: '105', name: 'مشط طرش', stock: 50, unit: 'حبة', unitCost: 0.90, salePrice: 1.40, currency: 'YER', lastPurchasePrice: 0.90 }
];

export const DEFAULT_CUSTOMERS: Customer[] = [
  { id: 'cust-1', name: 'أحمد علي محمد', phone: '777123456', balance: 120.0 },
  { id: 'cust-2', name: 'محلات الأمل التجارية', phone: '711987654', balance: 350.0 },
  { id: 'cust-3', name: 'صالح عبدالله الكبسي', phone: '733555222', balance: 0.0 }
];

export const DEFAULT_SUPPLIERS: Supplier[] = [
  { id: 'supp-1', name: 'مجموعة الهلال التجارية', phone: '771444555', balance: 210.0 },
  { id: 'supp-2', name: 'مستودعات الفهد للمواد', phone: '701222333', balance: 0.0 }
];

// Seed some initial transactions that build the box balance and profits shown in the screenshot
// Box balance shown is 762.20, Profits shown is 289.99 (or similar)
export const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-initial',
    date: '2026-07-01T08:00:00Z',
    type: 'initial_balance',
    amount: 500.0,
    cashPaid: 500.0,
    creditAmount: 0.0,
    details: 'رصيد الصندوق الإفتتاحي للموسم المالي'
  },
  {
    id: 'tx-purchase-1',
    invoiceNumber: 'P-1001',
    date: '2026-07-02T10:30:00Z',
    type: 'purchase',
    partyId: 'supp-1',
    partyName: 'مجموعة الهلال التجارية',
    amount: 210.0,
    cashPaid: 0.0,
    creditAmount: 210.0,
    details: 'شراء بضائع بالآجل',
    items: [
      { itemId: 'item-1', itemName: 'زياتي تجاري', qty: 15, price: 6.0, cost: 6.0 },
      { itemId: 'item-2', itemName: 'عازل زيتي', qty: 24, price: 1.50, cost: 1.50 },
      { itemId: 'item-3', itemName: 'قشرة رول عادي شبك', qty: 40, price: 0.68, cost: 0.68 },
      { itemId: 'item-4', itemName: 'قطرونة', qty: 35, price: 0.90, cost: 0.90 },
      { itemId: 'item-5', itemName: 'مشط طرش', qty: 50, price: 0.90, cost: 0.90 }
    ]
  },
  {
    id: 'tx-sale-1',
    invoiceNumber: 'S-2001',
    date: '2026-07-03T14:15:00Z',
    type: 'sale',
    partyId: 'cust-2',
    partyName: 'محلات الأمل التجارية',
    amount: 612.20,
    cashPaid: 262.20,
    creditAmount: 350.0,
    details: 'فاتورة مبيعات نقدية وجزئية آجل',
    items: [
      { itemId: 'item-1', itemName: 'زياتي تجاري', qty: 10, price: 8.5, cost: 6.0 }, // profit: 2.5 * 10 = 25
      { itemId: 'item-2', itemName: 'عازل زيتي', qty: 15, price: 2.50, cost: 1.50 }, // profit: 1.0 * 15 = 15
      { itemId: 'item-3', itemName: 'قشرة رول عادي شبك', qty: 30, price: 1.20, cost: 0.68 }, // profit: 0.52 * 30 = 15.6
      { itemId: 'item-4', itemName: 'قطرونة', qty: 20, price: 1.50, cost: 0.90 }, // profit: 0.60 * 20 = 12
      { itemId: 'item-5', itemName: 'مشط طرش', qty: 30, price: 1.40, cost: 0.90 } // profit: 0.50 * 30 = 15
    ]
  },
  {
    id: 'tx-receipt-1',
    invoiceNumber: 'R-3001',
    date: '2026-07-03T16:00:00Z',
    type: 'receipt_voucher',
    partyId: 'cust-1',
    partyName: 'أحمد علي محمد',
    amount: 120.0,
    cashPaid: 120.0,
    creditAmount: -120.0, // reduces customer balance
    details: 'سند قبض - دفعة من الحساب من العميل أحمد علي'
  },
  {
    id: 'tx-sale-2',
    invoiceNumber: 'S-2002',
    date: '2026-07-04T09:45:00Z',
    type: 'sale',
    partyId: 'cust-1',
    partyName: 'أحمد علي محمد',
    amount: 320.0,
    cashPaid: 200.0,
    creditAmount: 120.0,
    details: 'فاتورة مبيعات جزئية',
    items: [
      { itemId: 'item-1', itemName: 'زياتي تجاري', qty: 5, price: 8.5, cost: 6.0 }, // profit 12.5
      { itemId: 'item-2', itemName: 'عازل زيتي', qty: 9, price: 2.50, cost: 1.50 }, // profit 9.0
      { itemId: 'item-3', itemName: 'قشرة رول عادي شبك', qty: 10, price: 1.20, cost: 0.68 }, // profit 5.2
      { itemId: 'item-4', itemName: 'قطرونة', qty: 15, price: 1.50, cost: 0.90 }, // profit 9.0
      { itemId: 'item-5', itemName: 'مشط طرش', qty: 20, price: 1.40, cost: 0.90 } // profit 10.0
    ]
  }
];

export const DEFAULT_CONFIG: AppConfig = {
  appName: 'بيبرس للمحاسبة',
  currency: 'USD',
  financialYear: '2026',
  thermalPrinterWidth: '80mm'
};

// Local storage keys
const STORAGE_PREFIX = 'acct_inv_';
const KEYS = {
  ITEMS: `${STORAGE_PREFIX}items`,
  CUSTOMERS: `${STORAGE_PREFIX}customers`,
  SUPPLIERS: `${STORAGE_PREFIX}suppliers`,
  TRANSACTIONS: `${STORAGE_PREFIX}transactions`,
  CONFIG: `${STORAGE_PREFIX}config`
};

export function loadData<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading localStorage', e);
  }
  return defaultValue;
}

export function saveData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error writing localStorage', e);
  }
}

// Global data states loaded or initialized
export function getInitialState() {
  const initialized = localStorage.getItem(`${STORAGE_PREFIX}initialized`);
  if (!initialized) {
    // Start with a completely blank database
    localStorage.setItem(`${STORAGE_PREFIX}initialized`, 'true');
    saveAllStates({
      items: [],
      customers: [],
      suppliers: [],
      transactions: [],
      config: DEFAULT_CONFIG
    });
    return {
      items: [],
      customers: [],
      suppliers: [],
      transactions: [],
      config: DEFAULT_CONFIG
    };
  }

  // Subsequent loads: fallback to empty arrays if keys don't exist
  const items = loadData<Item[]>(KEYS.ITEMS, []);
  const customers = loadData<Customer[]>(KEYS.CUSTOMERS, []);
  const suppliers = loadData<Supplier[]>(KEYS.SUPPLIERS, []);
  const transactions = loadData<Transaction[]>(KEYS.TRANSACTIONS, []);
  const config = loadData<AppConfig>(KEYS.CONFIG, DEFAULT_CONFIG);

  return { items, customers, suppliers, transactions, config };
}

export function saveAllStates(state: {
  items: Item[];
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  config: AppConfig;
}) {
  saveData(KEYS.ITEMS, state.items);
  saveData(KEYS.CUSTOMERS, state.customers);
  saveData(KEYS.SUPPLIERS, state.suppliers);
  saveData(KEYS.TRANSACTIONS, state.transactions);
  saveData(KEYS.CONFIG, state.config);
}

// Calculations based on the ledger transactions
export interface AccountingSummary {
  boxBalance: number; // رصيد الصندوق
  totalCustomersDue: number; // إجمالي مستحقات العملاء (لنا)
  customerCountWithBalance: number; // عدد العملاء الذين لديهم مديونية
  totalSuppliersDue: number; // إجمالي مستحقات الموردين (علينا)
  supplierCountWithBalance: number; // عدد الموردين الذين لديهم مديونية
  totalRevenues: number; // إجمالي الإيرادات (المبيعات النقدية + المقبوضات غير المتعلقة بالعملاء)
  totalExpenses: number; // إجمالي المصروفات (المشتريات النقدية + المدفوعات غير المتعلقة بالموردين)
  totalSales: number; // إجمالي المبيعات (نقدي وآجل)
  totalPurchases: number; // إجمالي المشتريات (نقدي وآجل)
  openingBalance: number; // الرصيد الافتتاحي للصندوق
  netProfit: number; // صافي الأرباح (الأرباح الناتجة عن فروق تكلفة المبيعات مخصوماً منها المصاريف أو مضافاً إليها إيرادات أخرى)
}

export function calculateSummary(
  transactions: Transaction[],
  customers: Customer[],
  suppliers: Supplier[]
): AccountingSummary {
  let boxBalance = 0;
  let openingBalance = 0;
  let totalRevenues = 0;
  let totalExpenses = 0;
  let totalSales = 0;
  let totalPurchases = 0;
  let grossProfitFromSales = 0;

  // Let's calculate from transactions directly for maximum consistency
  transactions.forEach((tx) => {
    // 1. Box balance updates (based on actual cashPaid)
    // For sale: cash paid increases box
    // For purchase: cash paid decreases box
    // For sale return: we pay cash back (decreases box)
    // For purchase return: we receive cash back (increases box)
    // For receipt voucher: increases box
    // For payment voucher: decreases box
    // For initial balance: increases box
    switch (tx.type) {
      case 'initial_balance':
        boxBalance += tx.cashPaid;
        openingBalance += tx.cashPaid;
        break;
      case 'sale':
        boxBalance += tx.cashPaid;
        totalSales += tx.amount;
        // Calculate gross profit from this sale
        if (tx.items) {
          tx.items.forEach((it) => {
            const cost = it.cost || 0;
            grossProfitFromSales += (it.price - cost) * it.qty;
          });
        }
        // Subtract invoice discount from gross profit
        if (tx.discount) {
          grossProfitFromSales -= tx.discount;
        }
        break;
      case 'purchase':
        boxBalance -= tx.cashPaid;
        totalPurchases += tx.amount;
        break;
      case 'sale_return':
        boxBalance -= tx.cashPaid; // We paid back the customer
        totalSales -= tx.amount;
        if (tx.items) {
          tx.items.forEach((it) => {
            const cost = it.cost || 0;
            grossProfitFromSales -= (it.price - cost) * it.qty;
          });
        }
        // Add back invoice discount from return to gross profit
        if (tx.discount) {
          grossProfitFromSales += tx.discount;
        }
        break;
      case 'purchase_return':
        boxBalance += tx.cashPaid; // Supplier refunded us
        totalPurchases -= tx.amount;
        break;
      case 'receipt_voucher':
        boxBalance += tx.cashPaid;
        totalRevenues += tx.cashPaid; // Direct cash received
        break;
      case 'payment_voucher':
        boxBalance -= tx.cashPaid;
        totalExpenses += tx.cashPaid; // Direct cash spent
        break;
    }
  });

  // Calculate totals of Customer balances
  let totalCustomersDue = 0;
  let customerCountWithBalance = 0;
  customers.forEach((c) => {
    if (c.balance > 0) {
      totalCustomersDue += c.balance;
      customerCountWithBalance++;
    }
  });

  // Calculate totals of Supplier balances
  let totalSuppliersDue = 0;
  let supplierCountWithBalance = 0;
  suppliers.forEach((s) => {
    if (s.balance > 0) {
      totalSuppliersDue += s.balance;
      supplierCountWithBalance++;
    }
  });

  // Net Profit = Gross Profit from Sales + other Revenues - other Expenses
  // Note: Standard accounting net profit in our context:
  // Revenue from sales = Sales total. Cost of sales = cost of sold items.
  // Net Profit = Gross Profit (Sales - Cost of Goods Sold) + other cash revenues - other cash expenses
  // Let's refine other revenues/expenses to exclude Customer collection and Supplier payment
  // (since they are balance sheet items, not income statement).
  // Receipt/Payment Vouchers that aren't tied to customers/suppliers are direct operational revenues/expenses.
  // In our transaction schema, if partyId is absent, it's a direct expense/revenue.
  let directExpenses = 0;
  let directRevenues = 0;
  transactions.forEach((tx) => {
    if (tx.type === 'payment_voucher' && !tx.partyId) {
      directExpenses += tx.amount;
    }
    if (tx.type === 'receipt_voucher' && !tx.partyId) {
      directRevenues += tx.amount;
    }
  });

  const netProfit = grossProfitFromSales + directRevenues - directExpenses;

  return {
    boxBalance,
    totalCustomersDue,
    customerCountWithBalance,
    totalSuppliersDue,
    supplierCountWithBalance,
    totalRevenues: totalSales + directRevenues,
    totalExpenses: totalPurchases + directExpenses,
    totalSales,
    totalPurchases,
    openingBalance,
    netProfit
  };
}

// Generate reports, backup file
export function exportToBackupFile(state: any) {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(state, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute('download', `محاسبة_وجرد_احتياطي_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function formatCurrency(amount: number, currency?: string): string {
  let activeCurrency = 'USD'; // Default to USD
  try {
    const configData = localStorage.getItem('acct_inv_config');
    if (configData) {
      const parsed = JSON.parse(configData);
      if (parsed && parsed.currency) {
        activeCurrency = parsed.currency;
      }
    }
  } catch (e) {
    // fallback
  }

  // Treat 'YER' in old component calls as a placeholder that defaults to activeCurrency
  const finalCurrency = currency && currency !== 'YER' ? currency : activeCurrency;

  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);

  if (finalCurrency === 'USD') {
    return `$${formattedAmount}`;
  } else if (finalCurrency === 'SAR') {
    return `${formattedAmount} ر.س`;
  } else {
    return `${formattedAmount} ريال`;
  }
}
