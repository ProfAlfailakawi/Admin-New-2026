import React, { useState, useEffect } from 'react';
import { registerPushNotifications, getPushSupportStatus } from '../lib/pushNotifications';
import { Bell, Code, Info } from 'lucide-react';

interface Props {
  userId: string;
  restaurantId?: string;
}

export const EnableNotificationsButton: React.FC<Props> = ({ userId, restaurantId }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    setDebugInfo(getPushSupportStatus());
  }, []);

  const handleEnable = async () => {
    try {
      setLoading(true);
      setMessage('');
      setIsSuccess(false);

      const token = await registerPushNotifications({
        userId,
        restaurantId: restaurantId || 'default_restaurant',
      });

      setMessage('تم تفعيل إشعارات الطلبات بنجاح ✅');
      setIsSuccess(true);
      setDebugInfo((prev: any) => ({ ...prev, token: token.substring(0, 15) + '...' }));
    } catch (error: any) {
      console.error(error);
      const errMessage = error.message || 'فشل تفعيل الإشعارات.';
      if (errMessage.includes('CORS') || errMessage.includes('VAPID')) {
        setMessage('فشل التفعيل. تأكد من إنشاء VAPID Key في إعدادات Firebase Cloud Messaging.');
      } else {
        setMessage(errMessage);
      }
      setIsSuccess(false);
      setDebugInfo((prev: any) => ({ ...prev, error: errMessage }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">إشعارات الطلبات</h3>
            <p className="text-sm text-slate-500">تواصل بالإشعارات فور وصول طلبات جديدة</p>
          </div>
        </div>
        <button onClick={() => setShowDebug(!showDebug)} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-lg">
          <Code className="w-4 h-4" />
        </button>
      </div>
      
      <button 
        onClick={handleEnable} 
        disabled={loading}
        className="w-full bg-primary text-white py-2 px-4 rounded-lg font-bold disabled:opacity-50 transition-opacity"
      >
        {loading ? 'جاري التفعيل...' : 'تفعيل إشعارات الطلبات'}
      </button>

      {message && (
        <p className={`text-sm mt-2 text-center font-bold ${isSuccess ? 'text-green-600' : 'text-red-500'}`}>
          {message}
        </p>
      )}

      {showDebug && debugInfo && (
        <div className="mt-4 p-3 bg-slate-900 rounded-lg text-left text-green-400 font-mono text-xs overflow-auto max-h-48" dir="ltr">
          <div className="flex items-center gap-2 text-slate-400 mb-2 border-b border-slate-700 pb-2">
            <Info className="w-3 h-3" /> PWA Diagnostics
          </div>
          <div className="space-y-1">
            <p><span className="text-slate-500">Notification in window:</span> {JSON.stringify(debugInfo.notification)}</p>
            <p><span className="text-slate-500">ServiceWorker support:</span> {JSON.stringify(debugInfo.serviceWorker)}</p>
            <p><span className="text-slate-500">PushManager support:</span> {JSON.stringify(debugInfo.pushManager)}</p>
            <p><span className="text-slate-500">Display Mode (Standalone):</span> {JSON.stringify(debugInfo.standalone)}</p>
            <p><span className="text-slate-500">iOS Detected:</span> {JSON.stringify(debugInfo.ios)}</p>
            <p><span className="text-slate-500">Current Permission:</span> {debugInfo.permission}</p>
            <p><span className="text-slate-500">VAPID Key Exists:</span> {(import.meta.env.VITE_FIREBASE_VAPID_KEY || "BGBVGMmmiXqCYZW3NaiCY1ipGqDYBQnFFVYSB3JNR9jLbf9cdblfOQAYIM0519CnFusu27PrtJItk0t4QBYmejc") ? 'Yes' : 'No'}</p>
            {debugInfo.token && <p><span className="text-slate-500">FCM Token:</span> {debugInfo.token}</p>}
            {debugInfo.error && <p className="text-red-400"><span className="text-red-500/50">Error:</span> {debugInfo.error}</p>}
          </div>
        </div>
      )}
    </div>
  );
};
