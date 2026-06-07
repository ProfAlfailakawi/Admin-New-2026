import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Prevent showing if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // 2. Check if dismissed recently (within session)
    const dismissedAt = sessionStorage.getItem('pwa_prompt_dismissed');
    if (dismissedAt) return;

    // 3. Listen for the native install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Add a slight delay to feel more organic, not interrupting immediate load
      setTimeout(() => setShowPrompt(true), 2500);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 4. Fallback for iOS/ Safari where beforeinstallprompt isn't supported yet
    // We show a smart custom prompt to guide them.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    let fallbackTimer: NodeJS.Timeout;
    
    if (isIOS) {
      fallbackTimer = setTimeout(() => {
        const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        if (!checkStandalone && !sessionStorage.getItem('pwa_prompt_dismissed')) {
          setShowPrompt(true);
        }
      }, 4000);
    } // Removed general fallback to strictly avoid annoying prompts on desktop

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Elegant iOS fallback instructions
      toast.custom((t) => (
        <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm border border-slate-200 flex flex-col gap-2 font-bold text-sm min-w-[300px]" dir="rtl">
          <span className="text-slate-900">لتثبيت التطبيق على جهازك:</span>
          <span className="text-slate-600 font-medium">1. اضغط على زر المشاركة (Share) في المتصفح بالأسفل.</span>
          <span className="text-slate-600 font-medium">2. اختر "إضافة للشاشة الرئيسية" (Add to Home Screen).</span>
        </div>
      ), { duration: 6000 });
      setShowPrompt(false);
      sessionStorage.setItem('pwa_prompt_dismissed', 'true');
      return;
    }

    // Show native prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setShowPrompt(false);
      sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <>
          {/* Optional backdrop for focus effect */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-50 border border-slate-200 text-slate-900/10 backdrop-blur-[1px] z-[90] md:hidden"
            onClick={handleDismiss}
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30, mass: 1 }}
            className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-auto md:right-8 md:w-[420px] z-[100] bg-white rounded-t-[32px] md:rounded-2xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-t md:border border-slate-100"
            dir="rtl"
          >
            {/* Elegant drag handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 md:hidden" />
            
            <div className="flex items-start gap-4 mb-8">
              <div className="flex-shrink-0 w-[72px] h-[72px] bg-slate-50 border border-slate-200 text-slate-800 rounded-[20px] flex items-center justify-center text-slate-800 shadow-xl">
                <span className="text-4xl font-bold mb-1">ت</span>
              </div>
              <div className="flex-1 mt-1.5">
                <h3 className="text-[22px] font-bold text-slate-900 mb-1.5 tracking-tight">ثبّت تطبيق التراث</h3>
                <p className="text-slate-500 text-[15px] font-bold leading-relaxed w-[90%]">
                  للوصول السريع وتجربة أسهل من الشاشة الرئيسية
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleInstall}
                className="flex-1 bg-slate-800 hover:bg-indigo-600 text-white flex items-center justify-center gap-2 py-4 rounded-[20px] font-bold text-base shadow-sm border border-slate-200 shadow-black/10 active:scale-95 transition-all duration-300"
              >
                <Download size={20} className="mb-0.5" />
                <span>تثبيت التطبيق</span>
              </button>
              <button
                onClick={handleDismiss}
                className="px-8 py-4 text-slate-500 font-bold text-base bg-slate-50 hover:bg-slate-100 rounded-[20px] active:scale-95 transition-all duration-300"
              >
                لاحقاً
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
