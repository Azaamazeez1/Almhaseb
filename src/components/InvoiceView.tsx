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
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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

  // Quick direct inline search on the main screen
  const [quickSearchTerm, setQuickSearchTerm] = useState('');

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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
    setQuickSearchTerm('');
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

  // Quick direct inline search on the main screen
  const quickFilteredItems = useMemo(() => {
    if (!quickSearchTerm.trim()) return [];
    const term = quickSearchTerm.toLowerCase();
    return items.filter((it) => {
      return (
        it.name.toLowerCase().includes(term) ||
        it.code.toLowerCase().includes(term)
      );
    });
  }, [items, quickSearchTerm]);

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

  const generatePdfBlob = async (): Promise<Blob | null> => {
    const element = document.getElementById('printable-invoice-pdf-container');
    if (!element) {
      alert('خطأ: لم يتم العثور على قالب الطباعة!');
      return null;
    }

    const styleElements = Array.from(document.querySelectorAll('style'));
    const linkElements = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    const backups: { element: HTMLElement; originalContent?: string; originalDisabled?: boolean }[] = [];
    const temporaryStyleTags: HTMLStyleElement[] = [];

    try {
      // 1. Clean <style> tags content of modern oklch/oklab colors
      for (const style of styleElements) {
        backups.push({
          element: style,
          originalContent: style.innerHTML
        });
        let cssText = style.innerHTML;
        // Replace oklch/oklab color declarations with standard colors so html2canvas doesn't crash
        cssText = cssText.replace(/oklch\([^)]+\)/g, 'rgb(75, 140, 130)');
        cssText = cssText.replace(/oklab\([^)]+\)/g, 'rgb(75, 140, 130)');
        style.innerHTML = cssText;
      }

      // 2. Fetch and clean <link> stylesheet contents of oklch/oklab colors
      for (const link of linkElements) {
        const linkEl = link as HTMLLinkElement;
        backups.push({
          element: linkEl,
          originalDisabled: linkEl.disabled
        });
        try {
          const response = await fetch(linkEl.href);
          if (response.ok) {
            let cssText = await response.text();
            cssText = cssText.replace(/oklch\([^)]+\)/g, 'rgb(75, 140, 130)');
            cssText = cssText.replace(/oklab\([^)]+\)/g, 'rgb(75, 140, 130)');
            
            const tempStyle = document.createElement('style');
            tempStyle.className = 'html2canvas-temp-style';
            tempStyle.innerHTML = cssText;
            document.head.appendChild(tempStyle);
            temporaryStyleTags.push(tempStyle);
            
            linkEl.disabled = true;
          }
        } catch (e) {
          console.error('Failed to rewrite link stylesheet:', e);
        }
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        width: 794,
        windowWidth: 794,
        scrollX: 0,
        scrollY: 0
      });

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, '', 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, '', 'FAST');
        heightLeft -= pageHeight;
      }

      return pdf.output('blob');
    } catch (err) {
      console.error('Error in PDF generation:', err);
      return null;
    } finally {
      // 3. Restore all original styles and remove temporary elements
      for (const backup of backups) {
        if (backup.originalContent !== undefined) {
          backup.element.innerHTML = backup.originalContent;
        }
        if (backup.originalDisabled !== undefined) {
          (backup.element as HTMLLinkElement).disabled = backup.originalDisabled;
        }
      }
      for (const tempStyle of temporaryStyleTags) {
        tempStyle.remove();
      }
    }
  };

  const handleDownloadPdf = async () => {
    if (!activeShareInvoice) return;
    setIsGeneratingPdf(true);
    await new Promise((resolve) => setTimeout(resolve, 150));

    try {
      const blob = await generatePdfBlob();
      if (!blob) {
        alert('فشل توليد ملف الـ PDF!');
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = `invoice_${activeShareInvoice.invoiceNumber || activeShareInvoice.id?.slice(-6) || 'receipt'}.pdf`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ غير متوقع أثناء تحميل ملف الـ PDF!');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSharePdf = async () => {
    if (!activeShareInvoice) return;
    setIsGeneratingPdf(true);
    await new Promise((resolve) => setTimeout(resolve, 150));

    try {
      const blob = await generatePdfBlob();
      if (!blob) {
        alert('فشل توليد ملف الـ PDF!');
        return;
      }

      const fileName = `invoice_${activeShareInvoice.invoiceNumber || activeShareInvoice.id?.slice(-6) || 'receipt'}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: activeShareInvoice.type === 'sale' ? 'فاتورة مبيعات' : 'فاتورة مشتريات',
          text: `مرفق لكم الفاتورة الاحترافية رقم ${activeShareInvoice.invoiceNumber || 'مسودة'}`
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('هذا المتصفح أو البيئة الحالية لا تدعم مشاركة الملفات مباشرة عبر نظام التشغيل. تم تنزيل ملف الـ PDF على جهازك بنجاح، يمكنك الآن إرساله يدوياً كملف إلى العميل عبر واتساب!');
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ غير متوقع أثناء مشاركة ملف الـ PDF!');
    } finally {
      setIsGeneratingPdf(false);
    }
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
        /* ==================== STATE 2: NEW INVOICE CREATOR (MOBILE-STYLE SIMPLIFIED) ==================== */
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-md max-w-3xl mx-auto">
          {/* Header Bar - Compact & Clean */}
          <div className="bg-[#4b8c82] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreator(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="رجوع للقائمة"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-sm font-black tracking-tight">
                  {invoiceType === 'sale' ? 'فاتورة بيع بضاعة جديدة' : 'فاتورة شراء بضاعة جديدة'}
                </h2>
                <span className="text-[10px] text-teal-100/90 font-bold font-mono">
                  رقم: {invoiceNumber}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="طباعة"
              >
                <Printer className="h-4 w-4 text-teal-100" />
              </button>
              <button
                onClick={handleShareDraft}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="مشاركة الفاتورة"
              >
                <Share2 className="h-4 w-4 text-teal-100" />
              </button>
            </div>
          </div>

          {/* Form & Selection Area */}
          <div className="p-5 space-y-4">
            {/* Payment type & Client Selector Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
              {/* Payment Mode Segment Picker */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-black text-slate-500">طريقة السداد:</span>
                <div className="flex bg-slate-200/80 p-0.5 rounded-xl gap-0.5 w-full">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('cash')}
                    className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                      paymentMode === 'cash'
                        ? 'bg-[#4b8c82] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    نقداً (كاش)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('credit')}
                    className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                      paymentMode === 'credit'
                        ? 'bg-[#4b8c82] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    آجل (حساب دين)
                  </button>
                </div>
              </div>

              {/* Party selection */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-black text-slate-500">
                  {invoiceType === 'sale' ? 'العميل المستفيد:' : 'المورد المجهز:'}
                </span>
                <select
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-bold focus:outline-none transition-all ${
                    paymentMode === 'credit' && !selectedPartyId
                      ? 'border-rose-400 bg-rose-50/25 focus:border-rose-600 focus:ring-1 focus:ring-rose-500/20'
                      : 'border-slate-200 focus:border-[#4b8c82] focus:ring-1 focus:ring-[#4b8c82]/20'
                  }`}
                >
                  <option value="">
                    {invoiceType === 'sale' ? '👤 عميل نقدي مباشر' : '👤 مورد نقدي مباشر'}
                  </option>
                  {invoiceType === 'sale'
                    ? customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          👤 {c.name} (رصيد سابق: {formatCurrency(c.balance)})
                        </option>
                      ))
                    : suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          👤 {s.name} (رصيد سابق: {formatCurrency(s.balance)})
                        </option>
                      ))}
                </select>
              </div>
            </div>

            {/* Core Item Search Bar with Suggestions */}
            <div className="space-y-2 relative">
              <label className="block text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Search className="h-4 w-4 text-teal-600" />
                <span>ابحث بالاسم أو الباركود لإضافة الصنف فوراً:</span>
              </label>
              
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="اكتب اسم السلعة أو باركود الصنف هنا..."
                    value={quickSearchTerm}
                    onChange={(e) => setQuickSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#4b8c82] focus:ring-1 focus:ring-[#4b8c82]/20 font-bold placeholder-slate-400"
                  />
                  {quickSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setQuickSearchTerm('')}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Create a brand-new item on the fly if needed */}
                <button
                  type="button"
                  onClick={() => {
                    setNewSelectorItemName(quickSearchTerm);
                    setIsAddingNewItem(true);
                    setIsItemSelectorOpen(true);
                  }}
                  className="h-[38px] px-3.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                  title="إنشاء صنف جديد"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">صنف جديد</span>
                </button>
              </div>

              {/* Search suggestions dropdown floating box */}
              {quickFilteredItems.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1 divide-y divide-slate-100">
                  {quickFilteredItems.slice(0, 10).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        const existingIndex = cart.findIndex((c) => c.itemId === item.id);
                        const defaultPrice = invoiceType === 'sale' ? item.salePrice : item.unitCost;
                        if (existingIndex > -1) {
                          const newCart = [...cart];
                          newCart[existingIndex].qty += 1;
                          setCart(newCart);
                        } else {
                          setCart([
                            ...cart,
                            {
                              itemId: item.id,
                              itemName: item.name,
                              qty: 1,
                              price: defaultPrice,
                              cost: item.unitCost,
                              unit: item.unit || 'حبة',
                              discount: 0
                            }
                          ]);
                        }
                        setQuickSearchTerm('');
                      }}
                      className="w-full px-4 py-2.5 text-xs text-right cursor-pointer hover:bg-teal-50 transition-colors flex justify-between items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-black text-slate-800 block truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">كود: {item.code} | وحدة: {item.unit || 'حبة'}</span>
                      </div>
                      <div className="text-left font-mono shrink-0 mr-4">
                        <span className="text-[#4b8c82] font-black block">
                          {formatCurrency(invoiceType === 'sale' ? item.salePrice : item.unitCost)}
                        </span>
                        <span className="text-[9px] text-slate-400 block">المتوفر بالمخزن: {item.stock}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* List of Cart Items in a clean mobile row format */}
            <div className="space-y-2">
              <span className="text-xs font-black text-slate-500 block">البضائع المدرجة بالفاتورة:</span>

              {cart.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50 space-y-3">
                  <span className="text-xs font-bold text-slate-400 block leading-relaxed">
                    لا توجد بضائع في السلة حتى الآن. ابحث عن اسم السلعة أو الباركود في مربع البحث أعلاه لإدراجها فوراً.
                  </span>
                </div>
              ) : (
                <div className="divide-y divide-slate-150 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  {cart.map((item, idx) => {
                    return (
                      <div
                        key={idx}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/40 transition-colors"
                      >
                        {/* Right: index + Name + Unit cost */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="h-6 w-6 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-slate-800 block truncate">{item.itemName}</span>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                              الوحدة: {item.unit} | التكلفة: {formatCurrency(item.cost)}
                            </span>
                          </div>
                        </div>

                        {/* Middle & Left: Quantity controls & Price input & Total */}
                        <div className="flex flex-wrap items-center gap-4 shrink-0 justify-between sm:justify-end">
                          {/* Qty Counter control */}
                          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5 scale-95 origin-right">
                            <button
                              type="button"
                              onClick={() => updateCartItemQty(idx, Math.max(1, item.qty - 1))}
                              className="px-2 py-1 text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.qty}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                const newQty = isNaN(val) ? 0 : val;
                                const newCart = [...cart];
                                newCart[idx].qty = newQty;
                                setCart(newCart);
                              }}
                              className="w-11 text-center font-black font-mono bg-transparent text-xs text-slate-800 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateCartItemQty(idx, item.qty + 1)}
                              className="px-2 py-1 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Unit price input */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-bold">السعر:</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.price}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                const newPrice = isNaN(val) ? 0 : val;
                                const newCart = [...cart];
                                newCart[idx].price = newPrice;
                                setCart(newCart);
                              }}
                              className="w-20 px-2 py-1 text-center font-black font-mono bg-slate-50 border border-slate-200 rounded-lg text-xs text-[#4b8c82] focus:outline-none focus:border-[#4b8c82]"
                            />
                          </div>

                          {/* Total calculation column */}
                          <div className="text-left font-mono font-black text-xs text-slate-800 min-w-[70px] mr-1">
                            {formatCurrency(item.price * item.qty)}
                          </div>

                          {/* Remove row */}
                          <button
                            type="button"
                            onClick={() => updateCartItemQty(idx, 0)}
                            className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="حذف هذا الصنف نهائياً"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Collapsible/Direct Totals Card with Inline Discounts & VAT */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between text-[11px] font-black text-slate-500 border-b border-slate-200/60 pb-2">
                <span>ملخص الحساب والخصومات المالية</span>
                <span>رقم الفاتورة: {invoiceNumber}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1: Subtotal and Notes */}
                <div className="space-y-3 text-right">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                    <span>مجموع الأصناف الأساسي:</span>
                    <span className="font-mono font-black">{formatCurrency(subtotal)}</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1">ملاحظات توضيحية على الفاتورة:</label>
                    <input
                      type="text"
                      value={finalNotes}
                      onChange={(e) => setFinalNotes(e.target.value)}
                      placeholder="مثال: مبيعات نقدية للزبون..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#4b8c82]"
                    />
                  </div>
                </div>

                {/* Column 2: Interactive Discount & Tax Inputs on screen */}
                <div className="space-y-3">
                  {/* Discount Section */}
                  <div className="bg-rose-50/40 p-2.5 rounded-xl border border-rose-100/50 space-y-1.5 text-right">
                    <span className="block text-[10px] font-black text-rose-800">الخصم الممنوح (نسبة أو مبلغ مباشر):</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold">%</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          placeholder="خصم %"
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
                          className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-center focus:outline-none"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold">YER</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max={subtotal}
                          placeholder="خصم كاش"
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
                          className="w-full pl-8 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-center focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tax Section */}
                  <div className="bg-amber-50/40 p-2.5 rounded-xl border border-amber-100/50 space-y-1.5 text-right">
                    <span className="block text-[10px] font-black text-amber-800">ضريبة القيمة المضافة (VAT):</span>
                    <div className="grid grid-cols-2 gap-2 items-center">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold">%</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          placeholder="الضريبة %"
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
                          className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-center focus:outline-none"
                        />
                      </div>
                      <div className="text-left font-mono text-xs font-black text-amber-700">
                        +{formatCurrency(finalTax)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Big Grand Total Display Card */}
              <div className="bg-teal-600 text-white rounded-2xl p-4 flex justify-between items-center shadow-md animate-pulse">
                <div>
                  <span className="block text-[10px] font-black text-teal-100/95">المبلغ النهائي الصافي المطلوب:</span>
                  <span className="text-xl font-black font-mono tracking-tight">{formatCurrency(grandTotal)}</span>
                </div>
                <div className="text-left font-bold text-[10px] text-teal-100/90 leading-relaxed">
                  <div>الدفع: {paymentMode === 'cash' ? 'نقداً (فوري)' : 'آجل (ذمم)'}</div>
                  {selectedPartyId && <div className="mt-0.5">الحساب: {invoiceType === 'sale' ? 'للعميل' : 'للمورد'} المحدد</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Bar - Single click instant save */}
          <div className="bg-slate-50 border-t border-slate-100 p-4 flex gap-3 justify-between items-center">
            <button
              onClick={() => setShowCreator(false)}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition-all cursor-pointer"
            >
              إلغاء وتراجع
            </button>

            <button
              onClick={handleSaveInvoice}
              disabled={cart.length === 0}
              className={`px-8 py-3.5 rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer flex-1 max-w-sm ${
                cart.length > 0
                  ? 'bg-teal-700 hover:bg-teal-800 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <CheckCircle className="h-4.5 w-4.5" />
              <span>حفظ وترحيل الفاتورة فوراً</span>
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
                                    type="number"
                                    step="any"
                                    min="0.01"
                                    value={selectorQty}
                                    onChange={(e) => setSelectorQty(e.target.value)}
                                    className="w-full bg-transparent text-center text-xs font-black font-sans focus:outline-none focus:ring-1 focus:ring-teal-500 rounded px-1"
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
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={selectorPrice}
                                    onChange={(e) => setSelectorPrice(e.target.value)}
                                    className="w-full bg-transparent text-center text-xs font-black font-sans focus:outline-none text-[#4b8c82] focus:ring-1 focus:ring-teal-500 rounded px-1"
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
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-teal-50 animate-in zoom-in-95 duration-200 text-right relative" dir="rtl">
            
            {/* Generating PDF Loader Overlay */}
            {isGeneratingPdf && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-3xl z-50 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-[#4b8c82] animate-spin"></div>
                <div className="text-center">
                  <h4 className="text-sm font-black text-slate-800">جاري إنشاء ملف الـ PDF...</h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-bold">يرجى الانتظار لحين معالجة البيانات وتصدير الملف</p>
                </div>
              </div>
            )}

            {/* Icon & Title */}
            <div className="text-center pb-4 border-b border-slate-150 mb-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2 text-[#4b8c82]">
                <Share2 className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-black text-slate-800">
                مشاركة الفاتورة وتصديرها:
              </h3>
              <p className="text-[11px] text-slate-500 font-bold mt-1">
                اختر طريقة التصدير والمشاركة المناسبة لك:
              </p>
            </div>

            <div className="space-y-4">
              {/* Option Block A: Professional PDF Export (Requested Feature) */}
              <div className="bg-teal-50/40 rounded-2xl p-4 border border-teal-100/60 space-y-3">
                <h4 className="text-[11px] font-black text-teal-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-[#4b8c82] rounded-full inline-block"></span>
                  مشاركة وتنزيل كملف PDF احترافي 📄
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Share PDF Directly (triggers WhatsApp as PDF attachment!) */}
                  <button
                    onClick={handleSharePdf}
                    className="py-3 px-4 bg-[#4b8c82] hover:bg-[#3d736b] text-white rounded-xl text-[11px] font-black shadow-md cursor-pointer transition-all transform hover:scale-[1.02] active:scale-95 flex flex-col items-center justify-center gap-1.5"
                    title="إرسال الفاتورة كملف PDF"
                  >
                    <Share2 className="h-5 w-5" />
                    <span>مشاركة ملف PDF 📤</span>
                  </button>

                  {/* Download PDF file locally */}
                  <button
                    onClick={handleDownloadPdf}
                    className="py-3 px-4 bg-teal-50 hover:bg-teal-100 text-[#4b8c82] border border-[#4b8c82]/20 rounded-xl text-[11px] font-black cursor-pointer transition-all transform hover:scale-[1.02] active:scale-95 flex flex-col items-center justify-center gap-1.5"
                    title="حفظ الفاتورة كملف PDF في جهازك"
                  >
                    <FileDown className="h-5 w-5" />
                    <span>تحميل ملف PDF 📥</span>
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 font-bold text-center leading-normal">
                  * مشاركة الـ PDF تسمح بإرسال فاتورة منسقة كملف مرفق على واتساب مباشرة (مثل التطبيقات المحاسبية الأخرى).
                </p>
              </div>

              {/* Option Block B: Quick Text sharing (Legacy) */}
              <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200/50 space-y-2.5">
                <h4 className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-slate-400 rounded-full inline-block"></span>
                  مشاركة الفاتورة كنص مكتوب 📝
                </h4>

                <div className="flex justify-center items-center gap-4 w-full pt-1">
                  {/* WhatsApp Button */}
                  <button
                    onClick={() => {
                      const text = generateShareText(activeShareInvoice);
                      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                      window.open(url, '_blank');
                    }}
                    className="flex flex-col items-center gap-1 cursor-pointer group flex-1"
                    title="مشاركة عبر واتساب"
                  >
                    <div className="w-10 h-10 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-sm transition-all transform group-hover:scale-105 active:scale-95 mx-auto">
                      <MessageCircle className="h-5 w-5 fill-current" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">واتساب</span>
                  </button>

                  {/* Email Button */}
                  <button
                    onClick={() => {
                      const text = generateShareText(activeShareInvoice);
                      const subject = activeShareInvoice.type === 'sale' ? 'فاتورة مبيعات - بيبرس للمحاسبة' : 'فاتورة مشتريات - بيبرس للمحاسبة';
                      const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
                      window.open(url, '_blank');
                    }}
                    className="flex flex-col items-center gap-1 cursor-pointer group flex-1"
                    title="مشاركة عبر البريد"
                  >
                    <div className="w-10 h-10 bg-amber-500 hover:bg-amber-600 text-white rounded-xl flex items-center justify-center shadow-sm transition-all transform group-hover:scale-105 active:scale-95 mx-auto">
                      <Mail className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">بريد إلكتروني</span>
                  </button>

                  {/* General system copy/share */}
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
                    className="flex flex-col items-center gap-1 cursor-pointer group flex-1"
                    title="نسخ النص بالكامل"
                  >
                    <div className="w-10 h-10 bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center justify-center shadow-sm transition-all transform group-hover:scale-105 active:scale-95 mx-auto">
                      <Share2 className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">نسخ ومشاركة</span>
                  </button>
                </div>
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
                <span className="text-[10px] font-bold text-slate-500">عدم إظهار هذا المربع تلقائياً عند الحفظ</span>
              </label>
            </div>

            {/* Close/Cancel Button */}
            <div className="mt-4">
              <button
                onClick={() => {
                  setIsShareModalOpen(false);
                  setActiveShareInvoice(null);
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black transition-all cursor-pointer"
              >
                إغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== HIDDEN PRINTABLE INVOICE PDF CONTAINER ==================== */}
      {activeShareInvoice && (
        <div
          style={{
            position: 'absolute',
            width: '0',
            height: '0',
            overflow: 'hidden',
            left: '-9999px',
            top: '-9999px',
            zIndex: -9999,
          }}
        >
          <div
            id="printable-invoice-pdf-container"
            style={{
              width: '794px', // perfect A4 pixel width at 96 DPI
              backgroundColor: '#ffffff',
              color: '#1e293b',
              fontFamily: '"Cairo", system-ui, -apple-system, sans-serif',
              padding: '45px',
              boxSizing: 'border-box',
            }}
            dir="rtl"
          >
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-teal-600/30 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#4b8c82]/10 rounded-xl flex items-center justify-center text-[#4b8c82] font-black text-2xl">
                  ب
                </div>
                <div>
                  <h1 className="text-2xl font-black text-[#4b8c82]">بيبرس للمحاسبة</h1>
                  <p className="text-[10px] font-bold text-slate-400">نظام إدارة الفواتير والمخازن الذكي</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-2">بريد إلكتروني: support@almhaseb.app</p>
            </div>
            
            <div className="text-left">
              <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-black mb-3 ${
                activeShareInvoice.type === 'sale' ? 'bg-[#4b8c82]/10 text-[#4b8c82]' : 'bg-amber-100 text-amber-800'
              }`}>
                {activeShareInvoice.type === 'sale' ? 'فاتورة مبيعات بضاعة' : 'فاتورة مشتريات بضاعة'}
              </span>
              <div className="text-xs font-bold text-slate-600 space-y-1">
                <p>رقم الفاتورة: <span className="font-mono text-slate-800">{activeShareInvoice.invoiceNumber || activeShareInvoice.id?.slice(-6) || 'مسودة'}</span></p>
                <p>تاريخ الإصدار: <span className="font-mono text-slate-800">
                  {new Date(activeShareInvoice.date).toLocaleDateString('ar-YE', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span></p>
              </div>
            </div>
          </div>

          {/* Client Details */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
            <div className="space-y-1.5 text-xs font-bold text-slate-600">
              <p className="text-slate-400 text-[10px] uppercase font-black">بيانات العميل / الجهة المستفيدة</p>
              <p className="text-slate-800 text-sm font-black">{activeShareInvoice.partyName || (activeShareInvoice.type === 'sale' ? 'عميل نقدي مباشر' : 'مورد نقدي مباشر')}</p>
              <p>طريقة السداد: <span className="text-[#4b8c82]">
                {(activeShareInvoice.cashPaid || 0) > 0 && (activeShareInvoice.creditAmount || 0) === 0 ? 'نقداً (كاش)' : (activeShareInvoice.creditAmount || 0) > 0 && (activeShareInvoice.cashPaid || 0) === 0 ? 'آجل (ذمم)' : 'سداد جزئي آجل'}
              </span></p>
            </div>
            <div className="space-y-1.5 text-xs font-bold text-slate-600 text-left">
              <p className="text-slate-400 text-[10px] uppercase font-black">جهة الإصدار</p>
              <p className="text-slate-800 text-sm font-black">شركة بيبرس التجارية</p>
              <p>حالة الفاتورة: <span className="text-emerald-600">نشطة ومعتمدة</span></p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-right border-collapse mb-8">
            <thead>
              <tr className="bg-[#4b8c82] text-white text-xs font-black">
                <th className="p-3 rounded-r-xl text-center w-12">#</th>
                <th className="p-3">اسم السلعة / الخدمة</th>
                <th className="p-3 text-center w-20">الكمية</th>
                <th className="p-3 text-center w-28">السعر المفرد</th>
                <th className="p-3 rounded-l-xl text-left w-32">الإجمالي الفرعي</th>
              </tr>
            </thead>
            <tbody>
              {activeShareInvoice.items && activeShareInvoice.items.length > 0 ? (
                activeShareInvoice.items.map((it: any, index: number) => (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-center font-mono font-bold text-xs text-slate-400">{index + 1}</td>
                    <td className="p-3 font-black text-xs text-slate-800">{it.itemName}</td>
                    <td className="p-3 text-center font-mono font-bold text-xs text-slate-700">{it.qty}</td>
                    <td className="p-3 text-center font-mono font-bold text-xs text-slate-700">{formatCurrency(it.price)}</td>
                    <td className="p-3 text-left font-mono font-black text-xs text-[#4b8c82]">{formatCurrency(it.price * it.qty)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-xs text-slate-400 font-bold">لا توجد أصناف في هذه الفاتورة.</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals Section */}
          <div className="flex justify-between items-start gap-8">
            {/* Notes & Signature */}
            <div className="flex-1 text-right max-w-[280px]">
              <h4 className="text-xs font-black text-slate-700 mb-1.5">ملاحظات وشروط الفاتورة:</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
                {activeShareInvoice.details || 'لا توجد ملاحظات إضافية على هذه المعاملة المالية. البضاعة المباعة لا ترد ولا تستبدل بعد مرور ٣ أيام من تاريخ الشراء.'}
              </p>
              <div className="mt-8 border-t border-dashed border-slate-200 pt-3">
                <p className="text-[9px] font-black text-slate-400">توقيع المسؤول / الختم الرسمي:</p>
                <div className="h-12 w-24 mt-2 bg-slate-50/80 border border-slate-100 rounded-lg border-dashed"></div>
              </div>
            </div>

            {/* Totals Box */}
            <div className="w-64 bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-2.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                <span>المجموع الكلي للأصناف:</span>
                <span className="font-mono text-slate-800">
                  {formatCurrency(
                    activeShareInvoice.items?.reduce((sum: number, it: any) => sum + (it.price * it.qty), 0) || activeShareInvoice.amount
                  )}
                </span>
              </div>
              
              {activeShareInvoice.discount > 0 && (
                <div className="flex justify-between items-center text-xs font-bold text-rose-600">
                  <span>الخصم الممنوح (-):</span>
                  <span className="font-mono">-{formatCurrency(activeShareInvoice.discount)}</span>
                </div>
              )}

              <div className="border-t border-slate-200/60 my-2 pt-2 flex justify-between items-center">
                <span className="text-xs font-black text-slate-800">الصافي المطلوب سداده:</span>
                <span className="text-base font-black text-[#4b8c82] font-mono">{formatCurrency(activeShareInvoice.amount)}</span>
              </div>

              <div className="border-t border-slate-200/60 pt-2 space-y-1 text-[10px] font-bold text-slate-500">
                <div className="flex justify-between">
                  <span>المسدد نقداً (كاش):</span>
                  <span className="font-mono text-slate-700">{formatCurrency(activeShareInvoice.cashPaid || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>المتبقي آجل (ذمم):</span>
                  <span className="font-mono text-rose-700">{formatCurrency(activeShareInvoice.creditAmount || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer branding */}
          <div className="border-t border-slate-100 mt-10 pt-4 text-center">
            <p className="text-[10px] font-black text-slate-400">تم إنشاء هذا السند إلكترونياً عبر تطبيق بيبرس للمحاسبة والمخازن</p>
            <p className="text-[9px] text-[#4b8c82] font-bold mt-1">https://almhaseb.vercel.app</p>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
