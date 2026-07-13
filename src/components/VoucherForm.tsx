import React, { useState } from 'react';
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  FileText,
  User,
  CheckCircle2
} from 'lucide-react';
import { Customer, Supplier, Transaction, TransactionType } from '../types';
import { formatCurrency, getCurrencySymbol } from '../utils';

interface VoucherFormProps {
  type: 'receipt_voucher' | 'payment_voucher';
  customers: Customer[];
  suppliers: Supplier[];
  onAddTransaction: (
    tx: Transaction,
    partyBalanceChange?: { partyType: 'customer' | 'supplier'; partyId: string; amountChange: number }
  ) => void;
  onUpdatePartyBalance: (partyType: 'customer' | 'supplier', partyId: string, amountChange: number) => void;
  onClose: () => void;
}

export default function VoucherForm({
  type,
  customers,
  suppliers,
  onAddTransaction,
  onUpdatePartyBalance,
  onClose
}: VoucherFormProps) {
  const [partyId, setPartyId] = useState('');
  const [amount, setAmount] = useState(0);
  const [details, setDetails] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const isReceipt = type === 'receipt_voucher';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('الرجاء إدخال مبلغ صحيح أكبر من الصفر.');
      return;
    }

    const partyName = isReceipt
      ? customers.find((c) => c.id === partyId)?.name
      : suppliers.find((s) => s.id === partyId)?.name;

    const voucherCode = `${isReceipt ? 'RCV' : 'PAY'}-${Date.now().toString().slice(-6)}`;

    // Create Transaction Record
    const newTx: Transaction = {
      id: `${type}-${Date.now()}`,
      invoiceNumber: voucherCode,
      date: new Date(date).toISOString(),
      type: type,
      partyId: partyId || undefined,
      partyName: partyName,
      amount: amount,
      cashPaid: amount, // Cash flow happens directly
      creditAmount: partyId ? -amount : 0, // Reduces balance of customer/supplier in ledgers
      details: details || `${isReceipt ? 'سند قبض مالي' : 'سند صرف مالي'} برقم ${voucherCode}`
    };

    onAddTransaction(
      newTx,
      partyId
        ? {
            partyType: isReceipt ? 'customer' : 'supplier',
            partyId: partyId,
            amountChange: -amount
          }
        : undefined
    );

    alert(`تم تسجيل وحفظ ${isReceipt ? 'سند القبض' : 'سند الصرف'} بنجاح!`);
    onClose();
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${isReceipt ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {isReceipt ? <ArrowDownLeft className="h-6 w-6" /> : <ArrowUpRight className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800">
                {isReceipt ? 'تحرير سند قبض مالي جديد' : 'تحرير سند صرف ونفقات جديد'}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {isReceipt
                  ? 'تسجيل المبالغ المقبوضة نقدياً من عملاء أو كمداخيل إضافية.'
                  : 'تسجيل المبالغ المصروفة نقدياً لموردين أو كمصاريف تشغيلية ونفقات.'}
              </p>
            </div>
          </div>
          <button
            id="voucher-close-btn"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-slate-800 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Party association */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-gray-400" />
                <span>يرتبط بالحساب (اختياري)</span>
              </label>
              <select
                id="voucher-party-select"
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-semibold"
              >
                <option value="">-- حركة نقدية عامة (مباشرة بالصندوق) --</option>
                {isReceipt
                  ? customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        العميل: {c.name} (رصيده المتبقي: {formatCurrency(c.balance)})
                      </option>
                    ))
                  : suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        المورد: {s.name} (ديننا له: {formatCurrency(s.balance)})
                      </option>
                    ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                * في حال ربط السند بحساب عميل أو مورد، سيقوم النظام تلقائياً بخصم القيمة المالية من كشف حسابه.
              </p>
            </div>

            {/* Date input */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">تاريخ المعاملة</label>
              <input
                id="voucher-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
              />
            </div>

            {/* Amount input */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-gray-400" />
                <span>المبلغ النقدي المسدد</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{getCurrencySymbol()}</span>
                <input
                  id="voucher-amount-input"
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-24 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-left focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Details input */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-gray-400" />
                <span>تفاصيل السند المالي</span>
              </label>
              <input
                id="voucher-details-input"
                type="text"
                required
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={isReceipt ? 'مثال: دفعة تحت الحساب للعميل...' : 'مثال: سداد قيمة إيجار المحل لشهر...'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              id="voucher-cancel-btn"
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 cursor-pointer"
            >
              إلغاء المعاملة
            </button>
            <button
              id="voucher-submit-btn"
              type="submit"
              className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors flex items-center gap-1.5 ${
                isReceipt ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>ترحيل السند وحفظ المعاملة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
