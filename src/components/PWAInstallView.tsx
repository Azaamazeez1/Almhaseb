import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Smartphone, 
  Settings, 
  HelpCircle, 
  CheckCircle2, 
  Chrome, 
  Share2, 
  Layers3, 
  Copy, 
  ArrowLeft, 
  ShieldAlert, 
  Info,
  ExternalLink
} from 'lucide-react';

interface PWAInstallViewProps {
  appUrl?: string;
}

export default function PWAInstallView({ appUrl }: PWAInstallViewProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk' | 'ios'>('pwa');

  const currentOrigin = window.location.origin;
  const targetUrl = appUrl || currentOrigin;

  useEffect(() => {
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
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
    if (!deferredPrompt) {
      alert('الرجاء التأكد من استخدام متصفح يدعم التثبيت مثل Google Chrome أو Microsoft Edge، أو اتباع دليل التثبيت اليدوي أدناه.');
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8 animate-in fade-in duration-300" dir="rtl">
      {/* Visual Header */}
      <div className="bg-gradient-to-l from-emerald-800 via-teal-800 to-emerald-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5" />
              تطبيق هاتف ذكي (PWA / APK)
            </span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">تثبيت العزيز للمحاسبة على هاتفك</h2>
            <p className="text-emerald-100/80 text-xs md:text-sm max-w-xl leading-relaxed">
              يمكنك تشغيل وتثبيت هذا البرنامج على جميع الهواتف الذكية (أندرويد وآيفون) وأجهزة الكمبيوتر مباشرة من المتصفح كـ تطبيق متكامل وسريع، بميزة الوصول السريع والأمان الفائق وبدون الحاجة لمتجر تطبيقات!
            </p>
          </div>
          <div className="shrink-0">
            <div className="bg-white/10 border border-white/20 p-4 rounded-2xl backdrop-blur-md flex items-center justify-center">
              <Layers3 className="h-16 w-16 text-emerald-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Installation Options Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Native Installation Trigger (PWA) */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600 h-5 w-5" />
              <span>التثبيت الفوري الذكي من المتصفح (موصى به)</span>
            </h3>
            
            <p className="text-xs text-gray-500 leading-relaxed">
              يقوم متصفح جوجل كروم (Chrome) على الأندرويد بتحويل هذا الموقع تلقائياً إلى ملف تطبيق <strong>APK حقيقي (WebAPK)</strong> آمن وموثوق ومثبت على هاتفك بشكل مباشر.
            </p>

            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3">
              <Info className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-1 text-emerald-950">
                <h4 className="font-bold text-xs">لماذا هذه الطريقة هي الأفضل؟</h4>
                <ul className="text-[11px] list-disc list-inside space-y-1 text-emerald-800 font-medium">
                  <li>لا تشغل مساحة كبيرة على الهاتف (أقل من 2 ميجابايت).</li>
                  <li>تثبيت آمن ومباشر بنقرة واحدة وبدون تحذيرات أمان "الملفات الضارة".</li>
                  <li>تحديثات سحابية فورية ومستمرة عند إطلاق مميزات جديدة للبرنامج.</li>
                  <li>يدعم جرد البضائع وتصفح البيانات بالكامل دون إنترنت (Offline Mode).</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            {isInstalled ? (
              <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 w-full justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>التطبيق مثبت حالياً على جهازك وتعمل بنسخة مستقلة!</span>
              </div>
            ) : deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:shadow-emerald-700/10 cursor-pointer active:scale-98"
              >
                <Download className="h-4.5 w-4.5" />
                <span>ثبت التطبيق على هاتفك الآن (APK مباشر)</span>
              </button>
            ) : (
              <div className="w-full space-y-3">
                <button
                  onClick={() => {
                    alert('لتثبيت التطبيق يرجى النقر على زر الثلاث نقاط في أعلى المتصفح ( ⋮ ) ثم اختيار "Install App" أو "إضافة إلى الشاشة الرئيسية"');
                  }}
                  className="w-full bg-slate-100 text-slate-700 font-bold py-3.5 px-6 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 border border-slate-200"
                >
                  <Chrome className="h-4.5 w-4.5 text-emerald-600" />
                  <span>انقر لتثبيت التطبيق يدوياً من خيارات المتصفح</span>
                </button>
                <p className="text-[10px] text-gray-400 text-center">
                  إذا لم يظهر الزر، يرجى تصفح الموقع عبر متصفح <strong>Google Chrome</strong> أو <strong>Safari</strong> لتمكين التثبيت المباشر.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info & Resource Panel */}
        <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">رابط التطبيق الخاص بك</h4>
            <p className="text-xs text-gray-400">انسخ هذا الرابط لتحميله في أي متصفح هاتف أو لإرساله لعملائك لفتح البرنامج:</p>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-xs">
              <span className="text-[11px] font-mono text-slate-600 truncate flex-1 text-left">{targetUrl}</span>
              <button
                onClick={copyToClipboard}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  copiedUrl ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
                title="نسخ رابط البرنامج"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            {copiedUrl && (
              <p className="text-[10px] text-emerald-600 font-bold animate-pulse text-center">✓ تم نسخ الرابط بنجاح!</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-emerald-200 rounded-2xl p-4 border border-emerald-800 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-300">
              <ShieldAlert className="h-4 w-4" />
              <h4 className="font-bold text-xs">أمان وموثوقية البيانات</h4>
            </div>
            <p className="text-[10px] text-emerald-100/70 leading-relaxed">
              جميع العمليات والبيانات والفواتير تُحفظ بشكل آمن على هاتفك وتتم مزامنتها سحابياً بشكل فوري لتفادي فقدانها في حال تعطل أو فقدان الهاتف.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs navigation for platform instructions */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div className="flex border-b border-slate-100 pb-2 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'pwa' ? 'bg-emerald-50 text-emerald-800 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-slate-800'
            }`}
          >
            تثبيت أندرويد (متصفح كروم)
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ios' ? 'bg-emerald-50 text-emerald-800 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-slate-800'
            }`}
          >
            تثبيت آيفون (متصفح سفاري iOS)
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'apk' ? 'bg-emerald-50 text-emerald-800 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-slate-800'
            }`}
          >
            تصدير ملف APK خارجي مستقر
          </button>
        </div>

        {/* Tab 1: Android Chrome */}
        {activeTab === 'pwa' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-800">خطوات تثبيت التطبيق على هواتف الأندرويد:</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-black h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">١</span>
                    <p className="text-xs text-gray-600 leading-relaxed">افتَح هذا الرابط في متصفح <strong>Google Chrome</strong> على هاتفك.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-black h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">٢</span>
                    <p className="text-xs text-gray-600 leading-relaxed">انقر على زر <strong>القائمة (⋮)</strong> في أعلى يسار المتصفح.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-black h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">٣</span>
                    <p className="text-xs text-gray-600 leading-relaxed">اختر <strong>"Install app"</strong> أو <strong>"تثبيت التطبيق"</strong> (أو <strong>"إضافة إلى الشاشة الرئيسية"</strong>).</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-black h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">٤</span>
                    <p className="text-xs text-gray-600 leading-relaxed">سيظهر لك إشعار تأكيد، انقر <strong>تثبيت (Install)</strong>. سيقوم الأندرويد فوراً بإنشاء أيقونة للبرنامج كملف APK حقيقي على واجهة هاتفك الرئيسية.</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3 text-right">
                <h4 className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                  <Chrome className="h-4.5 w-4.5 text-emerald-600" />
                  <span>ميزة الـ WebAPK من جوجل أندرويد</span>
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  الـ WebAPK هي تكنولوجيا حصرية ومطورة من شركة جوجل مدمجة داخل نظام الأندرويد. عندما تقوم بتثبيت هذا الموقع كـ PWA، يقوم النظام بإنشاء ملف <strong>APK حقيقي خفيف الوزن</strong> وتثبيته في إدارة التطبيقات مثل أي تطبيق قمت بتحميله من المتجر، مما يتيح لك جرد البضائع واستخدام الكاميرا كقارئ باركود والوصول للملفات بشكل كامل.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: iPhone iOS */}
        {activeTab === 'ios' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-slate-800">خطوات تثبيت التطبيق على هواتف الآيفون (iOS):</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-black h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">١</span>
                    <p className="text-xs text-gray-600 leading-relaxed">افتح الرابط باستخدام متصفح <strong>Safari</strong> الرسمي على جهاز الآيفون.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-black h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">٢</span>
                    <p className="text-xs text-gray-600 leading-relaxed">انقر على زر <strong>مشاركة (Share)</strong> الموضح بأيقونة المربع الذي يخرج منه سهم في أسفل الشاشة.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-black h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">٣</span>
                    <p className="text-xs text-gray-600 leading-relaxed">مرر للأسفل في قائمة الخيارات واضغط على <strong>"Add to Home Screen"</strong> أو <strong>"إضافة إلى الشاشة الرئيسية"</strong>.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-black h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">٤</span>
                    <p className="text-xs text-gray-600 leading-relaxed">اكتب الاسم الذي تفضله للتطبيق ثم اضغط على <strong>إضافة (Add)</strong> في أعلى اليمين لتظهر أيقونة البرنامج مباشرة في شاشتك الرئيسية.</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3 text-right">
                <h4 className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                  <Share2 className="h-4.5 w-4.5 text-emerald-600" />
                  <span>أداء ممتاز على الآيفون</span>
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  على نظام iOS، يوفر التطبيق عند تثبيته من متصفح سفاري أداءً فائق السرعة واستقراراً تاماً؛ حيث يعمل في نافذة مستقلة وبشكل منعزل عن المتصفح الخارجي، مما يوفر شاشة كاملة وبدون أشرطة العنوان المزعجة للمتصفح.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Standalone APK Packaging */}
        {activeTab === 'apk' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-800">تصدير التطبيق كملف APK خارجي (Stand-alone APK) لنشره أو رفعه لجوجل بلاي:</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                إذا أردت الحصول على ملف <strong>APK مستقل (مثلاً بصيغة .apk)</strong> لإرساله عبر الواتساب للأصدقاء أو الموظفين أو لرفعه في متجر جوجل بلاي للمطورين، يمكنك إنشاء وتوليد هذا الملف مجاناً في دقيقتين باتباع إحدى هاتين المنصتين العالميتين والموصى بهما من شركة جوجل:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Option A: PWABuilder */}
              <div className="border border-slate-100 bg-white hover:border-emerald-200 rounded-2xl p-5 shadow-xs transition-all space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">الأسهل والأشمل للأسواق</span>
                  <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1">
                    <span>منصة PWABuilder (بإشراف مايكروسوفت)</span>
                  </h5>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    هي الأداة القياسية المجانية عالمياً لتحويل تطبيقات PWA إلى حزم أندرويد حقيقية وموقعة بشهادات تشفير معتمدة وجاهزة للنشر المباشر.
                  </p>
                </div>
                
                <div className="space-y-3 pt-2">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-[10px] font-mono">
                    <span className="truncate flex-1 text-left text-gray-500">{targetUrl}</span>
                    <button onClick={copyToClipboard} className="text-emerald-600 font-bold flex items-center gap-1 hover:underline cursor-pointer shrink-0">
                      <Copy className="h-3 w-3" />
                      <span>{copiedUrl ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                  </div>
                  
                  <a 
                    href="https://www.pwabuilder.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>افتح موقع PWABuilder</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Option B: PWA2APK */}
              <div className="border border-slate-100 bg-white hover:border-emerald-200 rounded-2xl p-5 shadow-xs transition-all space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block">توليد تلقائي سريع بنقرة</span>
                  <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1">
                    <span>منصة Cloud APK Generator</span>
                  </h5>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    مواقع متخصصة تقوم بسحب الـ Manifest والـ Icons التي جهزناها لك في هذا التطبيق، وتقوم بتجميع ملف الـ APK وتحميله فوراً على حاسوبك دون أي إعداد برمجية.
                  </p>
                </div>
                
                <div className="space-y-2 pt-2">
                  <div className="text-[10px] text-gray-500 leading-relaxed space-y-1">
                    <p className="font-bold">كيفية التوليد:</p>
                    <p>١. انسخ رابط موقع البرنامج أعلاه.</p>
                    <p>٢. الصق الرابط واضغط على "Generate APK".</p>
                  </div>
                  
                  <a 
                    href="https://www.pwa2apk.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>افتح موقع PWA2APK</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
