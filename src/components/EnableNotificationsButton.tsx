import React, { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { registerPushNotifications, getPushSupportStatus, refreshPushRegistrationIfAlreadyAllowed } from "../lib/pushNotifications";

export function EnableNotificationsButton(props?: {
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
      const alreadyAllowed = status.permission === "granted";
      setEnabled(stored && alreadyAllowed);

      if (alreadyAllowed) {
        refreshPushRegistrationIfAlreadyAllowed({
          userId: props?.userId || "admin",
          restaurantId: props?.restaurantId || "default",
        }).then((result) => {
          if (!mounted) return;
          if (result.success) setEnabled(true);
        });
      }
    });

    return () => {
      mounted = false;
    };
  }, [props?.userId, props?.restaurantId]);

  const handleEnable = async () => {
    setLoading(true);
    setMessage("");

    try {
      const result = await registerPushNotifications({
        userId: props?.userId || "admin",
        restaurantId: props?.restaurantId || "default",
      });

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

  if (enabled) {
    return (
      <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl border border-emerald-100 w-fit">
        <BellRing size={20} className="text-emerald-500 animate-pulse" />
        <span className="font-bold text-sm">الإشعارات مفعّلة بنجاح</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleEnable}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-white disabled:opacity-60 font-bold hover:shadow-lg hover:shadow-slate-900/20 active:scale-95 transition-all w-fit"
      >
        <Bell size={18} />
        {loading ? "جاري التفعيل..." : "تفعيل الإشعارات الآن"}
      </button>

      {message && (
        <div className="text-sm font-bold text-rose-500">
          {message}
        </div>
      )}
    </div>
  );
}

export default EnableNotificationsButton;
