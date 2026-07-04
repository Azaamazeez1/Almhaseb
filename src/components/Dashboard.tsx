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
  TrendingUp
} from 'lucide-react';
import { Transaction, Customer, Supplier } from '../types';
import { calculateSummary, formatCurrency, exportToBackupFile, AccountingSummary } from '../utils';

interface DashboardProps {
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  onOpenAddModal: (type: 'item' | 'customer' | 'supplier' | 'voucher_in' | 'voucher_out' | 'sale_return' | 'purchase_return') => void;
  onRestoreData: (importedState: any) => void;
  stateToBackup: any;
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({
  transactions,
  customers,
  suppliers,
  onOpenAddModal,
  onRestoreData,
  stateToBackup,
  setActiveTab
}: DashboardProps) {
  const [fileError, setFileError] = useState<string | null>(null);

  // Calculate standard summaries
  const summary = calculateSummary(transactions, customers, suppliers);

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
        } else {
          setFileError('الملف لا يحتوي على البيانات الصحيحة للمحاسب المحترف.');
        }
      } catch (err) {
        setFileError('خطأ أثناء قراءة الملف. يرجى التأكد من اختيار ملف احتياطي صحيح.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div dir="rtl" className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-l from-emerald-800 to-teal-700 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden gap-4">
        <div className="absolute left-0 bottom-0 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl"></div>
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/30 text-emerald-200 text-xs px-2.5 py-1 rounded-full border border-emerald-400/20 font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3 animate-pulse" />
              السنة المالية الحالية: ٢٠٢٦
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">مرحباً بك في المحاسب المحترف</h1>
          <p className="text-emerald-100/80 text-sm">
            إدارة مبيعاتك، مشترياتك، والتحقق من جرد ومخزون البضائع بشكل فوري وذكي.
          </p>
        </div>

        {/* Local Backup Section mimicking the Google Drive Backup button in screenshot */}
        <div className="flex flex-wrap gap-2 relative z-10 shrink-0">
          <button
            id="export-backup-btn"
            onClick={() => exportToBackupFile(stateToBackup)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-all border border-white/20 px-4 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>تصدير نسخة احتياطية</span>
          </button>
          <label
            id="import-backup-label"
            className="flex items-center gap-2 bg-emerald-900/50 hover:bg-emerald-900/70 border border-emerald-500/30 px-4 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all"
          >
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
      </div>

      {fileError && (
        <div id="file-error-alert" className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-xl text-sm">
          {fileError}
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Safe/Cash Register Box (الصندوق) */}
        <div className="bg-gradient-to-br from-emerald-700 to-teal-800 text-white rounded-3xl p-6 shadow-md border border-emerald-600/40 flex flex-col justify-between relative overflow-hidden h-48 lg:col-span-3">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-10 -translate-y-10 blur-xl"></div>
          <div className="flex items-center justify-between">
            <span className="text-emerald-100 font-semibold tracking-wide text-lg">رصيد الصندوق (الخزينة)</span>
            <div className="bg-white/10 p-2.5 rounded-2xl border border-white/10">
              <Wallet className="h-6 w-6 text-emerald-200" />
            </div>
          </div>
          <div>
            <span className="text-4xl lg:text-5xl font-black tracking-tight font-sans">
              {formatCurrency(summary.boxBalance, 'YER')}
            </span>
          </div>
          <div className="border-t border-white/10 pt-3 text-xs text-emerald-200 flex justify-between items-center">
            <span>الرصيد الإفتتاحي: {formatCurrency(summary.openingBalance, 'YER')}</span>
            <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full">
              <Coins className="h-3.5 w-3.5" />
              عملة افتراضية: ريال يمني
            </span>
          </div>
        </div>

        {/* Customers Owed (العملاء - لك) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100/80 flex flex-col justify-between h-44">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-gray-500 block">العملاء - لك</span>
              <span className="text-xs text-gray-400 block mt-0.5">مبالغ مستحقة من زبائنك</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="bg-emerald-500 text-white text-xs font-bold h-7 w-7 rounded-full flex items-center justify-center shadow-sm">
                {summary.customerCountWithBalance}
              </span>
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-slate-800">
              {formatCurrency(summary.totalCustomersDue, 'YER')}
            </span>
          </div>
          <button
            id="go-customers-btn"
            onClick={() => setActiveTab('customers')}
            className="text-xs text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1 self-start mt-2 transition-colors cursor-pointer"
          >
            <span>عرض حسابات العملاء</span>
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Suppliers Due (الموردون - عليك) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100/80 flex flex-col justify-between h-44">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-gray-500 block">الموردون - عليك</span>
              <span className="text-xs text-gray-400 block mt-0.5">ديون واجبة السداد للموردين</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="bg-amber-500 text-white text-xs font-bold h-7 w-7 rounded-full flex items-center justify-center shadow-sm">
                {summary.supplierCountWithBalance}
              </span>
            </div>
          </div>
          <div>
            <span className="text-3xl font-black text-rose-600">
              {formatCurrency(summary.totalSuppliersDue, 'YER')}
            </span>
          </div>
          <button
            id="go-suppliers-btn"
            onClick={() => setActiveTab('suppliers')}
            className="text-xs text-amber-600 hover:text-amber-800 font-bold flex items-center gap-1 self-start mt-2 transition-colors cursor-pointer"
          >
            <span>عرض حسابات الموردين</span>
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Profit widget (الأرباح والصافي) */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-950 text-white rounded-3xl p-6 shadow-sm flex flex-col justify-between h-44">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-slate-300 block">الربح الصافي الفعلي</span>
              <span className="text-xs text-slate-400 block mt-0.5">فروقات البيع بعد المصروفات</span>
            </div>
            <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div>
            <span className={`text-3xl font-black ${summary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(summary.netProfit, 'YER')}
            </span>
          </div>
          <button
            id="go-reports-btn"
            onClick={() => setActiveTab('reports')}
            className="text-xs text-emerald-300 hover:text-emerald-400 font-bold flex items-center gap-1 self-start mt-2 transition-colors cursor-pointer"
          >
            <span>تقرير الأرباح والتكاليف</span>
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Action Buttons mimicking standard workflow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Vouchers Card (سندات الصرف والقبض) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 text-sm flex items-center gap-2">
            <Coins className="h-4.5 w-4.5 text-emerald-600" />
            سندات الدفع والقبض النقدية
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              id="dashboard-receipt-voucher-btn"
              onClick={() => onOpenAddModal('voucher_in')}
              className="flex flex-col items-center justify-center p-4 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 rounded-2xl transition-all gap-2 group cursor-pointer"
            >
              <div className="bg-emerald-100 text-emerald-700 p-2 rounded-xl group-hover:scale-110 transition-transform">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
              <span className="font-bold text-xs text-emerald-800">سند قبض</span>
              <span className="text-[10px] text-emerald-600/80">تحصيل من عميل أو إيراد</span>
            </button>

            <button
              id="dashboard-payment-voucher-btn"
              onClick={() => onOpenAddModal('voucher_out')}
              className="flex flex-col items-center justify-center p-4 bg-rose-50/50 hover:bg-rose-50 border border-rose-100 rounded-2xl transition-all gap-2 group cursor-pointer"
            >
              <div className="bg-rose-100 text-rose-700 p-2 rounded-xl group-hover:scale-110 transition-transform">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <span className="font-bold text-xs text-rose-800">سند صرف</span>
              <span className="text-[10px] text-rose-600/80">سداد لمورد أو مصروف</span>
            </button>
          </div>
        </div>

        {/* Return Transactions Card (مرتجعات البضائع) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 text-sm flex items-center gap-2">
            <RefreshCw className="h-4.5 w-4.5 text-slate-600" />
            مرتجعات المبيعات والمشتريات
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              id="dashboard-sale-return-btn"
              onClick={() => onOpenAddModal('sale_return')}
              className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-2xl transition-all gap-2 group cursor-pointer"
            >
              <div className="bg-slate-200 text-slate-700 p-2 rounded-xl group-hover:scale-110 transition-transform">
                <FileMinus className="h-5 w-5" />
              </div>
              <span className="font-bold text-xs text-slate-800">مرتجع مبيعات</span>
              <span className="text-[10px] text-slate-500">استرجاع بضائع مباعة</span>
            </button>

            <button
              id="dashboard-purchase-return-btn"
              onClick={() => onOpenAddModal('purchase_return')}
              className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-2xl transition-all gap-2 group cursor-pointer"
            >
              <div className="bg-slate-200 text-slate-700 p-2 rounded-xl group-hover:scale-110 transition-transform">
                <FilePlus className="h-5 w-5" />
              </div>
              <span className="font-bold text-xs text-slate-800">مرتجع مشتريات</span>
              <span className="text-[10px] text-slate-500">إعادة بضائع للمورد</span>
            </button>
          </div>
        </div>
      </div>

      {/* Income, Revenue and Net breakdown resembling bottom card from screenshot 2 */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
        <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 text-sm flex items-center gap-2">
          <TrendingUp className="h-4.5 w-4.5 text-emerald-600" />
          تفاصيل الإيرادات والمصروفات والربحية
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-100">
          <div className="pt-3 md:pt-0">
            <span className="text-xs text-gray-400 block mb-1">إجمالي المبيعات</span>
            <span className="text-lg font-bold text-emerald-600">{formatCurrency(summary.totalSales, 'YER')}</span>
          </div>
          <div className="pt-3 md:pt-0 md:pr-4">
            <span className="text-xs text-gray-400 block mb-1">إجمالي المشتريات</span>
            <span className="text-lg font-bold text-amber-600">{formatCurrency(summary.totalPurchases, 'YER')}</span>
          </div>
          <div className="pt-3 md:pt-0 md:pr-4">
            <span className="text-xs text-gray-400 block mb-1">الإيرادات غير التجارية</span>
            <span className="text-lg font-bold text-teal-600">
              {formatCurrency(
                transactions
                  .filter((t) => t.type === 'receipt_voucher' && !t.partyId)
                  .reduce((acc, curr) => acc + curr.amount, 0),
                'YER'
              )}
            </span>
          </div>
          <div className="pt-3 md:pt-0 md:pr-4">
            <span className="text-xs text-gray-400 block mb-1">المصروفات التشغيلية</span>
            <span className="text-lg font-bold text-rose-500">
              {formatCurrency(
                transactions
                  .filter((t) => t.type === 'payment_voucher' && !t.partyId)
                  .reduce((acc, curr) => acc + curr.amount, 0),
                'YER'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Ledger / Transactions List */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" />
            <h3 className="font-bold text-slate-800">أحدث القيود والحركات المالية</h3>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
            إجمالي الحركات: {transactions.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-bold text-slate-500 border-b border-slate-100">
                <th className="p-4">نوع المستند</th>
                <th className="p-4">رقم القيد</th>
                <th className="p-4">التاريخ والوقت</th>
                <th className="p-4">الطرف الثاني</th>
                <th className="p-4">المبلغ الإجمالي</th>
                <th className="p-4">المدفوع نقداً</th>
                <th className="p-4">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm text-slate-600">
              {transactions.slice(0, 8).map((tx) => {
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
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${typeBadge}`}>
                        {labelMap[tx.type] || tx.type}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-xs text-slate-500">
                      {tx.invoiceNumber || tx.id.slice(0, 8)}
                    </td>
                    <td className="p-4 text-xs text-gray-400">
                      {new Date(tx.date).toLocaleDateString('ar-YE', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="p-4 font-bold text-slate-700">{tx.partyName || 'الصندوق مباشرة'}</td>
                    <td className="p-4 font-bold text-slate-800">{formatCurrency(tx.amount, 'YER')}</td>
                    <td className="p-4 font-semibold text-emerald-600">{formatCurrency(tx.cashPaid, 'YER')}</td>
                    <td className="p-4 text-xs max-w-xs truncate text-gray-400">{tx.details}</td>
                  </tr>
                );
              })}

              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    لا توجد قيود مسجلة بعد. ابدأ بإضافة فواتير أو سندات قبض وصرف!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
