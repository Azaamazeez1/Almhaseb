import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  Building2,
  User,
  MapPin,
  CheckCircle2,
  LogIn,
  UserPlus,
  Phone,
  Loader2
} from 'lucide-react';
import { UserAccount } from '../types';
import { isSupabaseConfigured, dbSaveUserAccount, dbGetUserAccount } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [countryRegion, setCountryRegion] = useState('');
  const [phone, setPhone] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email || !password) {
      setError('يرجى ملء جميع الحقول المطلوبة.');
      setLoading(false);
      return;
    }

    try {
      if (isSupabaseConfigured()) {
        const { supabase } = await import('../lib/supabase');
        if (supabase) {
          // Attempt login via Supabase Auth
          const { data, error: authError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
          });

          if (authError) {
            // Check if user is registered in local storage as a fallback
            const usersRaw = localStorage.getItem('registered_users');
            const users = usersRaw ? JSON.parse(usersRaw) : [];
            const matchedUser = users.find(
              (u: any) => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password
            );

            if (matchedUser) {
              setSuccess('تم تسجيل الدخول محلياً بنجاح! (الوضع السحابي غير متصل)');
              setTimeout(() => {
                onLoginSuccess({
                  email: matchedUser.email,
                  fullName: matchedUser.fullName,
                  companyName: matchedUser.companyName,
                  countryRegion: matchedUser.countryRegion,
                  phone: matchedUser.phone
                });
                onClose();
                resetForm();
              }, 1200);
              return;
            }

            setError(`فشل تسجيل الدخول السحابي: ${authError.message}`);
            setLoading(false);
            return;
          }

          // Fetch account details from db profile
          const profile = await dbGetUserAccount(email);
          if (profile) {
            setSuccess('تم تسجيل الدخول السحابي بنجاح! مرحباً بك.');
            setTimeout(() => {
              onLoginSuccess(profile);
              onClose();
              resetForm();
            }, 1200);
            return;
          } else {
            // Profile entry missing in user_accounts, create it
            const fallbackProfile: UserAccount = {
              email: email.trim(),
              fullName: data.user?.email?.split('@')[0] || 'مستخدم سحابي',
              companyName: 'مؤسسة سحابية',
              countryRegion: 'غير محدد',
              phone: ''
            };
            await dbSaveUserAccount(fallbackProfile);
            setSuccess('تم تسجيل الدخول السحابي بنجاح!');
            setTimeout(() => {
              onLoginSuccess(fallbackProfile);
              onClose();
              resetForm();
            }, 1200);
            return;
          }
        }
      }

      // Local storage fallback (standard flow)
      const usersRaw = localStorage.getItem('registered_users');
      const users = usersRaw ? JSON.parse(usersRaw) : [];
      const matchedUser = users.find(
        (u: any) => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password
      );

      if (matchedUser) {
        setSuccess('تم تسجيل الدخول بنجاح! مرحباً بك.');
        setTimeout(() => {
          onLoginSuccess({
            email: matchedUser.email,
            fullName: matchedUser.fullName,
            companyName: matchedUser.companyName,
            countryRegion: matchedUser.countryRegion,
            phone: matchedUser.phone
          });
          onClose();
          resetForm();
        }, 1200);
      } else {
        if (email.toLowerCase().trim() === 'demo@aziz.com' && password === '123456') {
          const demoUser: UserAccount = {
            email: 'demo@aziz.com',
            fullName: 'العزيز للمحاسبة ديمو',
            companyName: 'مؤسسة العزيز التجارية',
            countryRegion: 'اليمن - صنعاء',
            phone: '775215158'
          };
          setSuccess('تم تسجيل الدخول بحساب تجريبي بنجاح!');
          setTimeout(() => {
            onLoginSuccess(demoUser);
            onClose();
            resetForm();
          }, 1200);
        } else {
          setError('عذراً، البريد الإلكتروني أو كلمة المرور غير صحيحة.');
        }
      }
    } catch (err: any) {
      setError(`حدث خطأ أثناء الاتصال: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email || !password || !confirmPassword || !fullName || !companyName || !countryRegion || !phone) {
      setError('يرجى ملء كافة الحقول المطلوبة لإنشاء الحساب.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('يجب أن لا تقل كلمة المرور عن 6 أحرف.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمة المرور وتأكيدها غير متطابقين.');
      setLoading(false);
      return;
    }

    try {
      if (isSupabaseConfigured()) {
        const { supabase } = await import('../lib/supabase');
        if (supabase) {
          // Register with Supabase Auth
          const { data, error: authError } = await supabase.auth.signUp({
            email: email.trim(),
            password: password
          });

          if (authError) {
            setError(`فشل التسجيل السحابي: ${authError.message}`);
            setLoading(false);
            return;
          }

          // Save profile to public.user_accounts table
          const profile: UserAccount = {
            email: email.trim(),
            fullName: fullName.trim(),
            companyName: companyName.trim(),
            countryRegion: countryRegion.trim(),
            phone: phone.trim()
          };

          const saved = await dbSaveUserAccount(profile);
          if (!saved) {
            setError('فشل حفظ معلومات الحساب في قاعدة البيانات السحابية.');
            setLoading(false);
            return;
          }

          setSuccess('تم إنشاء حسابك السحابي بنجاح! جاري الدخول...');
          setTimeout(() => {
            onLoginSuccess(profile);
            onClose();
            resetForm();
          }, 1500);
          return;
        }
      }

      // Local storage fallback
      const usersRaw = localStorage.getItem('registered_users');
      const users = usersRaw ? JSON.parse(usersRaw) : [];
      
      const userExists = users.some((u: any) => u.email.toLowerCase() === email.toLowerCase().trim());
      if (userExists) {
        setError('هذا البريد الإلكتروني مسجل مسبقاً لدينا.');
        setLoading(false);
        return;
      }

      const newAccount = {
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        countryRegion: countryRegion.trim(),
        phone: phone.trim()
      };

      users.push(newAccount);
      localStorage.setItem('registered_users', JSON.stringify(users));

      setSuccess('تم إنشاء حسابك الجديد بنجاح! جاري تسجيل الدخول...');
      
      setTimeout(() => {
        onLoginSuccess({
          email: newAccount.email,
          fullName: newAccount.fullName,
          companyName: newAccount.companyName,
          countryRegion: newAccount.countryRegion,
          phone: newAccount.phone
        });
        onClose();
        resetForm();
      }, 1500);
    } catch (err: any) {
      setError(`حدث خطأ أثناء إنشاء الحساب: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setCompanyName('');
    setFullName('');
    setCountryRegion('');
    setPhone('');
    setError('');
    setSuccess('');
    setLoading(false);
  };


  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-3 overflow-y-auto animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white rounded-2xl max-w-[370px] sm:max-w-[420px] w-full p-5 sm:p-6 shadow-2xl border border-slate-100 relative text-right flex flex-col my-auto animate-in fade-in zoom-in-95 duration-250">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-4 mt-1">
          <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-xl flex items-center justify-center mx-auto mb-2 shadow-md shadow-emerald-100">
            {isRegister ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
          </div>
          <h2 className="font-black text-lg text-slate-800">
            {isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
          </h2>
          <p className="text-[10px] text-slate-500 font-bold mt-0.5 max-w-[280px] mx-auto leading-relaxed">
            {isRegister 
              ? 'سجل حسابك لتخصيص بيانات مؤسستك وحفظها بشكل متكامل' 
              : 'سجل دخولك للوصول إلى نظام العزيز المحاسبي وإدارة عملياتك'}
          </p>
        </div>

        {/* Success/Error Alerts */}
        {error && (
          <div className="mb-3.5 p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-[11px] font-bold text-rose-600 text-center animate-in slide-in-from-top-2">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3.5 p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-[11px] font-bold text-emerald-600 text-center flex items-center justify-center gap-1.5 animate-in slide-in-from-top-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 animate-bounce" />
            <span>{success}</span>
          </div>
        )}

        {/* Forms */}
        <form onSubmit={isRegister ? handleRegisterSubmit : handleLoginSubmit} className="space-y-2.5">
          
          {/* Email input - required always */}
          <div>
            <label className="block text-[11px] font-black text-slate-700 mb-1">البريد الإلكتروني <span className="text-rose-500">*</span></label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                <Mail className="h-3.5 w-3.5" />
              </span>
              <input
                type="email"
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full pl-3 pr-9 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-xs font-bold bg-slate-50/50 outline-none transition-all placeholder:text-slate-300 disabled:opacity-70"
                required
              />
            </div>
          </div>

          {/* Password input - required always */}
          <div>
            <label className="block text-[11px] font-black text-slate-700 mb-1">كلمة السر <span className="text-rose-500">*</span></label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                <Lock className="h-3.5 w-3.5" />
              </span>
              <input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-3 pr-9 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-xs font-bold bg-slate-50/50 outline-none transition-all placeholder:text-slate-300 disabled:opacity-70"
                required
              />
            </div>
          </div>

          {/* Registration specific fields */}
          {isRegister && (
            <>
              {/* Confirm Password */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">تأكيد كلمة السر <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="password"
                    placeholder="••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className="w-full pl-3 pr-9 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-xs font-bold bg-slate-50/50 outline-none transition-all placeholder:text-slate-300 disabled:opacity-70"
                    required
                  />
                </div>
              </div>

              {/* Full Name (اسم الشخص الثلاثي) */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">اسم الشخص الثلاثي <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="محمد علي أحمد"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    className="w-full pl-3 pr-9 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-xs font-bold bg-slate-50/50 outline-none transition-all placeholder:text-slate-300 disabled:opacity-70"
                    required
                  />
                </div>
              </div>

              {/* Company Name (اسم الشركة) */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">اسم الشركة <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                    <Building2 className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="شركة العزيز المحدودة"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={loading}
                    className="w-full pl-3 pr-9 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-xs font-bold bg-slate-50/50 outline-none transition-all placeholder:text-slate-300 disabled:opacity-70"
                    required
                  />
                </div>
              </div>

              {/* Country and Area (خانة لكتابة البلد والمنطقة) */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">البلد والمنطقة <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="اليمن - صنعاء"
                    value={countryRegion}
                    onChange={(e) => setCountryRegion(e.target.value)}
                    disabled={loading}
                    className="w-full pl-3 pr-9 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-xs font-bold bg-slate-50/50 outline-none transition-all placeholder:text-slate-300 disabled:opacity-70"
                    required
                  />
                </div>
              </div>

              {/* Phone Number (رقم الهاتف) */}
              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">رقم الهاتف <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                    <Phone className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="tel"
                    placeholder="775215158"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    className="w-full pl-3 pr-9 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-xs font-bold bg-slate-50/50 outline-none transition-all placeholder:text-slate-300 disabled:opacity-70"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-lg text-xs font-black shadow-md shadow-emerald-100 hover:opacity-95 active:scale-98 transition-all cursor-pointer select-none mt-3 flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{isRegister ? 'تسجيل وإنشاء الحساب' : 'تسجيل الدخول'}</span>
          </button>
        </form>

        {/* Toggle between Register & Login */}
        <div className="mt-4 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500 font-bold">
            {isRegister ? 'هل لديك حساب بالفعل؟' : 'ليس لديك حساب حتى الآن؟'}
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
                setSuccess('');
              }}
              className="text-emerald-600 hover:text-emerald-700 font-black mr-1.5 underline cursor-pointer focus:outline-none disabled:opacity-50"
            >
              {isRegister ? 'تسجيل الدخول هنا' : 'إنشاء حساب جديد'}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
