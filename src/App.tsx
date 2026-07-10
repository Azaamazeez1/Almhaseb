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
  Coins,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  Cloud,
  CloudOff,
  Smartphone,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getInitialState, saveAllStates, formatCurrency } from './utils';
import { Item, Customer, Supplier, Transaction, AppConfig, UserAccount } from './types';

// Importing modular components
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import Dashboard from './components/Dashboard';
import InventoryView from './components/InventoryView';
import InvoiceView from './components/InvoiceView';
import PartiesView from './components/PartiesView';
import VoucherForm from './components/VoucherForm';
import ReportsView from './components/ReportsView';
import PWAInstallView from './components/PWAInstallView';
import { CustomSelect, UNIT_OPTIONS } from './components/CustomSelect';

export default function App() {
  // --- Global States ---
  const [items, setItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [config, setConfig] = useState<AppConfig>({
    appName: 'بيبرس للمحاسبة',
    currency: 'USD',
    financialYear: '2026',
    thermalPrinterWidth: '80mm'
  });

  // Load initial states
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [isSupabaseMode, setIsSupabaseMode] = useState(false);
  const [hasAutoSyncedOnMount, setHasAutoSyncedOnMount] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    import('./lib/supabase').then(({ isSupabaseConfigured }) => {
      setIsSupabaseMode(isSupabaseConfigured());
    });
  }, []);

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

    // Load optionally authenticated user from localStorage if exists, or auto-create a device-based backup account
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error loading current_user from localStorage', e);
      }
    } else {
      // Auto-create a device-based backup account!
      let deviceUuid = localStorage.getItem('device_backup_uuid');
      if (!deviceUuid) {
        deviceUuid = `dev-${Math.random().toString(36).substring(2, 11)}-${Date.now().toString().slice(-4)}`;
        localStorage.setItem('device_backup_uuid', deviceUuid);
      }

      // Detect device model
      const ua = navigator.userAgent;
      let deviceType = 'جهاز ذكي';
      if (/android/i.test(ua)) {
        if (/samsung/i.test(ua)) deviceType = 'جوال سامسونج';
        else if (/redmi|xiaomi/i.test(ua)) deviceType = 'جوال شاومي';
        else if (/huawei/i.test(ua)) deviceType = 'جوال هواوي';
        else deviceType = 'جوال أندرويد';
      } else if (/iPad|iPhone|iPod/.test(ua)) {
        deviceType = 'جوال آيفون';
      } else if (/macintosh/i.test(ua)) {
        deviceType = 'جهاز ماك';
      } else if (/windows/i.test(ua)) {
        deviceType = 'جهاز كمبيوتر (ويندوز)';
      } else if (/linux/i.test(ua)) {
        deviceType = 'جهاز كمبيوتر (لينكس)';
      }

      const shortUuid = deviceUuid.split('-')[1]?.toUpperCase() || 'DEV';
      
      const autoUser: UserAccount = {
        email: `${deviceUuid}@bibars-cloud.com`,
        fullName: `نسخة سحابية - ${deviceType}`,
        companyName: `جهاز محاسبي [${shortUuid}]`,
        countryRegion: 'مزامنة تلقائية',
        phone: ''
      };

      localStorage.setItem('current_user', JSON.stringify(autoUser));
      setCurrentUser(autoUser);

      // Register with Supabase in the background
      import('./lib/supabase').then(({ dbSaveUserAccount, isSupabaseConfigured }) => {
        if (isSupabaseConfigured()) {
          dbSaveUserAccount(autoUser).then(success => {
            if (success) {
              console.log('Successfully registered auto device backup profile on cloud:', autoUser.email);
            }
          });
        }
      });
    }
  }, []);

  // Automatic background backup on app startup
  useEffect(() => {
    if (isSupabaseMode && currentUser && !hasAutoSyncedOnMount) {
      setHasAutoSyncedOnMount(true);
      
      const localState = getInitialState();
      
      import('./lib/supabase').then(({ dbSyncUpAllData, dbSyncDownAllData, dbSaveUserAccount }) => {
        setSyncStatus('syncing');
        // Ensure user is registered in database
        dbSaveUserAccount(currentUser).then(() => {
          dbSyncDownAllData(currentUser.email).then(res => {
            if (res.success && res.data) {
              const hasCloudData = res.data.items.length > 0 || res.data.transactions.length > 0;
              const hasLocalData = localState.items.length > 0 || localState.transactions.length > 0;
              
              if (!hasCloudData && hasLocalData) {
                // Cloud is empty, but local has data. Upload local data automatically!
                dbSyncUpAllData(
                  currentUser.email,
                  localState.items,
                  localState.customers,
                  localState.suppliers,
                  localState.transactions
                ).then(upRes => {
                  if (upRes.success) {
                    setSyncStatus('success');
                    setTimeout(() => setSyncStatus('idle'), 3000);
                    console.log('Successfully backed up all existing local data to cloud.');
                  } else {
                    setSyncStatus('error');
                  }
                });
              } else if (hasCloudData && !hasLocalData) {
                // Cloud has data, but local is empty (e.g. cache cleared). Restore cloud data automatically!
                setItems(res.data.items);
                setCustomers(res.data.customers);
                setSuppliers(res.data.suppliers);
                setTransactions(res.data.transactions);
                
                saveAllStates({
                  items: res.data.items,
                  customers: res.data.customers,
                  suppliers: res.data.suppliers,
                  transactions: res.data.transactions,
                  config: localState.config
                });
                
                setSyncStatus('success');
                setTimeout(() => setSyncStatus('idle'), 3000);
                console.log('Successfully restored cloud backup to device.');
              } else if (hasCloudData && hasLocalData) {
                // Both have data. Silently update cloud to ensure latest offline changes are backed up.
                dbSyncUpAllData(
                  currentUser.email,
                  localState.items,
                  localState.customers,
                  localState.suppliers,
                  localState.transactions
                ).then(upRes => {
                  if (upRes.success) {
                    setSyncStatus('success');
                    setTimeout(() => setSyncStatus('idle'), 3000);
                    console.log('Successfully synced local data up to cloud backup.');
                  } else {
                    setSyncStatus('error');
                  }
                });
              } else {
                // Both are empty
                setSyncStatus('idle');
              }
            } else {
              setSyncStatus('error');
            }
          }).catch(() => {
            setSyncStatus('error');
          });
        });
      });
    }
  }, [isSupabaseMode, currentUser, hasAutoSyncedOnMount]);

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

    // Cloud background sync
    if (currentUser && isSupabaseMode) {
      setSyncStatus('syncing');
      import('./lib/supabase').then(({ dbSyncUpAllData }) => {
        dbSyncUpAllData(
          currentUser.email,
          currentItems,
          currentCustomers,
          currentSuppliers,
          currentTransactions
        ).then(res => {
          if (res.success) {
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 3000);
          } else {
            setSyncStatus('error');
          }
        }).catch(() => {
          setSyncStatus('error');
        });
      });
    }
  };

  // --- Active Tab with Browser History Integration ---
  const [activeTab, setActiveTabState] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    if (!window.history.state || window.history.state.tab !== tab) {
      window.history.pushState({ tab }, '', '');
    }
  };

  useEffect(() => {
    // Set initial state so back button knows where to land
    if (!window.history.state) {
      window.history.replaceState({ tab: 'dashboard' }, '', '');
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && typeof event.state.tab === 'string') {
        setActiveTabState(event.state.tab);
      } else {
        setActiveTabState('dashboard');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // --- 5-Second PWA Install Prompt Banner State & Effect ---
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation event
    const handleAppInstalled = () => {
      localStorage.setItem('pwa_installed', 'true');
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone || 
                         localStorage.getItem('pwa_installed') === 'true';

    const isDismissed = localStorage.getItem('pwa_prompt_dismissed');

    let timer: any;
    if (!isStandalone && !isDismissed) {
      // 5 seconds = 5000 milliseconds
      timer = setTimeout(() => {
        const currentlyStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                                    (window.navigator as any).standalone || 
                                    localStorage.getItem('pwa_installed') === 'true';
        if (!currentlyStandalone) {
          setShowInstallPrompt(true);
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Auto-trigger PWA installation if redirected out of iframe
  useEffect(() => {
    if (deferredPrompt && localStorage.getItem('trigger_pwa_install_on_load') === 'true') {
      localStorage.removeItem('trigger_pwa_install_on_load');
      try {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(({ outcome }: any) => {
          if (outcome === 'accepted') {
            setDeferredPrompt(null);
          }
        }).catch((err: any) => console.error('Auto install choice failed:', err));
      } catch (err) {
        console.error('Auto install prompt execution failed:', err);
      }
    }
  }, [deferredPrompt]);

  // --- Modals State ---
  const [activeModal, setActiveModal] = useState<'item' | 'customer' | 'supplier' | 'voucher_in' | 'voucher_out' | 'sale_return' | 'purchase_return' | 'about' | 'settings' | null>(null);

  // --- Quick Add Form Inputs ---
  const [newItemName, setNewItemName] = useState('');
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemCost, setNewItemCost] = useState<string>('');
  const [newItemPrice, setNewItemPrice] = useState<string>('');
  const [newItemUnit, setNewItemUnit] = useState('حبة');
  const [newItemStock, setNewItemStock] = useState<string>('');

  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');

  // --- Custom Alert System ---
  const [alertConfig, setAlertConfig] = useState<{
    message: string;
    isOpen: boolean;
    title?: string;
    type?: 'success' | 'warning' | 'info' | 'error';
  } | null>(null);

  const [confirmConfig, setConfirmConfig] = useState<{
    message: string;
    isOpen: boolean;
    title?: string;
    resolve?: (value: boolean) => void;
  } | null>(null);

  // --- Authentication States (Optional Cloud Account) ---


  useEffect(() => {
    window.alert = (message: string) => {
      let type: 'success' | 'warning' | 'info' | 'error' = 'info';
      if (
        message.includes('نجاح') ||
        message.includes('بنجاح') ||
        message.includes('تم ') ||
        message.includes('تمت') ||
        message.includes('موفق')
      ) {
        type = 'success';
      } else if (
        message.includes('عذراً') ||
        message.includes('خطأ') ||
        message.includes('فشل') ||
        message.includes('أكثر من') ||
        message.includes('لا توجد')
      ) {
        type = 'error';
      } else if (
        message.includes('تنبيه') ||
        message.includes('يرجى') ||
        message.includes('يجب') ||
        message.includes('الرجاء')
      ) {
        type = 'warning';
      }

      setAlertConfig({
        message,
        isOpen: true,
        title: type === 'success' ? 'تمت العملية بنجاح' : (type === 'error' ? 'تنبيه أو خطأ' : (type === 'warning' ? 'تنبيه هـام' : 'إشعار النظام')),
        type
      });
    };

    (window as any).customConfirm = (message: string, title = 'تأكيد العملية') => {
      return new Promise<boolean>((resolve) => {
        setConfirmConfig({
          message,
          isOpen: true,
          title,
          resolve: (val) => {
            resolve(val);
            setConfirmConfig(null);
          }
        });
      });
    };
  }, []);

  const handleCloseAlert = () => {
    setAlertConfig(prev => prev ? { ...prev, isOpen: false } : null);
  };

  // --- Functions to update state ---
  const handleAddTransaction = (newTx: Transaction) => {
    const updatedTxs = [newTx, ...transactions];
    setTransactions(updatedTxs);
    persistState(items, customers, suppliers, updatedTxs, config);
  };

  const handleCompleteInvoiceSave = (
    newTx: Transaction,
    stockChanges: { itemId: string; newStock: number }[],
    partyBalanceChange?: { partyType: 'customer' | 'supplier'; partyId: string; amountChange: number }
  ) => {
    const updatedTxs = [newTx, ...transactions];
    setTransactions(updatedTxs);

    let updatedItems = [...items];
    if (stockChanges && stockChanges.length > 0) {
      const stockMap = new Map(stockChanges.map((sc) => [sc.itemId, sc.newStock]));
      updatedItems = items.map((it) => {
        if (stockMap.has(it.id)) {
          return { ...it, stock: stockMap.get(it.id)! };
        }
        return it;
      });
      setItems(updatedItems);
    }

    let updatedCustomers = [...customers];
    let updatedSuppliers = [...suppliers];
    if (partyBalanceChange) {
      const { partyType, partyId, amountChange } = partyBalanceChange;
      if (partyType === 'customer') {
        updatedCustomers = customers.map((c) => {
          if (c.id === partyId) {
            return { ...c, balance: c.balance + amountChange };
          }
          return c;
        });
        setCustomers(updatedCustomers);
      } else {
        updatedSuppliers = suppliers.map((s) => {
          if (s.id === partyId) {
            return { ...s, balance: s.balance + amountChange };
          }
          return s;
        });
        setSuppliers(updatedSuppliers);
      }
    }

    persistState(updatedItems, updatedCustomers, updatedSuppliers, updatedTxs, config);
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

  const handleAddItem = (it: Omit<Item, 'id'>) => {
    const itemWithId = { ...it, id: `item-${Date.now()}` };
    const updatedItems = [...items, itemWithId];
    setItems(updatedItems);
    persistState(updatedItems, customers, suppliers, transactions, config);
    return itemWithId;
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

    const cost = parseFloat(newItemCost) || 0;
    const price = parseFloat(newItemPrice) || 0;
    const initialStock = parseFloat(newItemStock) || 0;

    if (cost > price) {
      alert('عذراً! لا يمكن الحفظ لأن سعر الشراء (رأس المال) أعلى من سعر البيع المقترح (المبيع)، مما يعني حدوث خسارة على هذا الصنف. يرجى تعديل الأسعار أولاً لتجنب تسجيل خسائر.');
      return;
    }

    handleAddItem({
      code: newItemCode,
      name: newItemName,
      stock: initialStock,
      unit: newItemUnit,
      unitCost: cost,
      salePrice: price,
      currency: config.currency,
      lastPurchasePrice: cost
    });

    // Reset fields
    setNewItemName('');
    setNewItemCode('');
    setNewItemCost('');
    setNewItemPrice('');
    setNewItemUnit('حبة');
    setNewItemStock('');
    setActiveModal(null);
    alert('تمت إضافة الصنف بنجاح!');
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
  const handleResetSystem = async () => {
    const confirm = (window as any).customConfirm
      ? await (window as any).customConfirm('تحذير شديد: هل أنت متأكد من مسح جميع الفواتير والمواد والحسابات والبدء ببرنامج فارغ؟ لا يمكن التراجع عن هذا الإجراء.', 'تصفير بيانات النظام')
      : window.confirm('تحذير شديد: هل أنت متأكد من مسح جميع الفواتير والمواد والحسابات والبدء ببرنامج فارغ؟ لا يمكن التراجع عن هذا الإجراء.');
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
            onOpenAddModal={(prefillName) => {
              if (prefillName && typeof prefillName === 'string') {
                setNewItemName(prefillName);
              } else {
                setNewItemName('');
              }
              // Generate new code automatically
              const nextCode = items.length > 0 
                ? (Math.max(...items.map(it => parseInt(it.code) || 0)) + 1).toString()
                : '101';
              setNewItemCode(nextCode);
              setNewItemCost('');
              setNewItemPrice('');
              setNewItemUnit('حبة');
              setNewItemStock('');
              setActiveModal('item');
            }}
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
            onSaveInvoice={handleCompleteInvoiceSave}
            onAddItem={handleAddItem}
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
            onSaveInvoice={handleCompleteInvoiceSave}
            onAddItem={handleAddItem}
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

      case 'pwa_install':
        return (
          <PWAInstallView 
            appUrl="https://ais-pre-53r6c57liz46ey3f5ap5qv-162818379984.europe-west2.run.app" 
            onBack={() => setActiveTab('dashboard')}
            deferredPrompt={deferredPrompt}
            onInstallSuccess={() => setDeferredPrompt(null)}
          />
        );

      default:
        return <div className="text-center py-12 text-gray-400">تحت التطوير...</div>;
    }
  };

  return (
    <div dir="rtl" className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Floating PWA Install Notification Prompt */}
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -80 }}
            animate={{ opacity: 1, y: 16 }}
            exit={{ opacity: 0, y: -80 }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            className="fixed top-0 left-4 right-4 md:left-auto md:right-6 md:w-[380px] bg-gradient-to-l from-[#01875f] to-teal-800 text-white rounded-2xl shadow-2xl p-4 border border-emerald-400/20 z-[9999] flex flex-col gap-3"
          >
            <div className="flex items-start gap-3">
              <div className="bg-white/10 p-2.5 rounded-xl shrink-0 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-emerald-200" />
              </div>
              <div className="flex-1 space-y-0.5">
                <h4 className="font-bold text-xs">تثبيت تطبيق بيبرس للمحاسبة</h4>
                <p className="text-[10px] text-emerald-100/90 leading-relaxed font-medium">
                  ثبت التطبيق الآن على شاشة هاتفك الرئيسية للوصول السريع ومتابعة عملك في أي وقت وبدون إنترنت!
                </p>
              </div>
              <button
                onClick={() => {
                  setShowInstallPrompt(false);
                  localStorage.setItem('pwa_prompt_dismissed', 'true');
                }}
                className="p-1 hover:bg-white/10 rounded-lg text-emerald-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex justify-end gap-2 text-xs font-black">
              <button
                onClick={() => {
                  setShowInstallPrompt(false);
                  localStorage.setItem('pwa_prompt_dismissed', 'true');
                }}
                className="px-3.5 py-2 bg-transparent text-emerald-100 hover:text-white transition-colors cursor-pointer"
              >
                لاحقاً
              </button>
              <button
                onClick={async () => {
                  setShowInstallPrompt(false);
                  const isInIframe = window.self !== window.top;
                  
                  if (isInIframe) {
                    localStorage.setItem('trigger_pwa_install_on_load', 'true');
                    const currentUrl = window.location.href;
                    const newTab = window.open(currentUrl, '_blank');
                    if (!newTab) {
                      try {
                        window.top!.location.href = currentUrl;
                      } catch (err) {
                        window.location.href = currentUrl;
                      }
                    }
                    return;
                  }

                  if (deferredPrompt) {
                    try {
                      deferredPrompt.prompt();
                      const { outcome } = await deferredPrompt.userChoice;
                      if (outcome === 'accepted') {
                        setDeferredPrompt(null);
                      }
                    } catch (err) {
                      console.error('Programmatic PWA installation failed:', err);
                      setActiveTab('pwa_install');
                    }
                  } else {
                    setActiveTab('pwa_install');
                  }
                }}
                className="px-4 py-2 bg-white text-[#01875f] hover:bg-emerald-50 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>تثبيت الآن</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={(type) => setActiveModal(type)}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={async () => {
          const confirmOut = (window as any).customConfirm
            ? await (window as any).customConfirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟', 'تسجيل الخروج')
            : window.confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟');
          if (!confirmOut) return;
          
          localStorage.removeItem('current_user');
          setCurrentUser(null);
          window.alert('تم تسجيل الخروج بنجاح.');
        }}
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
              <h1 className="font-bold text-lg tracking-wide hidden sm:block">بيبرس للمحاسبة</h1>
              {currentUser && (
                <span className="hidden md:inline-block bg-white/10 text-emerald-100 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/10">
                  {currentUser.companyName}
                </span>
              )}
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

            {/* Supabase Sync Status Indicator */}
            {currentUser && isSupabaseMode && (
              <div 
                title="حالة المزامنة السحابية مع Supabase"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                  syncStatus === 'syncing' ? 'bg-amber-500/15 border-amber-500/25 text-amber-300 animate-pulse' :
                  syncStatus === 'success' ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300' :
                  syncStatus === 'error' ? 'bg-rose-500/15 border-rose-500/25 text-rose-300' :
                  'bg-white/10 border-white/15 text-emerald-200'
                }`}
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-400" />
                    <span className="hidden lg:inline">جاري المزامنة...</span>
                  </>
                ) : syncStatus === 'success' ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="hidden lg:inline">تم الحفظ سحابياً</span>
                  </>
                ) : syncStatus === 'error' ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                    <span className="hidden lg:inline">خطأ بالمزامنة</span>
                  </>
                ) : (
                  <>
                    <Cloud className="h-3.5 w-3.5 text-emerald-300" />
                    <span className="hidden lg:inline">سحابي متصل</span>
                  </>
                )}
              </div>
            )}

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
                  <CustomSelect
                    id="modal-item-unit-select"
                    value={newItemUnit}
                    onChange={(val) => setNewItemUnit(val)}
                    options={UNIT_OPTIONS}
                  />
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
                    value={newItemCost}
                    onChange={(e) => setNewItemCost(e.target.value)}
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
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">العدد (الكمية الابتدائية المتوفرة)</label>
                <input
                  id="modal-item-stock-input"
                  type="number"
                  min="0"
                  placeholder="مثال: 0 أو 10 أو 100"
                  value={newItemStock}
                  onChange={(e) => setNewItemStock(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-bold"
                />
              </div>

              <div className="bg-emerald-50 text-emerald-800 text-[10px] p-3 rounded-xl border border-emerald-100 leading-relaxed">
                * ملاحظة: يمكنك تعيين كمية ابتدائية (العدد) مباشرة الآن، أو تعديلها وزيادتها لاحقاً عبر <strong>فاتورة مشتريات</strong> ترحيلية أو من خلال شاشة <strong>جرد البضائع</strong>.
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

                handleCompleteInvoiceSave(returnTx, [{ itemId, newStock: item.stock + stockChange }]);
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

      {/* Custom Beautified Notification Alert Modal */}
      {alertConfig && alertConfig.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200" dir="rtl">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-250 flex flex-col items-center">
            {/* Visual Icon Header depending on type */}
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
              alertConfig.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
              alertConfig.type === 'error' ? 'bg-rose-50 text-rose-600' :
              alertConfig.type === 'warning' ? 'bg-amber-50 text-amber-600' :
              'bg-teal-50 text-teal-600'
            }`}>
              {alertConfig.type === 'success' && <CheckCircle2 className="h-7 w-7" />}
              {alertConfig.type === 'error' && <XCircle className="h-7 w-7" />}
              {alertConfig.type === 'warning' && <AlertTriangle className="h-7 w-7" />}
              {alertConfig.type === 'info' && <Info className="h-7 w-7" />}
            </div>

            {/* Title */}
            <h3 className="font-black text-sm text-slate-800 mb-2">
              {alertConfig.title}
            </h3>

            {/* Message Body */}
            <p className="text-xs font-bold text-slate-600 leading-relaxed mb-6 whitespace-pre-line text-center max-w-[280px]">
              {alertConfig.message}
            </p>

            {/* Action/Dismiss Button */}
            <button
              type="button"
              onClick={handleCloseAlert}
              className={`w-full py-3 px-5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md select-none active:scale-98 ${
                alertConfig.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100' :
                alertConfig.type === 'error' ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-100' :
                alertConfig.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100' :
                'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-100'
              }`}
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}

      {/* Custom Beautified Confirmation Modal */}
      {confirmConfig && confirmConfig.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200" dir="rtl">
          <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-250 flex flex-col items-center">
            {/* Visual Warning Icon */}
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
              <AlertTriangle className="h-7 w-7" />
            </div>

            {/* Title */}
            <h3 className="font-black text-sm text-slate-800 mb-2">
              {confirmConfig.title}
            </h3>

            {/* Message Body */}
            <p className="text-xs font-bold text-slate-600 leading-relaxed mb-6 whitespace-pre-line text-center max-w-[280px]">
              {confirmConfig.message}
            </p>

            {/* Actions: Confirm / Cancel Buttons */}
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => confirmConfig.resolve?.(true)}
                className="flex-1 py-3 px-5 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-100 transition-all cursor-pointer select-none active:scale-98"
              >
                حسناً، متابعة
              </button>
              <button
                type="button"
                onClick={() => confirmConfig.resolve?.(false)}
                className="flex-1 py-3 px-5 rounded-xl text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer select-none active:scale-98"
              >
                إلغاء الإجراء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal for Optional Account creation and login */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={async (user) => {
          localStorage.setItem('current_user', JSON.stringify(user));
          setCurrentUser(user);
          
          // Dynamically check if Supabase is configured
          try {
            const { isSupabaseConfigured, dbSyncDownAllData, dbSyncUpAllData } = await import('./lib/supabase');
            if (isSupabaseConfigured()) {
              setSyncStatus('syncing');
              const res = await dbSyncDownAllData(user.email);
              if (res.success && res.data) {
                const hasCloudData = res.data.items.length > 0 || res.data.transactions.length > 0;
                if (hasCloudData) {
                  setSyncStatus('idle');
                  // Use window.customConfirm to prompt the user
                  const confirmPull = (window as any).customConfirm
                    ? await (window as any).customConfirm('تم العثور على نسخة احتياطية سحابية لبياناتك المحاسبية. هل ترغب في تنزيلها ومزامنتها مع هذا الجهاز الآن؟\n\nتنبيه: هذا الإجراء سيقوم باستبدال أي بيانات محلية حالية بالبيانات السحابية.', 'مزامنة وتنزيل البيانات السحابية')
                    : window.confirm('تم العثور على بيانات سحابية. هل ترغب في تنزيلها؟');
                  
                  if (confirmPull) {
                    setItems(res.data.items);
                    setCustomers(res.data.customers);
                    setSuppliers(res.data.suppliers);
                    setTransactions(res.data.transactions);
                    
                    // Persist to local storage
                    saveAllStates({
                      items: res.data.items,
                      customers: res.data.customers,
                      suppliers: res.data.suppliers,
                      transactions: res.data.transactions,
                      config: config
                    });
                    
                    setSyncStatus('success');
                    window.alert('تمت مزامنة وتنزيل البيانات السحابية بنجاح على هذا الجهاز.');
                    setTimeout(() => setSyncStatus('idle'), 3000);
                  }
                } else {
                  // If no cloud data exists, offer to upload local state to secure their current offline records
                  setSyncStatus('idle');
                  const confirmPush = (window as any).customConfirm
                    ? await (window as any).customConfirm('حسابك السحابي الجديد فارغ حالياً من أي بيانات محاسبية.\n\nهل ترغب في رفع ونسخ بياناتك المحلية الحالية لتأمينها سحابياً وتسهيل الوصول إليها من أي جهاز آخر؟', 'رفع نسخة احتياطية سحابية')
                    : window.confirm('هل ترغب في رفع وتأمين بياناتك المحلية الحالية؟');
                  
                  if (confirmPush) {
                    setSyncStatus('syncing');
                    const uploadRes = await dbSyncUpAllData(
                      user.email,
                      items,
                      customers,
                      suppliers,
                      transactions
                    );
                    if (uploadRes.success) {
                      setSyncStatus('success');
                      window.alert('تم رفع وتأمين بياناتك المحلية سحابياً بنجاح على Supabase!');
                      setTimeout(() => setSyncStatus('idle'), 3000);
                    } else {
                      setSyncStatus('error');
                      window.alert('فشل في رفع البيانات السحابية: ' + uploadRes.message);
                    }
                  }
                }
              } else {
                setSyncStatus('idle');
              }
            }
          } catch (err) {
            console.error('Error during Supabase login sync:', err);
            setSyncStatus('error');
          }
        }}
      />
    </div>
  );
}
