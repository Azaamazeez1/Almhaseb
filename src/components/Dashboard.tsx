import React, { useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  PlusCircle,
  FileMinus,
  FilePlus,
  Clock,
  Download,
  Upload,
  Coins,
  ChevronLeft,
  Sparkles,
  TrendingUp,
  Share2,
  FolderOpen,
  HelpCircle,
  X,
  Search,
  ShoppingCart,
  Plus
} from 'lucide-react';
import { Transaction, Customer, Supplier, Item } from '../types';
import { calculateSummary, formatCurrency, exportToBackupFile } from '../utils';

interface DashboardProps {
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  items: Item[];
  onUpdateItem: (updatedItem: Item) => void;
  onOpenAddModal: (type: 'item' | 'customer' | 'supplier' | 'voucher_in' | 'voucher_out' | 'sale_return' | 'purchase_return') => void;
  onRestoreData: (importedState: any) => void;
  stateToBackup: any;
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({
  transactions,
  customers,
  suppliers,
  items,
  onUpdateItem,
  onOpenAddModal,
  onRestoreData,
  stateToBackup,
  setActiveTab
}: DashboardProps) {
  const [fileError, setFileError] = useState<string | null>(null);
  const [showBackupMenu, setShowBackupMenu] = useState(false);

  // Filter & Search states
  const [searchParty, setSearchParty] = useState('');
  const [searchDocNum, setSearchDocNum] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');

  // Bottom inventory filters
  const [itemSearchText, setItemSearchText] = useState('');
  const [saleInvoiceFilter, setSaleInvoiceFilter] = useState('');
  const [purchaseInvoiceFilter, setPurchaseInvoiceFilter] = useState('');
  const [warningBannerOpen, setWarningBannerOpen] = useState(true);

  // States for the beautiful item edit card/modal
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editStock, setEditStock] = useState(0);
  const [editCost, setEditCost] = useState(0);
  const [editPrice, setEditPrice] = useState(0);
  const [editUnit, setEditUnit] = useState('حبة');
  const [editCurrency, setEditCurrency] = useState('USD');

