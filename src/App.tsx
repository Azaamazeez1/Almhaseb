import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
  Wallet,
  Users,
  Layers,
  Settings,
  HelpCircle,
  Briefcase,
  Layers3,
  BookOpen,
  UserPlus,
  PackagePlus,
  RefreshCw,
  Sparkles,
  PhoneCall,
  Coins
} from 'lucide-react';
import { getInitialState, saveAllStates, formatCurrency } from './utils';
import { Item, Customer, Supplier, Transaction, AppConfig } from './types';

// Importing modular components
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import InventoryView from './components/InventoryView';
import InvoiceView from './components/InvoiceView';
import PartiesView from './components/PartiesView';
import VoucherForm from './components/VoucherForm';
import ReportsView from './components/ReportsView';

export default function App() {
  // --- Global States ---
  const [items, setItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    appName: 'برنامج المحاسبة وجرد البضائع',
    currency: 'USD',
    financialYear: '2026',
    thermalPrinterWidth: '80mm'
  });

  // Load initial states
  useEffect(() => {
    // Force a one-time clear of old mock data so the user starts with a completely blank database
    const hasForceCleared = localStorage.getItem('acct_inv_force_cleared_v3');
    if (!hasForceCleared) {
      localStorage.clear();
      localStorage.setItem('acct_inv_force_cleared_v3', 'true');
      localStorage.setItem('acct_inv_initialized', 'true');
    }
    const initialState = getInitialState();
    setItems(initialState.items);
    setCustomers(initialState.customers);
    setSuppliers(initialState.suppliers);
    setTransactions(initialState.transactions);
    setConfig(initialState.config);
  }, []);

  // Sync to local storage
  const persistState = (
    currentItems: Item[],
    currentCustomers: Customer[],
    currentSuppliers: Supplier[],
    currentTransactions: Transaction[],
    currentConfig: AppConfig
  ) => {
    saveAllStates({
      items: currentItems,
      customers: currentCustomers,
      suppliers: currentSuppliers,
      transactions: currentTransactions,
      config: currentConfig
    });
  };

  // --- Active Tab ---
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- Modals State ---
  const [activeModal, setActiveModal] = useState<'item' | 'customer' | 'supplier' | 'voucher_in' | 'voucher_out' | 'sale_return' | 'purchase_return' | 'about' | 'settings' | null>(null);

  // --- Quick Add Form Inputs ---
  const [newItemName, setNewItemName] = useState('');
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemCost, setNewItemCost] = useState(0);
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [newItemUnit, setNewItemUnit] = useState('حبة');

  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');

  // --- Functions to update state ---
  const handleAddTransaction = (newTx: Transaction) => {
    const updatedTxs = [newTx, ...transactions];
    setTransactions(updatedTxs);
    persistState(items, customers, suppliers, updatedTxs, config);
  };

  const handleUpdateStock = (itemId: string, newStock: number) => {
    const updatedItems = items.map((it) => {
      if (it.id === itemId) {
        return { ...it, stock: newStock };
      }
      return it;
    });
    setItems(updatedItems);
    persistState(updatedItems, customers, suppliers, transactions, config);
  };

  const handleUpdateItem = (updatedItem: Item) => {
    const updatedItems = items.map((it) => (it.id === updatedItem.id ? updatedItem : it));
    setItems(updatedItems);
    persistState(updatedItems, customers, suppliers, transactions, config);
  };

  const handleUpdatePartyBalance = (
    partyType: 'customer' | 'supplier',
    partyId: string,
    amountChange: number
  ) => {
    if (partyType === 'customer') {
      const updatedCustomers = customers.map((c) => {
        if (c.id === partyId) {
          return { ...c, balance: c.balance + amountChange };
        }
        return c;
      });
      setCustomers(updatedCustomers);
      persistState(items, updatedCustomers, suppliers, transactions, config);
    } else {
      const updatedSuppliers = suppliers.map((s) => {
        if (s.id === partyId) {
          return { ...s, balance: s.balance + amountChange };
        }
        return s;
      });
      setSuppliers(updatedSuppliers);
      persistState(items, customers, updatedSuppliers, transactions, config);
    }
  };

  // Natively Add item form submission
  const handleAddNewItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemCode) {
      alert('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    const duplicateCode = items.some((it) => it.code === newItemCode);
    if (duplicateCode) {
      alert('عذراً، رقم الصنف أو الباركود هذا مسجل مسبقاً لصنف آخر.');
      return;
    }

    const newItem: Item = {
      id: `item-${Date.now()}`,
      code: newItemCode,
      name: newItemName,
      stock: 0, // Starts at 0, purchase invoices or stock audits will increase it
      unit: newItemUnit,
      unitCost: newItemCost,
      salePrice: newItemPrice,
      currency: config.currency,
      lastPurchasePrice: newItemCost
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    persistState(updatedItems, customers, suppliers, transactions, config);

    // Reset fields
    setNewItemName('');
    setNewItemCode('');
    setNewItemCost(0);
    setNewItemPrice(0);
    setNewItemUnit('حبة');
    setActiveModal(null);
    alert('تمت إضافة الصنف بنجاح! يمكنك الآن توريده عن طريق فاتورة المشتريات لتسجيل الكميات.');
  };

  // Natively Add Customer/Supplier form submission
  const handleAddNewPartySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName) {
      alert('يرجى كتابة الاسم.');
      return;
    }

    if (activeModal === 'customer') {
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        name: newPartyName,
        phone: newPartyPhone,
        balance: 0.0
      };
      const updatedCustomers = [...customers, newCust];
      setCustomers(updatedCustomers);
      persistState(items, updatedCustomers, suppliers, transactions, config);
      alert('تم تسجيل العميل الجديد بنجاح!');
    } else {
      const newSupp: Supplier = {
        id: `supp-${Date.now()}`,
        name: newPartyName,
        phone: newPartyPhone,
        balance: 0.0
      };
      const updatedSuppliers = [...suppliers, newSupp];
      setSuppliers(updatedSuppliers);
      persistState(items, customers, updatedSuppliers, transactions, config);
      alert('تم تسجيل المورد الجديد بنجاح!');
    }

    setNewPartyName('');
    setNewPartyPhone('');
    setActiveModal(null);
  };

  // Reset System Data (تصفير البرنامج للبدء من الصفر)
  const handleResetSystem = () => {
    const confirm = window.confirm('تحذير شديد: هل أنت متأكد من مسح جميع الفواتير والمواد والحسابات والبدء ببرنامج فارغ؟ لا يمكن التراجع عن هذا الإجراء.');
    if (!confirm) return;

    localStorage.clear();
    localStorage.setItem('acct_inv_initialized', 'true');
    setItems([]);
    setCustomers([]);
    setSuppliers([]);
    setTransactions([]);
    persistState([], [], [], [], config);
    alert('تم تصفير البرنامج بنجاح! يمكنك الآن تعبئة بضائعك وعملائك من الصفر.');
    setActiveModal(null);
    window.location.reload();
  };

  // --- Sub-View Renders ---
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            transactions={transactions}
            customers={customers}
            suppliers={suppliers}
            items={items}
            onUpdateItem={handleUpdateItem}
            onOpenAddModal={(type) => setActiveModal(type)}
            onRestoreData={(importedState) => {
              setItems(importedState.items);
              setCustomers(importedState.customers);
              setSuppliers(importedState.suppliers);
              setTransactions(importedState.transactions);
              if (importedState.config) setConfig(importedState.config);
              persistState(
                importedState.items,
                importedState.customers,
                importedState.suppliers,
                importedState.transactions,
                importedState.config || config
              );
            }}
            stateToBackup={{ items, customers, suppliers, transactions, config }}
            setActiveTab={setActiveTab}
          />
        );

      case 'inventory':
        return (
          <InventoryView
            items={items}
            onAddItem={(it) => {
              const itemWithId = { ...it, id: `item-${Date.now()}` };
              const updatedItems = [...items, itemWithId];
              setItems(updatedItems);
              persistState(updatedItems, customers, suppliers, transactions, config);
            }}
            onUpdateStock={handleUpdateStock}
            onUpdateItem={handleUpdateItem}
            onOpenAddModal={() => setActiveModal('item')}
          />
        );

      case 'sales':
        return (
          <InvoiceView
            items={items}
            customers={customers}
            suppliers={suppliers}
            onAddTransaction={handleAddTransaction}
            onUpdateStock={handleUpdateStock}
            onUpdatePartyBalance={handleUpdatePartyBalance}
            initialInvoiceType="sale"
          />
        );

      case 'purchases':
        return (
          <InvoiceView
            items={items}
            customers={customers}
            suppliers={suppliers}
            onAddTransaction={handleAddTransaction}
            onUpdateStock={handleUpdateStock}
            onUpdatePartyBalance={handleUpdatePartyBalance}
            initialInvoiceType="purchase"
          />
        );

      case 'customers':
      case 'suppliers':
        return (
          <PartiesView
            customers={customers}
            suppliers={suppliers}
            transactions={transactions}
            onAddParty={(type, party) => {
              const newPartyId = `${type === 'customer' ? 'cust' : 'supp'}-${Date.now()}`;
              if (type === 'customer') {
                const updated = [...customers, { id: newPartyId, ...party, balance: 0 }];
                setCustomers(updated);
                persistState(items, updated, suppliers, transactions, config);
              } else {
                const updated = [...suppliers, { id: newPartyId, ...party, balance: 0 }];
                setSuppliers(updated);
                persistState(items, customers, updated, transactions, config);
              }
            }}
          />
        );

      case 'reports':
        return (
          <ReportsView
            transactions={transactions}
            customers={customers}
            suppliers={suppliers}
            items={items}
            activeSubReport="p_and_l"
          />
        );

      case 'balance_sheet':
        return (
          <ReportsView
            transactions={transactions}
            customers={customers}
            suppliers={suppliers}
            items={items}
            activeSubReport="balance_sheet"
          />
        );

      default:
        return <div className="text-center py-12 text-gray-400">تحت التطوير...</div>;
    }
  };

  return (
    <div dir="rtl" className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={(type) => setActiveModal(type)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Main Header / Top navigation bar mimicking screenshot 2/3 */}
        <header className="bg-gradient-to-l from-emerald-800 to-teal-800 text-white h-16 shrink-0 px-6 flex items-center justify-between shadow-md print:hidden">
          <div className="flex items-center gap-4">
            <button
              id="hamburger-menu-btn"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <Menu className="h-6 w-6 text-white" />
            </button>

            <div className="flex items-center gap-2">
              <Layers3 className="h-6 w-6 text-emerald-300" />
              <h1 className="font-bold text-lg tracking-wide hidden sm:block">برنامج المحاسب المحترف</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick cash balance header status */}
            <div className="bg-white/10 border border-white/15 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 backdrop-blur-sm">
              <Wallet className="h-4 w-4 text-emerald-300" />
              <span className="hidden md:inline text-emerald-100">الصندوق:</span>
              <span className="font-mono text-emerald-200">
                {formatCurrency(
                  transactions.reduce((sum, tx) => {
                    if (tx.type === 'initial_balance' || tx.type === 'sale' || tx.type === 'purchase_return' || tx.type === 'receipt_voucher') {
                      return sum + tx.cashPaid;
                    } else {
                      return sum - tx.cashPaid;
                    }
                  }, 0),
                  config.currency
                )}
              </span>
            </div>

            {/* Quick Actions Dropdown mimicking screenshot 4 menu */}
            <div className="relative group">
              <button
                id="header-setup-dropdown-btn"
                onClick={() => setActiveModal('settings')}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold bg-white/5 border border-white/10"
              >
                <Settings className="h-4.5 w-4.5" />
                <span className="hidden sm:inline">تهيئة النظام</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Shell with scrolling */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50 relative pb-12">
          {renderContent()}
        </main>
      </div>

      {/* --- Native Add Item Modal ("إضافة صنف") --- */}
      {activeModal === 'item' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-bold text-base text-slate-800">إضافة صنف بضاعة جديد للمستودع</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-slate-800 p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewItemSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">اسم الصنف / البضاعة</label>
                <input
                  id="modal-item-name-input"
                  type="text"
                  required
                  placeholder="مثال: زياتي تجاري ٢٠ لتر"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">رقم الصنف / الباركود</label>
                  <input
                    id="modal-item-code-input"
                    type="text"
                    required
                    placeholder="رمز فريد مثل: 106"
                    value={newItemCode}
                    onChange={(e) => setNewItemCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">وحدة القياس</label>
                  <select
                    id="modal-item-unit-select"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold"
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
                  <label className="block text-xs font-semibold text-gray-500 mb-1">تكلفة الشراء الأساسية (ريال)</label>
                  <input
                    id="modal-item-cost-input"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={newItemCost || ''}
                    onChange={(e) => setNewItemCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">سعر البيع المقترح (ريال)</label>
                  <input
                    id="modal-item-price-input"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={newItemPrice || ''}
                    onChange={(e) => setNewItemPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold"
                  />
                </div>
              </div>

              <div className="bg-emerald-50 text-emerald-800 text-[10px] p-3 rounded-xl border border-emerald-100 leading-relaxed">
                * ملاحظة: يتم إنشاء الصنف الجديد بـ <strong>كمية صفرية</strong> تلقائياً. لتسجيل كميات البضائع وزيادتها، قم بإنشاء <strong>فاتورة مشتريات</strong> ترحيلية أو قم بتطبيق تعديل كمي في شاشة <strong>جرد البضائع</strong>.
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  حفظ الصنف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Native Add Customer / Supplier Modal ("إضافة عميل / مورد") --- */}
      {(activeModal === 'customer' || activeModal === 'supplier') && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-bold text-base text-slate-800">
                {activeModal === 'customer' ? 'إضافة عميل / زبون جديد' : 'إضافة مورد بضائع جديد'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-slate-800 p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewPartySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">الاسم الكامل</label>
                <input
                  id="modal-party-name-input"
                  type="text"
                  required
                  placeholder={activeModal === 'customer' ? 'مثال: عبدالمجيد محمد الكبسي' : 'مثال: شركة النخبة التجارية'}
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">رقم الهاتف (جوال)</label>
                <input
                  id="modal-party-phone-input"
                  type="tel"
                  placeholder="مثال: 777111222"
                  value={newPartyPhone}
                  onChange={(e) => setNewPartyPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  حفظ وتسجيل الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Native Voucher Modal from quick dashboard buttons --- */}
      {(activeModal === 'voucher_in' || activeModal === 'voucher_out') && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="max-w-2xl w-full animate-in fade-in zoom-in-95 duration-200">
            <VoucherForm
              type={activeModal === 'voucher_in' ? 'receipt_voucher' : 'payment_voucher'}
              customers={customers}
              suppliers={suppliers}
              onAddTransaction={handleAddTransaction}
              onUpdatePartyBalance={handleUpdatePartyBalance}
              onClose={() => setActiveModal(null)}
            />
          </div>
        </div>
      )}

      {/* --- Returns Modals (Sales/Purchases Return handlers) --- */}
      {(activeModal === 'sale_return' || activeModal === 'purchase_return') && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-bold text-base text-slate-800">
                {activeModal === 'sale_return' ? 'تسجيل مرتجع مبيعات' : 'تسجيل مرتجع مشتريات'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-slate-800 p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              لتسهيل تتبع المرتجعات، يرجى ملء التفاصيل لتحديث كميات المخزن تلقائياً وصرف القيمة النقدية للمستفيد.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as any;
                const itemId = form.itemId.value;
                const qty = parseInt(form.qty.value, 10);
                const price = parseFloat(form.price.value);
                const desc = form.desc.value;

                if (!itemId || !qty || !price) {
                  alert('الرجاء تعبئة كافة الحقول.');
                  return;
                }

                const item = items.find((i) => i.id === itemId);
                if (!item) return;

                const returnCode = `RET-${Date.now().toString().slice(-6)}`;

                // Create return transaction
                const returnTx: Transaction = {
                  id: `return-${Date.now()}`,
                  invoiceNumber: returnCode,
                  date: new Date().toISOString(),
                  type: activeModal,
                  amount: qty * price,
                  cashPaid: qty * price, // immediate cash flow
                  creditAmount: 0,
                  details: desc || `${activeModal === 'sale_return' ? 'مرتجع مبيعات' : 'مرتجع مشتريات'} للصنف ${item.name}`,
                  items: [{ itemId: item.id, itemName: item.name, qty, price, cost: item.unitCost }]
                };

                // Adjust stock levels:
                // If sale_return: stock increases (customer returned item to us)
                // If purchase_return: stock decreases (we returned item to supplier)
                const stockChange = activeModal === 'sale_return' ? qty : -qty;
                if (activeModal === 'purchase_return' && item.stock < qty) {
                  alert(`عذراً، لا يمكن إرجاع كمية أكبر من المتوفرة بالمستودع حالياً: ${item.stock} حبة.`);
                  return;
                }

                handleUpdateStock(itemId, item.stock + stockChange);
                handleAddTransaction(returnTx);
                alert('تم ترحيل المرتجع بنجاح وتحديث الصندوق وكميات الرفوف!');
                setActiveModal(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">اختر الصنف المرتجع</label>
                <select
                  name="itemId"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold"
                >
                  <option value="">-- اختر مادة / صنف --</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} (المخزون الحالي: {it.stock} {it.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">الكمية المرتجعة</label>
                  <input
                    name="qty"
                    type="number"
                    min="1"
                    required
                    defaultValue="1"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">القيمة الفردية للصنف (ريال)</label>
                  <input
                    name="price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">سبب الإرجاع / تفاصيل</label>
                <input
                  name="desc"
                  type="text"
                  placeholder="مثال: وجود عيب مصنعي في المادة الموردة..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  تأكيد وترحيل المرتجع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Native Settings Modal ("ضبط وتهيئة البرنامج") --- */}
      {activeModal === 'settings' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Settings className="h-5 w-5 text-emerald-600" />
                <span>ضبط وتهيئة البرنامج المحترف</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-slate-800 p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Financial Metadata Form */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-slate-700 border-b border-slate-100 pb-1.5">الخصائص المالية الأساسية</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">العملة المعتمدة للتداول</label>
                    <select
                      value={config.currency}
                      onChange={(e) => {
                        const newConfig = { ...config, currency: e.target.value };
                        setConfig(newConfig);
                        persistState(items, customers, suppliers, transactions, newConfig);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="YER">ريال يمني (YER)</option>
                      <option value="SAR">ريال سعودي (SAR)</option>
                      <option value="USD">دولار أمريكي (USD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">السنة المالية النشطة</label>
                    <input
                      type="text"
                      value={config.financialYear}
                      onChange={(e) => {
                        const newConfig = { ...config, financialYear: e.target.value };
                        setConfig(newConfig);
                        persistState(items, customers, suppliers, transactions, newConfig);
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Reset Database Trigger */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="font-bold text-xs text-rose-800">خيارات الحذف والتصفير</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  إذا كنت ترغب بمسح البيانات الافتراضية التجريبية وبدء ممارسة أعمالك التجارية والمالية الفعلية وإدخال جرد المستودعات الخاص بك من الصفر، قم بالضغط على التصفير الكامل.
                </p>
                <button
                  id="reset-system-data-btn"
                  onClick={handleResetSystem}
                  className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>تصفير ومسح قاعدة البيانات كاملة</span>
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer w-full"
                >
                  حفظ وإغلاق نافذة التهيئة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
