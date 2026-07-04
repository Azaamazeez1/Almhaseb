import React, { useMemo } from 'react';
import {
  TrendingUp,
  Briefcase,
  Layers,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Transaction, Customer, Supplier, Item } from '../types';
import { calculateSummary, formatCurrency } from '../utils';

interface ReportsViewProps {
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  items: Item[];
  activeSubReport?: 'p_and_l' | 'balance_sheet';
}

export default function ReportsView({
  transactions,
  customers,
  suppliers,
  items,
  activeSubReport = 'p_and_l'
}: ReportsViewProps) {
  const summary = calculateSummary(transactions, customers, suppliers);

  // Calculate current stock value at cost
  const stockValueAtCost = useMemo(() => {
    return items.reduce((sum, item) => sum + item.unitCost * item.stock, 0);
  }, [items]);

  // Balance sheet details:
  // Assets: Box balance + Customers owed + Stock value
  const totalAssets = summary.boxBalance + summary.totalCustomersDue + stockValueAtCost;

  // Liabilities: Suppliers owed
  const totalLiabilities = summary.totalSuppliersDue;

  // Equity: Opening capital + net profit
  const totalEquity = summary.openingBalance + summary.netProfit;

  // Check if balance sheet balances
  const balanceSheetCheck = Math.abs(totalAssets - (totalLiabilities + totalEquity));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="h-5.5 w-5.5 text-emerald-600" />
            {activeSubReport === 'p_and_l' ? 'تقرير الأرباح والمصروفات والمركز التجاري' : 'الميزانية العمومية والمركز المالي للمؤسسة'}
          </h2>
          <p className="text-xs text-gray-500">
            {activeSubReport === 'p_and_l'
              ? 'تقرير تفصيلي بالإيرادات، تكلفة البضائع المباعة، والمصاريف التشغيلية للوقوف على الربح الفعلي.'
              : 'بيان متوازن للأصول الحالية والالتزامات وحقوق الملكية للشركة.'}
          </p>
        </div>

        <button
          id="print-report-btn"
          onClick={handlePrint}
          className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
        >
          <Printer className="h-4 w-4" />
          <span>طباعة البيان المالي</span>
        </button>
      </div>

      {activeSubReport === 'p_and_l' ? (
        /* P&L Statement (قائمة الأرباح والخسائر) */
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-600" />
              قائمة الدخل والأرباح (تفصيلي)
            </span>
            <span className="text-[10px] text-gray-400">التأريخ: يوليو ٢٠٢٦م</span>
          </div>

          <div className="space-y-4 max-w-2xl mx-auto border border-slate-100 rounded-3xl p-6 bg-slate-50/40">
            {/* Sales Revenue */}
            <div className="flex justify-between items-center text-sm py-2 border-b border-slate-200/50">
              <span className="text-slate-600 font-semibold">إجمالي المبيعات التجارية (+)</span>
              <span className="font-bold font-sans text-emerald-700">{formatCurrency(summary.totalSales, 'YER')}</span>
            </div>

            {/* COGS (تكلفة البضائع المباعة) */}
            <div className="flex justify-between items-center text-sm py-2 border-b border-slate-200/50">
              <span className="text-slate-600">تكلفة البضائع المباعة (COGS) (-)</span>
              <span className="font-semibold text-rose-600 font-sans">
                {formatCurrency(
                  transactions
                    .filter((t) => t.type === 'sale')
                    .reduce((sum, tx) => {
                      if (!tx.items) return sum;
                      return sum + tx.items.reduce((acc, it) => acc + (it.cost || 0) * it.qty, 0);
                    }, 0),
                  'YER'
                )}
              </span>
            </div>

            {/* Gross Profit */}
            <div className="flex justify-between items-center text-sm font-bold py-3 border-b border-slate-200 text-slate-800 bg-slate-100/50 px-3 rounded-lg">
              <span>مجمل الأرباح التجارية (هامش المساهمة)</span>
              <span className="font-sans text-emerald-800">
                {formatCurrency(
                  transactions
                    .filter((t) => t.type === 'sale')
                    .reduce((sum, tx) => {
                      if (!tx.items) return sum;
                      const txProfit = tx.items.reduce((acc, it) => acc + (it.price - (it.cost || 0)) * it.qty, 0);
                      return sum + (txProfit - (tx.discount || 0));
                    }, 0),
                  'YER'
                )}
              </span>
            </div>

            {/* Other Revenues */}
            <div className="flex justify-between items-center text-sm py-2 border-b border-slate-200/50">
              <span className="text-slate-600">إيرادات نقدية مباشرة أخرى (سندات قبض) (+)</span>
              <span className="font-semibold text-teal-600 font-sans">
                {formatCurrency(
                  transactions
                    .filter((t) => t.type === 'receipt_voucher' && !t.partyId)
                    .reduce((acc, curr) => acc + curr.amount, 0),
                  'YER'
                )}
              </span>
            </div>

            {/* General Expenses */}
            <div className="flex justify-between items-center text-sm py-2 border-b border-slate-200/50">
              <span className="text-slate-600">مصاريف عمومية ونفقات تشغيلية (سندات صرف) (-)</span>
              <span className="font-semibold text-rose-500 font-sans">
                {formatCurrency(
                  transactions
                    .filter((t) => t.type === 'payment_voucher' && !t.partyId)
                    .reduce((acc, curr) => acc + curr.amount, 0),
                  'YER'
                )}
              </span>
            </div>

            {/* Net Profit */}
            <div className="flex justify-between items-center py-4 text-slate-900 font-black bg-emerald-50 text-base px-4 rounded-xl border border-emerald-100">
              <span>صافي الربح الفعلي للمؤسسة</span>
              <span className="font-sans text-lg text-emerald-700">{formatCurrency(summary.netProfit, 'YER')}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Balance Sheet (الميزانية العمومية) */
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Briefcase className="h-4.5 w-4.5 text-emerald-600" />
              الميزانية العمومية الافتتاحية والنهائية
            </span>
            <span className="text-[10px] text-gray-400">تحليل توازن المركز المالي (الأصول = الخصوم + حقوق الملكية)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assets Side (الأصول) */}
            <div className="border border-slate-100 rounded-3xl p-5 space-y-4 bg-slate-50/30">
              <h4 className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-2 text-emerald-800">
                الأصول والموجودات (Assets)
              </h4>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Wallet className="h-4 w-4 text-slate-400" />
                    <span>النقدية المتوفرة بالصندوق</span>
                  </div>
                  <span className="font-bold font-sans text-slate-700">{formatCurrency(summary.boxBalance, 'YER')}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2 text-slate-600">
                    <ArrowDownLeft className="h-4 w-4 text-slate-400" />
                    <span>مستحقات على العملاء (ذمم مدينة)</span>
                  </div>
                  <span className="font-bold font-sans text-slate-700">{formatCurrency(summary.totalCustomersDue, 'YER')}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Layers className="h-4 w-4 text-slate-400" />
                    <span>قيمة المخزون الحالي للبضائع (بالتكلفة)</span>
                  </div>
                  <span className="font-bold font-sans text-slate-700">{formatCurrency(stockValueAtCost, 'YER')}</span>
                </div>

                <div className="border-t border-slate-200 pt-3.5 flex justify-between items-center font-black text-slate-900 bg-slate-100/60 p-2.5 rounded-lg">
                  <span>إجمالي أصول المؤسسة</span>
                  <span className="font-sans text-emerald-800">{formatCurrency(totalAssets, 'YER')}</span>
                </div>
              </div>
            </div>

            {/* Liabilities and Equity Side (الخصوم وحقوق الملكية) */}
            <div className="border border-slate-100 rounded-3xl p-5 space-y-4 bg-slate-50/30">
              <h4 className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-2 text-amber-800">
                الالتزامات وحقوق الملكية (Liabilities & Capital)
              </h4>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2 text-slate-600">
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                    <span>مبالغ ديون للموردين (ذمم دائنة)</span>
                  </div>
                  <span className="font-bold font-sans text-rose-600">{formatCurrency(summary.totalSuppliersDue, 'YER')}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>رأس المال الإفتتاحي للصندوق</span>
                  </div>
                  <span className="font-bold font-sans text-slate-700">{formatCurrency(summary.openingBalance, 'YER')}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-2 text-slate-600">
                    <TrendingUp className="h-4 w-4 text-slate-400" />
                    <span>صافي أرباح الموسم المحتجزة</span>
                  </div>
                  <span className="font-bold font-sans text-emerald-600">{formatCurrency(summary.netProfit, 'YER')}</span>
                </div>

                <div className="border-t border-slate-200 pt-3.5 flex justify-between items-center font-black text-slate-900 bg-slate-100/60 p-2.5 rounded-lg">
                  <span>إجمالي الالتزامات ورأس المال</span>
                  <span className="font-sans text-emerald-800">{formatCurrency(totalLiabilities + totalEquity, 'YER')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Banner */}
          {balanceSheetCheck === 0 ? (
            <div id="balance-sheet-success" className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 text-xs font-semibold">
              <span className="text-base">✅</span>
              <span>الميزانية متزنة تماماً! يتساوى إجمالي الأصول مع إجمالي الالتزامات وحقوق الملكية.</span>
            </div>
          ) : (
            <div id="balance-sheet-error" className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-800 text-xs">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-1">تنبيه: يوجد فارق موازنة قدره {formatCurrency(balanceSheetCheck, 'YER')}</span>
                <span className="leading-relaxed">
                  يحدث هذا الفارق عادة في الأنظمة البسيطة عند إجراء سحوبات مباشرة لا يتم جدولة حركتها بالصندوق أو عند إجراء مبيعات بالآجل بدون ربطها بأطراف ذمم. تأكد من ترحيل الفواتير بشكل صحيح.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
