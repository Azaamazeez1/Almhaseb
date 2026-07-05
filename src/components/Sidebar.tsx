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
  Mail
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAddModal: (type: 'item' | 'customer' | 'supplier' | 'voucher_in' | 'voucher_out') => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  onOpenAddModal
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
              <h2 className="font-bold text-xl tracking-tight">العزيز للمحاسبة</h2>
              <p className="text-xs text-emerald-200">نظام إدارة الحسابات وجرد المخازن</p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-3 text-xs text-emerald-100/90 space-y-1.5">
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3 text-emerald-300" />
              <span>+967 775215158</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3 text-emerald-300" />
              <span>almohaseb.jw@gmail.com</span>
            </div>
          </div>
        </div>

        {/* Sidebar Body */}
        <div className="h-[calc(100%-165px)] overflow-y-auto p-4 space-y-6 scrollbar-thin">
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
