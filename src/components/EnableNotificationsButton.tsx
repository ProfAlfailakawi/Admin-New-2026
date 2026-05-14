import React, { useState, useEffect } from 'react';
import { registerPushNotifications } from '../lib/pushNotifications';
import { Bell, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  userId: string;
  restaurantId?: string;
}

export const EnableNotificationsButton: React.FC<Props> = ({ userId, restaurantId }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushDenied, setPushDenied] = useState(false);

  useEffect(() => {
    const checkPush = async () => {
      if (typeof window !== 'undefined' && 'navigator' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
        setIsPushSupported(true);
        
        let permission = 'default';
        if ('Notification' in window) {
          permission = Notification.permission;
        }

        let hasSubscription = false;
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          hasSubscription = !!subscription;
        } catch (e) {
          console.warn("Check push subscription failed", e);
        }

        const isStoredEnabled = localStorage.getItem("push_notifications_enabled") === "true";

        if (permission === 'denied') {
          setPushDenied(true);
          setPushEnabled(false);
        } else if (permission === 'granted' || hasSubscription || isStoredEnabled) {
          setPushDenied(false);
          setPushEnabled(true);
          localStorage.setItem("push_notifications_enabled", "true");
        } else {
          setPushDenied(false);
          setPushEnabled(false);
        }
      } else {
        setIsPushSupported(false);
      }
    };
    
    checkPush();
  }, []);

  const handleEnable = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      await registerPushNotifications({
        userId,
        restaurantId: restaurantId || 'default_restaurant',
      });

      setPushEnabled(true);
      setPushDenied(false);
      setMessage('');
    } catch (error: any) {
      console.error(error);
      const errMessage = error.message || 'فشل تفعيل الإشعارات.';
      setMessage(errMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isPushSupported) {
    return null; // Do not show if not supported
  }

  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-2 rounded-lg text-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div className="text-right">
            <h3 className="font-bold text-slate-900">إشعارات الطلبات</h3>
            <p className="text-xs text-slate-500 font-bold">تواصل بالإشعارات فور وصول طلبات جديدة</p>
          </div>
        </div>
      </div>
      
      {pushDenied && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl flex items-center gap-3"
        >
          <AlertTriangle size={18} />
          <div className="text-right text-xs font-bold">
             <span>الإشعارات موقوفة من إعدادات الجهاز</span>
          </div>
        </motion.div>
      )}

      {pushEnabled && !pushDenied && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-3 rounded-xl flex items-center justify-center gap-2"
        >
          <div className="text-center text-sm font-bold flex items-center gap-2">
             <Bell size={18} />
             <span>الإشعارات مفعلة بنجاح ✅</span>
          </div>
        </motion.div>
      )}

      {!pushEnabled && !pushDenied && (
        <>
          <button 
            onClick={handleEnable} 
            disabled={loading}
            className="w-full bg-slate-800 text-white py-3 px-4 rounded-xl font-bold disabled:opacity-50 transition-all hover:bg-slate-700 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 shadow-[0_2px_10px_rgb(0,0,0,0.04)] shadow-slate-200"
          >
            {loading ? 'جاري التفعيل...' : 'تفعيل إشعارات الطلبات الآن'}
          </button>

          {message && (
            <p className="text-xs mt-2 text-center font-bold text-red-500 bg-red-50 border border-red-100 p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0">
              {message}
            </p>
          )}
        </>
      )}
    </div>
  );
};
