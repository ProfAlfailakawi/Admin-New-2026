import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Settings,
  Save,
  Upload,
  Trash2,
  Shield,
  Bell,
  CreditCard,
  DownloadCloud,
  Database,
  Sparkles,
  RefreshCw,
  Loader2,
  Map as MapIcon,
  Plus,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit2,
  X,
  AlertTriangle,
  Code,
  Store,
  Search,
  Activity,
  WifiOff,
  MonitorSmartphone,
  FileDown,
  Send,
  ClipboardCheck,
  Clock,
  Users,
  Filter,
  ShieldCheck,
} from "lucide-react";
import { motion } from "motion/react";
import LogoEngine from "./ui/LogoEngine";
import {
  AppState,
  AppSettings,
  Zone,
  Product,
  Customer,
  Expense,
  Supplier,
  Testimonial,
  PulseAnalysisRecord,
  AICampaign,
  SupplierTransfer,
} from "../types";
import { GET_DEMO_DATA } from "../data";
import {
  cn,
  formatFullAddress,
  normalizeAddressObject,
  normalizeArabicNumerals,
  normalizeArabic,
} from "../lib/utils";
import * as XLSX from "xlsx";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db, auth, getSmartDoc } from "../firebase";
import { Toggle } from "./ui/Toggle";
import { INITIAL_DATA } from "../data";

import { EnableNotificationsButton } from "./EnableNotificationsButton";
import {
  getPushSupportStatus,
  refreshPushRegistrationIfAlreadyAllowed,
} from "../lib/pushNotifications";
import { DEFAULT_GLOBAL_LOGO } from "../constants";
import { recalculateStateBalances } from "../lib/business-logic";
import {
  getProtectedStorageItem,
  removeProtectedStorageItemIntentionally,
  setProtectedStorageItem,
} from "../lib/dataGuard";
import firebaseConfig from "../../firebase-applet-config.json";

interface Props {
  data: AppState;
  setData: React.Dispatch<React.SetStateAction<AppState>>;
  appMode: "local" | "cloud";
  switchMode: (newMode: "local" | "cloud") => void;
  addToast: (
    title: string,
    message: string,
    type: "info" | "success" | "warning",
  ) => void;
  onCloudImport?: (importedState: AppState) => Promise<boolean>;
}

const WHATSAPP_QUICK_REPLIES_STORAGE_KEY = "alturath_whatsapp_quick_replies_v1";
const WHATSAPP_QUICK_REPLIES_SHEET = "WhatsAppQuickReplies";

type PushDeviceSnapshot = {
  id: string;
  label: string;
  token: string;
  platform?: string;
  deviceType?: string;
  browser?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  ownerLabel?: string;
  deviceLabel?: string;
  currentUrl?: string;
  lastConnection: string;
  lastRead: string;
  status: "online" | "cold" | "abandoned" | "duplicate" | "unknown";
  note: string;
  recentNotifications: {
    id: string;
    title: string;
    message: string;
    date: string;
    read?: boolean;
    type?: string;
    success?: boolean;
    userId?: string;
    tokenStart?: string;
    receivedAt?: string;
    clickedAt?: string;
    receivedByDevice?: boolean;
    openedByEmployee?: boolean;
    deliveryStage?: string;
  }[];
};

type PushUserIdentity = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  source?: string;
};

type PushEventLog = {
  id: string;
  title: string;
  message: string;
  date: string;
  type?: string;
  token?: string;
  tokenStart?: string;
  userId?: string;
  deviceId?: string;
  deviceLabel?: string;
  success?: boolean;
  status?: string;
  responseId?: string;
  receivedAt?: string;
  clickedAt?: string;
  receivedByDevice?: boolean;
  openedByEmployee?: boolean;
  clientReceiptObserved?: boolean;
  deliveryStage?: string;
};

type PushHealthCheck = {
  support: string;
  permission: string;
  token: string;
  lastRegistration: string;
  serviceWorker: string;
  verdict: string;
  tone: "success" | "warning" | "danger";
};

const readWhatsAppQuickRepliesForBackup = () => {
  if (typeof window === "undefined") return [] as any[];
  try {
    const raw = window.localStorage.getItem(WHATSAPP_QUICK_REPLIES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item: any) =>
          item &&
          typeof item.title === "string" &&
          typeof item.text === "string",
      )
      .map((item: any, index: number) => ({
        id: String(item.id || `quick-reply-${index + 1}`),
        title: item.title,
        text: item.text,
        order: index + 1,
      }));
  } catch {
    return [] as any[];
  }
};

const restoreWhatsAppQuickRepliesFromBackup = (rows: any[]) => {
  if (typeof window === "undefined" || !Array.isArray(rows)) return 0;
  const cleaned = rows
    .map((row: any, index: number) => ({
      id: String(row.id || `qr-import-${Date.now()}-${index}`),
      title: String(row.title || "").trim(),
      text: String(row.text || "").trim(),
    }))
    .filter((item: any) => item.title && item.text);
  if (!cleaned.length) return 0;
  try {
    window.localStorage.setItem(
      WHATSAPP_QUICK_REPLIES_STORAGE_KEY,
      JSON.stringify(cleaned),
    );
    return cleaned.length;
  } catch {
    return 0;
  }
};

