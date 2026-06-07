import React, { useEffect, useState } from "react";
import { Bell, BellRing, Sparkles } from "lucide-react";
import { registerPushNotifications, getPushSupportStatus, refreshPushRegistrationIfAlreadyAllowed } from "../lib/pushNotifications";

export function EnableNotificationsButton(props?: {
  userId?: string;
  restaurantId?: string;
}) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);

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
        const welcomeKey = "alturath_admin_push_welcome_seen";
        const shouldShowWelcome = localStorage.getItem(welcomeKey) !== "true";
        if (shouldShowWelcome) {
          localStorage.setItem(welcomeKey, "true");
          setShowWelcome(true);
          setMessage("");
        } else {
          setMessage("تم تفعيل الإشعارات بنجاح");
        }
      } else {
        setEnabled(false);
        setMessage(result.error || "ما قدرنا نفعّل الإشعارات");
      }
    } catch (error: any) {
      setEnabled(false);
      setMessage(error?.message || "ما قدرنا نفعّل الإشعارات");
    } finally {
      setLoading(false);
    }
  };

  if (enabled) {
    if (showWelcome) {
      return (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-white px-4 py-4 text-slate-800 shadow-sm w-full max-w-md">
          <div className="absolute -top-10 -left-10 h-24 w-24 rounded-full bg-emerald-200/30 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-inner">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900">ياهلا فيك بتنبيهات التراث</p>
              <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                تم تفعيل الإشعارات بنجاح. بنوصلك المهم أول بأول، بهدوء وبدون إزعاج.
              </p>
            </div>
          </div>
        </div>
      );
    }

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
        className="inline-flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 px-6 py-3 text-slate-800 disabled:opacity-60 font-bold hover:shadow-sm border border-slate-200 hover:shadow-slate-200/50 active:scale-95 transition-all w-fit"
      >
        <Bell size={18} />
        {loading ? "نفعّلها..." : "تفعيل الإشعارات الآن"}
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
