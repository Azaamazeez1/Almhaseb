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
  Calendar,
  Coins,
  CheckCircle2,
  Share2,
  Copy,
  Check,
  Send,
  SlidersHorizontal,
  Filter,
  TrendingUp,
  Wallet,
  ArrowLeftRight
} from 'lucide-react';
import { Customer, Supplier, Transaction } from '../types';
import { formatCurrency, getCurrencySymbol } from '../utils';

interface PartiesViewProps {
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  onAddParty: (type: 'customer' | 'supplier', party: { name: string; phone: string }) => void;
  onAddTransaction?: (
    tx: Transaction,
    partyBalanceChange?: { partyType: 'customer' | 'supplier'; partyId: string; amountChange: number }
  ) => void;
  onUpdatePartyBalance?: (type: 'customer' | 'supplier', partyId: string, diff: number) => void;
}

export default function PartiesView({
  customers,
  suppliers,
  transactions,
  onAddParty,
  onAddTransaction,
  onUpdatePartyBalance
}: PartiesViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'customers' | 'suppliers'>('customers');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected party for account statement / ledger (كشف حساب تفصيلي)
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);

  // Payment recording states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDetails, setPaymentDetails] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentRef, setPaymentRef] = useState('');

  // Share modal states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Invoice view states
  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isInvoiceCopied, setIsInvoiceCopied] = useState(false);

  // Account statement filtering states
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'all' | 'invoices' | 'payments'>('all');

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

  const openPaymentModal = () => {
    const defaultRef = `VOU-${Math.floor(100000 + Math.random() * 900000)}`;
    setPaymentRef(defaultRef);
    setPaymentAmount(0);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    if (selectedParty) {
      setPaymentDetails(
        activeSubTab === 'customers'
          ? `دفعة مسددة من الحساب للعميل: ${selectedParty.name}`
          : `دفعة مسددة للحساب للمورد: ${selectedParty.name}`
      );
    }
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty || !paymentAmount || paymentAmount <= 0) return;
    if (!onAddTransaction) return;

    const type = activeSubTab === 'customers' ? 'receipt_voucher' : 'payment_voucher';
    const isReceipt = type === 'receipt_voucher';

    const newTx: Transaction = {
      id: `${type}-${Date.now()}`,
      invoiceNumber: paymentRef,
      date: new Date(paymentDate).toISOString(),
      type: type,
      partyId: selectedParty.id,
      partyName: selectedParty.name,
      amount: paymentAmount,
      cashPaid: paymentAmount,
      creditAmount: -paymentAmount,
      details: paymentDetails || `${isReceipt ? 'سند قبض مالي' : 'سند صرف مالي'} برقم ${paymentRef}`
    };

    onAddTransaction(newTx, {
      partyType: isReceipt ? 'customer' : 'supplier',
      partyId: selectedParty.id,
      amountChange: -paymentAmount
    });

    setIsPaymentModalOpen(false);
  };

  const getShareText = () => {
    if (!selectedParty) return '';
    const isCustomer = activeSubTab === 'customers';
    const typeLabel = isCustomer ? 'عميل' : 'مورد';
    
    let text = `*كشف حساب تفصيلي (${typeLabel})*\n`;
    text += `*الاسم:* ${selectedParty.name}\n`;
    if (selectedParty.phone) {
      text += `*الهاتف:* ${selectedParty.phone}\n`;
    }
    text += `*الرصيد الحالي:* ${formatCurrency(selectedParty.balance, 'YER')}\n`;
    text += `*تاريخ الكشف:* ${new Date().toLocaleDateString('ar-YE')}\n`;
    text += `------------------------------------\n\n`;
    
    text += `*تفاصيل العمليات:*\n`;
    
    if (statementLedger.length === 0) {
      text += `لا توجد حركات مالية مسجلة.\n`;
    } else {
      statementLedger.forEach((row) => {
        const dateStr = new Date(row.date).toLocaleDateString('ar-YE', { month: 'numeric', day: 'numeric' });
        const refStr = row.invoiceNumber || row.id.slice(0, 8);
        const debit = row.debit > 0 ? formatCurrency(row.debit, 'YER') : '0';
        const credit = row.credit > 0 ? formatCurrency(row.credit, 'YER') : '0';
        const running = formatCurrency(row.runningBalance, 'YER');
        
        text += `📅 ${dateStr} | مستند: ${refStr}\n`;
        text += `📝 ${row.details}\n`;
        text += `➕ مدين (+): ${debit} | ➖ دائن (-): ${credit}\n`;
        text += `⚖️ الرصيد: ${running}\n`;
        text += `------------------------------------\n`;
      });
    }
    
    const totalDebit = statementLedger.reduce((sum, r) => sum + r.debit, 0);
    const totalCredit = statementLedger.reduce((sum, r) => sum + r.credit, 0);
    
    text += `\n*ملخص كشف الحساب:*\n`;
    text += `🔺 إجمالي مدين (مستحق لنا): ${formatCurrency(totalDebit, 'YER')}\n`;
    text += `🟢 إجمالي دائن (مسدد): ${formatCurrency(totalCredit, 'YER')}\n`;
    text += `💎 صافي الرصيد المستحق: *${formatCurrency(selectedParty.balance, 'YER')}*\n\n`;
    text += `*تم تصديره عبر نظام بيبرس للمحاسبة*`;
    
    return text;
  };

  const handleCopyText = () => {
    const text = getShareText();
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  const handleSystemShare = () => {
    const text = getShareText();
    if (navigator.share) {
      navigator.share({
        title: `كشف حساب - ${selectedParty?.name}`,
        text: text
      }).catch(err => {
        console.error('Error sharing', err);
      });
    } else {
      handleCopyText();
    }
  };

  const handleWhatsAppShare = () => {
    const text = getShareText();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const getInvoiceTypeText = (type: string) => {
    switch (type) {
      case 'sale': return 'فاتورة مبيعات وكشف مبيعات مباشر';
      case 'purchase': return 'فاتورة مشتريات ومخازن';
      case 'sale_return': return 'مرتجع مبيعات';
      case 'purchase_return': return 'مرتجع مشتريات';
      case 'receipt_voucher': return 'سند قبض مالي';
      case 'payment_voucher': return 'سند صرف مالي';
      case 'initial_balance': return 'قيد رصيد افتتاحي سابق';
      default: return 'سند / مستند مالي';
    }
  };

  const getInvoiceTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
      case 'purchase': return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'sale_return': return 'bg-rose-50 text-rose-800 border border-rose-200';
      case 'purchase_return': return 'bg-orange-50 text-orange-800 border border-orange-200';
      case 'receipt_voucher': return 'bg-teal-50 text-teal-800 border border-teal-200';
      case 'payment_voucher': return 'bg-blue-50 text-blue-800 border border-blue-200';
      default: return 'bg-slate-50 text-slate-800 border border-slate-200';
    }
  };

  const getInvoiceShareText = (invoice: Transaction) => {
    const typeText = getInvoiceTypeText(invoice.type);
    const numberText = invoice.invoiceNumber || invoice.id.slice(0, 8);
    const dateStr = new Date(invoice.date).toLocaleString('ar-YE');
    const partyName = invoice.partyName || selectedParty?.name || 'نقداً';
    
    let itemsText = '';
    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((it, idx) => {
        itemsText += `  ${idx + 1}. ${it.itemName} - ${it.qty} حبة × ${formatCurrency(it.price, 'YER')}\n`;
      });
    }

    return `*بيبرس للمحاسبة - ${typeText}* 🧾
----------------------------------------
*رقم المستند:* ${numberText}
*التاريخ:* ${dateStr}
*الجهة / الحساب:* ${partyName}
*التفاصيل:* ${invoice.details || '-'}

${itemsText ? `*الأصناف والتفاصيل:* \n${itemsText}----------------------------------------\n` : ''}*المبلغ الإجمالي:* ${formatCurrency(invoice.amount, 'YER')}
*المدفوع نقداً:* ${formatCurrency(invoice.cashPaid, 'YER')}
*المتبقي آجل:* ${formatCurrency(invoice.creditAmount, 'YER')}
----------------------------------------
تم الترحيل والتسجيل بنجاح عبر بيبرس للمحاسبة 📱`;
  };

  const handleCopyInvoiceText = (invoice: Transaction) => {
    const txt = getInvoiceShareText(invoice);
    navigator.clipboard.writeText(txt).then(() => {
      setIsInvoiceCopied(true);
      setTimeout(() => setIsInvoiceCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy invoice: ', err);
    });
  };

  const handleWhatsAppInvoiceShare = (invoice: Transaction) => {
    const txt = encodeURIComponent(getInvoiceShareText(invoice));
    window.open(`https://api.whatsapp.com/send?text=${txt}`, '_blank');
  };

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

  // Filtered statement ledger for rendering
  const filteredStatementLedger = useMemo(() => {
    return statementLedger.filter((row) => {
      // 1. Search text match
      const query = ledgerSearchQuery.toLowerCase().trim();
      const matchSearch = query === '' || 
        (row.details && row.details.toLowerCase().includes(query)) ||
        (row.invoiceNumber && row.invoiceNumber.toLowerCase().includes(query)) ||
        (row.items && row.items.some(it => it.itemName.toLowerCase().includes(query)));

      // 2. Type filter match
      let matchType = true;
      if (ledgerTypeFilter === 'invoices') {
        matchType = row.type === 'sale' || row.type === 'purchase' || row.type === 'sale_return' || row.type === 'purchase_return';
      } else if (ledgerTypeFilter === 'payments') {
        matchType = row.type === 'receipt_voucher' || row.type === 'payment_voucher';
      }

      return matchSearch && matchType;
    });
  }, [statementLedger, ledgerSearchQuery, ledgerTypeFilter]);

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
        <div className={`bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4 h-[650px] flex flex-col ${selectedPartyId ? 'hidden lg:flex' : 'flex'}`}>
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
        <div className={`lg:col-span-2 bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm min-h-[650px] flex flex-col justify-between ${selectedPartyId ? 'flex' : 'hidden lg:flex'}`}>
          {selectedParty ? (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              {/* Ledger Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-5 gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-[#4b8c82]/10 text-[#4b8c82] p-3 rounded-2xl border border-[#4b8c82]/20">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-slate-800">
                        كشف الحساب التفصيلي: {selectedParty.name}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedParty.balance > 0 
                          ? activeSubTab === 'customers' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                          : selectedParty.balance < 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-500 border border-slate-100'
                      }`}>
                        {selectedParty.balance > 0 
                          ? activeSubTab === 'customers' ? 'مستحق لنا' : 'مستحق علينا'
                          : selectedParty.balance < 0 ? 'رصيد دائن' : 'متوازن ماليًا'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-y-1 gap-x-2.5">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>الهاتف: {selectedParty.phone || 'غير مسجل'}</span>
                      </span>
                      <span>•</span>
                      <span>تاريخ ومواعيد الحركات النشطة</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {onAddTransaction && onUpdatePartyBalance && (
                    <button
                      id="add-ledger-payment-btn"
                      onClick={openPaymentModal}
                      className={`flex items-center gap-1.5 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all ${
                        activeSubTab === 'customers'
                          ? 'bg-[#4b8c82] hover:bg-[#3d736b]'
                          : 'bg-amber-600 hover:bg-amber-700'
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      <span>{activeSubTab === 'customers' ? 'استلام دفعة مقبوضة' : 'تسديد دفعة مالية'}</span>
                    </button>
                  )}
                  <button
                    id="print-ledger-btn"
                    onClick={handlePrint}
                    className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                    <span>طباعة</span>
                  </button>
                  <button
                    id="share-ledger-btn"
                    onClick={() => setIsShareModalOpen(true)}
                    className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>مشاركة الكشف</span>
                  </button>
                  <button
                    id="close-ledger-btn"
                    onClick={() => setSelectedPartyId(null)}
                    className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold px-3 py-2.5 rounded-xl cursor-pointer transition-colors lg:hidden"
                  >
                    <X className="h-4 w-4" />
                    <span>رجوع</span>
                  </button>
                </div>
              </div>

              {/* Clean & Elegant Unified Summary Bar */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">إجمالي مدين (سحب):</span>
                    <span className="font-bold text-rose-600 font-sans text-sm">
                      {formatCurrency(statementLedger.reduce((sum, r) => sum + r.debit, 0), 'YER')}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">إجمالي دائن (سداد):</span>
                    <span className="font-bold text-[#4b8c82] font-sans text-sm">
                      {formatCurrency(statementLedger.reduce((sum, r) => sum + r.credit, 0), 'YER')}
                    </span>
                  </div>
                </div>
                <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200/60 shadow-sm flex items-center justify-between sm:justify-start gap-4">
                  <span className="text-slate-500 font-bold">الرصيد المتبقي النهائي:</span>
                  <span className={`font-black font-sans text-sm ${selectedParty.balance > 0 ? 'text-amber-700' : selectedParty.balance < 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {formatCurrency(selectedParty.balance, 'YER')}
                  </span>
                </div>
              </div>

              {/* Minimal Search Input */}
              <div className="relative print:hidden">
                <Search className="absolute right-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث في كشف الحساب باسم الصنف، رقم الحركة، أو التفاصيل..."
                  value={ledgerSearchQuery}
                  onChange={(e) => setLedgerSearchQuery(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl pr-9 pl-4 py-2 focus:ring-1 focus:ring-[#4b8c82] focus:border-[#4b8c82] outline-none shadow-sm"
                />
              </div>

              {/* Printable Statement Canvas */}
              <div id="printable-statement" className="flex-1 overflow-x-auto">
                {/* Print-only Header (hidden in screen, visible in print) */}
                <div className="hidden print:block text-center border-b-2 border-double border-slate-800 pb-4 mb-6">
                  <h1 className="font-bold text-xl">{activeSubTab === 'customers' ? 'بيبرس للمحاسبة - كشف حساب زبون تفصيلي' : 'بيبرس للمحاسبة - كشف حساب مورد تفصيلي'}</h1>
                  <p className="text-xs text-slate-500 mt-1">تاريخ الطباعة والتصدير: {new Date().toLocaleDateString('ar-YE')}</p>
                  <div className="grid grid-cols-2 text-right mt-4 text-sm gap-2 font-bold">
                    <span>الاسم الكامل: {selectedParty.name}</span>
                    <span>الهاتف: {selectedParty.phone || 'غير مسجل'}</span>
                    <span>الرصيد الإجمالي المستحق: {formatCurrency(selectedParty.balance, 'YER')}</span>
                    <span>جهة الحساب: {activeSubTab === 'customers' ? 'العملاء والزبائن' : 'الموردين والشركاء'}</span>
                  </div>
                </div>

                <table className="hidden md:table print:table w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="p-3 w-1/5">التاريخ والوقت</th>
                      <th className="p-3 w-1/6">رقم الحركة/المستند</th>
                      <th className="p-3 w-2/5">تفاصيل الحركة والقيد المالي</th>
                      <th className="p-3 text-center text-rose-700 bg-rose-50/50 w-1/10">مدين (+)</th>
                      <th className="p-3 text-center text-[#4b8c82] bg-emerald-50/50 w-1/10">دائن (-)</th>
                      <th className="p-3 text-left w-1/10">الرصيد الجاري</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {/* Opening Balance Row */}
                    <tr className="bg-slate-50/30 italic font-semibold text-slate-500">
                      <td className="p-3 text-slate-400">-</td>
                      <td className="p-3 text-slate-400 font-mono text-[10px]">-</td>
                      <td className="p-3">رصيد إفتتاحي سابق للعمليات المسجلة</td>
                      <td className="p-3 text-center text-slate-300">-</td>
                      <td className="p-3 text-center text-slate-300">-</td>
                      <td className="p-3 text-left font-sans font-black">{formatCurrency(0, 'YER')}</td>
                    </tr>

                    {/* Ledger entries */}
                    {filteredStatementLedger.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => {
                          setSelectedInvoice(row);
                          setIsInvoiceModalOpen(true);
                        }}
                        className="hover:bg-[#4b8c82]/5 cursor-pointer transition-colors border-b border-slate-100"
                        title="انقر لعرض تفاصيل الفاتورة / السند المالي"
                      >
                        <td className="p-3 text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                          <Calendar className="h-3.5 w-3.5 text-[#4b8c82]" />
                          <span>
                            {new Date(row.date).toLocaleDateString('ar-YE', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-800 font-bold">
                          <span className={`border px-2 py-0.5 rounded-lg transition-colors inline-block shadow-sm ${
                            row.type.includes('voucher') ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                          }`}>
                            #{row.invoiceNumber || row.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{row.details}</span>
                            {row.items && row.items.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {row.items.map((it, idx) => (
                                  <span key={idx} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                    {it.itemName} ({it.qty} حبة)
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold text-rose-600 font-mono bg-rose-50/10">
                          {row.debit > 0 ? formatCurrency(row.debit, 'YER') : '-'}
                        </td>
                        <td className="p-3 text-center font-bold text-emerald-600 font-mono bg-emerald-50/10">
                          {row.credit > 0 ? formatCurrency(row.credit, 'YER') : '-'}
                        </td>
                        <td className="p-3 text-left font-black text-slate-800 font-sans">
                          {formatCurrency(row.runningBalance, 'YER')}
                        </td>
                      </tr>
                    ))}

                    {filteredStatementLedger.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-gray-400">
                          <Filter className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs">لا توجد حركات مطابقة للبحث الحالي.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Mobile Statement List - Extremely Simple and Elegant */}
                <div className="md:hidden space-y-3 print:hidden">
                  {/* Opening Balance Card */}
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs flex justify-between items-center shadow-sm">
                    <span className="font-bold text-slate-500">الرصيد الإفتتاحي السابق</span>
                    <span className="font-black text-slate-700 font-sans">{formatCurrency(0, 'YER')}</span>
                  </div>

                  {filteredStatementLedger.map((row) => (
                    <div
                      key={row.id}
                      onClick={() => {
                        setSelectedInvoice(row);
                        setIsInvoiceModalOpen(true);
                      }}
                      className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl p-3 cursor-pointer text-xs flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <span className={`px-1.5 py-0.5 rounded border ${
                            row.type.includes('voucher') ? 'bg-amber-50 text-amber-800 border-amber-100' : 'bg-emerald-50 text-emerald-800 border-emerald-100'
                          }`}>
                            #{row.invoiceNumber || row.id.slice(0, 8)}
                          </span>
                          <span>•</span>
                          <span>{new Date(row.date).toLocaleDateString('ar-YE')}</span>
                        </div>
                        <div className="font-bold text-slate-800 truncate">{row.details}</div>
                      </div>
                      <div className="text-left shrink-0">
                        {row.debit > 0 && (
                          <span className="text-rose-600 font-black block font-sans">+{formatCurrency(row.debit, 'YER')}</span>
                        )}
                        {row.credit > 0 && (
                          <span className="text-emerald-600 font-black block font-sans">-{formatCurrency(row.credit, 'YER')}</span>
                        )}
                        <span className="text-[10px] text-slate-400 font-medium block">الرصيد: {formatCurrency(row.runningBalance, 'YER')}</span>
                      </div>
                    </div>
                  ))}

                  {filteredStatementLedger.length === 0 && (
                    <div className="p-8 text-center text-gray-400 text-xs bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      لا توجد حركات مطابقة للبحث.
                    </div>
                  )}
                </div>
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

      {/* Dynamic Payment Modal */}
      {isPaymentModalOpen && selectedParty && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${activeSubTab === 'customers' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {activeSubTab === 'customers' ? <ArrowDownLeft className="h-6 w-6" /> : <ArrowUpRight className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    {activeSubTab === 'customers' ? 'تسجيل سند قبض مالي (دفعة من عميل)' : 'تسجيل سند صرف مالي (دفعة لمورد)'}
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-1">
                    تسجيل دفعة سداد نقدية لخصمها مباشرة من رصيد الحساب الجاري.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-slate-800 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePayment} className="space-y-4">
              {/* Selected Party Info Box */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">الحساب المحدد:</span>
                  <span className="font-bold text-slate-800">{selectedParty.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">الرصيد الحالي:</span>
                  <span className={`font-black ${selectedParty.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatCurrency(selectedParty.balance, 'YER')}
                  </span>
                </div>
              </div>

              {/* Reference and Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">رقم السند/المرجع</label>
                  <input
                    type="text"
                    required
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">التاريخ والوقت</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-center"
                  />
                </div>
              </div>

              {/* Amount field */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">مبلغ الدفعة المسددة ({getCurrencySymbol()})</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    {getCurrencySymbol()}
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full pl-12 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-black text-left focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Statement details */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">تفاصيل وبيان الحركة</label>
                <input
                  type="text"
                  required
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                  placeholder="بيان الحركة..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-semibold"
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeSubTab === 'customers' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>ترحيل وحفظ الدفعة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Share Modal */}
      {isShareModalOpen && selectedParty && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="max-w-lg w-full bg-white rounded-3xl p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700">
                  <Share2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    مشاركة كشف حساب: {selectedParty.name}
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-1">
                    يمكنك إرسال كشف الحساب التفصيلي عبر الواتساب أو نسخ النص المنسق لمشاركته في أي تطبيق آخر.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-slate-800 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Preview Box */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-2">
              <label className="block text-[10px] font-bold text-gray-500 mb-1">معاينة نص كشف الحساب:</label>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto select-all">
                {getShareText()}
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-bold shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>إرسال عبر الواتساب</span>
              </button>
              
              <button
                type="button"
                onClick={handleCopyText}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isCopied
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                <span>{isCopied ? 'تم نسخ النص المنسق!' : 'نسخ النص المنسق'}</span>
              </button>
            </div>

            {/* System Share (Visible only if supported, or generic action) */}
            <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
              {typeof navigator !== 'undefined' && navigator.share ? (
                <button
                  type="button"
                  onClick={handleSystemShare}
                  className="flex items-center gap-1.5 text-slate-600 hover:text-slate-950 text-xs font-bold bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                >
                  <Share2 className="h-4 w-4" />
                  <span>مشاركة عبر تطبيقات الهاتف</span>
                </button>
              ) : (
                <span className="text-[10px] text-gray-400">
                  انقر على الأزرار أعلاه للمشاركة الفورية.
                </span>
              )}

              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Invoice & Voucher Details View Modal */}
      {isInvoiceModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden" dir="rtl">
          <div className="max-w-2xl w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-800">
                    تفاصيل المستند المالي
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-lg border uppercase ${getInvoiceTypeColor(selectedInvoice.type)}`}>
                      {getInvoiceTypeText(selectedInvoice.type)}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      الرقم الفريد: {selectedInvoice.id}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-slate-800 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto pr-1 pl-1 space-y-4 mb-6">
              {/* Document Meta Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-400 font-bold block">رقم الفاتورة / السند</span>
                  <span className="text-xs font-black text-slate-700 font-mono bg-white px-3 py-1.5 rounded-xl border border-slate-200 inline-block">
                    {selectedInvoice.invoiceNumber || selectedInvoice.id.slice(0, 8)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-400 font-bold block">تاريخ ووقت المعاملة</span>
                  <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 inline-block">
                    <Calendar className="h-3.5 w-3.5 text-[#4b8c82] inline" />
                    <span>
                      {new Date(selectedInvoice.date).toLocaleString('ar-YE', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-400 font-bold block">الحساب / الجهة المستفيدة</span>
                  <span className="text-xs font-black text-slate-800 block">
                    {selectedInvoice.partyName || selectedParty?.name || 'نقداً / زبون مباشر'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-400 font-bold block">التفاصيل والبيان والقيد</span>
                  <span className="text-xs font-bold text-slate-600 block">
                    {selectedInvoice.details || 'لا توجد ملاحظات إضافية'}
                  </span>
                </div>
              </div>

              {/* Items List (if invoice type & items exist) */}
              {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-500">الأصناف والسلع المدرجة:</h4>
                  <div className="border border-slate-150 rounded-2xl overflow-hidden bg-white">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-black border-b border-slate-150">
                          <th className="p-2.5">م</th>
                          <th className="p-2.5">اسم الصنف والسلعة</th>
                          <th className="p-2.5 text-center">الكمية</th>
                          <th className="p-2.5 text-left">السعر المفرد</th>
                          <th className="p-2.5 text-left">الإجمالي الصافي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {selectedInvoice.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/40">
                            <td className="p-2.5 text-gray-400 font-mono">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-800">{it.itemName}</td>
                            <td className="p-2.5 text-center font-bold font-mono text-[#4b8c82]">
                              {it.qty}
                            </td>
                            <td className="p-2.5 text-left font-mono">{formatCurrency(it.price, 'YER')}</td>
                            <td className="p-2.5 text-left font-bold font-mono text-slate-800">
                              {formatCurrency(it.price * it.qty, 'YER')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/50 border border-dashed border-amber-200 rounded-2xl p-4 text-center">
                  <p className="text-xs font-bold text-amber-800">
                    مستند مالي مباشر (قيد حساب أو سند صرف/قبض) بدون سلع ملموسة.
                  </p>
                </div>
              )}

              {/* Financial Metrics Summary Box */}
              <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/70 space-y-2.5">
                <h4 className="text-xs font-black text-slate-500">الملخص المالي والمسحوبات:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-sm">
                    <span className="text-[9px] text-gray-400 font-bold block mb-0.5">المجموع الكلي</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {formatCurrency(selectedInvoice.amount + (selectedInvoice.discount || 0), 'YER')}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-sm">
                    <span className="text-[9px] text-gray-400 font-bold block mb-0.5">الخصم الممنوح</span>
                    <span className="text-xs font-bold text-rose-600 font-mono">
                      {selectedInvoice.discount && selectedInvoice.discount > 0 ? `-${formatCurrency(selectedInvoice.discount, 'YER')}` : '0 YER'}
                    </span>
                  </div>

                  <div className="bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-200 shadow-sm">
                    <span className="text-[9px] text-emerald-800 font-bold block mb-0.5">المسدد نقداً</span>
                    <span className="text-xs font-black text-emerald-700 font-mono">
                      {formatCurrency(selectedInvoice.cashPaid, 'YER')}
                    </span>
                  </div>

                  <div className="bg-amber-50/30 p-2.5 rounded-xl border border-amber-200 shadow-sm">
                    <span className="text-[9px] text-amber-800 font-bold block mb-0.5">الرصيد الآجل (الحساب)</span>
                    <span className={`text-xs font-black font-mono ${selectedInvoice.creditAmount > 0 ? 'text-amber-700' : 'text-slate-600'}`}>
                      {formatCurrency(selectedInvoice.creditAmount, 'YER')}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-[#4b8c82]/5 border border-[#4b8c82]/10 p-3 rounded-xl mt-2">
                  <span className="text-xs font-black text-slate-700">صافي المبلغ المعلق بالفاتورة:</span>
                  <span className="text-base font-black text-[#4b8c82] font-mono">
                    {formatCurrency(selectedInvoice.amount, 'YER')}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Share and Print Actions */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => handleWhatsAppInvoiceShare(selectedInvoice)}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>إرسال الفاتورة عبر الواتساب</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleCopyInvoiceText(selectedInvoice)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isInvoiceCopied
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {isInvoiceCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                <span>{isInvoiceCopied ? 'تم نسخ نص الفاتورة!' : 'نسخ نص الفاتورة'}</span>
              </button>
            </div>

            {/* Modal Footer Controls */}
            <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 text-[#4b8c82] hover:text-teal-950 text-xs font-bold bg-teal-50 hover:bg-teal-100 border border-teal-100 px-4 py-2.5 rounded-xl cursor-pointer transition-all"
              >
                <Printer className="h-4 w-4" />
                <span>طباعة إيصال الفاتورة المباشرة</span>
              </button>

              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled Printable Invoice Voucher Layout for Print Media only */}
      {selectedInvoice && (
        <div className="hidden print:block text-right text-slate-900 p-8 max-w-lg mx-auto border border-dashed border-slate-400 font-sans leading-relaxed print-invoice-only" dir="rtl">
          <div className="text-center border-b-2 border-slate-800 pb-4 mb-5">
            <h1 className="font-bold text-xl">بيبرس للمحاسبة</h1>
            <p className="text-xs text-slate-500">نظام ذكي متكامل للمخازن والحسابات العامة</p>
            <h2 className="font-black text-sm mt-3 px-4 py-1.5 bg-slate-100 border border-slate-200 rounded-xl inline-block">
              {getInvoiceTypeText(selectedInvoice.type)}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-300 pb-4 mb-4">
            <div><strong>رقم المستند:</strong> <span className="font-mono text-sm">{selectedInvoice.invoiceNumber || selectedInvoice.id.slice(0, 8)}</span></div>
            <div><strong>تاريخ الحركة:</strong> <span>{new Date(selectedInvoice.date).toLocaleString('ar-YE')}</span></div>
            <div><strong>الجهة / الحساب:</strong> <span className="font-bold">{selectedInvoice.partyName || selectedParty?.name || 'نقداً / زبون مباشر'}</span></div>
            <div><strong>رقم الهاتف للجهة:</strong> <span>{selectedParty?.phone || 'غير متوفر'}</span></div>
            <div className="col-span-2"><strong>البيان والتفاصيل:</strong> <span>{selectedInvoice.details || '-'}</span></div>
          </div>

          {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
            <div className="border-b-2 border-slate-800 pb-4 mb-4">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-700 font-bold">
                    <th className="py-1">اسم الصنف والسلعة</th>
                    <th className="py-1 text-center">الكمية</th>
                    <th className="py-1 text-left">سعر البيع/الشراء</th>
                    <th className="py-1 text-left">الإجمالي الصافي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {selectedInvoice.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-bold">{it.itemName}</td>
                      <td className="py-2 text-center font-mono">{it.qty}</td>
                      <td className="py-2 text-left font-mono">{formatCurrency(it.price, 'YER')}</td>
                      <td className="py-2 text-left font-mono font-bold">{formatCurrency(it.price * it.qty, 'YER')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border-b-2 border-slate-800 py-3 text-center text-xs mb-4">
              <span>مستند ترحيل أو سند صرف / قبض مالي مباشر للحساب المذكور.</span>
            </div>
          )}

          <div className="space-y-1.5 text-xs font-bold text-slate-800">
            <div className="flex justify-between">
              <span>المجموع الكلي:</span>
              <span className="font-mono">{formatCurrency(selectedInvoice.amount + (selectedInvoice.discount || 0), 'YER')}</span>
            </div>
            {selectedInvoice.discount && selectedInvoice.discount > 0 && (
              <div className="flex justify-between text-rose-700">
                <span>الخصم الممنوح:</span>
                <span className="font-mono">-{formatCurrency(selectedInvoice.discount, 'YER')}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-900 border-t-2 border-slate-800 pt-1 text-sm font-black">
              <span>الصافي المطلوب:</span>
              <span className="font-mono">{formatCurrency(selectedInvoice.amount, 'YER')}</span>
            </div>
            <div className="flex justify-between text-emerald-800 mt-1">
              <span>المبلغ المدفوع نقداً:</span>
              <span className="font-mono">{formatCurrency(selectedInvoice.cashPaid, 'YER')}</span>
            </div>
            {selectedInvoice.creditAmount !== 0 && (
              <div className="flex justify-between text-amber-700">
                <span>المتبقي في الحساب المالي (آجل):</span>
                <span className="font-mono">{formatCurrency(selectedInvoice.creditAmount, 'YER')}</span>
              </div>
            )}
          </div>

          <div className="text-center text-[10px] text-slate-500 mt-8 pt-4 border-t border-slate-300 border-dashed">
            شكرًا لتعاملكم معنا. تم الطباعة بنجاح عبر نظام بيبرس للمحاسبة.
          </div>
        </div>
      )}

      {/* Styled print injector block */}
      {isInvoiceModalOpen && (
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden !important;
            }
            .print-invoice-only, .print-invoice-only * {
              visibility: visible !important;
            }
            .print-invoice-only {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              display: block !important;
            }
          }
        ` }} />
      )}
    </div>
  );
}
