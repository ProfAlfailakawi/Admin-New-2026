import React, { useState } from 'react';
import { registerPushNotifications } from '../lib/pushNotifications';
import { Bell } from 'lucide-react';

interface Props {
  userId: string;
  restaurantId?: string;
}

export const EnableNotificationsButton: React.FC<Props> = ({ userId, restaurantId }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleEnable = async () => {
    try {
      setLoading(true);
      setMessage('');
      setIsSuccess(false);

      await registerPushNotifications({
        userId,
        restaurantId: restaurantId || 'default_restaurant',
      });

      setMessage('تم تفعيل إشعارات الطلبات بنجاح ✅');
      setIsSuccess(true);
    } catch (error: any) {
      const errMessage = error.message || 'فشل تفعيل الإشعارات.';
      if (errMessage.includes('CORS') || errMessage.includes('VAPID')) {
        setMessage('فشل التفعيل. تأكد من إنشاء VAPID Key في إعدادات Firebase Cloud Messaging.');
      } else {
        setMessage(errMessage);
      }
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-lg text-primary">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">إشعارات الطلبات</h3>
          <p className="text-sm text-slate-500">تواصل بالإشعارات فور وصول طلبات جديدة</p>
        </div>
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
    </div>
  );
};
