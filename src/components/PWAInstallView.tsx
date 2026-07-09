import React, { useState, useEffect } from 'react';
import { 
  ArrowRight,
  Search,
  MoreVertical,
  Download,
  Info,
  ShieldAlert,
  Star,
  Check,
  ChevronLeft,
  Share2,
  TrendingUp,
  FileText,
  BadgeAlert,
  Layers,
  Smartphone,
  ExternalLink,
  Laptop
} from 'lucide-react';

interface PWAInstallViewProps {
  appUrl?: string;
  onBack?: () => void;
  deferredPrompt?: any;
  onInstallSuccess?: () => void;
}

export default function PWAInstallView({ appUrl, onBack, deferredPrompt: propDeferredPrompt, onInstallSuccess }: PWAInstallViewProps) {
  const [localDeferredPrompt, setLocalDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showFullAbout, setShowFullAbout] = useState(false);
  const [showShareTooltip, setShowShareTooltip] = useState(false);

  const currentOrigin = window.location.origin;
  const targetUrl = appUrl || currentOrigin;

  const activeDeferredPrompt = propDeferredPrompt || localDeferredPrompt;

  useEffect(() => {
    // Listen for beforeinstallprompt event as fallback
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setLocalDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already running in standalone mode (installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!activeDeferredPrompt) {
      alert('لتثبيت تطبيق "بيبرس للمحاسبة" على هاتفك مباشرة:\n\n1. إذا كنت تستخدم أندرويد: انقر على زر الخيارات (⋮) في أعلى المتصفح ثم اختر "تثبيت التطبيق" أو "إضافة للشاشة الرئيسية".\n2. إذا كنت تستخدم آيفون: انقر على زر مشاركة (Share) في أسفل متصفح سفاري ثم اختر "إضافة للشاشة الرئيسية" (Add to Home Screen).');
      return;
    }
    
    try {
      activeDeferredPrompt.prompt();
      const { outcome } = await activeDeferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        if (onInstallSuccess) {
          onInstallSuccess();
        }
        setLocalDeferredPrompt(null);
      }
    } catch (err) {
      console.error('Install prompt failed:', err);
    }
  };

  const handleShareClick = () => {
    if (navigator.share) {
      navigator.share({
        title: 'برنامج بيبرس للمحاسبة',
        text: 'برنامج متكامل للمحاسبة المالية وإدارة المخزون وجرد البضائع.',
        url: targetUrl,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(targetUrl);
      setShowShareTooltip(true);
      setTimeout(() => setShowShareTooltip(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans pb-16 animate-in fade-in duration-300" dir="rtl">
      {/* 1. Google Play Store Style Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-100 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            title="رجوع"
          >
            <ArrowRight className="h-6 w-6 text-slate-700" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleShareClick}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors relative cursor-pointer"
            title="مشاركة التطبيق"
          >
            <Share2 className="h-5.5 w-5.5 text-slate-700" />
            {showShareTooltip && (
              <span className="absolute bottom-[-32px] left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded-lg whitespace-nowrap z-50 shadow-md">
                تم نسخ الرابط!
              </span>
            )}
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
            <Search className="h-5.5 w-5.5 text-slate-700" />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
            <MoreVertical className="h-5.5 w-5.5 text-slate-700" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-4 space-y-6">
        {/* 2. App Icon & Main Metadata Block */}
        <div className="flex gap-5 items-start">
          {/* App Icon */}
          <div className="w-24 h-24 md:w-28 md:h-28 bg-gradient-to-tr from-emerald-600 via-teal-700 to-cyan-800 rounded-[22%] shadow-lg flex-shrink-0 flex items-center justify-center relative overflow-hidden border border-emerald-500/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent)]"></div>
            <div className="flex flex-col items-center justify-center text-white">
              <Layers className="h-10 w-10 md:h-12 md:w-12 text-emerald-100 drop-shadow-sm" />
              <span className="text-[11px] md:text-xs font-black tracking-wider mt-1 text-emerald-50/90 drop-shadow-sm">بيبرس</span>
            </div>
          </div>

          {/* Title & Author */}
          <div className="flex-1 space-y-1">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
              بيبرس للمحاسبة & فواتير
            </h1>
            <div className="text-sm font-semibold text-[#01875f] hover:underline cursor-pointer">
              بيبرس للحلول الذكية
            </div>
            <p className="text-xs text-slate-400 font-medium leading-relaxed pt-0.5">
              يتضمن ترحيل الفواتير • يدعم العمل بدون إنترنت كامل • أمان عالي
            </p>
          </div>
        </div>

        {/* 3. Horizontal Stats Carousel (Downloads, Age, Size) */}
        <div className="flex items-center justify-between border-y border-slate-100 py-3.5 text-center text-slate-600">
          {/* Rating */}
          <div className="flex-1 flex flex-col items-center justify-center border-l border-slate-100">
            <span className="text-sm font-bold text-slate-900 flex items-center gap-0.5">
              4.9 <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-1">12 ألف مراجعة</span>
          </div>

          {/* Downloads */}
          <div className="flex-1 flex flex-col items-center justify-center border-l border-slate-100">
            <span className="text-sm font-bold text-slate-900">
              +100 ألف
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-1">عمليات التنزيل</span>
          </div>

          {/* App Size */}
          <div className="flex-1 flex flex-col items-center justify-center border-l border-slate-100">
            <Download className="h-4 w-4 text-slate-700" />
            <span className="text-sm font-bold text-slate-900 mt-0.5">2.4 م.ب</span>
            <span className="text-[10px] text-slate-400 font-medium mt-1">مساحة خفيفة للغاية</span>
          </div>

          {/* Age rating */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="border-1.5 border-slate-700 text-slate-700 text-[10px] font-black px-1.5 py-0 rounded-sm">
              3+
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-1.5 flex items-center gap-0.5">
              مناسب للجميع <Info className="h-3 w-3 text-slate-400" />
            </span>
          </div>
        </div>

        {/* 4. Play Store Blue Install Button */}
        <div className="space-y-3">
          {isInstalled ? (
            <div className="w-full bg-[#e6f4ea] border border-emerald-100 text-[#137333] font-bold py-3 px-4 rounded-xl text-xs text-center flex items-center justify-center gap-2">
              <Check className="h-5 w-5 text-emerald-600 stroke-[3]" />
              <span>التطبيق مثبت حالياً على هاتفك وتعمل بنسخة مستقلة!</span>
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              className="w-full bg-[#0b57d0] hover:bg-[#0842a0] text-white font-bold py-3 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm active:scale-98 cursor-pointer font-sans"
            >
              <span>تثبيت</span>
            </button>
          )}
          
          <div className="flex justify-between text-xs text-slate-500 px-1 font-medium">
            <span className="flex items-center gap-1 text-[#01875f]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#01875f]"></span>
              تطبيق معتمد ومحمي
            </span>
            <span>متوافق مع جميع الأجهزة</span>
          </div>
        </div>

        {/* 5. Swipeable Screenshots Carousel */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900">لقطات الشاشة</h3>
          <div className="flex overflow-x-auto gap-3 pb-3 scrollbar-none snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
            
            {/* Screen 1: Dashboard */}
            <div className="w-56 h-[340px] flex-shrink-0 bg-slate-900 rounded-2xl p-3 border border-slate-800 shadow-md snap-start flex flex-col justify-between text-white relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
              <div className="space-y-2 relative z-10">
                <div className="flex justify-between items-center text-[9px] text-slate-400 border-b border-white/5 pb-1.5">
                  <span className="font-mono">10:00 ص</span>
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    <span>متصل سحابياً</span>
                  </div>
                </div>
                
                {/* Visual content representation */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">لوحة التحكم</span>
                  <h4 className="text-xs font-bold leading-tight">إحصائيات مالية فورية وجداول دقيقة</h4>
                </div>
                
                {/* Mock UI elements */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-2 mt-2">
                  <div className="flex justify-between text-[8px] text-slate-400">
                    <span>مجموع المبيعات</span>
                    <span className="text-emerald-400 font-bold">+12,450$</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-3/4 rounded-full"></div>
                  </div>
                  <div className="flex justify-between text-[8px] text-slate-400 border-t border-white/5 pt-1.5">
                    <span>مجموع المشتريات</span>
                    <span className="text-rose-400 font-bold">-4,120$</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-2 rounded-xl text-center">
                <p className="text-[10px] text-emerald-300 font-bold">بيبرس للمحاسبة</p>
                <p className="text-[8px] text-slate-400">تابع أرباحك ومصروفاتك من أي مكان</p>
              </div>
            </div>

            {/* Screen 2: Invoice system */}
            <div className="w-56 h-[340px] flex-shrink-0 bg-slate-900 rounded-2xl p-3 border border-slate-800 shadow-md snap-start flex flex-col justify-between text-white relative overflow-hidden">
              <div className="absolute left-0 top-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl"></div>
              <div className="space-y-2 relative z-10">
                <div className="flex justify-between items-center text-[9px] text-slate-400 border-b border-white/5 pb-1.5">
                  <span className="font-mono">فاتورة بيع</span>
                  <div className="bg-emerald-500/20 text-emerald-400 text-[8px] px-1.5 py-0.2 rounded font-bold">رقم 2054</div>
                </div>
                
                <div className="space-y-1.5 pt-1">
                  <span className="text-[8px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full font-bold">نظام الفواتير</span>
                  <h4 className="text-xs font-bold leading-tight">إنشاء فواتير احترافية وطباعتها فورياً</h4>
                </div>

                {/* Mock UI elements */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1.5 mt-2 text-[8px]">
                  <div className="flex justify-between text-slate-400 border-b border-white/5 pb-1">
                    <span>الصنف</span>
                    <span>الكمية</span>
                    <span>المجموع</span>
                  </div>
                  <div className="flex justify-between">
                    <span>لاصق ذهبي 0.5</span>
                    <span>5 حبة</span>
                    <span className="text-cyan-400">15.00$</span>
                  </div>
                  <div className="flex justify-between">
                    <span>بخاخ كروم إماراتي</span>
                    <span>2 حبة</span>
                    <span className="text-cyan-400">18.00$</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-1.5 font-bold text-white text-[9px]">
                    <span>الإجمالي النهائي</span>
                    <span></span>
                    <span className="text-emerald-400">33.00$</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-2 rounded-xl text-center">
                <p className="text-[10px] text-cyan-300 font-bold">مزامنة وطباعة حرارية</p>
                <p className="text-[8px] text-slate-400">توافق كامل مع الطابعات والباركود</p>
              </div>
            </div>

            {/* Screen 3: Inventory system */}
            <div className="w-56 h-[340px] flex-shrink-0 bg-slate-900 rounded-2xl p-3 border border-slate-800 shadow-md snap-start flex flex-col justify-between text-white relative overflow-hidden">
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl"></div>
              <div className="space-y-2 relative z-10">
                <div className="flex justify-between items-center text-[9px] text-slate-400 border-b border-white/5 pb-1.5">
                  <span className="font-mono">المستودع</span>
                  <span>8 أصناف نشطة</span>
                </div>
                
                <div className="space-y-1.5 pt-1">
                  <span className="text-[8px] bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded-full font-bold">إدارة البضائع</span>
                  <h4 className="text-xs font-bold leading-tight">جرد ومراقبة المخازن والكميات تلقائياً</h4>
                </div>

                {/* Mock UI elements */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2 space-y-1.5 mt-2 text-[8px]">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>عازل زياتي</span>
                    <span className="bg-amber-500/20 text-amber-300 px-1 rounded">8 حبة (منخفض)</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>فرشاي اصليه 1</span>
                    <span className="bg-emerald-500/20 text-emerald-300 px-1 rounded">283 حبة</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>لاصق ذهبي 0.5</span>
                    <span className="bg-emerald-500/20 text-emerald-300 px-1 rounded">56 حبة</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-2 rounded-xl text-center">
                <p className="text-[10px] text-teal-300 font-bold">تنبيهات انخفاض المخزون</p>
                <p className="text-[8px] text-slate-400 font-medium">تجنب نفاد البضائع بفضل التنبيهات</p>
              </div>
            </div>

          </div>
        </div>

        {/* 6. About this App Section (لمحة عن هذا التطبيق) */}
        <div className="space-y-2">
          <div 
            onClick={() => setShowFullAbout(!showFullAbout)}
            className="flex items-center justify-between cursor-pointer py-1 group"
          >
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#01875f] transition-colors">لمحة عن هذا التطبيق</h3>
            <ChevronLeft className={`h-5 w-5 text-slate-500 transform transition-transform ${showFullAbout ? 'rotate-[-90deg]' : ''}`} />
          </div>
          
          <div className="text-xs text-slate-500 leading-relaxed space-y-2">
            <p className="font-medium text-slate-700">
              قم بإدارة شركتك، محلك التجاري، أو مستودعك باحترافية كاملة من خلال واجهة ذكية واحدة متكاملة ومصممة بأحدث تكنولوجيا التطبيقات الذكية.
            </p>
            {showFullAbout ? (
              <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                <p>
                  <strong>ميزات تطبيق "بيبرس للمحاسبة":</strong>
                </p>
                <ul className="list-disc list-inside space-y-1.5 pr-2">
                  <li><strong>فواتير ذكية:</strong> فواتير مبيعات وفواتير مشتريات مع دعم مرتجع المبيعات والمشتريات وحساب الضرائب والخصومات.</li>
                  <li><strong>إدارة مخزون متطورة:</strong> جرد الأصناف، متابعة كمية البضائع المتوفرة، تعديل الأسعار، ومراقبة رأس المال.</li>
                  <li><strong>حسابات العملاء والموردين:</strong> كشف حساب تفصيلي للعملاء والموردين لمتابعة الأرصدة والديون المتبقية.</li>
                  <li><strong>سندات القبض والصرف:</strong> إدارة المقبوضات والمدفوعات النقدية مع تسجيل فوري ومحدث لحالة الصندوق المالي.</li>
                  <li><strong>التقارير المالية:</strong> تقرير الأرباح والخسائر، كشف جرد المخزن، كشف حركة الصندوق، الميزانية العمومية، وكشف اليومية.</li>
                  <li><strong>مزامنة فورية ودعم غير محدود:</strong> متصل بشكل آمن بقاعدة بيانات سحابية لحماية معلوماتك، ويدعم بشكل كامل العمل أوفلاين في حال انقطاع الشبكة.</li>
                </ul>
              </div>
            ) : (
              <p className="line-clamp-2">
                برنامج متكامل للمحاسبة المالية وإدارة المخزون وجرد البضائع، يتيح تسجيل المبيعات والمشتريات وإدارة العملاء والموردين والسندات المالية مع تقارير شاملة.
              </p>
            )}
          </div>

          {/* Quick Play Store Badges */}
          <div className="flex flex-wrap gap-2 pt-2.5">
            <span className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-full cursor-pointer">
              أعمال
            </span>
            <span className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-full cursor-pointer">
              إدارة الفواتير
            </span>
            <span className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-full cursor-pointer">
              المخازن والمستودعات
            </span>
          </div>
        </div>

        {/* 7. Data Safety Section (أمان البيانات) */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">أمان البيانات</h3>
            <ChevronLeft className="h-5 w-5 text-slate-400" />
          </div>
          
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            يبدأ الحفاظ على أمان بياناتك بفهم الآلية التي يتبعها مطورو التطبيقات لجمع بياناتك ومشاركتها. قد تختلف خصوصية البيانات وممارسات الأمان حسب طريقة استخدامك للتطبيق ومنطقتك وعمرك.
          </p>

          <div className="border border-slate-100 rounded-xl p-4 space-y-3.5">
            <div className="flex items-start gap-3.5">
              <ShieldAlert className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600">
                <p className="font-bold">لا يتم مشاركة أي بيانات مع أطراف ثالثة</p>
                <p className="text-slate-400 text-[11px] mt-0.5">يلتزم المطور بعدم مشاركة بيانات المستخدمين مع أي شركات أو جهات خارجية.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 border-t border-slate-50 pt-3">
              <Check className="h-5 w-5 text-slate-600 shrink-0 mt-0.5 stroke-[3.5]" />
              <div className="text-xs text-slate-600">
                <p className="font-bold">تشفير البيانات أثناء النقل</p>
                <p className="text-slate-400 text-[11px] mt-0.5">يتم نقل بياناتك عبر اتصال بروتوكول آمن ومشفّر بالكامل (HTTPS).</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 border-t border-slate-50 pt-3">
              <Check className="h-5 w-5 text-slate-600 shrink-0 mt-0.5 stroke-[3.5]" />
              <div className="text-xs text-slate-600">
                <p className="font-bold">إمكانية حذف البيانات بحرية</p>
                <p className="text-slate-400 text-[11px] mt-0.5">يمكنك طلب حذف حسابك وبياناتك المسجلة بالكامل في أي وقت من الإعدادات.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 8. Extra PWA Device-specific Instructions Card for unmatched browsers */}
        <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 md:p-5 space-y-3">
          <h4 className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
            <Smartphone className="h-4.5 w-4.5 text-emerald-600" />
            <span>تعليمات التثبيت اليدوي للأجهزة الأخرى:</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-600 leading-relaxed">
            <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-100 shadow-3xs">
              <p className="font-bold text-[#01875f]">هواتف الآيفون (iOS Safari)</p>
              <p>١. افتح هذا الموقع من متصفح <strong>سفاري</strong> الرسمي.</p>
              <p>٢. اضغط على زر <strong>مشاركة (Share)</strong> في أسفل الشاشة.</p>
              <p>٣. اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong>.</p>
            </div>
            <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-100 shadow-3xs">
              <p className="font-bold text-[#01875f]">أجهزة الكمبيوتر (PC/Mac)</p>
              <p>١. افتح الموقع من متصفح <strong>Google Chrome</strong> أو <strong>Edge</strong>.</p>
              <p>٢. ستلاحظ وجود رمز شاشة صغير في شريط العنوان بالأعلى.</p>
              <p>٣. انقر عليه لتثبيت التطبيق كنافذة مستقلة على سطح المكتب.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