  const startEditingItem = (item: Item) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditCode(item.code);
    setEditStock(item.stock);
    setEditCost(item.unitCost);
    setEditPrice(item.salePrice);
    setEditUnit(item.unit || 'حبة');
    setEditCurrency(item.currency || 'USD');
  };

  // Calculate summaries
  const summary = calculateSummary(transactions, customers, suppliers);

  // Calculate custom double column stats (بيانات المتاجرة والمخزون)
  const openingStockValue = transactions
    .filter((t) => t.type === 'initial_balance')
    .reduce((sum, t) => sum + t.amount, 0);

  const purchaseSum = transactions
    .filter((t) => t.type === 'purchase')
    .reduce((sum, t) => sum + t.amount, 0);

  const salesReturnSum = transactions
    .filter((t) => t.type === 'sale_return')
    .reduce((sum, t) => sum + t.amount, 0);

  const closingStockValue = items.reduce((sum, item) => sum + (item.stock * item.unitCost), 0);
  const totalStockQty = items.reduce((sum, item) => sum + item.stock, 0);

  const saleSum = transactions
    .filter((t) => t.type === 'sale')
    .reduce((sum, t) => sum + t.amount, 0);

  const purchaseReturnSum = transactions
    .filter((t) => t.type === 'purchase_return')
    .reduce((sum, t) => sum + t.amount, 0);

  // Profit calculation based on actual transaction item ledger costs and discounts
  const calculatedProfit = summary.netProfit;

  // Yield / Return = (Profit / Costs) * 100
  const costBasis = openingStockValue + purchaseSum;
  const yieldPercent = costBasis > 0 ? (calculatedProfit / costBasis) * 100 : 0;

  // Direct cash flows for "الإيرادات والمصروفات والصافي"
  const directRevenues = transactions
    .filter((t) => t.type === 'receipt_voucher')
    .reduce((sum, t) => sum + t.cashPaid, 0);

  const directExpenses = transactions
    .filter((t) => t.type === 'payment_voucher')
    .reduce((sum, t) => sum + t.cashPaid, 0);

  const totalRevenueWithSales = saleSum + directRevenues;
  const totalExpenseWithPurchases = purchaseSum + directExpenses;
  const netCashFlow = totalRevenueWithSales - totalExpenseWithPurchases;
  const netFlowPercent = totalRevenueWithSales > 0 ? (netCashFlow / totalRevenueWithSales) * 100 : 0;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const parsed = JSON.parse(result);
        if (parsed.items && parsed.transactions && parsed.customers && parsed.suppliers) {
          onRestoreData(parsed);
          alert('تم استعادة نسخة الاحتياط بنجاح!');
          setShowBackupMenu(false);
        } else {
          setFileError('الملف لا يحتوي على البيانات الصحيحة للمحاسب المحترف.');
        }
      } catch (err) {
        setFileError('خطأ أثناء قراءة الملف. يرجى التأكد من اختيار ملف احتياطي صحيح.');
      }
    };
    reader.readAsText(file);
  };

  // Filter transactions based on main top search row
  const filteredTransactions = transactions.filter((tx) => {
    const matchesParty = searchParty
      ? tx.partyName?.toLowerCase().includes(searchParty.toLowerCase())
      : true;
    const matchesDoc = searchDocNum
      ? tx.invoiceNumber?.toLowerCase().includes(searchDocNum.toLowerCase()) || tx.id.includes(searchDocNum)
      : true;
    return matchesParty && matchesDoc;
  });

  // Filter items based on bottom inventory search
  const filteredItems = items.filter((item) => {
    // Search by name, code or suffix
    const searchLower = itemSearchText.toLowerCase();
    const matchesItemSearch = itemSearchText
      ? item.name.toLowerCase().includes(searchLower) ||
        item.code.toLowerCase().includes(searchLower) ||
        item.code.toLowerCase().endsWith(searchLower)
      : true;

    // Filter by sale invoice containing item
    const matchesSaleInvoice = saleInvoiceFilter
      ? transactions.some(
          (t) =>
            t.type === 'sale' &&
            (t.invoiceNumber?.toLowerCase() === saleInvoiceFilter.toLowerCase() || t.id === saleInvoiceFilter) &&
            t.items?.some((it) => it.itemId === item.id)
        )
      : true;

    // Filter by purchase invoice containing item
    const matchesPurchaseInvoice = purchaseInvoiceFilter
      ? transactions.some(
          (t) =>
            t.type === 'purchase' &&
            (t.invoiceNumber?.toLowerCase() === purchaseInvoiceFilter.toLowerCase() || t.id === purchaseInvoiceFilter) &&
            t.items?.some((it) => it.itemId === item.id)
        )
      : true;

    return matchesItemSearch && matchesSaleInvoice && matchesPurchaseInvoice;
  });

  return (
    <div dir="rtl" className="space-y-6">
      {/* 1. Category and Action Selection Row mimicking screenshot 1 */}
      <div className="bg-gradient-to-l from-emerald-700 to-teal-700 text-white p-4 rounded-3xl shadow-lg relative overflow-hidden">
        {/* Subtle background graphics */}
        <div className="absolute left-0 bottom-0 w-32 h-32 bg-teal-500/10 rounded-full blur-xl"></div>
        <div className="absolute right-1/4 top-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-lg"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left / Top Indicators */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <button
              onClick={() => setActiveTab('inventory')}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 transition-all border border-white/20 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>المخزون</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/30 text-emerald-200 text-[11px] px-2.5 py-1 rounded-full border border-emerald-400/20 font-medium">
                السنة الحالية: ٢٠٢٦
              </span>
            </div>
          </div>

          {/* Core Categories with Shopping Cart icons */}
          <div className="flex items-stretch bg-emerald-800/40 rounded-2xl p-1 border border-white/10 w-full md:w-auto max-w-lg">
            {/* المشتريات (Purchases) - Left */}
            <button
              onClick={() => setActiveTab('purchases')}
              className="flex-1 md:flex-initial px-6 py-2.5 bg-transparent hover:bg-white/5 rounded-xl transition-all flex flex-col items-center justify-center gap-1 cursor-pointer min-w-[100px]"
            >
              <ShoppingCart className="h-5 w-5 text-emerald-300" />
              <span className="text-xs font-bold text-white">المشتريات</span>
            </button>

            {/* النسخ الإحتياطي (Backup) - Middle column */}
            <div className="relative border-x border-white/10 px-2 flex flex-col items-center justify-center min-w-[90px]">
              <button
                onClick={() => setShowBackupMenu(!showBackupMenu)}
                className="hover:bg-white/5 p-1 rounded-lg flex flex-col items-center gap-1 transition-all cursor-pointer"
              >
                <div className="h-5 w-5 flex items-center justify-center bg-amber-500/20 text-amber-300 rounded-lg">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
                </div>
                <span className="text-[10px] font-bold text-emerald-100">النسخ الإحتياطي</span>
              </button>

              {showBackupMenu && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-100 p-3 z-50 w-52 space-y-2">
                  <p className="text-[10px] text-gray-500 font-bold border-b border-slate-100 pb-1.5 text-center">نسخ احتياطي محلي</p>
                  <button
                    onClick={() => {
                      exportToBackupFile(stateToBackup);
                      setShowBackupMenu(false);
                    }}
                    className="w-full text-right text-xs hover:bg-slate-50 p-2 rounded-xl flex items-center gap-2 font-bold text-emerald-700"
                  >
                    <Download className="h-4 w-4" />
                    <span>تصدير نسخة احتياطية</span>
                  </button>
                  <label className="w-full text-right text-xs hover:bg-slate-50 p-2 rounded-xl flex items-center gap-2 font-bold text-teal-700 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <span>استيراد نسخة احتياطية</span>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* المبيعات (Sales) - Right */}
            <button
              onClick={() => setActiveTab('sales')}
              className="flex-1 md:flex-initial px-6 py-2.5 bg-transparent hover:bg-white/5 rounded-xl transition-all flex flex-col items-center justify-center gap-1 cursor-pointer min-w-[100px]"
            >
              <ShoppingCart className="h-5 w-5 text-emerald-300" />
              <span className="text-xs font-bold text-white">المبيعات</span>
            </button>
          </div>
        </div>
      </div>

      {fileError && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-xl text-xs font-bold">
          {fileError}
        </div>
      )}

      {/* 2. Top filter and search bar mimicking screenshot 1 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* اسم العميل او المورد filter - Right */}
        <div className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="اسم العميل او المورد..."
            value={searchParty}
            onChange={(e) => setSearchParty(e.target.value)}
            className="w-full pr-10 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold"
          />
        </div>

        {/* محلي (Currency / Country label) - Center */}
        <div className="flex justify-center">
          <span className="bg-teal-50 text-teal-800 border border-teal-100 px-5 py-2 rounded-xl text-xs font-bold">
            محلي
          </span>
        </div>

        {/* رقم المستند filter - Left */}
        <div className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="رقم المستند..."
            value={searchDocNum}
            onChange={(e) => setSearchDocNum(e.target.value)}
            className="w-full pr-10 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold text-center"
          />
        </div>
      </div>

      {/* 3. الصندوق (The Box Cash Balance) wide panel */}
      <div className="bg-teal-600 hover:bg-teal-700 text-white rounded-2xl p-4 shadow-md border border-teal-500/40 flex items-center justify-between transition-all">
        {/* Cash flow sum on the left */}
        <span className="font-mono text-xl lg:text-2xl font-black">
          {formatCurrency(summary.boxBalance)}
        </span>
        {/* الصندوق label on the right */}
        <span className="font-black text-sm lg:text-base tracking-wide flex items-center gap-2">
          <Wallet className="h-5 w-5 text-emerald-200" />
          <span>الصندوق</span>
        </span>
      </div>

      {/* 4. Grid of 6 interactive cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: العملاء - لك (Receivables) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-500">العملاء - لك</span>
            <span className="bg-teal-500 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center">
              {summary.customerCountWithBalance}
            </span>
          </div>
          <div className="text-center py-2">
            <span className="text-2xl font-black text-slate-800 font-sans">
              {formatCurrency(summary.totalCustomersDue)}
            </span>
          </div>
          <button
            onClick={() => setActiveTab('customers')}
            className="text-[11px] text-teal-600 hover:text-teal-800 font-black flex items-center gap-1 self-start transition-colors cursor-pointer"
          >
            <span>حسابات العملاء</span>
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Card 2: الموردون - عليك (Payables) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-500">الموردون - عليك</span>
            <span className="bg-teal-500 text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center">
              {summary.supplierCountWithBalance}
            </span>
          </div>
          <div className="text-center py-2">
            <span className="text-2xl font-black text-rose-600 font-sans">
              {formatCurrency(summary.totalSuppliersDue)}
            </span>
          </div>
          <button
            onClick={() => setActiveTab('suppliers')}
            className="text-[11px] text-teal-600 hover:text-teal-800 font-black flex items-center gap-1 self-start transition-colors cursor-pointer"
          >
            <span>حسابات الموردين</span>
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Card 3: تحصيل عملاء - سندات (Receipt Voucher) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between h-40">
          <div className="text-center">
            <span className="text-xs font-black text-gray-500 block mb-1">تحصيل عملاء - سندات</span>
          </div>
          <div className="px-2">
            <button
              onClick={() => onOpenAddModal('voucher_in')}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer text-center"
            >
              سند قبض
            </button>
          </div>
          <span className="text-[10px] text-gray-400 text-center block">تحصيل المقبوضات النقدية</span>
        </div>

        {/* Card 4: سداد موردين - سندات (Payment Voucher) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between h-40">
          <div className="text-center">
            <span className="text-xs font-black text-gray-500 block mb-1">سداد موردين - سندات</span>
          </div>
          <div className="px-2">
            <button
              onClick={() => onOpenAddModal('voucher_out')}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer text-center"
            >
              سند صرف
            </button>
          </div>
          <span className="text-[10px] text-gray-400 text-center block">صرف المدفوعات النقدية</span>
        </div>

        {/* Card 5: مرتجع مبيعات */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between h-40">
          <div className="flex justify-center">
            <ShoppingCart className="h-5 w-5 text-teal-600" />
          </div>
          <div className="px-2">
            <button
              onClick={() => onOpenAddModal('sale_return')}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer text-center"
            >
              مرتجع مبيعات
            </button>
          </div>
          <span className="text-[10px] text-gray-400 text-center block">استرجاع بضاعة مباعة</span>
        </div>

        {/* Card 6: مرتجع مشتريات */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between h-40">
          <div className="flex justify-center">
            <ShoppingCart className="h-5 w-5 text-teal-600" />
          </div>
          <div className="px-2">
            <button
              onClick={() => onOpenAddModal('purchase_return')}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer text-center"
            >
              مرتجع مشتريات
            </button>
          </div>
          <span className="text-[10px] text-gray-400 text-center block">إعادة بضاعة للمورد</span>
        </div>
      </div>

      {/* 5. Metrics Double-Column Ledger Table */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
        {/* Dynamic header summary */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1">
            <span className="text-xs font-black text-gray-400">الربح:</span>
            <span className={`text-sm font-black ${calculatedProfit >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>
              {formatCurrency(calculatedProfit)}
            </span>
          </div>
          <div
            onClick={() => setActiveTab('inventory')}
            className="flex items-center gap-1 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-slate-100"
            title="انقر لعرض المخزون الكامل وتعديله"
          >
            <span className="text-xs font-black text-gray-400">المخزون:</span>
            <span className="text-sm font-black text-slate-700 underline decoration-dotted">
              {totalStockQty} وحدة ({formatCurrency(closingStockValue)})
            </span>
          </div>
        </div>

        {/* Double Columns Table matching screenshot 1 exactly */}
        <div className="grid grid-cols-2 border border-slate-200 rounded-2xl overflow-hidden divide-x divide-x-reverse divide-slate-200 font-sans text-xs">
          {/* Right Column */}
          <div className="divide-y divide-slate-200">
            {/* بضاعة أول المدة */}
            <div className="p-3 flex justify-between items-center bg-slate-50/50">
              <span className="font-mono text-slate-700 font-bold">{formatCurrency(openingStockValue)}</span>
              <span className="font-black text-gray-600">بضاعة أول المده</span>
            </div>
            {/* المشتريات */}
            <div className="p-3 flex justify-between items-center bg-white">
              <span className="font-mono text-amber-600 font-bold">{formatCurrency(purchaseSum)}</span>
              <span className="font-black text-gray-600">المشتريات</span>
            </div>
            {/* مردود مبيعات */}
            <div className="p-3 flex justify-between items-center bg-slate-50/50">
              <span className="font-mono text-rose-500 font-bold">{formatCurrency(salesReturnSum)}</span>
              <span className="font-black text-gray-600">مردود مبيعات</span>
            </div>
          </div>

          {/* Left Column */}
          <div className="divide-y divide-slate-200">
            {/* بضاعة آخر المدة */}
            <div className="p-3 flex justify-between items-center bg-slate-50/50">
              <span className="font-mono text-teal-600 font-bold">{formatCurrency(closingStockValue)}</span>
              <span className="font-black text-gray-600">بضاعة آخر المده</span>
            </div>
            {/* المبيعات */}
            <div className="p-3 flex justify-between items-center bg-white">
              <span className="font-mono text-teal-600 font-bold">{formatCurrency(saleSum)}</span>
              <span className="font-black text-gray-600">المبيعات</span>
            </div>
            {/* مردود مشتريات */}
            <div className="p-3 flex justify-between items-center bg-slate-50/50">
              <span className="font-mono text-teal-600 font-bold">{formatCurrency(purchaseReturnSum)}</span>
              <span className="font-black text-gray-600">مردود مشتريات</span>
            </div>
          </div>
        </div>

        {/* Bottom yield percentage label */}
        <div className="text-center pt-2 font-black text-xs text-teal-800">
          <span>العائد: </span>
          <span className="font-mono">{yieldPercent.toFixed(2)}%</span>
        </div>
      </div>

      {/* 6. "الإيرادات والمصروفات والصافي" (Revenue, Expenses & Net) Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Teal Header Banner */}
        <div className="bg-teal-600 text-white p-3 text-center font-black text-sm">
          الإيرادات والمصروفات والصافي
        </div>

        <div className="p-5 space-y-3 font-sans text-xs">
          {/* الأرباح */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <span className="font-mono text-teal-600 font-black">{formatCurrency(calculatedProfit)}</span>
            <span className="font-black text-gray-600">الأرباح :</span>
          </div>

          {/* الإيراد الإفتتاحي */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <span className="font-mono text-slate-700 font-bold">{formatCurrency(openingStockValue)}</span>
            <span className="font-black text-gray-600">الإيراد الإفتتاحي :</span>
          </div>

          {/* الإيرادات */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <span className="font-mono text-teal-600 font-bold">{formatCurrency(totalRevenueWithSales)}</span>
            <span className="font-black text-blue-800">الإيرادات</span>
          </div>

          {/* المصروفات */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-rose-500 font-bold">{formatCurrency(totalExpenseWithPurchases)}</span>
              <span className="text-[10px] text-gray-400 font-mono">
                {totalRevenueWithSales > 0 ? ((totalExpenseWithPurchases / totalRevenueWithSales) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <span className="font-black text-rose-800">المصروفات</span>
          </div>

          {/* الصافي */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <span className={`font-mono font-black ${netCashFlow >= 0 ? 'text-teal-600' : 'text-rose-500'}`}>
                {formatCurrency(netCashFlow)}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {netFlowPercent.toFixed(0)}%
              </span>
            </div>
            <span className="font-black text-slate-800 font-bold">الصافي</span>
          </div>

          {/* الرصيد */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <span className="font-mono text-teal-600 font-bold">{formatCurrency(summary.boxBalance)}</span>
            <span className="font-black text-gray-600">الرصيد</span>
          </div>

          {/* الرصيد ± */}
          <div className="flex justify-between items-center">
            <span className="font-mono text-slate-700 font-bold">0%</span>
            <span className="font-black text-gray-600">الرصيد ±</span>
          </div>
        </div>
      </div>

      {/* 7. "المخزون" (Inventory Table) Section mimicking screenshots 2 & 3 */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Teal Header Banner - Clickable to enter full inventory view */}
        <div
          onClick={() => setActiveTab('inventory')}
          className="bg-teal-600 hover:bg-teal-700 text-white p-3.5 text-center font-black text-sm cursor-pointer transition-colors flex items-center justify-center gap-2"
          title="انقر للانتقال إلى صفحة المخزون الكامل والاطلاع على جميع البيانات"
        >
          <span>المخزون (انقر هنا لعرض المخزون الكامل والتحكم به)</span>
          <ChevronLeft className="h-4 w-4" />
        </div>

        {/* Inventory Item Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs font-sans">
            <thead>
              <tr className="bg-slate-100 text-gray-700 font-black border-b border-slate-200">
                <th className="p-3">رقم الصنف</th>
                <th className="p-3">اسم الصنف (اضغط للتعديل)</th>
                <th className="p-3 text-center">العمله</th>
                <th className="p-3 text-center">المخزون</th>
                <th className="p-3 text-center">تكلفة الوحده</th>
                <th className="p-3 text-center">آخر شراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-gray-600">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => startEditingItem(item)}
                  className="group hover:bg-teal-50/30 transition-colors cursor-pointer"
                  title="اضغط على هذا الصنف لعرض بطاقة التعديل الفورية"
                >
                  <td className="p-3 font-mono font-bold text-slate-500">{item.code}</td>
                  <td className="p-3 font-black text-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <span>{item.name}</span>
                      <span className="text-[10px] text-teal-700 font-black bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded transition-all group-hover:scale-105">
                        بطاقة تعديل ✎
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-center text-gray-400">{item.currency || 'USD'}</td>
                  <td className="p-3 text-center font-mono font-bold text-slate-700">
                    {item.stock} {item.unit}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-teal-600">
                    {formatCurrency(item.unitCost)}
                  </td>
                  <td className="p-3 text-center font-mono text-gray-500">
                    {formatCurrency(item.lastPurchasePrice || item.unitCost)}
                  </td>
                </tr>
              ))}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 font-bold">
                    لا توجد أصناف تطابق شروط البحث والفلترة المحددة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 3 Search Filter Fields below the Inventory table */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* رقم فاتورة البيع - Right */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-1">رقم فاتورة البيع</label>
            <input
              type="text"
              placeholder="مثال: SAL-101"
              value={saleInvoiceFilter}
              onChange={(e) => setSaleInvoiceFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-teal-600 font-bold text-center"
            />
          </div>

          {/* اسم الصنف او الرقم - Middle */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-1">اسم الصنف او الرقم او نهاية رقم الصنف</label>
            <input
              type="text"
              placeholder="البحث بالإسم او الرقم..."
              value={itemSearchText}
              onChange={(e) => setItemSearchText(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black focus:outline-none focus:border-teal-600 text-center"
            />
          </div>

          {/* رقم فاتورة الشراء - Left */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-1">رقم فاتورة الشراء</label>
            <input
              type="text"
              placeholder="مثال: PUR-202"
              value={purchaseInvoiceFilter}
              onChange={(e) => setPurchaseInvoiceFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-teal-600 font-bold text-center"
            />
          </div>
        </div>
      </div>

      {/* 8. Friendly Warning Banner at bottom */}
      {warningBannerOpen && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-2xl flex items-start justify-between gap-3 shadow-sm">
          <p className="text-xs font-bold leading-relaxed">
            مخزون غير متوفر ..تستطيع البحث عن اي صنف متوفر او غير متوفر ..البحث بالإسم او الرقم
          </p>
          <button
            onClick={() => setWarningBannerOpen(false)}
            className="text-emerald-600 hover:text-emerald-950 p-1 rounded-lg shrink-0 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 9. Recent Documents Ledger List (Standard Audit List) */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-gray-400" />
            <h3 className="font-bold text-slate-800 text-sm">أحدث القيود والحركات المالية للمستندات المفلترة</h3>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
            مجموع القيود: {filteredTransactions.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs font-sans">
            <thead>
              <tr className="bg-slate-50 text-gray-500 border-b border-slate-100">
                <th className="p-4">نوع المستند</th>
                <th className="p-4">رقم القيد</th>
                <th className="p-4">التاريخ والوقت</th>
                <th className="p-4">الطرف الثاني</th>
                <th className="p-4">المبلغ الإجمالي</th>
                <th className="p-4">المدفوع نقداً</th>
                <th className="p-4">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-600">
              {filteredTransactions.slice(0, 8).map((tx) => {
                let typeBadge = '';
                switch (tx.type) {
                  case 'sale':
                    typeBadge = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
                    break;
                  case 'purchase':
                    typeBadge = 'bg-amber-100 text-amber-800 border border-amber-200';
                    break;
                  case 'sale_return':
                    typeBadge = 'bg-teal-100 text-teal-800 border border-teal-200';
                    break;
                  case 'purchase_return':
                    typeBadge = 'bg-rose-100 text-rose-800 border border-rose-200';
                    break;
                  case 'receipt_voucher':
                    typeBadge = 'bg-blue-100 text-blue-800 border border-blue-200';
                    break;
                  case 'payment_voucher':
                    typeBadge = 'bg-red-100 text-red-800 border border-red-200';
                    break;
                  case 'initial_balance':
                    typeBadge = 'bg-purple-100 text-purple-800 border border-purple-200';
                    break;
                }

                const labelMap: Record<string, string> = {
                  sale: 'فاتورة مبيعات',
                  purchase: 'فاتورة مشتريات',
                  sale_return: 'مرتجع مبيعات',
                  purchase_return: 'مرتجع مشتريات',
                  receipt_voucher: 'سند قبض',
                  payment_voucher: 'سند صرف',
                  initial_balance: 'رصيد افتتاحي'
                };

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${typeBadge}`}>
                        {labelMap[tx.type] || tx.type}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-500">
                      {tx.invoiceNumber || tx.id.slice(0, 8)}
                    </td>
                    <td className="p-4 text-gray-400">
                      {new Date(tx.date).toLocaleDateString('ar-YE', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="p-4 font-black text-slate-700">{tx.partyName || 'الصندوق مباشرة'}</td>
                    <td className="p-4 font-bold text-slate-800">{formatCurrency(tx.amount)}</td>
                    <td className="p-4 font-semibold text-emerald-600">{formatCurrency(tx.cashPaid)}</td>
                    <td className="p-4 max-w-xs truncate text-gray-400">{tx.details}</td>
                  </tr>
                );
              })}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 font-bold">
                    لا توجد حركات مالية مسجلة تطابق التصفية.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Beautiful "بطاقة تعديل الصنف" (Edit Item Modal Card) */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" dir="rtl">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-teal-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-black text-base text-slate-800 flex items-center gap-2">
                <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                  <Sparkles className="h-4.5 w-4.5 text-teal-600" />
                </div>
                <span>بطاقة تعديل الصنف</span>
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-gray-400 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!editName || !editCode) return;
              onUpdateItem({
                ...editingItem,
                name: editName,
                code: editCode,
                stock: editStock,
                unitCost: editCost,
                salePrice: editPrice,
                unit: editUnit,
                currency: editCurrency
              });
              setEditingItem(null);
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1 text-right">اسم الصنف</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-black text-right"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 text-right">رقم الصنف / الباركود</label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 text-right">وحدة القياس</label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-bold text-center"
                  >
                    <option value="حبة">حبة</option>
                    <option value="كرتون">كرتون</option>
                    <option value="كيس">كيس</option>
                    <option value="متر">متر</option>
                    <option value="لتر">لتر</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 text-right">المخزون الحالي</label>
                  <input
                    type="number"
                    required
                    value={editStock}
                    onChange={(e) => setEditStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 text-right">العملة</label>
                  <select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-bold text-center"
                  >
                    <option value="USD">دولار أمريكي (USD)</option>
                    <option value="YER">ريال يمني (YER)</option>
                    <option value="SAR">ريال سعودي (SAR)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 text-right">سعر التكلفة (شراء)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editCost}
                    onChange={(e) => setEditCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 text-right">سعر البيع المقترح</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  حفظ بطاقة التعديل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