const GeneralSettings: React.FC<Props> = ({
  data,
  setData,
  appMode,
  switchMode,
  addToast,
  onCloudImport,
}) => {
  const [settings, setSettingsState] = useState<AppSettings>(
    data?.settings || INITIAL_DATA.settings,
  );

  const setSettings = (updater: any) => {
    setSettingsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });
  };

  // Update local setting silently if remote is completely different (to not block typing)
  useEffect(() => {
    if (JSON.stringify(data.settings) !== JSON.stringify(settings)) {
      setSettingsState(data.settings);
    }
  }, [data.settings]);

  // Synchronize local setting changes back to parent state safely after render
  useEffect(() => {
    if (JSON.stringify(data.settings) !== JSON.stringify(settings)) {
      setData((d) => ({ ...d, settings }));
    }
  }, [settings, setData]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [pushHealth, setPushHealth] = useState<PushHealthCheck | null>(null);
  const [checkingPushHealth, setCheckingPushHealth] = useState(false);
  const [pushDevices, setPushDevices] = useState<PushDeviceSnapshot[]>([]);
  const [pushEventLogs, setPushEventLogs] = useState<PushEventLog[]>([]);
  const [expandedPushDeviceId, setExpandedPushDeviceId] = useState<
    string | null
  >(null);
  const [pushHealthDetailsOpen, setPushHealthDetailsOpen] = useState(false);
  const [pushDevicesPanelOpen, setPushDevicesPanelOpen] = useState(false);
  const [pushDeviceTab, setPushDeviceTab] = useState<
    "users" | "devices" | "log" | "investigate" | "advanced"
  >("users");
  const [pushDeviceSearch, setPushDeviceSearch] = useState("");
  const [expandedPushDeviceGroup, setExpandedPushDeviceGroup] =
    useState<string>("active");
  const [pushAdvancedFilter, setPushAdvancedFilter] = useState<
    "all" | "noRead" | "noUser" | "noLogs" | "weak" | "duplicates"
  >("all");
  const [pushInvestigationQuery, setPushInvestigationQuery] = useState("");
  const [pushTestTitle, setPushTestTitle] = useState(
    "اختبار إشعار تجريبي من الأدمن",
  );
  const [pushTestBody, setPushTestBody] = useState(
    "هذا إشعار اختبار فقط للتأكد من وصول التنبيه لهذا الجهاز.",
  );
  const [sendingPushTestId, setSendingPushTestId] = useState<string | null>(
    null,
  );
  const [pushTestResults, setPushTestResults] = useState<
    Record<string, string>
  >({});
  const [pushUserDirectory, setPushUserDirectory] = useState<
    Map<string, PushUserIdentity>
  >(new Map());

  const [activeSection, setActiveSection] = useState<string>("");
  const [searchZoneTerm, setSearchZoneTerm] = useState("");

  const isInitialMount = useRef(true);

  const handleSyncBalances = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setData((prev) => recalculateStateBalances(prev));
      setIsSyncing(false);
      addToast(
        "تمت المزامنة",
        "تمت إعادة حساب مديونيات الموردين وأرصدة العملاء بنجاح.",
        "success",
      );
    }, 800);
  };

  const normalizePushDateValue = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value?.toDate === "function")
      return value.toDate().toISOString();
    if (typeof value?.seconds === "number")
      return new Date(value.seconds * 1000).toISOString();
    return "";
  };

  const formatPushHealthDate = (value: any) => {
    const normalized = normalizePushDateValue(value);
    if (!normalized) return "No timestamp saved";
    const time = new Date(normalized).getTime();
    if (!Number.isFinite(time)) return "Unknown";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kuwait",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(time));
  };

  const getPushDeliveryStageLabel = (event: Partial<PushEventLog> | any) => {
    if (
      event?.openedByEmployee ||
      event?.status === "clicked_by_employee" ||
      event?.lastClientReceiptStatus === "clicked"
    )
      return "فتحه الموظف";
    if (
      event?.receivedByDevice ||
      event?.status === "received_by_device" ||
      event?.lastClientReceiptStatus === "received"
    )
      return "استلمه الجهاز";
    if (event?.success === false || event?.status === "failed_by_fcm")
      return "فشل من FCM";
    if (event?.success === true || event?.status === "accepted_by_fcm")
      return "قبله FCM";
    return "مسجل";
  };

  const normalizePushEventLog = (
    event: any,
    index: number,
  ): PushEventLog | null => {
    if (!event || typeof event !== "object") return null;
    const channel = String(
      event.channel || event.deliveryChannel || event.method || "",
    ).toLowerCase();
    const kind = String(event.pushEventKind || event.kind || "").toLowerCase();
    const hasPushMarker = Boolean(
      kind === "delivery_attempt" ||
      kind === "client_receipt" ||
      channel === "web_push" ||
      channel === "push" ||
      event.responseId ||
      event.token ||
      event.pushToken ||
      event.deviceToken ||
      event.tokenStart,
    );
    if (!hasPushMarker) return null;
    const dateRaw =
      event.createdAt ||
      event.sentAt ||
      event.receivedAt ||
      event.clickedAt ||
      event.lastClientReceiptAt ||
      event.date ||
      event.updatedAt ||
      event.timestamp;
    return {
      id: String(
        event.eventId ||
          event.id ||
          event.notificationId ||
          `push-event-${index}`,
      ),
      title: String(
        event.title ||
          event.heading ||
          event.notificationTitle ||
          "Push Notification",
      ),
      message: String(
        event.body ||
          event.message ||
          event.text ||
          event.notificationBody ||
          "",
      ),
      date: formatPushHealthDate(dateRaw),
      type: String(event.status || event.alertType || event.type || "push"),
      token: String(event.token || event.pushToken || event.deviceToken || ""),
      tokenStart: String(event.tokenStart || event.tokenPrefix || ""),
      userId: String(event.userId || event.recipientId || event.adminId || ""),
      deviceId: String(
        event.deviceId || event.tokenId || event.pushTokenId || "",
      ),
      deviceLabel: String(
        event.deviceLabel || event.platform || event.deviceType || "",
      ),
      success: event.success === undefined ? undefined : Boolean(event.success),
      status: String(
        event.status ||
          (event.success === true
            ? "success"
            : event.success === false
              ? "failed"
              : "recorded"),
      ),
      responseId: event.responseId ? String(event.responseId) : undefined,
      receivedAt: event.receivedAt
        ? formatPushHealthDate(event.receivedAt)
        : undefined,
      clickedAt: event.clickedAt
        ? formatPushHealthDate(event.clickedAt)
        : undefined,
      receivedByDevice: Boolean(
        event.receivedByDevice ||
        event.status === "received_by_device" ||
        event.lastClientReceiptStatus === "received",
      ),
      openedByEmployee: Boolean(
        event.openedByEmployee ||
        event.status === "clicked_by_employee" ||
        event.lastClientReceiptStatus === "clicked",
      ),
      clientReceiptObserved: Boolean(
        event.clientReceiptObserved ||
        event.receivedByDevice ||
        event.openedByEmployee,
      ),
      deliveryStage: getPushDeliveryStageLabel(event),
    };
  };

  const readRealPushEventLogs = async (): Promise<PushEventLog[]> => {
    const localEvents = [
      ...(((data as any)?.pushEvents || []) as any[]),
      ...(((data as any)?.pushDeliveryLogs || []) as any[]),
      ...(((data as any)?.pushTestEvents || []) as any[]),
    ]
      .map(normalizePushEventLog)
      .filter(Boolean) as PushEventLog[];

    if (appMode !== "cloud" || !db) {
      return localEvents
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 120);
    }

    try {
      const snapshot = await getDocs(collection(db, "pushEvents"));
      const serverEvents = snapshot.docs
        .map((eventDoc, index) =>
          normalizePushEventLog({ id: eventDoc.id, ...eventDoc.data() }, index),
        )
        .filter(Boolean) as PushEventLog[];
      const merged = [...serverEvents, ...localEvents];
      const seen = new Set<string>();
      return merged
        .filter((event) => {
          const key = event.id || `${event.token}-${event.date}-${event.title}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 120);
    } catch (error) {
      console.warn("[Push] read real push events failed:", error);
      return localEvents
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 120);
    }
  };

  const getRecentPushNotifications = (
    device?: any,
    logs: PushEventLog[] = pushEventLogs,
  ) => {
    const token = String(device?.token || "");
    const tokenStart = token ? token.slice(0, 24) : "";
    const userId = String(device?.userId || "");
    const deviceId = String(device?.id || device?.tokenHash || "");
    const deviceLabel = String(
      device?.label || device?.platform || device?.deviceType || "",
    );

    const matched = logs.filter((event: PushEventLog) => {
      if (event.token && token && event.token === token) return true;
      if (event.token && tokenStart && event.token.startsWith(tokenStart))
        return true;
      if (event.tokenStart && token && token.startsWith(event.tokenStart))
        return true;
      if (event.userId && userId && event.userId === userId) return true;
      if (event.deviceId && deviceId && event.deviceId === deviceId)
        return true;
      if (event.deviceLabel && deviceLabel && event.deviceLabel === deviceLabel)
        return true;
      return false;
    });

    return matched.slice(0, 8).map((event: PushEventLog, index: number) => ({
      id: String(event.id || `push-event-${index}`),
      title: event.title,
      message: event.message,
      date: event.date,
      read:
        event.openedByEmployee ||
        event.receivedByDevice ||
        event.success === true,
      type: event.success === false ? "failed" : event.type || "push",
      receivedAt: event.receivedAt,
      clickedAt: event.clickedAt,
      receivedByDevice: event.receivedByDevice,
      openedByEmployee: event.openedByEmployee,
      deliveryStage: event.deliveryStage || getPushDeliveryStageLabel(event),
      success: event.success,
      userId: event.userId,
      tokenStart: event.tokenStart,
    }));
  };

  const getPushStatusMeta = (status: PushDeviceSnapshot["status"]) => {
    if (status === "online")
      return {
        label: "نشط",
        pill: "bg-emerald-400/15 text-emerald-100 border-emerald-300/15",
        dot: "bg-emerald-300",
        group: "active",
      };
    if (status === "cold")
      return {
        label: "بارد",
        pill: "bg-amber-400/15 text-amber-100 border-amber-300/15",
        dot: "bg-amber-300",
        group: "late",
      };
    if (status === "abandoned")
      return {
        label: "مهجور",
        pill: "bg-rose-400/15 text-rose-100 border-rose-300/15",
        dot: "bg-rose-300",
        group: "archive",
      };
    if (status === "duplicate")
      return {
        label: "مكرر",
        pill: "bg-sky-400/15 text-sky-100 border-sky-300/15",
        dot: "bg-sky-300",
        group: "archive",
      };
    return {
      label: "يحتاج تأكيد",
      pill: "bg-white/10 text-white/70 border-white/10",
      dot: "bg-white/40",
      group: "archive",
    };
  };

  const getPushDeviceScore = (device: PushDeviceSnapshot) => {
    if (device.status === "online") return 100;
    if (device.status === "cold") return 62;
    if (device.status === "duplicate") return 45;
    if (device.status === "abandoned") return 20;
    return 10;
  };

  const getPushDeviceRecommendedAction = (device: PushDeviceSnapshot) => {
    if (device.status === "online")
      return "اتركه فعال: جاهز لاستقبال Push غالبًا.";
    if (device.status === "cold")
      return "راجع الجهاز: التوكن موجود لكن آخر قراءة قديمة.";
    if (device.status === "duplicate")
      return "مكرر غالبًا: اختبر الجهاز المطلوب فقط ولا ترسل للجميع.";
    if (device.status === "abandoned")
      return "قديم/غير صالح غالبًا: اختبره أو أعد تفعيل Push من الجهاز.";
    return "التوكن موجود لكن وقت التسجيل/القراءة غير محفوظ؛ اختبر الجهاز قبل الاعتماد عليه.";
  };

  const getPushTimelineEvents = (device: PushDeviceSnapshot) => {
    const items = [
      { label: "First registration", value: device.lastConnection },
      { label: "Last token update", value: device.lastConnection },
      { label: "Last read/open", value: device.lastRead },
      ...(device.recentNotifications || []).slice(0, 4).map((notification) => ({
        label:
          notification.deliveryStage ||
          (notification.read
            ? "Push accepted/received"
            : "Push event recorded"),
        value: `${notification.title} - ${notification.clickedAt || notification.receivedAt || notification.date}`,
      })),
    ];
    return items.filter(
      (item) =>
        item.value &&
        item.value !== "Not registered" &&
        item.value !== "No timestamp saved" &&
        item.value !== "Unknown",
    );
  };

  const getPushAdvancedFilterLabel = (filter: typeof pushAdvancedFilter) => {
    if (filter === "noRead") return "بلا قراءة واضحة";
    if (filter === "noUser") return "بلا مستخدم";
    if (filter === "noLogs") return "بلا أرشيف Push";
    if (filter === "weak") return "ثقة ضعيفة";
    if (filter === "duplicates") return "مكررة";
    return "كل الحالات";
  };

  const matchesPushAdvancedFilter = (
    device: PushDeviceSnapshot,
    devices: PushDeviceSnapshot[],
  ) => {
    if (pushAdvancedFilter === "all") return true;
    if (pushAdvancedFilter === "noRead")
      return (
        !device.lastRead ||
        device.lastRead === "Not registered" ||
        device.lastRead === "No timestamp saved" ||
        device.lastRead === "Unknown"
      );
    if (pushAdvancedFilter === "noUser") return !device.userId;
    if (pushAdvancedFilter === "noLogs")
      return !(device.recentNotifications || []).length;
    if (pushAdvancedFilter === "weak")
      return getPushDeviceConfidence(device) < 55;
    if (pushAdvancedFilter === "duplicates") {
      const owner = device.userId || device.label;
      return Boolean(
        owner &&
        devices.filter((d) => (d.userId || d.label) === owner).length > 1,
      );
    }
    return true;
  };

  const getPushDeviceConfidence = (device: PushDeviceSnapshot) => {
    let score = 0;
    if (device.token && device.token !== "Not available") score += 25;
    if (device.status === "online") score += 30;
    if (device.status === "cold") score += 14;
    if (device.status === "duplicate") score += 10;
    if (
      device.lastRead &&
      device.lastRead !== "Not registered" &&
      device.lastRead !== "No timestamp saved" &&
      device.lastRead !== "Unknown"
    )
      score += 15;
    if (device.platform || device.deviceType) score += 8;
    if (device.browser) score += 7;
    if ((device.recentNotifications || []).length) score += 15;
    return Math.max(0, Math.min(100, score));
  };

  const getPushDeviceConfidenceMeta = (score: number) => {
    if (score >= 80)
      return {
        label: "ثقة عالية",
        className: "text-emerald-100 bg-emerald-400/15 border-emerald-300/20",
      };
    if (score >= 55)
      return {
        label: "ثقة متوسطة",
        className: "text-amber-100 bg-amber-400/15 border-amber-300/20",
      };
    return {
      label: "ثقة ضعيفة",
      className: "text-rose-100 bg-rose-400/15 border-rose-300/20",
    };
  };

  const getPushReadinessVerdict = (device: PushDeviceSnapshot) => {
    const score = getPushDeviceConfidence(device);
    if (device.status === "online" && score >= 70)
      return {
        label: "جاهز غالبًا",
        detail:
          "التوكن موجود والقراءة حديثة، ولا يظهر سبب واضح يمنع الاستقبال.",
        className: "border-emerald-300/20 bg-emerald-400/10 text-emerald-50",
      };
    if (device.status === "cold" || score >= 45)
      return {
        label: "مشكوك فيه",
        detail:
          "الجهاز موجود لكن آخر قراءة أو السجل يحتاج مراجعة قبل الاعتماد عليه.",
        className: "border-amber-300/20 bg-amber-400/10 text-amber-50",
      };
    return {
      label: "غير جاهز غالبًا",
      detail:
        "التوكن أو القراءة أو التعريف ناقص/قديم. الأفضل إعادة تفعيل الإشعارات من الجهاز.",
      className: "border-rose-300/20 bg-rose-400/10 text-rose-50",
    };
  };

  const getPushInvestigationLines = (
    device: PushDeviceSnapshot,
    devices: PushDeviceSnapshot[],
  ) => {
    const sameOwnerDevices = devices.filter(
      (d) =>
        (device.userId && d.userId === device.userId) ||
        (!device.userId && d.label === device.label),
    );
    const latestNotification = (device.recentNotifications || [])[0];
    const readiness = getPushReadinessVerdict(device);
    const likelyCause =
      device.status === "online"
        ? "لا توجد مشكلة واضحة من لوحة القراءة. إذا لم يصل الإشعار فافحص إعدادات الجهاز أو وضع التركيز/عدم الإزعاج."
        : device.status === "cold"
          ? "المشكلة المحتملة: الجهاز لا يفتح النظام أو لم يحدث التوكن منذ فترة."
          : device.status === "duplicate"
            ? "المشكلة المحتملة: لدى الموظف أكثر من جهاز/توكن، وقد يكون الجهاز المستخدم قديمًا."
            : device.status === "abandoned"
              ? "المشكلة المحتملة: الجهاز قديم أو لم يعد مستخدمًا."
              : "المشكلة المحتملة: الجهاز غير معرف بالكامل أو لا يملك توكنًا واضحًا.";
    return [
      ["حكم الجاهزية", readiness.label],
      ["السبب الأقرب", likelyCause],
      ["أجهزة لنفس الموظف/التسمية", `${sameOwnerDevices.length}`],
      [
        "آخر إشعار معروف",
        latestNotification
          ? `${latestNotification.title} - ${latestNotification.date}`
          : "No notification log found",
      ],
      [
        "هل يوجد فتح/قراءة لإشعار؟",
        latestNotification?.read
          ? "Yes, open/read recorded"
          : "No open/read recorded",
      ],
    ];
  };

  const buildPushDeviceReport = (
    device: PushDeviceSnapshot,
    devices: PushDeviceSnapshot[],
  ) => {
    const score = getPushDeviceConfidence(device);
    const readiness = getPushReadinessVerdict(device);
    const lines = getPushInvestigationLines(device, devices);
    return [
      "Alturath Push Device Investigation Report",
      "----------------------------------------",
      `Device: ${device.deviceLabel || device.label}`,
      `Employee: ${device.ownerLabel || device.userName || "Not linked"}`,
      `User ID: ${device.userId || "Not linked"}`,
      `Email: ${device.userEmail || "Not linked"}`,
      `Role: ${device.userRole || "Not linked"}`,
      `Status: ${getPushStatusMeta(device.status).label}`,
      `Confidence: ${score}% - ${getPushDeviceConfidenceMeta(score).label}`,
      `Readiness: ${readiness.label}`,
      `Last connection: ${device.lastConnection}`,
      `Last read: ${device.lastRead}`,
      `Platform: ${device.platform || device.deviceType || "Unknown"}`,
      `Browser: ${device.browser || "Unknown"}`,
      `Current URL: ${device.currentUrl || "Not available"}`,
      `Token: ${device.token}`,
      "",
      "Investigation:",
      ...lines.map(([label, value]) => `- ${label}: ${value}`),
      "",
      `Push recommendation: ${getPushDeviceRecommendedAction(device)}`,
    ].join("\n");
  };

  const copyPushDeviceReport = async (
    device: PushDeviceSnapshot,
    devices: PushDeviceSnapshot[],
  ) => {
    const report = buildPushDeviceReport(device, devices);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(report);
        toast.success("تم نسخ تقرير الجهاز");
        return;
      }
    } catch {}
    toast.info("تقرير الجهاز جاهز للنسخ", {
      description: report.slice(0, 140),
    });
  };

  const buildPushEmployeeReport = (
    owner: string,
    devices: PushDeviceSnapshot[],
  ) => {
    const active = devices.filter((d) => d.status === "online").length;
    const weak = devices.filter((d) => getPushDeviceConfidence(d) < 55).length;
    return [
      "Alturath Push Employee Device Report",
      "------------------------------------",
      `Employee / Account: ${owner}`,
      `Devices: ${devices.length}`,
      `Active: ${active}`,
      `Need review: ${weak}`,
      "",
      ...devices.map((device, index) => {
        const score = getPushDeviceConfidence(device);
        return `${index + 1}. ${device.label} | ${getPushStatusMeta(device.status).label} | ${score}% | Last read: ${device.lastRead} | Token: ${device.token}`;
      }),
    ].join("\n");
  };

  const copyPushEmployeeReport = async (
    owner: string,
    devices: PushDeviceSnapshot[],
  ) => {
    const report = buildPushEmployeeReport(owner, devices);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(report);
        toast.success("تم نسخ تقرير الموظف");
        return;
      }
    } catch {}
    toast.info("تقرير الموظف جاهز للنسخ", {
      description: report.slice(0, 140),
    });
  };

  const downloadPushDevicesCsv = (devices: PushDeviceSnapshot[]) => {
    const rows = devices.map((device) => ({
      device: device.deviceLabel || device.label,
      employee: device.ownerLabel || device.userName || "",
      userId: device.userId || "",
      email: device.userEmail || "",
      role: device.userRole || "",
      status: getPushStatusMeta(device.status).label,
      confidence: getPushDeviceConfidence(device),
      lastConnection: device.lastConnection,
      lastRead: device.lastRead,
      platform: device.platform || device.deviceType || "",
      browser: device.browser || "",
      currentUrl: device.currentUrl || "",
      notifications: (device.recentNotifications || []).length,
      token: device.token,
      recommendedAction: getPushDeviceRecommendedAction(device),
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "PushDevices");
    XLSX.writeFile(
      wb,
      `alturath-push-devices-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const copyPushExecutiveSummary = async (devices: PushDeviceSnapshot[]) => {
    const avg = Math.round(
      devices.reduce(
        (sum, device) => sum + getPushDeviceConfidence(device),
        0,
      ) / Math.max(devices.length, 1),
    );
    const lines = [
      "Alturath Push Command Summary",
      "-----------------------------",
      `Generated: ${formatPushHealthDate(new Date().toISOString())}`,
      `Total devices: ${devices.length}`,
      `Average confidence: ${avg}%`,
      `Active: ${devices.filter((d) => d.status === "online").length}`,
      `Cold: ${devices.filter((d) => d.status === "cold").length}`,
      `Archive candidates: ${devices.filter((d) => ["abandoned", "duplicate", "unknown"].includes(d.status)).length}`,
      "",
      "Top urgent devices:",
      ...devices
        .slice()
        .sort((a, b) => getPushDeviceConfidence(a) - getPushDeviceConfidence(b))
        .slice(0, 8)
        .map(
          (device) =>
            `- ${device.label} | ${getPushStatusMeta(device.status).label} | ${getPushDeviceConfidence(device)}% | ${device.lastRead}`,
        ),
    ].join("\n");
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(lines);
        toast.success("تم نسخ ملخص مركز الأجهزة");
        return;
      }
    } catch {}
    toast.info("ملخص مركز الأجهزة جاهز للنسخ", {
      description: lines.slice(0, 140),
    });
  };

  const sendPushDeviceTestNotification = async (device: PushDeviceSnapshot) => {
    if (!device?.token || device.token === "Not available") {
      toast.error("لا يوجد توكن صالح لهذا الجهاز");
      return;
    }
    setSendingPushTestId(device.id);
    setPushTestResults((prev) => ({
      ...prev,
      [device.id]: "جاري إرسال اختبار افتراضي...",
    }));
    try {
      const response = await fetch("/api/push/test-device", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: device.token,
          title: pushTestTitle || "اختبار إشعار تجريبي من الأدمن",
          body:
            pushTestBody ||
            "هذا إشعار اختبار فقط للتأكد من وصول التنبيه لهذا الجهاز.",
          userId: device.userId || "",
          deviceLabel: device.label,
          url: typeof window !== "undefined" ? window.location.href : "/",
        }),
      });
      const result = await response.json().catch(() => ({}));
      const message = result?.success
        ? `تم إرسال الاختبار: نجاح ${result.successCount || 0} / فشل ${result.failureCount || 0}`
        : `تعذر إرسال الاختبار: ${result?.error || result?.message || "Unknown error"}`;
      setPushTestResults((prev) => ({ ...prev, [device.id]: message }));
      if (result?.success) toast.success("تم إرسال إشعار اختبار للجهاز");
      else
        toast.error("فشل إرسال إشعار الاختبار", {
          description:
            result?.error ||
            result?.message ||
            "راجع حالة الخادم أو صلاحية التوكن.",
        });
    } catch (error: any) {
      const message = error?.message || String(error);
      setPushTestResults((prev) => ({
        ...prev,
        [device.id]: `فشل الاتصال بالخادم: ${message}`,
      }));
      toast.error("فشل الاتصال بخادم الإشعارات", { description: message });
    } finally {
      setSendingPushTestId(null);
    }
  };

  const normalizePushLookupKey = (value: any) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const pickPushUserName = (record: any) =>
    String(
      record?.displayName ||
        record?.userName ||
        record?.employeeName ||
        record?.staffName ||
        record?.adminName ||
        record?.partnerName ||
        record?.localName ||
        record?.name ||
        record?.fullName ||
        record?.email ||
        "",
    ).trim();

  const pickPushUserRole = (record: any, fallback = "") =>
    String(
      record?.role || record?.type || record?.accountType || fallback || "",
    ).trim();

  const addPushUserIdentity = (
    map: Map<string, PushUserIdentity>,
    record: any,
    fallbackRole = "",
    source = "data",
  ) => {
    if (!record) return;
    const id = String(
      record.uid ||
        record.userId ||
        record.employeeId ||
        record.staffId ||
        record.adminId ||
        record.partnerId ||
        record.localId ||
        record.id ||
        record.email ||
        "",
    ).trim();
    const email = String(
      record.email || record.userEmail || record.employeeEmail || "",
    ).trim();
    const phone = String(
      record.phone || record.mobile || record.userPhone || "",
    ).trim();
    const name = pickPushUserName(record);
    const role = pickPushUserRole(record, fallbackRole);
    const identity: PushUserIdentity = {
      id: id || email || phone || name,
      name,
      email,
      phone,
      role,
      source,
    };
    if (!identity.id && !identity.name && !identity.email && !identity.phone)
      return;
    const keys = [
      id,
      email,
      phone,
      record.uid,
      record.userId,
      record.employeeId,
      record.staffId,
      record.adminId,
      record.partnerId,
      record.localId,
      record.id,
    ]
      .map(normalizePushLookupKey)
      .filter(Boolean);
    keys.forEach((key) => map.set(key, identity));
  };

  const addPushUserCollection = (
    map: Map<string, PushUserIdentity>,
    rows: any,
    fallbackRole = "",
    source = "data",
  ) => {
    if (!Array.isArray(rows)) return;
    rows.forEach((row: any) =>
      addPushUserIdentity(map, row, fallbackRole, source),
    );
  };

  const buildLocalPushUserDirectory = () => {
    const map = new Map<string, PushUserIdentity>();
    addPushUserIdentity(
      map,
      {
        uid: auth?.currentUser?.uid,
        id: auth?.currentUser?.uid,
        email: auth?.currentUser?.email,
        displayName: auth?.currentUser?.displayName || auth?.currentUser?.email,
        role: "admin",
      },
      "admin",
      "auth",
    );
    const root: any = data || {};
    [
      ["users", "user"],
      ["employees", "employee"],
      ["staff", "staff"],
      ["admins", "admin"],
      ["adminUsers", "admin"],
      ["partners", "partner"],
      ["partnerAccounts", "partner"],
      ["locals", "local"],
      ["localUsers", "local"],
      ["accounts", "account"],
      ["team", "team"],
      ["drivers", "driver"],
      ["workers", "employee"],
    ].forEach(([key, role]) =>
      addPushUserCollection(map, root?.[key], role, `data.${key}`),
    );
    return map;
  };

  const readPushUserDirectory = async () => {
    const map = buildLocalPushUserDirectory();
    if (appMode !== "cloud" || !db) return map;
    const collectionsToTry: [string, string][] = [
      ["users", "user"],
      ["employees", "employee"],
      ["staff", "staff"],
      ["admins", "admin"],
      ["adminUsers", "admin"],
      ["partners", "partner"],
      ["partnerAccounts", "partner"],
      ["locals", "local"],
      ["localUsers", "local"],
      ["accounts", "account"],
    ];
    await Promise.all(
      collectionsToTry.map(async ([collectionName, role]) => {
        try {
          const snap = await getDocs(collection(db, collectionName));
          snap.docs.forEach((userDoc) =>
            addPushUserIdentity(
              map,
              { id: userDoc.id, uid: userDoc.id, ...userDoc.data() },
              role,
              collectionName,
            ),
          );
        } catch {}
      }),
    );
    return map;
  };

  const resolvePushUserIdentity = (
    item: any,
    directory: Map<string, PushUserIdentity>,
  ) => {
    const directName = pickPushUserName(item);
    const directEmail = String(
      item?.email || item?.userEmail || item?.employeeEmail || "",
    ).trim();
    const directRole = pickPushUserRole(item);
    const candidateKeys = [
      item?.userId,
      item?.uid,
      item?.ownerId,
      item?.employeeId,
      item?.staffId,
      item?.adminId,
      item?.partnerId,
      item?.localId,
      item?.accountId,
      item?.createdBy,
      item?.registeredBy,
      item?.email,
      item?.userEmail,
      item?.employeeEmail,
      item?.phone,
      item?.userPhone,
    ]
      .map(normalizePushLookupKey)
      .filter(Boolean);
    const found = candidateKeys
      .map((key) => directory.get(key))
      .find(Boolean) as PushUserIdentity | undefined;
    if (found) return found;
    if (directName || directEmail || directRole) {
      return {
        id: String(
          item?.userId ||
            item?.uid ||
            item?.id ||
            directEmail ||
            directName ||
            "",
        ).trim(),
        name: directName,
        email: directEmail,
        role: directRole,
        source: "pushToken",
      };
    }
    return undefined;
  };

  const getPushUserDisplay = (
    identity?: PushUserIdentity,
    fallbackUserId?: string,
  ) => {
    if (!identity)
      return fallbackUserId ? `User ${fallbackUserId}` : "غير مرتبط بموظف";
    return (
      identity.name ||
      identity.email ||
      identity.id ||
      fallbackUserId ||
      "غير مرتبط بموظف"
    );
  };

  const getPushUserDisplayById = (userId?: string) => {
    const key = normalizePushLookupKey(userId);
    return getPushUserDisplay(
      key ? pushUserDirectory.get(key) : undefined,
      userId,
    );
  };

  const buildPushDeviceSnapshot = (
    item: any,
    index: number,
    source: "server" | "local" | "current",
    logs: PushEventLog[] = pushEventLogs,
    directory: Map<string, PushUserIdentity> = pushUserDirectory,
  ): PushDeviceSnapshot => {
    const now = Date.now();
    const token = String(item?.token || item?.id || "");
    const lastConnectionRaw =
      item?.lastConnection ||
      item?.connectedAt ||
      item?.createdAt ||
      item?.registeredAt ||
      item?.savedAtServer ||
      item?.savedAtClient ||
      item?.updatedAt ||
      item?.lastSeenAt ||
      item?.lastSeen ||
      "";
    const lastReadRaw =
      item?.lastRead ||
      item?.lastReadAt ||
      item?.lastOpenAt ||
      item?.lastSeenAt ||
      item?.lastSeen ||
      item?.updatedAt ||
      item?.savedAtServer ||
      item?.savedAtClient ||
      lastConnectionRaw ||
      "";
    const lastReadIso = normalizePushDateValue(lastReadRaw);
    const seenTime = lastReadIso ? new Date(lastReadIso).getTime() : NaN;
    const seenMinutes = Number.isFinite(seenTime)
      ? Math.floor((now - seenTime) / 60000)
      : 999999;
    const explicitActive =
      item?.active === true ||
      item?.enabled === true ||
      item?.permission === "granted" ||
      item?.notificationPermission === "granted";
    const explicitlyDisabled =
      item?.active === false ||
      item?.enabled === false ||
      item?.disabled === true ||
      item?.archived === true;
    const hasSavedTimestamp = Number.isFinite(seenTime);
    const status: PushDeviceSnapshot["status"] = !token
      ? "unknown"
      : explicitlyDisabled
        ? "abandoned"
        : hasSavedTimestamp
          ? seenMinutes > 60 * 24 * 45
            ? "abandoned"
            : seenMinutes > 60 * 24 * 14
              ? "cold"
              : "online"
          : explicitActive
            ? "unknown"
            : "unknown";
    const platformText = item?.platform ? String(item.platform) : undefined;
    const deviceTypeText = item?.deviceType
      ? String(item.deviceType)
      : undefined;
    const browserText = item?.browser
      ? String(item.browser)
      : item?.vendor
        ? String(item.vendor)
        : item?.userAgent
          ? String(item.userAgent).slice(0, 80)
          : undefined;
    const userIdText = String(
      item?.userId ||
        item?.uid ||
        item?.employeeId ||
        item?.staffId ||
        item?.adminId ||
        item?.partnerId ||
        item?.localId ||
        "",
    ).trim();
    const identity = resolvePushUserIdentity(item, directory);
    const ownerLabel = getPushUserDisplay(identity, userIdText);
    const rawDeviceLabel =
      source === "current"
        ? "Current browser"
        : String(
            item?.deviceLabel ||
              item?.label ||
              item?.platform ||
              item?.deviceType ||
              `Phone ${index + 1}`,
          );
    const deviceParts = [
      rawDeviceLabel,
      browserText &&
      !rawDeviceLabel.toLowerCase().includes(String(browserText).toLowerCase())
        ? browserText
        : "",
    ].filter(Boolean);
    const deviceLabel = deviceParts.join(" / ");
    const label =
      ownerLabel && ownerLabel !== "غير مرتبط بموظف"
        ? `${ownerLabel} — ${deviceLabel}`
        : deviceLabel;

    return {
      id: String(
        item?.id || item?.tokenHash || token || `${source}-device-${index}`,
      ),
      label,
      token: token || "Not available",
      platform: platformText,
      deviceType: deviceTypeText,
      browser: browserText,
      userId: userIdText || identity?.id || undefined,
      userName: identity?.name,
      userEmail: identity?.email,
      userRole: identity?.role,
      ownerLabel,
      deviceLabel,
      currentUrl: item?.currentUrl ? String(item.currentUrl) : undefined,
      lastConnection: formatPushHealthDate(lastConnectionRaw),
      lastRead: formatPushHealthDate(lastReadRaw),
      status,
      note: !token
        ? "No Push token recorded for this phone."
        : status === "abandoned"
          ? "Abandoned device: no fresh reading for more than 45 days."
          : status === "cold"
            ? "Cold device: no fresh reading for more than 14 days."
            : "Fresh reading within the normal window.",
      recentNotifications: getRecentPushNotifications(item, logs),
    };
  };

  const readLocalPushDeviceSnapshots = (
    logs: PushEventLog[] = pushEventLogs,
    directory: Map<string, PushUserIdentity> = pushUserDirectory,
  ): PushDeviceSnapshot[] => {
    if (typeof window === "undefined") return [];
    const token = localStorage.getItem("last_push_token") || "";
    const enabledAt = localStorage.getItem("push_enabled_at") || "";
    const refreshedAt = localStorage.getItem("push_last_silent_refresh") || "";
    const base = buildPushDeviceSnapshot(
      {
        id: "current-browser",
        label: "Current browser",
        token,
        platform: /iPhone|iPad|iPod/i.test(navigator.userAgent)
          ? "iPhone"
          : "web",
        userAgent: navigator.userAgent,
        vendor: navigator.vendor,
        lastConnection: enabledAt,
        lastRead: refreshedAt || enabledAt,
        currentUrl: window.location.href,
      },
      0,
      "current",
      logs,
      directory,
    );

    let extra: PushDeviceSnapshot[] = [];
    try {
      const raw =
        localStorage.getItem("alturath_push_devices_readonly") ||
        localStorage.getItem("push_devices_readonly") ||
        "";
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        extra = parsed.map((item: any, index: number) =>
          buildPushDeviceSnapshot(item, index, "local", logs, directory),
        );
      }
    } catch {}
    return [base, ...extra].filter(
      (item, index, arr) =>
        arr.findIndex((x) => x.token === item.token || x.id === item.id) ===
        index,
    );
  };

  const readAllPushDeviceSnapshots = async (
    logs: PushEventLog[] = pushEventLogs,
    directory: Map<string, PushUserIdentity> = pushUserDirectory,
  ): Promise<PushDeviceSnapshot[]> => {
    const localDevices = readLocalPushDeviceSnapshots(logs, directory);
    if (appMode !== "cloud" || !db) return localDevices;
    try {
      const snapshot = await getDocs(collection(db, "pushTokens"));
      const serverDevices = snapshot.docs.map((pushDoc, index) =>
        buildPushDeviceSnapshot(
          { id: pushDoc.id, ...pushDoc.data() },
          index,
          "server",
          logs,
          directory,
        ),
      );
      return [...serverDevices, ...localDevices]
        .filter(
          (item, index, arr) =>
            arr.findIndex((x) => x.token === item.token || x.id === item.id) ===
            index,
        )
        .sort((a, b) => getPushDeviceScore(b) - getPushDeviceScore(a));
    } catch (error) {
      console.warn(
        "[Push] read all devices failed, showing local snapshot only:",
        error,
      );
      return localDevices;
    }
  };

  const runPushHealthCheck = async () => {
    setCheckingPushHealth(true);
    try {
      const status = await getPushSupportStatus();
      if (status.permission === "granted") {
        await refreshPushRegistrationIfAlreadyAllowed({
          userId: auth?.currentUser?.uid || "admin",
          restaurantId: "kitchen_default",
        }).catch(() => null);
      }

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("last_push_token") || ""
          : "";
      const enabledAt =
        typeof window !== "undefined"
          ? localStorage.getItem("push_enabled_at")
          : "";
      const refreshedAt =
        typeof window !== "undefined"
          ? localStorage.getItem("push_last_silent_refresh")
          : "";
      let serviceWorkerState = status.hasServiceWorker ? "مدعوم" : "غير مدعوم";
      try {
        if (typeof navigator !== "undefined" && navigator.serviceWorker) {
          const registration = await navigator.serviceWorker.getRegistration(
            "/firebase-messaging-sw.js",
          );
          serviceWorkerState = registration
            ? registration.active
              ? "نشط"
              : "مسجل وينتظر التفعيل"
            : "غير مسجل";
        }
      } catch {
        serviceWorkerState = "تعذر الفحص";
      }

      const ready =
        status.supported &&
        status.permission === "granted" &&
        Boolean(token) &&
        serviceWorkerState !== "غير مسجل";
      const blocked = status.permission === "denied" || !status.supported;
      const realPushEvents = await readRealPushEventLogs();
      setPushEventLogs(realPushEvents);
      const userDirectory = await readPushUserDirectory();
      setPushUserDirectory(userDirectory);
      const allDevices = await readAllPushDeviceSnapshots(
        realPushEvents,
        userDirectory,
      );
      setPushDevices(allDevices);
      setExpandedPushDeviceId(null);
      setPushDeviceTab("all");
      setExpandedPushDeviceGroup("active");
      setPushDevicesPanelOpen(true);
      setPushHealth({
        support: status.supported ? "مدعوم" : "غير مدعوم",
        permission:
          status.permission === "granted"
            ? "مسموح"
            : status.permission === "denied"
              ? "محظور"
              : "بانتظار السماح",
        token: token || "Not available",
        lastRegistration: formatPushHealthDate(refreshedAt || enabledAt || ""),
        serviceWorker: serviceWorkerState,
        verdict: ready
          ? "جاهز لاستقبال Push"
          : blocked
            ? "يحتاج تفعيل من المتصفح"
            : "يحتاج تفعيل/تجديد",
        tone: ready ? "success" : blocked ? "danger" : "warning",
      });
    } finally {
      setCheckingPushHealth(false);
    }
  };

  const handleResetData = async () => {
    if (isResetting) return;
    setIsResetting(true);
    addToast("جاري التصفير", "يتم حفظ نسخة أمان ثم تنظيف البيانات.", "info");
    try {
      const hasRealData =
        (data.invoices && data.invoices.length > 0) ||
        (data.products && data.products.length > 0) ||
        (data.customers && data.customers.length > 0);
      if (hasRealData) {
        if (appMode === "cloud") {
          setProtectedStorageItem(
            "ktk_cloud_offline_snapshot_safety_restore",
            JSON.stringify(data),
          );
          setProtectedStorageItem(
            "ktk_cloud_offline_snapshot_last_good",
            JSON.stringify(data),
          );
        }
      }

      const currentUser = auth.currentUser;
      if (appMode === "cloud" && currentUser) {
        try {
          const generationId = `admin-data-reset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          try {
            localStorage.setItem("ktk_admin_data_generation_id", generationId);
          } catch {}
          const SHARDED_KEYS = [
            "invoices",
            "orders",
            "customers",
            "expenses",
            "testimonials",
            "products",
            "supplierCopies",
            "pulseAnalysisHistory",
            "pulseReviews",
            "campaigns",
            "squads",
            "promocodes",
            "aiLearningMemory",
            "pulseArchiveAnalysis",
            "deepArchiveAnalysis",
            "nameMatchMemory",
          ];
          const dataRef = getSmartDoc(
            "appData",
            currentUser.uid,
            currentUser.email,
          );
          const cleanRoot: any = { ...INITIAL_DATA };
          cleanRoot.__adminDataGenerationId = generationId;
          cleanRoot.__adminLastAuthoritativeWriteAt = new Date().toISOString();
          SHARDED_KEYS.forEach((key) => {
            if (key !== "products" && cleanRoot[key] !== undefined)
              cleanRoot[key] = [];
          });
          await setDoc(dataRef, JSON.parse(JSON.stringify(cleanRoot)), {
            merge: false,
          });

          await Promise.all(
            SHARDED_KEYS.map(async (key) => {
              try {
                const shardRef = getSmartDoc(
                  "appData",
                  currentUser.uid,
                  currentUser.email,
                  `shards/${key}`,
                );
                await setDoc(
                  shardRef,
                  { [key]: [], isCompressed: false },
                  { merge: false },
                );
              } catch (e) {
                console.warn(`Shard ${key} skip:`, e);
              }
            }),
          );

          const squadsSnap = await getDocs(collection(db, "squads"));
          let batch = writeBatch(db);
          let batchCount = 0;
          for (const squadDoc of squadsSnap.docs) {
            batch.delete(squadDoc.ref);
            batchCount += 1;
            if (batchCount >= 450) {
              await batch.commit();
              batch = writeBatch(db);
              batchCount = 0;
            }
          }
          if (batchCount > 0) await batch.commit();
        } catch (cloudErr) {
          console.error("Cloud reset failed:", cloudErr);
          if (
            String(cloudErr).includes("permissions") ||
            String(cloudErr).includes("permission-denied")
          ) {
            throw new Error("FIRESTORE_PERMISSION_DENIED");
          }
          throw cloudErr;
        }
      }

      setData(INITIAL_DATA);
      removeProtectedStorageItemIntentionally("ktk_local_accounting_data");
      removeProtectedStorageItemIntentionally(
        "ktk_local_accounting_data_last_good",
      );
      removeProtectedStorageItemIntentionally(
        "ktk_local_accounting_data_backup",
      );
      removeProtectedStorageItemIntentionally(
        "ktk_local_accounting_data_safety_restore",
      );
      removeProtectedStorageItemIntentionally("ktk_accounting_data");
      removeProtectedStorageItemIntentionally("ktk_accounting_data_last_good");
      removeProtectedStorageItemIntentionally("ktk_accounting_data_backup");
      removeProtectedStorageItemIntentionally("ktk_cloud_offline_snapshot");
      removeProtectedStorageItemIntentionally(
        "ktk_cloud_offline_snapshot_last_good",
      );
      sessionStorage.removeItem("hideSampleDataPrompt");
      localStorage.removeItem("active_firestore_db_id");
      localStorage.removeItem("active_firestore_project_id");

      addToast(
        "تم التصفير",
        appMode === "cloud"
          ? "تمت العملية بنجاح وحُفظت نسخة أمان."
          : "تم مسح كافة البيانات من النظام المحلي بلا رجعة.",
        "warning",
      );
      setShowResetConfirm(false);
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (e) {
      console.error("Reset failed:", e);
      const msg = String(e);
      const isPermission =
        msg.includes("FIRESTORE_PERMISSION_DENIED") ||
        msg.includes("permissions") ||
        msg.includes("permission-denied");
      addToast(
        "تعذر التصفير",
        isPermission
          ? "Firestore رفض التصفير لهذا الحساب. تأكد من صلاحيات المشرف أو تفعيل المساحة الفردية."
          : "لم يتم مسح البيانات. جرّب مرة أخرى.",
        "warning",
      );
    } finally {
      setIsResetting(false);
    }
  };

  const handleRestoreBackup = () => {
    try {
      const backupKey =
        appMode === "local"
          ? "ktk_local_accounting_data_safety_restore"
          : "ktk_cloud_offline_snapshot_safety_restore";
      let backupStr = getProtectedStorageItem(backupKey);

      // Strict separation: Cloud mode never falls back to legacy/local backup keys
      if (!backupStr && appMode === "local") {
        backupStr =
          getProtectedStorageItem("ktk_local_accounting_data_backup") ||
          getProtectedStorageItem("ktk_accounting_data_backup");
      }

      if (backupStr) {
        const parsed = JSON.parse(backupStr);
        setData(parsed);
        sessionStorage.setItem("hideSampleDataPrompt", "true");
        setShowRestoreConfirm(false);
        addToast(
          appMode === "cloud"
            ? "تمت استعادة البيانات السحابية"
            : "تمت استعادة البيانات الأخيرة",
          appMode === "cloud"
            ? "تم استرجاع نسخة البيانات السحابية الاحتياطية بنجاح ☁️"
            : "تم استرجاع كافة مبيعاتك وعملائك وعملياتك من النسخة الاحتياطية بنجاح ⛑️",
          "success",
        );
      } else {
        if (appMode === "cloud") {
          setShowRestoreConfirm(false);
          addToast(
            "لا توجد نسخة سحابية",
            "عفواً، لم نجد نسخة احتياطية سحابية محفوظة سابقاً في هذا الموقع.",
            "warning",
          );
        } else {
          const demo = GET_DEMO_DATA();
          setData(demo);
          sessionStorage.setItem("hideSampleDataPrompt", "true");
          setShowRestoreConfirm(false);
          addToast(
            "تم ملء البيانات التجريبية",
            "ما لقينا نسخة احتياطية سابقة بالمتصفح، فملأنا لك النظام ببيانات ترويجية جاهزة للاستكشاف والتحليل.",
            "info",
          );
        }
      }
    } catch (e) {
      console.error("Restore error", e);
      addToast(
        "فشلت الاستعادة",
        "حدث خطأ غير متوقع أثناء تفكيك بيانات النسخة الاحتياطية.",
        "warning",
      );
    }
  };

  // removed handleSave

  const handleDownload = () => {
    const wb = XLSX.utils.book_new();
    const safe = (v: any) => (v === undefined || v === null ? "" : v);
    const json = (v: any) => {
      if (v === undefined || v === null) return "";
      const str = JSON.stringify(v);
      return str.length > 32000 ? str.slice(0, 32000) + "... (truncated)" : str;
    };
    const createChunkedSheet = (val: any) => {
      const s = val === undefined || val === null ? "" : JSON.stringify(val);
      const chunks = s.match(/[\s\S]{1,30000}/g) || [""];
      return XLSX.utils.json_to_sheet(
        chunks.map((chunk, index) => ({ part: index + 1, chunk })),
      );
    };
    const addressText = (addr: any, fallbackArea?: string) => {
      const normalized = normalizeAddressObject(addr);
      const full = formatFullAddress(normalized);
      return full || fallbackArea || "";
    };
    const itemName = (it: any) =>
      (data?.products || []).find((p) => p.id === it.productId)?.name ||
      it.name ||
      it.productName ||
      it.productId ||
      "";
    const customerById = new Map(
      (data?.customers || []).map((c: any) => [c.id, c]),
    );
    const customerByPhone = new Map(
      (data?.customers || [])
        .filter((c: any) => c.phone)
        .map((c: any) => [String(c.phone), c]),
    );
    const normalizeExportProduct = (product: any) => ({
      ...product,
      category: product?.category || "",
      productCategory: product?.category || "",
      addons: json(Array.isArray(product?.addons) ? product.addons : []),
      addOns: json(Array.isArray(product?.addOns) ? product.addOns : []),
      extras: json(Array.isArray(product?.extras) ? product.extras : []),
      rawProduct: json(product),
    });

    const invoiceRows = (data?.invoices || []).map((i: any) => {
      const c: any =
        customerById.get(i.customerId) ||
        customerByPhone.get(String(i.customerPhone || "")) ||
        {};
      const snap = i.deliveryAddressSnapshot || {};
      const addr = i.address || c.address || c.detailedAddress;

      const areaVal =
        snap.area || i.area || addr?.region || addr?.area || c.area || "";
      const blockVal = snap.block || i.block || addr?.block || "";
      const streetVal = snap.street || i.street || addr?.street || "";
      const avenueVal =
        snap.avenue || i.avenue || i.addressJaddah || addr?.jaddah || "";
      const houseVal =
        snap.house || i.house || addr?.building || addr?.house || "";
      const floorVal = snap.floor || i.floor || addr?.floor || "";
      const apartmentVal =
        snap.apartment || i.apartment || addr?.apartment || "";
      const calculatedAddressFull =
        i.fullAddress ||
        snap.fullAddress ||
        addressText(addr, i.area || c.area);

      return {
        id: i.id,
        date: i.date,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
        customerId: i.customerId,
        customerName: i.customerName || c.name || "",
        customerPhone: i.customerPhone || c.phone || "",
        status: i.status,
        paymentStatus: i.paymentStatus,
        paymentMethod: i.paymentMethod,
        paymentId: i.paymentId,
        paymentLink: i.paymentLink,
        totalAmount: i.totalAmount,
        subtotal: (i.items || []).reduce(
          (a: number, it: any) =>
            a + Number((it.priceAtTime ?? it.price ?? 0) * (it.quantity || 0)),
          0,
        ),
        deliveryFee: i.deliveryFee,
        gatewayFee: i.gatewayFee,
        discount: i.discount,
        totalCost: i.totalCost,
        profit: i.profit,
        notes: i.notes,
        appliedPromoCodeName: i.appliedPromoCodeName,
        deliveryType: i.deliveryType,
        deliveryCompany: i.deliveryInfo?.company || "",
        deliveryInfo: json(i.deliveryInfo),
        area: areaVal,
        addressFull: calculatedAddressFull,
        addressRegion: areaVal,
        addressArea: areaVal,
        addressBlock: blockVal,
        addressStreet: streetVal,
        addressJaddah: avenueVal,
        addressBuilding: houseVal,
        addressFloor: floorVal,
        addressApartment: apartmentVal,
        addressNotes: addr?.notes || addr?.addressNotes || "",
        المنطقة: areaVal,
        القطعة: blockVal,
        الشارع: streetVal,
        الجادة: avenueVal,
        المنزل: houseVal,
        الدور: floorVal,
        الشقة: apartmentVal,
        "العنوان الكامل": calculatedAddressFull,
        splitParticipants: json(i.splitParticipants),
        splitPayments: json(i.splitPayments),
        rouletteLoser: i.rouletteLoser,
        rawAddress: json(addr),
        items: json(i.items || []),
        rawInvoice: json(i),
      };
    });
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(invoiceRows),
      "Invoices",
    );

    const invoiceItems = (data?.invoices || []).flatMap((i: any) =>
      (i.items || []).map((it: any, idx: number) => ({
        invoiceId: i.id,
        invoiceDate: i.date,
        customerId: i.customerId,
        productId: it.productId,
        productName: itemName(it),
        quantity: it.quantity,
        priceAtTime: it.priceAtTime ?? it.price,
        costAtTime: it.costAtTime ?? it.cost,
        lineTotal: Number(
          (it.priceAtTime ?? it.price ?? 0) * (it.quantity || 0),
        ),
        itemNotes: it.itemNotes || it.notes || "",
        addons: json(it.addons),
        rawItem: json(it),
        itemIndex: idx + 1,
      })),
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(invoiceItems),
      "InvoiceItems",
    );

    const payerRows = (data?.invoices || []).flatMap((i: any) => {
      const payments = Array.isArray(i.splitPayments) ? i.splitPayments : [];
      const participants = Array.isArray(i.splitParticipants)
        ? i.splitParticipants
        : [];
      const merged = payments.length ? payments : participants;
      return merged.map((sp: any, idx: number) => {
        const obj = typeof sp === "object" ? sp : { name: sp };
        return {
          invoiceId: i.id,
          invoiceDate: i.date,
          name: obj.name || obj.customerName || "",
          phone: obj.phone || obj.customerPhone || "",
          amount: obj.amount || obj.paidAmount || obj.value || "",
          status: obj.status || obj.paymentStatus || i.paymentStatus || "",
          paidAt: obj.paidAt || obj.date || "",
          loyaltyPoints:
            obj.loyaltyPoints ||
            obj.points ||
            Math.floor(Number(obj.amount || obj.paidAmount || 0)),
          customerId: obj.customerId || "",
          rawPayer: json(obj),
          payerIndex: idx + 1,
        };
      });
    });
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(payerRows),
      "Payers",
    );

    const orderRows = (data?.orders || []).map((o: any) => {
      const c: any =
        customerById.get(o.customerId) ||
        customerByPhone.get(String(o.customerPhone || "")) ||
        {};
      const snap = o.deliveryAddressSnapshot || {};
      const addr = o.address || c.address || c.detailedAddress;

      const areaVal =
        snap.area ||
        o.area ||
        o.regionId ||
        addr?.region ||
        addr?.area ||
        c.area ||
        "";
      const blockVal = snap.block || o.block || addr?.block || "";
      const streetVal = snap.street || o.street || addr?.street || "";
      const avenueVal =
        snap.avenue || o.avenue || o.addressJaddah || addr?.jaddah || "";
      const houseVal =
        snap.house || o.house || addr?.building || addr?.house || "";
      const floorVal = snap.floor || o.floor || addr?.floor || "";
      const apartmentVal =
        snap.apartment || o.apartment || addr?.apartment || "";
      const calculatedAddressFull =
        o.fullAddress ||
        snap.fullAddress ||
        addressText(addr, o.area || o.regionId || c.area);

      return {
        ...o,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        addressFull: calculatedAddressFull,
        address: json(o.address),
        items: json(o.items),
        splitParticipants: json(o.splitParticipants),
        splitPayments: json(o.splitPayments),
        area: areaVal,
        block: blockVal,
        street: streetVal,
        avenue: avenueVal,
        house: houseVal,
        floor: floorVal,
        apartment: apartmentVal,
        المنطقة: areaVal,
        القطعة: blockVal,
        الشارع: streetVal,
        الجادة: avenueVal,
        المنزل: houseVal,
        الدور: floorVal,
        الشقة: apartmentVal,
        "العنوان الكامل": calculatedAddressFull,
        rawOrder: json(o),
      };
    });
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(orderRows),
      "Orders",
    );

    const customerRows = (data?.customers || []).map((c: any) => {
      const addr = c.address || c.detailedAddress;
      return {
        ...c,
        addressFull: addressText(addr, c.area),
        addressRegion: addr?.region || "",
        addressArea: addr?.area || c.area || "",
        addressBlock: addr?.block || "",
        addressStreet: addr?.street || "",
        addressJaddah: addr?.jaddah || "",
        addressBuilding: addr?.building || addr?.house || "",
        addressFloor: addr?.floor || "",
        addressApartment: addr?.apartment || "",
        addressNotes: addr?.notes || "",
        address: json(addr),
        rawCustomer: json(c),
      };
    });
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(customerRows),
      "Customers",
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        (data?.products || []).map(normalizeExportProduct),
      ),
      "Products",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        (
          (data as any)?.productCategories ||
          (data as any)?.settings?.productCategories ||
          []
        ).map((name: string, index: number) => ({ id: index + 1, name })),
      ),
      "ProductCategories",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data?.suppliers || []),
      "Suppliers",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data?.supplierTransfers || []),
      "SupplierTransfers",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data?.zones || []),
      "Zones",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data?.expenses || []),
      "Expenses",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data?.testimonials || []),
      "Testimonials",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data?.pulseAnalysisHistory || []),
      "PulseHistory",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data?.pulseReviews || []),
      "QuickPulse",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data?.campaigns || []),
      "SmartCampaigns",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data?.squads || []),
      "Diwaniyas",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet((data as any)?.promocodes || []),
      "PromoCodes",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet((data as any)?.squadTiers || []),
      "SquadTiers",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet((data as any)?.diwaniyaTiers || []),
      "DiwaniyaTiers",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet((data as any)?.aiLearningMemory || []),
      "SmartLearningMemory",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet((data as any)?.notifications || []),
      "Notifications",
    );
    const whatsappQuickRepliesForBackup = readWhatsAppQuickRepliesForBackup();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(whatsappQuickRepliesForBackup),
      WHATSAPP_QUICK_REPLIES_SHEET,
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([(data as any)?.loyaltySettings || {}]),
      "LoyaltySettings",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([(data as any)?.activeGoal || {}]),
      "ActiveGoal",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([(data as any)?.settings || {}]),
      "Settings",
    );
    XLSX.utils.book_append_sheet(
      wb,
      createChunkedSheet((data as any)?.pulseArchiveAnalysis || null),
      "PulseArchiveAnalysis",
    );
    XLSX.utils.book_append_sheet(
      wb,
      createChunkedSheet((data as any)?.deepArchiveAnalysis || null),
      "DeepArchiveAnalysis",
    );
    XLSX.utils.book_append_sheet(
      wb,
      createChunkedSheet((data as any)?.nameMatchMemory || {}),
      "NameMatchMemory",
    );

    const fullStateJson = JSON.stringify(data || {});
    const fullStateChunks = fullStateJson.match(/[\s\S]{1,30000}/g) || ["{}"];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        fullStateChunks.map((chunk, index) => ({ part: index + 1, chunk })),
      ),
      "FullState",
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        {
          exportedAt: new Date().toISOString(),
          invoices: invoiceRows.length,
          invoiceItems: invoiceItems.length,
          customers: customerRows.length,
          payers: payerRows.length,
          orders: orderRows.length,
          products: (data?.products || []).length,
          suppliers: (data?.suppliers || []).length,
          expenses: (data?.expenses || []).length,
          whatsappQuickReplies: whatsappQuickRepliesForBackup.length,
          exportedSheets: (Array.isArray(wb.SheetNames)
            ? wb.SheetNames
            : []
          ).join(", "),
        },
      ]),
      "Summary",
    );
    XLSX.writeFile(
      wb,
      `KTK_Full_Backup_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const isJson = file.name.endsWith(".json");

    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (!result) throw new Error("File result is empty");

        if (isJson) {
          const importedData = JSON.parse(result as string);

          if (importedData && typeof importedData === "object") {
            // VALIDATE JSON is actually an app backup
            const hasValidKeys =
              Array.isArray(importedData.products) ||
              Array.isArray(importedData.invoices) ||
              Array.isArray(importedData.orders) ||
              Array.isArray(importedData.customers);
            if (!hasValidKeys) {
              addToast(
                "فشل الاستيراد",
                "هذا الملف ليس نسخة احتياطية صالحة للنظام. لم يتم تغيير أي بيانات.",
                "warning",
              );
              return;
            }
            let processedZones = INITIAL_DATA.zones;
            if (importedData.zones) {
              const hasOldZones = importedData.zones.some((z: any) =>
                [
                  "الشويخ التجارية",
                  "المقبرة",
                  "أم العيش",
                  "الحزام الأخضر",
                  "الصليبية الزراعية",
                  "الصليبية الصناعية",
                ].includes(z.name),
              );
              if (hasOldZones) {
                const zoneMap = new Map(
                  importedData.zones.map((z: any) => [z.name, z]),
                );
                processedZones = INITIAL_DATA.zones.map((z) => {
                  const existing = zoneMap.get(z.name) as any;
                  return existing
                    ? {
                        ...z,
                        cost: existing.cost,
                        profit: existing.profit,
                        finalPrice: existing.finalPrice,
                        isActive: existing.isActive,
                      }
                    : z;
                });
              } else {
                processedZones = [...importedData.zones].sort(
                  (a: any, b: any) => a.name.localeCompare(b.name, "ar"),
                );
              }
            }

            const validatedData: AppState = {
              ...INITIAL_DATA,
              ...importedData,
              zones: processedZones,
            };
            if (appMode === "cloud" && onCloudImport) {
              addToast(
                "جاري الرفع سحابياً",
                "يتم مزامنة النسخة الاحتياطية سحابياً لتلافي الفقدان...",
                "info",
              );
              onCloudImport(validatedData)
                .then(() => {
                  addToast(
                    "تمت العملية",
                    "تم استيراد النسخة ومزامنتها سحابياً بنجاح ✨",
                    "success",
                  );
                })
                .catch((err) => {
                  console.error("Cloud import failed:", err);
                  addToast(
                    "فشل الحفظ",
                    "فشل تخزين النسخة سحابياً: " +
                      (err instanceof Error ? err.message : String(err)),
                    "warning",
                  );
                });
            } else {
              setData(validatedData);
              addToast(
                "تمت العملية",
                "تم استيراد البيانات والتحليلات محلياً بنجاح",
                "success",
              );
            }
          } else {
            throw new Error("Invalid JSON structure");
          }
        } else {
          const dataArray = new Uint8Array(result as ArrayBuffer);
          const workbook = XLSX.read(dataArray, { type: "array" });

          // VALIDATE XLSX is actually a KT backup (must contain at least one known sheet)
          const knownSheets = [
            "FullState",
            "Invoices",
            "Products",
            "Orders",
            "Customers",
            "Summary",
            "Expenses",
            WHATSAPP_QUICK_REPLIES_SHEET,
          ];
          const hasKnownSheet = workbook.SheetNames.some((s) =>
            knownSheets.includes(s),
          );
          if (!hasKnownSheet) {
            addToast(
              "فشل الاستيراد",
              "ملف Excel غير متوافق. الرجاء رفع نسخة احتياطية صحيحة.",
              "warning",
            );
            return;
          }

          const safeSheetToObj = (sheetName: string) => {
            if (workbook.SheetNames.includes(sheetName)) {
              return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) || [];
            }
            return [];
          };

          const parseSafeJson = (str: any, isArray: boolean = false) => {
            if (isArray && Array.isArray(str)) return str;
            if (typeof str !== "string") return isArray ? [] : str || null;
            let cleanStr = str.replace(/[“”]/g, '"');
            let result;
            try {
              result = JSON.parse(cleanStr);
            } catch (e1) {
              try {
                const deCsv = cleanStr
                  .substring(
                    cleanStr.startsWith('"') ? 1 : 0,
                    cleanStr.endsWith('"')
                      ? cleanStr.length - 1
                      : cleanStr.length,
                  )
                  .replace(/""/g, '"');
                result = JSON.parse(deCsv);
              } catch (e2) {
                try {
                  result = new Function("return" + cleanStr)();
                } catch (e3) {
                  return isArray ? [] : null;
                }
              }
            }
            if (typeof result === "string") {
              try {
                result = JSON.parse(result);
              } catch (e4) {
                try {
                  result = new Function("return" + result)();
                } catch (e5) {}
              }
            }
            if (isArray && !Array.isArray(result)) return [];
            return result;
          };

          const parseChunkedSheet = (
            sheetName: string,
            isArray: boolean = false,
          ) => {
            if (!workbook.SheetNames.includes(sheetName))
              return isArray ? [] : null;
            const rows = (safeSheetToObj(sheetName) || []) as any[];
            if (!Array.isArray(rows) || rows.length === 0)
              return isArray ? [] : null;
            const hasChunk = rows.some((r: any) => r.chunk !== undefined);
            if (hasChunk) {
              const joined = rows
                .sort(
                  (a: any, b: any) => Number(a.part || 0) - Number(b.part || 0),
                )
                .map((row: any) => String(row.chunk || ""))
                .join("");
              return parseSafeJson(joined, isArray);
            }
            return parseSafeJson(rows[0]?.value, isArray);
          };

          const stripUndefined = (obj: any): any => {
            if (Array.isArray(obj)) return obj.map(stripUndefined);
            if (obj && typeof obj === "object") {
              const cleaned: any = {};
              for (const key in obj) {
                if (obj[key] !== undefined) {
                  cleaned[key] = stripUndefined(obj[key]);
                }
              }
              return cleaned;
            }
            return obj;
          };

          const makeAddressFromRow = (row: any) => {
            const parsed =
              normalizeAddressObject(parseSafeJson(row.address, false)) ||
              normalizeAddressObject(parseSafeJson(row.rawAddress, false)) ||
              normalizeAddressObject(parseSafeJson(row.detailedAddress, false));
            if (
              parsed &&
              typeof parsed === "object" &&
              !Array.isArray(parsed) &&
              !parsed.fullText
            )
              return parsed;
            const fullText = parsed?.fullText || row.addressFull || "";
            const address = {
              region:
                row.addressRegion ||
                row.region ||
                row.governorate ||
                row.area ||
                "",
              area: row.addressArea || row.area || "",
              block: row.addressBlock || row.block || "",
              street: row.addressStreet || row.street || "",
              jaddah: row.addressJaddah || row.jaddah || "",
              building: row.addressBuilding || row.building || row.house || "",
              floor: row.addressFloor || row.floor || "",
              apartment: row.addressApartment || row.apartment || "",
              notes: row.addressNotes || row.notesAddress || "",
            };
            return Object.values(address).some(Boolean)
              ? address
              : fullText
                ? { fullText }
                : undefined;
          };
          const restoreCustomerRow = (row: any) => {
            const raw = parseSafeJson(row.rawCustomer, false);
            const base =
              raw && typeof raw === "object" ? { ...raw, ...row } : { ...row };
            const address = makeAddressFromRow(row);
            delete base.rawCustomer;
            delete base.addressFull;
            if (address) base.address = address;
            return stripUndefined(base);
          };
          const restoreProductRow = (row: any) => {
            const raw = parseSafeJson(row.rawProduct, false);
            const base =
              raw && typeof raw === "object" ? { ...raw, ...row } : { ...row };
            const addons = parseSafeJson(row.addons, true);
            const addOns = parseSafeJson(row.addOns, true);
            const extras = parseSafeJson(row.extras, true);
            if (addons.length) base.addons = addons;
            if (addOns.length) base.addOns = addOns;
            if (extras.length) base.extras = extras;
            delete base.rawProduct;
            return stripUndefined(base);
          };

          let baseState: any = {};
          if (workbook.SheetNames.includes("FullState")) {
            const fullStateRows = (safeSheetToObj("FullState") || []) as any[];
            const joinedJson = (
              Array.isArray(fullStateRows) ? fullStateRows : []
            )
              .sort(
                (a: any, b: any) => Number(a.part || 0) - Number(b.part || 0),
              )
              .map((row: any) => String(row.chunk || ""))
              .join("");
            if (joinedJson.trim()) {
              baseState = JSON.parse(joinedJson);
            }
          }

          const newState: AppState = {
            ...INITIAL_DATA,
            ...baseState,
            products: workbook.SheetNames.includes("Products")
              ? ((safeSheetToObj("Products") as any[]).map(
                  restoreProductRow,
                ) as any as Product[])
              : baseState.products || data.products || INITIAL_DATA.products,
            customers: workbook.SheetNames.includes("Customers")
              ? ((safeSheetToObj("Customers") as any[]).map(
                  restoreCustomerRow,
                ) as any as Customer[])
              : baseState.customers || data.customers || INITIAL_DATA.customers,
            invoices:
              baseState.invoices || data.invoices || INITIAL_DATA.invoices,
            orders: baseState.orders || data.orders || INITIAL_DATA.orders,
            zones: baseState.zones || data.zones || INITIAL_DATA.zones,
            supplierTransfers:
              baseState.supplierTransfers ||
              data.supplierTransfers ||
              INITIAL_DATA.supplierTransfers,
            expenses: workbook.SheetNames.includes("Expenses")
              ? (stripUndefined(safeSheetToObj("Expenses")) as any as Expense[])
              : baseState.expenses || [],
            suppliers: workbook.SheetNames.includes("Suppliers")
              ? (stripUndefined(
                  safeSheetToObj("Suppliers"),
                ) as any as Supplier[])
              : baseState.suppliers || [],
            testimonials: workbook.SheetNames.includes("Testimonials")
              ? (stripUndefined(
                  safeSheetToObj("Testimonials"),
                ) as any as Testimonial[])
              : baseState.testimonials || [],
            pulseAnalysisHistory: workbook.SheetNames.includes("PulseHistory")
              ? (stripUndefined(
                  safeSheetToObj("PulseHistory"),
                ) as any as PulseAnalysisRecord[])
              : baseState.pulseAnalysisHistory || [],
            pulseReviews: workbook.SheetNames.includes("QuickPulse")
              ? (stripUndefined(safeSheetToObj("QuickPulse")) as any as any[])
              : baseState.pulseReviews || [],
            campaigns: (() => {
              const legacy = "A" + "ICampaigns";
              const sheet = workbook.SheetNames.includes("SmartCampaigns")
                ? "SmartCampaigns"
                : workbook.SheetNames.includes(legacy)
                  ? legacy
                  : "";
              return sheet
                ? (stripUndefined(safeSheetToObj(sheet)) as any as AICampaign[])
                : baseState.campaigns || [];
            })(),
            promocodes: workbook.SheetNames.includes("PromoCodes")
              ? (stripUndefined(safeSheetToObj("PromoCodes")) as any)
              : baseState.promocodes || [],
            squads: workbook.SheetNames.includes("Diwaniyas")
              ? (stripUndefined(safeSheetToObj("Diwaniyas")) as any)
              : baseState.squads || [],
            squadTiers: workbook.SheetNames.includes("SquadTiers")
              ? (stripUndefined(safeSheetToObj("SquadTiers")) as any)
              : baseState.squadTiers || [],
            diwaniyaTiers: workbook.SheetNames.includes("DiwaniyaTiers")
              ? (stripUndefined(safeSheetToObj("DiwaniyaTiers")) as any)
              : baseState.diwaniyaTiers || [],
            aiLearningMemory: (() => {
              const legacy = "A" + "ILearningMemory";
              const sheet = workbook.SheetNames.includes("SmartLearningMemory")
                ? "SmartLearningMemory"
                : workbook.SheetNames.includes(legacy)
                  ? legacy
                  : "";
              return sheet
                ? (stripUndefined(safeSheetToObj(sheet)) as any)
                : baseState.aiLearningMemory || [];
            })(),
            notifications: workbook.SheetNames.includes("Notifications")
              ? (stripUndefined(safeSheetToObj("Notifications")) as any)
              : baseState.notifications || [],
            loyaltySettings: workbook.SheetNames.includes("LoyaltySettings")
              ? ((safeSheetToObj("LoyaltySettings") as any[])[0] as any) ||
                baseState.loyaltySettings ||
                (INITIAL_DATA as any).loyaltySettings
              : baseState.loyaltySettings ||
                (INITIAL_DATA as any).loyaltySettings,
            activeGoal: workbook.SheetNames.includes("ActiveGoal")
              ? ((safeSheetToObj("ActiveGoal") as any[])[0] as any) ||
                baseState.activeGoal
              : baseState.activeGoal,
            pulseArchiveAnalysis: workbook.SheetNames.includes(
              "PulseArchiveAnalysis",
            )
              ? parseChunkedSheet("PulseArchiveAnalysis", false)
              : baseState.pulseArchiveAnalysis,
            deepArchiveAnalysis: workbook.SheetNames.includes(
              "DeepArchiveAnalysis",
            )
              ? parseChunkedSheet("DeepArchiveAnalysis", false)
              : baseState.deepArchiveAnalysis,
            nameMatchMemory: workbook.SheetNames.includes("NameMatchMemory")
              ? parseChunkedSheet("NameMatchMemory", false) || {}
              : baseState.nameMatchMemory || {},
            settings:
              (workbook.SheetNames.includes("Settings")
                ? ((safeSheetToObj("Settings") as any[])[0] as any)
                : null) ||
              baseState.settings ||
              data.settings ||
              INITIAL_DATA.settings,
          };

          const restoredWhatsAppQuickRepliesCount =
            workbook.SheetNames.includes(WHATSAPP_QUICK_REPLIES_SHEET)
              ? restoreWhatsAppQuickRepliesFromBackup(
                  safeSheetToObj(WHATSAPP_QUICK_REPLIES_SHEET) as any[],
                )
              : 0;

          if (workbook.SheetNames.includes("Invoices")) {
            const invoiceItemsRows = safeSheetToObj("InvoiceItems") as any[];
            const invoiceItemsByInvoice = new Map<string, any[]>();
            invoiceItemsRows.forEach((row: any) => {
              const invoiceId = String(row.invoiceId || "").trim();
              if (!invoiceId) return;
              const rawItem = parseSafeJson(row.rawItem, false);
              const restoredItem =
                rawItem && typeof rawItem === "object"
                  ? { ...rawItem }
                  : {
                      productId: row.productId,
                      quantity: Number(row.quantity || 1),
                      priceAtTime: Number(row.priceAtTime || 0),
                      costAtTime: Number(row.costAtTime || 0),
                      itemNotes: row.itemNotes || "",
                      addons: parseSafeJson(row.addons, true),
                    };
              if (!invoiceItemsByInvoice.has(invoiceId))
                invoiceItemsByInvoice.set(invoiceId, []);
              invoiceItemsByInvoice
                .get(invoiceId)!
                .push(stripUndefined(restoredItem));
            });
            const invoicesSheet = workbook.Sheets["Invoices"];
            const rawInvoices = XLSX.utils.sheet_to_json(
              invoicesSheet,
            ) as any[];
            newState.invoices = rawInvoices.map((inv) => {
              const isDeleted =
                inv.isDeleted === true ||
                inv.isDeleted === "TRUE" ||
                inv.isDeleted === "true";
              const parsedItems = parseSafeJson(inv.items, true);
              const itemRows =
                invoiceItemsByInvoice.get(String(inv.id || "").trim()) || [];
              const parsedAddress =
                parseSafeJson(inv.address, false) ||
                parseSafeJson(inv.rawAddress, false) ||
                makeAddressFromRow(inv) ||
                inv.address;
              const parsedDeliveryInfo =
                parseSafeJson(inv.deliveryInfo, false) || inv.deliveryInfo;

              return stripUndefined({
                ...inv,
                isDeleted,
                items: parsedItems.length ? parsedItems : itemRows,
                address:
                  typeof parsedAddress === "object"
                    ? parsedAddress
                    : inv.address,
                deliveryInfo:
                  typeof parsedDeliveryInfo === "object" &&
                  parsedDeliveryInfo !== null
                    ? parsedDeliveryInfo
                    : undefined,
              });
            });
          }

          if (workbook.SheetNames.includes("Orders")) {
            const ordersSheet = workbook.Sheets["Orders"];
            const rawOrders = XLSX.utils.sheet_to_json(ordersSheet) as any[];
            newState.orders = rawOrders.map((o) => {
              const parsedItems = parseSafeJson(o.items, true);
              const parsedAddress =
                parseSafeJson(o.address, false) ||
                makeAddressFromRow(o) ||
                o.address;
              const rawOrder = parseSafeJson(o.rawOrder, false);
              const merged =
                rawOrder && typeof rawOrder === "object"
                  ? { ...rawOrder, ...o }
                  : { ...o };
              delete merged.rawOrder;
              delete merged.addressFull;
              delete merged.addressRegion;
              delete merged.addressArea;
              delete merged.addressBlock;
              delete merged.addressStreet;
              delete merged.addressJaddah;
              delete merged.addressBuilding;
              delete merged.addressFloor;
              delete merged.addressApartment;
              delete merged.addressNotes;
              return stripUndefined({
                ...merged,
                items: parsedItems,
                address:
                  typeof parsedAddress === "object" ? parsedAddress : o.address,
              });
            });
          }
          if (workbook.SheetNames.includes("Zones")) {
            newState.zones = stripUndefined(
              safeSheetToObj("Zones"),
            ) as any as Zone[];
          }
          if (workbook.SheetNames.includes("SupplierTransfers")) {
            newState.supplierTransfers = stripUndefined(
              safeSheetToObj("SupplierTransfers"),
            ) as any as SupplierTransfer[];
          }

          const finalizedState = recalculateStateBalances(newState);
          setTimeout(() => {
            try {
              if (appMode === "cloud" && onCloudImport) {
                addToast(
                  "جاري الرفع سحابياً",
                  "يتم رفع ومزامنة بيانات Excel سحابياً...",
                  "info",
                );
                onCloudImport(finalizedState)
                  .then(() => {
                    addToast(
                      "تمت العملية",
                      `تم استيراد بيانات Excel ومزامنتها سحابياً بنجاح ✨${restoredWhatsAppQuickRepliesCount ? ` وتم استرجاع ${restoredWhatsAppQuickRepliesCount} رد سريع.` : ""}`,
                      "success",
                    );
                  })
                  .catch((err) => {
                    console.error("Cloud Excel import failed:", err);
                    // Keep the imported file visible locally without overwriting another cloud account.
                    setData(finalizedState);
                    try {
                      setProtectedStorageItem(
                        "ktk_cloud_offline_snapshot_last_good",
                        JSON.stringify(finalizedState),
                      );
                      setProtectedStorageItem(
                        "ktk_cloud_offline_snapshot",
                        JSON.stringify(finalizedState),
                      );
                    } catch (storageErr) {
                      console.warn(
                        "Could not keep imported cloud fallback locally:",
                        storageErr,
                      );
                    }
                    addToast(
                      "فشل الحفظ السحابي",
                      "تم إبقاء الاستيراد محلياً داخل هذا المتصفح، لكن Firestore رفض الحفظ: " +
                        (err instanceof Error ? err.message : String(err)),
                      "warning",
                    );
                  });
              } else {
                setData(finalizedState);
                addToast(
                  "تمت العملية",
                  `تم استيراد بيانات Excel ومزامنة الأرصدة محلياً بنجاح${restoredWhatsAppQuickRepliesCount ? ` وتم استرجاع ${restoredWhatsAppQuickRepliesCount} رد سريع.` : ""}`,
                  "success",
                );
              }
            } catch (renderError) {
              console.error(
                "CRITICAL RENDER ERROR during import:",
                renderError,
              );
              addToast(
                "خلل في العرض",
                "استوردنا البيانات بس التطبيق ما قدر يعرضها.",
                "warning",
              );
            }
          }, 150);
        }
      } catch (error) {
        console.error("Import error:", error);
        addToast(
          "خطأ",
          "ما قدرنا نقرأ الملف أو التنسيق مو صحيح: " +
            (error instanceof Error ? error.message : ""),
          "warning",
        );
      }
    };

    if (isJson) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الشعار كبير جداً (الحد الأقصى 5 ميجابايت)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let max_size = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress logo payload
          const dataUrl = canvas.toDataURL("image/png", 0.8);
          setSettings({ ...settings, companyLogo: dataUrl });
          toast.success("تم رفع وتقليل حجم الشعار بنجاح ✅");
        } catch (err) {
          console.error("Logo process error:", err);
          toast.error("تعطلت معالجة أبعاد الشعار");
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:p-4">
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Settings */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <button
              onClick={() =>
                setActiveSection(activeSection === "profile" ? "" : "profile")
              }
              className="w-full relative p-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200/60 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Shield size={20} className="text-secondary" />
                <h2 className="font-bold">بيانات المنشأة</h2>
              </div>
              <div className="flex items-center gap-4">
                {appMode === "local" && (
                  <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100 text-[10px] font-bold mr-auto">
                    <AlertTriangle size={12} />
                    <span>مغلق في النسخة التجريبية</span>
                  </div>
                )}
                <ChevronDown
                  size={20}
                  className={cn(
                    "text-slate-500 transition-transform duration-300",
                    activeSection === "profile" ? "rotate-180" : "",
                  )}
                />
              </div>
            </button>
            <div
              className={cn(
                "transition-all duration-300 relative",
                activeSection === "profile" ? "block" : "hidden",
              )}
            >
              <div className="p-3 md:p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      اسم الشركة
                    </label>
                    <input
                      type="text"
                      value={settings.companyName}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          companyName: e.target.value,
                        })
                      }
                      className="disabled:opacity-50 disabled:bg-slate-50 w-full p-2.5 border border-slate-200/60 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      رسوم بوابة الدفع (فلس)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.25"
                        value={settings.gatewayFeeAmount}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            gatewayFeeAmount: parseFloat(e.target.value),
                          })
                        }
                        className="disabled:opacity-50 disabled:bg-slate-50 w-full p-2.5 pl-12 border border-slate-200/60 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                        فلس
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-medium text-slate-700 block">
                    شعار الشركة{" "}
                    <span className="hidden sm:inline text-slate-400 font-normal hover:text-slate-500">
                      (خلفية شفافة)
                    </span>
                  </label>
                  <div className="flex items-center gap-3 md:p-4">
                    <LogoEngine
                      src={settings.companyLogo || DEFAULT_GLOBAL_LOGO}
                      size="xl"
                      variant="royal"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <label
                          className={cn(
                            "flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-colors w-fit",
                            appMode === "local"
                              ? "bg-slate-100 text-slate-500 border-slate-200/60 cursor-not-allowed"
                              : "text-secondary font-bold bg-secondary/5 border-secondary/20 hover:bg-secondary/10 cursor-pointer",
                          )}
                        >
                          <Upload size={16} />
                          {appMode === "local"
                            ? "مغلق في التجريبي"
                            : "تغيير الشعار"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                          />
                        </label>

                        {settings.companyLogo && (
                          <button
                            onClick={() =>
                              setSettings({ ...settings, companyLogo: "" })
                            }
                            className={cn(
                              "flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-colors w-fit",
                              appMode === "local"
                                ? "bg-slate-100 text-slate-500 border-slate-200/60 cursor-not-allowed"
                                : "text-rose-500 font-bold bg-rose-50 border-rose-100 hover:bg-rose-100 cursor-pointer",
                            )}
                          >
                            <RefreshCw size={16} />
                            إزالة الشعار
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        يفضل أن يكون الشعار بصيغة PNG وبخلفية شفافة لأفضل مظهر.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    أرقام الواتساب (للفواتير - افصل بينها بفاصلة)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="أضف أرقام (مثال: 96512345678, 96587654321)"
                      value={
                        Array.isArray(settings?.restaurantNumbers)
                          ? settings.restaurantNumbers.join(", ")
                          : ""
                      }
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          restaurantNumbers: e.target.value
                            .split(",")
                            .map((s) => s.trim()),
                        })
                      }
                      className="disabled:opacity-50 disabled:bg-slate-50 w-full p-2.5 border border-slate-200/60 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Notifications Section */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <button
              onClick={() =>
                setActiveSection(
                  activeSection === "notifications" ? "" : "notifications",
                )
              }
              className="w-full relative p-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200/60 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-secondary" />
                <h2 className="font-bold">إشعارات النظام</h2>
              </div>
              <div className="flex items-center gap-4">
                <ChevronDown
                  size={20}
                  className={cn(
                    "text-slate-500 transition-transform duration-300",
                    activeSection === "notifications" ? "rotate-180" : "",
                  )}
                />
              </div>
            </button>
            <div
              className={cn(
                "transition-all duration-300 relative",
                activeSection === "notifications" ? "block" : "hidden",
              )}
            >
              <div className="p-3 md:p-4 space-y-4">
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-slate-500 font-bold mb-2">
                    تفعيل الإشعارات للحصول على التنبيهات الفورية من النظام.
                  </p>
                  {appMode === "local" ? (
                    <div
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-6 py-3 text-slate-400 border border-slate-200/60 font-bold cursor-not-allowed w-fit"
                      aria-disabled="true"
                    >
                      <Bell size={18} />
                      <span>تفعيل الإشعارات غير متاح للحساب المحلي</span>
                    </div>
                  ) : (
                    <EnableNotificationsButton
                      userId={auth?.currentUser?.uid || "local_user"}
                      restaurantId="kitchen_default"
                    />
                  )}
                </div>
                <div className="rounded-[1.5rem] border border-slate-200/70 bg-gradient-to-br from-slate-950 to-slate-800 p-4 text-white shadow-sm overflow-hidden relative">
                  <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-emerald-400/20 blur-3xl" />
                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-[10px] font-black text-emerald-200">
                        <Activity size={13} />
                        <span>Push Health Check</span>
                      </div>
                      <h3 className="mt-2 text-lg font-black">
                        اختبار صحة الإشعارات
                      </h3>
                      <p className="mt-1 text-xs font-bold leading-6 text-white/60">
                        يفحص أجهزة Push الحقيقية فقط: التوكن، الإذن، آخر تسجيل،
                        و Service Worker. لا يعرض التنبيهات الذكية الداخلية.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={runPushHealthCheck}
                      disabled={checkingPushHealth || appMode === "local"}
                      className="rounded-2xl bg-white text-slate-950 px-4 py-3 text-xs font-black shadow-sm hover:bg-emerald-50 disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                      {checkingPushHealth ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <RefreshCw size={15} />
                      )}
                      فحص الآن
                    </button>
                  </div>
                  {pushHealth && (
                    <div className="relative z-10 mt-4 space-y-2">
                      <div
                        className={cn(
                          "rounded-2xl border px-3 py-3 flex items-center justify-between gap-3",
                          pushHealth.tone === "success"
                            ? "bg-emerald-400/15 border-emerald-300/20 text-emerald-100"
                            : pushHealth.tone === "danger"
                              ? "bg-rose-400/15 border-rose-300/20 text-rose-100"
                              : "bg-amber-400/15 border-amber-300/20 text-amber-100",
                        )}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-black">
                            النتيجة: {pushHealth.verdict}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-white/60">
                            <span className="rounded-full bg-white/10 px-2 py-0.5">
                              {pushHealth.support}
                            </span>
                            <span className="rounded-full bg-white/10 px-2 py-0.5">
                              {pushHealth.permission}
                            </span>
                            <span className="rounded-full bg-white/10 px-2 py-0.5">
                              {pushHealth.serviceWorker}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPushHealthDetailsOpen((v) => !v)}
                          className="shrink-0 rounded-xl bg-white/10 px-2.5 py-2 text-[10px] font-black text-white hover:bg-white/15 transition flex items-center gap-1"
                        >
                          التفاصيل
                          <ChevronDown
                            size={14}
                            className={cn(
                              "transition-transform",
                              pushHealthDetailsOpen ? "rotate-180" : "",
                            )}
                          />
                        </button>
                      </div>
                      {pushHealthDetailsOpen && (
                        <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              ["Support", pushHealth.support],
                              ["Permission", pushHealth.permission],
                              [
                                "Last Registration",
                                pushHealth.lastRegistration,
                              ],
                              ["Service Worker", pushHealth.serviceWorker],
                            ].map(([label, value]) => (
                              <div
                                key={label}
                                className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 min-w-0"
                              >
                                <span className="block text-[9px] font-black text-white/45">
                                  {label}
                                </span>
                                <strong
                                  dir="ltr"
                                  className="mt-1 block truncate text-[10px] font-black text-white"
                                >
                                  {value}
                                </strong>
                              </div>
                            ))}
                          </div>
                          <div className="rounded-xl bg-black/25 border border-white/10 p-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-black text-white/45">
                                Current Browser Token
                              </span>
                              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black text-white/45">
                                كامل للأدمن
                              </span>
                            </div>
                            <code
                              dir="ltr"
                              className="mt-2 block max-h-24 overflow-auto whitespace-pre-wrap break-all text-[10px] font-bold leading-5 text-emerald-100"
                            >
                              {pushHealth.token || "Not available"}
                            </code>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {pushDevices.length > 0 &&
                    (() => {
                      const query = pushDeviceSearch.trim().toLowerCase();
                      const isMissingTimestamp = (value?: string) =>
                        !value ||
                        value === "Not registered" ||
                        value === "No timestamp saved" ||
                        value === "Unknown";
                      const deviceMatchesQuery = (device: PushDeviceSnapshot) => {
                        const haystack = [
                          device.label,
                          device.ownerLabel,
                          device.userName,
                          device.userEmail,
                          device.userRole,
                          device.userId,
                          device.platform,
                          device.deviceType,
                          device.browser,
                          device.currentUrl,
                          device.token,
                          device.lastRead,
                          device.lastConnection,
                          ...(device.recentNotifications || []).flatMap((n) => [
                            n.title,
                            n.message,
                            n.date,
                            n.deliveryStage,
                            n.type,
                          ]),
                        ]
                          .filter(Boolean)
                          .join(" ")
                          .toLowerCase();
                        return !query || haystack.includes(query);
                      };
                      const visibleDevices = pushDevices.filter(
                        (device) =>
                          deviceMatchesQuery(device) &&
                          matchesPushAdvancedFilter(device, pushDevices),
                      );
                      const getLatestDevicePush = (device: PushDeviceSnapshot) =>
                        (device.recentNotifications || [])[0];
                      const allVisibleNotifications = visibleDevices
                        .flatMap((device) =>
                          (device.recentNotifications || []).map((n) => ({
                            ...n,
                            deviceLabel: device.deviceLabel || device.label,
                            ownerLabel: device.ownerLabel || device.userName,
                            deviceId: device.id,
                          })),
                        )
                        .sort(
                          (a, b) =>
                            new Date(b.date).getTime() -
                            new Date(a.date).getTime(),
                        );
                      const notificationLog = pushEventLogs
                        .filter((notification) => {
                          if (!query) return true;
                          return [
                            notification.title,
                            notification.message,
                            notification.type,
                            notification.status,
                            notification.userId,
                            getPushUserDisplayById(notification.userId),
                            notification.deviceLabel,
                            notification.deviceId,
                            notification.token,
                            notification.tokenStart,
                            notification.responseId,
                          ]
                            .filter(Boolean)
                            .join(" ")
                            .toLowerCase()
                            .includes(query);
                        })
                        .slice(0, 120);
                      const userGroups = (Object.values(
                        visibleDevices.reduce(
                          (acc, device) => {
                            const owner =
                              device.ownerLabel ||
                              device.userName ||
                              device.userEmail ||
                              device.userId ||
                              "غير مرتبط بموظف";
                            const id = String(
                              device.userId || device.userEmail || owner,
                            );
                            const key = id || owner;
                            if (!acc[key]) {
                              acc[key] = {
                                id: `user-${key}`,
                                owner,
                                userId: device.userId,
                                email: device.userEmail,
                                role: device.userRole,
                                devices: [] as PushDeviceSnapshot[],
                              };
                            }
                            acc[key].devices.push(device);
                            return acc;
                          },
                          {} as Record<
                            string,
                            {
                              id: string;
                              owner: string;
                              userId?: string;
                              email?: string;
                              role?: string;
                              devices: PushDeviceSnapshot[];
                            }
                          >,
                        ),
                      ) as Array<{ id: string; owner: string; userId?: string; email?: string; role?: string; devices: PushDeviceSnapshot[] }>).sort((a, b) => a.owner.localeCompare(b.owner, "ar"));
                      const counts = {
                        users: userGroups.length,
                        devices: pushDevices.length,
                        visible: visibleDevices.length,
                        active: pushDevices.filter((d) => d.status === "online")
                          .length,
                        attention: pushDevices.filter((d) => d.status !== "online")
                          .length,
                        log: pushEventLogs.length,
                      };
                      const renderPushStage = (notification?: any) => {
                        const label = notification?.deliveryStage || "لا يوجد Push محفوظ";
                        const className = notification?.openedByEmployee
                          ? "bg-sky-400/15 text-sky-100 border-sky-300/20"
                          : notification?.receivedByDevice
                            ? "bg-emerald-400/15 text-emerald-100 border-emerald-300/20"
                            : notification?.success === false
                              ? "bg-rose-400/15 text-rose-100 border-rose-300/20"
                              : notification?.success === true
                                ? "bg-emerald-400/10 text-emerald-100 border-emerald-300/15"
                                : "bg-white/10 text-white/55 border-white/10";
                        return (
                          <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-black", className)}>
                            {label}
                          </span>
                        );
                      };
                      const renderNotificationCard = (notification: any, compact = false) => (
                        <details
                          key={`${notification.id}-${notification.deviceId || notification.date}`}
                          className="rounded-xl border border-white/10 bg-white/5 p-2.5"
                        >
                          <summary className="cursor-pointer list-none flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <strong className="block truncate text-[10px] font-black text-white">
                                {notification.title || "Push Notification"}
                              </strong>
                              <span className="mt-0.5 block truncate text-[9px] font-bold text-white/40">
                                {notification.ownerLabel || getPushUserDisplayById(notification.userId)}
                                {notification.deviceLabel ? ` — ${notification.deviceLabel}` : ""}
                              </span>
                            </div>
                            <div className="shrink-0 text-left space-y-1">
                              {renderPushStage(notification)}
                              <span dir="ltr" className="block text-[8px] font-bold text-white/40">
                                {notification.date}
                              </span>
                            </div>
                          </summary>
                          <div className="mt-2 border-t border-white/10 pt-2 space-y-2">
                            {notification.message && (
                              <p className="text-[10px] font-bold leading-5 text-white/60">
                                {notification.message}
                              </p>
                            )}
                            <div className="grid grid-cols-2 gap-1.5 text-[9px] font-bold text-white/55">
                              {[
                                ["Sent/Recorded", notification.date],
                                ["Received", notification.receivedAt || "No receipt yet"],
                                ["Clicked", notification.clickedAt || "No click yet"],
                                ["Type", notification.type || notification.status || "push"],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-lg border border-white/10 bg-slate-950/30 p-2 min-w-0">
                                  <span className="block text-[8px] font-black text-white/35">{label}</span>
                                  <b dir="ltr" className="mt-1 block truncate text-[9px] font-black text-white/75">{value}</b>
                                </div>
                              ))}
                            </div>
                            {!compact && notification.tokenStart && (
                              <div dir="ltr" className="rounded-lg bg-black/25 border border-white/10 p-2 text-[9px] font-bold text-white/45 break-all">
                                Token start: {notification.tokenStart}
                              </div>
                            )}
                          </div>
                        </details>
                      );
                      const renderDeviceDetails = (device: PushDeviceSnapshot) => {
                        const isOpen = expandedPushDeviceId === device.id;
                        const meta = getPushStatusMeta(device.status);
                        const score = getPushDeviceConfidence(device);
                        const confidence = getPushDeviceConfidenceMeta(score);
                        const readiness = getPushReadinessVerdict(device);
                        const latest = getLatestDevicePush(device);
                        const timeline = getPushTimelineEvents(device);
                        return (
                          <div key={device.id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setExpandedPushDeviceId(isOpen ? null : device.id)}
                              className="w-full px-3 py-2.5 flex items-center justify-between gap-3 text-right hover:bg-white/5 transition"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <strong className="truncate text-[11px] font-black text-white">
                                    {device.deviceLabel || device.label}
                                  </strong>
                                  <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-black", meta.pill)}>
                                    {meta.label}
                                  </span>
                                  {renderPushStage(latest)}
                                </div>
                                <p className="mt-1 truncate text-[9px] font-bold text-white/45">
                                  آخر Push: {latest ? `${latest.title} — ${latest.date}` : "لا يوجد Push محفوظ لهذا الجهاز"}
                                </p>
                              </div>
                              <ChevronDown
                                size={15}
                                className={cn("shrink-0 text-white/60 transition-transform", isOpen ? "rotate-180" : "")}
                              />
                            </button>
                            {isOpen && (
                              <div className="border-t border-white/10 p-2.5 space-y-2.5">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className={cn("rounded-xl border p-2", confidence.className)}>
                                    <span className="block text-[9px] font-black opacity-70">جاهزية Push</span>
                                    <b className="mt-1 block text-sm font-black">{score}%</b>
                                    <small className="block text-[9px] font-bold opacity-70">{confidence.label}</small>
                                  </div>
                                  <div className={cn("rounded-xl border p-2", readiness.className)}>
                                    <span className="block text-[9px] font-black opacity-70">الحكم السريع</span>
                                    <b className="mt-1 block text-[11px] font-black">{readiness.label}</b>
                                    <small className="block text-[9px] font-bold opacity-70">{isMissingTimestamp(device.lastRead) ? "وقت القراءة غير محفوظ" : "آخر قراءة محفوظة"}</small>
                                  </div>
                                </div>

                                <div className="rounded-xl border border-white/10 bg-slate-950/30 p-2">
                                  <span className="block text-[9px] font-black text-white/40">آخر إشعار لهذا الجهاز</span>
                                  {latest ? (
                                    <div className="mt-2">{renderNotificationCard(latest, true)}</div>
                                  ) : (
                                    <p className="mt-2 text-[10px] font-bold text-white/45">لا يوجد Push حقيقي محفوظ لهذا الجهاز حتى الآن. أرسل اختبارًا سريعًا وسيظهر هنا.</p>
                                  )}
                                </div>

                                <details className="rounded-xl border border-emerald-300/15 bg-emerald-400/10 p-2">
                                  <summary className="cursor-pointer text-[10px] font-black text-emerald-100">
                                    إرسال اختبار سريع لهذا الجهاز
                                  </summary>
                                  <div className="mt-2 space-y-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      <input
                                        value={pushTestTitle}
                                        onChange={(e) => setPushTestTitle(e.target.value)}
                                        placeholder="عنوان الاختبار"
                                        className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-[10px] font-bold text-white placeholder:text-white/35 outline-none"
                                      />
                                      <input
                                        value={pushTestBody}
                                        onChange={(e) => setPushTestBody(e.target.value)}
                                        placeholder="رسالة الاختبار"
                                        className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-[10px] font-bold text-white placeholder:text-white/35 outline-none"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => sendPushDeviceTestNotification(device)}
                                      disabled={sendingPushTestId === device.id}
                                      className="w-full rounded-xl bg-emerald-400 px-3 py-2 text-[10px] font-black text-slate-950 hover:bg-emerald-300 disabled:opacity-60 transition flex items-center justify-center gap-2"
                                    >
                                      {sendingPushTestId === device.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                      أرسل Push اختبار لهذا الجهاز فقط
                                    </button>
                                    {pushTestResults[device.id] && (
                                      <p className="rounded-xl border border-white/10 bg-white/10 p-2 text-[10px] font-bold text-white/65">
                                        {pushTestResults[device.id]}
                                      </p>
                                    )}
                                  </div>
                                </details>

                                <details className="rounded-xl border border-white/10 bg-white/10 p-2">
                                  <summary className="cursor-pointer text-[10px] font-black text-white">
                                    خط زمني للجهاز
                                  </summary>
                                  {timeline.length ? (
                                    <div className="mt-2 space-y-1.5">
                                      {timeline.map((item, idx) => (
                                        <div key={`${item.label}-${idx}`} className="flex items-start gap-2 rounded-lg border border-white/10 bg-slate-950/30 p-2">
                                          <span className="mt-1 h-2 w-2 rounded-full bg-emerald-300" />
                                          <div className="min-w-0">
                                            <b className="block text-[9px] font-black text-white/75">{item.label}</b>
                                            <span dir="ltr" className="block truncate text-[9px] font-bold text-white/40">{item.value}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="mt-2 rounded-xl border border-dashed border-white/10 p-2 text-[10px] font-bold text-white/45">
                                      لا يوجد خط زمني محفوظ لهذا الجهاز حتى الآن. السبب غالبًا أن إشعارات الدفع القديمة لم تكن تسجل في PushEvents.
                                    </p>
                                  )}
                                </details>

                                <details className="rounded-xl border border-white/10 bg-black/20 p-2">
                                  <summary className="cursor-pointer text-[10px] font-black text-white/75">
                                    تفاصيل فنية متقدمة
                                  </summary>
                                  <div className="mt-2 space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      {[
                                        ["Employee", device.ownerLabel || device.userName || "Not linked"],
                                        ["User ID", device.userId || "Not linked"],
                                        ["Email", device.userEmail || "Not linked"],
                                        ["Role", device.userRole || "Not linked"],
                                        ["Last Registration", device.lastConnection],
                                        ["Last Read", device.lastRead],
                                        ["Platform", device.platform || device.deviceType || "Unknown"],
                                        ["Browser", device.browser || "Unknown"],
                                        ["Current URL", device.currentUrl || "Not available"],
                                      ].map(([label, value]) => (
                                        <div key={label} className="rounded-xl bg-white/10 border border-white/10 p-2 min-w-0">
                                          <span className="block text-[9px] font-black text-white/35">{label}</span>
                                          <b dir={String(label).includes("URL") ? "ltr" : undefined} className="mt-1 block truncate text-[10px] font-black text-white/80">{value}</b>
                                        </div>
                                      ))}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => copyPushDeviceReport(device, pushDevices)}
                                      className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-[10px] font-black text-white hover:bg-white/15 flex items-center justify-center gap-2"
                                    >
                                      <Code size={13} /> نسخ تقرير الجهاز
                                    </button>
                                    <details className="rounded-xl bg-slate-950/40 border border-white/10 p-2">
                                      <summary className="cursor-pointer text-[10px] font-black text-emerald-100">Full Push Token</summary>
                                      <code dir="ltr" className="mt-2 block max-h-28 overflow-auto whitespace-pre-wrap break-all text-[10px] font-bold leading-5 text-emerald-100">
                                        {device.token}
                                      </code>
                                    </details>
                                    <p className="flex items-center gap-1 text-[10px] font-bold text-white/45">
                                      <WifiOff size={12} /> {device.note}
                                    </p>
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        );
                      };

                      return (
                        <div className="relative z-10 mt-3 rounded-[1.35rem] border border-white/10 bg-white/10 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setPushDevicesPanelOpen((v) => !v)}
                            className="w-full p-3 flex items-center justify-between gap-3 text-right hover:bg-white/5 transition"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-xs font-black text-white">
                                <Users size={15} /> مركز Push الموظفين الحقيقي
                              </div>
                              <p className="mt-1 text-[10px] font-bold text-white/45">
                                العرض الأساسي حسب المستخدم. التفاصيل الفنية والتوكنات مخفية إلا عند طلبها.
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black text-white/60">
                                {counts.users} مستخدم / {counts.devices} جهاز
                              </span>
                              <ChevronDown
                                size={16}
                                className={cn("text-white/60 transition-transform", pushDevicesPanelOpen ? "rotate-180" : "")}
                              />
                            </div>
                          </button>
                          {pushDevicesPanelOpen && (
                            <div className="border-t border-white/10 p-2.5 space-y-3">
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  ["المستخدمون", counts.users, "افتح المستخدم ثم الأجهزة"],
                                  ["الأجهزة", counts.devices, "كل التوكنات المسجلة"],
                                  ["أرشيف Push", counts.log, "إرسال/استلام/فتح"],
                                ].map(([label, value, hint]) => (
                                  <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/5 p-2.5 text-center">
                                    <span className="block text-[9px] font-black text-white/40">{label}</span>
                                    <strong className="mt-1 block text-sm font-black text-white">{value}</strong>
                                    <small className="mt-0.5 block text-[8px] font-bold text-white/35">{hint}</small>
                                  </div>
                                ))}
                              </div>

                              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-1 overflow-x-auto">
                                <div className="flex min-w-max gap-1">
                                  {[
                                    ["users", "حسب المستخدم", counts.users],
                                    ["devices", "كل الأجهزة", counts.visible],
                                    ["log", "أرشيف Push", counts.log],
                                    ["investigate", "اختبار سريع", counts.visible],
                                    ["advanced", "فني مخفي", counts.attention],
                                  ].map(([id, label, count]) => (
                                    <button
                                      key={String(id)}
                                      type="button"
                                      onClick={() => {
                                        setPushDeviceTab(id as any);
                                        setExpandedPushDeviceId(null);
                                      }}
                                      className={cn(
                                        "rounded-xl px-3 py-2 text-[10px] font-black transition whitespace-nowrap",
                                        pushDeviceTab === id
                                          ? "bg-white text-slate-950 shadow-sm"
                                          : "text-white/55 hover:bg-white/10",
                                      )}
                                    >
                                      <span className="block">{label}</span>
                                      <span className="mt-0.5 block text-[9px] opacity-70">{count}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2">
                                <Search size={14} className="shrink-0 text-white/45" />
                                <input
                                  value={pushDeviceSearch}
                                  onChange={(e) => setPushDeviceSearch(e.target.value)}
                                  placeholder="بحث سريع: مستخدم، إيميل، جهاز، عنوان إشعار، توكن..."
                                  dir="rtl"
                                  className="w-full bg-transparent text-[11px] font-bold text-white placeholder:text-white/35 outline-none"
                                />
                              </div>

                              {pushDeviceTab === "users" && (
                                <div className="space-y-2">
                                  {userGroups.length ? (
                                    userGroups.map((group) => {
                                      const groupOpen = expandedPushDeviceGroup === group.id;
                                      const groupNotifications = group.devices
                                        .flatMap((d) => d.recentNotifications || [])
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                      const latest = groupNotifications[0];
                                      const activeCount = group.devices.filter((d) => d.status === "online").length;
                                      const attentionCount = group.devices.length - activeCount;
                                      return (
                                        <div key={group.id} className="rounded-2xl border border-white/10 bg-slate-950/30 overflow-hidden">
                                          <button
                                            type="button"
                                            onClick={() => setExpandedPushDeviceGroup(groupOpen ? "" : group.id)}
                                            className="w-full px-3 py-3 flex items-center justify-between gap-3 text-right hover:bg-white/5 transition"
                                          >
                                            <div className="min-w-0 flex-1">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <strong className="truncate text-[12px] font-black text-white">{group.owner}</strong>
                                                {group.role && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black text-white/55">{group.role}</span>}
                                                {renderPushStage(latest)}
                                              </div>
                                              <p className="mt-1 truncate text-[10px] font-bold text-white/45">
                                                آخر Push: {latest ? `${latest.title} — ${latest.date}` : "لا يوجد أرشيف Push لهذا المستخدم"}
                                              </p>
                                            </div>
                                            <div className="shrink-0 flex items-center gap-2">
                                              <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-black text-emerald-100">{activeCount} جاهز</span>
                                              <span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-black text-white/55">{group.devices.length} جهاز</span>
                                              {attentionCount > 0 && <span className="rounded-full bg-amber-400/10 px-2 py-1 text-[9px] font-black text-amber-100">{attentionCount} مراجعة</span>}
                                              <ChevronDown size={15} className={cn("text-white/60 transition-transform", groupOpen ? "rotate-180" : "")} />
                                            </div>
                                          </button>
                                          {groupOpen && (
                                            <div className="border-t border-white/10 p-2.5 space-y-2">
                                              {latest && (
                                                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                                                  <span className="block text-[9px] font-black text-white/40">آخر إشعار لهذا المستخدم</span>
                                                  <div className="mt-2">{renderNotificationCard(latest, true)}</div>
                                                </div>
                                              )}
                                              <div className="space-y-1.5">
                                                {group.devices.map(renderDeviceDetails)}
                                              </div>
                                              <details className="rounded-xl border border-white/10 bg-black/20 p-2">
                                                <summary className="cursor-pointer text-[10px] font-black text-white/70">
                                                  تفاصيل المستخدم الفنية
                                                </summary>
                                                <div className="mt-2 grid grid-cols-2 gap-2">
                                                  {[
                                                    ["User ID", group.userId || "Not linked"],
                                                    ["Email", group.email || "Not linked"],
                                                    ["Role", group.role || "Not linked"],
                                                    ["Push events", groupNotifications.length],
                                                  ].map(([label, value]) => (
                                                    <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-2 min-w-0">
                                                      <span className="block text-[8px] font-black text-white/35">{label}</span>
                                                      <b dir="ltr" className="mt-1 block truncate text-[9px] font-black text-white/75">{value}</b>
                                                    </div>
                                                  ))}
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => copyPushEmployeeReport(group.owner, group.devices)}
                                                  className="mt-2 w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-[10px] font-black text-white hover:bg-white/15 flex items-center justify-center gap-2"
                                                >
                                                  <Code size={13} /> نسخ تقرير المستخدم
                                                </button>
                                              </details>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-[10px] font-bold text-white/45">
                                      لا توجد نتائج مطابقة للبحث الحالي.
                                    </p>
                                  )}
                                </div>
                              )}

                              {pushDeviceTab === "devices" && (
                                <div className="space-y-1.5">
                                  {visibleDevices.length ? visibleDevices.map(renderDeviceDetails) : (
                                    <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-[10px] font-bold text-white/45">لا توجد أجهزة مطابقة.</p>
                                  )}
                                </div>
                              )}

                              {pushDeviceTab === "log" && (
                                <div className="rounded-2xl border border-white/10 bg-slate-950/30 overflow-hidden">
                                  <div className="p-3 flex items-center justify-between gap-2 text-right">
                                    <div>
                                      <div className="text-[11px] font-black text-white">أرشيف Push الحقيقي</div>
                                      <p className="mt-1 text-[10px] font-bold text-white/45">
                                        يعرض Push الحقيقي فقط: أرسل، قبله FCM، استلمه الجهاز، فتحه الموظف. الإشعارات القديمة لا تظهر إذا لم تكن مسجلة سابقًا.
                                      </p>
                                    </div>
                                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black text-white/60">{notificationLog.length}</span>
                                  </div>
                                  <div className="border-t border-white/10 p-2 space-y-1.5 max-h-96 overflow-auto">
                                    {notificationLog.length ? notificationLog.map((notification) => renderNotificationCard(notification)) : (
                                      <p className="rounded-xl border border-dashed border-white/10 p-3 text-center text-[10px] font-bold text-white/45">
                                        لا يوجد أرشيف Push حقيقي محفوظ حتى الآن. سيظهر هنا أي Push جديد يتم تسجيله من السيرفر أو الاختبار.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {pushDeviceTab === "investigate" && (
                                <div className="space-y-2">
                                  <div className="rounded-2xl border border-sky-300/15 bg-sky-400/10 p-3">
                                    <div className="flex items-center gap-2 text-[11px] font-black text-sky-100">
                                      <ClipboardCheck size={14} /> أمر سريع: موظف يقول ما وصلني Push
                                    </div>
                                    <p className="mt-1 text-[10px] font-bold leading-5 text-white/55">
                                      ابحث باسم المستخدم أو الإيميل، افتح الجهاز الحالي، ثم أرسل اختبارًا سريعًا لجهاز واحد فقط.
                                    </p>
                                  </div>
                                  {userGroups.length ? userGroups.map((group) => (
                                    <div key={`investigate-${group.id}`} className="rounded-2xl border border-white/10 bg-slate-950/30 p-2 space-y-1.5">
                                      <div className="flex items-center justify-between gap-2 px-1">
                                        <strong className="text-[11px] font-black text-white">{group.owner}</strong>
                                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black text-white/55">{group.devices.length} جهاز</span>
                                      </div>
                                      {group.devices.map(renderDeviceDetails)}
                                    </div>
                                  )) : (
                                    <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-[10px] font-bold text-white/45">اكتب اسم المستخدم أو الجهاز للبحث.</p>
                                  )}
                                </div>
                              )}

                              {pushDeviceTab === "advanced" && (
                                <div className="space-y-2">
                                  <details className="rounded-2xl border border-white/10 bg-slate-950/30 p-3" open>
                                    <summary className="cursor-pointer text-[11px] font-black text-white flex items-center gap-2">
                                      <Filter size={14} /> فلاتر فنية متقدمة ({getPushAdvancedFilterLabel(pushAdvancedFilter)})
                                    </summary>
                                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-1.5">
                                      {[
                                        ["all", "كل الحالات"],
                                        ["noRead", "بلا وقت قراءة"],
                                        ["noUser", "بلا مستخدم"],
                                        ["noLogs", "بلا أرشيف Push"],
                                        ["weak", "جاهزية ضعيفة"],
                                        ["duplicates", "عدة أجهزة لنفس المستخدم"],
                                      ].map(([id, label]) => (
                                        <button
                                          key={id}
                                          type="button"
                                          onClick={() => setPushAdvancedFilter(id as any)}
                                          className={cn(
                                            "rounded-xl px-3 py-2 text-[10px] font-black transition",
                                            pushAdvancedFilter === id
                                              ? "bg-white text-slate-950"
                                              : "bg-white/10 text-white/60 hover:bg-white/15",
                                          )}
                                        >
                                          {label}
                                        </button>
                                      ))}
                                    </div>
                                  </details>
                                  <details className="rounded-2xl border border-amber-300/15 bg-amber-400/10 p-3">
                                    <summary className="cursor-pointer text-[11px] font-black text-amber-100 flex items-center gap-2">
                                      <Shield size={14} /> ملاحظة فنية
                                    </summary>
                                    <div className="mt-3 grid gap-2 text-[10px] font-bold leading-5 text-white/65">
                                      <p>1) هذا المكان خاص بـ Push الحقيقي للموظفين فقط.</p>
                                      <p>2) الأرشيف لا يعرض إشعارات ذكية داخلية ولا يسترجع إشعارات قديمة لم تكن مسجلة.</p>
                                      <p>3) زر الاختبار يرسل Push لجهاز محدد فقط، وليس Broadcast.</p>
                                    </div>
                                  </details>
                                  <button
                                    type="button"
                                    onClick={() => copyPushExecutiveSummary(pushDevices)}
                                    className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-[10px] font-black text-white hover:bg-white/15 flex items-center justify-center gap-2"
                                  >
                                    <Code size={13} /> نسخ ملخص تنفيذي
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                </div>
              </div>
            </div>
          </section>

          {/* Zones Management Section */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <button
              onClick={() =>
                setActiveSection(activeSection === "zones" ? "" : "zones")
              }
              className="w-full relative p-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200/60 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <MapIcon size={18} className="text-secondary" />
                <h2 className="font-bold">قائمة مناطق التوصيل</h2>
              </div>
              <ChevronDown
                size={20}
                className={cn(
                  "text-slate-500 transition-transform duration-300 absolute left-4",
                  activeSection === "zones" ? "rotate-180" : "",
                )}
              />
            </button>
            <div
              className={cn(
                "transition-all duration-300",
                activeSection === "zones" ? "block" : "hidden",
              )}
            >
              <div className="p-3 border-b border-slate-200/60 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                  <div className="relative w-full max-w-sm">
                    <Search
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="text"
                      placeholder="بحث عن منطقة..."
                      value={searchZoneTerm}
                      onChange={(e) =>
                        setSearchZoneTerm(
                          normalizeArabicNumerals(e.target.value),
                        )
                      }
                      className="w-full pl-3 pr-10 py-1.5 bg-white border border-slate-200/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                    />
                  </div>
                  {appMode === "local" && (
                    <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100 text-[10px] font-bold">
                      <AlertTriangle size={12} />
                      <span>مغلق التجريبية</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newZone: Zone = {
                      id: `z-${Date.now()}`,
                      name: "منطقة جديدة",
                      cost: 2.0,
                      profit: 0,
                      finalPrice: 2.0,
                      isActive: true,
                    };
                    setData((prev) => ({
                      ...prev,
                      zones: [newZone, ...(prev.zones || [])],
                    }));
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors",
                    appMode === "local"
                      ? "bg-slate-100 text-slate-500 cursor-not-allowed opacity-60"
                      : "bg-primary/10 text-primary hover:bg-primary hover:text-white",
                  )}
                >
                  <Plus size={14} /> إضافة منطقة
                </button>
              </div>
              <div className="p-3 md:p-4 overflow-x-auto">
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar border border-slate-200/60 rounded-xl relative">
                  {appMode === "local" && (
                    <div className="absolute inset-0 bg-slate-50/10 backdrop-blur-[0.5px] z-20 cursor-not-allowed cursor-not-allowed" />
                  )}
                  <table className="w-full text-right min-w-[600px]" dir="rtl">
                    <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase sticky top-0 z-10 shadow-sm shadow-slate-200/50">
                      <tr>
                        <th className="p-3">اسم المنطقة</th>
                        <th className="p-3 text-center">تكلفة التوصيل</th>
                        <th className="p-3 text-center">الربح</th>
                        <th className="p-3 text-center">السعر النهائي</th>
                        <th className="p-3 text-left">تفعيل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                      {(data.zones || [])
                        .filter(
                          (z) =>
                            !searchZoneTerm ||
                            normalizeArabic(z.name).includes(
                              normalizeArabic(searchZoneTerm),
                            ),
                        )
                        .map((zone, index) => (
                          <tr
                            key={zone.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="p-3">
                              <input
                                type="text"
                                value={zone.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setData((prev) => ({
                                    ...prev,
                                    zones: (prev?.zones || []).map((z) =>
                                      z.id === zone.id
                                        ? { ...z, name: val }
                                        : z,
                                    ),
                                  }));
                                }}
                                className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary outline-none transition-colors w-full px-1 min-w-[120px] disabled:opacity-50"
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center flex-row-reverse">
                                <input
                                  type="number"
                                  step="0.25"
                                  value={zone.cost}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setData((prev) => ({
                                      ...prev,
                                      zones: (prev?.zones || []).map((z) =>
                                        z.id === zone.id
                                          ? {
                                              ...z,
                                              cost: val,
                                              finalPrice: val + z.profit,
                                            }
                                          : z,
                                      ),
                                    }));
                                  }}
                                  className="w-12 md:w-20 text-center bg-slate-100 border border-slate-200/60 rounded-lg py-1 px-2 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
                                />
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center flex-row-reverse">
                                <input
                                  type="number"
                                  step="0.25"
                                  value={zone.profit}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setData((prev) => ({
                                      ...prev,
                                      zones: (prev?.zones || []).map((z) =>
                                        z.id === zone.id
                                          ? {
                                              ...z,
                                              profit: val,
                                              finalPrice: z.cost + val,
                                            }
                                          : z,
                                      ),
                                    }));
                                  }}
                                  className="w-12 md:w-20 text-center bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg py-1 px-2 focus:ring-2 focus:ring-emerald-500/20 outline-none disabled:opacity-50"
                                />
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center flex-row-reverse">
                                <input
                                  type="number"
                                  step="0.25"
                                  value={zone.finalPrice}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setData((prev) => ({
                                      ...prev,
                                      zones: (prev?.zones || []).map((z) =>
                                        z.id === zone.id
                                          ? {
                                              ...z,
                                              finalPrice: val,
                                              profit: val - z.cost,
                                            }
                                          : z,
                                      ),
                                    }));
                                  }}
                                  className="w-12 md:w-20 text-center bg-primary/5 border border-primary/20 text-primary font-bold rounded-lg py-1 px-2 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
                                />
                              </div>
                            </td>
                            <td className="p-3 text-left">
                              <button
                                onClick={() => {
                                  setData((prev) => ({
                                    ...prev,
                                    zones: (prev?.zones || []).map((z) =>
                                      z.id === zone.id
                                        ? { ...z, isActive: !z.isActive }
                                        : z,
                                    ),
                                  }));
                                }}
                                className={cn(
                                  "text-[10px] px-3 py-1.5 rounded-lg border shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
                                  zone.isActive
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                                    : "bg-slate-100 text-slate-500 border-slate-200/60 hover:bg-slate-200",
                                )}
                              >
                                {zone.isActive ? "مفعل" : "معطل"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      {(data.zones || []).length === 0 && (
                        <tr key="empty-state">
                          <td
                            colSpan={5}
                            className="p-3 md:p-4 text-center text-slate-500 font-bold text-xs"
                          >
                            ماكو مناطق، أضف منطقة أو استرجع البيانات.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <button
              onClick={() =>
                setActiveSection(
                  activeSection === "store-status" ? "" : "store-status",
                )
              }
              className="w-full relative p-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200/60 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Store size={20} className="text-blue-500" />
                <h2 className="font-bold">
                  حالة المتجر الإلكتروني (تطبيق العميل)
                </h2>
              </div>
              <div className="flex items-center gap-4">
                {appMode === "local" && (
                  <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100 text-[10px] font-bold mr-auto">
                    <AlertTriangle size={12} />
                    <span>مغلق في النسخة التجريبية</span>
                  </div>
                )}
                <ChevronDown
                  size={20}
                  className={cn(
                    "text-slate-500 transition-transform duration-300",
                    activeSection === "store-status" ? "rotate-180" : "",
                  )}
                />
              </div>
            </button>
            <div
              className={cn(
                "transition-all duration-300 relative",
                activeSection === "store-status" ? "block" : "hidden",
              )}
            >
              <div className="p-3 md:p-4 space-y-6">
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  <div>
                    <h3 className="font-bold text-slate-800">
                      حالة المتجر الفعلية
                    </h3>
                    <p className="text-xs text-slate-500">
                      إغلاق وتوقيف استقبال الطلبات من تطبيق العميل بشكل فوري.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.storeStatus?.manualClose || false}
                      onChange={(e) =>
                        setSettings((p) => ({
                          ...p,
                          storeStatus: {
                            ...p.storeStatus!,
                            manualClose: e.target.checked,
                          },
                        }))
                      }
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {settings.storeStatus?.manualClose && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      رسالة الإغلاق أو الخروج عن أوقات العمل
                    </label>
                    <textarea
                      value={settings.storeStatus?.closeMessage || ""}
                      onChange={(e) =>
                        setSettings((p) => ({
                          ...p,
                          storeStatus: {
                            ...p.storeStatus!,
                            closeMessage: e.target.value,
                          },
                        }))
                      }
                      className="disabled:opacity-50 w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                      placeholder="رسالة تظهر للعميل بدل المتجر. مثال: المعذرة المتجر مسكر، نرجع قريب."
                      rows={2}
                    />
                  </div>
                )}

                <div className="border border-slate-200/60 rounded-xl overflow-hidden mt-6">
                  <div className="bg-slate-50 p-3 border-b border-slate-200/60 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-slate-800">
                        أوقات العمل المجدولة (حسب أيام الأسبوع)
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        يتم فتح وإغلاق المتجر آلياً حسب هذه الأوقات إذا لم يكن
                        الإغلاق اليدوي مفعلاً.
                      </p>
                    </div>
                    {appMode === "local" && (
                      <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded font-bold">
                        مغلق في التجريبي
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      "overflow-x-auto relative",
                      appMode === "local"
                        ? "opacity-60 pointer-events-none"
                        : "",
                    )}
                  >
                    <div className="divide-y divide-slate-100 min-w-[350px]">
                      {[
                        { id: "sunday", name: "الأحد" },
                        { id: "monday", name: "الإثنين" },
                        { id: "tuesday", name: "الثلاثاء" },
                        { id: "wednesday", name: "الأربعاء" },
                        { id: "thursday", name: "الخميس" },
                        { id: "friday", name: "الجمعة" },
                        { id: "saturday", name: "السبت" },
                      ].map((day) => {
                        const hours = settings.storeStatus?.openingHours?.[
                          day.id
                        ] || { open: "09:00", close: "23:00", enabled: true };
                        return (
                          <div
                            key={day.id}
                            className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-4 w-32 shrink-0">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={hours.enabled}
                                  onChange={(e) =>
                                    setSettings((p) => ({
                                      ...p,
                                      storeStatus: {
                                        ...p.storeStatus!,
                                        openingHours: {
                                          ...(p.storeStatus?.openingHours ||
                                            {}),
                                          [day.id]: {
                                            ...hours,
                                            enabled: e.target.checked,
                                          },
                                        },
                                      },
                                    }))
                                  }
                                />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                              </label>
                              <span
                                className={cn(
                                  "font-bold text-sm",
                                  hours.enabled
                                    ? "text-slate-700"
                                    : "text-slate-500 line-through",
                                )}
                              >
                                {day.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 flex-1 justify-end">
                              {hours.enabled ? (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500 text-xs font-bold">
                                      من
                                    </span>
                                    <input
                                      type="time"
                                      value={hours.open}
                                      onChange={(e) =>
                                        setSettings((p) => ({
                                          ...p,
                                          storeStatus: {
                                            ...p.storeStatus!,
                                            openingHours: {
                                              ...(p.storeStatus?.openingHours ||
                                                {}),
                                              [day.id]: {
                                                ...hours,
                                                open: e.target.value,
                                              },
                                            },
                                          },
                                        }))
                                      }
                                      className="bg-white border border-slate-200/60 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-500 font-bold w-28 text-center"
                                      dir="ltr"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-500 text-xs font-bold">
                                      إلى
                                    </span>
                                    <input
                                      type="time"
                                      value={hours.close}
                                      onChange={(e) =>
                                        setSettings((p) => ({
                                          ...p,
                                          storeStatus: {
                                            ...p.storeStatus!,
                                            openingHours: {
                                              ...(p.storeStatus?.openingHours ||
                                                {}),
                                              [day.id]: {
                                                ...hours,
                                                close: e.target.value,
                                              },
                                            },
                                          },
                                        }))
                                      }
                                      className="bg-white border border-slate-200/60 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-500 font-bold w-28 text-center"
                                      dir="ltr"
                                    />
                                  </div>
                                </>
                              ) : (
                                <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                                  إجازة (مغلق)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <button
              onClick={() =>
                setActiveSection(activeSection === "data" ? "" : "data")
              }
              className="w-full relative p-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200/60 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Database size={18} className="text-secondary" />
                <h2 className="font-bold">إدارة البيانات والمزامنة</h2>
              </div>
              <ChevronDown
                size={20}
                className={cn(
                  "text-slate-500 transition-transform duration-300 absolute left-4",
                  activeSection === "data" ? "rotate-180" : "",
                )}
              />
            </button>
            <div
              className={cn(
                "transition-all duration-300",
                activeSection === "data" ? "block" : "hidden",
              )}
            >
              <div className="p-3 md:p-4 space-y-6">
                <div
                  className={cn(
                    "p-3 rounded-2xl flex items-center justify-between",
                    appMode === "cloud"
                      ? "bg-emerald-50 border border-emerald-100"
                      : "bg-amber-50 border border-amber-100",
                  )}
                >
                  <div className="text-right">
                    <div
                      className={cn(
                        "text-sm font-bold",
                        appMode === "cloud"
                          ? "text-emerald-800"
                          : "text-amber-800",
                      )}
                    >
                      حالة الربط السحابي
                    </div>
                    <div
                      className={cn(
                        "text-[10px] font-bold mt-0.5",
                        appMode === "cloud"
                          ? "text-emerald-600"
                          : "text-amber-600",
                      )}
                    >
                      {appMode === "cloud"
                        ? "يعمل الآن بميزة المزامنة اللحظية (Real-time Sync)"
                        : "تعمل الآن بوضع التخزين المحلي (Offline Mode)"}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold text-white",
                      appMode === "cloud" ? "bg-emerald-500" : "bg-amber-500",
                    )}
                  >
                    {appMode === "cloud" ? (
                      <>
                        <CheckCircle2 size={12} /> متصل بالسحابة
                      </>
                    ) : (
                      <>
                        <X size={12} /> غير متصل
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {appMode === "local" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => setShowResetConfirm(true)}
                        className="w-full flex items-center justify-between p-3 border rounded-2xl transition-all shadow-sm active:scale-[0.98] group bg-rose-50 border-rose-100 hover:bg-rose-100 text-rose-700"
                      >
                        <Trash2
                          size={18}
                          className="transition-transform group-hover:rotate-12 text-rose-600"
                        />
                        <div className="text-right">
                          <div className="text-xs font-bold font-sans">
                            تصفير النظام المحلي 🧹
                          </div>
                          <div className="text-[10px] opacity-80">
                            مسح كافة البيانات وإعادة تصفير النظام بالكامل للبدء
                            مجدداً
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          const demo = GET_DEMO_DATA();
                          setData(demo);
                          addToast(
                            "تم تحميل النسخة التجريبية",
                            "تم شحن النظام بالبيانات التجريبية الترويجية بنجاح 🧪",
                            "success",
                          );
                        }}
                        className="w-full flex items-center justify-between p-3 border rounded-2xl group transition-all shadow-sm bg-indigo-50 border-indigo-150 hover:bg-indigo-100 text-indigo-700 active:scale-[0.98]"
                      >
                        <Sparkles
                          size={18}
                          className="group-hover:rotate-12 transition-transform text-amber-500 animate-pulse"
                        />
                        <div className="text-right">
                          <div className="text-xs font-bold font-sans">
                            تعبئة بيانات تجريبية 🧪
                          </div>
                          <div className="text-[10px] opacity-80">
                            ملء النظام بالبيانات الترويجية والمبيعات الكاملة
                            فوراً
                          </div>
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(() => {
                        const hasData =
                          (data.invoices && data.invoices.length > 0) ||
                          (data.products && data.products.length > 0);
                        const isDisabled = hasData;

                        return (
                          <button
                            onClick={() => setShowRestoreConfirm(true)}
                            disabled={isDisabled}
                            className={cn(
                              "w-full flex items-center justify-between p-3 border rounded-2xl group transition-all shadow-sm",
                              hasData
                                ? "bg-slate-50 border-slate-200/60 text-slate-500 cursor-not-allowed opacity-60"
                                : "bg-indigo-50 border-indigo-150 hover:bg-indigo-100 text-indigo-700 active:scale-[0.98]",
                            )}
                          >
                            <Sparkles
                              size={18}
                              className={
                                hasData
                                  ? ""
                                  : "group-hover:rotate-12 transition-transform text-amber-500"
                              }
                            />
                            <div className="text-right">
                              <div className="text-xs font-bold font-sans">
                                إسترجاع البيانات والملء السريع ⛑️
                              </div>
                              <div className="text-[10px] opacity-80">
                                {hasData
                                  ? "النظام يحتوي على بيانات فعالّة الحين"
                                  : "استعادة المبيعات، الفواتير، والعمليات كاملة فوراً"}
                              </div>
                            </div>
                          </button>
                        );
                      })()}

                      <button
                        onClick={handleDownload}
                        className={cn(
                          "w-full flex items-center justify-between p-3 border rounded-2xl transition-all shadow-sm active:scale-[0.98] group",
                          "bg-emerald-50 border-emerald-100 hover:bg-emerald-100 text-emerald-700",
                        )}
                      >
                        <DownloadCloud
                          size={18}
                          className="transition-transform group-hover:-translate-y-1"
                        />
                        <div className="text-right">
                          <div className="text-xs font-bold">
                            تصدير نسخة احتياطية
                          </div>
                          <div className="text-[10px] opacity-70 italic">
                            نسخة شاملة تشمل (نبض العملاء)
                          </div>
                        </div>
                      </button>

                      <label
                        className={cn(
                          "w-full flex items-center justify-between p-3 border rounded-2xl transition-all shadow-sm active:scale-[0.98] group",
                          "bg-sky-50 border-sky-100 hover:bg-sky-100 text-sky-700 cursor-pointer",
                        )}
                      >
                        <Upload
                          size={18}
                          className="transition-transform group-hover:-translate-y-1"
                        />
                        <div className="text-right">
                          <div className="text-xs font-bold">
                            استيراد نسخة سابقة
                          </div>
                          <div className="text-[10px] opacity-70">
                            رفع (JSON, Excel) لمزامنة النظام
                          </div>
                        </div>
                        <input
                          type="file"
                          accept=".json,.xlsx,.xls,.csv"
                          className="hidden"
                          onChange={handleImport}
                        />
                      </label>

                      <button
                        onClick={() => setShowResetConfirm(true)}
                        className="w-full flex items-center justify-between p-3 border rounded-2xl transition-all shadow-sm active:scale-[0.98] group bg-rose-50 border-rose-100 hover:bg-rose-100 text-rose-700"
                      >
                        <Trash2
                          size={18}
                          className="transition-transform group-hover:rotate-12 text-rose-600"
                        />
                        <div className="text-right">
                          <div className="text-xs font-bold font-sans">
                            إعادة تهيئة البيانات
                          </div>
                          <div className="text-[10px] opacity-70">
                            مسح البيانات التجريبية وتنظيف السجلات للبدء من جديد
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Developer Info - Hidden as requested */}
                  {false && (
                    <div className="mt-8 p-3 md:p-4 bg-slate-900 text-white rounded-3xl space-y-4 border border-slate-700 shadow-xl">
                      {/* ... hidden content ... */}
                    </div>
                  )}
                </div>
              </div>

              {showResetConfirm &&
                createPortal(
                  <div
                    className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
                    onClick={() => !isResetting && setShowResetConfirm(false)}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl text-center border border-slate-100 flex flex-col max-h-[90vh] overflow-visible"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="overflow-y-auto custom-scrollbar flex-1 px-1">
                        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
                          <Trash2 size={40} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-4">
                          هل أنت متأكد؟
                        </h3>
                        <p className="text-slate-500 font-bold mb-8 leading-relaxed">
                          هذا الإجراء سيقوم بحذف{" "}
                          <span className="text-rose-600 underline">كافة</span>{" "}
                          بيانات المبيعات والعملاء والمصروفات نهائياً.
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 pt-5 mt-auto border-t border-slate-100 bg-white">
                        <button
                          onClick={handleResetData}
                          disabled={isResetting}
                          className="w-full py-4 bg-rose-500 disabled:opacity-60 disabled:cursor-wait text-white rounded-2xl font-bold shadow-xl shadow-rose-500/30 hover:bg-rose-600 transition-all active:scale-95"
                        >
                          {isResetting ? "جاري التنفيذ..." : "نعم، بمسح كل شيء"}
                        </button>
                        <button
                          onClick={() =>
                            !isResetting && setShowResetConfirm(false)
                          }
                          className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                        >
                          تراجع
                        </button>
                      </div>
                    </motion.div>
                  </div>,
                  document.body,
                )}

              {showRestoreConfirm &&
                createPortal(
                  <div
                    className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4 text-right"
                    dir="rtl"
                    onClick={() => setShowRestoreConfirm(false)}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-visible"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="overflow-y-auto custom-scrollbar flex-1 px-1">
                        <div className="w-20 h-20 bg-indigo-50/80 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
                          <Sparkles
                            size={40}
                            className="animate-pulse text-indigo-600"
                          />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-4 font-sans text-center">
                          استرجاع وملء البيانات الطارئ ⛑️
                        </h3>
                        <p className="text-slate-500 font-bold mb-8 leading-relaxed text-sm text-center">
                          يا طويل العمر، هذا الإجراء بيسترجع لك نسخة شاملة من
                          كافة المبيعات، العملاء والموردين، الفواتير، وهيكل
                          المكافآت والخصومات لإعادة لوحة التحكم للعمل فوراً.
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 pt-5 mt-auto border-t border-slate-100 bg-white">
                        <button
                          onClick={handleRestoreBackup}
                          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                        >
                          نعم، استرجع كافة البيانات
                        </button>
                        <button
                          onClick={() => setShowRestoreConfirm(false)}
                          className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                        >
                          تراجع
                        </button>
                      </div>
                    </motion.div>
                  </div>,
                  document.body,
                )}
            </div>
          </section>

          {/* Integration API Section - Hidden as requested */}
          {/*
 <section className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
 ...
 </section>
 */}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <section className="bg-gradient-to-br from-secondary to-secondary/80 rounded-2xl shadow-lg p-3 md:p-4 text-white text-center">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Settings className="animate-spin-slow" size={32} />
            </div>
            <h3 className="font-bold text-lg mb-2">نظام مطبخ التراث</h3>
            <p className="text-white/70 text-sm mb-6">
              الإصدار 2.6 برو - تم تطويره بكل فخر لدعم نمو عملك.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
