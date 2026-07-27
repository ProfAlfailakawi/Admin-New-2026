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
  Archive,
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
import { GET_DEMO_DATA, GENERATE_PERFORMANCE_SIMULATION_DATA } from "../data";
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
  limit,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db, auth, getSmartDoc } from "../firebase";
import { Toggle } from "./ui/Toggle";
import { INITIAL_DATA } from "../data";
import { readLogicalAppDataShard, writeLogicalAppDataShard } from "../lib/firestoreShardStorage";
import { isFailedStatus, isPaidStatus } from "../lib/status-utils";

import { EnableNotificationsButton } from "./EnableNotificationsButton";
import {
  getPushSupportStatus,
  refreshPushRegistrationIfAlreadyAllowed,
} from "../lib/pushNotifications";
import {
  AUTHORIZED_EMAILS,
  AUTHORIZED_PARTNERS,
  AUTHORIZED_PARTNER_UIDS,
  AUTHORIZED_UIDS,
  DEFAULT_GLOBAL_LOGO,
} from "../constants";
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
const ADMIN_RESET_EXPECTED_GENERATION_KEY =
  "ktk_expected_admin_reset_generation_id";

// Older Excel round-trips could stringify split-payment arrays repeatedly. After a few
// exports an empty array could become a gigantic escaped string (sometimes even truncated
// by Excel), making the invoices shard tens of megabytes and causing intermittent imports.
// These helpers are intentionally limited to the two split-payment collection fields; they
// never alter invoice payment status, gateway IDs, payment links, totals, or notifications.
const decodeRepeatedBackupJson = (value: any, maxDepth = 40): any => {
  let current = value;
  for (let depth = 0; depth < maxDepth && typeof current === "string"; depth += 1) {
    let text = current.trim();
    if (!text) return "";

    // Excel can prefix formula-looking text with an apostrophe. Remove it only when the
    // remaining value clearly begins as JSON.
    if (text.startsWith("'") && /^[\[{"]/.test(text.slice(1).trim())) {
      text = text.slice(1).trim();
    }

    if (!/^(?:[\[{"]|null$|true$|false$|-?\d)/.test(text)) break;
    try {
      const parsed = JSON.parse(text);
      if (parsed === current) break;
      current = parsed;
    } catch {
      break;
    }
  }
  return current;
};

const normalizeSplitBackupCollection = (value: any): any[] => {
  const decoded = decodeRepeatedBackupJson(value);
  if (Array.isArray(decoded)) return decoded;
  if (decoded && typeof decoded === "object") return [decoded];

  // splitPayments/splitParticipants are array fields. A non-array string here is either an
  // old empty value or a truncated repeated-stringification artifact; keeping it would make
  // every future backup grow exponentially again.
  return [];
};

const normalizeBackupSplitFields = (state: any): any => {
  if (!state || typeof state !== "object" || Array.isArray(state)) return state;
  const normalizeRecord = (record: any) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) return record;
    return {
      ...record,
      splitPayments: normalizeSplitBackupCollection(record.splitPayments),
      splitParticipants: normalizeSplitBackupCollection(record.splitParticipants),
    };
  };

  return {
    ...state,
    invoices: Array.isArray(state.invoices)
      ? state.invoices.map(normalizeRecord)
      : state.invoices,
    orders: Array.isArray(state.orders)
      ? state.orders.map(normalizeRecord)
      : state.orders,
  };
};

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
  userEmailMissing?: boolean;
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
  userName?: string;
  userEmail?: string;
  userRole?: string;
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

interface DeviceCompassProps {
  allCards: any[];
  sendingPushTestId: string | null;
  sendPushDeviceTestNotification: (device: any, candidateDevices?: any[]) => Promise<void>;
  triggerShockwave: (e: React.MouseEvent) => void;
  openPushRadarArea: (tab: "users" | "log" | "advanced", filter?: "all" | "golden" | "silent" | "ghost" | "archived") => void;
  getPushDeviceConfidence: (device: any) => number;
  getPushDeviceConfidenceMeta: (score: number) => { label: string; className: string };
}

const DeviceCompass: React.FC<DeviceCompassProps> = ({
  allCards,
  sendingPushTestId,
  sendPushDeviceTestNotification,
  triggerShockwave,
  openPushRadarArea,
  getPushDeviceConfidence,
  getPushDeviceConfidenceMeta
}) => {
  const [hoveredCard, setHoveredCard] = useState<any | null>(null);
  const isCompactCompass = typeof window !== "undefined" && window.innerWidth < 430;
  const compassSize = isCompactCompass ? 236 : 280;
  const compassCenter = compassSize / 2;
  const compassScale = compassSize / 320;

  // Group cards that have devices
  const cardsWithDevices = allCards.filter(c => (c.devices || []).length > 0);

  // Separate them into three groups
  const goldCards = cardsWithDevices.filter(c => c.state.rank === 1 || c.state.rank === 2);
  const silentCards = cardsWithDevices.filter(c => c.state.rank === 3);
  const ghostCards = cardsWithDevices.filter(c => c.state.rank >= 4);

  // Helper to calculate exact coordinates
  const getCoordinates = (index: number, total: number, radius: number, offsetAngle = 0) => {
    if (total === 0) return { x: compassCenter, y: compassCenter, angle: 0 };
    const angle = (index * (2 * Math.PI) / total) + offsetAngle;
    const x = compassCenter + (radius * compassScale) * Math.cos(angle);
    const y = compassCenter + (radius * compassScale) * Math.sin(angle);
    return { x, y, angle };
  };

  const compassNodes: any[] = [];

  goldCards.forEach((card, idx) => {
    const coords = getCoordinates(idx, goldCards.length, 55, 0.4);
    compassNodes.push({ card, ...coords, radius: 55, type: 'golden', dotColor: '#10b981', glowColor: 'rgba(16, 185, 129, 0.35)' });
  });

  silentCards.forEach((card, idx) => {
    const coords = getCoordinates(idx, silentCards.length, 95, 1.2);
    compassNodes.push({ card, ...coords, radius: 95, type: 'silent', dotColor: '#fbbf24', glowColor: 'rgba(251, 191, 36, 0.35)' });
  });

  ghostCards.forEach((card, idx) => {
    const coords = getCoordinates(idx, ghostCards.length, 132, 2.3);
    compassNodes.push({ card, ...coords, radius: 132, type: 'ghost', dotColor: '#ef4444', glowColor: 'rgba(239, 68, 68, 0.2)' });
  });

  return (
    <div
      className="relative rounded-full flex items-center justify-center select-none bg-slate-950 border border-amber-300/40 text-white shadow-[0_18px_48px_-12px_rgba(0,0,0,0.9)] p-1 overflow-hidden"
      id="device-deera-compass"
      style={{ width: compassSize, height: compassSize, maxWidth: 'calc(100vw - 92px)', maxHeight: 'calc(100vw - 92px)' }}
    >
       {/* Scanning effect */}
       <motion.div
         className="absolute inset-0 pointer-events-none rounded-full z-0"
         style={{
           background: "conic-gradient(from 0deg, rgba(245, 158, 11, 0.12) 0deg, rgba(245, 158, 11, 0) 90deg)",
         }}
         animate={{ rotate: 360 }}
         transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
       />

       {/* Traditional compass face background SVG */}
       <svg width={compassSize - 10} height={compassSize - 10} viewBox="0 0 320 320" className="absolute inset-0 m-auto pointer-events-none z-10">
         <defs>
           <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
             <stop offset="0%" stopColor="#ffd700" />
             <stop offset="50%" stopColor="#d4af37" />
             <stop offset="100%" stopColor="#aa7c11" />
           </linearGradient>
           <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
             <stop offset="0%" stopColor="rgba(24, 34, 54, 0.95)" />
             <stop offset="70%" stopColor="rgba(12, 17, 30, 0.98)" />
             <stop offset="100%" stopColor="rgba(2, 4, 10, 1)" />
           </radialGradient>
         </defs>

         {/* Base backing */}
         <circle cx="160" cy="160" r="156" fill="url(#ringGlow)" stroke="url(#goldGradient)" strokeWidth="1.5" className="opacity-95" />
         
         {/* Concentric Orbits (Matching green, yellow, red statuses with elegant translucent contrast) */}
         <circle cx="160" cy="160" r="55" fill="none" stroke="rgba(16, 185, 129, 0.25)" strokeWidth="1" strokeDasharray="3 3" />
         <circle cx="160" cy="160" r="95" fill="none" stroke="rgba(251, 191, 36, 0.22)" strokeWidth="1" strokeDasharray="4 4" />
         <circle cx="160" cy="160" r="132" fill="none" stroke="rgba(239, 68, 68, 0.18)" strokeWidth="0.75" strokeDasharray="5 5" />
         
         {/* Cross axis markings */}
         <line x1="160" y1="18" x2="160" y2="302" stroke="rgba(212, 175, 55, 0.12)" strokeWidth="0.75" />
         <line x1="18" y1="160" x2="302" y2="160" stroke="rgba(212, 175, 55, 0.12)" strokeWidth="0.75" />

         {/* Outer dial markings with improved gold visibility */}
         {Array.from({ length: 48 }).map((_, i) => {
           const angle = (i * 360 / 48) * Math.PI / 180;
           const isQuarterLabel = i % 12 === 0;
           const rStart = isQuarterLabel ? 146 : 149;
           const rEnd = 155;
           const x1 = 160 + rStart * Math.cos(angle);
           const y1 = 160 + rStart * Math.sin(angle);
           const x2 = 160 + rEnd * Math.cos(angle);
           const y2 = 160 + rEnd * Math.sin(angle);
           return (
             <line
               key={i}
               x1={x1}
               y1={y1}
               x2={x2}
               y2={y2}
               stroke={isQuarterLabel ? "url(#goldGradient)" : "rgba(212, 175, 55, 0.35)"}
               strokeWidth={isQuarterLabel ? "1.5" : "0.75"}
             />
           );
         })}

         {/* Traditional Arabic cardinal titles rendered with HTML to preserve Arabic shaping */}
         {[
           { x: 126, y: 18, label: 'الشمال' },
           { x: 126, y: 282, label: 'الجنوب' },
           { x: 252, y: 150, label: 'الشرق' },
           { x: 0, y: 150, label: 'الغرب' },
         ].map((dir) => (
           <foreignObject key={dir.label} x={dir.x} y={dir.y} width="68" height="24">
             <div dir="rtl" style={{
               width: '68px',
               height: '24px',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               color: '#d4af37',
               fontSize: '11px',
               fontWeight: 950,
               lineHeight: 1,
               textShadow: '0 2px 4px rgba(0,0,0,0.9)',
               fontFamily: 'inherit',
               whiteSpace: 'nowrap',
             }}>
               {dir.label}
             </div>
           </foreignObject>
         ))}

         {/* Compass center title */}
         <foreignObject x="106" y="210" width="108" height="26">
           <div  dir="rtl" style={{
             width: '108px',
             height: '26px',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             color: 'rgba(212, 175, 55, 0.45)',
             fontSize: '10px',
             fontWeight: 900,
             letterSpacing: '0px',
             fontFamily: 'inherit',
             whiteSpace: 'nowrap',
           }}>
             ديرة الأجهزة
           </div>
         </foreignObject>
       </svg>

       {/* Interactive Nodes */}
       {compassNodes.map((node, i) => {
         const isActive = sendingPushTestId === node.card.bestDevice?.id;
         // Soft float offset calculated with cosine/sine relative to node index
         const floatX = Math.sin(i + Date.now() / 2000) * 1.5;
         const floatY = Math.cos(i + Date.now() / 2000) * 1.5;

         const leftPos = node.x + floatX;
         const topPos = node.y + floatY;

         return (
           <div
             key={node.card.key}
             className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
             style={{ left: leftPos, top: topPos }}
             onMouseEnter={() => setHoveredCard(node.card)}
             onMouseLeave={() => setHoveredCard(null)}
             onClick={(e) => {
               if (node.card.bestDevice) {
                 triggerShockwave(e);
                 void sendPushDeviceTestNotification(node.card.bestDevice, node.card.devices);
               }
             }}
           >
             <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110">
               {/* Translucent glow ring */}
               <motion.div
                 className="absolute inset-0 rounded-full opacity-40"
                 style={{ border: `1.5px solid ${node.dotColor}`, backgroundColor: node.glowColor }}
                 animate={node.type === 'golden' ? { scale: [1, 1.35, 1], opacity: [0.5, 0.2, 0.5] } : {}}
                 transition={{ duration: 2.2 + (i % 3) * 0.4, repeat: Infinity }}
               />
               
               {/* Center core dot */}
               <div
                 className="w-3.5 h-3.5 rounded-full border border-slate-950 shadow-md flex items-center justify-center"
                 style={{ backgroundColor: node.dotColor }}
               >
                 {isActive && (
                   <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                 )}
               </div>
             </div>
           </div>
         );
       })}

       {/* Floating Detail Overlay inside the compass center when node hovered */}
       {hoveredCard ? (
         <div className="absolute inset-x-6 top-[70px] bottom-[70px] mx-auto w-[210px] h-[145px] z-30 rounded-2xl bg-slate-950/95 border border-amber-400/40 p-3 shadow-[0_12px_48px_rgba(0,0,0,0.95)] shadow-amber-950/40 backdrop-blur-md flex flex-col justify-between text-right pointer-events-none">
           <div>
             <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5 min-w-0">
               <span className="text-[8px] rounded-lg bg-white/10 px-1.5 py-0.5 text-white/75 font-black shrink-0">
                 {hoveredCard.identity.role === 'partner' ? 'شريك' : hoveredCard.identity.role === 'admin' ? 'مدير' : 'موظف'}
               </span>
               <strong className="text-[11px] font-black text-amber-300 truncate mr-2">
                 {hoveredCard.identity.name || "مستخدم"}
               </strong>
             </div>
             
             <div className="space-y-1 text-[9px] font-bold">
               <div className="flex items-center justify-between text-white/80">
                 <span dir="ltr" className="font-semibold truncate max-w-[130px] text-white">{hoveredCard.bestDevice?.label || hoveredCard.bestDevice?.browser || "جهاز غير معروف"}</span>
                 <span className="text-white/50">الجهاز:</span>
               </div>
               <div className="flex items-center justify-between text-white/80">
                 <span dir="ltr" className="font-semibold text-emerald-400">{hoveredCard.bestScore}%</span>
                 <span className="text-white/50">ثقة الإشارة:</span>
               </div>
               <div className="flex items-center justify-between text-white/80">
                 <span className="text-amber-200 truncate max-w-[125px]">{hoveredCard.state.label}</span>
                 <span className="text-white/50">الحالة:</span>
               </div>
             </div>
           </div>

           <div className="border-t border-white/5 pt-1 text-center font-black">
             <div className="text-[9px] font-black text-amber-200/90 flex items-center justify-center gap-1">
               <Send size={10} className="text-amber-300" />
               اضغط للاختبار وإطلاق موجة
             </div>
           </div>
         </div>
       ) : (
         /* Center server hub and pulsing compass needle representing orientation */
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
           {/* Center golden hub */}
           <div className="relative w-8 h-8 rounded-full bg-slate-950 border-2 border-amber-400 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
             <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 animate-pulse" />
             <div className="absolute -inset-1.5 rounded-full border border-amber-400/20 animate-ping opacity-30" />
           </div>
           
           {/* Real Compass needle element with gentle micro-swing animation */}
           <svg width={compassSize - 10} height={compassSize - 10} viewBox="0 0 320 320" className="absolute inset-0 m-auto pointer-events-none z-0">
             <motion.g
               initial={{ rotate: 15 }}
               animate={{ rotate: [15, 38, 22, 34, 28, 30] }}
               transition={{
                 duration: 7,
                 ease: "easeInOut",
                 repeat: Infinity,
                 repeatType: "reverse"
               }}
               style={{ transformOrigin: "160px 160px" }}
             >
               <polygon points="160,82 163,160 160,168 157,160" fill="url(#goldGradient)" className="opacity-90" />
               <polygon points="160,238 163,160 160,152 157,160" fill="rgba(255,255,255,0.4)" className="opacity-50" />
             </motion.g>
           </svg>
         </div>
       )}
    </div>
  );
};

const GeneralSettings: React.FC<Props> = ({
  data,
  setData,
  appMode,
  switchMode,
  addToast,
  onCloudImport,
}) => {
  const [shockwaves, setShockwaves] = useState<{ id: string; x: number; y: number }[]>([]);

  const triggerShockwave = (e: React.MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    const newWave = { id: String(Math.random()), x, y };
    setShockwaves((prev) => [...prev, newWave]);
    setTimeout(() => {
      setShockwaves((prev) => prev.filter((w) => w.id !== newWave.id));
    }, 1800);
  };

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
  const importInFlightRef = useRef(false);
  const [pushHealth, setPushHealth] = useState<PushHealthCheck | null>(null);
  const [checkingPushHealth, setCheckingPushHealth] = useState(false);
  const [pushDevices, setPushDevices] = useState<PushDeviceSnapshot[]>([]);
  const [pushEventLogs, setPushEventLogs] = useState<PushEventLog[]>([]);
  const [expandedPushDeviceId, setExpandedPushDeviceId] = useState<
    string | null
  >(null);
  const [pushHealthDetailsOpen, setPushHealthDetailsOpen] = useState(false);
  const [pushDevicesPanelOpen, setPushDevicesPanelOpen] = useState(false);
  // Invoice → notification delivery log. Answers "was I actually told about this
  // payment?", which nothing in the app could show before.
  const [invoiceAlerts, setInvoiceAlerts] = useState<any[] | null>(null);
  const [invoiceAlertsBusy, setInvoiceAlertsBusy] = useState(false);
  const [resendingInvoice, setResendingInvoice] = useState("");
  const [pushDeviceTab, setPushDeviceTab] = useState<
    "users" | "devices" | "log" | "investigate" | "advanced"
  >("users");
  const [pushDeviceSearch, setPushDeviceSearch] = useState("");
  const [pushDeviceMapFilter, setPushDeviceMapFilter] = useState<
    "all" | "golden" | "silent" | "ghost" | "archived"
  >("all");
  const [pushUsersVisibleCount, setPushUsersVisibleCount] = useState(12);
  const [expandedPushDeviceGroup, setExpandedPushDeviceGroup] =
    useState<string>("active");
  const [pushArchiveAccountsOpen, setPushArchiveAccountsOpen] = useState(false);
  const [pushAdvancedFilter, setPushAdvancedFilter] = useState<
    "all" | "noRead" | "noUser" | "noLogs" | "weak" | "duplicates"
  >("all");
  const [pushLogStatusFilter, setPushLogStatusFilter] = useState<
    "all" | "delivered" | "opened" | "failed" | "waiting"
  >("all");
  const [pushLogVisibleCount, setPushLogVisibleCount] = useState(20);
  const [selectedPushNotificationId, setSelectedPushNotificationId] = useState<string | null>(null);
  const [pushCustomerVerdict, setPushCustomerVerdict] = useState<string>("اضغط الفحص لقراءة أحدث إشارة من الأجهزة قبل الحكم.");
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
  const [pushInvalidTestTokens, setPushInvalidTestTokens] = useState<
    Record<string, true>
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
      return "انفتح";
    if (
      event?.receivedByDevice ||
      event?.status === "received_by_device" ||
      event?.lastClientReceiptStatus === "received"
    )
      return "وصل للجهاز";
    if (event?.success === false || event?.status === "failed_by_fcm")
      return "فشل الإرسال";
    if (event?.success === true || event?.status === "accepted_by_fcm")
      return "أرسلناه";
    return "مسجل";
  };

  const looksLikeTechnicalId = (value?: string) => {
    const text = String(value || "").trim();
    if (!text) return false;
    if (text.includes("@")) return false;
    return /^[a-zA-Z0-9_-]{20,}$/.test(text);
  };

  const cleanPushAccountLabel = (value?: string, fallback = "حساب غير مسمى") => {
    const text = String(value || "").trim();
    if (!text || looksLikeTechnicalId(text) || /^User\s+/i.test(text)) return fallback;
    return text;
  };

  const getPushPersonName = (identity?: PushUserIdentity, fallbackUserId?: string) => {
    if (!identity) return cleanPushAccountLabel(fallbackUserId, "حساب غير مرتبط");
    return cleanPushAccountLabel(
      identity.name || identity.email || identity.phone || fallbackUserId || identity.id,
      identity.email || "حساب غير مسمى",
    );
  };

  const getPushPersonSubtitle = (identity?: PushUserIdentity, fallbackUserId?: string) => {
    const email = String(identity?.email || "").trim();
    if (email) return email;
    const phone = String(identity?.phone || "").trim();
    if (phone) return phone;
    const cleanId = cleanPushAccountLabel(identity?.id || fallbackUserId, "");
    return cleanId && cleanId !== getPushPersonName(identity, fallbackUserId)
      ? cleanId
      : "لم يتم حفظ الإيميل لهذا الحساب";
  };


  const getPushNotificationRecipientMeta = (notification: any) => {
    const device = notification?.device || {};
    const rawUserId = String(
      notification?.userId ||
        notification?.recipientId ||
        device?.userId ||
        device?.ownerId ||
        device?.uid ||
        "",
    ).trim();
    const directName = cleanPushAccountLabel(
      notification?.userName || notification?.displayName || device?.userName || device?.ownerLabel || device?.label,
      "",
    );
    const directoryName = getPushUserDisplayById(rawUserId);
    const name = cleanPushAccountLabel(
      directName || notification?.userEmail || device?.userEmail || directoryName || rawUserId,
      "حساب غير محدد",
    );
    const deviceLabel = cleanPushAccountLabel(
      notification?.deviceLabel || device?.label || device?.platform || device?.deviceType,
      "جهاز غير محدد",
    );
    const subtitle = String(notification?.userEmail || device?.userEmail || device?.phone || device?.userPhone || rawUserId || "").trim();
    const tokenSource = String(notification?.tokenStart || notification?.token || device?.tokenStart || device?.token || "").trim();
    const tokenTail = tokenSource
      ? `${tokenSource.slice(0, 7)}…${tokenSource.slice(-5)}`
      : "بدون توكن ظاهر";
    return { name, subtitle, deviceLabel, tokenTail };
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
      userId: String(event.userId || event.recipientId || event.adminId || event.employeeId || event.staffId || event.ownerId || ""),
      userName: String(event.userName || event.employeeName || event.staffName || event.adminName || event.ownerName || event.displayName || ""),
      userEmail: String(event.userEmail || event.email || event.employeeEmail || event.staffEmail || event.adminEmail || event.ownerEmail || ""),
      userRole: String(event.userRole || event.role || event.accountType || ""),
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
        event.receivedByDevice,
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
        className: "text-emerald-700 bg-emerald-50 border-emerald-200",
      };
    if (score >= 55)
      return {
        label: "ثقة متوسطة",
        className: "text-amber-700 bg-amber-50 border-amber-200",
      };
    return {
      label: "ثقة ضعيفة",
      className: "text-rose-700 bg-rose-50 border-rose-200",
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

  const loadInvoiceAlerts = async () => {
    setInvoiceAlertsBusy(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/push/invoice-alerts?limit=40", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "تعذر القراءة");
      setInvoiceAlerts(json.rows || []);
    } catch (e: any) {
      toast.error(e?.message || "تعذر قراءة سجل الإشعارات");
    } finally {
      setInvoiceAlertsBusy(false);
    }
  };

  const resendInvoiceAlert = async (invoiceId: string) => {
    setResendingInvoice(invoiceId);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/push/invoice-alerts/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ invoiceId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "تعذر الإرسال");
      toast.success(`أُرسل إشعار ${invoiceId}`);
      await loadInvoiceAlerts();
    } catch (e: any) {
      toast.error(e?.message || "تعذر إعادة الإرسال");
    } finally {
      setResendingInvoice("");
    }
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

  const refreshPushDashboardReadings = async () => {
    const realPushEvents = await readRealPushEventLogs();
    setPushEventLogs(realPushEvents);
    const userDirectory = await readPushUserDirectory();
    setPushUserDirectory(userDirectory);
    const allDevices = await readAllPushDeviceSnapshots(
      realPushEvents,
      userDirectory,
    );
    setPushDevices(allDevices);
  };

  const getPushTestDeviceTime = (device?: PushDeviceSnapshot) => {
    if (!device) return 0;
    const readTime = Date.parse(device.lastRead || "");
    if (Number.isFinite(readTime)) return readTime;
    const connectionTime = Date.parse(device.lastConnection || "");
    return Number.isFinite(connectionTime) ? connectionTime : 0;
  };

  const getBestPushTestDevice = (
    primaryDevice: PushDeviceSnapshot,
    candidateDevices: PushDeviceSnapshot[] = [],
  ) => {
    const uniqueDevices = [primaryDevice, ...candidateDevices].filter(
      (item, index, arr) =>
        item?.token &&
        item.token !== "Not available" &&
        arr.findIndex((device) => device.token === item.token) === index,
    );
    return uniqueDevices
      .filter((item) => !pushInvalidTestTokens[item.token])
      .sort((a, b) => {
        const statusScore = (device: PushDeviceSnapshot) =>
          device.status === "online" ? 3 : device.status === "cold" ? 2 : device.status === "unknown" ? 1 : 0;
        const statusDiff = statusScore(b) - statusScore(a);
        if (statusDiff) return statusDiff;
        const confidenceDiff = getPushDeviceConfidence(b) - getPushDeviceConfidence(a);
        if (confidenceDiff) return confidenceDiff;
        return getPushTestDeviceTime(b) - getPushTestDeviceTime(a);
      });
  };

  const sendPushDeviceTestNotification = async (
    device: PushDeviceSnapshot,
    candidateDevices: PushDeviceSnapshot[] = [],
  ) => {
    const testDevices = getBestPushTestDevice(device, candidateDevices);
    if (!testDevices.length) {
      toast.error("لا يوجد توكن حديث صالح للاختبار لهذا الحساب");
      return;
    }
    const getPushTestFailureMessage = (rawError?: any, rawMessage?: any) => {
      const raw = String(rawError || rawMessage || "Unknown error");
      const lower = raw.toLowerCase();
      if (lower.includes("firebase not initialized")) {
        return "تعذر إرسال الاختبار: اتصال Firebase في الخادم غير جاهز الآن. جهازك قد يكون مربوط، لكن الاختبار يحتاج صلاحية الخادم للإرسال.";
      }
      if (
        lower.includes("device unregistered") ||
        lower.includes("registration-token-not-registered") ||
        lower.includes("notregistered") ||
        lower.includes("not registered")
      ) {
        return "تعذر إرسال الاختبار: التوكن المختار قديم أو استبدله الجهاز. لا يعني أن حسابك غير مربوط؛ جرّب فحص الآن من نفس الجهاز بعد تفعيل الإشعارات لتحديث التوكن.";
      }
      return `تعذر إرسال الاختبار: ${raw}`;
    };
    const isRetiredPushTokenError = (rawError?: any, rawMessage?: any) => {
      const lower = String(rawError || rawMessage || "").toLowerCase();
      return (
        lower.includes("device unregistered") ||
        lower.includes("registration-token-not-registered") ||
        lower.includes("notregistered") ||
        lower.includes("not registered")
      );
    };
    setSendingPushTestId(device.id);
    setPushTestResults((prev) => ({
      ...prev,
      [device.id]: "جاري اختيار أحدث توكن نشط وإرسال اختبار...",
    }));
    try {
      await refreshPushRegistrationIfAlreadyAllowed({
        userId: auth?.currentUser?.uid || "admin",
        userEmail: auth?.currentUser?.email || "",
        userName: auth?.currentUser?.displayName || auth?.currentUser?.email || "",
        userRole: AUTHORIZED_PARTNERS.includes(
          String(auth?.currentUser?.email || "").toLowerCase(),
        )
          ? "partner"
          : "admin",
        restaurantId: "kitchen_default",
      }).catch(() => null);

      let lastFailureMessage = "";
      for (const testDevice of testDevices.slice(0, 3)) {
        const response = await fetch("/api/push/test-device", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: testDevice.token,
            title: pushTestTitle || "اختبار إشعار تجريبي من الأدمن",
            body:
              pushTestBody ||
              "هذا إشعار اختبار فقط للتأكد من وصول التنبيه لهذا الجهاز.",
            userId: testDevice.userId || device.userId || "",
            deviceLabel: testDevice.label,
            url: typeof window !== "undefined" ? window.location.href : "/",
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (result?.success) {
          const usedNewest = testDevice.id !== device.id;
          const message = usedNewest
            ? "تم إرسال الاختبار على أحدث جهاز نشط بدل توكن قديم لهذا الحساب."
            : "تم إرسال الاختبار. راقب آخر الإشعارات: إذا ظهر وصل للجهاز أو انفتح فهذا تأكيد الوصول.";
          setPushTestResults((prev) => ({ ...prev, [device.id]: message }));
          toast.success("تم إرسال إشعار اختبار للجهاز");
          await refreshPushDashboardReadings().catch(() => null);
          if (typeof window !== "undefined") {
            window.setTimeout(() => {
              void refreshPushDashboardReadings().catch(() => null);
            }, 1800);
          }
          return;
        }
        lastFailureMessage = getPushTestFailureMessage(result?.error, result?.message);
        if (isRetiredPushTokenError(result?.error, result?.message)) {
          setPushInvalidTestTokens((prev) => ({ ...prev, [testDevice.token]: true }));
          continue;
        }
        break;
      }

      const message = testDevices.length > 1
        ? `${lastFailureMessage} تم تجاوز أي توكن قديم معروف وتجربة أحدث خيار متاح دون حذف أو تعديل بيانات.`
        : lastFailureMessage;
      setPushTestResults((prev) => ({ ...prev, [device.id]: message }));
      toast.error("فشل إرسال إشعار الاختبار", {
        description: message,
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
        record?.username ||
        record?.ownerName ||
        record?.accountName ||
        record?.createdByName ||
        record?.registeredByName ||
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
        record.authUid ||
        record.accountUid ||
        record.ownerUid ||
        record.createdByUid ||
        record.registeredByUid ||
        record.userId ||
        record.employeeId ||
        record.staffId ||
        record.adminId ||
        record.partnerId ||
        record.localId ||
        record.ownerId ||
        record.accountId ||
        record.createdBy ||
        record.registeredBy ||
        record.id ||
        record.email ||
        "",
    ).trim();
    const email = String(
      record.email ||
        record.userEmail ||
        record.employeeEmail ||
        record.staffEmail ||
        record.adminEmail ||
        record.partnerEmail ||
        record.localEmail ||
        record.ownerEmail ||
        record.accountEmail ||
        record.loginEmail ||
        record.createdByEmail ||
        record.registeredByEmail ||
        "",
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
      record.ownerId,
      record.accountId,
      record.authUid,
      record.accountUid,
      record.ownerUid,
      record.createdBy,
      record.registeredBy,
      record.createdByEmail,
      record.registeredByEmail,
      record.ownerEmail,
      record.accountEmail,
      record.loginEmail,
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
    AUTHORIZED_EMAILS.forEach((email) =>
      addPushUserIdentity(
        map,
        {
          id: email,
          email,
          displayName: email,
          role: "admin",
        },
        "admin",
        "authorizedEmails",
      ),
    );
    AUTHORIZED_PARTNERS.forEach((email) =>
      addPushUserIdentity(
        map,
        {
          id: email,
          email,
          displayName: email,
          role: "partner",
        },
        "partner",
        "authorizedPartners",
      ),
    );
    AUTHORIZED_UIDS.forEach((uid) =>
      addPushUserIdentity(
        map,
        {
          uid,
          id: uid,
          displayName: "حساب أدمن محفوظ",
          role: "admin",
        },
        "admin",
        "authorizedUids",
      ),
    );
    AUTHORIZED_PARTNER_UIDS.forEach((uid) =>
      addPushUserIdentity(
        map,
        {
          uid,
          id: uid,
          displayName: "حساب شريك محفوظ",
          role: "partner",
        },
        "partner",
        "authorizedPartnerUids",
      ),
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
      ["appUsers", "user"],
      ["systemUsers", "user"],
      ["teamMembers", "employee"],
      ["roles", "role"],
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
      ["appUsers", "user"],
      ["systemUsers", "user"],
      ["teamMembers", "employee"],
      ["workers", "employee"],
      ["drivers", "driver"],
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
      item?.email ||
        item?.userEmail ||
        item?.employeeEmail ||
        item?.staffEmail ||
        item?.adminEmail ||
        item?.partnerEmail ||
        item?.localEmail ||
        item?.ownerEmail ||
        item?.accountEmail ||
        item?.loginEmail ||
        item?.createdByEmail ||
        item?.registeredByEmail ||
        "",
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
      item?.ownerId,
      item?.authUid,
      item?.accountUid,
      item?.ownerUid,
      item?.createdBy,
      item?.registeredBy,
      item?.createdByUid,
      item?.registeredByUid,
      item?.email,
      item?.userEmail,
      item?.employeeEmail,
      item?.staffEmail,
      item?.adminEmail,
      item?.partnerEmail,
      item?.localEmail,
      item?.ownerEmail,
      item?.accountEmail,
      item?.loginEmail,
      item?.createdByEmail,
      item?.registeredByEmail,
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
    return getPushPersonName(identity, fallbackUserId);
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
        item?.authUid ||
        item?.accountUid ||
        item?.ownerUid ||
        item?.employeeId ||
        item?.staffId ||
        item?.adminId ||
        item?.partnerId ||
        item?.localId ||
        item?.ownerId ||
        item?.accountId ||
        item?.createdBy ||
        item?.registeredBy ||
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
      userEmailMissing: Boolean((userIdText || identity?.id || identity?.name) && !identity?.email),
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
          userEmail: auth?.currentUser?.email || "",
          userName:
            auth?.currentUser?.displayName ||
            auth?.currentUser?.email ||
            "",
          userRole: AUTHORIZED_PARTNERS.includes(
            String(auth?.currentUser?.email || "").toLowerCase(),
          )
            ? "partner"
            : "admin",
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
      setPushDeviceTab("users");
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
    try {
      (window as any).__ktkAdminResetInProgress = true;
    } catch {}
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
            "supplierTransfers",
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
          // Empty every logical shard first. The helper also deletes any old segmented
          // invoice/order parts. A single failed shard now aborts the reset instead of being
          // silently ignored and later reappearing after the page reload.
          await Promise.all(
            SHARDED_KEYS.map((key) =>
              writeLogicalAppDataShard(
                currentUser.uid,
                currentUser.email,
                key,
                [],
                {
                  __adminDataGenerationId: generationId,
                  __adminLastAuthoritativeWriteAt: new Date().toISOString(),
                },
              ),
            ),
          );

          const deleteCollectionInBatches = async (collectionName: string) => {
            while (true) {
              const snapshot = await getDocs(
                query(collection(db, collectionName), limit(450)),
              );
              if (snapshot.empty) break;

              const batch = writeBatch(db);
              snapshot.docs.forEach((documentSnapshot) => {
                batch.delete(documentSnapshot.ref);
              });
              await batch.commit();
            }
          };

          // These live collections are merged back into the admin state by realtime
          // listeners. They must be cleared with the main appData shards, otherwise
          // old orders/invoices reappear immediately after a successful reset.
          for (const collectionName of ["orders", "invoices", "squads"]) {
            await deleteCollectionInBatches(collectionName);
          }

          // Verify the two critical ledgers are truly empty before publishing the new root
          // generation. This prevents a partial reset from ever being reported as successful.
          for (const key of ["invoices", "orders"] as const) {
            const verification = await readLogicalAppDataShard(
              currentUser.uid,
              currentUser.email,
              key,
              true,
            );
            if (!verification.exists || !Array.isArray(verification.value) || verification.value.length !== 0) {
              throw new Error(`CLOUD_RESET_VERIFICATION_FAILED:${key}`);
            }
          }

          // Publish the reset generation only after all shards and live collections are clean.
          await setDoc(dataRef, JSON.parse(JSON.stringify(cleanRoot)), {
            merge: false,
          });

          // Arm the next boot check only after every authoritative delete succeeds.
          // This prevents a stale server cache from restoring the just-deleted data.
          try {
            localStorage.setItem(
              ADMIN_RESET_EXPECTED_GENERATION_KEY,
              generationId,
            );
          } catch {}
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
      try {
        (window as any).__ktkAdminResetInProgress = false;
      } catch {}
      setIsResetting(false);
    }
  };

  const handleRestoreBackup = async () => {
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
        if (appMode === "cloud" && onCloudImport) {
          const saved = await onCloudImport(parsed);
          if (!saved) throw new Error("CLOUD_IMPORT_NOT_CONFIRMED");
        } else {
          setData(parsed);
        }
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
        "حدث خطأ غير متوقع أثناء تفكيك أو حفظ بيانات النسخة الاحتياطية.",
        "warning",
      );
    }
  };

  // removed handleSave

  // WhatsApp data lives server-side, not in appData. The dedicated endpoint returns
  // one consistent snapshot and omits credentials, sessions and raw provider payloads.
  const fetchWhatsAppBackup = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("سجّل دخولك ثم أعد التصدير");
      const res = await fetch("/api/whatsapp/backup", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const jsonBody = await res.json();
      if (!res.ok || !jsonBody?.success) {
        throw new Error(jsonBody?.error || `HTTP ${res.status}`);
      }
      return jsonBody;
    } catch (e: any) {
      const note = `تعذر جلب بيانات واتساب: ${e?.message || e}`;
      return {
        success: false,
        settings: { note },
        counts: {},
        rules: [{ note }],
        ruleTemplates: [{ note }],
        botTexts: [{ note }],
        ratings: [{ note }],
        conversations: [{ note }],
        messages: [{ note }],
        systemQuickReplies: [{ note }],
      };
    }
  };

  const handleDownload = async () => {
    // Fetched before the workbook is assembled so every WhatsApp sheet belongs to
    // the same point-in-time snapshot.
    const waBackup = await fetchWhatsAppBackup();
    const excelSafeText = (value: any) => {
      const text = value === undefined || value === null ? "" : String(value);
      return /^[=+\-@]/.test(text) ? `'${text}` : text;
    };
    const waRules = (waBackup.rules || []).map((rule: any) => ({
      ...rule,
      title: excelSafeText(rule.title),
      enabled: rule.enabled === false ? "لا" : rule.enabled === true ? "نعم" : "",
      keywords: Array.isArray(rule.keywords)
        ? rule.keywords.map(excelSafeText).join(" | ")
        : excelSafeText(rule.keywords),
      response: excelSafeText(rule.response),
    }));
    const waRuleTemplates = (waBackup.ruleTemplates || []).map((rule: any) => ({
      ...rule,
      title: excelSafeText(rule.title),
      enabled: rule.enabled === false ? "لا" : rule.enabled === true ? "نعم" : "",
      keywords: Array.isArray(rule.keywords)
        ? rule.keywords.map(excelSafeText).join(" | ")
        : excelSafeText(rule.keywords),
      response: excelSafeText(rule.response),
    }));
    const waBotTexts = (waBackup.botTexts || []).map((text: any) => ({
      ...text,
      label: excelSafeText(text.label),
      hint: excelSafeText(text.hint),
      state: text.state === "custom" ? "معدّل" : text.state === "default" ? "افتراضي" : text.state,
      savedText: excelSafeText(text.savedText),
      defaultText: excelSafeText(text.defaultText),
      effectiveText: excelSafeText(text.effectiveText),
    }));
    const waRatings = (waBackup.ratings || []).map((rating: any) => ({
      ...rating,
      phone: excelSafeText(rating.phone),
      phoneMasked: excelSafeText(rating.phoneMasked),
      customerName: excelSafeText(rating.customerName),
      label: excelSafeText(rating.label),
    }));
    const waConversations = (waBackup.conversations || []).map((conversation: any) => ({
      ...conversation,
      phone: excelSafeText(conversation.phone),
      customerName: excelSafeText(conversation.customerName),
      lastInboundText: excelSafeText(conversation.lastInboundText),
      lastOutboundText: excelSafeText(conversation.lastOutboundText),
      lastMessageText: excelSafeText(conversation.lastMessageText),
      tags: Array.isArray(conversation.tags)
        ? conversation.tags.map(excelSafeText).join(" | ")
        : excelSafeText(conversation.tags),
      assignedTo: excelSafeText(conversation.assignedTo),
    }));
    const waMessages = (waBackup.messages || []).map((message: any) => ({
      ...message,
      phone: excelSafeText(message.phone),
      text: excelSafeText(message.text),
      waMessageId: excelSafeText(message.waMessageId),
    }));
    const waSystemQuickReplies = (waBackup.systemQuickReplies || []).map((reply: any) => ({
      ...reply,
      title: excelSafeText(reply.title),
      text: excelSafeText(reply.text),
    }));
    const waSettings = [{
      ...(waBackup.settings || {}),
      ...(waBackup.counts || {}),
      securityExclusions: Array.isArray(waBackup.settings?.securityExclusions)
        ? waBackup.settings.securityExclusions.join(" | ")
        : waBackup.settings?.securityExclusions || "",
    }];

    const wb = XLSX.utils.book_new();
    const exportState = normalizeBackupSplitFields(data || {}) as AppState;
    const normalizeExcelRows = (rows: any[]) =>
      (Array.isArray(rows) ? rows : []).map((row: any) => {
        const source = row && typeof row === "object" && !Array.isArray(row)
          ? row
          : { value: row };
        const normalized: Record<string, any> = {};
        Object.entries(source).forEach(([key, rawValue]) => {
          let value: any = rawValue;
          if (value instanceof Date) value = value.toISOString();
          else if (value && typeof value === "object") {
            try {
              value = JSON.stringify(value);
            } catch {
              value = String(value);
            }
          }

          if (typeof value !== "string") {
            normalized[key] = value === undefined || value === null ? "" : value;
            return;
          }

          const parts = value.match(/[\s\S]{1,30000}/g) || [""];
          parts.forEach((part, index) => {
            const partKey = index === 0 ? key : `${key}_part_${index + 1}`;
            normalized[partKey] = excelSafeText(part);
          });
        });
        return normalized;
      });
    const toExcelSheet = (rows: any[]) =>
      XLSX.utils.json_to_sheet(normalizeExcelRows(rows));
    const appendWhatsAppRows = (name: string, rows: any[], widths: number[]) => {
      const normalizedRows = Array.isArray(rows) && rows.length
        ? rows
        : [{ note: "لا توجد بيانات بعد" }];
      const maxRowsPerSheet = 1_000_000;
      for (let offset = 0; offset < normalizedRows.length; offset += maxRowsPerSheet) {
        const part = Math.floor(offset / maxRowsPerSheet) + 1;
        const partName = part === 1
          ? name
          : `${name.slice(0, 27)}-${part}`;
        const sheet = toExcelSheet(
          normalizedRows.slice(offset, offset + maxRowsPerSheet),
        );
        sheet["!cols"] = widths.map((wch) => ({ wch }));
        if (sheet["!ref"]) sheet["!autofilter"] = { ref: sheet["!ref"] };
        XLSX.utils.book_append_sheet(wb, sheet, partName);
      }
    };
    const safe = (v: any) => (v === undefined || v === null ? "" : v);
    const json = (v: any) => {
      if (v === undefined || v === null) return "";
      return JSON.stringify(v);
    };
    const createChunkedSheet = (val: any) => {
      const s = val === undefined || val === null ? "" : JSON.stringify(val);
      const chunks = s.match(/[\s\S]{1,30000}/g) || [""];
      return toExcelSheet(
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

    const invoiceRows = (exportState.invoices || []).map((i: any) => {
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
      toExcelSheet(invoiceRows),
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
      toExcelSheet(invoiceItems),
      "InvoiceItems",
    );

    const payerRows = (exportState.invoices || []).flatMap((i: any) => {
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
      toExcelSheet(payerRows),
      "Payers",
    );

    const orderRows = (exportState.orders || []).map((o: any) => {
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
      toExcelSheet(orderRows),
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
      toExcelSheet(customerRows),
      "Customers",
    );

    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet(
        (data?.products || []).map(normalizeExportProduct),
      ),
      "Products",
    );
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet(
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
      toExcelSheet(data?.suppliers || []),
      "Suppliers",
    );
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet(data?.supplierTransfers || []),
      "SupplierTransfers",
    );
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet(data?.zones || []),
      "Zones",
    );
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet(data?.expenses || []),
      "Expenses",
    );
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet(data?.testimonials || []),
      "Testimonials",
    );
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet(data?.pulseAnalysisHistory || []),
      "PulseHistory",
    );
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet(data?.pulseReviews || []),
      "QuickPulse",
    );
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet(data?.campaigns || []),
      "SmartCampaigns",
    );
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet(data?.squads || []),
      "Diwaniyas",
    );
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet((data as any)?.promocodes || []),
      "PromoCodes",
    );
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet((data as any)?.squadTiers || []),
      "SquadTiers",
    );
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet((data as any)?.diwaniyaTiers || []),
      "DiwaniyaTiers",
    );
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet((data as any)?.aiLearningMemory || []),
      "SmartLearningMemory",
    );
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet((data as any)?.notifications || []),
      "Notifications",
    );
    const whatsappQuickRepliesForBackup = readWhatsAppQuickRepliesForBackup();
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet(whatsappQuickRepliesForBackup),
      WHATSAPP_QUICK_REPLIES_SHEET,
    );
    // The complete readable WhatsApp snapshot. Secrets, sessions and raw provider
    // payloads are excluded by the server and never reach the browser or workbook.
    appendWhatsAppRows("WhatsAppRules", waRules, [20, 30, 10, 12, 14, 14, 55, 80, 24, 24]);
    appendWhatsAppRows("WhatsAppRuleTemplates", waRuleTemplates, [20, 30, 10, 12, 14, 14, 55, 80]);
    appendWhatsAppRows("WhatsAppBotTexts", waBotTexts, [22, 38, 36, 12, 75, 75, 75]);
    appendWhatsAppRows("WhatsAppRatings", waRatings, [24, 18, 18, 28, 10, 20, 24]);
    appendWhatsAppRows("WhatsAppConversations", waConversations, [24, 18, 28, 12, 14, 12, 12, 70, 70, 70, 15, 30, 24, 24, 24, 24, 24, 24, 24, 24, 24]);
    appendWhatsAppRows("WhatsAppMessages", waMessages, [24, 24, 18, 12, 12, 90, 14, 18, 28, 24]);
    appendWhatsAppRows("WhatsAppSystemReplies", waSystemQuickReplies, [24, 32, 90, 10]);
    appendWhatsAppRows("WhatsAppSettings", waSettings, [16, 25, 20, 20, 20, 18, 18, 18, 18, 18, 18, 90]);
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet([(data as any)?.loyaltySettings || {}]),
      "LoyaltySettings",
    );
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet([(data as any)?.activeGoal || {}]),
      "ActiveGoal",
    );
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet([(data as any)?.settings || {}]),
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

    const fullStateJson = JSON.stringify(exportState);
    const fullStateChunks = fullStateJson.match(/[\s\S]{1,30000}/g) || ["{}"];
    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet(
        fullStateChunks.map((chunk, index) => ({ part: index + 1, chunk })),
      ),
      "FullState",
    );

    XLSX.utils.book_append_sheet(
      wb,
      toExcelSheet([
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
          whatsappRules: Number(waBackup.counts?.rules ?? waRules.length),
          whatsappRuleTemplates: Number(waBackup.counts?.ruleTemplates ?? waRuleTemplates.length),
          whatsappBotTexts: Number(waBackup.counts?.botTexts ?? waBotTexts.length),
          whatsappRatings: Number(waBackup.counts?.ratings ?? waRatings.length),
          whatsappConversations: Number(waBackup.counts?.conversations ?? waConversations.length),
          whatsappMessages: Number(waBackup.counts?.messages ?? waMessages.length),
          whatsappSystemReplies: Number(waBackup.counts?.systemQuickReplies ?? waSystemQuickReplies.length),
          whatsappSensitiveDataExcluded: "نعم — الأسرار والجلسات وبيانات الجهاز والـ raw payloads غير مصدّرة",
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

  const purgeDeletedFromImportState = (state: any) => {
    if (!state || typeof state !== "object") return state;
    const isNotDeleted = (item: any) =>
      item &&
      item.isDeleted !== true &&
      item.isDeleted !== "true" &&
      item.isDeleted !== "TRUE" &&
      item.status !== "deleted";
    const keys = ["customers", "invoices", "orders", "products", "suppliers", "expenses", "squads", "testimonials", "campaigns", "promocodes"];
    keys.forEach((key) => {
      if (Array.isArray(state[key])) {
        state[key] = state[key].filter(isNotDeleted);
      }
    });
    return state;
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = e.target.files?.[0];
    if (!file) return;
    if (importInFlightRef.current) {
      input.value = "";
      return;
    }
    importInFlightRef.current = true;

    const reader = new FileReader();
    const isJson = file.name.endsWith(".json");

    reader.onload = async (event) => {
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

            const validatedData: AppState = purgeDeletedFromImportState({
              ...INITIAL_DATA,
              ...importedData,
              zones: processedZones,
            });
            if (appMode === "cloud" && onCloudImport) {
              addToast(
                "جاري الرفع سحابياً",
                "يتم مزامنة النسخة الاحتياطية سحابياً لتلافي الفقدان...",
                "info",
              );
              try {
                const saved = await onCloudImport(validatedData);
                if (!saved) throw new Error("CLOUD_IMPORT_NOT_CONFIRMED");
                addToast(
                  "تمت العملية",
                  "تم استيراد النسخة ومزامنتها سحابياً بنجاح ✨",
                  "success",
                );
              } catch (err) {
                console.error("Cloud import failed:", err);
                addToast(
                  "فشل الحفظ",
                  "فشل تخزين النسخة سحابياً: " +
                    (err instanceof Error ? err.message : String(err)),
                  "warning",
                );
              }
            } else {
              addToast(
                "السحابة مطلوبة",
                "لا يمكن استيراد البيانات دون اتصال سحابي موثّق.",
                "warning",
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

          const restoreSplitExcelColumns = (row: any) => {
            if (!row || typeof row !== "object" || Array.isArray(row)) return row;
            const restored: Record<string, any> = { ...row };
            const grouped = new Map<string, Array<{ part: number; value: string }>>();

            Object.keys(row).forEach((columnName) => {
              const match = columnName.match(/^(.*)_part_(\d+)$/);
              if (!match) return;
              const baseName = match[1];
              const partNumber = Number(match[2]);
              if (!grouped.has(baseName)) grouped.set(baseName, []);
              grouped.get(baseName)!.push({
                part: partNumber,
                value: String(row[columnName] ?? ""),
              });
            });

            grouped.forEach((parts, baseName) => {
              const hasBasePart = Object.prototype.hasOwnProperty.call(row, baseName);
              const sortedParts = parts.sort((a, b) => a.part - b.part);
              const expectedStart = hasBasePart ? 2 : 1;
              sortedParts.forEach((part, index) => {
                if (part.part !== expectedStart + index) {
                  throw new Error(
                    `CORRUPT_SPLIT_EXCEL_COLUMN:${baseName}:EXPECTED_${expectedStart + index}:FOUND_${part.part}`,
                  );
                }
              });

              const firstPart = hasBasePart ? String(row[baseName] ?? "") : "";
              restored[baseName] = firstPart + sortedParts
                .map((part) => part.value)
                .join("");
              sortedParts.forEach((part) => delete restored[`${baseName}_part_${part.part}`]);
            });

            return restored;
          };

          const safeSheetToObj = (sheetName: string) => {
            if (workbook.SheetNames.includes(sheetName)) {
              const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) || [];
              return (rows as any[]).map(restoreSplitExcelColumns);
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
                // Never eval untrusted cell content. Backups are exported as valid JSON,
                // so this path only hits malformed/foreign cells — give up safely instead
                // of executing them as code.
                return isArray ? [] : null;
              }
            }
            result = decodeRepeatedBackupJson(result);
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
            const sortedFullStateRows = (
              Array.isArray(fullStateRows) ? fullStateRows : []
            )
              .filter((row: any) => String(row?.chunk || "").length > 0)
              .sort(
                (a: any, b: any) => Number(a.part || 0) - Number(b.part || 0),
              );

            sortedFullStateRows.forEach((row: any, index: number) => {
              const actualPart = Number(row.part || 0);
              const expectedPart = index + 1;
              if (actualPart !== expectedPart) {
                throw new Error(
                  `CORRUPT_FULL_STATE_CHUNKS:EXPECTED_${expectedPart}:FOUND_${actualPart || "EMPTY"}`,
                );
              }
            });

            const joinedJson = sortedFullStateRows
              .map((row: any) => String(row.chunk || ""))
              .join("");
            if (joinedJson.trim()) {
              baseState = normalizeBackupSplitFields(JSON.parse(joinedJson));
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
                  (safeSheetToObj("Suppliers") as any[]).map((row: any) => ({
                    ...row,
                    // paymentMethods is exported as a JSON string in Excel; parse it back to a
                    // native array so the Suppliers page never calls .map() on a string.
                    paymentMethods: parseSafeJson(row.paymentMethods, true),
                  })),
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

          const mergeSheetRowsWithFullState = (
            fullStateRows: any,
            sheetRows: any[],
            identityFields: string[],
          ) => {
            const baseRows = Array.isArray(fullStateRows) ? fullStateRows : [];
            if (!baseRows.length) return sheetRows;

            const identityOf = (row: any) => {
              for (const field of identityFields) {
                const value = String(row?.[field] ?? "").trim();
                if (value) return `${field}:${value}`;
              }
              return "";
            };

            const sheetByIdentity = new Map<string, any>();
            const sheetRowsWithoutIdentity: any[] = [];
            sheetRows.forEach((row) => {
              const identity = identityOf(row);
              if (identity) sheetByIdentity.set(identity, row);
              else sheetRowsWithoutIdentity.push(row);
            });

            const consumed = new Set<string>();
            const mergedRows: any[] = [];

            baseRows.forEach((baseRow: any) => {
              const identity = identityOf(baseRow);
              if (identity) {
                const sheetRow = sheetByIdentity.get(identity);
                if (sheetRow) {
                  consumed.add(identity);
                  mergedRows.push(stripUndefined({ ...baseRow, ...sheetRow }));
                }
                // If it has an identity but is NOT in the imported sheet, it was deleted in the sheet.
                // So we do not include it.
              } else {
                mergedRows.push(stripUndefined(baseRow));
              }
            });

            sheetByIdentity.forEach((sheetRow, identity) => {
              if (!consumed.has(identity)) mergedRows.push(stripUndefined(sheetRow));
            });
            sheetRowsWithoutIdentity.forEach((row) => mergedRows.push(stripUndefined(row)));
            return mergedRows;
          };

          const importIntegrity = {
            invoiceRows: 0,
            invoiceItemRows: 0,
            orderRows: 0,
          };

          const restoredWhatsAppQuickRepliesCount =
            workbook.SheetNames.includes(WHATSAPP_QUICK_REPLIES_SHEET)
              ? restoreWhatsAppQuickRepliesFromBackup(
                  safeSheetToObj(WHATSAPP_QUICK_REPLIES_SHEET) as any[],
                )
              : 0;

          if (workbook.SheetNames.includes("Invoices")) {
            const invoiceItemsRows = safeSheetToObj("InvoiceItems") as any[];
            importIntegrity.invoiceItemRows = invoiceItemsRows.length;
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
            const rawInvoices = safeSheetToObj("Invoices") as any[];
            const restoredInvoices = rawInvoices.map((inv, invoiceIndex) => {
              const rawInvoiceText = String(inv.rawInvoice || "").trim();
              const rawInvoice = parseSafeJson(rawInvoiceText, false);
              if (
                rawInvoiceText &&
                (!rawInvoice || typeof rawInvoice !== "object" || Array.isArray(rawInvoice))
              ) {
                throw new Error(`INVALID_RAW_INVOICE_BACKUP_ROW:${invoiceIndex + 2}`);
              }
              // rawInvoice is only a completeness fallback. The visible Excel columns are
              // authoritative because they contain the latest reviewed payment/status values.
              const explicitInvoiceColumns = Object.fromEntries(
                Object.entries(inv).filter(([, value]) => value !== "" && value !== null && value !== undefined),
              );
              const merged =
                rawInvoice && typeof rawInvoice === "object" && !Array.isArray(rawInvoice)
                  ? { ...rawInvoice, ...explicitInvoiceColumns }
                  : { ...explicitInvoiceColumns };

              // Resolve payment state generically from the latest explicit Excel fields,
              // with rawInvoice used only as a fallback for missing details. This prevents
              // stale nested snapshots from downgrading a paid invoice without hardcoding IDs.
              const resolvedAsPaid =
                isPaidStatus(merged.paymentStatus) ||
                isPaidStatus(merged.payment_status) ||
                isPaidStatus(merged.status) ||
                merged.paid === true;
              const resolvedAsFailed =
                !resolvedAsPaid &&
                (
                  isFailedStatus(merged.paymentStatus) ||
                  isFailedStatus(merged.payment_status) ||
                  isFailedStatus(merged.status) ||
                  merged.failed === true
                );

              if (resolvedAsPaid) {
                merged.paymentStatus = "paid";
                merged.payment_status = "paid";
                merged.status = isPaidStatus(merged.status)
                  ? merged.status
                  : "تم الدفع بنجاح";
                merged.paid = true;
                merged.failed = false;
                merged.canPay = false;
              } else if (resolvedAsFailed) {
                merged.paymentStatus = "failed";
                merged.payment_status = "failed";
                merged.status = isFailedStatus(merged.status)
                  ? merged.status
                  : "فشلت عملية الدفع";
                merged.paid = false;
                merged.failed = true;
                merged.canPay = true;
              }

              merged.splitPayments = normalizeSplitBackupCollection(merged.splitPayments);
              merged.splitParticipants = normalizeSplitBackupCollection(merged.splitParticipants);

              const isDeleted =
                merged.isDeleted === true ||
                merged.isDeleted === "TRUE" ||
                merged.isDeleted === "true";
              const parsedItems = parseSafeJson(merged.items, true);
              const itemRows =
                invoiceItemsByInvoice.get(String(merged.id || "").trim()) || [];
              const parsedAddress =
                parseSafeJson(merged.address, false) ||
                parseSafeJson(merged.rawAddress, false) ||
                makeAddressFromRow(merged) ||
                merged.address;
              const parsedDeliveryInfo =
                parseSafeJson(merged.deliveryInfo, false) || merged.deliveryInfo;

              // These fields exist only to make the Excel workbook readable/recoverable.
              // Keeping them inside the live invoice duplicates the full invoice JSON and can
              // inflate the Firestore shard beyond 1 MiB after an otherwise valid import.
              [
                "rawInvoice",
                "rawAddress",
                "addressFull",
                "addressRegion",
                "addressArea",
                "addressBlock",
                "addressStreet",
                "addressJaddah",
                "addressBuilding",
                "addressFloor",
                "addressApartment",
                "addressNotes",
                "subtotal",
                "المنطقة",
                "القطعة",
                "الشارع",
                "الجادة",
                "المنزل",
                "الدور",
                "الشقة",
                "العنوان الكامل",
              ].forEach((field) => delete merged[field]);

              return stripUndefined({
                ...merged,
                isDeleted,
                items: parsedItems.length ? parsedItems : itemRows,
                address:
                  typeof parsedAddress === "object"
                    ? parsedAddress
                    : merged.address,
                deliveryInfo:
                  typeof parsedDeliveryInfo === "object" &&
                  parsedDeliveryInfo !== null
                    ? parsedDeliveryInfo
                    : undefined,
              });
            });
            newState.invoices = mergeSheetRowsWithFullState(
              baseState.invoices,
              restoredInvoices,
              ["id", "invoiceNumber"],
            );
            importIntegrity.invoiceRows = newState.invoices.length;
            if (newState.invoices.length < rawInvoices.length) {
              throw new Error(
                `INVOICE_IMPORT_COUNT_MISMATCH:${newState.invoices.length}/${rawInvoices.length}`,
              );
            }
          }

          if (workbook.SheetNames.includes("Orders")) {
            const rawOrders = safeSheetToObj("Orders") as any[];
            const restoredOrders = rawOrders.map((o, orderIndex) => {
              const rawOrderText = String(o.rawOrder || "").trim();
              const rawOrder = parseSafeJson(rawOrderText, false);
              if (
                rawOrderText &&
                (!rawOrder || typeof rawOrder !== "object" || Array.isArray(rawOrder))
              ) {
                throw new Error(`INVALID_RAW_ORDER_BACKUP_ROW:${orderIndex + 2}`);
              }
              const explicitOrderColumns = Object.fromEntries(
                Object.entries(o).filter(([, value]) => value !== "" && value !== null && value !== undefined),
              );
              const merged =
                rawOrder && typeof rawOrder === "object" && !Array.isArray(rawOrder)
                  ? { ...rawOrder, ...explicitOrderColumns }
                  : { ...explicitOrderColumns };
              merged.splitPayments = normalizeSplitBackupCollection(merged.splitPayments);
              merged.splitParticipants = normalizeSplitBackupCollection(merged.splitParticipants);
              const parsedItems = parseSafeJson(merged.items, true);
              const parsedAddress =
                parseSafeJson(merged.address, false) ||
                makeAddressFromRow(merged) ||
                merged.address;
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
                  typeof parsedAddress === "object" ? parsedAddress : merged.address,
              });
            });
            newState.orders = mergeSheetRowsWithFullState(
              baseState.orders,
              restoredOrders,
              ["id", "orderNumber"],
            );
            importIntegrity.orderRows = newState.orders.length;
            if (newState.orders.length < rawOrders.length) {
              throw new Error(
                `ORDER_IMPORT_COUNT_MISMATCH:${newState.orders.length}/${rawOrders.length}`,
              );
            }
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

          const finalizedState = purgeDeletedFromImportState(recalculateStateBalances(
            normalizeBackupSplitFields(newState) as AppState,
          ));
          try {
            if (appMode === "cloud" && onCloudImport) {
              addToast(
                "جاري الرفع سحابياً",
                "يتم رفع ومزامنة بيانات Excel سحابياً...",
                "info",
              );
              try {
                const saved = await onCloudImport(finalizedState);
                if (!saved) throw new Error("CLOUD_IMPORT_NOT_CONFIRMED");
                addToast(
                  "تمت العملية",
                  `تم استيراد ${importIntegrity.invoiceRows} فاتورة و${importIntegrity.invoiceItemRows} بند و${importIntegrity.orderRows} طلب، ثم التحقق من حفظها سحابياً بنجاح ✨${restoredWhatsAppQuickRepliesCount ? ` وتم استرجاع ${restoredWhatsAppQuickRepliesCount} رد سريع.` : ""}`,
                  "success",
                );
              } catch (err) {
                console.error("Cloud Excel import failed:", err);
                addToast(
                  "لم يُعتمد الاستيراد",
                  "رفضت السحابة الحفظ، لذلك لم يتم تطبيق البيانات داخل النظام ولم تُحفظ نسخة تشغيل محلية. أعد المحاولة بعد عودة الاتصال: " +
                    (err instanceof Error ? err.message : String(err)),
                  "warning",
                );
              }
            } else {
              addToast(
                "السحابة مطلوبة",
                "لا يمكن استيراد أو تشغيل البيانات دون اتصال سحابي موثّق.",
                "warning",
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
        }
      } catch (error) {
        console.error("Import error:", error);
        addToast(
          "خطأ",
          "ما قدرنا نقرأ الملف أو التنسيق مو صحيح: " +
            (error instanceof Error ? error.message : ""),
          "warning",
        );
      } finally {
        importInFlightRef.current = false;
        input.value = "";
      }
    };

    reader.onerror = () => {
      importInFlightRef.current = false;
      input.value = "";
      addToast(
        "خطأ",
        "تعذر فتح ملف النسخة الاحتياطية من الجهاز.",
        "warning",
      );
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
              <ChevronDown
                size={20}
                className={cn(
                  "text-slate-500 transition-transform duration-300",
                  activeSection === "notifications" ? "rotate-180" : "",
                )}
              />
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

                <div className="push-health-pro rounded-2xl border border-slate-200 bg-white p-3 md:p-5 text-slate-900 shadow-sm overflow-hidden relative max-w-full">
                  <div className="relative z-10 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-700">
                          <ShieldCheck size={13} /> متابعة وصول الإشعارات
                        </div>
                        <h3 className="mt-2 text-lg md:text-xl font-black text-slate-950">
                          رادار حياة الإشعار
                        </h3>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          نبض حي يوضح رحلة كل إشعار: من الإنشاء إلى الفتح، بدون تغيير نظام الإرسال.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={runPushHealthCheck}
                        disabled={checkingPushHealth || appMode === "local"}
                        className="rounded-lg bg-emerald-300 text-slate-950 px-4 py-3 text-xs font-black shadow-sm hover:bg-emerald-200 disabled:opacity-50 transition flex items-center justify-center gap-2"
                      >
                        {checkingPushHealth ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <RefreshCw size={15} />
                        )}
                        فحص الآن
                      </button>
                    </div>

                    {pushHealth ? (
                      (() => {
                        const isMissingTimestamp = (value?: string) =>
                          !value ||
                          value === "Not registered" ||
                          value === "No timestamp saved" ||
                          value === "Unknown";
                        const cleanRole = (role?: string) => {
                          const normalized = String(role || "").toLowerCase();
                          if (normalized.includes("admin")) return "أدمن";
                          if (normalized.includes("partner")) return "شريك";
                          if (normalized.includes("local")) return "لوكل";
                          if (normalized.includes("driver")) return "سائق";
                          if (normalized.includes("employee") || normalized.includes("staff")) return "موظف";
                          return role || "مستخدم";
                        };
                        const getDeliveryMilestones = (notification?: any) => {
                          const hasNotification = Boolean(notification);
                          const stageText = String(notification?.deliveryStage || notification?.status || notification?.type || "").toLowerCase();
                          const acceptedByFcm = Boolean(
                            notification?.success === true ||
                            stageText.includes("fcm") ||
                            notification?.receivedByDevice ||
                            notification?.openedByEmployee,
                          );
                          const receivedByDevice = Boolean(
                            notification?.receivedByDevice ||
                            notification?.openedByEmployee ||
                            notification?.receivedAt ||
                            stageText.includes("received") ||
                            stageText.includes("استلمه"),
                          );
                          const openedByUser = Boolean(
                            notification?.openedByEmployee ||
                            notification?.clickedAt ||
                            stageText.includes("clicked") ||
                            stageText.includes("فتحه"),
                          );
                          return [
                            { key: "sent", label: "تم إنشاؤه", done: hasNotification },
                            { key: "fcm", label: "وصل للسيرفر", done: acceptedByFcm },
                            { key: "device", label: "وصل للجهاز", done: receivedByDevice },
                            { key: "open", label: "تم فتحه", done: openedByUser },
                          ];
                        };
                        const getDeliveryMilestoneSummary = (notification?: any) => {
                          const steps = getDeliveryMilestones(notification);
                          const completed = steps.filter((step) => step.done).length;
                          if (!notification) return "لا يوجد إشعار محفوظ حتى الآن";
                          if (completed >= 4) return "وصل وانفتح";
                          if (completed === 3) return "وصل للجهاز";
                          if (completed === 2) return "وصل للسيرفر ولم يتأكد وصوله للجهاز";
                          if (completed === 1) return "تم إنشاؤه فقط";
                          return "غير مؤكد";
                        };
                        const getDeliveryHumanReason = (notification?: any, device?: any) => {
                          if (!notification) return "لا توجد محاولة إشعار محفوظة لهذا الحساب حتى الآن.";
                          const steps = getDeliveryMilestones(notification);
                          const server = steps.find((step) => step.key === "fcm")?.done;
                          const deviceReached = steps.find((step) => step.key === "device")?.done;
                          const opened = steps.find((step) => step.key === "open")?.done;
                          if (opened) return "الإشعار وصل للجهاز وتم فتحه من المستخدم.";
                          if (deviceReached) return "الإشعار وصل للجهاز، لكنه لم يُفتح حتى الآن.";
                          if (server) return "الإشعار وصل للسيرفر، لكن لا يوجد تأكيد وصول من الجهاز.";
                          if (device?.notificationPermission && device.notificationPermission !== "granted") return "الإشعار لم يصل غالبًا لأن إذن الجهاز غير مفعّل.";
                          if (!device?.token || device?.token === "Not available") return "الإشعار لا يملك جهازًا جاهزًا أو توكنًا صالحًا حاليًا.";
                          return "تم إنشاء محاولة الإرسال، لكن لا توجد إشارة وصول كافية من الجهاز.";
                        };
                        const extractPushEmail = (...values: any[]) => {
                          for (const value of values) {
                            const match = String(value || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
                            if (match?.[0]) return normalizePushLookupKey(match[0]);
                          }
                          return "";
                        };
                        const getIdentityMergeKey = (identity: PushUserIdentity) => {
                          const email = normalizePushLookupKey(identity.email) || extractPushEmail(identity.name, identity.id, identity.phone);
                          if (email) return `email:${email}`;
                          const id = normalizePushLookupKey(identity.id);
                          if (id) return `id:${id}`;
                          const name = normalizePushLookupKey(identity.name);
                          return name ? `name:${name}` : "";
                        };
                        const mergePushIdentity = (base: PushUserIdentity, incoming: PushUserIdentity): PushUserIdentity => ({
                          id: base.id || incoming.id,
                          name:
                            cleanPushAccountLabel(base.name, "") ||
                            cleanPushAccountLabel(incoming.name, "") ||
                            base.email ||
                            incoming.email,
                          email: base.email || incoming.email,
                          phone: base.phone || incoming.phone,
                          role: base.role || incoming.role,
                          source: base.source || incoming.source,
                        });
                        const userSeed = new Map<string, PushUserIdentity>();
                        const addUserSeed = (identity?: PushUserIdentity) => {
                          if (!identity) return;
                          const key = getIdentityMergeKey(identity);
                          if (!key) return;
                          userSeed.set(
                            key,
                            userSeed.has(key)
                              ? mergePushIdentity(userSeed.get(key)!, identity)
                              : identity,
                          );
                        };
                        Array.from(pushUserDirectory.values() as Iterable<PushUserIdentity>).forEach(addUserSeed);
                        pushDevices.forEach((device) => {
                          const extractedEmail = extractPushEmail(device.userEmail, device.userName, device.ownerLabel, device.label, device.userId);
                          addUserSeed({
                            id: device.userId || device.userEmail || extractedEmail || device.userName || device.ownerLabel || device.id,
                            name: device.userName || device.ownerLabel || "",
                            email: device.userEmail || extractedEmail,
                            role: device.userRole,
                            source: "pushToken",
                          });
                        });
                        const users = Array.from(userSeed.values());
                        const cards = users.map((identity, index) => {
                          const identityKeys = [identity.id, identity.email, identity.name]
                            .map(normalizePushLookupKey)
                            .filter(Boolean);
                          const devices = pushDevices.filter((device) => {
                            const deviceKeys = [device.userId, device.userEmail, device.userName, device.ownerLabel, device.label]
                              .map(normalizePushLookupKey)
                              .filter(Boolean);
                            const identityEmail = normalizePushLookupKey(identity.email) || extractPushEmail(identity.name, identity.id);
                            const deviceEmail = normalizePushLookupKey(device.userEmail) || extractPushEmail(device.userName, device.ownerLabel, device.label, device.userId);
                            if (identityEmail && deviceEmail && identityEmail === deviceEmail) return true;
                            return identityKeys.some((key) => deviceKeys.includes(key));
                          });
                          const notifications = devices
                            .flatMap((device) => (device.recentNotifications || []).map((notification) => ({ ...notification, device })))
                            .sort((a, b) => Date.parse(b.date || "") - Date.parse(a.date || ""));
                          const latest = notifications[0];
                          const deliveredNotifications = notifications.filter(
                            (notification) =>
                              notification.receivedByDevice ||
                              notification.openedByEmployee,
                          );
                          const latestDelivered = deliveredNotifications[0];
                          const bestDevice = devices.slice().sort((a, b) => {
                            const confidenceDiff = getPushDeviceConfidence(b) - getPushDeviceConfidence(a);
                            if (confidenceDiff) return confidenceDiff;
                            return Date.parse(b.lastRead || "") - Date.parse(a.lastRead || "");
                          })[0];
                          const bestScore = bestDevice ? getPushDeviceConfidence(bestDevice) : 0;
                          const hasReadyDevice = devices.some((device) => device.status === "online" && getPushDeviceConfidence(device) >= 70);
                          const hasToken = devices.some((device) => Boolean(device.token && device.token !== "Not available"));
                          const hasReceipt = notifications.some((notification) => notification.receivedByDevice || notification.openedByEmployee);
                          const hasFcmAccepted = notifications.some((notification) => notification.success === true);
                          const lastTestResult = bestDevice ? pushTestResults[bestDevice.id] : "";
                          let state = {
                            label: "لا يوجد جهاز",
                            detail: "هذا الحساب ظاهر عندك، لكن لا يوجد له جهاز مفعّل للإشعارات حتى الآن.",
                            className: "border-slate-200 bg-slate-50 text-slate-900",
                            dot: "bg-slate-300",
                            rank: 4,
                          };
                          if (hasReadyDevice && (hasReceipt || hasFcmAccepted || latest)) {
                            state = {
                              label: hasReceipt ? "يوصل له" : "أرسلناه ولم يتأكد الوصول",
                              detail: hasReceipt
                                ? "يوجد أثر من الجهاز يؤكد أن الإشعار وصل أو انفتح."
                                : "تم إرسال إشعار لهذا الحساب، لكن لا يوجد تأكيد من الجهاز حتى الآن.",
                              className: hasReceipt
                                ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                                : "border-sky-200 bg-sky-50 text-sky-950",
                              dot: "bg-emerald-300",
                              rank: hasReceipt ? 1 : 2,
                            };
                          } else if (hasToken) {
                            state = {
                              label: "يحتاج اختبار",
                              detail: "الجهاز موجود، اضغط اختبار الآن حتى نتأكد أنه يستقبل فعلًا.",
                              className: "border-amber-200 bg-amber-50 text-amber-950",
                              dot: "bg-amber-300",
                              rank: 3,
                            };
                          }
                          return {
                            key: getIdentityMergeKey(identity) || identity.id || identity.email || identity.name || `push-user-${index}`,
                            identity,
                            devices,
                            bestDevice,
                            bestScore,
                            latest,
                            latestDelivered,
                            deliveredNotifications,
                            notifications,
                            lastTestResult,
                            state,
                          };
                        }).sort((a, b) => a.state.rank - b.state.rank || b.bestScore - a.bestScore);
                        const unassignedDevices = pushDevices.filter((device) => {
                          const key = normalizePushLookupKey(device.userId || device.userEmail || device.userName || device.ownerLabel || device.label);
                          return !key;
                        });
                        const allCards = [
                          ...cards,
                          ...unassignedDevices.map((device, index) => ({
                            key: `unassigned-${device.id || index}`,
                            identity: {
                              id: device.id,
                              name: device.label || "جهاز غير مرتبط",
                              email: "",
                              role: device.userRole || "غير مرتبط",
                              source: "pushToken",
                            } as PushUserIdentity,
                            devices: [device],
                            bestDevice: device,
                            bestScore: getPushDeviceConfidence(device),
                            latest: (device.recentNotifications || [])[0],
                            latestDelivered: (device.recentNotifications || []).find(
                              (notification) =>
                                notification.receivedByDevice ||
                                notification.openedByEmployee,
                            ),
                            deliveredNotifications: (device.recentNotifications || []).filter(
                              (notification) =>
                                notification.receivedByDevice ||
                                notification.openedByEmployee,
                            ),
                            notifications: device.recentNotifications || [],
                            lastTestResult: pushTestResults[device.id] || "",
                            state: {
                              label: device.status === "online" ? "جهاز جاهز بلا اسم" : "غير مرتبط",
                              detail: "هذا الجهاز لديه تسجيل إشعارات، لكنه غير مربوط بإيميل واضح.",
                              className: "border-slate-200 bg-white text-slate-900",
                              dot: "bg-sky-300",
                              rank: 5,
                            },
                          })),
                        ];
                        const query = pushDeviceSearch.trim().toLowerCase();
                        const filteredCards = allCards.filter((card) => {
                          if (!query) return true;
                          return [
                            card.identity.name,
                            card.identity.email,
                            card.identity.role,
                            card.identity.id,
                            card.state.label,
                            card.latest?.title,
                            card.latest?.message,
                            ...(card.devices || []).flatMap((device) => [device.label, device.platform, device.browser, device.userId, device.userEmail]),
                          ]
                            .filter(Boolean)
                            .join(" ")
                            .toLowerCase()
                            .includes(query);
                        });
                        const isArchivedAccountCard = (card: any) =>
                          (card.devices || []).length === 0;
                        const archivedCards = filteredCards.filter(isArchivedAccountCard);
                        let visibleCards =
                          query || pushArchiveAccountsOpen || pushDeviceMapFilter === "archived"
                            ? filteredCards
                            : filteredCards.filter((card) => !isArchivedAccountCard(card));
                        const deliveredCount = allCards.filter((card) => card.deliveredNotifications.length > 0).length;
                        const testCount = allCards.filter((card) => card.state.rank === 3).length;
                        const missingCount = allCards.filter((card) => card.state.rank >= 4).length;
                        const rawNotificationLog = pushEventLogs
                          .filter((notification) => {
                            if (!query) return true;
                            return [
                              notification.title,
                              notification.message,
                              notification.type,
                              notification.status,
                              notification.userId,
                              notification.userName,
                              notification.userEmail,
                              notification.userRole,
                              getPushUserDisplayById(notification.userId),
                              notification.deviceLabel,
                              notification.deviceId,
                              notification.tokenStart,
                              notification.responseId,
                            ]
                              .filter(Boolean)
                              .join(" ")
                              .toLowerCase()
                              .includes(query);
                          });
                        const notificationLog = rawNotificationLog.filter((notification) => {
                          if (pushLogStatusFilter === "all") return true;
                          if (pushLogStatusFilter === "opened") return Boolean(notification.openedByEmployee || notification.clickedAt);
                          if (pushLogStatusFilter === "delivered") return Boolean(notification.receivedByDevice || notification.receivedAt || notification.openedByEmployee || notification.clickedAt);
                          if (pushLogStatusFilter === "failed") return notification.success === false || String(notification.status || notification.type || "").toLowerCase().includes("fail");
                          if (pushLogStatusFilter === "waiting") return notification.success === true && !notification.receivedByDevice && !notification.receivedAt && !notification.openedByEmployee && !notification.clickedAt;
                          return true;
                        });
                        const visibleNotificationLog = notificationLog.slice(0, pushLogVisibleCount);
                        const goldenDevices = pushDevices.filter((device) => device.status === "online" && getPushDeviceConfidence(device) >= 70);
                        const silentDevices = pushDevices.filter((device) => (device.status === "cold" || getPushDeviceConfidence(device) < 70) && (device.recentNotifications || []).some((n) => n.success === true) && !(device.recentNotifications || []).some((n) => n.receivedByDevice || n.openedByEmployee));
                        const ghostDevices = pushDevices.filter((device) => device.status === "abandoned" || device.status === "duplicate" || pushInvalidTestTokens[device.token]);
                        const deviceTokenSet = (devices: PushDeviceSnapshot[]) => new Set(devices.map((device) => device.id || device.token).filter(Boolean) as string[]);
                        const goldenDeviceIds = deviceTokenSet(goldenDevices);
                        const silentDeviceIds = deviceTokenSet(silentDevices);
                        const ghostDeviceIds = deviceTokenSet(ghostDevices);
                        const cardHasDeviceIn = (card: any, ids: Set<string>) => (card.devices || []).some((device: PushDeviceSnapshot) => ids.has(device.id || device.token));
                        visibleCards = visibleCards.filter((card: any) => {
                          if (pushDeviceMapFilter === "all") return true;
                          if (pushDeviceMapFilter === "archived") return isArchivedAccountCard(card);
                          if (pushDeviceMapFilter === "golden") return cardHasDeviceIn(card, goldenDeviceIds);
                          if (pushDeviceMapFilter === "silent") return cardHasDeviceIn(card, silentDeviceIds);
                          if (pushDeviceMapFilter === "ghost") return cardHasDeviceIn(card, ghostDeviceIds);
                          return true;
                        });
                        const visibleUserCards = visibleCards.slice(0, pushUsersVisibleCount);
                        const systemPulseScore = Math.max(0, Math.min(100, Math.round((deliveredCount / Math.max(allCards.length, 1)) * 60 + (goldenDevices.length / Math.max(pushDevices.length, 1)) * 30 + (pushHealth?.tone === "success" ? 8 : pushHealth?.tone === "warning" ? 3 : 0))));
                        const latestNotification = notificationLog[0] || rawNotificationLog[0] || null;
                        const focusedNotification = selectedPushNotificationId
                          ? notificationLog.find((notification) => notification.id === selectedPushNotificationId) || rawNotificationLog.find((notification) => notification.id === selectedPushNotificationId) || null
                          : null;
                        const latestNotificationSentence = latestNotification
                          ? latestNotification.openedByEmployee || latestNotification.clickedAt
                            ? "الإشعار الأخير انفتح من الجهاز، والمسار مكتمل."
                            : latestNotification.receivedByDevice || latestNotification.receivedAt
                              ? "الإشعار وصل للجهاز، لكنه لم يُفتح بعد."
                              : latestNotification.success === false
                                ? "الإشعار الأخير لم يكتمل؛ راجع طبيب الإشعارات."
                                : "الإشعار وصل للسيرفر وينتظر تأكيد الجهاز."
                          : "لا يوجد إشعار حديث لعرض نبضته بعد.";
                        const latestNotificationRecipient = latestNotification ? getPushNotificationRecipientMeta(latestNotification) : null;
                        const openPushRadarArea = (tab: "users" | "log" | "advanced", filter?: "all" | "golden" | "silent" | "ghost" | "archived") => {
                          setPushDeviceTab(tab);
                          if (filter) {
                            setPushDeviceMapFilter(filter);
                            setPushUsersVisibleCount(12);
                          }
                          setTimeout(() => document.getElementById("push-radar-list")?.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" }), 60);
                        };
                        const openPushNotificationLog = (notification?: any, statusFilter?: "all" | "delivered" | "opened" | "failed" | "waiting") => {
                          if (statusFilter) setPushLogStatusFilter(statusFilter);
                          if (notification?.id) setSelectedPushNotificationId(notification.id);
                          setPushDeviceTab("log");
                          setTimeout(() => document.getElementById("push-notification-log")?.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" }), 70);
                        };
                        const latestCriticalIssue = rawNotificationLog.find((event) => event.success === false || String(event.status || event.type || "").toLowerCase().includes("notregistered") || String(event.message || "").toLowerCase().includes("notregistered"));
                        const oldTokenCount = ghostDevices.length;
                        const latestDeviceReadAt = Math.max(
                          0,
                          ...pushDevices.map((device) => {
                            const rawDevice = device as any;
                            const deviceDates = [rawDevice.updatedAt, rawDevice.lastSeenAt, rawDevice.lastSeen, rawDevice.createdAt, rawDevice.savedAtClient]
                              .map((value) => value ? new Date(String(value)).getTime() : 0);
                            const notificationDates = (device.recentNotifications || []).flatMap((notification: any) => [notification.receivedAt, notification.clickedAt, notification.sentAt, notification.createdAt])
                              .map((value) => value ? new Date(String(value)).getTime() : 0);
                            return Math.max(0, ...deviceDates, ...notificationDates);
                          })
                        );
                        const latestDeviceReadLabel = latestDeviceReadAt
                          ? new Date(latestDeviceReadAt).toLocaleString('ar-KW', { dateStyle: 'short', timeStyle: 'short' })
                          : 'لا توجد قراءة محفوظة';
                        const hasRecentDeviceReading = latestDeviceReadAt > 0 && (Date.now() - latestDeviceReadAt) < 1000 * 60 * 60 * 24 * 14;
                        const runCustomerLikePushCheck = () => {
                          const permission = typeof Notification !== "undefined" ? Notification.permission : "unsupported";
                          const supportOk = pushHealth?.support === "مدعوم" || pushHealth?.support === "Supported" || (typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator);
                          const duplicates = pushDevices.length - new Set(pushDevices.map((d) => d.token).filter(Boolean)).size;
                          const healthySignal = goldenDevices.length > 0 || deliveredCount > 0 || Object.values(pushTestResults).some((v) => String(v).includes('تم إرسال'));
                          const verdict = !supportOk
                            ? "هذا المتصفح لا يدعم إشعارات الويب بالكامل؛ جرّب من جهاز عميل فعلي."
                            : permission !== "granted"
                              ? "المتصفح الحالي لا يسمح بالإشعارات. فعّل الإذن ثم اضغط فحص الآن."
                              : healthySignal
                                ? `النظام سليم. توجد ${oldTokenCount || duplicates || 0} أجهزة/توكنات قديمة تحتاج متابعة فقط، وآخر قراءة جهاز: ${latestDeviceReadLabel}.`
                                : hasRecentDeviceReading
                                  ? `النظام يحتاج اختبارًا حديثًا، لكن آخر قراءة جهاز محفوظة كانت ${latestDeviceReadLabel}.`
                                  : "النظام يحتاج قراءة أحدث من الأجهزة قبل الحكم النهائي. افتح موقع العميل من جهاز فعلي ثم اضغط فحص الآن.";
                          setPushCustomerVerdict(verdict);
                          toast.info("فحص كأني عميل", { description: verdict });
                        };
                        return (
                          <div className="space-y-4 rounded-[2rem] bg-slate-950 p-3 sm:p-4 shadow-2xl border border-slate-900">
                            <div className="rounded-[1.8rem] border border-emerald-300/15 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 p-4 md:p-5 text-white shadow-xl overflow-hidden relative">
                              <div className="absolute -left-12 -top-12 h-36 w-36 rounded-full bg-emerald-400/20 blur-3xl" />
                              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div>
                                  <div className="text-[10px] font-black text-emerald-200 uppercase tracking-[0.2em]">مركز نبض النظام</div>
                                  <div className="mt-1 flex items-center gap-3"><span className={cn("relative flex h-4 w-4 shrink-0", systemPulseScore >= 75 ? "text-emerald-300" : "text-amber-300")}><span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-35 animate-ping" /><span className="relative inline-flex h-4 w-4 rounded-full bg-current" /></span><div className="text-3xl font-black">النظام حي بنسبة {systemPulseScore}%</div></div>
                                  <p className="mt-2 text-xs font-bold text-white/55">كل المسارات الأساسية تعمل بهدوء، وآخر قراءة جهاز: {latestDeviceReadLabel}.</p>
                                </div>
                                <button type="button" onClick={runCustomerLikePushCheck} className="rounded-2xl bg-emerald-300 text-slate-950 px-4 py-3 text-xs font-black hover:bg-emerald-200 transition flex items-center justify-center gap-2">
                                  <ClipboardCheck size={15} /> افحص النظام كأني عميل
                                </button>
                              </div>
                              <div className="relative z-10 mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                                {[
                                  ['الإشعارات', pushHealth?.tone === 'danger' ? 'تحتاج فحص' : 'نشطة'],
                                  ['الأجهزة', oldTokenCount > goldenDevices.length ? 'تحتاج مراجعة' : 'مستقرة'],
                                  ['آخر اختبار', Object.values(pushTestResults).some((v) => String(v).includes('تم إرسال')) ? 'ناجح' : 'بانتظار'],
                                ].map(([label, value]) => (
                                  <div key={label} className="rounded-2xl bg-white/10 border border-white/10 p-3">
                                    <div className="text-[9px] font-black text-white/35">{label}</div>
                                    <div className="mt-1 text-sm font-black text-white">{value}</div>
                                  </div>
                                ))}
                              </div>
                              <details className="relative z-10 mt-3 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                                <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-black text-white/70 flex items-center justify-between gap-2">
                                  <span>تفاصيل التشغيل</span>
                                  <ChevronDown size={14} />
                                </summary>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 pt-0">
                                  {[
                                    ['التوكنات القديمة', `${oldTokenCount} تحتاج مراجعة`],
                                    ['المستخدمون بلا جهاز', `${missingCount}`],
                                    ['آخر قراءة', latestDeviceReadLabel],
                                    ['وصول مؤكد', `${deliveredCount}`],
                                  ].map(([label, value]) => (
                                    <div key={label} className="rounded-xl bg-black/15 border border-white/10 p-2 min-w-0">
                                      <div className="text-[9px] font-black text-white/35">{label}</div>
                                      <div className="mt-1 text-xs font-black text-white truncate">{value}</div>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </div>

                            <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-3">
                              <div className="rounded-[1.8rem] border border-slate-700/60 bg-slate-950 p-3 sm:p-4 text-white shadow-lg overflow-hidden max-w-full">
                                <div className="flex items-center justify-between gap-3 mb-4">
                                  <div>
                                    <div className="text-[10px] font-black text-emerald-200">رادار حياة الإشعار</div>
                                    <h4 className="text-sm font-black mt-1">نبضة آخر إشعار فقط</h4>
                                  </div>
                                  <button type="button" onClick={() => openPushNotificationLog(latestNotification)} className="rounded-2xl bg-white text-slate-950 px-3 py-2 text-[10px] font-black">عرض آخر الإشعارات</button>
                                </div>
                                {/* 2-up until there is real room for 4. Forcing four
                                    columns inside this narrow side column squeezed each
                                    one to ~45px, which broke Arabic labels mid-word
                                    ("وصل للسيرفر" rendered one letter per line). */}
                                <div className="grid grid-cols-2 xl:grid-cols-4 gap-1.5">
                                  {[
                                    ['تم إنشاؤه', true],
                                    ['وصل للسيرفر', Boolean(latestNotification?.success || latestNotification)],
                                    ['وصل للجهاز', Boolean(latestNotification?.receivedByDevice || latestNotification?.receivedAt || latestNotification?.openedByEmployee || latestNotification?.clickedAt)],
                                    ['تم فتحه', Boolean(latestNotification?.openedByEmployee || latestNotification?.clickedAt)],
                                  ].map(([label, active], idx) => (
                                    <div key={String(label)} className="relative rounded-2xl bg-black/15 border border-white/10 p-2 text-center min-h-[70px] flex flex-col items-center justify-center gap-2">
                                      <span className={cn('relative h-3 w-3 rounded-full', active ? 'bg-emerald-300' : 'bg-white/20')}>
                                        {active && <span className="absolute inset-0 rounded-full bg-emerald-300/70 animate-ping" />}
                                      </span>
                                      {/* Wrap between words, never inside one. */}
                                      <span className="text-[9px] font-black text-white/65 text-center leading-4 [word-break:keep-all]">{label}</span>
                                      {idx < 3 && <span className="hidden xl:block absolute -left-2 top-1/2 h-px w-4 bg-white/15" />}
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-3 rounded-2xl bg-black/15 border border-white/10 px-3 py-2 text-[11px] font-bold text-white/70 leading-5 space-y-1.5">
                                  <p>{latestNotificationSentence}</p>
                                  <p className="text-white/45">
                                    {latestNotification
                                      ? `المكان: قائمة الرادار ← آخر الإشعارات. ${latestNotificationRecipient ? `أُرسل إلى ${latestNotificationRecipient.name}.` : "اضغط لعرض السجل."}`
                                      : "عند أول إرسال سيظهر هنا آخر إشعار مع مساره ومكانه داخل السجل."}
                                  </p>
                                </div>
                                {latestNotification && latestNotificationRecipient && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPushDeviceSearch("");
                                      openPushNotificationLog(latestNotification);
                                    }}
                                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-right hover:bg-white/15 transition"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                                      <span className="text-[11px] font-black text-white truncate">آخر إشعار: {latestNotification.title || "إشعار بدون عنوان"}</span>
                                      <span className="text-[10px] font-black text-emerald-100 truncate">أُرسل إلى: {latestNotificationRecipient.name}</span>
                                    </div>
                                    <div className="mt-1 text-[10px] font-bold text-white/45 truncate">الجهاز: {latestNotificationRecipient.deviceLabel} — اضغط لفتح هذا الإشعار داخل السجل</div>
                                  </button>
                                )}
                              </div>
                              <div className={cn("rounded-[1.8rem] border p-4 text-white", latestCriticalIssue || oldTokenCount > 0 ? "border-amber-300/20 bg-amber-400/10" : "border-emerald-300/20 bg-emerald-400/10")}>
                                <div className="text-[10px] font-black text-white/45">طبيب الإشعارات</div>
                                <h4 className="mt-1 text-sm font-black">{latestCriticalIssue || oldTokenCount > 0 ? 'تم رصد علة بسيطة' : 'لا توجد أعطال حرجة'}</h4>
                                <p className="mt-2 text-[11px] font-bold text-white/65 leading-6">
                                  {latestCriticalIssue
                                    ? 'هذا الجهاز لم يعد يستقبل الإشعارات؛ يبدو أن التوكن استُبدل من الجهاز نفسه. الحل: اختبر أحدث جهاز بدل هذا.'
                                    : oldTokenCount > 0
                                      ? `توجد ${oldTokenCount} أجهزة أو توكنات قديمة. الحل الآمن: اختبر أحدث جهاز بدون حذف أي سجل.`
                                      : 'كل المؤشرات الحرجة هادئة الآن. التفاصيل تبقى داخل السجل عند الحاجة.'}
                                </p>
                                {(latestCriticalIssue || oldTokenCount > 0) && (
                                  <button type="button" onClick={() => openPushRadarArea('users', 'all')} className="mt-3 rounded-2xl bg-white text-slate-950 px-3 py-2 text-[10px] font-black">اختبار أحدث جهاز</button>
                                )}
                              </div>
                            </div>

                            <div className="rounded-[1.8rem] border border-slate-700/60 bg-slate-950 p-3 sm:p-4 text-white shadow-lg overflow-hidden max-w-full">
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <div>
                                  <div className="text-[10px] font-black text-emerald-100/90">خريطة الأجهزة الذكية</div>
                                  <h4 className="text-sm font-black text-white leading-6">اضغط على أي لون لفتح الأجهزة المعنية</h4>
                                </div>
                                <MonitorSmartphone size={18} className="text-emerald-200" />
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4 lg:gap-6 items-center max-w-full overflow-hidden">
                                {/* ديرة الأجهزة */}
                                <div className="flex justify-center shrink-0">
                                  <DeviceCompass
                                    allCards={allCards}
                                    sendingPushTestId={sendingPushTestId}
                                    sendPushDeviceTestNotification={sendPushDeviceTestNotification}
                                    triggerShockwave={triggerShockwave}
                                    openPushRadarArea={openPushRadarArea}
                                    getPushDeviceConfidence={getPushDeviceConfidence}
                                    getPushDeviceConfidenceMeta={getPushDeviceConfidenceMeta}
                                  />
                                </div>

                                {/* أزرار التحكم والإحصائيات */}
                                <div className="flex flex-col gap-4 w-full">
                                  {/* This column shares its row with the compass, so at lg
                                      it is far narrower than the page — four columns here
                                      shrank each label to ~45px and split Arabic words
                                      letter by letter. Four only once there is room. */}
                                  <div className="grid grid-cols-2 2xl:grid-cols-4 gap-1.5 text-[10px] font-bold text-white/60">
                                    {[
                                      ['الأخضر', 'جهاز حديث جاهز للاستقبال', 'golden', 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/25 text-emerald-300'],
                                      ['الأصفر', 'جهاز صامت ينتظر تأكيد وصول/فتح', 'silent', 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/25 text-amber-300'],
                                      ['الأحمر', 'توكن قديم أو جهاز شبح', 'ghost', 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/25 text-rose-300'],
                                      ['الأبيض', 'حساب بلا جهاز مفعّل', 'archived', 'bg-slate-800/40 hover:bg-slate-100/60 border-slate-700/50 text-slate-200'],
                                    ].map(([color, meaning, filter, cls]) => (
                                      <button
                                        key={color}
                                        type="button"
                                        onClick={() => { setPushDeviceSearch(''); openPushRadarArea('users', filter as any); }}
                                        className={cn("rounded-xl border px-2 py-1.5 text-right transition focus:outline-none", cls)}
                                      >
                                        <span className="block font-black text-[11px] mb-0.5 whitespace-nowrap">{color}</span>
                                        <span className="block opacity-75 truncate text-[9px] font-medium leading-4">{meaning}</span>
                                      </button>
                                    ))}
                                  </div>

                                  <div className="grid grid-cols-2 2xl:grid-cols-4 gap-2">
                                    {[
                                      ['أجهزة ذهبية', `${goldenDevices.length}`, 'حديثة وتستقبل غالباً', 'bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-300 border-emerald-500/20', 'golden'],
                                      ['أجهزة صامتة', `${silentDevices.length}`, 'محاولات إرسال بلا فتح مؤكد', 'bg-amber-500/10 hover:bg-amber-500/15 text-amber-300 border-amber-500/20', 'silent'],
                                      ['أجهزة شبحية', `${ghostDevices.length}`, 'توكن قديم أو مكرر', 'bg-rose-500/10 hover:bg-rose-500/15 text-rose-300 border-rose-500/20', 'ghost'],
                                      ['حسابات بلا جهاز', `${archivedCards.length}`, 'حساب محفوظ بلا جهاز مفعّل', 'bg-slate-800/40 hover:bg-slate-800/50 text-slate-300 border-slate-700/30', 'archived'],
                                    ].map(([label, value, hint, cls, filter]) => (
                                      <button type="button" key={label} onClick={() => { setPushDeviceSearch(''); openPushRadarArea('users', filter as any); }} className={cn("rounded-2xl border p-3 text-right hover:scale-[1.01] transition focus:outline-none", cls, pushDeviceMapFilter === filter ? "ring-2 ring-amber-400 border-amber-300" : "")}>
                                        {/* Keep-all stops Arabic labels splitting mid-word
                                            when the card is narrow. */}
                                        <div className="text-[10px] font-black opacity-80 [word-break:keep-all]">{label}</div>
                                        <div className="mt-1 text-2xl font-black tabular-nums">{value}</div>
                                        <div className="mt-1 text-[10px] font-bold opacity-75 leading-5 [word-break:keep-all]">{hint}</div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <details className="rounded-[1.8rem] border border-white/10 bg-slate-900/72 p-4 text-white overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                              <summary className="cursor-pointer list-none flex items-center justify-between gap-3 select-none">
                                <div>
                                  <div className="text-[10px] font-black text-slate-300">فحص كأني عميل</div>
                                  <h4 className="mt-1 text-sm font-black leading-6 text-white">{pushCustomerVerdict}</h4>
                                </div>
                                <span className="rounded-2xl bg-white/14 border border-white/10 px-3 py-2 text-[10px] font-black text-white">عرض التفاصيل</span>
                              </summary>
                              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                                {[
                                  ["الحسابات", `${allCards.length}`, "الكل"],
                                  ["وصول مؤكد", `${deliveredCount}`, "وصل"],
                                  ["يحتاج اختبار", `${testCount}`, "اختبار"],
                                  ["بلا جهاز", `${missingCount}`, "ناقص"],
                                ].map(([label, value, hint]) => (
                                  <div key={label} className="rounded-2xl border border-white/10 bg-black/15 p-3">
                                    <span className="block text-[10px] font-black text-white/45">{hint}</span>
                                    <strong className="mt-1 block text-2xl font-black">{value}</strong>
                                    <span className="text-[11px] font-bold text-white/60">{label}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button type="button" onClick={() => openPushRadarArea('users', 'all')} className="rounded-2xl bg-white text-slate-950 px-3 py-2 text-[10px] font-black">اختبار أحدث جهاز</button>
                                <button type="button" onClick={() => { setPushDeviceSearch(''); openPushRadarArea('users', 'silent'); }} className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2 text-[10px] font-black text-white">عرض الأجهزة الصامتة</button>
                              </div>
                            </details>

                            <div className="push-browser-health-card rounded-2xl border border-rose-900/10 bg-rose-50 px-3 py-3 text-slate-900 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-[0_16px_34px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.88)]">
                              <div>
                                <div className="text-xs font-black text-slate-950">نبض هذا المتصفح: {pushHealth.verdict}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-700">
                                  <span className="rounded-full bg-white/75 border border-rose-900/10 px-2 py-0.5 text-slate-700">{pushHealth.support}</span>
                                  <span className="rounded-full bg-white/75 border border-rose-900/10 px-2 py-0.5 text-slate-700">{pushHealth.permission}</span>
                                  <span className="rounded-full bg-white/75 border border-rose-900/10 px-2 py-0.5 text-slate-700">{pushHealth.serviceWorker}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setPushHealthDetailsOpen((v) => !v)}
                                className="rounded-xl bg-white/80 border border-rose-900/10 px-3 py-2 text-[10px] font-black text-slate-900 hover:bg-white transition flex items-center justify-center gap-1"
                              >
                                التفاصيل الفنية
                                <ChevronDown size={14} className={cn("transition-transform", pushHealthDetailsOpen ? "rotate-180" : "")} />
                              </button>
                            </div>

                            {pushHealthDetailsOpen && (
                              <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-3 space-y-2">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-full">
                                  {[
                                    ["Support", pushHealth.support],
                                    ["Permission", pushHealth.permission],
                                    ["Last Registration", pushHealth.lastRegistration],
                                    ["Service Worker", pushHealth.serviceWorker],
                                  ].map(([label, value]) => (
                                    <div key={label} className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 min-w-0">
                                      <span className="block text-[9px] font-black text-white/45">{label}</span>
                                      <strong dir="ltr" className="mt-1 block truncate text-[10px] font-black text-white">{value}</strong>
                                    </div>
                                  ))}
                                </div>
                                <div className="rounded-xl bg-black/25 border border-white/10 p-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-black text-white/45">Current Browser Token</span>
                                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black text-white/45">مخفي افتراضيًا</span>
                                  </div>
                                  <code dir="ltr" className="mt-2 block truncate text-[10px] font-bold text-emerald-100">
                                    {pushHealth.token ? `${pushHealth.token.slice(0, 18)}...${pushHealth.token.slice(-10)}` : "Not available"}
                                  </code>
                                </div>
                              </div>
                            )}

                            {/* Its own card, deliberately outside the radar cluster and in
                                a different visual key (light, indigo) so it never reads as
                                part of "رادار حياة الإشعار". Status is colour + icon only,
                                per the owner's ask for no clutter; meaning lives in
                                tooltips, not labels. */}
                            <details
                              className="rounded-[1.8rem] border border-indigo-900/10 bg-gradient-to-br from-indigo-50 to-white p-4 text-slate-900 overflow-hidden shadow-[0_16px_34px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.9)]"
                              onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open && !invoiceAlerts && !invoiceAlertsBusy) loadInvoiceAlerts(); }}
                            >
                              <summary className="cursor-pointer list-none flex items-center justify-between gap-3 select-none">
                                <div className="flex items-center gap-2.5">
                                  <span className="rounded-2xl bg-indigo-600/10 border border-indigo-900/10 p-2 text-indigo-700"><Bell size={16} /></span>
                                  {invoiceAlerts ? (
                                    <span className="flex items-center gap-1.5">
                                      <span className={cn(
                                        "inline-flex h-2.5 w-2.5 rounded-full",
                                        invoiceAlerts.some((r: any) => r.alertState === "missing") ? "bg-rose-500 animate-pulse" : "bg-emerald-500",
                                      )} />
                                      <span className="text-sm font-black tabular-nums leading-6 text-slate-900">
                                        {invoiceAlerts.filter((r: any) => r.alertState === "missing").length || ""}
                                      </span>
                                    </span>
                                  ) : null}
                                </div>
                                <span className="rounded-2xl bg-white border border-indigo-900/10 p-2 text-slate-600 shadow-sm"><ChevronDown size={14} /></span>
                              </summary>

                              <div className="mt-3">
                                {invoiceAlertsBusy && !invoiceAlerts ? (
                                  <div className="py-8 flex justify-center"><Loader2 size={18} className="animate-spin text-indigo-400" /></div>
                                ) : !invoiceAlerts?.length ? (
                                  <div className="py-8 flex justify-center text-slate-300"><Archive size={20} /></div>
                                ) : (
                                  <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
                                    {invoiceAlerts.map((r: any) => {
                                      const tone =
                                        r.alertState === "delivered" ? "text-emerald-600"
                                        : r.alertState === "sent" ? "text-amber-500"
                                        : r.alertState === "failed" ? "text-rose-600"
                                        : r.alertState === "missing" ? "text-rose-600"
                                        : "text-slate-300";
                                      const hint =
                                        r.alertState === "delivered" ? "وصل جهازك"
                                        : r.alertState === "sent" ? "خرج للجوال — بانتظار التأكيد"
                                        : r.alertState === "failed" ? "فشل الإرسال"
                                        : r.alertState === "missing" ? "ما انرسل إشعار"
                                        : "غير مدفوعة";
                                      return (
                                        <div
                                          key={r.invoiceId}
                                          className={cn(
                                            "flex items-center gap-3 rounded-xl px-3 py-2 border",
                                            r.alertState === "missing" ? "border-rose-300 bg-rose-50" : "border-slate-200/70 bg-white",
                                          )}
                                        >
                                          <span title={hint} className={cn("shrink-0", tone)}>
                                            {r.alertState === "delivered" ? <CheckCircle2 size={16} />
                                              : r.alertState === "sent" || r.alertState === "none" ? <Clock size={16} />
                                              : <AlertTriangle size={16} />}
                                          </span>
                                          <span className="font-black text-[12px] tabular-nums text-slate-900 shrink-0">{String(r.invoiceId).replace("INV-", "")}</span>
                                          <span className="flex-1 text-left text-[12px] font-bold tabular-nums text-slate-500">
                                            {r.amount > 0 ? r.amount.toFixed(3) : ""}
                                          </span>
                                          <span title={r.paid ? "مدفوعة" : "غير مدفوعة"} className={cn("shrink-0", r.paid ? "text-emerald-600" : "text-slate-300")}>
                                            <CreditCard size={14} />
                                          </span>
                                          {r.paid && r.alertState !== "delivered" ? (
                                            <button
                                              type="button"
                                              title="إعادة إرسال الإشعار"
                                              onClick={() => resendInvoiceAlert(r.invoiceId)}
                                              disabled={resendingInvoice === r.invoiceId}
                                              className="shrink-0 rounded-lg bg-indigo-600 hover:bg-indigo-700 p-1.5 text-white shadow-sm disabled:opacity-40"
                                            >
                                              {resendingInvoice === r.invoiceId ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                            </button>
                                          ) : <span className="w-[29px] shrink-0" />}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <div className="mt-3 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={loadInvoiceAlerts}
                                    disabled={invoiceAlertsBusy}
                                    title="تحديث"
                                    className="rounded-2xl bg-white border border-indigo-900/10 p-2 text-slate-600 shadow-sm disabled:opacity-40"
                                  >
                                    <RefreshCw size={14} className={cn(invoiceAlertsBusy && "animate-spin")} />
                                  </button>
                                </div>
                              </div>
                            </details>

                            <div id="push-radar-list" className="push-radar-list-clean flex flex-col lg:flex-row gap-2 lg:items-start lg:justify-between scroll-mt-24">
                              <details className="rounded-2xl bg-white/10 border border-white/10 p-1 overflow-hidden">
                                <summary className="cursor-pointer list-none rounded-xl px-3 py-2 text-[11px] font-black text-white flex items-center justify-between gap-3 min-w-44">
                                  <span>قائمة الرادار</span>
                                  <ChevronDown size={14} />
                                </summary>
                                <div className="mt-1 grid gap-1 p-1">
                                  {[
                                    ["users", "المستخدمون"],
                                    ["log", "آخر الإشعارات"],
                                    ["advanced", "فني مخفي"],
                                  ].map(([id, label]) => (
                                    <button
                                      key={id}
                                      type="button"
                                      onClick={() => openPushRadarArea(id as any)}
                                      className={cn(
                                        "rounded-xl px-3 py-2 text-[11px] font-black whitespace-nowrap transition text-right",
                                        pushDeviceTab === id
                                          ? "bg-white text-slate-950 shadow-sm"
                                          : "text-white/60 hover:bg-white/10 hover:text-white",
                                      )}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </details>
                              <div className="relative min-w-0 lg:w-80">
                                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35" />
                                <input
                                  value={pushDeviceSearch}
                                  onChange={(e) => setPushDeviceSearch(e.target.value)}
                                  placeholder="بحث باسم المستخدم أو الحالة..."
                                  className="w-full rounded-2xl border border-white/10 bg-white/10 py-2.5 pr-9 pl-3 text-xs font-bold text-white placeholder:text-white/35 outline-none focus:border-emerald-300/40"
                                />
                              </div>
                            </div>

                            {pushDeviceTab === "users" && (
                              <div className="push-radar-users-clean grid gap-3">
                                <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-white">
                                  <div className="text-[11px] font-black">
                                    أنت الآن تشاهد: {pushDeviceMapFilter === "all" ? "كل المستخدمين والأجهزة" : pushDeviceMapFilter === "golden" ? "الأجهزة الذهبية الجاهزة" : pushDeviceMapFilter === "silent" ? "الأجهزة الصامتة" : pushDeviceMapFilter === "ghost" ? "الأجهزة الشبحية/القديمة" : "الحسابات بلا جهاز"}
                                    <span className="mr-2 text-white/45">اضغط التفاصيل داخل أي بطاقة للقراءة الكاملة.</span>
                                  </div>
                                  {pushDeviceMapFilter !== "all" && (
                                    <button type="button" onClick={() => { setPushDeviceMapFilter("all"); setPushUsersVisibleCount(12); }} className="rounded-xl bg-white text-slate-950 px-3 py-2 text-[10px] font-black">رجوع للخريطة الكاملة</button>
                                  )}
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-white">
                                  <div className="text-[11px] font-black">
                                    {pushDeviceMapFilter === "all" ? "كل المستخدمين والأجهزة" : pushDeviceMapFilter === "golden" ? "الأجهزة الذهبية" : pushDeviceMapFilter === "silent" ? "الأجهزة الصامتة" : pushDeviceMapFilter === "ghost" ? "الأجهزة الشبحية" : "حسابات بلا جهاز"}
                                    <span className="mr-2 text-white/45">({visibleCards.length})</span>
                                  </div>
                                  {pushDeviceMapFilter !== "all" && (
                                    <button type="button" onClick={() => { setPushDeviceMapFilter("all"); setPushUsersVisibleCount(12); }} className="rounded-xl bg-white/10 border border-white/10 px-3 py-1.5 text-[10px] font-black text-white hover:bg-white/15">عرض الكل</button>
                                  )}
                                </div>
                                {visibleCards.length ? visibleUserCards.map((card) => {
                                  const firstDevice = card.bestDevice;
                                  const expanded = expandedPushDeviceId === card.key;
                                  return (
                                    <div key={card.key} className="push-radar-user-card push-radar-readable-card push-radar-night-card rounded-[1.5rem] border p-3 md:p-4 overflow-hidden max-w-full" style={{ background: "radial-gradient(circle at top right, rgba(245,158,11,0.18), transparent 36%), linear-gradient(145deg, #0f172a 0%, #111827 48%, #1e1b4b 100%)", borderColor: "rgba(245,158,11,0.34)", color: "#f8fafc", boxShadow: "0 22px 54px rgba(2,6,23,0.34), inset 0 1px 0 rgba(255,255,255,0.10)" }}>
                                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 min-w-0 max-w-full">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                                            <span className={cn("h-2.5 w-2.5 rounded-full", card.state.dot)} />
                                            <div className="min-w-0">
                                              <h4 className="push-radar-readable-title text-base font-black truncate" style={{ color: "#ffffff" }}>{getPushPersonName(card.identity, card.identity.id)}</h4>
                                              <div className="push-radar-readable-muted mt-0.5 truncate text-[11px] font-bold" style={{ color: "#cbd5e1" }}>{getPushPersonSubtitle(card.identity, card.identity.id)}</div>
                                            </div>
                                            <span className="push-radar-readable-pill rounded-full border px-2 py-0.5 text-[10px] font-black" style={{ background: "rgba(245,158,11,0.16)", borderColor: "rgba(251,191,36,0.28)", color: "#fde68a" }}>{cleanRole(card.identity.role)}</span>
                                            <span className="push-radar-readable-status rounded-full border px-2 py-0.5 text-[10px] font-black" style={{ background: "rgba(255,255,255,0.94)", borderColor: "rgba(251,191,36,0.28)", color: "#7c2d12" }}>{card.state.label}</span>
                                          </div>
                                          <p className="push-radar-readable-detail mt-1 text-xs font-bold leading-6" style={{ color: "#e2e8f0" }}>{card.state.detail}</p>
                                          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                                            <div className="push-radar-readable-metric rounded-2xl border p-3" style={{ background: "rgba(15,23,42,0.72)", borderColor: "rgba(148,163,184,0.22)" }}>
                                              <span className="push-radar-readable-label block text-[10px] font-black" style={{ color: "#fcd34d" }}>الأجهزة</span>
                                              <strong className="push-radar-readable-value mt-1 block text-sm font-black" style={{ color: "#ffffff" }}>{card.devices.length ? `${card.devices.length} جهاز` : "لا يوجد"}</strong>
                                            </div>
                                            <div className="push-radar-readable-metric rounded-2xl border p-3 min-w-0" style={{ background: "rgba(15,23,42,0.72)", borderColor: "rgba(148,163,184,0.22)" }}>
                                              <span className="push-radar-readable-label block text-[10px] font-black" style={{ color: "#fcd34d" }}>آخر إشعار وصل</span>
                                              <strong className="push-radar-readable-value mt-1 block truncate text-sm font-black" style={{ color: "#ffffff" }}>{card.latestDelivered?.title || "لا يوجد وصول مؤكد"}</strong>
                                              {card.latestDelivered?.message && <span className="push-radar-readable-muted mt-1 block truncate text-[11px] font-bold text-slate-600">{card.latestDelivered.message}</span>}
                                              {card.latestDelivered?.date && <span className="push-radar-readable-muted mt-1 block text-[10px] font-bold text-slate-500">{card.latestDelivered.date}</span>}
                                            </div>
                                            <div className="push-radar-readable-metric rounded-2xl border p-3" style={{ background: "rgba(15,23,42,0.72)", borderColor: "rgba(148,163,184,0.22)" }}>
                                              <span className="push-radar-readable-label block text-[10px] font-black" style={{ color: "#fcd34d" }}>آخر محاولة</span>
                                              <strong className="push-radar-readable-value mt-1 block text-sm font-black" style={{ color: "#ffffff" }}>{getDeliveryMilestoneSummary(card.latest)}</strong>
                                              {card.latest?.title && <span className="push-radar-readable-muted mt-1 block truncate text-[10px] font-bold text-slate-500">{card.latest.title}</span>}
                                            </div>
                                          </div>
                                          <div className="push-radar-readable-panel mt-3 rounded-2xl border p-3" style={{ background: "rgba(2,6,23,0.42)", borderColor: "rgba(251,191,36,0.22)" }}>
                                            <div className="mb-2 flex items-center justify-between gap-2">
                                              <span className="push-radar-readable-label text-[10px] font-black" style={{ color: "#fcd34d" }}>مسار آخر إشعار</span>
                                              <span className="push-radar-readable-muted text-[10px] font-bold" style={{ color: "#cbd5e1" }}>عرض مبسط فقط — بدون تغيير نظام الإرسال</span>
                                            </div>
                                            <div className="push-radar-readable-note mb-2 rounded-xl border px-3 py-2 text-[11px] font-bold" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(251,191,36,0.18)", color: "#f8fafc" }}>
                                              {getDeliveryHumanReason(card.latest, card.bestDevice)}
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-full">
                                              {getDeliveryMilestones(card.latest).map((step) => (
                                                <div
                                                  key={step.key}
                                                  className={cn(
                                                    "rounded-xl border px-2.5 py-2 text-[10px] font-black flex items-center gap-2",
                                                    step.done
                                                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                                      : "border-slate-200 bg-slate-50 text-slate-500",
                                                  )}
                                                >
                                                  <span className={cn("h-2 w-2 rounded-full", step.done ? "bg-emerald-300" : "bg-white/20")} />
                                                  <span>{step.label}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                          {card.lastTestResult && (
                                            <div className="push-radar-readable-note mt-2 rounded-2xl border px-3 py-2 text-[11px] font-bold" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(251,191,36,0.18)", color: "#f8fafc" }}>
                                              {card.lastTestResult}
                                            </div>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 lg:w-40 min-w-0">
                                          <button
                                            type="button"
                                            disabled={!firstDevice || sendingPushTestId === firstDevice.id || !firstDevice.token || firstDevice.token === "Not available"}
                                            onClick={(e) => {
                                              if (firstDevice) {
                                                triggerShockwave(e);
                                                void sendPushDeviceTestNotification(firstDevice, card.devices);
                                              }
                                            }}
                                            className="min-w-0 rounded-2xl bg-white text-slate-950 px-2.5 py-2.5 text-[10px] sm:text-[11px] font-black hover:bg-emerald-50 disabled:opacity-45 transition flex items-center justify-center gap-1.5"
                                          >
                                            {firstDevice && sendingPushTestId === firstDevice.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                            اختبر أحدث جهاز
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setExpandedPushDeviceId(expanded ? null : card.key)}
                                            className="push-radar-details-btn min-w-0 rounded-2xl bg-white/75 border border-amber-900/10 px-2.5 py-2.5 text-[10px] sm:text-[11px] font-black text-slate-800 hover:bg-white transition flex items-center justify-center gap-1.5"
                                          >
                                            التفاصيل
                                            <ChevronDown size={13} className={cn("transition-transform", expanded ? "rotate-180" : "")} />
                                          </button>
                                        </div>
                                      </div>
                                      {expanded && (
                                        <div className="push-radar-readable-expanded mt-3 rounded-2xl border p-2.5 sm:p-3 space-y-3 overflow-hidden max-w-full" style={{ background: "rgba(2,6,23,0.36)", borderColor: "rgba(251,191,36,0.22)", color: "#f8fafc" }}>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-full overflow-hidden">
                                            {(card.devices || []).map((device) => {
                                              const readiness = getPushReadinessVerdict(device);
                                              return (
                                                <div key={device.id} className="push-radar-readable-device rounded-2xl border p-3 min-w-0 overflow-hidden max-w-full" style={{ background: "rgba(15,23,42,0.72)", borderColor: "rgba(148,163,184,0.22)", color: "#f8fafc" }}>
                                                  <div className="grid grid-cols-[1fr_auto] items-center gap-2 min-w-0">
                                                    <strong className="block min-w-0 truncate text-xs font-black">{device.label}</strong>
                                                    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black", getPushDeviceConfidenceMeta(getPushDeviceConfidence(device)).className)}>{getPushDeviceConfidence(device)}%</span>
                                                  </div>
                                                  <p className="push-radar-readable-muted mt-2 text-[10px] font-bold leading-5 text-slate-600">{readiness.detail}</p>
                                                  <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
                                                    <span className="rounded-xl bg-slate-100/90 px-2 py-1 truncate text-slate-700">{device.platform || device.deviceType || "جهاز"}</span>
                                                    <span className="rounded-xl bg-slate-100/90 px-2 py-1 truncate text-slate-700">{isMissingTimestamp(device.lastRead) ? "بلا قراءة" : device.lastRead}</span>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                          {card.deliveredNotifications.length > 0 ? (
                                            <div className="space-y-2">
                                              <div className="push-radar-readable-label text-[10px] font-black" style={{ color: "#fcd34d" }}>آخر الإشعارات التي وصلت لهذا المستخدم</div>
                                              {card.deliveredNotifications.slice(0, 4).map((notification: any) => (
                                                <div key={notification.id} className="push-radar-readable-notification rounded-xl border px-3 py-2 text-[11px] font-bold space-y-2" style={{ background: "rgba(15,23,42,0.72)", borderColor: "rgba(148,163,184,0.22)", color: "#f8fafc" }}>
                                                  <div className="flex items-center justify-between gap-3">
                                                    <span className="truncate">{notification.title}</span>
                                                    <span className="push-radar-readable-muted shrink-0 text-slate-500">{getDeliveryMilestoneSummary(notification)}</span>
                                                  </div>
                                                  {notification.message && <div className="push-radar-readable-muted truncate text-[10px] text-slate-500">{notification.message}</div>}
                                                  {(() => {
                                                    const recipient = getPushNotificationRecipientMeta(notification);
                                                    return (
                                                      <div className="grid md:grid-cols-2 gap-1.5 text-[10px] font-black text-slate-600">
                                                        <span className="rounded-lg bg-slate-50 border border-slate-200 px-2 py-1 truncate text-slate-700">أُرسل إلى: {recipient.name}</span>
                                                        <span className="rounded-lg bg-slate-50 border border-slate-200 px-2 py-1 truncate text-slate-700">الجهاز: {recipient.deviceLabel}</span>
                                                      </div>
                                                    );
                                                  })()}
                                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                                                    {getDeliveryMilestones(notification).map((step) => (
                                                      <span
                                                        key={step.key}
                                                        className={cn(
                                                          "rounded-lg border px-2 py-1 text-[9px] font-black text-center",
                                                          step.done
                                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                            : "border-slate-200 bg-slate-50 text-slate-400",
                                                        )}
                                                      >
                                                        {step.done ? "✓ " : "— "}{step.label}
                                                      </span>
                                                    ))}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : card.notifications.length > 0 ? (
                                            <div className="rounded-xl bg-amber-400/10 border border-amber-300/20 px-3 py-2 text-[11px] font-bold text-amber-100">
                                              توجد محاولات إرسال محفوظة، لكن لا يوجد تأكيد وصول من الجهاز حتى الآن.
                                            </div>
                                          ) : null}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }) : archivedCards.length > 0 && !query && !pushArchiveAccountsOpen ? null : (
                                  <div className="rounded-2xl border border-white/10 bg-white/10 p-5 text-center text-sm font-bold text-slate-500">
                                    لا توجد نتائج مطابقة للبحث.
                                  </div>
                                )}
                                {visibleCards.length > visibleUserCards.length && (
                                  <button type="button" onClick={() => setPushUsersVisibleCount((v) => v + 12)} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-[11px] font-black text-white hover:bg-white/15 transition">
                                    عرض المزيد من الأجهزة والحسابات ({visibleCards.length - visibleUserCards.length} متبقي)
                                  </button>
                                )}
                                {!query && archivedCards.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setPushArchiveAccountsOpen((v) => !v)}
                                    className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-right text-white hover:bg-white/15 transition flex items-center justify-between gap-3"
                                  >
                                    <span className="flex items-center gap-2 font-black text-sm">
                                      <Archive size={16} className="text-amber-200" />
                                      حسابات بلا جهاز
                                    </span>
                                    <span className="flex items-center gap-2 text-[11px] font-black text-white/55">
                                      {archivedCards.length} حساب
                                      <ChevronDown size={14} className={cn("transition-transform", pushArchiveAccountsOpen ? "rotate-180" : "")} />
                                    </span>
                                  </button>
                                )}
                              </div>
                            )}

                            {pushDeviceTab === "log" && (
                              <div id="push-notification-log" className="rounded-[1.5rem] border border-slate-200 bg-white text-slate-900 p-2.5 md:p-3 space-y-3 shadow-inner max-h-[70vh] overflow-y-auto overflow-x-hidden overscroll-contain scroll-mt-24 max-w-full">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                  <div>
                                    <div className="text-xs font-black text-slate-950">السجل الذكي للإشعارات</div>
                                    <div className="text-[10px] font-bold text-slate-500 mt-1">يعرض {visibleNotificationLog.length} من {notificationLog.length} نتيجة. {focusedNotification ? "تم فتح الإشعار المحدد من الرادار." : "اختر أي إشعار لفتح تفاصيله."}</div>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {[
                                      ['all', 'الكل'],
                                      ['delivered', 'وصل للجهاز'],
                                      ['opened', 'تم فتحه'],
                                      ['waiting', 'بانتظار تأكيد'],
                                      ['failed', 'فشل'],
                                    ].map(([id, label]) => (
                                      <button key={id} type="button" onClick={() => { setPushLogStatusFilter(id as any); setPushLogVisibleCount(20); }} className={cn("rounded-xl px-3 py-2 text-[10px] font-black transition", pushLogStatusFilter === id ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                {visibleNotificationLog.length ? visibleNotificationLog.map((notification) => {
                                  const selected = selectedPushNotificationId === notification.id;
                                  const recipient = getPushNotificationRecipientMeta(notification);
                                  const steps = getDeliveryMilestones(notification);
                                  return (
                                    <div key={notification.id} className={cn("rounded-2xl border p-3 transition overflow-hidden max-w-full", selected ? "bg-emerald-50 border-emerald-200 ring-1 ring-emerald-100" : "bg-slate-50 border-slate-200")}>
                                      <button type="button" onClick={() => setSelectedPushNotificationId(selected ? null : notification.id)} className="w-full text-right flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="font-black text-sm truncate">{notification.title || "إشعار بدون عنوان"}</div>
                                          <div className="mt-1 text-[11px] font-bold text-slate-500 truncate">أُرسل إلى: {recipient.name} — {notification.message || "بدون نص"}</div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black shrink-0">
                                          <span className={cn("rounded-full px-2 py-1", notification.success === false ? "bg-rose-400/15 text-rose-100" : (notification.receivedByDevice || notification.receivedAt || notification.openedByEmployee || notification.clickedAt) ? "bg-emerald-400/15 text-emerald-100" : "bg-amber-400/15 text-amber-100")}>{notification.deliveryStage || getPushDeliveryStageLabel(notification)}</span>
                                          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500">{notification.date || "بلا وقت"}</span>
                                          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{selected ? "إخفاء" : "تفاصيل"}</span>
                                        </div>
                                      </button>
                                      {selected && (
                                        <div className="mt-3 space-y-2">
                                          <div className="grid sm:grid-cols-2 gap-1.5 text-[10px] font-bold text-slate-600">
                                            <span className="rounded-xl bg-slate-100 border border-slate-200 px-2 py-1 truncate">أُرسل إلى: {recipient.name}</span>
                                            <span className="rounded-xl bg-slate-100 border border-slate-200 px-2 py-1 truncate">الجهاز: {recipient.deviceLabel}</span>
                                            {recipient.subtitle && <span className="rounded-xl bg-slate-100 border border-slate-200 px-2 py-1 truncate">المعرّف: {recipient.subtitle}</span>}
                                            <span className="rounded-xl bg-slate-100 border border-slate-200 px-2 py-1 truncate">التوكن: {recipient.tokenTail}</span>
                                          </div>
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                                            {steps.map((step) => (
                                              <span key={step.key} className={cn("rounded-lg border px-2 py-1 text-[9px] font-black text-center", step.done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-400")}>
                                                {step.done ? "✓ " : "— "}{step.label}
                                              </span>
                                            ))}
                                          </div>
                                          <div className="rounded-xl bg-slate-100 border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700">{getDeliveryHumanReason(notification, (notification as any).device)}</div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }) : (
                                  <div className="p-5 text-center text-sm font-bold text-slate-500">لا يوجد أرشيف إشعارات مسجل.</div>
                                )}
                                {notificationLog.length > visibleNotificationLog.length && (
                                  <button type="button" onClick={() => setPushLogVisibleCount((v) => v + 20)} className="w-full rounded-2xl bg-slate-100 border border-slate-200 px-4 py-3 text-[11px] font-black text-slate-700 hover:bg-slate-200">
                                    عرض المزيد من السجل
                                  </button>
                                )}
                              </div>
                            )}

                            {pushDeviceTab === "advanced" && (
                              <div className="space-y-3">
                                <details className="rounded-2xl border border-white/10 bg-slate-950/35 p-3">
                                  <summary className="cursor-pointer text-[11px] font-black text-white flex items-center gap-2">
                                    <Filter size={14} /> فلاتر وفحص فني متقدم
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
                                <div className="grid md:grid-cols-2 gap-2">
                                  {pushDevices.filter((device) => matchesPushAdvancedFilter(device, pushDevices)).map((device) => (
                                    <div key={device.id} className="rounded-2xl border border-white/10 bg-white/10 p-3 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <strong className="truncate text-xs font-black">{device.label}</strong>
                                        <span className="rounded-full bg-black/20 px-2 py-0.5 text-[9px] font-black text-white/50">{getPushStatusMeta(device.status).label}</span>
                                      </div>
                                      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-bold text-white/50">
                                        <span className="rounded-xl bg-slate-100/90 px-2 py-1 truncate text-slate-700">{device.userEmail || device.userName || cleanPushAccountLabel(device.userId, "بلا إيميل محفوظ")}</span>
                                        <span className="rounded-xl bg-slate-100/90 px-2 py-1 truncate text-slate-700">{device.platform || device.deviceType || "No platform"}</span>
                                        <span className="rounded-xl bg-slate-100/90 px-2 py-1 truncate text-slate-700">{device.lastRead}</span>
                                        <span className="rounded-xl bg-black/20 px-2 py-1 truncate" dir="ltr">{device.token ? `${device.token.slice(0, 12)}...${device.token.slice(-8)}` : "No token"}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => copyPushExecutiveSummary(pushDevices)}
                                  className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-[10px] font-black text-white hover:bg-white/15 flex items-center justify-center gap-2"
                                >
                                  <Code size={13} /> نسخ ملخص فني
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm font-bold leading-7 text-white/65">
                        اضغط <span className="font-black text-white">فحص الآن</span> لعرض المستخدمين، الأجهزة، آخر الإشعارات، وزر اختبار سريع لكل مستخدم.
                      </div>
                    )}
                  </div>
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

                      <button
                        onClick={() => {
                          const simulationData = GENERATE_PERFORMANCE_SIMULATION_DATA();
                          setData(simulationData);
                          addToast(
                            "تم بدء محاكاة الأداء العالي 🚀",
                            "تم تحميل 10,000 فاتورة و5,000 عميل محلياً بأمان وبدون أي تأثير على قاعدة بيانتك السحابية!",
                            "success",
                          );
                        }}
                        className="w-full flex items-center justify-between p-3 border rounded-2xl group transition-all shadow-sm bg-amber-50/50 border-amber-200 hover:bg-amber-100/75 text-amber-900 active:scale-[0.98]"
                      >
                        <Sparkles
                          size={18}
                          className="group-hover:scale-110 transition-transform text-amber-600 font-bold"
                        />
                        <div className="text-right">
                          <div className="text-xs font-bold font-sans">
                            محاكاة الأداء الأقصى (الآمنة) ⚡️
                          </div>
                          <div className="text-[10px] opacity-80">
                            تحميل 10,000 طلب و5,000 عميل محلياً لاختبار سرعة واستجابة النظام
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

      {/* أوركسترا موجات الإشعارات (Visual Notification Waves) */}
      {shockwaves.map((wave) => (
        <div key={wave.id} className="fixed inset-0 pointer-events-none z-[99999]">
          <motion.div
            initial={{ x: wave.x, y: wave.y, scale: 0, opacity: 0.95 }}
            animate={{
              scale: 18,
              opacity: 0,
            }}
            transition={{ duration: 1.6, ease: "easeOut" }}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-400 bg-gradient-to-r from-amber-300/10 to-transparent shadow-[0_0_60px_rgba(245,158,11,0.2)]"
            style={{
              width: "100px",
              height: "100px",
              left: 0,
              top: 0
            }}
          />
          <motion.div
            initial={{ x: wave.x, y: wave.y, scale: 0, opacity: 0.8 }}
            animate={{
              scale: 14,
              opacity: 0,
            }}
            transition={{ duration: 1.3, delay: 0.15, ease: "easeOut" }}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400 bg-gradient-to-r from-emerald-400/5 to-transparent shadow-[0_0_40px_rgba(52,211,153,0.15)]"
            style={{
              width: "100px",
              height: "100px",
              left: 0,
              top: 0
            }}
          />
          <motion.div
            initial={{ opacity: 0.2 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-white/[0.02] backdrop-blur-[0.5px]"
          />
        </div>
      ))}
    </div>
  );
};

export default GeneralSettings;
