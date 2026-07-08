import React from 'react';
import {
  FileText,
  ShoppingCart,
  Users,
  Truck,
  Wallet,
  TrendingUp,
  Settings,
  HelpCircle,
  PlusCircle,
  FolderPlus,
  Briefcase,
  Layers,
  X,
  Phone,
  Mail,
  User,
  LogOut,
  LogIn,
  MapPin,
  Building2,
  Smartphone,
  Cloud
} from 'lucide-react';
import { UserAccount } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAddModal: (type: 'item' | 'customer' | 'supplier' | 'voucher_in' | 'voucher_out') => void;
  currentUser: UserAccount | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  onOpenAddModal,
  currentUser,
  onOpenAuthModal,
  onLogout
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'الرئيسية والصندوق', icon: Wallet },
    { id: 'sales', label: 'المبيعات الفورية', icon: FileText },
    { id: 'purchases', label: 'المشتريات والتوريد', icon: ShoppingCart },
    { id: 'inventory', label: 'المخزون وجرد البضائع', icon: Layers },
    { id: 'customers', label: 'إدارة العملاء', icon: Users },
    { id: 'suppliers', label: 'إدارة الموردين', icon: Truck },
    { id: 'reports', label: 'الإيرادات والمصروفات والصافي', icon: TrendingUp },
    { id: 'balance_sheet', label: 'الميزانية العمومية والمركز المالي', icon: Briefcase },
    { id: 'pwa_install', label: 'تثبيت التطبيق (APK)', icon: Smartphone },
  ];

  const quickActions = [
    { label: 'إضافة صنف جديد', icon: FolderPlus, action: () => onOpenAddModal('item') },
    { label: 'إضافة عميل جديد', icon: PlusCircle, action: () => onOpenAddModal('customer') },
    { label: 'إضافة مورد جديد', icon: PlusCircle, action: () => onOpenAddModal('supplier') },
  ];

  return (
    <>
      {/* Backdrop for mobile drawer */}
      {isOpen && (
        <div
          id="sidebar-backdrop"
          className="fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        id="app-sidebar"
        dir="rtl"
        className={`fixed top-0 right-0 z-50 h-full w-80 bg-white shadow-2xl border-l border-emerald-100 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-0 lg:shadow-none
          ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}
      >
        {/* Sidebar Header resembling the green branding from screen 1 */}
        <div className="bg-gradient-to-br from-emerald-700 via-teal-800 to-emerald-950 text-white p-6 relative flex flex-col justify-between overflow-hidden">
          {/* Close button for mobile */}
          <button
            id="close-sidebar-btn"
            onClick={onClose}
            className="absolute top-4 left-4 p-1 hover:bg-white/15 rounded-full lg:hidden"
          >
            <X className="h-5 w-5 text-white" />
          </button>

          {/* Sparkles / graphic lines inside header */}
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>

          <div className="flex items-center gap-3 mb-4 mt-2">
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/20 backdrop-blur-sm">
              <Layers className="h-7 w-7 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-bold text-xl tracking-tight">بيبرس للمحاسبة</h2>
              <p className="text-xs text-emerald-200 truncate max-w-[170px]">
                {currentUser ? currentUser.companyName : 'نظام إدارة الحسابات وجرد المخازن'}
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-3 text-xs text-emerald-100/90 space-y-1.5">
            <a 
              href="https://wa.me/963981854442" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-2 hover:text-emerald-300 transition-colors duration-150 cursor-pointer"
              title="تواصل معنا عبر واتساب"
            >
              <Phone className="h-3 w-3 text-emerald-300" />
              <span>+963 981 854 442</span>
            </a>
          </div>
        </div>

        {/* Sidebar Body */}
        <div className="h-[calc(100%-165px)] overflow-y-auto p-4 space-y-6 scrollbar-thin">
          
          {/* Optional User Profile / Calm Authentication Card */}
          <div className="animate-in fade-in duration-300">
            {currentUser ? (
              // Logged In Status Card (Gorgeously styled)
              <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border border-emerald-100 rounded-2xl p-4 shadow-xs relative overflow-hidden">
                <div className="absolute -left-4 -bottom-4 w-12 h-12 bg-emerald-500/5 rounded-full blur-xl"></div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    <Cloud className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-slate-800 truncate">
                      {currentUser.fullName}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 truncate flex items-center gap-1">
                      <Smartphone className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
                      <span>{currentUser.email.split('@')[0]}</span>
                    </p>
                    <p className="text-[9px] font-semibold text-teal-600 truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                      <span>تخزين سحابي مباشر</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-emerald-100/60 mt-3 pt-2.5">
                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                    مزامنة تلقائية نشطة
                  </span>
                  <button
                    onClick={onOpenAuthModal}
                    className="text-[10px] font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-emerald-100 shadow-2xs"
                  >
                    <span>تفاصيل السحابة</span>
                  </button>
                </div>
              </div>
            ) : (
              // Calm, welcoming logged-out card (with Option to register or login)
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-right shadow-xs relative overflow-hidden">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-100 rounded-xl text-slate-400 shrink-0">
                    <Cloud className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                      حفظ وسحابي تلقائي
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 leading-normal">
                      مزامنة تلقائية ومباشرة على السحابة لحفظ فواتيرك وحساباتك بأمان تام.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="w-full mt-3.5 py-2 px-4 bg-white hover:bg-slate-50 text-emerald-700 hover:text-emerald-800 border border-emerald-100 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-98 flex items-center justify-center gap-1.5 select-none"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>تفاصيل النسخ السحابي للجهاز</span>
                </button>
              </div>
            )}
          </div>

          {/* Main Navigation */}
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-3 px-3">
              القائمة الرئيسية
            </span>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    id={`sidebar-nav-${item.id}`}
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      onClose(); // Close mobile drawer
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200
                      ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 shadow-sm border-r-4 border-emerald-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Setup / Fast additions */}
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-3 px-3">
              إضافة سريعة وتهيئة
            </span>
            <div className="space-y-1">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <button
                    id={`sidebar-quick-action-${idx}`}
                    key={idx}
                    onClick={() => {
                      action.action();
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-emerald-700 transition-colors"
                  >
                    <Icon className="h-4 w-4 text-emerald-500" />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Short description card resembling "شرح مختصر" */}
          <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100/60 text-right">
            <div className="flex items-center gap-2 mb-2 text-emerald-800">
              <HelpCircle className="h-4 w-4 shrink-0" />
              <h4 className="font-semibold text-sm">إرشاد سريع لجرد المخازن</h4>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              لحساب الأرباح بدقة، تأكد من تسجيل أسعار التكلفة للسلع. يقوم البرنامج تلقائياً بإنقاص أو زيادة المخزون عند إصدار الفواتير أو تسجيل المرتجعات.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="h-10 border-t border-gray-100 flex items-center justify-center px-4 bg-gray-50">
          <p className="text-[10px] text-gray-400 text-center">
            إصدار الويب المحترف ٢٠٢٦ © كل الحقوق محفوظة
          </p>
        </div>
      </aside>
    </>
  );
}
