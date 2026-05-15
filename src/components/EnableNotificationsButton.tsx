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
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleEnable}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
      >
        {enabled ? <BellRing size={18} /> : <Bell size={18} />}
        {loading ? "جاري التفعيل..." : enabled ? "الإشعارات مفعّلة" : "تفعيل الإشعارات"}
      </button>

      {message && (
        <div className={enabled ? "text-sm text-green-600" : "text-sm text-red-600"}>
          {message}
        </div>
      )}
    </div>
  );
}

export default EnableNotificationsButton;
