import React, { useState } from 'react';
import {
  Layers,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Check,
  AlertTriangle,
  Barcode,
  Package,
  TrendingUp,
  Tag,
  DollarSign,
  X,
  Sparkles
} from 'lucide-react';
import { Item } from '../types';
import { formatCurrency } from '../utils';

interface InventoryViewProps {
  items: Item[];
  onAddItem: (item: Omit<Item, 'id'>) => void;
  onUpdateStock: (itemId: string, newStock: number) => void;
  onUpdateItem: (updatedItem: Item) => void;
  onOpenAddModal: (prefillName?: string) => void;
}

export default function InventoryView({
  items,
  onAddItem,
  onUpdateStock,
  onUpdateItem,
  onOpenAddModal
}: InventoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editedCost, setEditedCost] = useState<number>(0);
  const [editedSalePrice, setEditedSalePrice] = useState<number>(0);
  const [editedStock, setEditedStock] = useState<number>(0);
  const [editedName, setEditedName] = useState<string>('');

  // States for the beautiful item edit card/modal
  const [modalEditingItem, setModalEditingItem] = useState<Item | null>(null);
  const [modalEditName, setModalEditName] = useState('');
  const [modalEditCode, setModalEditCode] = useState('');
  const [modalEditStock, setModalEditStock] = useState(0);
  const [modalEditCost, setModalEditCost] = useState(0);
  const [modalEditPrice, setModalEditPrice] = useState(0);
  const [modalEditUnit, setModalEditUnit] = useState('حبة');
  const [modalEditCurrency, setModalEditCurrency] = useState('USD');

  const startModalEditing = (item: Item) => {
    setModalEditingItem(item);
    setModalEditName(item.name);
    setModalEditCode(item.code);
    setModalEditStock(item.stock);
    setModalEditCost(item.unitCost);
    setModalEditPrice(item.salePrice);
    setModalEditUnit(item.unit || 'حبة');
    setModalEditCurrency(item.currency || 'USD');
  };

  // Stock counting states (جرد البضائع)
  const [auditMode, setAuditMode] = useState(false);
  const [auditQuantities, setAuditQuantities] = useState<Record<string, number>>({});

  const filteredItems = items.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      item.code.toLowerCase().includes(term) ||
      item.id.toLowerCase().includes(term)
    );
  });

  const startEditing = (item: Item) => {
    setEditingItemId(item.id);
    setEditedCost(item.unitCost);
    setEditedSalePrice(item.salePrice);
    setEditedStock(item.stock);
    setEditedName(item.name);
  };

  const saveEditing = (item: Item) => {
    if (editedCost > editedSalePrice) {
      alert('عذراً! لا يمكن الحفظ لأن سعر الشراء (رأس المال) أعلى من سعر البيع (المبيع)، مما يعني حدوث خسارة على هذا الصنف. يرجى تعديل الأسعار أولاً لتجنب تسجيل خسائر.');
      return;
    }
    onUpdateItem({
      ...item,
      name: editedName,
      unitCost: editedCost,
      salePrice: editedSalePrice,
      stock: editedStock
    });
    setEditingItemId(null);
  };

  const handleAuditChange = (itemId: string, value: string) => {
    const qty = parseInt(value, 10);
    setAuditQuantities((prev) => ({
      ...prev,
      [itemId]: isNaN(qty) ? 0 : qty
    }));
  };

  const applyAudit = () => {
    const confirmed = window.confirm('هل أنت متأكد من تطبيق فروقات جرد البضائع وتعديل الكميات الحالية؟');
    if (!confirmed) return;

    Object.entries(auditQuantities).forEach(([itemId, qty]) => {
      onUpdateStock(itemId, Number(qty));
    });

    setAuditQuantities({});
    setAuditMode(false);
    alert('تم تعديل وتطبيق جرد المخازن بنجاح!');
  };

  // Calculations for total inventory value
  const totalCostValue = items.reduce((sum, item) => sum + item.unitCost * item.stock, 0);
  const totalSaleValue = items.reduce((sum, item) => sum + item.salePrice * item.stock, 0);
  const expectedProfit = totalSaleValue - totalCostValue;

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header and Summary stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Layers className="h-5.5 w-5.5 text-emerald-600" />
            جرد بضائع المخزن والمواد
          </h2>
          <p className="text-xs text-gray-500">جرد ومراقبة حركة المواد وأسعار التكلفة وهامش الأرباح التقديري.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="toggle-audit-mode-btn"
            onClick={() => {
              if (auditMode) {
                setAuditQuantities({});
              }
              setAuditMode(!auditMode);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer ${
              auditMode
                ? 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            {auditMode ? 'إلغاء وضع الجرد الفعلي' : 'بدء جرد بضائع المخازن'}
          </button>

          <button
            id="add-item-modal-btn"
            onClick={onOpenAddModal}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة صنف جديد</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 flex items-center gap-4 shadow-sm">
          <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-2xl">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-medium mb-0.5">عدد الأصناف المسجلة</span>
            <span className="text-2xl font-black text-slate-800 font-mono">{items.length} أصناف</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 flex items-center gap-4 shadow-sm">
          <div className="bg-teal-50 text-teal-600 p-3.5 rounded-2xl">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-medium mb-0.5">القيمة الإجمالية بالتكلفة</span>
            <span className="text-2xl font-black text-slate-800 font-sans">{formatCurrency(totalCostValue, 'YER')}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 flex items-center gap-4 shadow-sm">
          <div className="bg-blue-50 text-blue-600 p-3.5 rounded-2xl">
            <Tag className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-medium mb-0.5">الربح المتوقع عند البيع</span>
            <span className="text-2xl font-black text-emerald-600 font-sans">{formatCurrency(expectedProfit, 'YER')}</span>
          </div>
        </div>
      </div>

      {/* Audit Alert */}
      {auditMode && (
        <div id="audit-info-box" className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-950 text-sm">أنت الآن في وضع جرد بضائع المخزن الفعلي</h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                قم بإدخال الكميات الفعلية المتواجدة في رفوف مستودعك بالعمود &quot;الكمية الفعلية المجرودة&quot;.
                سيقوم النظام تلقائياً بحساب الفروقات وتعديل كمية المخزن بناءً على مدخلاتك بمجرد النقر على تطبيق الجرد.
              </p>
            </div>
          </div>
          <button
            id="apply-audit-btn"
            onClick={applyAudit}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm cursor-pointer whitespace-nowrap transition-colors"
          >
            تطبيق فروقات جرد البضائع
          </button>
        </div>
      )}

      {/* Main Filter & Inventory Table Block */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Search & Inputs mimicking bottom section of screen 3 */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              id="search-inventory-input"
              type="text"
              placeholder="اسم الصنف او الرقم او نهاية رقم الصنف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600 transition-colors"
            />
          </div>

          <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto">
            <div className="w-1/2 md:w-36">
              <input
                id="sales-invoice-ref-input"
                type="text"
                placeholder="رقم فاتورة البيع"
                disabled
                className="w-full px-3 py-2.5 bg-slate-100/80 border border-slate-200/60 rounded-xl text-xs text-center text-gray-400 focus:outline-none cursor-not-allowed"
                title="يتم التصفية التلقائية للفواتير من شاشة المبيعات"
              />
            </div>
            <div className="w-1/2 md:w-36">
              <input
                id="purchase-invoice-ref-input"
                type="text"
                disabled
                placeholder="رقم فاتورة الشراء"
                className="w-full px-3 py-2.5 bg-slate-100/80 border border-slate-200/60 rounded-xl text-xs text-center text-gray-400 focus:outline-none cursor-not-allowed"
                title="يتم التصفية التلقائية للفواتير من شاشة المشتريات"
              />
            </div>
          </div>
        </div>

        {/* Inventory Table mimicking Screenshot 3 */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-bold text-slate-500 border-b border-slate-100">
                <th className="p-4 w-20 text-center">رقم الصنف</th>
                <th className="p-4">اسم الصنف</th>
                <th className="p-4 text-center">المخزون الحالي</th>
                {auditMode && <th className="p-4 text-center bg-amber-50 text-amber-900">الكمية الفعلية المجرودة</th>}
                {auditMode && <th className="p-4 text-center bg-amber-50 text-amber-900">الفارق (العجز/الزيادة)</th>}
                <th className="p-4 text-center">الوحدة</th>
                <th className="p-4">تكلفة الوحدة (سعر الشراء)</th>
                <th className="p-4">سعر البيع المقترح</th>
                <th className="p-4">العملة</th>
                <th className="p-4">آخر شراء</th>
                <th className="p-4 text-center w-28">العمليات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm text-slate-600">
              {filteredItems.map((item) => {
                const isEditing = editingItemId === item.id;
                const auditQty = auditQuantities[item.id] !== undefined ? auditQuantities[item.id] : item.stock;
                const auditDiff = auditQty - item.stock;

                return (
                  <tr
                    key={item.id}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('input') || target.closest('select') || target.closest('button')) {
                        return;
                      }
                      startModalEditing(item);
                    }}
                    className="hover:bg-teal-50/20 transition-colors cursor-pointer group"
                    title="انقر لعرض بطاقة تعديل الصنف الفورية"
                  >
                    {/* Item ID/Code */}
                    <td className="p-4 text-center font-mono text-xs font-bold text-slate-400">
                      <div className="flex items-center justify-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg w-max mx-auto">
                        <Barcode className="h-3 w-3 text-gray-400" />
                        <span>{item.code}</span>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="p-4 font-bold text-slate-800">
                      {isEditing ? (
                        <input
                          id={`edit-item-name-${item.id}`}
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-300 rounded text-sm w-full font-bold focus:outline-emerald-600"
                        />
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span>{item.name}</span>
                          <span className="text-[10px] text-teal-700 font-black bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all">
                            بطاقة تعديل ✎
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Stock */}
                    <td className="p-4 text-center font-bold text-slate-800">
                      {isEditing ? (
                        <input
                          id={`edit-item-stock-${item.id}`}
                          type="number"
                          value={editedStock}
                          onChange={(e) => setEditedStock(parseInt(e.target.value, 10) || 0)}
                          className="px-2 py-1 bg-white border border-slate-300 rounded text-sm w-20 text-center focus:outline-emerald-600"
                        />
                      ) : (
                        <span className={item.stock === 0 ? 'text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg' : 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg'}>
                          {item.stock} {item.unit}
                        </span>
                      )}
                    </td>

                    {/* Audit Columns */}
                    {auditMode && (
                      <td className="p-4 text-center bg-amber-50/40">
                        <input
                          id={`audit-item-qty-${item.id}`}
                          type="number"
                          value={auditQuantities[item.id] !== undefined ? auditQuantities[item.id] : ''}
                          placeholder={item.stock.toString()}
                          onChange={(e) => handleAuditChange(item.id, e.target.value)}
                          className="w-20 px-2 py-1 text-center bg-white border border-amber-300 rounded-lg text-sm text-slate-800 font-bold focus:outline-amber-600"
                        />
                      </td>
                    )}

                    {auditMode && (
                      <td className="p-4 text-center font-bold bg-amber-50/40">
                        {auditDiff === 0 ? (
                          <span className="text-gray-400 font-medium">-</span>
                        ) : auditDiff > 0 ? (
                          <span className="text-emerald-600 font-bold">+{auditDiff}</span>
                        ) : (
                          <span className="text-rose-600 font-bold">{auditDiff}</span>
                        )}
                      </td>
                    )}

                    {/* Unit */}
                    <td className="p-4 text-center text-xs text-gray-400">{item.unit}</td>

                    {/* Unit Cost */}
                    <td className="p-4 font-semibold text-slate-700">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            id={`edit-item-cost-${item.id}`}
                            type="number"
                            step="0.01"
                            value={editedCost}
                            onChange={(e) => setEditedCost(parseFloat(e.target.value) || 0)}
                            className="px-2 py-1 bg-white border border-slate-300 rounded text-sm w-20 text-left font-sans focus:outline-emerald-600"
                          />
                        </div>
                      ) : (
                        <span>{formatCurrency(item.unitCost, item.currency)}</span>
                      )}
                    </td>

                    {/* Sale Price */}
                    <td className="p-4 font-bold text-emerald-700">
                      {isEditing ? (
                        <input
                          id={`edit-item-price-${item.id}`}
                          type="number"
                          step="0.01"
                          value={editedSalePrice}
                          onChange={(e) => setEditedSalePrice(parseFloat(e.target.value) || 0)}
                          className="px-2 py-1 bg-white border border-slate-300 rounded text-sm w-20 text-left font-sans focus:outline-emerald-600"
                        />
                      ) : (
                        <span>{formatCurrency(item.salePrice, item.currency)}</span>
                      )}
                    </td>

                    {/* Currency */}
                    <td className="p-4 text-xs font-semibold text-gray-500">
                      {item.currency === 'YER' ? 'محلّي (ريال)' : item.currency}
                    </td>

                    {/* Last Purchase Price */}
                    <td className="p-4 font-mono text-xs text-slate-500 font-semibold">
                      {formatCurrency(item.lastPurchasePrice, item.currency)}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      {isEditing ? (
                        <button
                          id={`save-item-btn-${item.id}`}
                          onClick={() => saveEditing(item)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                          title="حفظ التعديلات"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          id={`edit-item-btn-${item.id}`}
                          onClick={() => startEditing(item)}
                          className="text-gray-400 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer inline-flex items-center"
                          title="تعديل مواصفات الصنف"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={auditMode ? 11 : 9} className="p-10 text-center text-gray-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <span>لا توجد أصناف مطابقة لعملية البحث.</span>
                      <button
                        type="button"
                        onClick={() => onOpenAddModal(searchTerm)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-colors mt-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>إضافة صنف جديد باسم &quot;{searchTerm}&quot;</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Beautiful "بطاقة تعديل الصنف" (Edit Item Modal Card) */}
      {modalEditingItem && (
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
                onClick={() => setModalEditingItem(null)}
                className="text-gray-400 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!modalEditName || !modalEditCode) return;
              onUpdateItem({
                ...modalEditingItem,
                name: modalEditName,
                code: modalEditCode,
                stock: modalEditStock,
                unitCost: modalEditCost,
                salePrice: modalEditPrice,
                unit: modalEditUnit,
                currency: modalEditCurrency
              });
              setModalEditingItem(null);
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1 text-right">اسم الصنف</label>
                <input
                  type="text"
                  required
                  value={modalEditName}
                  onChange={(e) => setModalEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-black text-right"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 text-right">رقم الصنف / الباركود</label>
                  <input
                    type="text"
                    required
                    value={modalEditCode}
                    onChange={(e) => setModalEditCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 text-right">وحدة القياس</label>
                  <select
                    value={modalEditUnit}
                    onChange={(e) => setModalEditUnit(e.target.value)}
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
                    value={modalEditStock}
                    onChange={(e) => setModalEditStock(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 text-right">العملة</label>
                  <select
                    value={modalEditCurrency}
                    onChange={(e) => setModalEditCurrency(e.target.value)}
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
                    value={modalEditCost}
                    onChange={(e) => setModalEditCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 text-right">سعر البيع المقترح</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={modalEditPrice}
                    onChange={(e) => setModalEditPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-teal-600 focus:bg-white transition-all font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalEditingItem(null)}
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
