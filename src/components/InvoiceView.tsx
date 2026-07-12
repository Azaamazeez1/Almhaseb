import React, { useState, useMemo } from 'react';
import {
  FileText,
  ShoppingCart,
  Users,
  Layers,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  TrendingDown,
  Percent,
  Wallet,
  Coins,
  FileSpreadsheet,
  Search,
  ArrowLeft,
  X,
  Printer,
  Share2,
  FileDown,
  PlusCircle,
  Sparkles,
  ChevronRight,
  MoreVertical,
  Maximize2,
  Mail,
  MessageCircle
} from 'lucide-react';
import { Item, Customer, Supplier, Transaction, TransactionType } from '../types';
import { formatCurrency, getCurrencySymbol } from '../utils';
import { CustomSelect, UNIT_OPTIONS } from './CustomSelect';

interface InvoiceViewProps {
  items: Item[];
  customers: Customer[];
  suppliers: Supplier[];
  onAddTransaction: (tx: Transaction) => void;
  onUpdateStock: (itemId: string, newStock: number) => void;
  onUpdatePartyBalance: (partyType: 'customer' | 'supplier', partyId: string, amountChange: number) => void;
  initialInvoiceType: 'sale' | 'purchase';
  onAddItem?: (item: Omit<Item, 'id'>) => Item;
  onSaveInvoice?: (
    newTx: Transaction,
    stockChanges: { itemId: string; newStock: number }[],
    partyBalanceChange?: { partyType: 'customer' | 'supplier'; partyId: string; amountChange: number }
  ) => void;
}

interface CartItem {
  itemId: string;
  itemName: string;
  qty: number;
  price: number;
  cost: number;
  unit: string;
  discount: number;
}

