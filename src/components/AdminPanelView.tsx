import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Phone, 
  Building2, 
  Mail, 
  RefreshCw, 
  ShieldCheck, 
  ChevronLeft, 
  X,
  MapPin
} from 'lucide-react';
import { UserAccount } from '../types';
import { dbGetAllUserAccounts, isSupabaseConfigured } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminPanelView() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const data = await dbGetAllUserAccounts();
        setUsers(data);
      } else {
        // Fallback for mock/local testing if Supabase is offline
        const mockUsers: UserAccount[] = JSON.parse(localStorage.getItem('mock_admin_users') || '[]');
        if (mockUsers.length === 0) {
          const defaultMock = [
            { email: 'demo@baibars.com', fullName: 'علي محمد حسن', companyName: 'سوبرماركت الهناء', phone: '777111222', countryRegion: 'اليمن' },
            { email: 'admin@baibars.com', fullName: 'admn fade', companyName: 'شركة بيبرس للبرمجيات', phone: '777333444', countryRegion: 'سوريا' },
          ];
          localStorage.setItem('mock_admin_users', JSON.stringify(defaultMock));
          setUsers(defaultMock);
        } else {
          setUsers(mockUsers);
        }
      }
    } catch (err) {
      console.error('Failed to load registered users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (user.fullName || '').toLowerCase().includes(q) ||
      (user.email || '').toLowerCase().includes(q) ||
      (user.companyName || '').toLowerCase().includes(q) ||
      (user.phone || '').includes(q)
    );
  });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 font-bold mb-1">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg md:text-xl font-black">أداة إدارة المسؤول</h2>
          </div>
          <p className="text-xs text-gray-500">مراقبة وعرض حسابات المستخدمين النشطين والمسجلين في تطبيق بيبرس للمحاسبة</p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs active:scale-98 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث القائمة</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-400 block">إجمالي المسجلين</span>
            <span className="text-xl font-black text-slate-800">{users.length} مستخدم</span>
          </div>
        </div>

        <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-400 block">الشركات / المحلات</span>
            <span className="text-xl font-black text-slate-800">
              {users.filter(u => u.companyName && !u.companyName.includes('جهاز محاسبي')).length} شركة
            </span>
          </div>
        </div>

        <div className="bg-white p-5 border border-slate-100 rounded-2xl shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Phone className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-400 block">الهواتف المؤكدة</span>
            <span className="text-xl font-black text-slate-800">
              {users.filter(u => u.phone && u.phone.trim().length > 5).length} رقم هاتف
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 border border-slate-100 rounded-2xl shadow-2xs mb-6">
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="البحث باسم المسجل، البريد الإلكتروني، اسم الشركة، أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-slate-800"
          />
        </div>
      </div>

      {/* Users Table / Grid */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mb-3" />
            <span className="text-xs font-semibold text-gray-500">جاري تحميل قائمة المسجلين من السحابة...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20 px-4">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-sm mb-1">لا توجد نتائج بحث مطابقة</h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">تأكد من كتابة الاسم أو البريد بشكل صحيح أو تصفح قائمة المستخدمين كاملة.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500">
                  <th className="p-4">الاسم الثلاثي الكامل</th>
                  <th className="p-4">اسم الشركة / المحل</th>
                  <th className="p-4">رقم الجوال</th>
                  <th className="p-4">البريد الإلكتروني</th>
                  <th className="p-4 text-left">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr 
                    key={user.email}
                    onClick={() => setSelectedUser(user)}
                    className="hover:bg-slate-50/50 transition-colors duration-150 cursor-pointer text-xs"
                  >
                    <td className="p-4 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-[10px]">
                          {user.fullName ? user.fullName.substring(0, 2) : '؟؟'}
                        </div>
                        <span>{user.fullName || 'غير مدخل'}</span>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-600">{user.companyName || 'غير مدخل'}</td>
                    <td className="p-4 font-mono font-bold text-emerald-700 text-right" dir="ltr">{user.phone || '—'}</td>
                    <td className="p-4 text-slate-500 font-mono text-right" dir="ltr">{user.email}</td>
                    <td className="p-4 text-left">
                      <button className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[10000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-slate-100 relative"
            >
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 left-4 p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-800">تفاصيل الحساب المسجل</h3>
                  <p className="text-[11px] text-emerald-600 font-bold mt-0.5">معلومات مستخدم سحابي نشط</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-gray-400 mb-1">الاسم الثلاثي للمستخدم</span>
                  <span className="font-black text-sm text-slate-800">{selectedUser.fullName || 'غير مدخل'}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-gray-400 mb-1">اسم النشاط التجاري / الشركة</span>
                  <span className="font-black text-sm text-slate-800 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-emerald-600" />
                    {selectedUser.companyName || 'غير مدخل'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-gray-400 mb-1">رقم الهاتف والجوال</span>
                  <span className="font-black text-sm text-emerald-700 font-mono text-right block" dir="ltr">
                    {selectedUser.phone || 'غير مدخل'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-[10px] font-bold text-gray-400 mb-1">البريد الإلكتروني المسجل</span>
                  <span className="font-bold text-xs text-slate-600 font-mono text-right block" dir="ltr">
                    {selectedUser.email}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 mb-0.5">المنطقة والبلد</span>
                    <span className="font-black text-xs text-slate-800">{selectedUser.countryRegion || 'غير محدد'}</span>
                  </div>
                  <div className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded-full flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    مستخدم حقيقي
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="w-full mt-6 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                إغلاق نافذة التفاصيل
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
