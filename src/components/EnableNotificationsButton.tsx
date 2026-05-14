import React, { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { registerPushNotifications, getPushSupportStatus } from "../lib/pushNotifications";

export function EnableNotificationsButton(_props?: {
  userId?: string;
  restaurantId?: string;
}) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    getPushSupportStatus().then((status) => {
      if (!mounted) return;

      const stored = localStorage.getItem("push_notifications_enabled") === "true";
      setEnabled(stored && status.permission === "granted");
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    setMessage("");

    try {
      const result = await registerPushNotifications();

      if (result.success) {
        setEnabled(true);
        setMessage("تم تفعيل الإشعارات بنجاح");
      } else {
        setEnabled(false);
        setMessage(result.error || "فشل تفعيل الإشعارات");
      }
    } catch (error: any) {
      setEnabled(false);
      setMessage(error?.message || "فشل تفعيل الإشعارات");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {enabled ? (
        <div className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-green-700 border border-green-200 w-full md:w-auto">
          <BellRing size={20} className="text-green-600" />
          <span className="font-bold text-sm">الإشعارات مفعّلة بنجاح</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleEnable}
          disabled={loading}
          className="inline-flex flex-1 md:flex-none justify-center w-full md:w-auto items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60"
        >
          <Bell size={18} />
          {loading ? "جاري التفعيل..." : "تفعيل الإشعارات الآن"}
        </button>
      )}

      {message && !enabled && (
        <div className="text-sm text-red-600 font-bold bg-red-50 p-3 rounded-lg border border-red-100">
          {message}
        </div>
      )}
    </div>
  );
}

export default EnableNotificationsButton;