export default function InvoiceView({
  items,
  customers,
  suppliers,
  onAddTransaction,
  onUpdateStock,
  onUpdatePartyBalance,
  initialInvoiceType,
  onAddItem,
  onSaveInvoice
}: InvoiceViewProps) {
  // Navigation states
  const [invoiceType, setInvoiceType] = useState<'sale' | 'purchase'>(initialInvoiceType);
  const [showCreator, setShowCreator] = useState(false);

  // Active creator states
  const [paymentMode, setPaymentMode] = useState<'cash' | 'credit'>('cash');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [details, setDetails] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Search & add item modal states
  const [isItemSelectorOpen, setIsItemSelectorOpen] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [activeSelectorItem, setActiveSelectorItem] = useState<Item | null>(null);

  // Inline Item Creation form states (inside the Selector modal)
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);
  const [newSelectorItemName, setNewSelectorItemName] = useState('');
  const [newSelectorItemCode, setNewSelectorItemCode] = useState('');
  const [newSelectorItemCost, setNewSelectorItemCost] = useState('0');
  const [newSelectorItemPrice, setNewSelectorItemPrice] = useState('0');
  const [newSelectorItemUnit, setNewSelectorItemUnit] = useState('حبة');

  // Selector form values
  const [selectorUnit, setSelectorUnit] = useState('حبة');
  const [selectorQty, setSelectorQty] = useState('1');
  const [selectorPrice, setSelectorPrice] = useState('0');
  const [selectorTotal, setSelectorTotal] = useState('0');
  const [activeSelectorField, setActiveSelectorField] = useState<'qty' | 'price'>('qty');

  // Finalizer Dialog states
  const [isFinalizerOpen, setIsFinalizerOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [finalDiscount, setFinalDiscount] = useState(0);
  const [finalDiscountPercent, setFinalDiscountPercent] = useState(0);
  const [finalTax, setFinalTax] = useState(0);
  const [finalTaxPercent, setFinalTaxPercent] = useState(0);
  const [discountInputStr, setDiscountInputStr] = useState('');
  const [discountPercentInputStr, setDiscountPercentInputStr] = useState('');
  const [taxInputStr, setTaxInputStr] = useState('');
  const [taxPercentInputStr, setTaxPercentInputStr] = useState('');
  const [finalNotes, setFinalNotes] = useState('');

  // Share Modal states
  const [activeShareInvoice, setActiveShareInvoice] = useState<any | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [dontShowSharePrompt, setDontShowSharePrompt] = useState(() => localStorage.getItem('dontShowSharePrompt') === 'true');

  // Daily Filter state - defaults to current day
  const [selectedDateFilter, setSelectedDateFilter] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Arabic date helpers
  const getArabicDayName = (dateStr: string) => {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    try {
      const date = new Date(dateStr);
      return days[date.getDay()];
    } catch {
      return 'السبت';
    }
  };

  const formatDateArabic = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-');
      return `${d}-${m}-${y}`;
    } catch {
      return dateStr;
    }
  };

  // Switch invoice type (sale/purchase)
  const handleInvoiceTypeChange = (type: 'sale' | 'purchase') => {
    setInvoiceType(type);
    resetCreator();
    setShowCreator(false);
  };

  // Reset current invoice creator state
  const resetCreator = () => {
    setPaymentMode('cash');
    setSelectedPartyId('');
    setCart([]);
    setDetails('');
    setFinalDiscount(0);
    setFinalDiscountPercent(0);
    setFinalTax(0);
    setFinalTaxPercent(0);
    setDiscountInputStr('');
    setDiscountPercentInputStr('');
    setTaxInputStr('');
    setTaxPercentInputStr('');
    setFinalNotes('');
    setInvoiceNumber(`${invoiceType === 'sale' ? 'S' : 'P'}-${Date.now().toString().slice(-6)}`);
  };

  // Sync string values when finalizer or discount modal opens
  React.useEffect(() => {
    if (isFinalizerOpen || isDiscountModalOpen) {
      setDiscountInputStr(finalDiscount === 0 ? '' : finalDiscount.toString());
      setDiscountPercentInputStr(finalDiscountPercent === 0 ? '' : finalDiscountPercent.toString());
      setTaxInputStr(finalTax === 0 ? '' : finalTax.toString());
      setTaxPercentInputStr(finalTaxPercent === 0 ? '' : finalTaxPercent.toString());
    }
  }, [isFinalizerOpen, isDiscountModalOpen]);

  // Generate initial invoice number
  React.useEffect(() => {
    if (!invoiceNumber) {
      setInvoiceNumber(`${invoiceType === 'sale' ? 'S' : 'P'}-${Date.now().toString().slice(-6)}`);
    }
  }, [invoiceType, invoiceNumber]);

  // Load all recorded transactions matching current date filter & type
  const allTransactions = useMemo(() => {
    try {
      const raw = localStorage.getItem('acct_inv_transactions');
      if (raw) {
        return JSON.parse(raw) as Transaction[];
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  }, [showCreator]); // Reload when exiting creator

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx) => {
      const sameType = tx.type === invoiceType;
      const txDateStr = tx.date.slice(0, 10);
      return sameType && txDateStr === selectedDateFilter;
    });
  }, [allTransactions, invoiceType, selectedDateFilter]);

  // Compute daily totals for current filtered transactions
  const dailyStats = useMemo(() => {
    let credit = 0;
    let cash = 0;
    let discount = 0;
    let profit = 0;
    let total = 0;

    filteredTransactions.forEach((tx) => {
      total += tx.amount;
      cash += tx.cashPaid;
      credit += tx.creditAmount;
      discount += tx.discount || 0;

      // Profit calculation (sales only)
      if (invoiceType === 'sale' && tx.items) {
        let txProfit = 0;
        tx.items.forEach((it) => {
          const cost = it.cost || 0;
          txProfit += (it.price - cost) * it.qty;
        });
        profit += (txProfit - (tx.discount || 0));
      }
    });

    return { credit, cash, discount, profit, total };
  }, [filteredTransactions, invoiceType]);

  // Filter items based on search input inside selector
  const filteredItems = useMemo(() => {
    if (!itemSearchTerm) return items;
    const term = itemSearchTerm.toLowerCase();
    return items.filter((it) => {
      return (
        it.name.toLowerCase().includes(term) ||
        it.code.toLowerCase().includes(term)
      );
    });
  }, [items, itemSearchTerm]);

  // When clicking an item inside search selector, open its expander form
  const handleSelectSelectorItem = (item: Item) => {
    setActiveSelectorItem(item);
    setSelectorUnit(item.unit || 'حبة');
    setSelectorQty('1');
    const defaultPrice = invoiceType === 'sale' ? item.salePrice : item.unitCost;
    setSelectorPrice(defaultPrice.toString());
    setSelectorTotal(defaultPrice.toString());
    setActiveSelectorField('qty');
  };

  // Recalculate selector total
  React.useEffect(() => {
    const qty = parseFloat(selectorQty) || 0;
    const price = parseFloat(selectorPrice) || 0;
    setSelectorTotal((qty * price).toFixed(2));
  }, [selectorQty, selectorPrice]);

  // Process keyboard keypad click in selector popup
  const handleKeypadPress = (key: string) => {
    const currentVal = activeSelectorField === 'qty' ? selectorQty : selectorPrice;
    
    if (key === '⌫') {
      const newVal = currentVal.slice(0, -1) || '0';
      if (activeSelectorField === 'qty') setSelectorQty(newVal);
      else setSelectorPrice(newVal);
    } else if (key === '⏎') {
      // triggers adding item to cart
      handleAddItemFromSelector(true); // save & add more
    } else if (key === '␣') {
      // Space - ignore
    } else {
      let newVal = currentVal;
      if (key === '.') {
        if (!currentVal.includes('.')) {
          newVal = currentVal + '.';
        }
      } else {
        if (currentVal === '0') {
          newVal = key; // If current value is 0, replace with clicked digit
        } else {
          newVal = currentVal + key;
        }
      }
      if (activeSelectorField === 'qty') setSelectorQty(newVal);
      else setSelectorPrice(newVal);
    }
  };

  // Quick qty adjustments
  const adjustSelectorQty = (val: number) => {
    const current = parseFloat(selectorQty) || 0;
    const next = Math.max(0, current + val);
    setSelectorQty(next.toString());
  };

  // Handle adding active item from search selector to cart
  const handleAddItemFromSelector = async (keepOpen: boolean) => {
    if (!activeSelectorItem) return;
    const qty = parseFloat(selectorQty) || 0;
    const price = parseFloat(selectorPrice) || 0;

    if (qty <= 0) {
      alert('الرجاء إدخال كمية صحيحة أكبر من الصفر');
      return;
    }

    // If sale, warn if stock is insufficient
    if (invoiceType === 'sale' && activeSelectorItem.stock < qty) {
      const confirmProceed = (window as any).customConfirm
        ? await (window as any).customConfirm(`تنبيه: الكمية المطلوبة (${qty}) تتجاوز المتوفر في المستودع (${activeSelectorItem.stock}). هل تريد المتابعة على أي حال؟`, 'كمية غير كافية بالمخزون')
        : window.confirm(`تنبيه: الكمية المطلوبة (${qty}) تتجاوز المتوفر في المستودع (${activeSelectorItem.stock}). هل تريد المتابعة على أي حال؟`);
      if (!confirmProceed) return;
    }

    const existingIndex = cart.findIndex((c) => c.itemId === activeSelectorItem.id);
    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].qty += qty;
      // update price to last entered
      newCart[existingIndex].price = price;
      setCart(newCart);
    } else {
      setCart([
        ...cart,
        {
          itemId: activeSelectorItem.id,
          itemName: activeSelectorItem.name,
          qty: qty,
          price: price,
          cost: activeSelectorItem.unitCost,
          unit: selectorUnit,
          discount: 0
        }
      ]);
    }

    // Reset selection values
    setActiveSelectorItem(null);
    setItemSearchTerm('');

    if (!keepOpen) {
      setIsItemSelectorOpen(false);
    }
  };

  // Compute subtotal of cart items
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [cart]);

  // Compute final amounts based on discounts & taxes
  const grandTotal = useMemo(() => {
    const disc = finalDiscount || 0;
    const tax = finalTax || 0;
    return Math.max(0, subtotal - disc + tax);
  }, [subtotal, finalDiscount, finalTax]);

  // Sync percentages with values
  const handleDiscountChange = (val: number) => {
    setFinalDiscount(val);
    setDiscountInputStr(val === 0 ? '' : val.toString());
    if (subtotal > 0) {
      const pct = parseFloat(((val / subtotal) * 100).toFixed(2));
      setFinalDiscountPercent(pct);
      setDiscountPercentInputStr(pct === 0 ? '' : pct.toString());
    } else {
      setFinalDiscountPercent(0);
      setDiscountPercentInputStr('');
    }
  };

  const handleDiscountPercentChange = (pct: number) => {
    setFinalDiscountPercent(pct);
    setDiscountPercentInputStr(pct === 0 ? '' : pct.toString());
    const amt = parseFloat(((pct / 100) * subtotal).toFixed(2));
    setFinalDiscount(amt);
    setDiscountInputStr(amt === 0 ? '' : amt.toString());
  };

  const handleTaxChange = (val: number) => {
    setFinalTax(val);
    setTaxInputStr(val === 0 ? '' : val.toString());
    if (subtotal > 0) {
      const pct = parseFloat(((val / subtotal) * 100).toFixed(2));
      setFinalTaxPercent(pct);
      setTaxPercentInputStr(pct === 0 ? '' : pct.toString());
    } else {
      setFinalTaxPercent(0);
      setTaxPercentInputStr('');
    }
  };

  const handleTaxPercentChange = (pct: number) => {
    setFinalTaxPercent(pct);
    setTaxPercentInputStr(pct === 0 ? '' : pct.toString());
    const amt = parseFloat(((pct / 100) * subtotal).toFixed(2));
    setFinalTax(amt);
    setTaxInputStr(amt === 0 ? '' : amt.toString());
  };

  // Post / Save invoice
  const handleSaveInvoice = () => {
    if (cart.length === 0) {
      alert('الرجاء إضافة بضائع أو أصناف أولاً قبل حفظ الفاتورة');
      return;
    }

    const partyName =
      invoiceType === 'sale'
        ? customers.find((c) => c.id === selectedPartyId)?.name
        : suppliers.find((s) => s.id === selectedPartyId)?.name;

    const cashPaid = paymentMode === 'cash' ? grandTotal : 0;
    const creditAmount = paymentMode === 'credit' ? grandTotal : 0;

    // Check credit warning
    if (paymentMode === 'credit' && !selectedPartyId) {
      alert(
        invoiceType === 'sale'
          ? 'الرجاء اختيار العميل لحفظ الفاتورة كحساب آجل له.'
          : 'الرجاء اختيار المورد لحفظ الفاتورة كحساب آجل له.'
      );
      return;
    }

    // 1. Compile Transaction Object
    const newTx: Transaction = {
      id: `${invoiceType}-${Date.now()}`,
      invoiceNumber: invoiceNumber,
      date: new Date().toISOString(),
      type: invoiceType,
      partyId: selectedPartyId || undefined,
      partyName: partyName,
      amount: grandTotal,
      discount: finalDiscount,
      cashPaid: cashPaid,
      creditAmount: creditAmount,
      details: finalNotes || `${invoiceType === 'sale' ? 'فاتورة مبيعات' : 'فاتورة مشتريات'} برقم ${invoiceNumber}`,
      items: cart.map((it) => ({
        itemId: it.itemId,
        itemName: it.itemName,
        qty: it.qty,
        price: it.price,
        cost: it.cost
      }))
    };

    // 2. Adjust Stock levels
    const stockChanges: { itemId: string; newStock: number }[] = [];
    cart.forEach((it) => {
      const item = items.find((i) => i.id === it.itemId);
      if (item) {
        const stockDiff = invoiceType === 'sale' ? -it.qty : it.qty;
        stockChanges.push({
          itemId: it.itemId,
          newStock: Math.max(0, item.stock + stockDiff)
        });
      }
    });

    const partyBalanceChange = selectedPartyId && creditAmount > 0 ? {
      partyType: (invoiceType === 'sale' ? 'customer' : 'supplier') as 'customer' | 'supplier',
      partyId: selectedPartyId,
      amountChange: creditAmount
    } : undefined;

    if (onSaveInvoice) {
      onSaveInvoice(newTx, stockChanges, partyBalanceChange);
    } else {
      // Fallback
      stockChanges.forEach((sc) => {
        onUpdateStock(sc.itemId, sc.newStock);
      });
      if (partyBalanceChange) {
        onUpdatePartyBalance(
          partyBalanceChange.partyType,
          partyBalanceChange.partyId,
          partyBalanceChange.amountChange
        );
      }
      onAddTransaction(newTx);
    }

    // Reset and exit
    setIsFinalizerOpen(false);
    setShowCreator(false);
    resetCreator();
    
    if (dontShowSharePrompt) {
      alert('تم حفظ وترحيل الفاتورة وتحديث المخزون بنجاح!');
    } else {
      setActiveShareInvoice(newTx);
      setIsShareModalOpen(true);
    }
  };

  const generateShareText = (tx: any) => {
    const isSale = tx.type === 'sale';
    const typeText = isSale ? 'فاتورة مبيعات' : 'فاتورة مشتريات';
    const numberText = tx.invoiceNumber || (tx.id === 'draft' ? 'مسودة' : tx.id?.slice(-6)) || 'مسودة';
    
    const dateObj = tx.date ? new Date(tx.date) : new Date();
    const dateStr = dateObj.toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const isCash = (tx.cashPaid || 0) > 0 && (tx.creditAmount || 0) === 0;
    const isCredit = (tx.creditAmount || 0) > 0 && (tx.cashPaid || 0) === 0;
    const payMode = isCash ? 'نقداً' : isCredit ? 'آجل' : 'جزئي آجل';
    
    const partyLabel = isSale ? 'العميل' : 'المورد';
    const partyName = tx.partyName || (isSale ? 'نقداً - صندوق المبيعات الفورية' : 'صندوق المشتريات الفورية');

    let itemsText = '';
    if (tx.items && tx.items.length > 0) {
      tx.items.forEach((it: any, index: number) => {
        itemsText += `  ${index + 1}. ${it.itemName} - ${it.qty} حبة × ${formatCurrency(it.price)}\n`;
      });
    }

    const discountVal = tx.discount || 0;
    const netAmount = tx.amount;
    const subTotalVal = netAmount + discountVal;

    const msg = `*بيبرس للمحاسبة - ${typeText}* 🧾
----------------------------------------
*رقم الفاتورة:* ${numberText}
*التاريخ:* ${dateStr}
*طريقة السداد:* ${payMode}
*${partyLabel}:* ${partyName}

*الأصناف والمبيعات:*
${itemsText}----------------------------------------
*المجموع الإجمالي:* ${formatCurrency(subTotalVal)}
*الخصم الممنوح:* ${formatCurrency(discountVal)}
*الصافي المطلوب:* ${formatCurrency(netAmount)}
*المسدد نقداً:* ${formatCurrency(tx.cashPaid || 0)}

*برنامج بيبرس للمحاسبة* 📱:
https://almhaseb.vercel.app/`;

    return msg;
  };

  const handleShareDraft = () => {
    if (cart.length === 0) {
      alert('الرجاء إضافة أصناف للفاتورة أولاً قبل مشاركتها!');
      return;
    }
    const partyName =
      invoiceType === 'sale'
        ? customers.find((c) => c.id === selectedPartyId)?.name
        : suppliers.find((s) => s.id === selectedPartyId)?.name;

    const cashPaid = paymentMode === 'cash' ? grandTotal : 0;
    const creditAmount = paymentMode === 'credit' ? grandTotal : 0;

    const draftTx = {
      id: 'draft',
      invoiceNumber: invoiceNumber || 'مسودة',
      type: invoiceType,
      date: new Date().toISOString(),
      partyName: partyName,
      amount: grandTotal,
      discount: finalDiscount,
      cashPaid: cashPaid,
      creditAmount: creditAmount,
      items: cart.map((it) => ({
        itemName: it.itemName,
        qty: it.qty,
        price: it.price
      }))
    };
    setActiveShareInvoice(draftTx);
    setIsShareModalOpen(true);
  };

  // Get current active balance of selected party
  const selectedPartyBalance = useMemo(() => {
    if (!selectedPartyId) return 0;
    if (invoiceType === 'sale') {
      return customers.find((c) => c.id === selectedPartyId)?.balance || 0;
    } else {
      return suppliers.find((s) => s.id === selectedPartyId)?.balance || 0;
    }
  }, [selectedPartyId, customers, suppliers, invoiceType]);

  // Adjust Cart item quantity
  const updateCartItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setCart(cart.filter((_, idx) => idx !== index));
    } else {
      const newCart = [...cart];
      newCart[index].qty = newQty;
      setCart(newCart);
    }
  };

  return (
    <div dir="rtl" className="space-y-6 font-sans">
      {/* Tab Selectors mimicking native look */}
      <div className="flex border border-slate-200 p-1.5 bg-white rounded-2xl max-w-md mx-auto">
        <button
          onClick={() => handleInvoiceTypeChange('sale')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs transition-all cursor-pointer ${
            invoiceType === 'sale'
              ? 'bg-[#4b8c82] text-white shadow-sm'
              : 'text-gray-500 hover:bg-slate-50 hover:text-gray-800'
          }`}
        >
          <FileText className="h-4.5 w-4.5" />
          <span>قسم فواتير المبيعات</span>
        </button>
        <button
          onClick={() => handleInvoiceTypeChange('purchase')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-xs transition-all cursor-pointer ${
            invoiceType === 'purchase'
              ? 'bg-amber-700 text-white shadow-sm'
              : 'text-gray-500 hover:bg-slate-50 hover:text-gray-800'
          }`}
        >
          <ShoppingCart className="h-4.5 w-4.5" />
          <span>قسم فواتير المشتريات</span>
        </button>
      </div>

      {!showCreator ? (
        /* ==================== STATE 1: DAILY OVERVIEW LIST ==================== */
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-md max-w-4xl mx-auto">
          {/* Header Bar styled exactly like Screen 1 */}
          <div className="bg-[#4b8c82] text-white px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                {invoiceType === 'sale' ? (
                  <FileSpreadsheet className="h-5 w-5 text-teal-100" />
                ) : (
                  <ShoppingCart className="h-5 w-5 text-amber-100" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">
                  {invoiceType === 'sale' ? 'إدارة المبيعات' : 'إدارة المشتريات'}
                </h2>
                <p className="text-[10px] text-teal-100/80 font-semibold font-mono mt-0.5">
                  تاريخ اليوم المالي: {formatDateArabic(selectedDateFilter)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Date Filter selector to browse days */}
              <input
                type="date"
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:bg-white/20 cursor-pointer"
              />
              <button className="p-2 hover:bg-white/10 rounded-xl transition-colors cursor-pointer">
                <Search className="h-4.5 w-4.5" />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-xl transition-colors cursor-pointer">
                <MoreVertical className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Statistics sub-header row mimicking Screen 1 */}
          <div className="bg-slate-50/80 border-b border-slate-100 p-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            {/* Stat Box: Total */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-center min-w-0 md:col-span-1.5">
              <span className="text-[10px] text-slate-500 font-bold mb-1">
                {invoiceType === 'sale' ? 'إجمالي المبيعات' : 'إجمالي المشتريات'}
              </span>
              <span className="text-sm font-black text-[#4b8c82] font-mono leading-none">
                {formatCurrency(dailyStats.total)}
              </span>
            </div>

            {/* Stat Box: Cash */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-center min-w-0">
              <span className="text-[10px] text-slate-500 font-bold mb-1">نقداً</span>
              <span className="text-sm font-black text-emerald-600 font-mono leading-none">
                {formatCurrency(dailyStats.cash)}
              </span>
            </div>

            {/* Stat Box: Credit */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-center min-w-0">
              <span className="text-[10px] text-slate-500 font-bold mb-1">آجل</span>
              <span className="text-sm font-black text-amber-600 font-mono leading-none">
                {formatCurrency(dailyStats.credit)}
              </span>
            </div>

            {/* Stat Box: Discount */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-center min-w-0">
              <span className="text-[10px] text-slate-500 font-bold mb-1">الخصم</span>
              <span className="text-sm font-black text-rose-600 font-mono leading-none">
                {formatCurrency(dailyStats.discount)}
              </span>
            </div>

            {/* Stat Box: Profit (Only for sales) */}
            {invoiceType === 'sale' && (
              <div className="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-center min-w-0">
                <span className="text-[10px] text-[#4b8c82] font-black mb-1">العائد / الأرباح</span>
                <span className="text-sm font-black text-teal-700 font-mono leading-none">
                  {formatCurrency(dailyStats.profit)}
                </span>
              </div>
            )}
          </div>

          {/* Current Day Stats description */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex justify-between text-xs font-bold text-slate-500">
            <span>اليوم المالي: {getArabicDayName(selectedDateFilter)}</span>
            <span>عدد الفواتير المسجلة: {filteredTransactions.length}</span>
          </div>

          {/* List of items / invoices */}
          <div className="p-6">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <FileText className="h-8 w-8" />
                </div>
                <p className="text-sm font-bold text-slate-500 leading-relaxed max-w-sm mx-auto">
                  لا يوجد {invoiceType === 'sale' ? 'مبيعات' : 'مشتريات'} لهذا اليوم.
                  <br />
                  لتسجيل {invoiceType === 'sale' ? 'مبيعات' : 'مشتريات'} اضغط الزر + أسفل
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((tx, idx) => (
                  <div
                    key={tx.id}
                    className="border border-slate-150 rounded-2xl p-4 hover:border-slate-300 hover:shadow-sm transition-all bg-white space-y-3"
                  >
                    <div className="flex justify-between items-center text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700 font-mono">
                          رقم: {tx.invoiceNumber || tx.id.slice(-6)}
                        </span>
                        <button
                          onClick={() => {
                            setActiveShareInvoice(tx);
                            setIsShareModalOpen(true);
                          }}
                          className="p-1 hover:bg-slate-150 rounded-lg text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                          title="مشاركة الفاتورة"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-slate-400 font-normal">
                        {new Date(tx.date).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">المستفيد / الجهة</span>
                        <span className="text-sm font-black text-slate-800">
                          {tx.partyName || 'نقداً - صندوق المبيعات الفورية'}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-[10px] text-slate-400 font-bold block mb-0.5">الإجمالي الصافي</span>
                        <span className="text-base font-black text-emerald-700 font-sans">
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    </div>

                    {/* Mini inline items loop */}
                    {tx.items && tx.items.length > 0 && (
                      <div className="bg-slate-50/50 rounded-xl p-2.5 border border-slate-100 text-xs font-semibold text-slate-600 space-y-1">
                        {tx.items.map((it, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{it.itemName} × {it.qty}</span>
                            <span className="font-mono">{formatCurrency(it.price * it.qty)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Bar at Bottom of Screen 1 */}
          <div className="bg-slate-50 border-t border-slate-100 p-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
            {/* Button Left: Previous Sales */}
            <button className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer">
              <ChevronRight className="h-4.5 w-4.5" />
              <span>المبيعات السابقة</span>
            </button>

            {/* Quick cash - no invoice */}
            <button
              onClick={() => {
                resetCreator();
                setPaymentMode('cash');
                setShowCreator(true);
                setIsItemSelectorOpen(true); // open item selector right away!
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
            >
              <PlusCircle className="h-4 w-4 text-[#4b8c82]" />
              <span>نقداً - بلا فاتورة</span>
            </button>

            {/* New Invoice button */}
            <button
              onClick={() => {
                resetCreator();
                setShowCreator(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-[#4b8c82] hover:bg-teal-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>فاتورة جديدة</span>
            </button>
          </div>
        </div>
      ) : (
        /* ==================== STATE 2: NEW INVOICE CREATOR ==================== */
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-md max-w-4xl mx-auto">
          {/* Header Bar styled exactly like Screen 2 */}
          <div className="bg-[#4b8c82] text-white px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreator(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="رجوع للقائمة"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-base font-black tracking-tight">
                  {invoiceType === 'sale' ? 'فاتورة بيع بضاعة' : 'فاتورة شراء بضاعة'}
                </h2>
                <span className="text-[10px] text-teal-100/90 font-bold font-mono">
                  رقم: {invoiceNumber}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="طباعة فورية"
              >
                <Printer className="h-4.5 w-4.5 text-teal-100" />
              </button>
              <button
                onClick={handleShareDraft}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="مشاركة الفاتورة"
              >
                <Share2 className="h-4.5 w-4.5 text-teal-100" />
              </button>
              <button
                onClick={() => window.print()}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="تصدير PDF"
              >
                <FileDown className="h-4.5 w-4.5 text-teal-100" />
              </button>
              <button
                onClick={() => setIsItemSelectorOpen(true)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors cursor-pointer bg-white/10 border border-white/20"
                title="البحث عن صنف وإضافته"
              >
                <Search className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Form & Selection Area */}
          <div className="p-6 space-y-6">
            {/* Top row: Toggle payment mode (Cash/Credit) with radio styling */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
              <div className="flex items-center gap-4">
                <span className="text-xs font-black text-slate-500">طريقة السداد:</span>
                
                {/* Cash Radio option */}
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700">
                  <input
                    type="radio"
                    name="payment_mode"
                    checked={paymentMode === 'cash'}
                    onChange={() => setPaymentMode('cash')}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300"
                  />
                  <span>نقداً (صندوق مباشر)</span>
                </label>

                {/* Credit Radio option */}
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700">
                  <input
                    type="radio"
                    name="payment_mode"
                    checked={paymentMode === 'credit'}
                    onChange={() => setPaymentMode('credit')}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300"
                  />
                  <span>آجل (على الحساب)</span>
                </label>
              </div>

              {/* Date & Invoice Type indicators */}
              <div className="text-left text-[11px] font-bold text-slate-400 font-mono">
                تاريخ التسجيل: {formatDateArabic(new Date().toISOString().slice(0, 10))}
              </div>
            </div>

            {/* Client/Supplier selection */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-black text-slate-500 mb-1.5">
                  {invoiceType === 'sale' ? 'العميل المستفيد' : 'المورد المجهز'}
                </label>
                <select
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-bold"
                >
                  <option value="">
                    {invoiceType === 'sale' ? '-- زبون سفري (كاش مباشر) --' : '-- مورد نقدي عشوائي --'}
                  </option>
                  {invoiceType === 'sale'
                    ? customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (الرصيد السابق: {formatCurrency(c.balance)})
                        </option>
                      ))
                    : suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (الرصيد السابق: {formatCurrency(s.balance)})
                        </option>
                      ))}
                </select>
              </div>

              {/* Large circular plus button to open item search modal directly next to party line */}
              <button
                type="button"
                onClick={() => setIsItemSelectorOpen(true)}
                className="h-10 w-10 bg-[#4b8c82] hover:bg-teal-800 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer shrink-0"
                title="إضافة صنف للفاتورة"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {/* Config metadata metrics displayed cleanly */}
            <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center text-[10px] font-black text-slate-500">
              <div
                onClick={() => setIsDiscountModalOpen(true)}
                className="cursor-pointer hover:bg-rose-50 p-1 rounded-lg transition-colors flex items-center justify-center gap-1 border border-transparent hover:border-rose-150"
                title="تعديل الخصم"
              >
                <span>الخصم:</span>
                <span className="text-rose-600 font-bold font-mono">{formatCurrency(finalDiscount)}</span>
              </div>
              <div>
                الضريبة (%{finalTaxPercent}): <span className="text-amber-600 font-bold font-mono">{formatCurrency(finalTax)}</span>
              </div>
              <div>
                تاريخ الحركة: <span className="text-slate-600 font-bold font-mono">{formatDateArabic(new Date().toISOString().slice(0, 10))}</span>
              </div>
              <div>
                الرصيد السابق للجهة: <span className="text-red-500 font-bold font-mono">{formatCurrency(selectedPartyBalance)}</span>
              </div>
            </div>

            {/* List of Cart items with exact Screenshot 5 Styling */}
            <div className="space-y-3.5">
              <span className="text-xs font-black text-slate-500 block">البضائع المدرجة بالفاتورة:</span>

              {cart.length === 0 ? (
                <div className="border border-dashed border-slate-250 rounded-2xl p-12 text-center bg-slate-50/50 space-y-4">
                  <span className="text-xs font-bold text-slate-400 block leading-relaxed">
                    لإضافة أصناف الى فاتورة اضغط الزر أعلى +
                  </span>
                  <button
                    onClick={() => setIsItemSelectorOpen(true)}
                    type="button"
                    className="mx-auto px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4 text-[#4b8c82]" />
                    <span>البحث السريع وإدراج الصنف</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, idx) => {
                    const totalCost = item.cost * item.qty;
                    const totalSale = item.price * item.qty;
                    const profitMargin = totalSale > 0 ? Math.round(((totalSale - totalCost) / totalSale) * 100) : 0;
                    const profitVal = totalSale - totalCost;

                    return (
                      <div
                        key={idx}
                        className="border border-slate-150 rounded-2xl p-4 bg-white hover:border-slate-300 transition-all shadow-sm space-y-3 relative group"
                      >
                        {/* Title and Stock badge row */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="h-5 w-5 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-400">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-black text-slate-800">{item.itemName}</span>
                          </div>

                          <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-lg font-bold border border-emerald-100">
                            الوحدة: {item.unit}
                          </span>
                        </div>

                        {/* Badges indicators exactly mimicking Screen 5 indicators list */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 bg-slate-50/75 p-2 rounded-xl border border-slate-100 text-center text-[10px] font-bold text-slate-500">
                          <div>
                            العدد: <span className="text-slate-800 font-bold font-mono">{item.qty}</span>
                          </div>
                          <div>
                            السعر: <span className="text-slate-800 font-bold font-mono">{formatCurrency(item.price)}</span>
                          </div>
                          <div>
                            الإجمالي: <span className="text-teal-700 font-black font-mono">{formatCurrency(item.price * item.qty)}</span>
                          </div>
                          {invoiceType === 'sale' && (
                            <>
                              <div>
                                التكلفة: <span className="text-slate-500 font-bold font-mono">{formatCurrency(item.cost)}</span>
                              </div>
                              <div>
                                الربح: <span className="text-emerald-600 font-bold font-mono">%{profitMargin}</span>
                              </div>
                              <div>
                                العائد: <span className="text-emerald-700 font-bold font-mono">{formatCurrency(profitVal)}</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Adjust qty & price controllers inside row */}
                        <div className="flex justify-between items-center pt-1">
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden scale-90 origin-right">
                            <button
                              type="button"
                              onClick={() => updateCartItemQty(idx, item.qty - 1)}
                              className="px-2 py-1 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-3 text-xs font-black font-mono text-slate-700">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartItemQty(idx, item.qty + 1)}
                              className="px-2 py-1 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => updateCartItemQty(idx, 0)}
                            className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف الصنف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Note Text area */}
            <div>
              <label className="block text-xs font-black text-slate-500 mb-1.5">ملاحظات الفاتورة</label>
              <textarea
                value={finalNotes}
                onChange={(e) => setFinalNotes(e.target.value)}
                rows={2}
                placeholder="مثال: فاتورة مبيعات بضائع نقدية..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>

          {/* Bottom Grid Summary exactly matching layout structure of Screen 2 */}
          <div className="bg-slate-50 border-t border-slate-200 grid grid-cols-4 divide-x divide-x-reverse divide-slate-200 text-center overflow-hidden">
            {/* Net (الصافي) - Blue columns */}
            <div className="p-4 bg-teal-50">
              <span className="block text-[10px] font-black text-teal-800 mb-1">الصافي</span>
              <span className="text-base font-black text-teal-900 font-sans leading-none">
                {formatCurrency(grandTotal)}
              </span>
            </div>

            {/* VAT (الضريبة) */}
            <div className="p-4 bg-amber-50">
              <span className="block text-[10px] font-black text-amber-800 mb-1">الضريبة (%{finalTaxPercent})</span>
              <span className="text-base font-black text-amber-900 font-sans leading-none">
                {formatCurrency(finalTax)}
              </span>
            </div>

            {/* Discount (الخصم) */}
            <div
              onClick={() => setIsDiscountModalOpen(true)}
              className="p-4 bg-rose-50 hover:bg-rose-100/70 transition-colors cursor-pointer select-none"
              title="اضغط هنا لتعديل الخصم الممنوح"
            >
              <span className="block text-[10px] font-black text-rose-800 mb-1 flex items-center justify-center gap-1">
                <Percent className="h-3 w-3 text-rose-600" />
                <span>الخصم</span>
              </span>
              <span className="text-base font-black text-rose-900 font-sans leading-none">
                {formatCurrency(finalDiscount)}
              </span>
            </div>

            {/* Subtotal (المجموع) */}
            <div className="p-4 bg-slate-100">
              <span className="block text-[10px] font-black text-slate-600 mb-1">المجموع</span>
              <span className="text-base font-black text-slate-800 font-sans leading-none">
                {formatCurrency(subtotal)}
              </span>
            </div>
          </div>

          {/* Finalize button bar */}
          <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center">
            <button
              onClick={() => setShowCreator(false)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              إلغاء التعديل
            </button>

            <button
              onClick={() => setIsFinalizerOpen(true)}
              disabled={cart.length === 0}
              className={`px-8 py-3.5 rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                cart.length > 0
                  ? 'bg-teal-700 hover:bg-teal-800 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <CheckCircle className="h-4.5 w-4.5" />
              <span>مراجعة وحفظ الفاتورة المالية</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================== MODAL 1: SEARCH & ADD ITEM SELECTOR (SCREEN 3 & 4) ==================== */}
      {isItemSelectorOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-teal-50 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Search inputs matching Screen 3 Header */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="h-4.5 w-4.5 text-[#4b8c82]" />
                  <span>{isAddingNewItem ? 'إنشاء صنف جديد وإضافته فوراً' : 'البحث السريع عن بضائع الأصناف وإضافتها'}</span>
                </span>
                <div className="flex items-center gap-2">
                  {!isAddingNewItem && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewSelectorItemName(itemSearchTerm);
                        setIsAddingNewItem(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 rounded-xl text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                      title="إضافة صنف جديد فوراً"
                    >
                      <Plus className="h-3 w-3" />
                      <span>إضافة صنف جديد</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsItemSelectorOpen(false);
                      setActiveSelectorItem(null);
                      setIsAddingNewItem(false);
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {!isAddingNewItem && (
                <div className="relative">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="بداية الإسم أو الرقم أو نهاية الرقم..."
                    value={itemSearchTerm}
                    onChange={(e) => setItemSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-black text-right"
                    autoFocus
                  />
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                    [Barcode]
                  </span>
                </div>
              )}
            </div>

            {isAddingNewItem ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newSelectorItemName || !newSelectorItemCode) {
                    alert('يرجى ملء جميع الحقول المطلوبة.');
                    return;
                  }
                  const duplicateCode = items.some((it) => it.code === newSelectorItemCode);
                  if (duplicateCode) {
                    alert('عذراً، رقم الصنف أو الباركود هذا مسجل مسبقاً لصنف آخر.');
                    return;
                  }
                  const costValue = Number(newSelectorItemCost) || 0;
                  const priceValue = Number(newSelectorItemPrice) || 0;
                  if (costValue > priceValue) {
                    alert('عذراً! لا يمكن الحفظ لأن سعر الشراء (رأس المال) أعلى من سعر البيع المقترح (المبيع)، مما يعني حدوث خسارة على هذا الصنف. يرجى تعديل الأسعار أولاً لتجنب تسجيل خسائر.');
                    return;
                  }
                  if (onAddItem) {
                    const created = onAddItem({
                      code: newSelectorItemCode,
                      name: newSelectorItemName,
                      stock: 0,
                      unit: newSelectorItemUnit,
                      unitCost: Number(newSelectorItemCost) || 0,
                      salePrice: Number(newSelectorItemPrice) || 0,
                      currency: 'YER',
                      lastPurchasePrice: Number(newSelectorItemCost) || 0
                    });

                    // Automatically select this new item in the drawer
                    setActiveSelectorItem(created);
                    setSelectorUnit(created.unit || 'حبة');
                    setSelectorPrice(created.salePrice.toString());
                    setSelectorQty('1');
                    setSelectorTotal(created.salePrice.toString());
                    setActiveSelectorField('qty');

                    // Reset form fields
                    setNewSelectorItemName('');
                    setNewSelectorItemCode('');
                    setNewSelectorItemCost('0');
                    setNewSelectorItemPrice('0');
                    setNewSelectorItemUnit('حبة');
                    setIsAddingNewItem(false);
                    alert('تمت إضافة الصنف الجديد بنجاح واختياره تلقائياً!');
                  }
                }}
                className="space-y-4 my-4 p-5 border border-emerald-150 bg-emerald-50/10 rounded-2xl text-right overflow-y-auto"
              >
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">اسم الصنف (السلعة/المادة) *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: زيت فرامل شل أصلي"
                    value={newSelectorItemName}
                    onChange={(e) => setNewSelectorItemName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white text-right font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">الباركود / الكود الدولي *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: 554"
                      value={newSelectorItemCode}
                      onChange={(e) => setNewSelectorItemCode(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-center font-mono focus:outline-none focus:border-emerald-600 focus:bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">وحدة القياس</label>
                    <CustomSelect
                      value={newSelectorItemUnit}
                      onChange={(val) => setNewSelectorItemUnit(val)}
                      options={UNIT_OPTIONS}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">تكلفة الشراء الأساسية ({getCurrencySymbol()})</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newSelectorItemCost}
                      onChange={(e) => setNewSelectorItemCost(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-center font-mono focus:outline-none focus:border-emerald-600 focus:bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">سعر البيع المقترح ({getCurrencySymbol()})</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newSelectorItemPrice}
                      onChange={(e) => setNewSelectorItemPrice(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-center font-mono focus:outline-none focus:border-emerald-600 focus:bg-white font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewItem(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    إلغاء والتراجع
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md"
                  >
                    حفظ الصنف وتحديده
                  </button>
                </div>
              </form>
            ) : (
              <>
                {/* List of matching items */}
                <div className="flex-1 overflow-y-auto my-4 border border-slate-100 rounded-2xl divide-y divide-slate-100 bg-slate-50/50">
                  {filteredItems.length === 0 ? (
                    <div className="p-8 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-3">
                      <span>لا توجد أصناف مطابقة للبحث</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewSelectorItemName(itemSearchTerm);
                          setIsAddingNewItem(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors mx-auto"
                      >
                        <Plus className="h-4 w-4" />
                        <span>إضافة صنف جديد باسم &quot;{itemSearchTerm}&quot;</span>
                      </button>
                    </div>
                  ) : (
                    filteredItems.map((item) => {
                      const isSelected = activeSelectorItem?.id === item.id;
                      return (
                        <div key={item.id} className="transition-all">
                          {/* Item row styled exactly like Screen 3 */}
                          <div
                            onClick={() => handleSelectSelectorItem(item)}
                            className={`p-3.5 flex justify-between items-center cursor-pointer transition-colors ${
                              isSelected ? 'bg-teal-50/60' : 'hover:bg-slate-100/50'
                            }`}
                          >
                            {/* Right: Item details */}
                            <div>
                              <span className="text-xs font-black text-slate-800 block mb-0.5">{item.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono font-bold">كود: {item.code}</span>
                            </div>

                            {/* Left: Inventory and Price metrics */}
                            <div className="flex items-center gap-4 text-center">
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block font-bold">المخزون</span>
                                <span className="text-xs font-bold text-slate-700 font-mono">
                                  {(() => {
                                    const cartItem = cart.find((c) => c.itemId === item.id);
                                    const currentCartQty = cartItem ? cartItem.qty : 0;
                                    const displayedStock = invoiceType === 'sale' 
                                      ? Math.max(0, item.stock - currentCartQty) 
                                      : item.stock + currentCartQty;
                                    return (
                                      <>
                                        <span>{displayedStock} {item.unit}</span>
                                        {currentCartQty > 0 && (
                                          <span className="text-[9px] text-rose-500 font-black block leading-none mt-0.5">
                                            ({invoiceType === 'sale' ? '-' : '+'}{currentCartQty} بالسلة)
                                          </span>
                                        )}
                                      </>
                                    );
                                  })()}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block font-bold">سعر البيع</span>
                                <span className="text-xs font-black text-teal-700 font-mono">
                                  {formatCurrency(item.salePrice)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Expanded entry form inline drawer exactly like Screen 4 */}
                          {isSelected && (
                            <div className="p-4 bg-white border-t border-b border-slate-150 space-y-4 animate-in slide-in-from-top-2 duration-200">
                              {/* Unit, Qty, Price, Total Inputs row */}
                              <div className="grid grid-cols-4 gap-2 text-center">
                                {/* Unit Dropdown */}
                                <div>
                                  <label className="block text-[9px] font-black text-slate-400 mb-1">وحدة القياس</label>
                                  <CustomSelect
                                    value={selectorUnit}
                                    onChange={(val) => setSelectorUnit(val)}
                                    options={UNIT_OPTIONS}
                                    className="px-1.5 py-[7px] bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-center"
                                  />
                                </div>

                                {/* Qty Input field */}
                                <div
                                  onClick={() => setActiveSelectorField('qty')}
                                  className={`p-1.5 rounded-lg border cursor-pointer ${
                                    activeSelectorField === 'qty' ? 'border-teal-600 bg-teal-50/20' : 'border-slate-200 bg-slate-50'
                                  }`}
                                >
                                  <span className="block text-[9px] font-black text-slate-400 mb-0.5">الكمية</span>
                                  <input
                                    type="text"
                                    readOnly
                                    value={selectorQty}
                                    className="w-full bg-transparent text-center text-xs font-black font-sans focus:outline-none"
                                  />
                                </div>

                                {/* Price Input field */}
                                <div
                                  onClick={() => setActiveSelectorField('price')}
                                  className={`p-1.5 rounded-lg border cursor-pointer ${
                                    activeSelectorField === 'price' ? 'border-teal-600 bg-teal-50/20' : 'border-slate-200 bg-slate-50'
                                  }`}
                                >
                                  <span className="block text-[9px] font-black text-slate-400 mb-0.5">السعر</span>
                                  <input
                                    type="text"
                                    readOnly
                                    value={selectorPrice}
                                    className="w-full bg-transparent text-center text-xs font-black font-sans focus:outline-none text-[#4b8c82]"
                                  />
                                </div>

                                {/* Total calculated field */}
                                <div className="p-1.5 rounded-lg border border-slate-100 bg-slate-100">
                                  <span className="block text-[9px] font-black text-slate-400 mb-0.5">الإجمالي</span>
                                  <span className="block text-xs font-black text-teal-800 font-mono mt-1">
                                    {formatCurrency(parseFloat(selectorTotal) || 0)}
                                  </span>
                                </div>
                              </div>

                              {/* Inline helper buttons representing Screen 4 Quick Qty bar */}
                              <div className="flex flex-wrap gap-1.5 justify-center py-1">
                                <button
                                  onClick={() => adjustSelectorQty(1)}
                                  className="px-3 py-1.5 bg-[#4b8c82]/10 hover:bg-[#4b8c82]/20 text-[#4b8c82] rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  + 1 حبة
                                </button>
                                <button
                                  onClick={() => setSelectorQty('12')}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  درزن (12)
                                </button>
                                <button
                                  onClick={() => setSelectorQty('15')}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  شد (15)
                                </button>
                                <button
                                  onClick={() => setSelectorQty('13')}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  كرتون (13)
                                </button>
                              </div>

                              {/* POS touch numpad selector */}
                              <div className="grid grid-cols-4 gap-1.5 max-w-xs mx-auto text-center font-bold">
                                {['1', '2', '3', '-'].map((key) => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleKeypadPress(key)}
                                    className="py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs text-slate-700 active:scale-95 transition-all font-mono"
                                  >
                                    {key}
                                  </button>
                                ))}
                                {['4', '5', '6', ','].map((key) => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleKeypadPress(key)}
                                    className="py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs text-slate-700 active:scale-95 transition-all font-mono"
                                  >
                                    {key}
                                  </button>
                                ))}
                                {['7', '8', '9', '⌫'].map((key) => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleKeypadPress(key)}
                                    className={`py-2.5 rounded-xl text-xs active:scale-95 transition-all font-mono ${
                                      key === '⌫' ? 'bg-rose-100 text-rose-700 text-sm' : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {key}
                                  </button>
                                ))}
                                {['0', '.', '␣', '⏎'].map((key) => (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleKeypadPress(key)}
                                    className={`py-2.5 rounded-xl text-xs active:scale-95 transition-all ${
                                      key === '⏎' ? 'bg-teal-600 text-white font-black' : 'bg-slate-100 text-slate-700 font-mono'
                                    }`}
                                  >
                                    {key}
                                  </button>
                                ))}
                              </div>

                              {/* Action Buttons for selector expanded row */}
                              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                                <button
                                  onClick={() => {
                                    setActiveSelectorItem(null);
                                    setItemSearchTerm('');
                                  }}
                                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-200"
                                >
                                  إلغاء
                                </button>
                                <button
                                  onClick={() => handleAddItemFromSelector(true)} // save & add more
                                  className="px-4 py-2 bg-[#4b8c82]/10 hover:bg-[#4b8c82]/20 text-[#4b8c82] rounded-xl text-xs font-black cursor-pointer"
                                >
                                  حفظ وإضافة بضائع أخرى
                                </button>
                                <button
                                  onClick={() => handleAddItemFromSelector(false)} // save & close
                                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-md"
                                >
                                  حفظ وإغلاق الصنف
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom Modal Actions */}
                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setIsItemSelectorOpen(false);
                      setActiveSelectorItem(null);
                    }}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    إغلاق البحث المباشر
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: FINALIZATION DIALOG (SCREEN 6) ==================== */}
      {isFinalizerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-teal-50 animate-in zoom-in-95 duration-200">
            {/* Header: previous balance label shown exactly in Screen 6 */}
            <div className="text-center pb-3 border-b border-slate-100 mb-4">
              <span className="text-xs font-black text-rose-600 block mb-1">
                الرصيد السابق للجهة المستفيدة: {formatCurrency(selectedPartyBalance)}
              </span>
              <h3 className="text-base font-black text-slate-800">
                مراجعة وتأكيد حفظ الفاتورة المالية
              </h3>
            </div>

            {/* Fields grid matching double column structure in Screen 6 */}
            <div className="space-y-4">
              {/* Row 1: Subtotal and GrandTotal */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="block text-[10px] font-black text-slate-400 mb-1">المجموع الأساسي</span>
                  <span className="text-sm font-black text-slate-700 font-mono">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl text-center">
                  <span className="block text-[10px] font-black text-teal-800 mb-1">الإجمالي المطلوب</span>
                  <span className="text-sm font-black text-teal-900 font-mono">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Row 2: Discount inputs */}
              <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-2">
                <span className="block text-[10px] font-black text-rose-700">تعديل قيمة الخصم الممنوح:</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">خصم %</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      value={discountPercentInputStr}
                      onChange={(e) => {
                        const str = e.target.value;
                        setDiscountPercentInputStr(str);
                        const val = parseFloat(str);
                        if (!isNaN(val)) {
                          setFinalDiscountPercent(val);
                          const amt = parseFloat(((val / 100) * subtotal).toFixed(2));
                          setFinalDiscount(amt);
                          setDiscountInputStr(amt === 0 ? '' : amt.toString());
                        } else {
                          setFinalDiscountPercent(0);
                          setFinalDiscount(0);
                          setDiscountInputStr('');
                        }
                      }}
                      className="w-full pl-10 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center font-bold focus:outline-none"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">{getCurrencySymbol()}</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max={subtotal}
                      value={discountInputStr}
                      onChange={(e) => {
                        const str = e.target.value;
                        setDiscountInputStr(str);
                        const val = parseFloat(str);
                        if (!isNaN(val)) {
                          setFinalDiscount(val);
                          if (subtotal > 0) {
                            const pct = parseFloat(((val / subtotal) * 100).toFixed(2));
                            setFinalDiscountPercent(pct);
                            setDiscountPercentInputStr(pct === 0 ? '' : pct.toString());
                          } else {
                            setFinalDiscountPercent(0);
                            setDiscountPercentInputStr('');
                          }
                        } else {
                          setFinalDiscount(0);
                          setFinalDiscountPercent(0);
                          setDiscountPercentInputStr('');
                        }
                      }}
                      className="w-full pl-10 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Tax inputs */}
              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-2">
                <span className="block text-[10px] font-black text-amber-700">ضريبة القيمة المضافة (VAT):</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">ضريبة %</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      value={taxPercentInputStr}
                      onChange={(e) => {
                        const str = e.target.value;
                        setTaxPercentInputStr(str);
                        const val = parseFloat(str);
                        if (!isNaN(val)) {
                          setFinalTaxPercent(val);
                          const amt = parseFloat(((val / 100) * subtotal).toFixed(2));
                          setFinalTax(amt);
                          setTaxInputStr(amt === 0 ? '' : amt.toString());
                        } else {
                          setFinalTaxPercent(0);
                          setFinalTax(0);
                          setTaxInputStr('');
                        }
                      }}
                      className="w-full pl-10 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center font-bold focus:outline-none"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">{getCurrencySymbol()}</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={taxInputStr}
                      onChange={(e) => {
                        const str = e.target.value;
                        setTaxInputStr(str);
                        const val = parseFloat(str);
                        if (!isNaN(val)) {
                          setFinalTax(val);
                          if (subtotal > 0) {
                            const pct = parseFloat(((val / subtotal) * 100).toFixed(2));
                            setFinalTaxPercent(pct);
                            setTaxPercentInputStr(pct === 0 ? '' : pct.toString());
                          } else {
                            setFinalTaxPercent(0);
                            setTaxPercentInputStr('');
                          }
                        } else {
                          setFinalTax(0);
                          setFinalTaxPercent(0);
                          setTaxPercentInputStr('');
                        }
                      }}
                      className="w-full pl-10 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Notes display */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">ملاحظة الفاتورة</label>
                <input
                  type="text"
                  value={finalNotes}
                  onChange={(e) => setFinalNotes(e.target.value)}
                  placeholder="ملاحظات توضيحية..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none font-bold"
                />
              </div>

              {/* Warn if Credit billing but no customer selected */}
              {paymentMode === 'credit' && !selectedPartyId && (
                <div className="p-3 bg-rose-50 text-rose-700 text-[11px] font-bold rounded-xl border border-rose-100 leading-relaxed text-right">
                  ⚠️ تنبيه هام: قمت باختيار "سداد آجل" ولكن لم تختر جهة مستفيدة. الفاتورة الآجلة تتطلب تحديد عميل/مورد لحفظ الدين في حسابه.
                </div>
              )}
            </div>

            {/* Buttons at bottom of Dialog matching Screen 6 */}
            <div className="flex gap-2.5 pt-5 border-t border-slate-100 mt-5">
              <button
                type="button"
                onClick={() => setIsFinalizerOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black cursor-pointer transition-all text-center"
              >
                إلغاء الترحيل
              </button>

              <button
                type="button"
                onClick={handleSaveInvoice}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-black shadow-md cursor-pointer transition-all text-center"
              >
                حفظ وترحيل الفاتورة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 3: DEDICATED DISCOUNT MODAL ==================== */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-50 animate-in zoom-in-95 duration-200" dir="rtl">
            {/* Header */}
            <div className="text-center pb-3 border-b border-slate-100 mb-4">
              <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-2 text-rose-600">
                <Percent className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-black text-slate-800">
                تحديد قيمة الخصم الممنوح للفاتورة
              </h3>
              <p className="text-[10px] text-slate-400 font-bold mt-1">
                المجموع الحالي للفاتورة: {formatCurrency(subtotal)}
              </p>
            </div>

            {/* Content inputs */}
            <div className="space-y-4 text-right">
              <div className="p-3 bg-rose-50/40 border border-rose-100 rounded-2xl space-y-2">
                <span className="block text-[11px] font-black text-rose-800">إدخال قيمة الخصم:</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">خصم %</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={discountPercentInputStr}
                      onChange={(e) => {
                        const str = e.target.value;
                        setDiscountPercentInputStr(str);
                        const val = parseFloat(str);
                        if (!isNaN(val)) {
                          setFinalDiscountPercent(val);
                          const amt = parseFloat(((val / 100) * subtotal).toFixed(2));
                          setFinalDiscount(amt);
                          setDiscountInputStr(amt === 0 ? '' : amt.toString());
                        } else {
                          setFinalDiscountPercent(0);
                          setFinalDiscount(0);
                          setDiscountInputStr('');
                        }
                      }}
                      className="w-full pl-11 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-center font-bold focus:outline-none focus:border-rose-500 transition-colors"
                      autoFocus
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">مبلغ</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max={subtotal}
                      placeholder="0.00"
                      value={discountInputStr}
                      onChange={(e) => {
                        const str = e.target.value;
                        setDiscountInputStr(str);
                        const val = parseFloat(str);
                        if (!isNaN(val)) {
                          setFinalDiscount(val);
                          if (subtotal > 0) {
                            const pct = parseFloat(((val / subtotal) * 100).toFixed(2));
                            setFinalDiscountPercent(pct);
                            setDiscountPercentInputStr(pct === 0 ? '' : pct.toString());
                          } else {
                            setFinalDiscountPercent(0);
                            setDiscountPercentInputStr('');
                          }
                        } else {
                          setFinalDiscount(0);
                          setFinalDiscountPercent(0);
                          setDiscountPercentInputStr('');
                        }
                      }}
                      className="w-full pl-11 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-center font-bold focus:outline-none focus:border-rose-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-2">
                <span className="block text-[10px] font-black text-slate-400">خصومات سريعة:</span>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {[5, 10, 15, 20].map((pct) => (
                    <button
                      key={`pct-${pct}`}
                      type="button"
                      onClick={() => handleDiscountPercentChange(pct)}
                      className="py-1.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 rounded-xl text-[11px] font-black text-slate-600 border border-slate-200/65 transition-all cursor-pointer"
                    >
                      %{pct}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center font-sans">
                  {[5, 10, 50, 100].map((amt) => (
                    <button
                      key={`amt-${amt}`}
                      type="button"
                      onClick={() => handleDiscountChange(amt)}
                      className="py-1.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 rounded-xl text-[11px] font-black text-slate-600 border border-slate-200/65 transition-all cursor-pointer font-sans"
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total display after discount */}
              <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-2xl flex justify-between items-center">
                <span className="text-[11px] font-black text-slate-500">المجموع بعد الخصم:</span>
                <span className="text-sm font-black text-teal-800 font-mono">
                  {formatCurrency(Math.max(0, subtotal - finalDiscount))}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2.5 pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => {
                  setFinalDiscount(0);
                  setFinalDiscountPercent(0);
                }}
                className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl text-[11px] font-black cursor-pointer transition-all text-center flex-1"
              >
                إلغاء الخصم (0)
              </button>

              <button
                type="button"
                onClick={() => setIsDiscountModalOpen(false)}
                className="py-2.5 px-5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-[11px] font-black shadow-md cursor-pointer transition-all text-center flex-1"
              >
                تطبيق وحفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 4: SHARE INVOICE MODAL ==================== */}
      {isShareModalOpen && activeShareInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-teal-50 animate-in zoom-in-95 duration-200 text-right" dir="rtl">
            {/* Icon & Title */}
            <div className="text-center pb-4 border-b border-slate-150 mb-5">
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 text-[#4b8c82]">
                <Share2 className="h-7 w-7" />
              </div>
              <h3 className="text-base font-black text-slate-800">
                بيبرس للمحاسبة:
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-1">
                جاهز لمشاركة الفاتورة مع العميل عبر المنصات:
              </p>
            </div>

            {/* Share Options Panel */}
            <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200/50 flex flex-col items-center gap-4">
              {/* Buttons Row */}
              <div className="flex justify-center items-center gap-6 w-full">
                {/* WhatsApp Button */}
                <button
                  onClick={() => {
                    const text = generateShareText(activeShareInvoice);
                    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                    window.open(url, '_blank');
                  }}
                  className="flex flex-col items-center gap-1.5 cursor-pointer group flex-1"
                  title="مشاركة عبر واتساب"
                >
                  <div className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md transition-all transform group-hover:scale-105 active:scale-95 mx-auto">
                    <MessageCircle className="h-6 w-6 fill-current" />
                  </div>
                  <span className="text-[10px] font-black text-slate-600">واتساب</span>
                </button>

                {/* Email Button */}
                <button
                  onClick={() => {
                    const text = generateShareText(activeShareInvoice);
                    const subject = activeShareInvoice.type === 'sale' ? 'فاتورة مبيعات - بيبرس للمحاسبة' : 'فاتورة مشتريات - بيبرس للمحاسبة';
                    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
                    window.open(url, '_blank');
                  }}
                  className="flex flex-col items-center gap-1.5 cursor-pointer group flex-1"
                  title="مشاركة عبر البريد"
                >
                  <div className="w-12 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl flex items-center justify-center shadow-md transition-all transform group-hover:scale-105 active:scale-95 mx-auto">
                    <Mail className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-black text-slate-600">بريد إلكتروني</span>
                </button>

                {/* Native / System Share Button */}
                <button
                  onClick={() => {
                    const text = generateShareText(activeShareInvoice);
                    if (navigator.share) {
                      navigator.share({
                        title: activeShareInvoice.type === 'sale' ? 'فاتورة مبيعات' : 'فاتورة مشتريات',
                        text: text,
                        url: 'https://almhaseb.vercel.app/'
                      }).catch((err) => console.log('Error sharing:', err));
                    } else {
                      navigator.clipboard.writeText(text);
                      alert('تم نسخ نص الفاتورة بالكامل! يمكنك الآن لصقه في أي تطبيق للدردشة.');
                    }
                  }}
                  className="flex flex-col items-center gap-1.5 cursor-pointer group flex-1"
                  title="مشاركة النظام"
                >
                  <div className="w-12 h-12 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl flex items-center justify-center shadow-md transition-all transform group-hover:scale-105 active:scale-95 mx-auto">
                    <Share2 className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-black text-slate-600">مشاركة عامة</span>
                </button>
              </div>

              {/* Checkbox "dont show again" */}
              <label className="flex items-center gap-2 mt-2 cursor-pointer border-t border-slate-200/40 pt-3 w-full justify-center select-none">
                <input
                  type="checkbox"
                  checked={dontShowSharePrompt}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setDontShowSharePrompt(checked);
                    if (checked) {
                      localStorage.setItem('dontShowSharePrompt', 'true');
                    } else {
                      localStorage.removeItem('dontShowSharePrompt');
                    }
                  }}
                  className="rounded border-slate-300 text-[#4b8c82] focus:ring-[#4b8c82] h-4 w-4"
                />
                <span className="text-[10px] font-black text-slate-500">عدم إظهار هذا المربع تلقائياً عند الحفظ</span>
              </label>
            </div>

            {/* Close/Cancel Button */}
            <div className="mt-5">
              <button
                onClick={() => {
                  setIsShareModalOpen(false);
                  setActiveShareInvoice(null);
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
