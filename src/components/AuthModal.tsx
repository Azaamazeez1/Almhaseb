import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  Download,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Info
} from 'lucide-react';
import { UserAccount } from '../types';
import { isSupabaseConfigured, dbGetUserAccount, dbSaveUserAccount } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [deviceCode, setDeviceCode] = useState('');
  const [restoreCode, setRestoreCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deviceModel, setDeviceModel] = useState('جهاز ذكي');

  // Load current device info
  useEffect(() => {
    // Get device model and browser
    const ua = navigator.userAgent;
    let type = 'جهاز ذكي';
    if (/android/i.test(ua)) {
      if (/samsung/i.test(ua)) type = 'جوال سامسونج';
      else if (/redmi|xiaomi/i.test(ua)) type = 'جوال شاومي';
      else if (/huawei/i.test(ua)) type = 'جوال هواوي';
      else type = 'جوال أندرويد';
    } else if (/iPad|iPhone|iPod/.test(ua)) {
      type = 'جوال آيفون / آيباد';
    } else if (/macintosh/i.test(ua)) {
      type = 'جهاز ماك';
    } else if (/windows/i.test(ua)) {
      type = 'جهاز كمبيوتر (ويندوز)';
    } else if (/linux/i.test(ua)) {
      type = 'جهاز كمبيوتر (لينكس)';
    }
    setDeviceModel(type);

    // Get device backup id
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
      try {
        const u: UserAccount = JSON.parse(savedUser);
        // Extract the code from email e.g. dev-xxx@bibars-cloud.com -> dev-xxx
        const codePart = u.email.split('@')[0];
        setDeviceCode(codePart);
      } catch (e) {
        console.error(e);
      }
    } else {
      const deviceUuid = localStorage.getItem('device_backup_uuid');
      if (deviceUuid) {
        setDeviceCode(`dev-${deviceUuid}`);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(deviceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const formattedCode = restoreCode.trim().toLowerCase();
    if (!formattedCode) {
      setError('الرجاء كتابة رمز النسخ الاحتياطي للجهاز الآخر.');
      return;
    }

    if (formattedCode === deviceCode) {
      setError('عذراً، هذا هو نفس رمز جهازك الحالي.');
      return;
    }

    setLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        setError('قاعدة البيانات السحابية (Supabase) غير متصلة بعد. يرجى تهيئتها أولاً.');
        setLoading(false);
        return;
      }

      // Reconstruct the email for this code
      let targetEmail = formattedCode;
      if (!targetEmail.includes('@')) {
        targetEmail = `${formattedCode}@bibars-cloud.com`;
      }

      // Attempt to fetch profile for that code
      const profile = await dbGetUserAccount(targetEmail);
      if (profile) {
        setSuccess('تم العثور على النسخة الاحتياطية بنجاح! جاري استيراد ومزامنة البيانات...');
        setTimeout(() => {
          onLoginSuccess(profile);
          onClose();
          setRestoreCode('');
          setError('');
          setSuccess('');
          setLoading(false);
        }, 1500);
      } else {
        setError('عذراً، لم يتم العثور على أي نسخة احتياطية سحابية مسجلة بهذا الرمز. يرجى التأكد من كتابة الرمز بشكل صحيح.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(`فشل الاتصال بقاعدة البيانات السحابية: ${err.message || err}`);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-3 overflow-y-auto animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white rounded-[24px] max-w-[420px] w-full p-6 shadow-2xl border border-slate-100 relative text-right flex flex-col my-auto animate-in fade-in zoom-in-95 duration-250">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5 mt-1">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-100">
            <Cloud className="h-6 w-6 animate-pulse" />
          </div>
          <h2 className="font-black text-base text-slate-800">
            النسخ الاحتياطي السحابي التلقائي
          </h2>
          <p className="text-[10px] text-slate-500 font-bold mt-1 max-w-[320px] mx-auto leading-relaxed">
            تم إلغاء شاشات التسجيل والتعقيد! الآن يقوم البرنامج بحفظ ونسخ بياناتك السحابية تلقائياً وبأمان تام استناداً إلى رمز وهوية جهازك الحالي.
          </p>
        </div>

        {/* Success/Error Alerts */}
        {!isSupabaseConfigured() && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-[10px] font-bold text-amber-800 text-right leading-relaxed animate-in slide-in-from-top-2">
            ⚠️ <strong>قاعدة البيانات السحابية (Supabase) غير متصلة بعد.</strong>
            <p className="mt-1 text-amber-700 font-medium">
              يعمل البرنامج الآن محلياً بالكامل على جهازك. لتنشيط المزامنة السحابية والنسخ الاحتياطي التلقائي الفوري، يرجى ضبط مفاتيح Supabase في إعدادات المنصة.
            </p>
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] font-bold text-rose-600 text-center animate-in slide-in-from-top-2">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] font-bold text-emerald-600 text-center flex items-center justify-center gap-1.5 animate-in slide-in-from-top-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 animate-bounce text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Device Information Card */}
        <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border border-emerald-100 rounded-2xl p-4 mb-5 text-right relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 border-b border-emerald-100/50 pb-2.5">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-black text-slate-700">هوية الجهاز الحالي للتخزين:</span>
            </div>
            <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              {deviceModel}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400">رمز النسخ الاحتياطي السحابي الخاص بك:</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 font-mono text-xs font-bold text-slate-700 text-center select-all flex items-center justify-center">
                {deviceCode || 'جاري التوليد...'}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all flex items-center justify-center cursor-pointer active:scale-95"
                title="نسخ رمز الجهاز"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[9px] font-bold text-slate-400 leading-normal mt-1">
              💡 احتفظ بهذا الرمز! يمكنك كتابته في أي هاتف آخر أو متصفح آخر لاسترجاع وتنزيل كافة فواتيرك وحساباتك بنقرة واحدة.
            </p>
          </div>
        </div>

        {/* Restore Backup Section */}
        <div className="border-t border-slate-100 pt-4">
          <h3 className="font-black text-xs text-slate-800 mb-2 flex items-center gap-1.5">
            <Download className="h-4 w-4 text-teal-600" />
            <span>استرجاع نسخة احتياطية من جهاز آخر</span>
          </h3>
          <p className="text-[10px] font-bold text-slate-400 leading-relaxed mb-3">
            هل قمت بتغيير هاتفك أو ترغب بمزامنة البيانات من جهازك السابق؟ اكتب الرمز هنا للبدء:
          </p>

          <form onSubmit={handleRestoreSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="مثال: dev-xxxxxxxxx"
                value={restoreCode}
                onChange={(e) => setRestoreCode(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 text-xs font-mono font-black text-center bg-slate-50 outline-none transition-all placeholder:text-slate-300 placeholder:font-sans disabled:opacity-70"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-100 hover:opacity-95 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span>تأكيد استرجاع البيانات ومزامنتها</span>
            </button>
          </form>
        </div>

        {/* Local Sync Mode Indicator */}
        <div className="mt-4 p-3 bg-emerald-50/50 border border-emerald-100/40 rounded-xl text-[9px] text-emerald-800 font-bold leading-relaxed flex gap-2 items-start text-right">
          <Info className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-900 font-black mb-0.5">مزامنة سحابية مستمرة وتلقائية</p>
            <p className="text-emerald-800/90 font-medium">
              البرنامج يقوم بنسخ كافة العمليات الجديدة على السحابة لحظياً عند الاتصال بالإنترنت.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
