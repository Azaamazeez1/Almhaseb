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
  FileSpreadsheet
} from 'lucide-react';
import { Item, Customer, Supplier, Transaction, TransactionType } from '../types';
import { formatCurrency } from '../utils';

interface InvoiceViewProps {
  items: Item[];
  customers: Customer[];
  suppliers: Supplier[];
  onAddTransaction: (tx: Transaction) => void;
  onUpdateStock: (itemId: string, newStock: number) => void;
  onUpdatePartyBalance: (partyType: 'customer' | 'supplier', partyId: string, amountChange: number) => void;
  initialInvoiceType: 'sale' | 'purchase';
}

interface CartItem {
  itemId: string;
  itemName: string;
  qty: number;
  price: number;
  cost: number;
}

export default function InvoiceView({
  items,
  customers,
  suppliers,
  onAddTransaction,
  onUpdateStock,
  onUpdatePartyBalance,
  initialInvoiceType
}: InvoiceViewProps) {
  const [invoiceType, setInvoiceType] = useState<'sale' | 'purchase'>(initialInvoiceType);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [details, setDetails] = useState('');

  // Cart operations
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentItemId, setCurrentItemId] = useState('');
  const [currentQty, setCurrentQty] = useState(1);
  const [currentPrice, setCurrentPrice] = useState(0);

  // Bill calculations
  const [discount, setDiscount] = useState(0);
  const [cashPaid, setCashPaid] = useState(0);

  // Automatically update the default code and suggested prices when current item changes
  const selectedItem = useMemo(() => {
    return items.find((it) => it.id === currentItemId);
  }, [items, currentItemId]);

  const handleItemSelect = (itemId: string) => {
    setCurrentItemId(itemId);
    const item = items.find((it) => it.id === itemId);
    if (item) {
      setCurrentPrice(invoiceType === 'sale' ? item.salePrice : item.unitCost);
    }
  };

  const handleInvoiceTypeChange = (type: 'sale' | 'purchase') => {
    setInvoiceType(type);
    setSelectedPartyId('');
    setCart([]);
    setCurrentItemId('');
    setCurrentQty(1);
    setCurrentPrice(0);
    setDiscount(0);
    setCashPaid(0);
    setInvoiceNumber(`${type === 'sale' ? 'S' : 'P'}-${Date.now().toString().slice(-6)}`);
  };

  // Generate an invoice number on mount
  React.useEffect(() => {
    if (!invoiceNumber) {
      setInvoiceNumber(`${invoiceType === 'sale' ? 'S' : 'P'}-${Date.now().toString().slice(-6)}`);
    }
  }, [invoiceType, invoiceNumber]);

  const addToCart = () => {
    if (!currentItemId) return;
    const item = items.find((it) => it.id === currentItemId);
    if (!item) return;

    // Check inventory levels for sales invoice
    if (invoiceType === 'sale' && item.stock < currentQty) {
      alert(`عذراً، الكمية المتوفرة في المخزن لهذا الصنف هي: ${item.stock} حبة فقط.`);
      return;
    }

    const existingCartItemIndex = cart.findIndex((c) => c.itemId === currentItemId);
    if (existingCartItemIndex > -1) {
      const updatedCart = [...cart];
      const newQty = updatedCart[existingCartItemIndex].qty + currentQty;

      // Double check stock again for combined qty
      if (invoiceType === 'sale' && item.stock < newQty) {
        alert(`عذراً، الكمية المتوفرة في المخزن هي ${item.stock} حبة، ولا يمكنك طلب ${newQty} حبة.`);
        return;
      }

      updatedCart[existingCartItemIndex].qty = newQty;
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          itemId: item.id,
          itemName: item.name,
          qty: currentQty,
          price: currentPrice,
          cost: item.unitCost
        }
      ]);
    }

    // Reset current item selections
    setCurrentItemId('');
    setCurrentQty(1);
    setCurrentPrice(0);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, idx) => idx !== index));
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [cart]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discount);
  }, [subtotal, discount]);

  const creditAmount = useMemo(() => {
    return Math.max(0, grandTotal - cashPaid);
  }, [grandTotal, cashPaid]);

  const handlePostInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('الرجاء إضافة صنف واحد على الأقل للبطاقة قبل إرسال الفاتورة.');
      return;
    }

    if (!selectedPartyId) {
      const confirmed = window.confirm('لم تختر عميلاً/مورداً لهذه الفاتورة. هل تريد تسجيلها كفاتورة نقدية مباشرة في الصندوق؟');
      if (!confirmed) return;
    }

    const partyName =
      invoiceType === 'sale'
        ? customers.find((c) => c.id === selectedPartyId)?.name
        : suppliers.find((s) => s.id === selectedPartyId)?.name;

    // 1. Create Transaction
    const newTx: Transaction = {
      id: `${invoiceType}-${Date.now()}`,
      invoiceNumber: invoiceNumber,
      date: new Date().toISOString(),
      type: invoiceType,
      partyId: selectedPartyId || undefined,
      partyName: partyName,
      amount: grandTotal,
      discount: discount,
      cashPaid: cashPaid,
      creditAmount: creditAmount,
      details: details || `${invoiceType === 'sale' ? 'فاتورة مبيعات' : 'فاتورة مشتريات'} برقم ${invoiceNumber}`,
      items: cart
    };

    // 2. Adjust Stock levels
    cart.forEach((it) => {
      const item = items.find((i) => i.id === it.itemId);
      if (item) {
        const stockDiff = invoiceType === 'sale' ? -it.qty : it.qty;
        onUpdateStock(it.itemId, item.stock + stockDiff);
      }
    });

    // 3. Update party accounts if there is a credit remainder
    if (selectedPartyId && creditAmount > 0) {
      onUpdatePartyBalance(
        invoiceType === 'sale' ? 'customer' : 'supplier',
        selectedPartyId,
        creditAmount
      );
    }

    onAddTransaction(newTx);
    alert('تم حفظ وترحيل الفاتورة وتحديث المخازن والحسابات بنجاح!');

    // Reset everything
    setCart([]);
    setSelectedPartyId('');
    setDetails('');
    setDiscount(0);
    setCashPaid(0);
    setInvoiceNumber(`${invoiceType === 'sale' ? 'S' : 'P'}-${Date.now().toString().slice(-6)}`);
  };

  return (
    <div dir="rtl" className="space-y-6">
      {/* Tab Selectors resembling screenshot 2 tab buttons */}
      <div className="flex border border-slate-200 p-1.5 bg-slate-50 rounded-2xl max-w-md">
        <button
          id="invoice-type-sale-btn"
          onClick={() => handleInvoiceTypeChange('sale')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            invoiceType === 'sale'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-gray-600 hover:bg-white hover:text-gray-900'
          }`}
        >
          <FileText className="h-4.5 w-4.5" />
          <span>فاتورة مبيعات للعملاء</span>
        </button>
        <button
          id="invoice-type-purchase-btn"
          onClick={() => handleInvoiceTypeChange('purchase')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            invoiceType === 'purchase'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-white hover:text-gray-900'
          }`}
        >
          <ShoppingCart className="h-4.5 w-4.5" />
          <span>فاتورة مشتريات من الموردين</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Creation Form (Left Side) */}
        <form onSubmit={handlePostInvoice} className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 text-sm flex items-center gap-2">
              <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-600" />
              بيانات ومعلومات الفاتورة
            </h3>

            {/* Top row: Party selection & Inv info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  {invoiceType === 'sale' ? 'العميل المستفيد' : 'المورد المجهز'}
                </label>
                <select
                  id="invoice-party-select"
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                >
                  <option value="">-- فاتورة نقدية مباشرة --</option>
                  {invoiceType === 'sale'
                    ? customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (رصيده: {c.balance} ريال)
                        </option>
                      ))
                    : suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (رصيده: {s.balance} ريال)
                        </option>
                      ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">رقم السند/المستند</label>
                <input
                  id="invoice-number-input"
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-center font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">تاريخ الحركة</label>
                <input
                  id="invoice-date-input"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-center font-semibold text-slate-600"
                />
              </div>
            </div>

            {/* Item selections / dynamic adder block */}
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4">
              <span className="text-xs font-bold text-slate-500 block">إضافة أصناف بضائع للفاتورة</span>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">اختر الصنف من المخزن</label>
                  <select
                    id="invoice-item-select"
                    value={currentItemId}
                    onChange={(e) => handleItemSelect(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 transition-all font-semibold text-slate-700"
                  >
                    <option value="">-- اختر مادة / صنف --</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name} ({it.code}) - متوفر: {it.stock} {it.unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">سعر الوحدة ({invoiceType === 'sale' ? 'بيع' : 'شراء'})</label>
                  <input
                    id="invoice-item-price-input"
                    type="number"
                    step="0.01"
                    value={currentPrice || ''}
                    onChange={(e) => setCurrentPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-emerald-600 transition-all font-bold text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">الكمية المطلوبة</label>
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      id="invoice-qty-minus-btn"
                      type="button"
                      onClick={() => setCurrentQty(Math.max(1, currentQty - 1))}
                      className="px-2.5 py-2 text-gray-400 hover:text-rose-500 hover:bg-slate-50 transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      id="invoice-qty-input"
                      type="number"
                      min="1"
                      value={currentQty}
                      onChange={(e) => setCurrentQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-12 text-center text-xs font-bold font-sans text-slate-800 bg-transparent border-none focus:outline-none"
                    />
                    <button
                      id="invoice-qty-plus-btn"
                      type="button"
                      onClick={() => setCurrentQty(currentQty + 1)}
                      className="px-2.5 py-2 text-gray-400 hover:text-emerald-500 hover:bg-slate-50 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {selectedItem && (
                <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-800 px-3 py-2 rounded-xl">
                  <span>الصنف المختار: <strong>{selectedItem.name}</strong></span>
                  <span>الكمية المتاحة بالمستودع: <strong>{selectedItem.stock} {selectedItem.unit}</strong></span>
                  <span>تكلفة الشراء المسجلة: <strong>{formatCurrency(selectedItem.unitCost, 'YER')}</strong></span>
                </div>
              )}

              <button
                id="invoice-add-to-cart-btn"
                type="button"
                disabled={!currentItemId}
                onClick={addToCart}
                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentItemId
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>إدراج المادة للفاتورة</span>
              </button>
            </div>

            {/* Cart list table */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 block">تفاصيل البضائع المضافة للفاتورة</span>
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-500 border-b border-slate-100">
                      <th className="p-3">اسم المادة</th>
                      <th className="p-3 text-center">الكمية</th>
                      <th className="p-3 text-center">سعر الوحدة</th>
                      <th className="p-3 text-center">الإجمالي</th>
                      <th className="p-3 text-center w-16">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-600">
                    {cart.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-800">{item.itemName}</td>
                        <td className="p-3 text-center font-bold text-slate-700">{item.qty}</td>
                        <td className="p-3 text-center font-mono">{formatCurrency(item.price, 'YER')}</td>
                        <td className="p-3 text-center font-bold text-emerald-800 font-sans">
                          {formatCurrency(item.price * item.qty, 'YER')}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            id={`invoice-remove-cart-${index}`}
                            type="button"
                            onClick={() => removeFromCart(index)}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {cart.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-gray-400">
                          الفاتورة فارغة حالياً. قم باختيار المواد وإدراجها من المربع أعلاه.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes / Details input */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">ملاحظات إضافية / تفاصيل الفاتورة</label>
              <textarea
                id="invoice-details-textarea"
                rows={2}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="مثال: فاتورة مبيعات لشهر يوليو مع سداد جزئي..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
              />
            </div>
          </div>
        </form>

        {/* Payment Summary Box (Right Side) */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 text-sm flex items-center gap-2">
              <Coins className="h-4.5 w-4.5 text-emerald-600" />
              القيم المالية وطريقة الدفع
            </h3>

            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center text-gray-500">
                <span>إجمالي المواد الفعلي</span>
                <span className="font-bold font-sans text-slate-700">{formatCurrency(subtotal, 'YER')}</span>
              </div>

              {/* Discount selection field */}
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-500 shrink-0">منح خصم إضافي</span>
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">ريال</span>
                  <input
                    id="invoice-discount-input"
                    type="number"
                    min="0"
                    max={subtotal}
                    value={discount || ''}
                    onChange={(e) => setDiscount(Math.min(subtotal, parseFloat(e.target.value) || 0))}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-left focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3.5 flex justify-between items-center text-slate-800 font-bold">
                <span className="text-sm">الصافي المطلوب دفعه</span>
                <span className="text-xl font-black text-emerald-700 font-sans">{formatCurrency(grandTotal, 'YER')}</span>
              </div>
            </div>

            {/* Split payments logic */}
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-4">
              <span className="text-xs font-bold text-slate-500 block">توزيع السداد (نقدي / آجل)</span>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                    <span>المدفوع نقداً (الصندوق)</span>
                    <button
                      id="invoice-pay-all-btn"
                      type="button"
                      onClick={() => setCashPaid(grandTotal)}
                      className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold transition-colors"
                    >
                      دفع كامل المبلغ
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">ريال</span>
                    <input
                      id="invoice-cash-paid-input"
                      type="number"
                      min="0"
                      max={grandTotal}
                      value={cashPaid || ''}
                      onChange={(e) => setCashPaid(Math.min(grandTotal, parseFloat(e.target.value) || 0))}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-left focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/50">
                  <span className="text-gray-400">المتبقي للحساب الآجل:</span>
                  <span className={`font-bold font-mono ${creditAmount > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                    {formatCurrency(creditAmount, 'YER')}
                  </span>
                </div>
              </div>
            </div>

            {/* Warn user if they set credit but no Customer/Supplier selected */}
            {creditAmount > 0 && !selectedPartyId && (
              <div id="invoice-credit-warning" className="bg-rose-50 text-rose-700 text-xs p-3.5 rounded-xl border border-rose-100 flex items-start gap-2">
                <span>⚠️</span>
                <span className="leading-relaxed">
                  قمت بجدولة جزء من المبلغ كدين <strong>آجل</strong> ولكن لم تقم باختيار عميل/مورد.
                  لحفظ المديونية في ذمته، يرجى اختياره من قائمة الفاتورة.
                </span>
              </div>
            )}

            {/* Post invoice trigger button */}
            <button
              id="invoice-submit-btn"
              onClick={handlePostInvoice}
              className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              <span>حفظ وترحيل الفاتورة المالية</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
