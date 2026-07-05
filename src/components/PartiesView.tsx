import React, { useState, useMemo } from 'react';
import {
  Users,
  Truck,
  Plus,
  Search,
  Phone,
  FileText,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Printer,
  Calendar
} from 'lucide-react';
import { Customer, Supplier, Transaction } from '../types';
import { formatCurrency } from '../utils';

interface PartiesViewProps {
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  onAddParty: (type: 'customer' | 'supplier', party: { name: string; phone: string }) => void;
}

export default function PartiesView({
  customers,
  suppliers,
  transactions,
  onAddParty
}: PartiesViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'customers' | 'suppliers'>('customers');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected party for account statement / ledger (كشف حساب تفصيلي)
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);

  const filteredParties = useMemo(() => {
    const list = activeSubTab === 'customers' ? customers : suppliers;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (p) => p.name.toLowerCase().includes(term) || p.phone.includes(term)
    );
  }, [activeSubTab, customers, suppliers, searchTerm]);

  // Find selected party info
  const selectedParty = useMemo(() => {
    if (!selectedPartyId) return null;
    if (activeSubTab === 'customers') {
      return customers.find((c) => c.id === selectedPartyId);
    } else {
      return suppliers.find((s) => s.id === selectedPartyId);
    }
  }, [selectedPartyId, activeSubTab, customers, suppliers]);

  // Find all transactions associated with this party
  const partyTransactions = useMemo(() => {
    if (!selectedPartyId) return [];
    return transactions
      .filter((tx) => tx.partyId === selectedPartyId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // chronological order
  }, [selectedPartyId, transactions]);

  // Build statement entries with running balance
  const statementLedger = useMemo(() => {
    let runningBalance = 0;
    return partyTransactions.map((tx) => {
      let debit = 0; // زاد مديونية العميل (له) / قل مديونية المورد
      let credit = 0; // قل مديونية العميل / زاد مديونية المورد (له)

      if (activeSubTab === 'customers') {
        // Customer Ledger:
        // On sale: Debit increased (creditAmount adds to balance)
        // On receipt: Credit increased (cashPaid reduces balance)
        if (tx.type === 'sale') {
          debit = tx.amount;
          credit = tx.cashPaid;
          runningBalance += (debit - credit);
        } else if (tx.type === 'receipt_voucher') {
          debit = 0;
          credit = tx.amount;
          runningBalance -= credit;
        } else if (tx.type === 'sale_return') {
          debit = 0;
          credit = tx.amount;
          runningBalance -= credit;
        }
      } else {
        // Supplier Ledger:
        // On purchase: Credit increased (we owe them more, amount adds to balance)
        // On payment: Debit increased (we paid them, cashPaid reduces balance)
        if (tx.type === 'purchase') {
          credit = tx.amount;
          debit = tx.cashPaid;
          runningBalance += (credit - debit);
        } else if (tx.type === 'payment_voucher') {
          credit = 0;
          debit = tx.amount;
          runningBalance -= debit;
        } else if (tx.type === 'purchase_return') {
          credit = 0;
          debit = tx.amount;
          runningBalance -= debit;
        }
      }

      return {
        ...tx,
        debit,
        credit,
        runningBalance
      };
    });
  }, [partyTransactions, activeSubTab]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div dir="rtl" className="space-y-6">
      {/* Tab Switcher & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            {activeSubTab === 'customers' ? (
              <Users className="h-5.5 w-5.5 text-emerald-600" />
            ) : (
              <Truck className="h-5.5 w-5.5 text-emerald-600" />
            )}
            {activeSubTab === 'customers' ? 'إدارة العملاء والمدينين' : 'إدارة الموردين والدائنين'}
          </h2>
          <p className="text-xs text-gray-500">
            {activeSubTab === 'customers'
              ? 'متابعة حسابات الزبائن، كشوفات الحركة، والمبالغ المستحقة للتحصيل.'
              : 'متابعة حسابات الموردين والمخازن، وجدولة مبالغ الديون والسداد.'}
          </p>
        </div>

        {/* Switch Subtabs */}
        <div className="flex border border-slate-200 p-1 bg-slate-50 rounded-xl">
          <button
            id="parties-customers-tab-btn"
            onClick={() => {
              setActiveSubTab('customers');
              setSelectedPartyId(null);
              setSearchTerm('');
            }}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === 'customers'
                ? 'bg-emerald-700 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            العملاء المستفيدين
          </button>
          <button
            id="parties-suppliers-tab-btn"
            onClick={() => {
              setActiveSubTab('suppliers');
              setSelectedPartyId(null);
              setSearchTerm('');
            }}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === 'suppliers'
                ? 'bg-amber-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            الموردين والدائنين
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parties List (Left 1/3) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4 h-[650px] flex flex-col">
          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="search-parties-input"
              type="text"
              placeholder={`بحث عن ${activeSubTab === 'customers' ? 'عميل' : 'مورد'} بالاسم أو الهاتف...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {filteredParties.map((party) => {
              const isSelected = selectedPartyId === party.id;
              return (
                <button
                  id={`party-list-item-${party.id}`}
                  key={party.id}
                  onClick={() => setSelectedPartyId(party.id)}
                  className={`w-full text-right p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isSelected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-50 text-slate-500'}`}>
                      <User className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">{party.name}</span>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />
                        {party.phone || 'بدون هاتف'}
                      </span>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className={`font-black text-xs block ${party.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatCurrency(party.balance, 'YER')}
                    </span>
                    <span className="text-[9px] text-gray-400 block mt-0.5">
                      {party.balance > 0
                        ? activeSubTab === 'customers'
                          ? 'مستحق لنا'
                          : 'مستحق علينا'
                        : 'خالي الحساب'}
                    </span>
                  </div>
                </button>
              );
            })}

            {filteredParties.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-xs">
                لا توجد نتائج بحث مطابقة.
              </div>
            )}
          </div>
        </div>

        {/* Detailed Account Statement / Ledger (Right 2/3) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm min-h-[650px] flex flex-col justify-between">
          {selectedParty ? (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              {/* Ledger Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-5 gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 text-emerald-700 p-3 rounded-2xl border border-emerald-100">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-800">
                      كشف حساب تفصيلي: {selectedParty.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <span>الهاتف: {selectedParty.phone || 'غير مسجل'}</span>
                      <span>•</span>
                      <span>الرصيد الحالي: <strong>{formatCurrency(selectedParty.balance, 'YER')}</strong></span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="print-ledger-btn"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                    <span>طباعة كشف الحساب</span>
                  </button>
                  <button
                    id="close-ledger-btn"
                    onClick={() => setSelectedPartyId(null)}
                    className="p-2 text-gray-400 hover:text-slate-800 rounded-lg hover:bg-slate-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Printable Statement Canvas */}
              <div id="printable-statement" className="flex-1 overflow-x-auto">
                {/* Print-only Header (hidden in screen, visible in print) */}
                <div className="hidden print:block text-center border-b-2 border-double border-slate-800 pb-4 mb-6">
                  <h1 className="font-bold text-xl">{activeSubTab === 'customers' ? 'العزيز للمحاسبة - كشف حساب زبون' : 'العزيز للمحاسبة - كشف حساب مورد'}</h1>
                  <p className="text-xs text-slate-500 mt-1">تاريخ الطباعة: {new Date().toLocaleDateString('ar-YE')}</p>
                  <div className="grid grid-cols-2 text-right mt-4 text-sm gap-2">
                    <span>الاسم: {selectedParty.name}</span>
                    <span>الهاتف: {selectedParty.phone}</span>
                    <span>الرصيد الإجمالي المستحق: {formatCurrency(selectedParty.balance, 'YER')}</span>
                    <span>تأريخ التقرير: ٢٠٢٦م</span>
                  </div>
                </div>

                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="p-3">التاريخ والوقت</th>
                      <th className="p-3">رقم المستند</th>
                      <th className="p-3">تفاصيل الحركة والقيد</th>
                      <th className="p-3 text-center text-rose-700 bg-rose-50/50">مدين (سحب/فاتورة)</th>
                      <th className="p-3 text-center text-emerald-800 bg-emerald-50/50">دائن (قبض/سداد)</th>
                      <th className="p-3 text-left">الرصيد المتبقي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {/* Opening Balance Row */}
                    <tr className="bg-slate-50/50 italic font-semibold">
                      <td className="p-3 text-gray-400">-</td>
                      <td className="p-3 text-gray-400 font-mono text-[10px]">-</td>
                      <td className="p-3 text-slate-500">الرصيد الإفتتاحي السابق</td>
                      <td className="p-3 text-center text-gray-400">-</td>
                      <td className="p-3 text-center text-gray-400">-</td>
                      <td className="p-3 text-left font-sans">{formatCurrency(0, 'YER')}</td>
                    </tr>

                    {/* Ledger entries */}
                    {statementLedger.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-gray-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(row.date).toLocaleDateString('ar-YE', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-gray-500 font-bold">
                          {row.invoiceNumber || row.id.slice(0, 8)}
                        </td>
                        <td className="p-3 font-medium">
                          {row.details}
                          {row.items && (
                            <div className="text-[10px] text-gray-400 mt-1 font-normal">
                              الأصناف: {row.items.map((it) => `${it.itemName} (${it.qty})`).join('، ')}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center font-bold text-rose-600 bg-rose-50/10">
                          {row.debit > 0 ? formatCurrency(row.debit, 'YER') : '-'}
                        </td>
                        <td className="p-3 text-center font-bold text-emerald-600 bg-emerald-50/10">
                          {row.credit > 0 ? formatCurrency(row.credit, 'YER') : '-'}
                        </td>
                        <td className="p-3 text-left font-black text-slate-800 font-sans">
                          {formatCurrency(row.runningBalance, 'YER')}
                        </td>
                      </tr>
                    ))}

                    {statementLedger.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400">
                          لا توجد حركات مالية مسجلة لهذا الحساب.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total calculations under ledger */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6 print:hidden">
                <div className="flex gap-4 divide-x divide-x-reverse divide-slate-200">
                  <div>
                    <span className="text-[10px] text-gray-400 block mb-1">إجمالي المدين (المرسل)</span>
                    <span className="text-xs font-bold text-rose-600">
                      {formatCurrency(statementLedger.reduce((sum, r) => sum + r.debit, 0), 'YER')}
                    </span>
                  </div>
                  <div className="pr-4">
                    <span className="text-[10px] text-gray-400 block mb-1">إجمالي الدائن (المقبوض)</span>
                    <span className="text-xs font-bold text-emerald-600">
                      {formatCurrency(statementLedger.reduce((sum, r) => sum + r.credit, 0), 'YER')}
                    </span>
                  </div>
                </div>

                <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 text-left">
                  <span className="text-[10px] text-gray-400 block mb-0.5">رصيد التصفية النهائي</span>
                  <span className="text-sm font-black text-slate-800 font-sans">
                    {formatCurrency(selectedParty.balance, 'YER')}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-12 text-gray-400 space-y-3 my-auto">
              <div className="bg-slate-50 p-5 rounded-full">
                <FileText className="h-8 w-8 text-slate-300" />
              </div>
              <div>
                <h4 className="font-bold text-slate-700 text-sm">لم يتم تحديد حساب بعد</h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-sm">
                  قم باختيار أحد {activeSubTab === 'customers' ? 'العملاء' : 'الموردين'} من القائمة الجانبية لعرض كشف الحساب والقيود التفصيلية والطباعة.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
