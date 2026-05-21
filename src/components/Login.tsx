import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ShoppingCart, Lock, User, ArrowLeft, Chrome, DownloadCloud, Share, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LogoEngine from './ui/LogoEngine';
import { loginWithGoogle } from '../firebase';

interface LoginProps {
 onLogin: (mode: 'local' | 'cloud') => void;
 logo?: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, logo }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Alturath');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  const showInstallToast = async () => {
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (checkStandalone) return;
    
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          sessionStorage.setItem('pwa_prompt_dismissed', 'true');
          setDeferredPrompt(null);
        } else {
          sessionStorage.setItem('pwa_prompt_dismissed', 'true');
        }
      } catch (e) {
        console.error("PWA prompt error", e);
        setShowIOSPrompt(true);
      }
      return;
    }
    
    setShowIOSPrompt(true);
  };

  useEffect(() => {
    const checkIsStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(checkIsStandalone);
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // One-time prompt on load
    if (!checkIsStandalone && !sessionStorage.getItem('pwa_prompt_dismissed')) {
       // Small timeout to not block initial render
       setTimeout(() => {
         showInstallToast();
       }, 2000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [deferredPrompt]);
  
  const handleCloseIOSPrompt = () => {
    setShowIOSPrompt(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'Alturath') {
      onLogin('local');
    } else {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      localStorage.setItem('appMode', 'cloud');
      await loginWithGoogle();
    } catch (err: any) {
      const errString = String(err).toLowerCase();
      if (errString.includes('popup-closed-by-user') || errString.includes('cancelled by the user')) {
        return;
      }
      if (errString.includes('unauthorized-domain')) {
        setError('هذا النطاق غير مصرح له بتسجيل الدخول. يرجى إضافة النطاق الحالي إلى قائمة النطاقات المصرح بها في إعدادات Firebase Auth.');
        return;
      }
      if (errString.includes('popup-blocked')) {
        setError('تم فتح النافذة في وضع مقيد. يرجى الضغط على زر "Open in new tab" في أعلى اليمين (AI Studio)، أو السماح بالنوافذ المنبثقة.');
        return;
      }
      if (errString.includes('network-request-failed')) {
        setError('فشل الاتصال بخوادم الدخول. يرجى التأكد من اتصالك بالإنترنت وإيقاف أي برامج حظر الإعلانات (Ad-blocker).');
        return;
      }
      if (errString.includes('internal-error')) {
        setError('حدث خطأ داخلي في نظام الدخول. 1- يرجى التأكد من تحديد (Support Email) في إعدادات Firebase 2- افتح التطبيق في نافذة جديدة (Open in new tab).');
        return;
      }
      console.error('Login error:', err);
      setError(`فشل تسجيل الدخول. الخطأ: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen admin-login-showcase arabic-font" dir="rtl">
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />
      <div className="login-orb login-orb-three" />

      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 90, damping: 18 }}
        className="login-showcase-shell"
      >
        <section className="login-brand-stage">
          <div className="login-stage-grid" />
          <div className="login-stage-content">
            <div className="login-live-pill"><span /> لوحة إدارة مباشرة</div>
            <LogoEngine src={logo} size="xl" variant="royal" className="login-hero-logo" />
            <h1>مطبخ التراث</h1>
            <p>لوحة دخول تنفيذية بنفس مستوى جمال النظام — هادئة، فاخرة، وسريعة.</p>
            <div className="login-metrics-row">
              <div><strong>24/7</strong><span>تشغيل</span></div>
              <div><strong>Cloud</strong><span>مزامنة</span></div>
              <div><strong>Secure</strong><span>دخول آمن</span></div>
            </div>
          </div>
        </section>

        <section className="login-form-stage">
          <div className="login-form-head">
            <span>Admin Access</span>
            <h2>حياك الله</h2>
            <p>اختر الدخول السحابي أو المحلي بدون تغيير أي إعدادات بالنظام.</p>
          </div>

          {localStorage.getItem('appMode') === 'cloud' && (
            <div className="login-cloud-note">
              لقد استخدمت التخزين السحابي مؤخراً. يرجى تسجيل الدخول بـ Google للوصول لبياناتك.
            </div>
          )}

          <button onClick={handleGoogleLogin} disabled={loading} className="login-google-btn" type="button">
            <Chrome size={20} />
            <span>{loading ? 'جاري التحميل...' : 'تسجيل الدخول السحابي Google'}</span>
          </button>

          <div className="login-divider"><span>أو الدخول المحلي للتجربة</span></div>

          <form onSubmit={handleLogin} className="login-premium-form">
            <label className="login-field">
              <span>اسم المستخدم</span>
              <div>
                <User size={18} />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="أدخل اسم المستخدم" required />
              </div>
            </label>

            <label className="login-field">
              <span>كلمة المرور</span>
              <div>
                <Lock size={18} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
            </label>

            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="login-error-box">
                <span /> {error}
              </motion.div>
            )}

            <button type="submit" className="login-local-btn">
              <span>دخول محلي</span>
              <ArrowLeft size={18} />
            </button>

            {!isStandalone && (
              <button type="button" onClick={showInstallToast} className="login-install-btn" aria-label="تثبيت التطبيق">
                <DownloadCloud size={20} />
              </button>
            )}
          </form>

          <p className="login-footnote">بيانات Google تُستخدم للمزامنة السحابية فقط، والدخول المحلي يبقى للتجربة على نفس الجهاز.</p>
        </section>
      </motion.div>

      <div className="login-copyright">شركة مطبخ التراث الكويتي © {new Date().getFullYear()}</div>

      <AnimatePresence>
        {showIOSPrompt && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-6 max-w-sm w-full relative"
              dir="rtl"
            >
              <button onClick={handleCloseIOSPrompt} className="absolute top-4 left-4 p-2 text-slate-500 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
                <X size={20} />
              </button>
              <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                  <DownloadCloud size={20} />
                </div>
                <h3 className="font-bold text-lg text-slate-800">تثبيت التطبيق</h3>
              </div>
              <div className="space-y-4">
                <p className="text-slate-600 font-medium text-sm leading-relaxed">
                  لتثبيت التطبيق على جهازك للوصول السريع وتفعيل الإشعارات:
                </p>
                <ul className="text-sm font-medium text-slate-600 space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-100 mt-2">
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 shrink-0 bg-white rounded shadow-sm flex items-center justify-center text-xs font-bold text-slate-500">1</span>
                    <span>اضغط على زر المشاركة <Share size={14} className="inline text-blue-500 mx-0.5" /> المتصفح</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 shrink-0 bg-white rounded shadow-sm flex items-center justify-center text-xs font-bold text-slate-500">2</span>
                    <span>اختر "إضافة إلى الشاشة الرئيسية"</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-6 h-6 shrink-0 bg-white rounded shadow-sm flex items-center justify-center text-xs font-bold text-slate-500">3</span>
                    <span>اضغط "إضافة" (Add) في الأعلى</span>
                  </li>
                </ul>
              </div>
              <button onClick={handleCloseIOSPrompt} className="mt-6 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm active:scale-95">
                حسناً، فهمت
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
