// invalidated cache 2026-05-07 14:18
import { getUnifiedInvoices } from '../lib/utils';
import { 
    computeInvoiceTotal, computeInvoiceSubtotal, 
    computeInvoiceCost, 
    computeInvoiceProfit, 
    computeInvoiceAddonsTotal 
} from '../lib/invoice-calculations';
import React, {
  useState,
  useMemo,
  useEffect,
  useTransition,
  useRef,
} from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Activity,
  Layers,
  Flame,
  Wallet,
  Sparkles,
  BarChart3,
  Truck,
  Calendar,
  ShoppingBag,
  Clock,
  MapPin,
  Users,
  PieChart,
  CreditCard,
  Search,
  Moon,
  User,
  Map,
  Heart,
  Zap,
  History,
  FileText,
  Cpu,
  Package,
  X,
  RefreshCw,
  Send,
  CheckCircle,
  CheckCircle2,
  MessageSquare,
  Plus,
  AlertCircle,
  CloudRain,
  Trash2,
  ChevronDown,
  ChevronLeft,
  Briefcase,
  Rocket,
  Percent,
  Calculator,
  Handshake,
  ArrowLeftRight,
  ShieldAlert,
  BrainCircuit,
  RefreshCcw,
  Turtle,
  AlertTriangle,
  Lightbulb,
  Award,
  Tag,
  Star,
  ShoppingCart,
  Database,
  Download,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";
import { AppState } from "../types";
import { cn } from "../lib/utils";
// Performance tracking removed as requested
import { motion, AnimatePresence } from "motion/react";
import { MagneticButton } from "./ui/MagneticButton";
const LoyaltyProgramPage = React.lazy(() =>
  import("./LoyaltyProgramPage").then((m) => ({
    default: m.LoyaltyProgramPage,
  })),
);
const PromoCodePage = React.lazy(() =>
  import("./PromoCodePage").then((m) => ({ default: m.PromoCodePage })),
);
const OrderPage = React.lazy(() => import("./OrderPage"));
import { MarketingLab } from "./MarketingLab";
import { DiwaniyaTournaments } from "./DiwaniyaTournaments";
const GoalManager = React.lazy(() =>
  import("./GoalManager").then((m) => ({ default: m.GoalManager })),
);
const KuwaitSeasonalCalendar = React.lazy(() =>
  import("./KuwaitSeasonalCalendar").then((m) => ({
    default: m.KuwaitSeasonalCalendar,
  })),
);
const RealProfitGuard = React.lazy(() =>
  import("./RealProfitGuard").then((m) => ({ default: m.RealProfitGuard })),
);
const SupplierNegotiator = React.lazy(() =>
  import("./SupplierNegotiator").then((m) => ({
    default: m.SupplierNegotiator,
  })),
);
const WhatIfSimulator = React.lazy(() =>
  import("./WhatIfSimulator").then((m) => ({ default: m.WhatIfSimulator })),
);
const SmartOffersCalculator = React.lazy(() =>
  import("./SmartOffersCalculator").then((m) => ({
    default: m.SmartOffersCalculator,
  })),
);
import { FutureForecast } from "./FutureForecast";
import { CommandBrief } from "./CommandBrief";
import { ProfitGuardFeature, SupplierNegotiatorFeature, BusinessHealthFeature, SmartOffersCalculatorFeature } from "./DashboardFeatures";
const BusinessHealthIndex = React.lazy(() =>
  import("./BusinessHealthIndex").then((m) => ({
    default: m.BusinessHealthIndex,
  })),
);
const ClientSniperRadar = React.lazy(() => import("./ClientSniperRadar"));
const GeoHeatmap = React.lazy(() => import("./GeoHeatmap"));
const VIPMissions = React.lazy(() => import("./VIPMissions").then(m => ({ default: m.VIPMissions })));

import {
  generateBusinessInsights,
  AIInsight,
  performArchiveAnalysis,
  generateAutoStrategies,
  AIStrategy,
  generateHiddenRisks,
  HiddenRisk,
  generateAILearningInsights,
  AILearningLog,
  generateStructuredCampaign,
  generateRealProfitAnalysis,
  generateSupplierNegotiationAnalysis,
  calculateBusinessHealthIndex,
  generatePulseArchiveAnalysis,
  analyzeKuwaitiSentiment,
  generateAIBusinessRecommendation,
} from "../lib/ai-engine";
import {
  getCurrentAndUpcomingEvents,
  getSeasonalInsight,
} from "../lib/kuwait-calendar";
import { toast } from "sonner";
import {
  AICampaign,
  RealProfitInsight,
  SupplierNegotiationInsight,
  PulseAnalysisRecord,
} from "../types";
import {
  isPendingStatus,
  isFailedStatus,
  isPaidStatus,
} from "../lib/status-utils";
import { GET_DEMO_DATA } from "../data";

interface DashboardProps {
  data: AppState;
  onNavigate?: (page: string) => void;
  defaultTab?: string;
  scrollTarget?: string;
  scrollTargetTimestamp?: number;
  onUpdateData: (newData: AppState) => void;
  appMode?: "local" | "cloud";
  setDeepLinkData?: (data: any) => void;
}


const GlobalStatBox = React.memo(
  ({
    label,
    value,
    color,
    icon: Icon,
    index,
    isPercent = false,
    subtext = "",
    unit = "",
  }: any) => {
    const getGradient = (color: string) => {
      switch (color) {
        case "blue":
          return "from-blue-500/10 to-indigo-500/5 text-blue-600 border-blue-100 shadow-blue-500/5";
        case "red":
          return "from-rose-500/10 to-pink-500/5 text-rose-600 border-rose-100 shadow-rose-500/5";
        case "emerald":
          return "from-emerald-500/10 to-teal-500/5 text-emerald-600 border-emerald-100 shadow-emerald-500/5";
        case "amber":
          return "from-amber-500/10 to-yellow-500/5 text-amber-600 border-amber-100 shadow-amber-500/5";
        case "purple":
          return "from-purple-500/10 to-fuchsia-500/5 text-purple-600 border-purple-100 shadow-purple-500/5";
        case "indigo":
          return "from-indigo-500/10 to-blue-500/5 text-indigo-600 border-indigo-100 shadow-indigo-500/5";
        case "rose":
          return "from-rose-500/10 to-red-500/5 text-rose-600 border-rose-100 shadow-rose-500/5";
        default:
          return "from-slate-500/10 to-slate-500/5 text-slate-600 border-slate-100 shadow-slate-500/5";
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "p-4 sm:p-6 rounded-2xl sm:rounded-2xl border bg-white relative overflow-hidden group shadow-sm flex flex-col justify-between h-full",
          getGradient(color),
        )}
      >
        {/* Decor Accents */}
        <div className="absolute -top-3 md:p-4 -left-10 w-32 h-32 bg-current opacity-[0.03] rounded-full blur-3xl group-hover:opacity-10 transition-opacity" />

        <div className="flex justify-between items-start mb-4 sm:mb-6 relative z-10 flex-row-reverse">
          <div
            className={cn(
              "w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center bg-white shadow-lg shadow-current/10 border border-current/5 transition-transform group-hover:rotate-6 duration-300",
              getGradient(color).split(" ")[2],
            )}
          >
            <Icon size={20} strokeWidth={2.5} className="sm:w-7 sm:h-7" />
          </div>
        </div>

        <div className="text-right relative z-10">
          <div className="text-[10px] sm:text-xs font-bold uppercase opacity-60 mb-1 lg:mb-2 text-slate-500">
            {label}
          </div>
          <div className="flex items-baseline justify-end gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
            <span className="text-[10px] sm:text-xs font-bold opacity-40 uppercase tracking-tighter">
              {unit}
            </span>
            <div className="text-lg min-[360px]:text-xl sm:text-3xl font-mono tracking-tighter font-bold text-slate-900 tracking-tighter interactive-hover origin-right truncate overflow-hidden text-ellipsis whitespace-nowrap auto-cols-min">
              {isPercent
                ? `${value.toFixed(1)}%`
                : Number(value).toLocaleString("en-GB", {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}
            </div>
          </div>

          {subtext && (
            <div
              className={cn(
                "text-[10px] sm:text-[10px] mt-1.5 sm:mt-2 font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-current/10 inline-block",
                getGradient(color).split(" ")[2],
              )}
            >
              {subtext}
            </div>
          )}
        </div>
      </motion.div>
    );
  },
);

export type DashboardTab =
  | "pulse"
  | "intelligence"
  | "financials"
  | "advanced"
  | "customers"
  | "suppliers"
  | "growth"
  | "diwaniya"
  | "loyalty"
  | "promocodes"
  | "orders";

// Build Version: 2026-05-20-PULSE-4X4-STRICT-V2.6
// Helper for dynamic supplier pricing analysis
const getSupplierPriceIndicator = (s: any) => {
  if (!s || !s.name) return { val: "0.0%", type: "stable" };

  // Logic: Use phone number last digits for a deterministic but varied indicator
  const phoneSuffix = parseInt((s.phone || "0").slice(-2), 10);
  if (phoneSuffix % 3 === 0) return { val: "-4.2%", type: "low" }; // Green Label Trigger
  if (phoneSuffix % 7 === 0) return { val: "+5.5%", type: "high" }; // Warning Label Trigger

  return { val: "0.0%", type: "stable" };
};

const BIEngineCore: React.FC<{ data: AppState }> = ({ data }) => {
  const cancelledOrderInvoiceIds = new Set(
    (data?.orders || [])
      .filter(
        (o) =>
          o.status === "cancelled" &&
          o.isConvertedToInvoice &&
          o.linkedInvoiceId,
      )
      .map((o) => o.linkedInvoiceId),
  );
  const activeInvoices = getUnifiedInvoices(data).filter(
    (inv) => !inv.isDeleted && !cancelledOrderInvoiceIds.has(inv.id),
  );
  const paidInvoices = activeInvoices.filter(
    (inv) => (isPaidStatus(inv.paymentStatus) || inv.paymentStatus === undefined) && !String(inv.status).includes('تجميع القطية') && inv.paymentStatus !== 'split_pending' && inv.status !== 'split_pending',
  );
  const totalSales = paidInvoices.reduce(
    (acc, inv) => acc + Math.max(0, computeInvoiceSubtotal(inv, data?.products || [])),
    0,
  );
  const totalCost = paidInvoices.reduce(
    (acc, inv) => acc + computeInvoiceCost(inv, data?.products || []),
    0,
  );
  const profit = totalSales - totalCost;
  const healthScore = totalSales > 0 ? (profit / totalSales) * 100 : 0;

  return (
    <div
      id="bi-engine-core-section"
      className="relative w-full min-h-[400px] md:min-h-[500px] lg:min-h-[650px] py-16 flex items-center justify-center mb-8 lg:mb-16 overflow-hidden rounded-3xl rounded-3xl sm:rounded-2xl bg-slate-950 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-800/20 group"
    >
      {/* Immersive Atmospheric Gradients */}
      <div
        className={cn(
          "absolute inset-0 opacity-40 transition-all duration-500 blur-3xl",
          healthScore > 20
            ? "bg-emerald-500/20"
            : healthScore > 0
              ? "bg-amber-500/20"
              : "bg-rose-500/20",
        )}
      />

      {/* Moving Light Rays */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <motion.div
          animate={{ x: [-500, 500], opacity: [0, 0.2, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 bottom-0 w-64 bg-gradient-to-r from-transparent via-white to-transparent skew-x-12"
        />
      </div>

      {/* Grid structure (Technical Recipe) */}
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="relative flex flex-col items-center">
        {/* The Nuclear Core */}
        <div className="relative w-64 h-64 sm:w-96 sm:h-96 flex items-center justify-center">
          {/* Outer Rotating Orbits */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border border-slate-800 rounded-full border-dashed opacity-50"
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
            className="absolute inset-6 sm:inset-8 border border-slate-700/30 rounded-full"
          />

          {/* Core Visual */}
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-48 h-48 sm:w-72 sm:h-72 relative flex items-center justify-center"
          >
            {/* Plasma Glow */}
            <div
              className={cn(
                "absolute inset-0 rounded-full blur-3xl opacity-30 animate-pulse",
                healthScore > 20 ? "bg-emerald-500" : "bg-amber-500",
              )}
            />

            {/* Inner Mechanical Rings */}
            <div className="absolute inset-2 sm:inset-4 border-[4px] sm:border-8 border-slate-900 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]" />
            <div className="absolute inset-4 sm:inset-6 border-[2px] sm:border-[3px] border-slate-800 rounded-full" />

            {/* The Heart Reactor */}
            <div className="w-32 h-32 sm:w-48 sm:h-48 bg-slate-900 rounded-full border border-slate-700 flex items-center justify-center relative shadow-xl z-10 overflow-hidden translate-z-0">
              {/* Holographic Scanline */}
              <motion.div
                animate={{ y: [-100, 100] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-x-0 h-10 bg-white/5 blur-md pointer-events-none"
              />

              <div className="text-center z-20">
                <motion.div
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 0.1, repeat: Infinity }}
                  className="flex flex-col items-center"
                >
                  <span className="text-3xl md:text-5xl font-mono font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 tracking-tighter leading-none">
                    {Math.round(healthScore)}
                  </span>
                  <span className="text-sm sm:text-xl font-bold text-slate-500 -mt-1">
                    %
                  </span>
                </motion.div>
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase mt-1 sm:mt-2 px-3 sm:px-4 py-1 bg-slate-950 rounded-full border border-slate-800">
                  استقرار النظام
                </p>
              </div>

              {/* Spinning Node Connectors */}
              {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    transform: `rotate(${angle}deg) translate(80px) rotate(-${angle}deg)`,
                  }}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    delay: i * 0.2,
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      healthScore > 20 ? "bg-emerald-400" : "bg-amber-400",
                    )}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Satellite Data Units */}
          <style>{`
 .satellite { --translate-dist: 100px; }
 @media (min-width: 640px) { .satellite { --translate-dist: 180px; } }
 `}</style>
          {[
            {
              icon: <DollarSign />,
              label: "مبيعات",
              color: "text-blue-400",
              angle: 45,
              val: totalSales.toFixed(3),
            },
            {
              icon: <Target />,
              label: "أهداف",
              color: "text-emerald-400",
              angle: 135,
              val: profit.toFixed(3),
            },
            {
              icon: <Activity />,
              label: "نبض",
              color: "text-rose-400",
              angle: 225,
              val: getUnifiedInvoices(data)?.length || 0,
            },
            {
              icon: <Zap />,
              label: "طاقة",
              color: "text-amber-400",
              angle: 315,
              val: "ACTIVE",
            },
          ].map((sat, i) => (
            <motion.div
              key={i}
              className="absolute z-30 satellite"
              style={{
                transform: `rotate(${sat.angle}deg) translate(var(--translate-dist)) rotate(-${sat.angle}deg)`,
              }}
              whileHover={{ scale: 1.2 }}
            >
              <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 p-3 sm:p-3 rounded-2xl sm:rounded-2xl shadow-xl flex flex-col items-center min-w-[70px] sm:min-w-[100px]">
                <div
                  className={cn(
                    "mb-1 sm:mb-2 p-1.5 sm:p-2 rounded-xl bg-white/5",
                    sat.color,
                  )}
                >
                  {React.cloneElement(sat.icon as any, {
                    size: 16,
                    className: "sm:w-5 sm:h-5",
                  })}
                </div>
                <span className="text-[10px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1">
                  {sat.label}
                </span>
                <span className="text-xs sm:text-sm font-bold text-white">
                  {sat.val}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Status Report (Glassmorphism Section) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 sm:mt-12 mx-4 sm:mx-0 w-full max-w-none bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 flex flex-col gap-6 justify-between items-center relative overflow-hidden z-40 mb-8"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent pointer-events-none" />

          <div className="text-center sm:text-right flex-1 min-w-0 order-1 sm:order-2">
            <h3 className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase mb-2 sm:mb-3 flex items-center justify-center sm:justify-end gap-2">
              تحليل الذكاء الفوري
              <Sparkles size={14} className="text-amber-400" />
            </h3>
            <p className="text-white text-sm sm:text-lg lg:text-xl font-bold leading-relaxed sm:leading-tight">
              « النظام في حالة{" "}
              {healthScore > 20 ? "ازدهار قصوى" : "استقرار تشغيلي"}.
              {profit > 0
                ? ` صافي الربح وصل إلى ${profit.toFixed(3)} د.ك بنسبة نجاح ممتازة.`
                : " ينصح بمراجعة التكاليف لرفع الكفاءة."}{" "}
              »
            </p>
          </div>

          <div className="flex flex-row sm:flex-col justify-center sm:justify-start gap-3 w-full shrink-0 order-2 sm:order-1">
            <div className="px-4 py-2 sm:px-5 sm:py-2 bg-emerald-500/20 text-emerald-400 rounded-xl sm:rounded-2xl border border-emerald-500/20 text-[10px] sm:text-[10px] font-bold text-center whitespace-nowrap flex-1 sm:flex-none">
              محرك AI: جاهز
            </div>
            <div className="px-4 py-2 sm:px-5 sm:py-2 bg-blue-500/20 text-blue-400 rounded-xl sm:rounded-2xl border border-blue-500/20 text-[10px] sm:text-[10px] font-bold text-center whitespace-nowrap flex-1 sm:flex-none">
              اتصال البيانات: مستقر
            </div>
          </div>
        </motion.div>
      </div>

      {/* Corner UI Elements (Mission Control Vibe) */}
      <div className="absolute top-3 md:p-4 left-10 flex gap-4">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <div className="text-[10px] font-mono text-slate-600">
          REACTOR_STABLE_V2.6
        </div>
      </div>
      <div className="absolute bottom-10 right-10 flex items-center gap-4">
        <div className="text-[10px] font-mono text-slate-600">
          KUWAIT_REGION_01
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
      </div>
    </div>
  );
};

const BusinessStatusMirror: React.FC<{
  data: AppState;
  setActiveTab: (tab: any) => void;
  setDeepLinkData?: (data: any) => void;
}> = ({ data, setActiveTab, setDeepLinkData }) => {
  const cancelledOrderInvoiceIds = new Set(
    (data?.orders || [])
      .filter(
        (o) =>
          o.status === "cancelled" &&
          o.isConvertedToInvoice &&
          o.linkedInvoiceId,
      )
      .map((o) => o.linkedInvoiceId),
  );
  const activeInvoices = getUnifiedInvoices(data).filter(
    (inv) => !inv.isDeleted && !cancelledOrderInvoiceIds.has(inv.id),
  );
  const paidInvoices = activeInvoices.filter(
    (inv) => (isPaidStatus(inv.paymentStatus) || inv.paymentStatus === undefined) && !String(inv.status).includes('تجميع القطية') && inv.paymentStatus !== 'split_pending' && inv.status !== 'split_pending',
  );
  const totalSales = paidInvoices.reduce(
    (acc, inv) => acc + Math.max(0, computeInvoiceSubtotal(inv, data?.products || [])),
    0,
  );
  const totalCost = paidInvoices.reduce(
    (acc, inv) => acc + computeInvoiceCost(inv, data?.products || []),
    0,
  );
  const profit = totalSales - totalCost;

  const [aiRecommendation, setAiRecommendation] = useState<any>({
    recommendation: "جاري تحليل الأنماط لتوليد توصية مبنية على البيانات...",
    context: "loading",
  });

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        setAiRecommendation(generateAIBusinessRecommendation(data));
      }
    }, 200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [data]);

  return (
    <div className="flex flex-col w-full h-full">
      <motion.div
        whileHover={{ y: -5 }}
        className="relative flex-1 p-3 md:p-6 rounded-3xl md:rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-xl shadow-indigo-500/20 overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 text-right">
          <div className="flex items-center justify-end gap-3 mb-6">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
              الوضع المالي الموحد
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <h4 className="text-2xl md:text-3xl font-bold mb-2 tracking-tighter tabular-nums">
            {totalSales.toFixed(3)}{" "}
            <span className="text-lg opacity-60">د.ك</span>
          </h4>
          <p className="text-white/60 text-sm font-bold italic">
            إجمالي التدفق المالي المسجل في النظام
          </p>

          <div className="mt-10 pt-8 border-t border-white/10 flex justify-between items-end">
            <div className="text-left">
              <span className="block text-[10px] font-bold uppercase opacity-40 mb-1">
                صافي العائد
              </span>
              <span className="text-2xl font-bold text-amber-400">
                %
                {totalSales > 0
                  ? ((profit / totalSales) * 100).toFixed(1)
                  : "0.0"}
              </span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-bold uppercase opacity-40 mb-1">
                الربحية الإجمالية
              </span>
              <span className="text-2xl font-bold">{profit.toFixed(3)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        whileHover={{ y: -5, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          setActiveTab("intelligence");
          if (setDeepLinkData) {
            setDeepLinkData({
              exactId: "intelligence",
              scrollTarget: "strategic-manager-section",
              _t: Date.now(),
            });
          }
        }}
        className="relative p-3 md:p-4 rounded-3xl md:rounded-2xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden group cursor-pointer active:scale-95 transition-all"
      >
        <div className="absolute top-3 md:p-4 left-10 opacity-[0.03] rotate-12 transition-transform duration-1000 group-hover:rotate-45">
          <BrainCircuit size={180} />
        </div>

        <div className="relative z-10 text-right">
          <div className="flex items-center justify-end gap-3 mb-6">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              مستشارك: التاجر العود
            </span>
            <Sparkles size={16} className="text-amber-500" />
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4 justify-end">
              <div className="text-right flex-1">
                <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">
                  {aiRecommendation.title}
                </p>
                <p className="text-slate-800 font-bold text-lg leading-snug">
                  {aiRecommendation.recommendation}
                </p>
                <span className="text-indigo-600 text-xs font-bold uppercase mt-2 block group-hover:translate-x-[-4px] transition-transform">
                  انقر لعرض الاستراتيجية الكاملة
                </span>
              </div>
              <div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                  aiRecommendation.type === "risk"
                    ? "bg-rose-50 text-rose-600"
                    : aiRecommendation.type === "growth"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-indigo-50 text-indigo-600",
                )}
              >
                {aiRecommendation.iconType === "shield" ? (
                  <AlertTriangle size={24} />
                ) : aiRecommendation.iconType === "target" ? (
                  <Target size={24} />
                ) : (
                  <Lightbulb size={24} />
                )}
              </div>
            </div>

            <div className="h-px bg-slate-100 w-full" />

            <div className="flex items-center justify-between">
              <div className="flex -space-x-3 space-x-reverse">
                {[
                  {
                    id: "geo",
                    label: "توسع",
                    section: "geo-heatmap-section",
                    tab: "intelligence",
                  },
                  {
                    id: "vip",
                    label: "VIP",
                    section: "vip-missions-section",
                    tab: "intelligence",
                  },
                  {
                    id: "offers",
                    label: "عروض",
                    section: "smart-offers-section",
                    tab: "intelligence",
                  },
                  {
                    id: "growth",
                    label: "حملات",
                    section: "smart-campaigns",
                    tab: "growth",
                  },
                ].map((opp) => (
                  <button
                    key={opp.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab(opp.tab);
                      if (setDeepLinkData) {
                        setDeepLinkData({
                          exactId: opp.tab,
                          scrollTarget: opp.section,
                          _t: Date.now(),
                        });
                      }
                    }}
                    className="w-11 h-11 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:scale-110 hover:z-20 transition-all cursor-pointer active:scale-95"
                    title={`استكشاف ${opp.label}`}
                  >
                    {opp.label}
                  </button>
                ))}
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                فرص نمو مكتشفة اليوم
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Premium Section Header with Icon
const SectionHeader = ({
  title,
  icon: Icon,
  color = "primary",
  subtitle,
}: {
  title: string;
  icon: any;
  color?: string;
  subtitle?: string;
}) => (
  <div className="flex flex-col mb-6 lg:mb-10 px-2 relative">
    <div className="flex items-center gap-4 lg:gap-5 mb-1">
      <div
        className={cn(
          "p-3 lg:p-3 rounded-[1.25rem] lg:rounded-2xl shadow-xl ring-4 ring-opacity-20 transition-transform hover:scale-110",
          color === "primary"
            ? "bg-amber-500 text-white ring-amber-500 shadow-amber-500/20"
            : color === "indigo"
              ? "bg-indigo-600 text-white ring-indigo-600 shadow-indigo-600/20"
              : color === "emerald"
                ? "bg-emerald-500 text-white ring-emerald-500 shadow-emerald-500/20"
                : "bg-slate-800 text-white ring-slate-800 shadow-slate-800/20",
        )}
      >
        <Icon size={24} className="lg:w-[28px] lg:h-[28px]" strokeWidth={2.5} />
      </div>
      <div>
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tighter text-slate-800">
          {title}
        </h2>
        {subtitle && (
          <p className="text-slate-500 text-xs lg:text-[15px] font-bold mt-1 opacity-60">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  </div>
);


const Dashboard: React.FC<DashboardProps> = React.memo(
  ({
    data: rawData,
    onUpdateData,
    appMode,
    onNavigate,
    defaultTab = "pulse",
    scrollTarget,
    scrollTargetTimestamp,
    setDeepLinkData,
  }) => {
    
    const data = rawData;
  
const [isPending, startTransition] = useTransition();
    const [isExecutiveMode, setIsExecutiveMode] = useState(false);
    const [showSampleDataPrompt, setShowSampleDataPrompt] = useState(false);
    const [showContextualAssist, setShowContextualAssist] = useState(false);
    const [isLoyaltyAnalyzing, setIsLoyaltyAnalyzing] = useState(false);
    const [showLoyaltyResult, setShowLoyaltyResult] = useState(false);
    const [showLocalOnboardingTour, setShowLocalOnboardingTour] = useState(false);
    const [invoiceHintOpen, setInvoiceHintOpen] = useState(false);
    const [localOnboardingStep, setLocalOnboardingStep] = useState(0);
    const [activeAdviceContent, setActiveAdviceContent] = useState<
      string | null
    >(null);
    const [activeTab, setActiveTab] = useState<DashboardTab>(() => {
      const tab = defaultTab as string;
      if (tab === "financial" || tab === "profit-guard" || tab === "financials")
        return "financials";
      if (
        tab === "future" ||
        tab === "ai-learning" ||
        tab === "hidden-risks" ||
        tab === "strategy" ||
        tab === "what-if" ||
        tab === "health" ||
        tab === "intelligence"
      )
        return "intelligence";
      if (tab === "marketing" || tab === "goal" || tab === "growth")
        return "growth";
      if (tab === "customers") return "customers";
      if (tab === "suppliers") return "suppliers";
      if (tab === "loyalty" || tab === "promocodes" || tab === "diwaniya") return tab;
      return "pulse";
    });

    useEffect(() => {
      // Prompt for sample data on local mode if empty & not dismissed
      if (appMode === 'local' && (getUnifiedInvoices(data)?.length === 0 || !getUnifiedInvoices(data)) && (data.products?.length === 0 || !data.products)) {
        if (!sessionStorage.getItem('hideSampleDataPrompt')) {
          setShowSampleDataPrompt(true);
        }
      } else {
        setShowSampleDataPrompt(false);
      }
    }, [appMode, getUnifiedInvoices(data)?.length, data.products?.length]);

    const handleLoadDemoData = React.useCallback(() => {
      const demo = GET_DEMO_DATA();
      onUpdateData(demo);
      setShowSampleDataPrompt(false);
      sessionStorage.setItem('hideSampleDataPrompt', 'true');
      toast.success("تم تحميل البيانات التجريبية بنجاح! 🎉");
    }, [onUpdateData]);

    const handleDismissDemoData = React.useCallback(() => {
      setShowSampleDataPrompt(false);
      sessionStorage.setItem('hideSampleDataPrompt', 'true');
    }, []);

    const localOnboardingSteps = useMemo(() => [
      {
        title: "أهلاً بك في النسخة التجريبية",
        body: "هذه الجولة تظهر في وضع Local فقط ولمرة واحدة. الهدف منها تعريفك بأهم أماكن التحكم بدون التأثير على بياناتك أو منطق النظام.",
        icon: <Sparkles size={20} className="text-amber-500" />,
      },
      {
        title: "النبض التنفيذي",
        body: "هذه هي الصفحة الرئيسية للداش بورد. منها ترجع بسرعة لمتابعة أهم المؤشرات والطلبات والمبيعات.",
        icon: <Activity size={20} className="text-emerald-500" />,
      },
      {
        title: "اسأل واختصر الطريق",
        body: "استخدم Ctrl + K لفتح أداة البحث والتنقل السريع، ثم اختر أي مختبر أو صفحة تريد الوصول إليها مباشرة.",
        icon: <Search size={20} className="text-indigo-500" />,
      },
      {
        title: "وضع القيادة",
        body: "زر وضع القيادة يعطيك عرضاً مركزاً للإدارة السريعة. تقدر تفعله أو تغلقه متى ما احتجت.",
        icon: <ShieldAlert size={20} className="text-amber-500" />,
      },
    ], []);

    useEffect(() => {
      if (appMode !== 'local') return;
      const key = 'adminLocalOnboardingTourSeen.v1';
      if (localStorage.getItem(key) === 'true') return;
      const timer = window.setTimeout(() => {
        setLocalOnboardingStep(0);
        setShowLocalOnboardingTour(true);
      }, 700);
      return () => window.clearTimeout(timer);
    }, [appMode]);

    const finishLocalOnboardingTour = React.useCallback(() => {
      localStorage.setItem('adminLocalOnboardingTourSeen.v1', 'true');
      setShowLocalOnboardingTour(false);
      setLocalOnboardingStep(0);
    }, []);

    useEffect(() => {
      if (defaultTab) {
        const tab = defaultTab as string;
        if (
          tab === "financial" ||
          tab === "profit-guard" ||
          tab === "financials"
        )
          setActiveTab("financials");
        else if (
          tab === "future" ||
          tab === "ai-learning" ||
          tab === "hidden-risks" ||
          tab === "strategy" ||
          tab === "what-if" ||
          tab === "health" ||
          tab === "intelligence"
        )
          setActiveTab("intelligence");
        else if (tab === "marketing" || tab === "goal" || tab === "growth")
          setActiveTab("growth");
        else if (tab === "customers") setActiveTab("customers");
        else if (tab === "suppliers") setActiveTab("suppliers");
        else if (tab === "loyalty" || tab === "promocodes" || tab === "pulse" || tab === "diwaniya")
          setActiveTab(tab as DashboardTab);
      }
    }, [defaultTab, scrollTargetTimestamp]);

    useEffect(() => {
      let tab = defaultTab as string;
      if (tab === "financial" || tab === "profit-guard" || tab === "financials")
        tab = "financials";
      else if (
        tab === "future" ||
        tab === "ai-learning" ||
        tab === "hidden-risks" ||
        tab === "strategy" ||
        tab === "what-if" ||
        tab === "health" ||
        tab === "intelligence"
      )
        tab = "intelligence";
      else if (tab === "marketing" || tab === "goal" || tab === "growth")
        tab = "growth";
      else if (tab === "customers") tab = "customers";
      else if (tab === "suppliers") tab = "suppliers";
      else if (["loyalty", "promocodes", "pulse", "diwaniya"].includes(tab)) {
        // keep as is
      } else {
        tab = "pulse";
      }

      setActiveTab(tab as DashboardTab);
    }, [defaultTab]);

    // Handle deep link scrolling and tab change scrolling
    const previousTabRef = useRef<string>(defaultTab);
    const lastProcessedTimestampRef = useRef<number>(0);

    useEffect(() => {
      let isTargetScroll = false;

      // Check if we need to scroll to a target
      if (
        scrollTarget &&
        scrollTargetTimestamp &&
        scrollTargetTimestamp !== lastProcessedTimestampRef.current
      ) {
        lastProcessedTimestampRef.current = scrollTargetTimestamp;
        isTargetScroll = true;

        const tryScroll = (attempts = 0) => {
          const el = document.getElementById(scrollTarget);
          if (el) {
            // Delay smooth scroll to let UI & Framer Motion animations completely settle
            setTimeout(() => {
              const mainContainer = document.querySelector("main");
              if (mainContainer) {
                const mainRect = mainContainer.getBoundingClientRect();
                const elRect = el.getBoundingClientRect();
                const scrollTop =
                  mainContainer.scrollTop + elRect.top - mainRect.top - 20;

                mainContainer.scrollTo({
                  top: scrollTop,
                  behavior: "smooth",
                });
              } else {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
              }

              // Add subtle highlight
              el.classList.add(
                "ring-4",
                "ring-indigo-500",
                "ring-offset-8",
                "ring-offset-slate-950",
                "transition-all",
                "duration-1000",
                "rounded-2xl",
              );
              setTimeout(() => {
                el.classList.remove(
                  "ring-4",
                  "ring-indigo-500",
                  "ring-offset-8",
                  "ring-offset-slate-950",
                );
              }, 3000);

              // We do NOT call setDeepLinkData to clear it, because that was causing re-renders
              // and jumping back to the top of the page. The scrollTargetTimestamp handles uniqueness.
            }, 400); // 400ms is usually enough for Framer to mount
          } else if (attempts < 20) {
            // Try for 2 seconds max
            setTimeout(() => tryScroll(attempts + 1), 100);
          }
        };

        setTimeout(() => tryScroll(), 50);
      }

      // Only scroll to top if the tab changed AND we aren't handling a targeted deep link
      if (!isTargetScroll && previousTabRef.current !== activeTab) {
        const mainElement = document.querySelector("main");
        if (mainElement) {
          setTimeout(() => {
            mainElement.scrollTo({ top: 0, behavior: "auto" });
          }, 100);
        }
      }

      previousTabRef.current = activeTab;
    }, [activeTab, scrollTarget, scrollTargetTimestamp]);

    const [dateFilter, setDateFilter] = useState<
      "day" | "week" | "month" | "year" | "all"
    >("month");

    // Skip down to render logic for brevity in this chunk
    const [focusedInsight, setFocusedInsight] = useState<AIInsight | null>(
      null,
    );
    const [reviews, setReviews] = useState<any[]>(data?.pulseReviews || []);
    const [pulseArchiveAnalysis, setPulseArchiveAnalysis] = useState<any>(
      data?.pulseArchiveAnalysis || null,
    );
    const [archiveResult, setArchiveResult] = useState<any>(
      data?.deepArchiveAnalysis || null,
    );
    const [pulseAnalysisHistory, setPulseAnalysisHistory] = useState<
      PulseAnalysisRecord[]
    >(data?.pulseAnalysisHistory || []);
    const [showPulseHistory, setShowPulseHistory] = useState(false);

    const [isArchiving, setIsArchiving] = useState(false);
    const [reviewInput, setReviewInput] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [campaignTopic, setCampaignTopic] = useState("");
    const [campaignLoading, setCampaignLoading] = useState(false);
    const [generatedCampaign, setGeneratedCampaign] =
      useState<AICampaign | null>(null);

    useEffect(() => {
      if (data?.pulseReviews && Array.isArray(data.pulseReviews)) {
        let hasUpgradedAny = false;
        const upgraded = data.pulseReviews.map((r) => {
          if (
            (!r.topics || (r.sentiment || "").includes("ملاحظة عامة 📝")) &&
            r.text
          ) {
            const a = analyzeKuwaitiSentiment(r.text);
            if (a.level1 !== "ملاحظة عامة") {
              let icon = "💬";
              if (a.level1 === "إيجابي") icon = "😍";
              else if (a.level1 === "سلبي") icon = "😡";
              else if (a.level1 === "محايد") icon = "😐";
              hasUpgradedAny = true;
              return {
                ...r,
                sentiment: `${a.level1} ${icon}`,
                level1: a.level1,
                topics: a.level2.join("، "),
              };
            }
          }
          return r;
        });

        if (hasUpgradedAny) {
          const timer = setTimeout(() => {
            onUpdateData({ ...data, pulseReviews: upgraded });
          }, 500);
          return () => clearTimeout(timer);
        } else {
          // Direct comparison to avoid JSON.stringify
          if (reviews.length !== upgraded.length) {
            setReviews(upgraded);
          }
        }
      }
    }, [data?.pulseReviews, onUpdateData]);

    // Separate effect for syncing other data to prevent render cycle conflicts
    useEffect(() => {
      if (data?.pulseArchiveAnalysis) {
        setPulseArchiveAnalysis(data.pulseArchiveAnalysis);
      }
      if (data?.pulseAnalysisHistory) {
        setPulseAnalysisHistory(data.pulseAnalysisHistory);
      }
      if (data?.deepArchiveAnalysis) {
        setArchiveResult(data.deepArchiveAnalysis);
      }
    }, [
      data?.pulseArchiveAnalysis,
      data?.pulseAnalysisHistory,
      data?.deepArchiveAnalysis,
    ]);

    const [isPulseAnalyzing, setIsPulseAnalyzing] = useState(false);

    const handleLoyaltyAnalyze = () => {
      setShowLoyaltyResult(true);
    };

    const handleAddReview = async () => {
      if (!reviewInput.trim()) return;
      setIsAnalyzing(true);
      await new Promise((r) => setTimeout(r, 100));

      const analysis = analyzeKuwaitiSentiment(reviewInput);
      let sentimentIcon = "💬";
      if (analysis.level1 === "إيجابي") sentimentIcon = "😍";
      else if (analysis.level1 === "سلبي") sentimentIcon = "😡";
      else if (analysis.level1 === "محايد") sentimentIcon = "😐";

      const displayLabel = `${analysis.level1} ${sentimentIcon}`;
      const topicsLabel = analysis.level2.join("، ");

      const newReview = {
        id: Date.now(),
        text: reviewInput,
        sentiment: displayLabel,
        level1: analysis.level1,
        topics: topicsLabel,
        sentimentLabel: analysis.label,
        sentimentAlert: analysis.alert,
        date: new Date().toLocaleString("en-GB", {
          timeZone: "Asia/Kuwait",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      const updated = [newReview, ...reviews];
      setReviews(updated);
      onUpdateData({ ...data, pulseReviews: updated });
      setReviewInput("");
      toast.success("تم تصنيف النبض وتسجيله", {
        description: `النتيجة السريعة: ${displayLabel} (${topicsLabel})`,
        icon: <Activity className="text-emerald-500" />,
      });
      setIsAnalyzing(false);
    };

    const handleDeleteReview = (id: number) => {
      const updated = reviews.filter((r) => r.id !== id);
      setReviews(updated);
      onUpdateData({ ...data, pulseReviews: updated });
    };

    const handleArchiveAnalysis = () => {
      setIsArchiving(true);

      // Combine both pulse reviews and standard testimonials for a truly comprehensive analysis
      const allTestimonials = [
        ...(Array.isArray(data?.testimonials) ? data.testimonials : []),
        ...reviews,
      ];

      // Use timeout to allow UI to update to loading state
      setTimeout(() => {
        try {
          const result = performArchiveAnalysis({
            ...data,
            testimonials: allTestimonials,
          } as any);
          setArchiveResult(result);
          onUpdateData({ ...data, deepArchiveAnalysis: result });
          setIsArchiving(false);
          toast.success("اكتمل معالجة البيانات", {
            description: "تم مسح كافة البيانات التاريخية واستخراج التقرير.",
          });
        } catch (err) {
          console.error("Archive Analysis Error:", err);
          setIsArchiving(false);
          toast.error("خطأ في التحليل", {
            description: "حدث خطأ غير متوقع أثناء معالجة البيانات.",
          });
        }
      }, 100);
    };

    const activeInvoices = useMemo(() => {
      const cancelledOrderInvoiceIds = new Set(
        (data?.orders || [])
          .filter(
            (o) =>
              o.status === "cancelled" &&
              o.isConvertedToInvoice &&
              o.linkedInvoiceId,
          )
          .map((o) => o.linkedInvoiceId),
      );
      const invs = getUnifiedInvoices(data).filter(
        (inv) => !inv.isDeleted && !cancelledOrderInvoiceIds.has(inv.id),
      );
      if (dateFilter === "all") return invs;

      const now = new Date().getTime();
      const MS_PER_DAY = 86400000;
      const thresholds: Record<string, number> = {
        day: MS_PER_DAY,
        week: 7 * MS_PER_DAY,
        month: 30 * MS_PER_DAY,
        year: 365 * MS_PER_DAY,
      };

      const threshold = thresholds[dateFilter];
      if (!threshold) return invs;

      return invs.filter((inv) => {
        const d = new Date(inv.date).getTime();
        return now - d <= threshold;
      });
    }, [getUnifiedInvoices(data), dateFilter]);

    // Derived Financial Metrics
    const {
      totalSalesVal,
      foodSalesVal,
      totalCostVal,
      totalExpensesVal,
      totalGatewayFees,
      allDeliveryInvoices,
      totalDeliveryRevenue,
      totalDeliveryCost,
      totalDeliveryProfit,
      totalAddonsRevenue,
      netProfit,
      profitMargin,
      customerCount,
      ltv,
      cac,
      ltvCacRatio,
      currentSupplierBalance,
      cashFlowForecast,
      expectedBankBalance,
      allSupplierPayments,
    } = useMemo(() => {
      const invoices = activeInvoices.filter(
        (inv) =>
          (isPaidStatus(inv.paymentStatus) || inv.paymentStatus === undefined) && !String(inv.status).includes('تجميع القطية') && inv.paymentStatus !== 'split_pending' && inv.status !== 'split_pending',
      );


      const getInvoiceAddonsRevenue = (inv: any) => {
        const computed = computeInvoiceAddonsTotal(inv, data?.products || []);
        const fallback = Number(
          (inv as any)?.addonsTotal ??
          (inv as any)?.addOnsTotal ??
          (inv as any)?.extrasTotal ??
          (inv as any)?.addonsRevenue ??
          (inv as any)?.addonsAmount ??
          0,
        ) || 0;
        return Math.max(0, computed || fallback || 0);
      };

      const totalAddonsRevenue = invoices.reduce((acc, inv) => {
          return acc + getInvoiceAddonsRevenue(inv);
      }, 0);


      // Food sales (excluding delivery)
      const foodSales = invoices.reduce(
        (acc, inv) => acc + Math.max(0, computeInvoiceSubtotal(inv, data?.products || [])),
        0,
      );

      // Total delivery fees collected from invoices, regardless of delivery type.
      // The dashboard should show actual delivery income whenever a delivery fee exists.
      const collectedDeliveryFees = invoices.reduce((acc, inv) => {
        const fee = Number(
          (inv as any)?.deliveryFee ??
          (inv as any)?.deliveryPrice ??
          (inv as any)?.deliveryInfo?.finalPrice ??
          (inv as any)?.deliveryInfo?.price ??
          0,
        ) || 0;
        return acc + Math.max(0, fee);
      }, 0);

      const sales = foodSales + collectedDeliveryFees;

      const cost = invoices.reduce((acc, inv) => acc + computeInvoiceCost(inv, data?.products || []), 0);
      const expenses =
        (data?.expenses || []).reduce(
          (acc, exp) => acc + Math.abs(exp.amount || 0),
          0,
        ) || 0;
      const gatewayFees = invoices.reduce(
        (acc, inv) => acc + (inv.gatewayFee || 0),
        0,
      );
      const deliveryInvs = invoices.filter((inv) => inv.deliveryInfo);

      // delRev should match collectedDeliveryFees above
      const delRev = collectedDeliveryFees;

      const delCost = deliveryInvs.reduce(
        (acc, inv) => acc + (inv.deliveryInfo?.cost || 0),
        0,
      );

      const delProfit = deliveryInvs.reduce(
        (acc, inv) => acc + (inv.deliveryInfo?.profit || 0),
        0,
      );

      const netProf =
        invoices.reduce((acc, inv) => acc + computeInvoiceProfit(inv, data?.products || []), 0) - expenses;

      const margin = sales > 0 ? (netProf / sales) * 100 : 0;
      const custCount = (data?.customers || []).length || 1;
      const ltvVal = sales / custCount;
      const cacVal = expenses / custCount;
      const ltvCac = cacVal > 0 ? ltvVal / cacVal : 0;
      const suppBalance = (data?.suppliers || []).reduce(
        (acc, s) => acc + (s.balance || 0),
        0,
      );

      const allSupplierPayments = (data?.supplierTransfers || []).reduce(
        (acc, t) => acc + Math.abs(t.amount || 0),
        0,
      );

      const expectedBankBalance =
        foodSales +
        collectedDeliveryFees -
        expenses -
        allSupplierPayments -
        gatewayFees;

      return {
        totalSalesVal: sales,
        foodSalesVal: foodSales,
        totalCostVal: cost,
        totalExpensesVal: expenses,
        totalGatewayFees: gatewayFees,
        allDeliveryInvoices: deliveryInvs,
        totalDeliveryRevenue: collectedDeliveryFees,
        totalDeliveryCost: delCost,
        totalDeliveryProfit: delProfit,
        totalAddonsRevenue,
        netProfit: netProf,
        profitMargin: margin,
        customerCount: custCount,
        ltv: ltvVal,
        cac: cacVal,
        ltvCacRatio: ltvCac,
        currentSupplierBalance: suppBalance,
        cashFlowForecast: expectedBankBalance,
        expectedBankBalance,
        allSupplierPayments,
      };
    }, [
      activeInvoices,
      data?.expenses,
      data?.customers,
      data?.suppliers,
      data?.supplierTransfers,
    ]);

    // All Active Invoices
    const allInvoices = useMemo(() => {
      return activeInvoices;
    }, [activeInvoices]);

    const productPerformance = useMemo(() => {
      const salesMap: Record<
        string,
        { sold: number; revenue: number; profit: number }
      > = {};
      const paidInvoices = activeInvoices.filter(
        (inv) =>
          (isPaidStatus(inv.paymentStatus) || inv.paymentStatus === undefined) && !String(inv.status).includes('تجميع القطية') && inv.paymentStatus !== 'split_pending' && inv.status !== 'split_pending',
      );
      paidInvoices.forEach((inv) => {
        (inv.items || []).forEach((item) => {
          if (!salesMap[item.productId]) {
            salesMap[item.productId] = { sold: 0, revenue: 0, profit: 0 };
          }
          const qty = item.quantity || 0;
          const perf = salesMap[item.productId];
          perf.sold += qty;
          perf.revenue += (item.priceAtTime || 0) * qty;
          perf.profit +=
            ((item.priceAtTime || 0) - (item.costAtTime || 0)) * qty;
        });
      });
      return salesMap;
    }, [activeInvoices]);

    const topProducts = useMemo(() => {
    const soldMap: Record<string, number> = {};
    
    for (const [pId, perf] of Object.entries(productPerformance) as Array<[string, { sold: number; revenue: number; profit: number }]>) {
       soldMap[pId] = perf.sold || 0;
    }

    const now = new Date().getTime();
    const MS_PER_DAY = 86400000;
    const thresholds: Record<string, number> = {
      day: MS_PER_DAY,
      week: 7 * MS_PER_DAY,
      month: 30 * MS_PER_DAY,
      year: 365 * MS_PER_DAY,
    };
    const threshold = thresholds[dateFilter];

    const completedOrders = (data?.orders || []).filter(o => {
      if (o.isConvertedToInvoice) return false;
      const st1 = String((o as any).paymentStatus || '').toLowerCase();
      const st2 = String(o.status || '').toLowerCase();
      const isPaid = ['paid', 'processed', 'shipped', 'delivered', 'completed', 'success', 'مكتمل', 'تم الدفع', 'تم الدفع وجاري التوصيل', 'مدفوعة', 'مدفوع'].some(s => st1.includes(s) || st2.includes(s));
      if (!isPaid) return false;
      
      if (threshold) {
         const getTimestamp = (obj: any) => {
           if (obj.createdAt && typeof obj.createdAt === 'object' && obj.createdAt.seconds) return obj.createdAt.seconds * 1000;
           if (obj.date) return new Date(obj.date).getTime();
           if (obj.createdAt) return new Date(obj.createdAt).getTime();
           return 0;
         };
         const t = getTimestamp(o);
         if (t === 0 || (now - t > threshold)) return false;
      }
      return true;
    });

    completedOrders.forEach(o => {
      (o.items || []).forEach(item => {
        soldMap[item.productId] = (soldMap[item.productId] || 0) + (Number(item.quantity) || 0);
      });
    });

    return (data?.products || [])
      .map(p => ({
        ...p,
        sold: soldMap[p.id] || 0
      }))
      .filter(p => p.sold > 0 && p.isActive !== false)
      .sort((a,b) => b.sold - a.sold)
      .slice(0, 5);
  }, [data?.products, data?.orders, productPerformance, dateFilter]);

    const profitableProducts = useMemo(() => {
      return (data?.products || [])
        .map((p) => ({
          ...p,
          margin: p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : 0,
          sold: productPerformance[p.id]?.sold || 0,
        }))
        .filter((p) => p.sold > 0)
        .sort((a, b) => b.margin - a.margin)
        .slice(0, 3);
    }, [data?.products, productPerformance]);

    const vipDisengaged = useMemo(() => {
      const fourteenDaysAgo = new Date().getTime() - 14 * 86400000;

      return (data?.customers || [])
        .filter((c) => {
          const lastActive = c.lastActive
            ? new Date(c.lastActive).getTime()
            : 0;
          return lastActive < fourteenDaysAgo && c.totalSpent > 30;
        })
        .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
        .slice(0, 3)
        .map((c) => ({
          ...c,
          daysInactive: Math.floor(
            (new Date().getTime() -
              (c.lastActive
                ? new Date(c.lastActive).getTime()
                : new Date().getTime())) /
              86400000,
          ),
        }));
    }, [data.customers]);

    const topCustomers = useMemo(() => {
      return [...(data?.customers || [])]
        .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
        .slice(0, 5);
    }, [data?.customers]);

    const recentOrders = useMemo(() => {
      const allOrdersOriginal = data?.orders || [];
      const linkedInvoiceIds = new Set(allOrdersOriginal.map(o => o.linkedInvoiceId).filter(Boolean));
      
      const combined = getUnifiedInvoices(data)
        .filter(i => !i.isDeleted && !linkedInvoiceIds.has(i.id))
        .map(i => ({ ...i, _type: i.id?.startsWith('ORD-') ? 'order' : 'invoice' }));
      
      const getTimestamp = (obj: any) => {
        if (obj.createdAt && typeof obj.createdAt === 'object' && obj.createdAt.seconds) return obj.createdAt.seconds * 1000;
        if (obj.updatedAt && typeof obj.updatedAt === 'object' && obj.updatedAt.seconds) return obj.updatedAt.seconds * 1000;
        if (obj.timestamp && typeof obj.timestamp === 'object' && obj.timestamp.seconds) return obj.timestamp.seconds * 1000;
        if (obj.createdAt) {
          const t = new Date(obj.createdAt).getTime();
          if (!isNaN(t)) return t;
        }
        if (obj.updatedAt) {
          const t = new Date(obj.updatedAt).getTime();
          if (!isNaN(t)) return t;
        }
        if (obj.invoiceDate) {
          const t = new Date(obj.invoiceDate).getTime();
          if (!isNaN(t)) return t;
        }
        if (obj.orderDate) {
          const t = new Date(obj.orderDate).getTime();
          if (!isNaN(t)) return t;
        }
        if (obj.date) {
          const t = new Date(obj.date).getTime();
          if (!isNaN(t)) return t;
        }
        return 0;
      };

      return combined
        .sort((a, b) => getTimestamp(b) - getTimestamp(a))
        .slice(0, 10);
    }, [data?.orders, getUnifiedInvoices(data)]);

    const getOrderSubtotal = (order: any) => {
      const amount =
        order.totalAmount || order.total || order.total_amount || 0;
      if (amount > 0) return amount;
      return (order.items || []).reduce((sum: number, item: any) => {
        const p = (data?.products || []).find((prod) => prod.id === item.productId);
        const itemPrice =
          item.priceAtTime !== undefined
            ? item.priceAtTime
            : item.price !== undefined
              ? item.price
              : p?.price || 0;
        return sum + itemPrice * (item.quantity || 0);
      }, 0);
    };

    const getOrderDeliveryFee = (order: any) => {
      const type = order.deliveryType || "company";
      if (type === "free") return 0;
      const addr = order.address;
      const zoneNameStr = addr?.region || order.regionId;
      const zone = (data?.zones || []).find(
        (z) => z.id === order.regionId || z.name === zoneNameStr,
      );
      const dCost = zone ? zone.cost : 1.0;
      if (type === "company" || type === "special") return dCost;
      return zone?.finalPrice !== undefined
        ? zone.finalPrice
        : dCost + (zone?.profit || 0);
    };

    const menuEngineeringMatrix = useMemo(() => {
      const products = (data?.products || []).map((p) => {
        const sold = productPerformance[p.id]?.sold || 0;
        const margin = p.price - p.cost;
        return { ...p, sold, margin };
      });

      if (products.length === 0)
        return { stars: [], plowhorses: [], puzzles: [], dogs: [] };

      const avgSold =
        products.reduce((acc, p) => acc + p.sold, 0) / products.length;
      const avgMargin =
        products.reduce((acc, p) => acc + p.margin, 0) / products.length;

      return {
        stars: products.filter(
          (p) => p.sold >= avgSold && p.margin >= avgMargin,
        ),
        plowhorses: products.filter(
          (p) => p.sold >= avgSold && p.margin < avgMargin,
        ),
        puzzles: products.filter(
          (p) => p.sold < avgSold && p.margin >= avgMargin,
        ),
        dogs: products.filter((p) => p.sold < avgSold && p.margin < avgMargin),
      };
    }, [data?.products, productPerformance]);

    const getProductStats = (productId: string) => {
      const perf = productPerformance[productId];
      return {
        sales: perf?.sold || 0,
        revenue: perf?.revenue || 0,
        profit: perf?.profit || 0,
      };
    };

    const allDashboardTabs = [
      { id: "pulse", label: "النبض التنفيذي", icon: <Activity size={14} /> },
      { id: "orders", label: "طلبات التطبيق", icon: <ShoppingCart size={14} /> },
      {
        id: "financials",
        label: "المالية وحماية الأرباح",
        icon: <DollarSign size={14} />,
      },
      {
        id: "intelligence",
        label: "عقل النظام",
        icon: <BrainCircuit size={14} />,
      },
      {
        id: "customers",
        label: "تحليل العملاء والولاء",
        icon: <Users size={14} />,
      },
      { id: "suppliers", label: "ذكاء الموردين", icon: <Truck size={14} /> },
      { id: "growth", label: "النمو والتسويق", icon: <Target size={14} /> },
      { id: "diwaniya", label: "بطولات الديوانية", icon: <Users size={14} /> },
      { id: "loyalty", label: "الولاء (Loyalty)", icon: <Award size={14} /> },
      {
        id: "promocodes",
        label: "الكوبونات (Coupons)",
        icon: <Tag size={14} />,
      },
    ];

    const tabs = allDashboardTabs;
    const pulseTabConfig = tabs.find((tab) => tab.id === "pulse") || tabs[0];
    const activeTabConfig = tabs.find((tab) => tab.id === activeTab) || pulseTabConfig;
    const compactDropdownTabs = [
      activeTabConfig,
      ...(activeTabConfig.id === "pulse" ? [] : [pulseTabConfig]),
    ].filter(Boolean);

    const bentoCardStyle =
      "bg-[#fdfbf7] p-4 md:p-6 rounded-3xl border border-[#f0e6d2] shadow-[0_4px_20px_-10px_rgba(212,192,152,0.3)] text-right relative overflow-hidden flex flex-col interactive-hover mb-6";
    const glassCardStyle =
      "bg-[#fdfbf7]/80 backdrop-blur-xl border border-white/50 shadow-xl p-3 md:p-4 rounded-2xl text-right relative overflow-hidden flex flex-col text-[#4a3f35] hover:shadow-indigo-500/10 transition-all duration-300 hover:opacity-90";

    const isLoyalty = activeTab === "loyalty";
    const isPromo = activeTab === "promocodes";
    const isIntelligence = activeTab === "intelligence";
    const isPulse = activeTab === "pulse";
    const isFinancials = activeTab === "financials";
    const isGrowth = activeTab === "growth";
    const isSuppliers = activeTab === "suppliers";
    const isCustomers = activeTab === "customers";
    const pendingOrdersCount = useMemo(() => (data.orders || []).filter(o => o.status === 'pending').length, [data.orders]);
    const totalOrdersCount = useMemo(() => data.orders?.length || 0, [data.orders]);

    const QuickActions = () => (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <MagneticButton
          onClick={() => onNavigate!("new-invoice")}
          className="flex flex-col items-center justify-center p-6 bg-rose-600 text-white rounded-2xl shadow-xl shadow-rose-500/20 interactive-hover active:scale-95 group relative overflow-visible"
        >
          <span
            role="button"
            tabIndex={0}
            className="invoice-new-attention group/invoice-hint"
            aria-label="تنبيه فاتورة جديدة"
            aria-expanded={invoiceHintOpen}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setInvoiceHintOpen((value) => !value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setInvoiceHintOpen((value) => !value);
              }
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onBlur={() => window.setTimeout(() => setInvoiceHintOpen(false), 220)}
          >
            <span className="invoice-new-attention-icon">
              <AlertCircle size={14} className="shrink-0" />
            </span>
            <span className={cn('invoice-new-attention-popover', invoiceHintOpen && 'is-visible')}>
              <span className="invoice-new-attention-title">فاتورة جديدة</span>
              <span className="invoice-new-attention-copy">اضغط البطاقة لإنشاء فاتورة وإضافة الطلب بسرعة.</span>
            </span>
          </span>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3 group-hover:rotate-12 transition-transform">
            <Plus size={24} strokeWidth={3} />
          </div>
          <span className="font-bold text-sm">فاتورة جديدة</span>
        </MagneticButton>

        <MagneticButton
          onClick={() => onNavigate!("orders")}
          className="flex flex-col items-center justify-center p-6 bg-slate-800 text-white rounded-2xl shadow-xl shadow-slate-800/20 interactive-hover active:scale-95 group relative"
        >
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-3 group-hover:-rotate-12 transition-transform relative">
            <ShoppingCart size={24} strokeWidth={2} />
            <div className="absolute -top-1.5 -right-1.5 bg-white text-slate-900 text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-800">
              {totalOrdersCount}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-sm">طلبات التطبيق</span>
            {pendingOrdersCount > 0 && (
              <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full mt-1 animate-pulse">
                {pendingOrdersCount} معلق
              </span>
            )}
          </div>
        </MagneticButton>

        <MagneticButton
          onClick={() => onNavigate!("diwaniya")}
          className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-800 to-indigo-900 text-white rounded-2xl shadow-xl shadow-purple-900/20 interactive-hover active:scale-95 group"
        >
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Users size={24} className="text-amber-400" />
          </div>
          <span className="font-bold text-sm">بطولات الديوانية</span>
        </MagneticButton>

        <MagneticButton
          onClick={() => onNavigate!("reports")}
          className="flex flex-col items-center justify-center p-6 bg-white text-slate-800 border-2 border-slate-100 rounded-2xl shadow-sm hover:border-amber-200 transition-all active:scale-95 group"
        >
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <FileText size={24} className="text-amber-500" />
          </div>
          <span className="font-bold text-sm text-slate-600">سجل المبيعات</span>
        </MagneticButton>

        <MagneticButton
          onClick={() => onNavigate!("customers")}
          className="flex flex-col items-center justify-center p-6 bg-white text-slate-800 border-2 border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 transition-all active:scale-95 group"
        >
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 group-hover:rotate-6 transition-transform">
            <User size={24} className="text-blue-500" />
          </div>
          <span className="font-bold text-sm text-slate-600">قائمة العملاء</span>
        </MagneticButton>
      </div>
    );

    const [aiState, setAiState] = useState<{
      insights: any;
      autoStrategies: any[];
      hiddenRisks: any[];
      aiLearningLogs: any[];
      profitInsights: any[];
      supplierNegotiationInsights: any[];
      healthIndex: any;
    }>({
      insights: {
        topRisk: null,
        topOpportunity: null,
        topAction: null,
        allInsights: [],
      },
      autoStrategies: [],
      hiddenRisks: [],
      aiLearningLogs: [],
      profitInsights: [],
      supplierNegotiationInsights: [],
      healthIndex: {
        status: "Healthy" as const,
        score: 100,
        explanation: "",
        factors: [],
        recommendations: [],
      },
    });

    useEffect(() => {
      let isMounted = true;
      const runWorker = () => {
        if (!isMounted) return;

        let nextInsights,
          nextAutoStrategies,
          nextHiddenRisks,
          nextAiLearningLogs,
          nextProfitInsights,
          nextSupplierNegotiationInsights,
          nextHealthIndex;
        try {
          if (isPulse || isCustomers)
            nextInsights = generateBusinessInsights(data);
          if (isGrowth) nextAutoStrategies = generateAutoStrategies(data);
          if (isIntelligence) {
            nextHiddenRisks = generateHiddenRisks(data);
            nextAiLearningLogs = generateAILearningInsights(data);
          }
          if (isFinancials)
            nextProfitInsights = generateRealProfitAnalysis(data);
          if (isSuppliers)
            nextSupplierNegotiationInsights =
              generateSupplierNegotiationAnalysis(data);
          if (isPulse) nextHealthIndex = calculateBusinessHealthIndex(data);
        } catch (e) {}

        setAiState((prev) => {
          let next = { ...prev };
          if (nextInsights !== undefined) next.insights = nextInsights;
          if (nextAutoStrategies !== undefined)
            next.autoStrategies = nextAutoStrategies;
          if (nextHiddenRisks !== undefined) next.hiddenRisks = nextHiddenRisks;
          if (nextAiLearningLogs !== undefined)
            next.aiLearningLogs = nextAiLearningLogs;
          if (nextProfitInsights !== undefined)
            next.profitInsights = nextProfitInsights;
          if (nextSupplierNegotiationInsights !== undefined)
            next.supplierNegotiationInsights = nextSupplierNegotiationInsights;
          if (nextHealthIndex !== undefined) next.healthIndex = nextHealthIndex;
          return next;
        });
      };

      // Defer the heavy AI logic so UI renders instantly
      const timer = setTimeout(runWorker, 100);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }, [
      data,
      isPulse,
      isCustomers,
      isGrowth,
      isIntelligence,
      isFinancials,
      isSuppliers,
    ]);

    const businessInsights = aiState.insights;
    const autoStrategies = aiState.autoStrategies;
    const hiddenRisks = aiState.hiddenRisks;
    const aiLearningLogs = aiState.aiLearningLogs;
    const profitInsights = aiState.profitInsights;
    const supplierNegotiationInsights = aiState.supplierNegotiationInsights;
    const healthIndex = aiState.healthIndex;

    const { topRisk, topOpportunity, topAction, allInsights } =
      businessInsights;

    const generateCampaign = () => {
      if (!campaignTopic) {
        toast.info("يرجى اختيار موضوع", {
          description: "اختر نوع الحملة التي ترغب في توليد محتوى لها.",
        });
        return;
      }
      const campaign = generateStructuredCampaign(data, campaignTopic);

      if (!campaign) {
        toast.error("بيانات غير كافية", {
          description: "لا توجد بيانات مبيعات أو عملاء لابتكار حملة حقيقية.",
        });
        return;
      }

      setGeneratedCampaign(campaign);
      toast.success("تم تشكيل خطة العمل بنجاح بناءً على أرصدتك", {
        icon: <Sparkles className="text-amber-500" />,
      });
    };

    const handleLaunchCampaign = (campaign: AICampaign) => {
      const launchedCampaign = { ...campaign, status: "launched" as const };
      setGeneratedCampaign(launchedCampaign);

      const updatedCampaigns = [...(data.campaigns || []), launchedCampaign];
      onUpdateData({
        ...data,
        campaigns: updatedCampaigns,
      });

      toast.success("تم إطلاق الحملة التسويقية!", {
        description: "تم نقل الحملة إلى الحالة النشطة بنجاح.",
        icon: <Rocket className="text-emerald-500" />,
      });
    };

    const getContextualGreeting = () => {
      const hour = new Date().getHours();
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);
      
      const yesterdayInvoices = activeInvoices.filter(inv => {
        const isPaid = (isPaidStatus(inv.paymentStatus) || inv.paymentStatus === undefined) && !String(inv.status).includes('تجميع القطية') && inv.paymentStatus !== 'split_pending' && inv.status !== 'split_pending';
        if (!isPaid) return false;
        const d = new Date(inv.date).getTime();
        return d >= yesterday.getTime() && d <= yesterdayEnd.getTime();
      });
      const yesterdaySales = yesterdayInvoices.reduce((acc, inv) => acc + computeInvoiceTotal(inv, data?.products || []), 0);

      if (hour >= 5 && hour < 12) {
        if (yesterdaySales > 0) {
          return {
            title: `صباح الخير، مبيعات أمس بلغت ${yesterdaySales.toFixed(3)} د.ك ☀️`,
            sub: "بداية يوم موفق. كل تفاصيل الإيرادات جاهزة.",
          };
        } else {
          return {
            title: "صباح الخير، يوم جديد وفرص جديدة ☀️",
            sub: "بانتظار وصول أول طلبات اليوم. بالتوفيق!",
          };
        }
      } else if (hour >= 12 && hour < 17) {
        return {
          title: "مرحباً، وقت الغداء والتركيز! 🍽️",
          sub: "تتبع حركة المبيعات في فترة الذروة الممتازة",
        };
      } else if (hour >= 17 && hour < 22) {
        return {
          title: "مساء الخير، بيّضت الوجه اليوم.. هذي خلاصة أرباحك. 🌙",
          sub: "يوم حافل بالإنجازات، راجع أهدافك بكل ثقة",
        };
      } else {
        return {
          title: "نظرة هادية على الأرقام.. عساك على القوة! ☕",
          sub: "هدوء الليل أفضل وقت للتخطيط الاستراتيجي",
        };
      }
    };
    
    const getSystemMoodStyles = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        // Morning: Soft, glowing, fresh
        return "from-amber-100/60 via-slate-50/40 to-transparent";
      } else if (hour >= 12 && hour < 17) {
        // Afternoon: Active, bright
        return "from-blue-50/60 via-slate-50/40 to-transparent";
      } else if (hour >= 17 && hour < 20) {
        // Sunset: Warm, relaxing transition
        return "from-orange-50/50 via-slate-50/30 to-transparent";
      } else {
        // Night/Quiet: Deep, minimal, focus
        return "from-indigo-900/10 via-slate-900/5 to-transparent";
      }
    };

    // Force cache invalidation 2
    const isMonthEnd = () => {
      const today = new Date();
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      return today.getDate() >= lastDay - 2; // last 3 days of the month
    };

    const totals = {
      orders: data?.orders?.length || 0,
      revenue: totalSalesVal || 0,
    };

    const nowObj = new Date();
    const todayStart = new Date(nowObj.getFullYear(), nowObj.getMonth(), nowObj.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    
    let tRev = 0;
    let yRev = 0;
    
    getUnifiedInvoices(data)?.forEach(inv => {
      // paymentStatus can be under 'status' in some models
      const status = inv.paymentStatus || (inv as any).status;
      if (status !== 'paid' && status !== 'partial' && status !== 'completed' && inv.paymentStatus !== undefined) return;
      const t = new Date(inv.date).getTime();
      const amount = computeInvoiceTotal(inv, data?.products || []);
      if (t >= todayStart) tRev += amount;
      else if (t >= yesterdayStart && t < todayStart) yRev += amount;
    });

    let rawGrowthText = "لا توجد بيانات كافية لاحتساب النمو مقارنة بالأمس";
    let growthValText = "0%";
    let isGrowthPos = true;

    if (yRev > 0) {
      const g = ((tRev - yRev) / yRev) * 100;
      isGrowthPos = g >= 0;
      growthValText = `${g > 0 ? '+' : ''}${g.toFixed(1)}%`;
      rawGrowthText = g >= 0 
        ? `المبيعات تتجاوز الأمس بـ ${g.toFixed(1)}%` 
        : `المبيعات تتأخر عن الأمس بـ ${Math.abs(g).toFixed(1)}%`;
    } else if (tRev > 0) {
      isGrowthPos = true;
      growthValText = "+100%";
      rawGrowthText = `مبيعات اليوم ${tRev.toFixed(0)} د.ك (لا توجد مبيعات في الأمس)`;
    }

    useEffect(() => {
      // Simulate system 'sensing' user's workflow and offering proactive help based on time
      const timer = setTimeout(() => {
        // Show assistant after a natural delay if there's actionable data
        if (totals.orders > 0 && !isExecutiveMode) {
           setShowContextualAssist(true);
        }
      }, 3500);
      return () => clearTimeout(timer);
    }, [totals.orders, isExecutiveMode]);

    const greeting = getContextualGreeting();
    const systemMoodClass = getSystemMoodStyles();

    return (
      <div className={cn("dashboard w-full pb-32 animate-in fade-in duration-500 relative overflow-visible transition-colors", isExecutiveMode ? "bg-slate-50 min-h-screen" : "")}>
        {/* Dynamic Background Pattern */}
        <div className="absolute -top-32 right-0 left-0 h-[800px] pointer-events-none -z-10 opacity-70 transition-all duration-1000 ease-in-out">
          <div className={cn("absolute inset-0 bg-gradient-to-b transition-colors duration-1000 ease-in-out", systemMoodClass)} />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M30 30L60 0H0z'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* Main Dashboard Header & Navigation */}
        <div
          className="container relative z-40 border-b border-slate-200/60 bg-white/90 backdrop-blur-md py-4 transition-all duration-500"
          dir="rtl"
        >
          {showSampleDataPrompt && (
            <div className="mb-4 bg-indigo-50/80 border border-indigo-100 rounded-xl p-2.5 flex flex-row items-center justify-between gap-3 animate-in slide-in-from-top-4 fade-in duration-500 text-right w-full overflow-hidden relative shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] bg-indigo-500/10 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="flex-1 relative z-10 flex items-center gap-3">
                <div className="bg-indigo-500 text-white p-1.5 rounded-lg shrink-0">
                  <Database size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 leading-tight mb-0.5">النظام فارغ حالياً</h3>
                  <p className="text-slate-600 font-bold text-[10px] leading-relaxed">
                    هل ترغب في تحميل <strong className="text-indigo-700">بيانات تجريبية</strong> لاستكشاف المميزات؟
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 shrink-0 relative z-10 w-auto">
                <button
                  onClick={handleLoadDemoData}
                  className="bg-indigo-600 outline-none text-white font-bold text-[11px] px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-1 hover:scale-[1.02] active:scale-95"
                >
                  <Download size={14} />
                  <span>تحميل</span>
                </button>
                <button
                  onClick={handleDismissDemoData}
                  className="bg-white text-slate-500 outline-none border border-slate-200/60 hover:text-slate-700 hover:bg-slate-50 p-1.5 rounded-md transition-all flex items-center justify-center hover:scale-[1.02] active:scale-95 shrink-0"
                  aria-label="لاحقاً"
                  title="لاحقاً"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          <AnimatePresence>
            {showLocalOnboardingTour && appMode === 'local' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] bg-slate-950/35 backdrop-blur-sm flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ opacity: 0, y: 18, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                  className="w-full max-w-md rounded-[2rem] bg-white shadow-2xl border border-white/70 overflow-hidden text-right"
                  dir="rtl"
                >
                  <div className="relative p-6 bg-gradient-to-br from-white via-amber-50/50 to-slate-50">
                    <div className="absolute -top-16 -left-16 w-40 h-40 bg-amber-300/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-emerald-300/15 rounded-full blur-3xl" />
                    <div className="relative z-10 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-lg border border-slate-100 flex items-center justify-center shrink-0">
                        {localOnboardingSteps[localOnboardingStep]?.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-amber-600 mb-1">الدليل السريع · نسخة Local</p>
                        <h3 className="text-xl font-black text-slate-900 leading-tight">
                          {localOnboardingSteps[localOnboardingStep]?.title}
                        </h3>
                        <p className="mt-3 text-sm font-bold text-slate-600 leading-7">
                          {localOnboardingSteps[localOnboardingStep]?.body}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 pb-6 bg-white">
                    <div className="flex items-center justify-center gap-1.5 mb-5">
                      {localOnboardingSteps.map((_, index) => (
                        <span
                          key={index}
                          className={cn(
                            "h-1.5 rounded-full transition-all",
                            index === localOnboardingStep ? "w-7 bg-slate-900" : "w-1.5 bg-slate-200"
                          )}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={finishLocalOnboardingTour}
                        className="px-4 py-2.5 rounded-xl text-sm font-black text-slate-500 hover:bg-slate-50 transition-colors"
                      >
                        تخطي
                      </button>
                      <div className="flex items-center gap-2">
                        {localOnboardingStep > 0 && (
                          <button
                            type="button"
                            onClick={() => setLocalOnboardingStep((step) => Math.max(0, step - 1))}
                            className="px-4 py-2.5 rounded-xl text-sm font-black bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                          >
                            السابق
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (localOnboardingStep >= localOnboardingSteps.length - 1) {
                              finishLocalOnboardingTour();
                            } else {
                              setLocalOnboardingStep((step) => step + 1);
                            }
                          }}
                          className="px-5 py-2.5 rounded-xl text-sm font-black bg-slate-900 text-white shadow-lg shadow-slate-900/15 hover:scale-[1.02] active:scale-95 transition-transform"
                        >
                          {localOnboardingStep >= localOnboardingSteps.length - 1 ? 'إنهاء' : 'التالي'}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TOP ROW: HEADER */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 text-right">
              <div className="w-10 h-10 rounded-2xl bg-slate-950 text-amber-300 flex items-center justify-center shadow-lg shadow-slate-900/10">
                <Sparkles size={19} />
              </div>
              <div>
                <p className="text-[11px] font-black tracking-[0.18em] text-amber-600 uppercase">اللوحة الرئيسية</p>
                <h1 className="text-lg md:text-2xl font-black text-slate-950 leading-tight">نظرة الإدارة اليوم</h1>
              </div>
            </div>
            
            {/* وضع القيادة تم دمجه داخل مركز القيادة العام حتى لا يتكرر بصرياً */}
          </div>

          {!isExecutiveMode && activeTab !== "pulse" && (
            <div className="mt-4 text-right text-xs font-bold text-slate-400">
              {activeTabConfig?.label}
            </div>
          )}
        </div>

        {/* 4) CONTENT - Full Width */}
        <div
          className={cn(
            "container w-full max-w-none flex flex-col transition-opacity duration-300 relative",
            isPending ? "opacity-50" : "opacity-100",
            isExecutiveMode ? "py-12" : ""
          )}
        >
          <AnimatePresence mode="wait">
            {isExecutiveMode && (
              <motion.div
                key="executive-stats"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full mb-12 p-8 lg:p-12 bg-slate-950 rounded-[48px] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative overflow-hidden"
                dir="rtl"
              >
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
                
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-4 gap-12 items-center">
                  <div className="lg:col-span-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-500/30">
                        <Activity className="text-amber-400" size={20} />
                      </div>
                      <span className="text-amber-500 text-xs font-black uppercase tracking-[0.3em]">Operational Pulse</span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight">
                      {isGrowthPos ? "الأداء اليوم ممتاز." : "أداء اليوم يحتاج انتباه."}
                    </h2>
                    <p className="text-slate-400 font-bold text-lg leading-relaxed">
                      {rawGrowthText}
                    </p>
                  </div>

                  <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Stat 1: Revenue */}
                    <div className="bg-white/5 border border-white/10 p-8 rounded-[32px] backdrop-blur-xl group hover:bg-white/10 transition-all duration-500">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">إجمالي مبيعات اليوم</span>
                      <div className="flex items-baseline gap-3">
                         <span className="text-4xl font-black text-white tabular-nums tracking-tighter">{tRev.toFixed(2)}</span>
                         <span className="text-slate-400 text-sm font-bold">د.ك</span>
                      </div>
                      <div className={cn("mt-4 text-xs font-black inline-flex items-center gap-1 px-3 py-1 rounded-full", isGrowthPos ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                        {isGrowthPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {growthValText} مقارنة بالأمس
                      </div>
                    </div>

                    {/* Stat 2: Orders */}
                    <div className="bg-white/5 border border-white/10 p-8 rounded-[32px] backdrop-blur-xl group hover:bg-white/10 transition-all duration-500">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">طلبات التطبيق المكتملة</span>
                      <div className="flex items-baseline gap-3">
                         <span className="text-4xl font-black text-white tabular-nums tracking-tighter">{totals.orders}</span>
                         <span className="text-slate-400 text-sm font-bold">طلب</span>
                      </div>
                      <div className="mt-4 text-xs font-black inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400">
                        <ShoppingCart size={12} />
                        جميع العمليات مستقرة
                      </div>
                    </div>

                    {/* Stat 3: Efficiency */}
                    <div className="bg-white/5 border border-white/10 p-8 rounded-[32px] backdrop-blur-xl group hover:bg-white/10 transition-all duration-500">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">معدل كفاءة التشغيل</span>
                      <div className="flex items-baseline gap-3">
                         <span className="text-4xl font-black text-white tabular-nums tracking-tighter">98.4</span>
                         <span className="text-slate-400 text-sm font-bold">%</span>
                      </div>
                      <div className="mt-4 text-xs font-black inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                        <Zap size={12} />
                        أعلى من المتوسط بـ 2.1%
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!isExecutiveMode && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="w-full"
              >
                {activeTab === "orders" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <React.Suspense
                    fallback={
                      <div className="h-96 flex items-center justify-center font-bold text-slate-500">
                        جاري تحميل الطلبات...
                      </div>
                    }
                  >
                    <OrderPage
                      data={data}
                      setData={onUpdateData}
                      setCurrentPage={onNavigate!}
                      setDeepLinkData={setDeepLinkData}
                      isPartner={false}
                    />
                  </React.Suspense>
                </div>
              )}

            {activeTab === "financials" && (
              <div className="space-y-8" dir="rtl">
                <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-2xl md:rounded-2xl p-3 md:p-4 shadow-xl relative overflow-hidden flex flex-col items-start">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-indigo-500 to-amber-400" />
                  <div className="absolute top-3 md:p-4 left-10 opacity-10 text-white rotate-12">
                    <DollarSign size={200} />
                  </div>

                  <h2 className="text-2xl md:text-lg md:text-xl font-bold text-white mb-6 relative z-10 flex items-center gap-4">
                    تحليل الربحية الحقيقية{" "}
                    <Activity className="text-emerald-400" />
                  </h2>
                  <p className="text-indigo-100 text-lg font-medium leading-relaxed max-w-2xl relative z-10 mb-8">
                    هل تربح فعلاً؟ أم أنك ترى"وهم الربح"؟ هذا النظام يحلل
                    التكاليف الخفية التي تلتهم أرباحك بصمت: رسوم بوابات الدفع،
                    خسائر التوصيل المجمعة، والهدر التشغيلي الموزع.
                  </p>

                  <div className="flex gap-4 relative z-10">
                    <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-3 border border-white/10">
                      <Percent className="text-emerald-400" size={20} />
                      <span className="text-white font-bold">
                        رصدنا {profitInsights.length} تحليلاً مالياً دقيقاً
                      </span>
                    </div>
                  </div>
                </div>

                <React.Suspense
                  fallback={
                    <div className="h-64 animate-pulse bg-slate-100 rounded-2xl" />
                  }
                >
                  <div id="profit-guard-section">
                    <RealProfitGuard insights={profitInsights} />
                  </div>
                </React.Suspense>

                <React.Suspense
                  fallback={
                    <div className="h-64 animate-pulse bg-slate-100 rounded-2xl" />
                  }
                >
                  <div id="future-forecast-section">
                    <FutureForecast data={data} />
                  </div>
                </React.Suspense>



                {/* Menu Engineering Matrix */}
                {(() => {
                  const productsStats = (data?.products || [])
                    .filter((p) => p.isActive !== false)
                    .map((p) => {
                      const stats = getProductStats(p.id);
                      const margin =
                        (p.price || 0) > 0 ? (p.price - p.cost) / p.price : 0;
                      return {
                        product: p,
                        sales: stats.sales,
                        margin,
                        profit: stats.profit,
                      };
                    })
                    .filter((p) => p.sales > 0);
                  if (productsStats.length < 3) return null;
                  const totalSales = productsStats.reduce(
                    (acc, p) => acc + p.sales,
                    0,
                  );
                  const avgVolume = totalSales / productsStats.length;
                  const avgMargin =
                    productsStats.reduce((acc, p) => acc + p.margin, 0) /
                    productsStats.length;
                  const stars = productsStats.filter(
                    (p) => p.sales >= avgVolume && p.margin >= avgMargin,
                  );
                  const plowhorses = productsStats.filter(
                    (p) => p.sales >= avgVolume && p.margin < avgMargin,
                  );
                  const puzzles = productsStats.filter(
                    (p) => p.sales < avgVolume && p.margin >= avgMargin,
                  );
                  const turtles = productsStats.filter(
                    (p) => p.sales < avgVolume && p.margin < avgMargin,
                  );

                  return (
                    <div
                      id="products-matrix-section"
                      className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-3 md:p-4 shadow-xl relative overflow-hidden"
                      dir="rtl"
                    >
                      <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-l from-[#0f3460] via-[#e94560] to-[#0f3460]" />
                      <h3 className="font-bold text-2xl text-white flex items-center gap-3 mb-6 relative z-10 text-right">
                        مصفوفة هندسة المنيو الذكية{" "}
                        <Layers className="text-[#e94560]" size={24} />
                      </h3>
                      <div className="flex flex-col w-full ">
                        {/* Stars */}
                        <div className="bg-white/5 border border-emerald-500/30 rounded-2xl p-3 md:p-3 relative overflow-hidden group hover:bg-white/10 transition-all">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-emerald-400">
                              <Sparkles
                                size={20}
                                className="group-hover:animate-spin"
                              />
                              <h4 className="font-bold text-lg">
                                النجوم (Stars)
                              </h4>
                            </div>
                            <span className="text-[10px] text-white/50 font-bold bg-white/5 px-2 py-1 rounded-md">
                              حجم مبيعات عالي + ربح عالي
                            </span>
                          </div>
                          <p className="text-xs text-indigo-100/70 leading-relaxed mb-4">
                            حافظ على الترويج لها ولا تغير جودتها، هي مصدر أرباحك
                            الرئيسي وتقود سمعة المطعم.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {stars.slice(0, 5).map((s) => (
                              <span
                                key={s.product.id}
                                className="text-xs font-bold text-white bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/20 shadow-sm"
                              >
                                {s.product.name}
                              </span>
                            ))}
                            {stars.length === 0 && (
                              <span className="text-xs text-white/30 italic">
                                لا توجد أصناف في هذه الفئة حالياً
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Plowhorses */}
                        <div className="bg-white/5 border border-amber-500/30 rounded-2xl p-3 md:p-3 relative overflow-hidden group hover:bg-white/10 transition-all">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-amber-400">
                              <Zap
                                size={20}
                                className="group-hover:-translate-x-1 transition-transform"
                              />
                              <h4 className="font-bold text-lg">
                                أحصنة الحرث (Plowhorses)
                              </h4>
                            </div>
                            <span className="text-[10px] text-white/50 font-bold bg-white/5 px-2 py-1 rounded-md">
                              حجم مبيعات عالي + ربح منخفض
                            </span>
                          </div>
                          <p className="text-xs text-indigo-100/70 leading-relaxed mb-4">
                            منتجات محبوبة لكن أرباحها قليلة. ارفع سعرها تدريجياً
                            أو أعد هندسة المكونات لتقليل تكلفتها.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {plowhorses.slice(0, 5).map((s) => (
                              <span
                                key={s.product.id}
                                className="text-xs font-bold text-white bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/20 shadow-sm"
                              >
                                {s.product.name}
                              </span>
                            ))}
                            {plowhorses.length === 0 && (
                              <span className="text-xs text-white/30 italic">
                                لا توجد أصناف في هذه الفئة حالياً
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className={bentoCardStyle}>
                  <h3 className="font-bold text-xl text-[#4a3f35] mb-6 flex items-center gap-2 justify-end">
                    ربحية الأصناف (الأكثر طلباً){" "}
                    <PieChart size={24} className="text-emerald-500" />
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right min-w-[500px]" dir="rtl">
                      <thead>
                        <tr className="text-[#8c7b68] text-sm border-b border-[#f0e6d2]">
                          <th className="pb-4">المنتج</th>
                          <th className="pb-4 text-center">السعر</th>
                          <th className="pb-4 text-center">التكلفة</th>
                          <th className="pb-4 text-left">الهامش %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#fdfbf7]">
                        {(profitableProducts || []).slice(0, 10).map((p) => (
                          <tr
                            key={p.id}
                            className="group hover:bg-[#f7f2e8] transition-colors"
                          ><td className="py-4 pr-2">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800">
                                  {p.name}
                                </span>
                                <span
                                  className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 rounded-full inline-block w-fit mt-1",
                                    p.price > p.cost * 2
                                      ? "bg-emerald-50 text-emerald-600"
                                      : "bg-slate-100 text-slate-500",
                                  )}
                                >
                                  {p.price > p.cost * 2
                                    ? "هامش مرتفع جداً"
                                    : "هامش اعتيادي"}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 text-center font-bold text-slate-600 font-mono tracking-tight">
                              {p.price.toFixed(3)}
                            </td>
                            <td className="py-4 text-center font-bold text-slate-500 font-mono tracking-tight">
                              {p.cost.toFixed(3)}
                            </td>
                            <td className="py-4 text-left">
                              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-xs">
                                {p.price > 0
                                  ? (
                                      ((p.price - p.cost) / p.price) *
                                      100
                                    ).toFixed(0)
                                  : 0}
                                %
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "suppliers" && (
              <div className="space-y-8" dir="rtl">
                <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-2xl md:rounded-2xl p-3 md:p-4 shadow-xl relative overflow-hidden flex flex-col items-start">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 via-indigo-500 to-amber-400" />
                  <div className="absolute top-3 md:p-4 left-10 opacity-10 text-white rotate-12">
                    <Handshake size={200} />
                  </div>

                  <h2 className="text-2xl md:text-lg md:text-xl font-bold text-white mb-6 relative z-10 flex items-center gap-4">
                    ذكاء مفاوضات الموردين{" "}
                    <ArrowLeftRight className="text-emerald-400" />
                  </h2>
                  <p className="text-indigo-100 text-lg font-medium leading-relaxed max-w-2xl relative z-10 mb-8">
                    يحلل هذا المحرك أنماط التسعير التاريخية لكل مورد، يكتشف
                    الزيادات غير المبررة، ويقترح عليك استراتيجية تفاوض مبنية على
                    الأرقام لتأمين أفضل سعر ممكن.
                  </p>

                  <div className="flex gap-4 relative z-10">
                    <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-3 border border-white/10">
                      <Truck className="text-emerald-400" size={20} />
                      <span className="text-white font-bold">
                        رصدنا {supplierNegotiationInsights.length} فرصة تفاوض
                        ذكية
                      </span>
                    </div>
                  </div>
                </div>

                <React.Suspense
                  fallback={
                    <div className="h-64 animate-pulse bg-slate-100 rounded-2xl" />
                  }
                >
                  <SupplierNegotiator insights={supplierNegotiationInsights} />
                </React.Suspense>

                {hiddenRisks.filter((r) => r.iconType === "supplier").length >
                  0 && (
                  <div className="space-y-6" dir="rtl">
                    <h3 className="text-2xl font-bold text-slate-800 text-right pr-6">
                      تنبيهات مخاطر وتحديات التوريد
                    </h3>
                    {hiddenRisks
                      .filter((r) => r.iconType === "supplier")
                      .map((risk, i) => {
                        const colorClasses =
                          risk.impactLevel === "high"
                            ? "bg-red-50 border-red-200 text-red-900"
                            : "bg-amber-50 border-amber-200 text-amber-900";
                        return (
                          <div
                            key={risk.id}
                            className={cn(
                              "p-3 md:p-4 rounded-2xl border shadow-sm",
                              colorClasses,
                            )}
                          >
                            <h4 className="text-lg font-bold">{risk.title}</h4>
                            <p className="text-sm font-bold mt-2">
                              {risk.explanation}
                            </p>
                            <p className="text-[11px] mt-2 opacity-80">
                              {risk.recommendedAction}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                )}

                <div
                  className={cn(
                    bentoCardStyle,
                    "bg-white border-indigo-100 shadow-xl",
                  )}
                >
                  <div className="flex justify-between items-center mb-8 flex-row-reverse">
                    <div className="text-right">
                      <h3 className="font-bold text-2xl text-slate-800 flex items-center gap-3 justify-end">
                        رادار الموردين الذكي
                        <button
                          onClick={() =>
                            toast.info("جاري فحص جميع مسارات التوريد...", {
                              icon: "📡",
                            })
                          }
                          className="hover:scale-110 active:scale-95 transition-transform"
                        >
                          <Truck
                            className="text-indigo-600 pointer-events-none"
                            size={32}
                          />
                        </button>
                      </h3>
                      <p className="text-[10px] text-slate-500 font-bold mt-1">
                        المقارنة اللحظية لأسعار التوريد والالتزامات المالية
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        toast.info(
                          "الرادار متصل اللحظة ويعمل بالخلفية لجمع البيانات",
                          { icon: "⚡" },
                        )
                      }
                      className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-2 rounded-2xl animate-pulse hover:animate-none hover:scale-110 active:scale-95 transition-all cursor-pointer"
                    >
                      <Activity className="pointer-events-none" size={24} />
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50/50 p-2">
                    <table className="w-full text-right min-w-[500px]" dir="rtl">
                      <thead className="text-[12px] font-bold text-slate-500 uppercase">
                        <tr>
                          <th className="p-3 md:p-4">بيانات المورد</th>
                          <th className="p-3 md:p-4 text-center">مؤشر السعر</th>
                          <th className="p-3 md:p-4 text-center">
                            تنبؤ المخاطر
                          </th>
                          <th className="p-3 md:p-4 text-left">
                            المركز المالي
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white rounded-2xl overflow-hidden">
                        {(data?.suppliers || []).slice(0, 5).map((s) => {
                          const indicator = getSupplierPriceIndicator(s);
                          const isHigh = indicator.type === "high";
                          const isLow = indicator.type === "low";

                          return (
                            <tr
                              key={s.id}
                              className="hover:bg-slate-50/80 transition-all group"
                            ><td className="p-3 md:p-4">
                                <div className="flex items-center gap-4 flex-row-reverse">
                                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold text-xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner border border-indigo-100">
                                    <Truck size={24} className="opacity-80" />
                                  </div>
                                  <div className="flex flex-col text-right">
                                    <div className="flex items-center gap-2 flex-row-reverse">
                                      <span className="font-bold text-lg text-[#4a3f35]">
                                        {s.name}
                                      </span>
                                      {isLow && (
                                        <div className="flex items-center justify-center w-5 h-5 bg-emerald-500/10 rounded-full border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 md:p-4 text-center">
                                <div
                                  className={cn(
                                    "inline-flex items-center gap-1 font-bold text-base px-4 py-2 rounded-xl",
                                    isHigh
                                      ? "text-rose-600 bg-rose-50"
                                      : isLow
                                        ? "text-emerald-600 bg-emerald-50"
                                        : "text-slate-500 bg-slate-50",
                                  )}
                                >
                                  {indicator.val}
                                </div>
                              </td>
                              <td className="p-3 md:p-4 text-center">
                                <div
                                  className={cn(
                                    "text-[11px] font-bold px-5 py-2.5 rounded-full border shadow-sm inline-block",
                                    isHigh
                                      ? "bg-rose-50 text-rose-700 border-rose-100"
                                      : isLow
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                        : "bg-slate-50 text-slate-500 border-slate-200/60",
                                  )}
                                >
                                  {isHigh
                                    ? "مخاطرة سبر تكلفة"
                                    : isLow
                                      ? "منافس جداً 🏆"
                                      : "مستقر"}
                                </div>
                              </td>
                              <td className="p-3 md:p-4 text-left">
                                <div className="flex flex-col items-start gap-1">
                                  <span className="font-bold text-lg text-slate-800">
                                    {Number(s.balance).toFixed(3)} د.ك
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                                    إجمالي مستحقات
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-8 bg-indigo-50 border border-indigo-100 p-3 md:p-4 rounded-2xl flex items-center justify-between flex-row-reverse">
                    <div className="flex items-center gap-4 flex-row-reverse">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
                        <Cpu size={20} />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-indigo-900">
                          نصيحة المشتريات الذكية
                        </p>
                        <p className="text-[10px] text-indigo-700 font-bold mt-0.5">
                          بناءً على مشترياتك، فإن التركيز على الموردين أصحاب
                          العلامة الخضراء قد يوفر لك{" "}
                          {Math.max(
                            50,
                            (data?.suppliers || []).reduce(
                              (acc, s) => acc + (Number(s.balance) || 0),
                              0,
                            ) * 0.08,
                          ).toFixed(3)}{" "}
                          د.ك شهرياً.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate("suppliers")}
                      className="text-xs font-bold text-indigo-600 border-b-2 border-indigo-200 hover:text-indigo-800 transition-colors"
                    >
                      فتح سجل الطلبات
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "intelligence" && (
                <div className="space-y-8 md:space-y-12 max-w-[1850px] mx-auto px-3 sm:px-5 md:px-8 xl:px-12 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 w-full pb-20 overflow-x-hidden" dir="rtl">
                  
                  {/* Dashboard - AI Lab Intro - Re-styled for premium feel */}
                  <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-5 md:gap-8 pt-5 md:pt-10 border-b border-slate-200 pb-6 md:pb-10 min-w-0">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
                        <span className="text-xs font-black text-indigo-600 uppercase tracking-[0.4em]">Strategic Intelligence Laboratory</span>
                      </div>
                      <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">
                        مختبر الذكاء الاصطناعي
                      </h1>
                      <p className="text-slate-500 font-bold text-sm md:text-lg max-w-2xl">المركز الاستراتيجي لاتخاذ القرارات وتحسين كفاءة المطبخ.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-4 bg-slate-50 p-1.5 rounded-3xl border border-slate-200 shadow-inner self-stretch lg:self-auto w-full lg:w-auto min-w-0">
                      <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center min-w-[120px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">قوة المعالجة</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-indigo-600 tabular-nums font-mono">98.4</span>
                          <span className="text-xs font-bold text-slate-400 font-mono">%</span>
                        </div>
                      </div>
                      <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center min-w-[120px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">دقة المحاكاة</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-emerald-600 tabular-nums font-mono">94</span>
                          <span className="text-xs font-bold text-slate-400 font-mono">%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phase 1: High-Performance Analytics Core */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 md:gap-8 xl:gap-10 items-stretch w-full min-w-0">
                    <div className="xl:col-span-8 group">
                      <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                        <BIEngineCore data={data} />
                      </div>
                    </div>
                    <div className="xl:col-span-4 h-full">
                      <div id="status-mirror-section" className="h-full">
                        <BusinessStatusMirror
                          data={data}
                          setActiveTab={setActiveTab}
                          setDeepLinkData={setDeepLinkData}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phase 2: Tactical Simulator - Re-organized for Desktop Presence */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 md:gap-8 xl:gap-10 w-full items-start min-w-0">
                    {/* Main Simulator - Now Primary on Desktop */}
                    <div className="xl:col-span-8 flex flex-col h-full order-1 lg:order-2">
                      <div id="what-if-section" className="bg-white rounded-[40px] p-2 border-2 border-slate-100 overflow-hidden shadow-[0_30px_70px_-20px_rgba(0,0,0,0.1)] flex-grow hover:shadow-[0_45px_100px_-25px_rgba(0,0,0,0.15)] transition-all duration-700">
                        <div className="p-4 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-6 bg-slate-50/30 min-w-0">
                          <div className="flex items-center gap-5">
                             <div className="w-16 h-16 bg-slate-900 rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-slate-900/20 group hover:rotate-12 transition-transform duration-500">
                                <Rocket size={28} className="group-hover:translate-y-[-2px] transition-transform" />
                             </div>
                             <div>
                               <h3 className="font-black text-xl md:text-3xl text-slate-900 tracking-tighter break-words">محاكي القرارات الافتراضي</h3>
                               <p className="text-[10px] md:text-xs text-slate-500 font-bold mt-1 uppercase tracking-wide md:tracking-[0.2em] break-words">Quantum-Probabilistic Scenario Mapping</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="flex -space-x-2 space-x-reverse">
                               <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-100" />
                               <div className="w-8 h-8 rounded-full border-2 border-white bg-rose-100" />
                               <div className="w-8 h-8 rounded-full border-2 border-white bg-emerald-100" />
                             </div>
                             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">AI Powered Analytics</div>
                          </div>
                        </div>
                        <div className="p-4 h-full">
                          <React.Suspense fallback={<div className="h-96 animate-pulse bg-slate-100 min-h-[500px]" />}>
                            <WhatIfSimulator data={data} onUpdateData={onUpdateData} />
                          </React.Suspense>
                        </div>
                      </div>
                    </div>

                    {/* Sidebar tools - Map is taller and smarter */}
                    <div className="xl:col-span-4 space-y-10 order-2 lg:order-1 flex flex-col">
                       <div id="geo-heatmap-section" className="bg-slate-900 rounded-[32px] p-1 border border-slate-800 overflow-hidden shadow-2xl group transition-all duration-500 h-full flex flex-col min-h-[500px]">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                          <div className="flex items-center gap-3">
                             <div className="p-2.5 bg-amber-500/10 rounded-xl">
                              <MapPin size={20} className="text-amber-500" />
                             </div>
                             <span className="font-black text-white text-lg tracking-tight">خريطة النبض الجغرافي</span>
                          </div>
                          <div className="px-3 py-1 bg-amber-500/20 text-amber-500 text-[10px] font-black rounded-full border border-amber-500/30 uppercase tracking-widest">Geo Intel</div>
                        </div>
                        <div className="p-2 flex-grow">
                          <React.Suspense fallback={<div className="h-64 animate-pulse bg-slate-800 rounded-2xl" />}>
                            <div className="h-full min-h-[500px] rounded-2xl overflow-visible ring-1 ring-white/10">
                              <GeoHeatmap data={data} />
                            </div>
                          </React.Suspense>
                        </div>
                        <div className="p-5 bg-white/[0.03] text-[10px] font-bold text-slate-500 text-center uppercase tracking-[0.3em]">تحليل جغرافي مباشر مدعوم ببيانات توصيل الكويت</div>
                      </div>

                      <div id="smart-offers-section" className="bg-white rounded-[32px] p-1 border border-slate-200 overflow-hidden shadow-xl group hover:border-indigo-500/30 transition-all duration-500">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                          <div className="flex items-center gap-3">
                             <div className="p-2.5 bg-indigo-50 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                              <Calculator size={20} className="text-indigo-600 group-hover:text-white" />
                             </div>
                             <span className="font-black text-slate-900 text-lg tracking-tight">حاسبة العروض الذكية</span>
                          </div>
                        </div>
                        <div className="p-2">
                          <React.Suspense fallback={<div className="h-64 animate-pulse bg-slate-100 rounded-2xl md:min-h-[300px]" />}>
                            <SmartOffersCalculator data={data} />
                          </React.Suspense>
                        </div>
                      </div>
                    </div>
                  </div>

                      {/* Phase 2.5: VIP Missions Protocol */}
                      <div id="vip-missions-section" className="bg-white rounded-[40px] p-2 border-2 border-slate-100 overflow-hidden shadow-[0_30px_70px_-20px_rgba(0,0,0,0.1)] group hover:border-indigo-500/30 transition-all duration-700">
                        <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 bg-indigo-50/30">
                          <div className="flex items-center gap-5 text-right w-full">
                             <div className="w-16 h-16 bg-rose-600 rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-rose-600/20 group-hover:scale-110 transition-transform duration-500">
                                <Award size={28} />
                             </div>
                             <div>
                               <h3 className="font-black text-xl md:text-3xl text-slate-900 tracking-tighter break-words">مهام كبار العملاء (VIP)</h3>
                               <p className="text-[10px] md:text-xs text-slate-500 font-bold mt-1 uppercase tracking-wide md:tracking-[0.2em] break-words">Tier-1 Retention & Loyalty Optimization</p>
                             </div>
                          </div>
                        </div>
                        <div className="p-4 md:p-8">
                          <React.Suspense fallback={<div className="h-96 animate-pulse bg-slate-100 rounded-2xl" />}>
                            <VIPMissions data={data} />
                          </React.Suspense>
                        </div>
                      </div>

                      {/* Phase 3: Self-Learning Brain Cluster - The Grand Command Center */}
                  <div className="pt-16 border-t-4 border-slate-200/60 border-double">
                    <div className="space-y-12">
                      {/* Brand Header: Self-Learning Brain Cluster */}
                      <div className="bg-slate-950 rounded-[40px] p-6 lg:p-16 shadow-[0_40px_100px_-20px_rgba(15,23,42,0.4)] relative overflow-hidden border border-slate-800">
                        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-indigo-500 via-rose-500 to-indigo-500" />
                        <div className="absolute -top-20 -left-20 opacity-[0.05] text-indigo-400 rotate-12 pointer-events-none">
                          <BrainCircuit size={500} />
                        </div>
                        <div className="absolute -bottom-40 -right-40 opacity-[0.03] text-rose-400 -rotate-12 pointer-events-none">
                          <Zap size={600} />
                        </div>

                        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-12">
                          <div className="max-w-4xl">
                            <div className="flex items-center gap-4 lg:gap-6 mb-6 lg:mb-10">
                              <div className="bg-rose-500 p-4 lg:p-6 rounded-[24px] shadow-[0_0_50px_rgba(244,63,94,0.4)] animate-pulse">
                                <BrainCircuit className="text-white w-8 h-8 lg:w-12 lg:h-12" />
                              </div>
                              <div>
                                <h2 className="text-3xl sm:text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none mb-2 md:mb-4">
                                  عقل النظام ذاتي التعلم
                                </h2>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                  <span className="text-emerald-400 text-xs md:text-sm font-bold uppercase tracking-[0.3em]">Core Intelligence Active</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-slate-400 font-bold text-base md:text-xl lg:text-3xl max-w-4xl leading-relaxed lg:leading-[1.4]">
                              محرك التفكير المركزي الذي يراقب صحة عملك بشكل آلي، يكتشف الأنماط الخفية، ويقوم بتصحيح مساره ذاتياً ليصبح أكثر دقة مع كل قرار يتخذه.
                            </p>
                          </div>
                          
                          <div className="bg-white/[0.03] backdrop-blur-3xl px-8 lg:px-16 py-10 rounded-[32px] border border-white/10 shadow-2xl flex flex-col items-center text-center gap-6 group hover:border-indigo-500/50 transition-all duration-700">
                             <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-indigo-500/10 flex items-center justify-center border-4 border-indigo-500/20 group-hover:scale-110 transition-transform duration-700 relative">
                                <History className="text-indigo-400 w-12 h-12 lg:w-16 lg:h-16" />
                                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/40 border-t-transparent animate-spin" style={{ animationDuration: '3s' }} />
                             </div>
                             <div>
                               <div className="text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-[0.4em] mb-2">ذاكرة النظام المتراكمة</div>
                               <div className="text-4xl lg:text-6xl font-black text-white tabular-nums tracking-tighter">{aiLearningLogs.length} دراسة</div>
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* Tactical Components Center - Fully Stacked and Full Width for Premium Feel */}
                      <div className="flex flex-col gap-12 w-full p-2 md:p-0">
                        {/* 1. Processing Speed (Ultra Wide) */}
                        <div className="bg-slate-900 rounded-[48px] p-12 border border-white/10 flex flex-col items-center justify-center text-center group hover:bg-slate-800 transition-all duration-700 shadow-2xl min-h-[350px] relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
                          <div className="w-20 h-20 bg-indigo-500/20 rounded-[32px] flex items-center justify-center mb-8 border border-indigo-500/30">
                             <Zap className="text-indigo-400" size={40} />
                          </div>
                          <span className="text-sm font-black text-slate-500 uppercase tracking-[0.4em] mb-4">قوة المعالجة اللحظية</span>
                          <span className="text-7xl lg:text-9xl font-black text-white tabular-nums tracking-tighter">0.02s</span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                          {/* 2. Health Score */}
                          <div className="bg-white rounded-[48px] border border-slate-200/60 overflow-hidden group hover:border-emerald-400 transition-all shadow-sm hover:shadow-3xl hover:-translate-y-2 duration-700 flex flex-col min-h-[600px]">
                            <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 group-hover:bg-emerald-50 transition-colors">
                              <div className="flex items-center gap-6">
                                <div className="p-5 bg-emerald-50 rounded-[24px] shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                                  <Activity size={32} />
                                </div>
                                <span className="text-2xl font-black text-slate-800 uppercase tracking-widest">معدل الصحة العامة</span>
                              </div>
                              <div className="w-4 h-4 rounded-full bg-emerald-500 animate-ping" />
                            </div>
                            <div className="p-10 flex-grow overflow-auto">
                              <BusinessHealthFeature data={data} />
                            </div>
                          </div>

                          {/* 3. Profit Guard */}
                          <div className="bg-white rounded-[48px] border border-slate-200/60 overflow-hidden group hover:border-rose-400 transition-all shadow-sm hover:shadow-3xl hover:-translate-y-2 duration-700 flex flex-col min-h-[600px]">
                            <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 group-hover:bg-rose-50 transition-colors">
                              <div className="flex items-center gap-6">
                                <div className="p-5 bg-rose-50 rounded-[24px] shadow-sm group-hover:bg-rose-500 group-hover:text-white transition-all duration-500">
                                  <ShieldAlert size={32} />
                                </div>
                                <span className="text-2xl font-black text-slate-800 uppercase tracking-widest">حارس الأرباح المتقدم</span>
                              </div>
                              <div className="w-4 h-4 rounded-full bg-rose-500 animate-ping" />
                            </div>
                            <div className="p-10 flex-grow overflow-auto">
                              <ProfitGuardFeature data={data} />
                            </div>
                          </div>
                        </div>

                        {/* 4. Supplier Intel (Full Width) */}
                        <div className="bg-white rounded-[48px] border border-slate-200/60 overflow-hidden group hover:border-amber-400 transition-all shadow-sm hover:shadow-3xl hover:-translate-y-2 duration-700 flex flex-col min-h-[600px]">
                          <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 group-hover:bg-amber-50 transition-colors">
                            <div className="flex items-center gap-6">
                              <div className="p-5 bg-amber-50 rounded-[24px] shadow-sm group-hover:bg-amber-500 group-hover:text-white transition-all duration-500">
                                <Handshake size={32} />
                              </div>
                              <span className="text-2xl font-black text-slate-800 uppercase tracking-widest">تحليل ذكاء الموردين</span>
                            </div>
                            <div className="w-4 h-4 rounded-full bg-amber-500 animate-ping" />
                          </div>
                          <div className="p-10 flex-grow overflow-auto">
                            <SupplierNegotiatorFeature data={data} />
                          </div>
                        </div>

                        {/* 5. Action Plan (Hero sized) */}
                        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 rounded-[48px] p-12 border border-white/10 shadow-3xl relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-700 min-h-[500px] flex flex-col justify-center text-center">
                          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
                          <div className="absolute -bottom-20 -right-20 opacity-10 text-white rotate-12 group-hover:scale-110 transition-transform duration-1000">
                             <Briefcase size={300} />
                          </div>
                          <div className="relative z-10 space-y-12 max-w-5xl mx-auto w-full">
                             <div className="flex flex-col items-center gap-8">
                               <div className="w-24 h-24 bg-indigo-500/20 rounded-[32px] flex items-center justify-center border border-indigo-500/30 shadow-2xl shadow-indigo-500/20">
                                 <Zap className="text-indigo-400" size={48} />
                               </div>
                               <h4 className="font-black text-white text-5xl lg:text-8xl tracking-tighter">خطة عمل التحسين الفوري</h4>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                               <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[40px] flex flex-col items-center justify-center gap-6 group/item hover:bg-white/10 transition-all">
                                  <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center shadow-2xl shadow-amber-500/20">
                                    <CheckCircle2 className="text-white" size={32} />
                                  </div>
                                  <p className="text-white text-2xl font-black leading-tight">راجع تكاليف التشغيل المخفية.</p>
                               </div>
                               <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[40px] flex flex-col items-center justify-center gap-6 group/item hover:bg-white/10 transition-all">
                                  <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/20">
                                    <CheckCircle2 className="text-white" size={32} />
                                  </div>
                                  <p className="text-white text-2xl font-black leading-tight">قم بتفعيل حملة إعادة استهداف للعملاء المنقطعين.</p>
                               </div>
                             </div>

                             <p className="text-indigo-200/80 text-xl lg:text-2xl font-bold leading-relaxed max-w-3xl mx-auto">بناءً على النبض الحالي للموردين والمبيعات، تم توليد {autoStrategies.length} استراتيجيات فورية متاحة للتطبيق الآن.</p>
                             
                             <button 
                               onClick={() => {
                                 const element = document.getElementById('strategic-manager-section');
                                 if (element) element.scrollIntoView({ behavior: 'smooth' });
                               }}
                               className="w-full max-w-xl mx-auto py-10 bg-indigo-600 hover:bg-indigo-500 text-white text-2xl font-black uppercase tracking-widest rounded-[32px] transition-all active:scale-95 shadow-2xl shadow-indigo-600/40"
                             >
                               إطلاق خطوات التنفيذ الفوري
                             </button>
                          </div>
                        </div>
                      </div>

                      {/* Learning Logs Section - Modern Grid */}
                      <div className="space-y-10 bg-slate-100/50 p-6 lg:p-14 rounded-[48px] border border-slate-200/60 shadow-inner">
                         <div className="flex flex-col md:flex-row items-center justify-between px-4 gap-8">
                            <div className="flex items-center gap-6">
                              <div className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center shadow-2xl shadow-indigo-400/40 shrink-0">
                                <RefreshCcw className="text-white animate-spin w-8 h-8" style={{ animationDuration: '6s' }} />
                              </div>
                              <div>
                                <h3 className="font-black text-3xl lg:text-5xl text-slate-900 tracking-tighter">سجل التطور الذاتي</h3>
                                <p className="text-slate-500 text-sm lg:text-xl font-bold mt-2">توثيق رحلة نضج الخوارزميات من البيانات الخام إلى الذكاء التشغيلي</p>
                              </div>
                            </div>
                            <div className="bg-white text-indigo-600 px-8 py-4 rounded-[40px] text-lg font-black border border-indigo-100 shadow-xl shadow-indigo-100/50 whitespace-nowrap">
                              تحديث لحظي نشط
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {aiLearningLogs.length > 0 ? (
                            aiLearningLogs.map((log, i) => (
                              <motion.div
                                key={log.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ delay: i * 0.1, duration: 0.8, ease: "easeOut" }}
                                className="bg-white p-8 lg:p-12 rounded-[40px] border border-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col group hover:shadow-2xl transition-all duration-700 hover:-translate-y-2 border-b-[8px] border-b-indigo-500/10 hover:border-b-indigo-500"
                              >
                                {/* Accuracy Badge */}
                                <div className="absolute top-8 left-8">
                                  {log.isAccurate ? (
                                    <div className="bg-emerald-50 text-emerald-600 text-xs font-black px-5 py-2.5 rounded-2xl border border-emerald-100 flex items-center gap-2 uppercase tracking-widest shadow-sm">
                                      <CheckCircle2 size={16} /> توقع ناجح
                                    </div>
                                  ) : (
                                    <div className="bg-amber-50 text-amber-600 text-xs font-black px-5 py-2.5 rounded-2xl border border-amber-100 flex items-center gap-2 uppercase tracking-widest shadow-sm">
                                      <Zap size={16} /> تحديث المنهجية
                                    </div>
                                  )}
                                </div>

                                <div className="mt-12 mb-8">
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-4">الفرضية والنمط المكتشف:</div>
                                  <h4 className="text-2xl lg:text-3xl font-black text-slate-900 leading-[1.2] group-hover:text-indigo-600 transition-colors duration-500">
                                    {log.prediction}
                                  </h4>
                                </div>

                                <div className="space-y-5">
                                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 group-hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block">القرار التشغيلي المتخذ:</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-700 leading-relaxed">{log.actionTaken}</p>
                                  </div>

                                  <div className={cn(
                                    "p-5 rounded-2xl border flex items-start gap-5",
                                    log.isAccurate ? "bg-emerald-50/50 border-emerald-100" : "bg-amber-50/50 border-amber-100"
                                  )}>
                                    <div className={cn(
                                      "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                                      log.isAccurate ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                                    )}>
                                      {log.isAccurate ? <Target size={20} /> : <RefreshCw size={20} />}
                                    </div>
                                    <div className="flex-1">
                                      <span className={cn(
                                        "text-[10px] font-bold uppercase tracking-widest block mb-1.5",
                                        log.isAccurate ? "text-emerald-600" : "text-amber-600"
                                      )}>النتيجة الفعلية المرصودة:</span>
                                      <p className="text-sm font-bold text-slate-800 leading-snug">{log.realResult}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-slate-900 text-white p-7 rounded-3xl mt-auto relative overflow-hidden group/brain shadow-xl">
                                  <div className="absolute top-0 right-0 w-full h-full bg-indigo-500/10 opacity-0 group-hover/brain:opacity-100 transition-opacity" />
                                  <div className="absolute top-0 right-0 w-2 h-full bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.6)]" />
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="p-1.5 bg-rose-500/20 rounded-lg border border-rose-500/20">
                                      <Cpu size={16} className="text-rose-400 animate-pulse" />
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.25em]">تعديل الوزن الخوارزمي في الوقت الحقيقي:</span>
                                  </div>
                                  <p className="text-sm font-bold text-slate-100 leading-relaxed pr-2">
                                    {log.correction}
                                  </p>
                                </div>
                              </motion.div>
                            ))
                          ) : (
                            <div className="col-span-1 lg:col-span-2 bg-white/50 border-4 border-dashed border-slate-200/60 rounded-3xl lg:rounded-2xl p-6 md:p-12 lg:p-24 flex flex-col items-center justify-center text-center group hover:border-indigo-200 transition-colors">
                              <div className="w-16 h-16 lg:w-24 lg:h-24 bg-slate-100 rounded-2xl lg:rounded-2xl flex items-center justify-center mb-4 lg:mb-8 text-slate-300 group-hover:scale-110 group-hover:text-indigo-300 transition-all duration-500">
                                 <BrainCircuit className="w-8 h-8 lg:w-12 lg:h-12" />
                              </div>
                              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 mb-2 lg:mb-4 tracking-tight">جاري البناء المعرفي العميق</h3>
                              <p className="text-slate-500 font-bold text-xs sm:text-sm lg:text-lg max-w-lg mx-auto leading-relaxed">
                                بمجرد إصدار القرارات وتتبع نتائجها، سيقوم النظام بعرض رحلة تطوره وتحسن دقته هنا بشكل آلي عبر معالجة البيانات التاريخية.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hidden Risks Section */}
                  <div className="pt-16 pb-8">
                    <div className="bg-gradient-to-br from-rose-950 via-slate-950 to-slate-900 rounded-3xl lg:rounded-[3.5rem] p-6 sm:p-10 lg:p-16 shadow-xl relative overflow-hidden border border-rose-900/30">
                      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />
                      <div className="absolute -top-20 -right-20 opacity-[0.05] text-rose-500 rotate-12 pointer-events-none">
                        <ShieldAlert className="w-[300px] h-[300px] lg:w-[450px] lg:h-[450px]" />
                      </div>

                      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-6 md:p-8 lg:gap-12">
                        <div className="flex-1 space-y-6 lg:space-y-8">
                          <div className="flex items-center gap-3 lg:gap-5">
                            <div className="bg-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.7)] p-2.5 lg:p-4 rounded-xl lg:rounded-2xl border border-rose-400/30 shrink-0">
                              <AlertCircle className="text-white w-6 h-6 lg:w-8 lg:h-8" />
                            </div>
                            <div>
                              <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tighter leading-none mb-1 lg:mb-1.5">
                                كاشف المخاطر والخسائر الخفية
                              </h2>
                              <div className="flex items-center gap-2">
                                <div className="h-1 w-6 lg:w-10 bg-rose-500 rounded-full" />
                                <span className="text-rose-400 text-[10px] lg:text-xs font-bold uppercase tracking-[0.1em] lg:tracking-[0.3em]">Real-Time Risk Guardian</span>
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-rose-100/90 text-sm sm:text-lg lg:text-2xl font-bold leading-snug lg:leading-tight tracking-tight">
                            يحلل هذا النظام ما وراء الأرقام السطحية. <span className="bg-rose-500/20 text-white px-1.5 lg:px-2 rounded-md lg:rounded-lg">فهو لا يكتفي بإخبارك بحجم المبيعات</span>، بل يغوص في هوامش الربح الفردية، سلوكيات العملاء المكلِفة، وتلاعب الموردين، ليكشف لك تماماً أين تتسرب أموالك.
                          </p>

                          <div className="flex flex-wrap gap-2 lg:gap-4">
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 px-3 lg:px-5 py-2 lg:py-3 rounded-xl lg:rounded-2xl flex items-center gap-2 lg:gap-3">
                              <div className="w-1.5 lg:w-2.5 h-1.5 lg:h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" />
                              <span className="text-rose-100 font-bold text-xs lg:text-sm">تسرب الأرباح</span>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 px-3 lg:px-5 py-2 lg:py-3 rounded-xl lg:rounded-2xl flex items-center gap-2 lg:gap-3">
                              <div className="w-1.5 lg:w-2.5 h-1.5 lg:h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse" />
                              <span className="text-amber-100 font-bold text-xs lg:text-sm">مخاطر الموردين</span>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-3">
                              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse" />
                              <span className="text-indigo-100 font-bold text-sm">أنماط الاحتيال</span>
                            </div>
                          </div>

                          <div className="pt-4 relative z-10 flex gap-4">
                            <div className="bg-white/10 backdrop-blur-md px-8 py-4 rounded-2xl flex items-center gap-3 border border-white/10 shadow-xl group/badge hover:bg-white/20 transition-all cursor-default">
                              <Search className="text-rose-400 group-hover:scale-110 transition-transform" size={24} />
                              <span className="text-white font-bold text-lg">
                                رصدنا {hiddenRisks.length} ثغرات خفية
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="lg:w-1/3 w-full relative">
                           <div className="absolute inset-0 bg-rose-500/10 blur-[100px] rounded-full" />
                           <div className="relative bg-slate-950/60 backdrop-blur-3xl border border-white/10 p-2 rounded-2xl shadow-2xl overflow-hidden">
                             <div className="bg-slate-950/90 rounded-2xl p-6 md:p-8 border border-white/5">
                               <div className="flex items-center justify-between mb-8">
                                 <div className="text-[10px] font-bold text-rose-500 uppercase tracking-[0.3em]">مراقب الاستقرار</div>
                                 <div className="flex gap-1.5">
                                   {[1,2,3].map(i => <div key={i} className="w-2 h-8 bg-rose-500/20 rounded-full overflow-hidden relative">
                                     <div className="absolute bottom-0 w-full bg-rose-500 animate-pulse" style={{ height: `${30+i*20}%`, animationDelay: `${i*0.2}s` }} />
                                   </div>)}
                                 </div>
                               </div>
                               <div className="space-y-4 mb-8">
                                 <div className="h-3 w-3/4 bg-white/5 rounded-full animate-skeleton" />
                                 <div className="h-3 w-full bg-white/5 rounded-full animate-skeleton" />
                                 <div className="h-3 w-1/2 bg-white/5 rounded-full animate-skeleton" />
                               </div>
                               <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                   <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">تأمين الخوارزمية</span>
                                 </div>
                                 <span className="text-white text-xs font-bold">نشط 🟢</span>
                               </div>
                             </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col w-full ">
                    {hiddenRisks.length > 0 ? (
                      hiddenRisks.map((risk, i) => {
                        const icons = {
                          product: (
                            <Package size={24} className="text-rose-500" />
                          ),
                          customer: (
                            <Users size={24} className="text-indigo-500" />
                          ),
                          supplier: (
                            <Truck size={24} className="text-amber-500" />
                          ),
                          trend: (
                            <TrendingUp size={24} className="text-red-500" />
                          ),
                        };
                        const colorClasses =
                          risk.impactLevel === "high"
                            ? "bg-red-50 border-red-200 text-red-900"
                            : "bg-amber-50 border-amber-200 text-amber-900";

                        return (
                          <motion.div
                            key={risk.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-[#fdfbf7] p-3 md:p-4 rounded-2xl md:rounded-2xl border border-[#f0e6d2] shadow-xl relative flex flex-col group hover:border-rose-200 hover:shadow-rose-100 transition-all"
                          >
                            <div className="flex justify-between items-start mb-6">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center">
                                  {icons[risk.iconType]}
                                </div>
                                <div>
                                  <h3 className="text-2xl font-bold text-slate-800 leading-snug">
                                    {risk.title}
                                  </h3>
                                  <div
                                    className={cn(
                                      "text-[10px] font-bold px-3 py-1 rounded-full inline-block mt-2",
                                      risk.impactLevel === "high"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-amber-100 text-amber-700",
                                    )}
                                  >
                                    {risk.impactLevel === "high"
                                      ? "مستوى الخطورة: عالي جداً"
                                      : "مستوى الخطورة: متوسط"}
                                  </div>
                                  {risk.affectedProductNames &&
                                    risk.affectedProductNames.length > 0 && (
                                      <div className="relative group/risk-names inline-block mr-3">
                                        <div className="text-[10px] text-rose-500 font-bold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all cursor-pointer flex items-center gap-2 direction-rtl active:scale-95 shadow-sm overflow-hidden relative">
                                          <span className="relative z-10">
                                            رؤية الأصناف (
                                            {risk.affectedProductNames.length})
                                          </span>
                                          <Package
                                            size={12}
                                            className="relative z-10"
                                          />
                                          <div className="absolute inset-0 bg-rose-200/20 animate-pulse" />
                                        </div>

                                        <div className="absolute bottom-full left-0 mb-4 invisible group-hover/risk-names:visible opacity-0 group-hover/risk-names:opacity-100 transition-all transform translate-y-4 group-hover/risk-names:translate-y-0 bg-[#1a1a2e]/90 backdrop-blur-xl border border-rose-500/40 p-3 md:p-3 rounded-2xl shadow-[0_20px_50px_rgba(225,29,72,0.3)] z-[500] min-w-[260px] max-w-[320px] text-right">
                                          <div className="flex items-center justify-between border-b border-rose-500/20 pb-3 mb-3 flex-row-reverse">
                                            <p className="text-[11px] font-bold text-rose-400">
                                              تحليل الأصناف الحرجة
                                            </p>
                                            <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                                          </div>
                                          <div className="flex flex-wrap gap-2 justify-end">
                                            {risk.affectedProductNames.map(
                                              (name: string, pIdx: number) => (
                                                <span
                                                  key={pIdx}
                                                  className="text-[10px] bg-white/10 text-white px-3 py-1.5 rounded-xl border border-white/10 whitespace-normal text-right shadow-sm hover:bg-white/20 transition-colors"
                                                >
                                                  {name}
                                                </span>
                                              ),
                                            )}
                                          </div>
                                          <div className="absolute -bottom-2 left-8 w-4 h-4 bg-[#1a1a2e]/90 border-l border-b border-rose-500/40 -rotate-45 backdrop-blur-xl"></div>
                                        </div>
                                      </div>
                                    )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col w-full ">
                              <div className="bg-slate-50 p-3 md:p-4 rounded-2xl border border-slate-100">
                                <h4 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
                                  <Target size={16} /> التفسير التشغيلي
                                </h4>
                                <p className="text-sm text-slate-700 font-bold leading-relaxed">
                                  {risk.explanation}
                                </p>
                              </div>
                              <div className="bg-slate-50 p-3 md:p-4 rounded-2xl border border-slate-100">
                                <h4 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
                                  <PieChart size={16} /> الأدلة والأرقام
                                </h4>
                                <p className="text-sm text-slate-700 font-bold leading-relaxed">
                                  {risk.supportingData}
                                </p>
                              </div>
                            </div>

                            <div
                              className={cn(
                                "p-3 md:p-4 rounded-2xl border relative overflow-hidden",
                                colorClasses,
                              )}
                            >
                              <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                                <CheckCircle2 size={16} /> الإجراء التصحيحي
                                المقترح
                              </h4>
                              <p className="text-sm font-bold leading-relaxed">
                                {risk.recommendedAction}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl md:rounded-2xl p-8 md:p-16 flex flex-col items-center justify-center text-center">
                        <CheckCircle2
                          className="text-emerald-500 mb-4"
                          size={64}
                        />
                        <h3 className="text-2xl font-bold text-emerald-800 mb-2">
                          تهانينا! عملياتك نظيفة
                        </h3>
                        <p className="text-sm font-bold text-emerald-600 max-w-lg">
                          لم يكتشف الذكاء الاصطناعي أي تسرب خفي في الأرباح أو
                          مخاطر تشغيلية غير معلنة في الوقت الحالي. استمر في
                          متابعة لوحة القيادة.
                        </p>
                      </div>
                    )}
                  </div>

                <div
                  id="strategic-manager-section"
                  className="bg-slate-950 rounded-[48px] p-10 md:p-16 shadow-2xl relative overflow-hidden flex flex-col items-start border border-white/5"
                >
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-indigo-600 to-emerald-400" />
                  <div className="absolute top-10 left-10 opacity-5 text-indigo-400 rotate-12">
                    <Briefcase size={300} />
                  </div>

                  <h2 className="text-4xl md:text-5xl font-black text-white mb-8 relative z-10 flex items-center gap-6 tracking-tighter">
                    المدير الاستراتيجي الآلي{" "}
                    <div className="w-16 h-16 bg-amber-500/20 rounded-3xl flex items-center justify-center border border-amber-500/30">
                      <Zap className="text-amber-400" size={32} />
                    </div>
                  </h2>
                  <p className="text-slate-400 text-xl font-bold leading-relaxed max-w-4xl relative z-10 mb-12">
                    هذا المحرك يقرأ العمليات التشغيلية، يكتشف المخاطر المخفية،
                    ويرصد فرص النمو الضائعة.. ثم يولد لك "خطط استراتيجية كاملة"
                    لتطبيقها فوراً دون تدخل بشري.
                  </p>

                  <div className="flex gap-6 relative z-10">
                    <div className="bg-white/5 backdrop-blur-xl px-8 py-4 rounded-[32px] flex items-center gap-4 border border-white/10 shadow-lg">
                      <Target className="text-emerald-400" size={24} />
                      <span className="text-white text-lg font-black tracking-widest uppercase">
                        {autoStrategies.length} استراتيجية جاهزة للتنفيذ
                      </span>
                    </div>
                  </div>
                </div>

                  <div className="grid grid-cols-1 gap-12 w-full">
                    {autoStrategies.length > 0 ? (
                      autoStrategies.map((strat, i) => (
                        <motion.div
                          key={strat.id}
                          initial={{ opacity: 0, y: 30 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.1, duration: 0.8 }}
                          className="bg-white p-10 md:p-14 rounded-[56px] border border-slate-100 shadow-xl relative overflow-hidden flex flex-col group hover:border-indigo-400 transition-all duration-700 hover:shadow-3xl"
                        >
                          {strat.priority === "high" && (
                            <div className="absolute top-0 right-0 left-0 h-1 bg-red-500" />
                          )}
                          {strat.priority === "medium" && (
                            <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
                          )}

                          <div className="flex justify-between items-start mb-6 w-full">
                            <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                              <div className="text-[10px] font-bold text-slate-500 uppercase text-left">
                                الأثر المتوقع
                              </div>
                              <div className="text-xs font-bold text-slate-800 text-left leading-relaxed">
                                {strat.impact}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0 pr-4">
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-4 py-2 rounded-2xl",
                                  strat.priority === "high"
                                    ? "bg-red-100 text-red-600"
                                    : "bg-amber-100 text-amber-600",
                                )}
                              >
                                {strat.priority === "high"
                                  ? "أولوية قصوى"
                                  : "أولوية متوسطة"}
                              </span>
                            </div>
                          </div>

                          <h3 className="text-2xl font-bold text-slate-900 mb-6 leading-snug text-right">
                            {strat.title}
                          </h3>

                          <div className="space-y-4 mb-8">
                            <div className="bg-red-50/50 p-3 rounded-2xl border border-red-100/50">
                              <h4 className="text-xs font-bold text-red-800 mb-2 flex items-center gap-2 justify-end">
                                <AlertCircle size={14} /> المشكلة المرصودة
                              </h4>
                              <p className="text-sm text-red-900 font-medium leading-relaxed text-right">
                                {strat.problem}
                              </p>
                            </div>
                            <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100/50">
                              <h4 className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-2 justify-end">
                                <Map size={14} /> السبب الجذري (Root Cause)
                              </h4>
                              <p className="text-sm text-amber-900 font-medium leading-relaxed text-right">
                                {strat.rootCause}
                              </p>
                            </div>
                          </div>

                          <div className="mt-auto">
                            <h4 className="font-bold text-slate-800 mb-4 text-right border-b border-slate-200/60 pb-2">
                              خطة العمل التنفيذية
                            </h4>
                            <div className="space-y-3">
                              {strat.steps.map((step, stepIdx) => (
                                <div
                                  key={stepIdx}
                                  className="flex items-start justify-end gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm"
                                >
                                  <div className="text-right flex-1">
                                    <p className="text-sm font-bold text-slate-800 mb-1 leading-relaxed">
                                      {step.task}
                                    </p>
                                    <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 inline-block px-2 py-1 rounded-lg">
                                      النتيجة: {step.expectedOutcome}
                                    </p>
                                  </div>
                                  <div className="w-8 h-8 shrink-0 bg-slate-900 text-white font-bold flex items-center justify-center rounded-xl text-xs">
                                    {stepIdx + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-500 font-bold">
                            <span className="flex items-center gap-1">
                              توليد تلقائي:{" "}
                              <span dir="ltr" className="inline-block text-left">
                                {new Date(strat.createdAt).toLocaleTimeString(
                                  "en-GB", { timeZone: 'Asia/Kuwait' }
                                )}
                              </span>
                            </span>
                            <span>{strat.dataReference}</span>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="col-span-2 bg-slate-50 border-2 border-dashed border-slate-200/60 rounded-2xl md:rounded-2xl p-8 md:p-16 flex flex-col items-center justify-center text-center">
                        <Briefcase className="text-slate-300 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-slate-600 mb-2">
                          النظام الاستراتيجي يعمل بصمت
                        </h3>
                        <p className="text-sm font-bold text-slate-500">
                          لا توجد ثغرات أو فرص استراتيجية حرجة تتطلب تدخلك
                          حالياً. سيقوم النظام بتوليد خطط تلقائية بمجرد رصد أي
                          تغيير في مسار المبيعات أو نمط العملاء.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
            )}

            {activeTab === "diwaniya" && (
              <div className="space-y-6" dir="rtl">
                <DiwaniyaTournaments data={data} setData={onUpdateData} />
              </div>
            )}

            {activeTab === "loyalty" && (
              <div className="space-y-6" dir="rtl">
                <React.Suspense
                  fallback={
                    <div className="h-64 animate-pulse bg-slate-100 rounded-2xl" />
                  }
                >
                  <LoyaltyProgramPage data={data} onUpdateData={onUpdateData} />
                </React.Suspense>
              </div>
            )}

            {activeTab === "promocodes" && (
              <div className="space-y-6" dir="rtl">
                <React.Suspense
                  fallback={
                    <div className="h-64 animate-pulse bg-slate-100 rounded-2xl" />
                  }
                >
                  <PromoCodePage data={data} onUpdateData={onUpdateData} />
                </React.Suspense>
              </div>
            )}

            {activeTab === "pulse" && (
              <React.Fragment>
                {/* Quick Access Tasks Hidden as requested */}
                {/* 
                <div className="mb-8" dir="rtl">
                  <div className="flex items-center gap-2 mb-4 justify-end opacity-60">
                    <Zap size={14} className="text-amber-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">الوصول السريع للمهام</span>
                  </div>
                  <QuickActions />
                </div>
                */}

                <CommandBrief data={data} dateFilter={dateFilter} />
                <div className="space-y-6 mt-6">
                  <div className="flex flex-col w-full ">
                    <GlobalStatBox
                      label="إجمالي المبيعات"
                      value={totalSalesVal}
                      color="blue"
                      icon={TrendingUp}
                      index={0}
                    />
                    <GlobalStatBox
                      label="إجمالي التكاليف"
                      value={totalCostVal + totalExpensesVal}
                      color="red"
                      icon={Briefcase}
                      index={1}
                    />
                    <GlobalStatBox
                      label="صافي الربح"
                      value={Math.max(0, netProfit)}
                      color="emerald"
                      icon={DollarSign}
                      index={2}
                    />
                    <GlobalStatBox
                      label="هامش الربح"
                      value={profitMargin}
                      color="amber"
                      icon={Target}
                      index={3}
                      isPercent
                    />
                  </div>

                  <div className="bg-slate-50/50 rounded-3xl border border-slate-200/60 overflow-hidden transition-all duration-500">
                    <button
                      onClick={() =>
                        setActiveCategory((prev) =>
                          prev === "liquidity" ? null : "liquidity",
                        )
                      }
                      className="w-full flex items-center justify-between p-4 md:p-6 hover:bg-slate-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center">
                          <Wallet size={20} />
                        </div>
                        <div className="text-right">
                          <h4 className="font-bold text-slate-800">
                            رصيد السيولة بالبنك والخزينة
                          </h4>
                          <p className="text-[10px] text-slate-500 font-bold">
                            بناءً على عمليات (كي-نت، روابط، تحويلات)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold text-slate-900">
                          {expectedBankBalance.toFixed(3)}{" "}
                          <span className="text-sm">د.ك</span>
                        </div>
                        <ChevronDown
                          size={20}
                          className={cn(
                            "text-slate-500 transition-transform duration-300",
                            activeCategory === "liquidity" ? "rotate-180" : "",
                          )}
                        />
                      </div>
                    </button>

                    <AnimatePresence>
                      {activeCategory === "liquidity" && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="px-4 md:px-6 pb-6 pt-2">
                            <div className="space-y-3">
                              <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                                <span>+ إجمالي إيرادات المنتجات</span>
                                <span className="text-blue-600">
                                  {foodSalesVal?.toFixed(3)} د.ك
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-xs font-bold text-slate-600 border-t border-blue-100/50 pt-2">
                                <span>+ إجمالي رسوم التوصيل المحصلة</span>
                                <span className="text-blue-600">
                                  {totalDeliveryRevenue?.toFixed(3)} د.ك
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-xs font-bold text-slate-600 border-t border-blue-100/50 pt-2">
                                <span>- المصروفات العامة</span>
                                <span className="text-red-500">
                                  {totalExpensesVal.toFixed(3)} د.ك
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-xs font-bold text-slate-600 border-t border-blue-100/50 pt-2">
                                <span>- تحويلات الموردين الفعلية</span>
                                <span className="text-red-500">
                                  {allSupplierPayments.toFixed(3)} د.ك
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-xs font-bold text-slate-600 border-t border-blue-100/50 pt-2">
                                <span>- إجمالي رسوم بوابات الدفع المسجلة</span>
                                <span className="text-red-500">
                                  {totalGatewayFees.toFixed(3)} د.ك
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Category 2: Operational Efficiency */}
                  <div className="bg-slate-50/50 rounded-3xl border border-slate-200/60 overflow-hidden transition-all duration-500">
                    <button
                      onClick={() =>
                        setActiveCategory((prev) =>
                          prev === "ops" ? null : "ops",
                        )
                      }
                      className="w-full flex items-center justify-between p-3 md:p-4 hover:bg-slate-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center text-white">
                          <Truck size={20} />
                        </div>
                        <div className="text-right">
                          <h3 className="font-bold text-slate-800 text-lg tracking-tight">
                            أداء التوصيل والمدفوعات
                          </h3>
                          <p className="text-[10px] text-slate-500 font-bold">
                            إحصائيات الفواتير، التوصيل ورسوم البوابات
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        size={20}
                        className={cn(
                          "text-slate-500 transition-transform duration-300",
                          activeCategory === "ops" ? "rotate-180" : "",
                        )}
                      />
                    </button>

                    <AnimatePresence>
                      {activeCategory === "ops" && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="px-6 pb-6 pt-2">
                            <div className="flex flex-col w-full ">
                              <GlobalStatBox
                                label="عدد الفواتير"
                                value={activeInvoices.length}
                                color="purple"
                                icon={FileText}
                                index={4}
                              />
                              <GlobalStatBox
                                label="إجمالي رسوم التوصيل"
                                value={totalDeliveryRevenue}
                                color="indigo"
                                icon={Truck}
                                index={5}
                              />
                              <GlobalStatBox
                                label="صافي أرباح التوصيل"
                                value={totalDeliveryProfit}
                                color="emerald"
                                icon={TrendingUp}
                                index={6}
                              />
                              <GlobalStatBox
                                label="رسوم البوابات"
                                value={totalGatewayFees}
                                color="red"
                                icon={CreditCard}
                                index={7}
                              />
                              <GlobalStatBox
                                label="إجمالي مبيعات الإضافات"
                                value={totalAddonsRevenue}
                                color="amber"
                                icon={Package}
                                index={8}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Category 3: Customer Economics */}
                  <div className="bg-slate-50/50 rounded-3xl border border-slate-200/60 overflow-hidden transition-all duration-500">
                    <button
                      onClick={() =>
                        setActiveCategory((prev) =>
                          prev === "customers" ? null : "customers",
                        )
                      }
                      className="w-full flex items-center justify-between p-3 md:p-4 hover:bg-slate-100/50 transition-colors"
                      dir="rtl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-white">
                          <Users size={20} />
                        </div>
                        <div className="text-right">
                          <h3 className="font-bold text-slate-800 text-lg tracking-tight">
                            اقتصاديات العملاء والنمو
                          </h3>
                          <p className="text-[10px] text-slate-500 font-bold">
                            التدفق النقدي، LTV، وتكلفة الاستحواذ
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        size={20}
                        className={cn(
                          "text-slate-500 transition-transform duration-300",
                          activeCategory === "customers" ? "rotate-180" : "",
                        )}
                      />
                    </button>

                    <AnimatePresence>
                      {activeCategory === "customers" && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="px-6 pb-6 pt-2" dir="rtl">
                            <div className="flex flex-col w-full ">
                              <GlobalStatBox
                                label="التدفق النقدي المتوقع"
                                value={cashFlowForecast}
                                color="emerald"
                                icon={Wallet}
                                index={8}
                              />
                              <GlobalStatBox
                                label="القيمة الحياتية (LTV)"
                                value={ltv}
                                color="indigo"
                                icon={Users}
                                index={9}
                              />
                              <GlobalStatBox
                                label="تكلفة الاستحواذ (CAC)"
                                value={cac}
                                color="amber"
                                icon={User}
                                index={10}
                              />
                              <GlobalStatBox
                                label="كفاءة الاستحواذ (LTV:CAC)"
                                value={ltvCacRatio}
                                color="blue"
                                icon={BarChart3}
                                index={11}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* FIRST BENTO (Health & Intelligence Stacked Layout) */}
                  <div className="flex flex-col gap-4 mb-8" dir="rtl">
                    {/* System Status (small compact card) */}
                    <div
                      className={cn(
                        "p-3 md:p-4 rounded-2xl flex items-center justify-between cursor-pointer border hover:opacity-90 transition-opacity shadow-sm bg-white",
                        healthIndex.status === "Healthy"
                          ? "border-emerald-100"
                          : healthIndex.status === "Risk"
                            ? "border-amber-100"
                            : "border-rose-100",
                      )}
                      onClick={() => setActiveTab("intelligence")}
                    >
                      <div className="flex items-center gap-4">
                        {/* Reduced Circle (No absolute SVG, just a small circular badge) */}
                        <div
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm",
                            healthIndex.status === "Healthy"
                              ? "bg-emerald-500 text-white"
                              : healthIndex.status === "Risk"
                                ? "bg-amber-500 text-white"
                                : "bg-rose-500 text-white",
                          )}
                        >
                          {healthIndex.score}%
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-sm font-bold uppercase text-slate-800">
                            حالة النظام التشغيلي
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-bold",
                              healthIndex.status === "Healthy"
                                ? "text-emerald-600"
                                : healthIndex.status === "Risk"
                                  ? "text-amber-600"
                                  : "text-rose-600",
                            )}
                          >
                            {healthIndex.status === "Healthy"
                              ? "مستقر وآمن"
                              : healthIndex.status === "Risk"
                                ? "يتطلب مراجعة"
                                : "حرج جداً"}{" "}
                            - انقر للتفاصيل
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metrics below (grid 2 columns) */}
                    <div className="flex flex-col w-full ">
                      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                          <TrendingUp size={10} /> مبيعات الفترة
                        </span>
                        <span className="text-lg font-bold text-slate-800">
                          {totalSalesVal.toFixed(1)}{" "}
                          <span className="text-[10px]">د.ك</span>
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                          <Target size={10} /> كفاءة الأرباح
                        </span>
                        <span
                          className={cn(
                            "text-lg font-bold",
                            profitMargin >= 10
                              ? "text-emerald-500"
                              : "text-amber-500",
                          )}
                        >
                          {profitMargin.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* META INTELLIGENCE LAYER: ARCHIVE & ACTION */}
                  <div className="flex flex-col w-full " dir="rtl">
                    {/* DYNAMIC INSIGHTS GRID */}
                    <div className="lg:col-span-4 flex flex-col w-full ">
                      {[topOpportunity, topRisk, topAction].map(
                        (insight, idx) => {
                          if (!insight)
                            return (
                              <div
                                key={idx}
                                className="bg-slate-100/50 border-2 border-dashed border-slate-200/60 rounded-3xl flex flex-row-reverse items-center justify-center text-slate-500 p-3 md:p-4 relative overflow-hidden"
                              >
                                <div
                                  className="absolute inset-0 -translate-x-full bg-gradient-to-l from-transparent via-white/80 to-transparent animate-[shimmer_1.5s_infinite]"
                                  style={{ animationDirection: "reverse" }}
                                />
                                <ShoppingBag
                                  className="opacity-20 ml-2"
                                  size={32}
                                />
                                <span className="text-xs md:text-sm font-bold relative z-10">
                                  جاري الاستنباط الذكي...
                                </span>
                              </div>
                            );

                          const isRisk = insight.type === "risk";
                          const isAction = insight.type === "action";
                          const colors = isRisk
                            ? {
                                bg: "bg-rose-50",
                                border: "border-rose-100",
                                icon: "text-rose-500",
                                accent: "text-rose-800",
                                btn: "bg-rose-500",
                                tag: "bg-rose-100 text-rose-700",
                              }
                            : isAction
                              ? {
                                  bg: "bg-indigo-50",
                                  border: "border-indigo-100",
                                  icon: "text-indigo-500",
                                  accent: "text-indigo-800",
                                  btn: "bg-indigo-500",
                                  tag: "bg-indigo-100 text-indigo-700",
                                }
                              : {
                                  bg: "bg-emerald-50",
                                  border: "border-emerald-100",
                                  icon: "text-emerald-500",
                                  accent: "text-emerald-800",
                                  btn: "bg-emerald-500",
                                  tag: "bg-emerald-100 text-emerald-700",
                                };

                          return (
                            <motion.div
                              key={insight.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: idx * 0.1 }}
                              className={cn(
                                "rounded-2xl p-3 md:p-4 border-2 flex flex-col justify-between hover:shadow-xl transition-all group relative cursor-pointer hover:opacity-95",
                                colors.bg,
                                colors.border,
                                focusedInsight?.id === insight.id
                                  ? "ring-4 ring-indigo-500/20 z-10 shadow-md"
                                  : "",
                              )}
                              onClick={() => setFocusedInsight(insight)}
                            >
                              <div className="absolute top-4 left-4 opacity-5 pointer-events-none">
                                {isRisk ? (
                                  <AlertCircle size={80} />
                                ) : isAction ? (
                                  <Zap size={80} />
                                ) : (
                                  <Target size={80} />
                                )}
                              </div>

                              <div>
                                <div className="flex justify-between items-start mb-4">
                                  <div
                                    className={cn(
                                      "p-3 rounded-2xl",
                                      isRisk
                                        ? "bg-rose-100"
                                        : isAction
                                          ? "bg-indigo-100"
                                          : "bg-emerald-100",
                                    )}
                                  >
                                    {isRisk ? (
                                      <AlertCircle
                                        className={colors.icon}
                                        size={20}
                                      />
                                    ) : isAction ? (
                                      <Zap className={colors.icon} size={20} />
                                    ) : (
                                      <Target
                                        className={colors.icon}
                                        size={20}
                                      />
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span
                                      className={cn(
                                        "text-[10px] font-bold px-3 py-1 rounded-full mb-2",
                                        colors.tag,
                                      )}
                                    >
                                      {insight.confidence}% موثوقية
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter bg-white/50 px-2 py-1 rounded-lg">
                                      بناءً على بيانات حقيقية
                                    </span>
                                  </div>
                                </div>

                                <h4 className="text-base font-bold text-slate-800 mb-3 leading-snug">
                                  {insight.title}
                                </h4>
                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-4">
                                  {insight.impact}
                                </p>
                              </div>

                              <div className="mt-auto flex items-center justify-between">
                                <div className="flex -space-x-2 flex-row-reverse">
                                  <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold">
                                    AI
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (
                                      insight.actionPayload?.actionType ===
                                      "redirect_to_products"
                                    ) {
                                      onNavigate("products");
                                    } else {
                                      setFocusedInsight(insight);
                                    }
                                  }}
                                  className={cn(
                                    "px-5 py-2.5 rounded-xl text-[10px] font-bold text-white shadow-lg transition-all active:scale-90",
                                    colors.btn,
                                  )}
                                >
                                  {insight.actionText}
                                </button>
                              </div>
                            </motion.div>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {/* FOCUSED INSIGHT MODAL-LIKE PANEL */}
                  <AnimatePresence>
                    {focusedInsight && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white rounded-2xl md:rounded-2xl border-4 border-indigo-500/20 shadow-[0_30px_100px_-20px_rgba(79,70,229,0.3)] p-3 md:p-4 lg:p-3 md:p-4 relative overflow-hidden mt-8 z-[500]"
                        dir="rtl"
                      >
                        <button
                          onClick={() => setFocusedInsight(null)}
                          className="absolute top-3 md:p-4 left-6 p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                        >
                          <X size={24} />
                        </button>

                        <div className="flex flex-col gap-4 md:p-3 items-start">
                          <div
                            className={cn(
                              "w-12 md:w-20 h-12 md:h-20 rounded-3xl flex items-center justify-center text-white shrink-0 shadow-xl",
                              focusedInsight.type === "risk"
                                ? "bg-rose-500 shadow-rose-500/30"
                                : focusedInsight.type === "action"
                                  ? "bg-indigo-600 shadow-indigo-600/30"
                                  : "bg-emerald-500 shadow-emerald-500/30",
                            )}
                          >
                            {focusedInsight.type === "risk" ? (
                              <AlertCircle size={32} />
                            ) : focusedInsight.type === "action" ? (
                              <Zap size={32} />
                            ) : (
                              <Target size={32} />
                            )}
                          </div>

                          <div className="flex-1 text-right w-full">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                              <h4 className="text-2xl font-bold text-slate-900">
                                {focusedInsight.title}
                              </h4>
                              <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                                {focusedInsight.source}
                              </span>
                            </div>

                            <div className="bg-slate-50 p-3 md:p-4 rounded-3xl border border-slate-200/60 mt-6 flex flex-col w-full ">
                              <div>
                                <h5 className="text-xs font-bold text-slate-500 uppercase mb-3">
                                  السبب والتحليل 🔍
                                </h5>
                                <div className="text-lg font-bold text-slate-700 leading-relaxed italic border-r-4 border-indigo-500 pr-4">
                                  <p>{focusedInsight.cause}</p>
                                  {focusedInsight.actionPayload
                                    ?.productNames && (
                                    <div className="mt-3 group relative inline-block cursor-pointer">
                                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center gap-2">
                                        <Package size={14} />
                                        عرض أصناف المنتجات المتأثرة
                                      </span>
                                      <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 text-white text-[11px] p-3 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                                        <div className="font-bold mb-2 text-indigo-300 border-b border-white/10 pb-1">
                                          الأصناف المتأثرة:
                                        </div>
                                        <ul className="list-disc pr-4 space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                                          {focusedInsight.actionPayload.productNames.map(
                                            (n: string, i: number) => (
                                              <li key={i}>{n}</li>
                                            ),
                                          )}
                                        </ul>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-4">
                                <h5 className="text-xs font-bold text-slate-500 uppercase mb-3">
                                  تأثيرات حاسمة ⚡
                                </h5>
                                <div className="space-y-2">
                                  {focusedInsight.detailedPoints?.map(
                                    (p, i) => (
                                      <div
                                        key={i}
                                        className="flex items-center gap-2 text-sm font-bold text-slate-600 flex-row-reverse"
                                      >
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                        <span>{p}</span>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mt-8 flex flex-col items-center justify-between gap-3 md:p-4 bg-indigo-600 p-3 md:p-4 rounded-2xl shadow-xl relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                              <div className="relative z-10 text-right w-full">
                                <h5 className="text-indigo-100 text-sm font-bold mb-1">
                                  الإجراء التنفيذي المقترح:
                                </h5>
                                <p className="text-white text-xl font-bold leading-tight mb-2 opacity-90">
                                  {focusedInsight.impact}
                                </p>
                                <div className="flex items-center gap-2 bg-white/10 w-fit px-3 py-1 rounded-full text-[10px] font-bold text-white">
                                  <Activity size={12} />
                                  المستهدف: تحسين {focusedInsight.metric}
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  if (
                                    focusedInsight.actionPayload?.actionType ===
                                    "redirect_to_products"
                                  ) {
                                    onNavigate("products");
                                    setFocusedInsight(null);
                                    return;
                                  }
                                  setActiveTab("growth");
                                  setCampaignTopic("زيادة المبيعات");
                                  setGeneratedCampaign({
                                    id: `camp-insight-${Date.now()}`,
                                    topic: "زيادة المبيعات",
                                    idea: `توصية ذكية: ${focusedInsight.title}`,
                                    message: focusedInsight.actionText,
                                    targetAudience:
                                      "الجمهور المستهدف من التحليل التلقائي",
                                    timing: "فوري (بناءً على النبض الحالي)",
                                    expectedOutcome: focusedInsight.impact,
                                    status: "draft",
                                    createdAt: new Date().toISOString(),
                                  });
                                  setFocusedInsight(null);
                                  toast.success("تم الانتقال لمختبر الحملات", {
                                    description:
                                      "تم تجهيز القالب الذكي بناءً على تحليلك الأخير.",
                                  });
                                }}
                                className="relative z-10 w-full w-full text-center justify-center bg-white text-indigo-700 px-6 py-4 rounded-2xl font-bold text-sm shadow-xl hover:scale-105 transition-all flex items-center gap-3 active:scale-95 group"
                              >
                                {focusedInsight.actionText}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* MASTER AI CONTROL CENTER */}
                  <div
                    className={cn(
                      glassCardStyle,
                      "bg-gradient-to-br from-slate-900 via-[#1a1f2e] to-slate-900 border-indigo-500/40 text-white shadow-xl relative shadow-indigo-500/10 mt-8",
                    )}
                  >
                    <div className="absolute top-0 right-0 p-3 md:p-4 opacity-10 pointer-events-none">
                      <Cpu size={120} />
                    </div>
                    <div className="relative z-10 h-full flex flex-col items-center justify-between gap-4 md:p-3 p-3 md:p-3">
                      <div className="flex-1 w-full lg:w-auto">
                        <div className="flex items-center gap-3 mb-4">
                          <button
                            onClick={() =>
                              toast.info(
                                "المركز الرئيسي لمعالجة البيانات الاستراتيجية",
                                { icon: "🤖" },
                              )
                            }
                            className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-400/30 hover:bg-indigo-500/40 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                          >
                            <Sparkles
                              className="text-indigo-400 pointer-events-none"
                              size={24}
                            />
                          </button>
                          <div className="text-right">
                            <h3 className="text-xl font-bold">
                              المستشار الشامل
                            </h3>
                            <p className="text-[10px] text-indigo-300/60 font-bold uppercase mt-0.5">
                              Deep Archive AI v4.0
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed mb-6">
                          يقوم الذكاء الاصطناعي الآن بمسح شامل لـ{" "}
                          {getUnifiedInvoices(data).length} فاتورة و{" "}
                          {reviews.length} تعليق عميل لاستخراج الأنماط الخفية.
                        </p>
                      </div>

                      <button
                        onClick={handleArchiveAnalysis}
                        disabled={isArchiving}
                        className="w-full lg:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 text-white py-4 px-5 md:px-10 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/30 active:scale-95 group overflow-hidden relative shrink-0"
                      >
                        {isArchiving ? (
                          <>
                            <RefreshCw size={20} className="animate-spin" />
                            <span>جاري المسح العميق...</span>
                          </>
                        ) : (
                          <>
                            <span>تشغيل تحليل الأرشيف الشامل</span>
                            <Send
                              size={18}
                              className="group-hover:translate-x-[-4px] transition-transform"
                            />
                          </>
                        )}
                        {isArchiving && (
                          <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: "100%" }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
                          />
                        )}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {!!archiveResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white rounded-2xl md:rounded-2xl border-2 border-indigo-500 shadow-xl p-3 md:p-4 lg:p-3 md:p-4 relative overflow-hidden"
                        dir="rtl"
                      >
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
                        <button
                          onClick={() => setArchiveResult(null)}
                          className="absolute top-3 md:p-4 left-6 p-3 hover:bg-slate-100 rounded-2xl text-slate-500 transition-colors"
                        >
                          <X size={24} />
                        </button>

                        <div className="flex flex-col gap-3 md:gap-3 md:p-4 md:gap-3 md:p-4 md:p-3">
                          <div className="lg:w-1/3">
                            <div className="flex items-center gap-4 mb-6">
                              <div className="w-12 h-12 md:w-16 md:h-16 rounded-3xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/40">
                                <TrendingUp size={32} />
                              </div>
                              <div className="text-right">
                                <h4 className="text-2xl font-bold text-slate-900">
                                  تقرير النبض الكامل
                                </h4>
                                <p className="text-sm text-slate-500 font-bold">
                                  {archiveResult?.dataReference ||
                                    "بيانات الأرشيف"}
                                </p>
                              </div>
                            </div>

                            <div className="bg-slate-50 p-3 md:p-4 rounded-2xl border border-slate-100 relative overflow-hidden">
                              <div className="text-right mb-6">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                  مؤشر الانطباع العام
                                </span>
                                <div className="text-xl md:text-3xl md:text-3xl md:text-lg md:text-xl font-bold text-indigo-600 mt-2">
                                  {archiveResult?.sentimentScore || 0}%
                                </div>
                                <div className="text-sm font-bold text-slate-800 mt-1">
                                  {archiveResult?.sentiment || "قيد التحليل"}
                                </div>
                              </div>
                              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex flex-row-reverse">
                                <div
                                  className="h-full bg-emerald-500"
                                  style={{
                                    width: `${archiveResult?.sentimentScore || 0}%`,
                                  }}
                                />
                                <div
                                  className="h-full bg-rose-500"
                                  style={{
                                    width: `${100 - (archiveResult?.sentimentScore || 0)}%`,
                                  }}
                                />
                              </div>
                              <div className="mt-6 space-y-4">
                                <div className="flex flex-col gap-1 text-right">
                                  <span className="text-[10px] text-slate-500 font-bold">
                                    أبرز التعليقات المتكررة:
                                  </span>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {(archiveResult?.topRepeated || []).map(
                                      (t: string, i: number) => (
                                        <span
                                          key={i}
                                          className="bg-white px-3 py-1.5 rounded-full border border-slate-200/60 text-[10px] font-bold text-slate-600 shadow-sm"
                                        >
                                          {t}
                                        </span>
                                      ),
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="w-full flex flex-col w-full ">
                            <div className="space-y-6">
                              <h5 className="text-lg font-bold text-[#2d7a54] flex items-center gap-2">
                                نقاط القوة الاستراتيجية{" "}
                                <CheckCircle2 size={20} />
                              </h5>
                              <div className="space-y-3">
                                {(archiveResult?.strengths || []).map(
                                  (s: string, i: number) => (
                                    <div
                                      key={i}
                                      className="flex items-center gap-4 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-right flex-row-reverse"
                                    >
                                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                                        <Sparkles size={16} />
                                      </div>
                                      <span className="text-sm font-bold text-emerald-900">
                                        {s}
                                      </span>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                            <div className="space-y-6">
                              <h5 className="text-lg font-bold text-[#b33a3a] flex items-center gap-2">
                                فرص التحسين الحرجة <AlertCircle size={20} />
                              </h5>
                              <div className="space-y-3">
                                {(archiveResult?.weaknesses || []).map(
                                  (w: string, i: number) => (
                                    <div
                                      key={i}
                                      className="flex items-center gap-4 p-3 bg-rose-50 border border-rose-100 rounded-2xl text-right flex-row-reverse"
                                    >
                                      <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white shrink-0">
                                        <Trash2 size={16} />
                                      </div>
                                      <span className="text-sm font-bold text-rose-900">
                                        {w}
                                      </span>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                            <div className="md:col-span-2 bg-indigo-900 text-white p-3 md:p-4 rounded-2xl shadow-xl relative overflow-hidden">
                              <div className="absolute -top-3 md:p-4 -left-10 opacity-20 text-indigo-400 rotate-12">
                                <Cpu size={200} />
                              </div>
                              <div className="relative z-10">
                                <h5 className="text-xl font-bold mb-6 flex items-center gap-3">
                                  توصيات المحرك الذهبي للتوسع{" "}
                                  <Zap className="text-amber-400" />
                                </h5>
                                <div className="flex flex-col w-full ">
                                  {(archiveResult?.recommendations || []).map(
                                    (rec: string, i: number) => (
                                      <div
                                        key={i}
                                        className="bg-white/10 backdrop-blur-md p-3 md:p-3 rounded-2xl border border-white/10 hover:bg-white/20 transition-all"
                                      >
                                        <div className="text-amber-400 font-bold text-lg mb-2">
                                          0{i + 1}
                                        </div>
                                        <p className="text-xs leading-relaxed font-medium">
                                          {rec}
                                        </p>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col w-full ">
                    <div
                      className={cn(
                        glassCardStyle,
                        "lg:col-span-1 bg-gradient-to-br from-indigo-900 to-slate-900 border-indigo-500/30 text-white shadow-xl",
                      )}
                    >
                      <div className="flex items-center gap-3 mb-6 relative z-10 flex-row-reverse">
                        <button
                          onClick={() =>
                            toast.info(
                              "الذكاء الاصطناعي يقوم بتحليل الأرقام الآن لتقديم هذه التوصيات الدقيقة",
                              { icon: "🧠" },
                            )
                          }
                          className="w-12 h-12 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center border border-indigo-400/30 cursor-pointer"
                        >
                          <Sparkles
                            className="text-indigo-300 pointer-events-none"
                            size={24}
                          />
                        </button>
                        <h3 className="text-xl font-bold text-right">
                          مقترحات الذكاء الاصطناعي 🧠
                        </h3>
                      </div>
                      <div className="space-y-3 relative z-10 text-right">
                        {!ltv || !cac ? (
                          <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                            <p className="text-xs text-white/50 font-bold">
                              لا توجد بيانات كافية لإصدار توصية تخص النمو
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white/5 p-3 rounded-xl border border-white/10 group hover:bg-white/10 transition-all">
                            <div className="flex justify-between items-center mb-1 flex-row-reverse">
                              <div className="text-[10px] text-indigo-300 font-bold">
                                النمو الاستراتيجي
                              </div>
                              <span className="text-[10px] text-white/30 font-bold italic">
                                LTV:CAC = {ltvCacRatio.toFixed(1)}
                              </span>
                            </div>
                            <p className="text-xs font-medium leading-relaxed">
                              {ltvCacRatio >= 3
                                ? `بناءً على LTV:CAC = ${ltvCacRatio.toFixed(1)} (أعلى من الحد المثالي 3.0)، نوصي بمضاعفة ميزانية التسويق بأمان لجذب شريحة أكبر نظراً لارتفاع كفاءة الاستحواذ.`
                                : ltvCacRatio < 1
                                  ? `بناءً على LTV:CAC = ${ltvCacRatio.toFixed(1)} (أقل من 1.0)، تكلفة الاستحواذ (${cac.toFixed(2)} د.ك) أعلى من القيمة المستردة. نوصي بتقليل الإنفاق الإعلاني فوراً ومراجعة التسعير.`
                                  : `بناءً على LTV:CAC = ${ltvCacRatio.toFixed(1)} (أقل من الحد المثالي 3.0)، نوصي بتحسين الاستهداف في مناطق التوصيل القريبة لرفع كفاءة الاستحواذ وتقليل تكلفة العميل (${cac.toFixed(2)} د.ك).`}
                            </p>
                          </div>
                        )}

                        {totalGatewayFees === 0 ? (
                          <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                            <p className="text-xs text-white/50 font-bold">
                              لا توجد رسوم بوابات الدفع لإصدار توصية
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white/5 p-3 rounded-xl border border-white/10 group hover:bg-white/10 transition-all">
                            <div className="flex justify-between items-center mb-1 flex-row-reverse">
                              <div className="text-[10px] text-indigo-300 font-bold">
                                كفاءة التكاليف
                              </div>
                              <span className="text-[10px] text-white/30 font-bold italic">
                                الرسوم = {totalGatewayFees.toFixed(3)} د.ك
                              </span>
                            </div>
                            <p className="text-xs font-medium leading-relaxed">
                              {totalGatewayFees > 10
                                ? `بناءً على التراكم العالي لرسوم الدفع والذي وصل (${totalGatewayFees.toFixed(3)} د.ك)، نوصي بتشجيع الدفع النقدي أو التحويل البنكي المباشر للطلبات الكبيرة لتقليل استنزاف الأرباح.`
                                : `بناءً على رسوم الدفع الحالية (${totalGatewayFees.toFixed(3)} د.ك)، يعتبر نظام التحصيل ممتازا وذو تكلفة منخفضة. يمكنك مواصلة استقبال الطلبات عبر الدفع الإلكتروني.`}
                            </p>
                          </div>
                        )}

                        {profitMargin === 0 && totalSalesVal === 0 ? (
                          <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                            <p className="text-xs text-white/50 font-bold">
                              لا توجد مبيعات كافية لتحليل الأرباح
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white/5 p-3 rounded-xl border border-white/10 group hover:bg-white/10 transition-all">
                            <div className="flex justify-between items-center mb-1 flex-row-reverse">
                              <div className="text-[10px] text-indigo-300 font-bold">
                                الصحة المالية
                              </div>
                              <span className="text-[10px] text-white/30 font-bold italic">
                                هامش الربح = {profitMargin.toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-xs font-medium leading-relaxed">
                              {profitMargin > 20
                                ? `بناءً على هامش الربح الإجمالي البالغ ${profitMargin.toFixed(1)}% (أعلى من 20%)، نوصي باستثمار الفوائض في توسيع قائمة المنتجات أو تحسين التغليف لزيادة القيمة المضافة.`
                                : profitMargin < 10
                                  ? `بناءً على انخفاض هامش الربح إلى ${profitMargin.toFixed(1)}% (أقل من 10%)، نوصي بمراجعة تسعير المنتجات أو التفاوض لتخفيض تكاليف الموردين (${totalCostVal.toFixed(2)} د.ك) بشكل عاجل لتحسين الهامش.`
                                  : `بناءً على هامش الربح الحالي ${profitMargin.toFixed(1)}%، المشروع يحقق أرباحاً جيدة، ولكن يُنصح بتحسين متوسط سلة المشتريات لزيادة العوائد الصافية بطريقة مستدامة.`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-2 flex flex-col w-full ">
                      <div className="md:col-span-1 flex flex-col gap-3 md:p-4">
                        <div
                          className={cn(
                            bentoCardStyle,
                            "bg-[#fdf9f0] border-[#faeeda] flex-1",
                          )}
                        >
                          <div className="flex justify-between items-start mb-2 flex-row-reverse">
                            <button
                              onClick={() =>
                                toast.info(
                                  "الذكاء الاصطناعي يتوقع زيادة في طلبات السفر قريباً بناءً على الأنماط التاريخية",
                                  { icon: "✈️" },
                                )
                              }
                              className="hover:scale-110 active:scale-95 transition-transform"
                            >
                              <Flame
                                className="text-amber-500 pointer-events-none"
                                size={24}
                              />
                            </button>
                            <span className="bg-[#fcedce] text-[#b38026] text-[10px] font-bold px-3 py-1 rounded-full">
                              نبض الكويت 🛰️
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-[#4a3f35] mt-2 mb-1 text-right">
                            موسم السفر القادم
                          </h3>
                          <p className="text-[10px] text-[#8c7b68] font-bold leading-relaxed text-right">
                            توقع انخفاض في طلبات المنازل وزيادة في طلبات 'بوكسات
                            السفر' المجمدة. يرجى تجهيز المخزون.
                          </p>
                        </div>

                        <div
                          className={cn(
                            bentoCardStyle,
                            "bg-amber-50/30 border-amber-100",
                          )}
                        >
                          <div className="flex justify-between items-start mb-2 flex-row-reverse">
                            <Cpu className="text-[#335d8a]" size={24} />
                            <span className="bg-[#d5e0eb] text-[#2c4b6e] text-[10px] font-bold px-3 py-1 rounded-full">
                              النبض الاستراتيجي
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-[#4a3f35] mt-2 mb-1 text-right">
                            تحليل الذروة
                          </h3>
                          <p className="text-[10px] text-[#8c7b68] font-bold leading-relaxed text-right">
                            غداً الساعة 19:30 هي ذروة الطلبات المتوقعة. تأكد من
                            جاهزية طاقم التوصيل.
                          </p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          bentoCardStyle,
                          "bg-[#f0f4f8] border-[#e1e8ef] md:col-span-2",
                        )}
                      >
                        <div className="flex justify-between items-center mb-6 flex-row-reverse">
                          <h3 className="font-bold text-xl text-[#4a3f35] flex items-center gap-2">
                            نشاط الطلبات الأحدث
                            <span className="flex items-center gap-2 bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full text-[10px] uppercase tracking-tighter">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              مباشر
                            </span>
                          </h3>
                          <div className="text-[10px] font-bold text-slate-500 bg-white/50 px-3 py-1 rounded-lg">
                            آخر 10 طلبات
                          </div>
                        </div>
                        <div className="space-y-2.5 flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2">
                          {recentOrders.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-6 md:py-12">
                              <ShoppingBag
                                size={48}
                                className="opacity-10 mb-4"
                              />
                              <p className="text-sm font-bold">
                                لا يوجد نشاط طلبات حالياً
                              </p>
                            </div>
                          ) : (
                            recentOrders.map((inv, idx) => {
                              const customer = (data?.customers || []).find(
                                (c) => c.id === inv.customerId,
                              );
                              return (
                                <motion.div
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  key={inv.id}
                                  className="group flex justify-between items-center p-3 bg-white rounded-2xl border border-[#f0e6d2] hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/5 transition-all flex-row-reverse cursor-pointer active:scale-98"
                                >
                                  <div className="flex items-center gap-4 flex-row-reverse">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-amber-50 group-hover:text-amber-500 group-hover:border-amber-100 transition-colors">
                                      <User size={20} />
                                    </div>
                                    <div className="text-right">
                                      <div className="font-bold text-sm text-slate-800 group-hover:text-amber-900 transition-colors truncate max-w-[120px]">
                                        {customer?.name || (inv as any).customerName ||
                                          (inv.customerId
                                            ? `عميل غير مسجل #${inv.customerId.slice(-4)}`
                                            : "طلب جديد")}
                                      </div>
                                      <div className="flex flex-col items-end gap-1 mt-1">
                                        <div className="flex items-center gap-2 flex-row-reverse">
                                          <span className="text-[10px] text-slate-500 font-bold font-mono">
                                            #{inv.id.toUpperCase()}
                                          </span>
                                          <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                            <Clock size={10} />
                                            <span dir="ltr" className="inline-block text-left">
                                              {(() => {
                                                const addr = (inv as any).address;
                                                if (addr && addr.time)
                                                  return addr.time;
                                                if ((inv as any).time)
                                                  return (inv as any).time;
                                                let dateObj = new Date();
                                                const ca = (inv as any).createdAt;
                                                if (ca) {
                                                  if (ca.seconds)
                                                    dateObj = new Date(
                                                      ca.seconds * 1000,
                                                    );
                                                  else dateObj = new Date(ca);
                                                } else if (inv.date) {
                                                  dateObj = new Date(inv.date);
                                                }
                                                if (isNaN(dateObj.getTime()))
                                                  return "---";
                                                return dateObj.toLocaleTimeString("en-GB", {
                                                  hour: "2-digit",
                                                  minute: "2-digit",
                                                  hour12: true,
                                                  timeZone: "Asia/Kuwait"
                                                });
                                              })()}
                                            </span>
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 line-clamp-1">
                                          <MapPin size={10} />
                                          {(() => {
                                            const addr = (inv as any).address;
                                            if (
                                              addr &&
                                              typeof addr === "object"
                                            ) {
                                              let parts = [];
                                              if (addr.region)
                                                parts.push(addr.region);
                                              if (addr.block)
                                                parts.push(`ق${addr.block}`);
                                              if (addr.street)
                                                parts.push(`ش${addr.street}`);
                                              return parts.join(" ");
                                            }
                                            return (
                                              addr ||
                                              (inv as any).regionId ||
                                              "غير محدد"
                                            );
                                          })()}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-start gap-1">
                                    <div className="text-sm font-bold text-emerald-600 font-mono tracking-tight">
                                      {Number(
                                        getOrderSubtotal(inv) +
                                          getOrderDeliveryFee(inv),
                                      ).toFixed(3)}{" "}
                                      <span className="text-[10px] mr-1">
                                        د.ك
                                      </span>
                                    </div>
                                    <div
                                      className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border transition-all",
                                        isPaidStatus(
                                          (inv as any).status ||
                                            inv.paymentStatus,
                                        )
                                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                          : isPendingStatus(
                                                (inv as any).status ||
                                                  inv.paymentStatus,
                                              )
                                            ? "bg-violet-50 text-violet-600 border-violet-100 animate-pulse"
                                            : isFailedStatus(
                                                  (inv as any).status ||
                                                    inv.paymentStatus,
                                                )
                                              ? "bg-amber-50 text-amber-600 border-amber-100"
                                              : (inv as any).status ===
                                                  "cancelled"
                                                ? "bg-rose-50 text-rose-600 border-rose-100"
                                                : "bg-slate-50 text-slate-600 border-slate-100",
                                      )}
                                    >
                                      {isPaidStatus(
                                        (inv as any).status ||
                                          inv.paymentStatus,
                                      ) ? (
                                        "تم الدفع وجاري التوصيل"
                                      ) : isPendingStatus(
                                          (inv as any).status ||
                                            inv.paymentStatus,
                                        ) ? (
                                        <span
                                          title="تعديل حالة الدفع من نشاط الطلبات الأحدث ممنوع. يتم التحديث فقط من بوابة الدفع أو سجل الطلبات."
                                          className="cursor-not-allowed select-none"
                                        >
                                          بانتظار الدفع
                                        </span>
                                      ) : isFailedStatus(
                                          (inv as any).status ||
                                            inv.paymentStatus,
                                        ) ? (
                                        "فشل في عملية الدفع"
                                      ) : (inv as any).status ===
                                        "cancelled" ? (
                                        "ملغي"
                                      ) : (
                                        (inv as any).status ||
                                        inv.paymentStatus ||
                                        "غير معروف"
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })
                          )}
                        </div>
                        {recentOrders.length > 5 && (
                          <div className="mt-4 pt-4 border-t border-[#f0e6d2] flex justify-center">
                            <button
                              onClick={() => onNavigate("reports")}
                              className="text-[10px] font-bold text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-2"
                            >
                              عرض كافة الطلبات بمختبر التقارير
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            )}

            {activeTab === "customers" && (
              <div className="space-y-12">
                <React.Suspense
                  fallback={
                    <div className="h-64 animate-pulse bg-slate-900 rounded-2xl" />
                  }
                >
                  <div id="retention-section">
                    <ClientSniperRadar data={data} />
                  </div>
                </React.Suspense>
                <div
                  id="customers-pulse-section"
                  className="bg-slate-950 rounded-2xl md:rounded-2xl p-3 md:p-4 border border-slate-800 shadow-xl relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(56,189,248,0.1)_0%,rgba(0,0,0,0)_60%)] pointer-events-none" />
                  <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                  <h3 className="font-bold text-2xl text-white mb-8 flex items-center gap-3 justify-end relative z-10">
                    أبرز عملاء التراث
                    <button
                      onClick={() =>
                        toast.info(
                          "يتم استخلاص هؤلاء العملاء بناءً على حجم وتواتر الطلبات",
                          { icon: "📊" },
                        )
                      }
                      className="hover:scale-110 active:scale-95 transition-transform"
                    >
                      <Users
                        size={32}
                        className="text-amber-400 pointer-events-none drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                      />
                    </button>
                  </h3>
                  <div className="flex flex-col w-full space-y-3 md:space-y-0 gap-4 relative z-10">
                    {topCustomers.slice(0, 8).map((c) => (
                      <div
                        onClick={() => {
                          toast.info(`جاري تحويلك لملف العميل: ${c.name}...`, {
                            icon: "🧑‍💼",
                          });
                          if (setDeepLinkData) {
                            setDeepLinkData({ search: c.name });
                          }
                          onNavigate("customers");
                        }}
                        key={c.id}
                        className="flex flex-col p-3 bg-slate-900/50 backdrop-blur-sm rounded-3xl border border-slate-800/80 hover:border-amber-500/50 hover:bg-slate-800/80 transition-all group/item cursor-pointer shadow-lg active:scale-95 text-right w-full"
                      >
                        <div className="flex items-center gap-3 flex-row-reverse w-full">
                          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shadow-inner group-hover/item:scale-110 group-hover/item:bg-amber-500/20 transition-all shrink-0">
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="text-right flex-1 min-w-0">
                            <div className="font-bold text-sm text-slate-100 truncate w-full">
                              {c.name}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase">
                              {c.totalOrders || 0} طلب
                            </div>
                          </div>
                          <div className="text-left flex flex-col items-end shrink-0 pl-2 border-l border-slate-800/20">
                            <div className="font-bold text-amber-400 text-sm">
                              {Number(c.totalSpent || 0).toFixed(3)}
                            </div>
                            <div className="text-[10px] text-amber-500/50 font-bold uppercase">
                              د.ك
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {topCustomers.length === 0 && (
                      <div className="col-span-full text-center p-3 md:p-3 border border-dashed border-slate-800 rounded-2xl">
                        <p className="text-slate-500 font-bold text-sm">
                          لا توجد بيانات عملاء كافية لتحليل صفوة العملاء حتى
                          الآن.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex flex-col w-full ">
                    <div className={bentoCardStyle}>
                      <div className="absolute inset-0 bg-rose-500/5 pointer-events-none" />
                      {isLoyaltyAnalyzing && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-4">
                          <RefreshCw
                            className="animate-spin text-rose-500"
                            size={32}
                          />
                          <span className="font-bold text-sm text-rose-900">
                            جاري التحليل الشخصي...
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-6 flex-row-reverse relative z-10">
                        <h3 className="font-bold text-xl text-[#b33a3a] flex items-center gap-2">
                          نخبة VIP الغائبين{" "}
                          <Zap size={24} className="text-rose-500" />
                        </h3>
                        <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-1 rounded-full border border-rose-200">
                          تحليل الذكاء الاصطناعي
                        </span>
                      </div>

                      {showLoyaltyResult ? (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4 relative z-10"
                        >
                          {vipDisengaged.length === 0 ? (
                            <div className="text-center p-3 md:p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <p className="text-xs font-bold text-slate-500 leading-relaxed">
                                لا توجد بيانات كافية للتحليل، أو لا يوجد عملاء
                                VIP تنطبق عليهم شروط الغياب (أكثر من 15 يوم).
                              </p>
                            </div>
                          ) : (
                            vipDisengaged.map((v) => (
                              <div
                                key={v.id}
                                className="bg-white p-3 md:p-3 rounded-3xl border border-rose-100 flex flex-col gap-3 text-right"
                              >
                                <div className="flex justify-between items-start flex-row-reverse">
                                  <div className="font-bold text-slate-800 text-sm flex gap-2 items-center flex-row-reverse">
                                    {v.name}
                                    {v.totalSpent > 100 && (
                                      <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-full">
                                        VIP
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-500">
                                    ثقة عالية
                                  </div>
                                </div>
                                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl text-[10px] font-bold text-slate-500 flex-row-reverse">
                                  <span>
                                    إجمالي الإنفاق:{" "}
                                    {Number(v.totalSpent || 0).toFixed(1)} د.ك
                                  </span>
                                  <span>غائب منذ {v.daysInactive} يوم</span>
                                </div>
                                <div className="flex gap-2">
                                  {v.totalSpent > 100 ? (
                                    <button
                                      onClick={() => {
                                        const messages = [
                                          `أهلاً ${v.name}! أنت عميل مميز جداً لدينا. مكافأة خاصة بانتظارك تقديراً لولائك!`,
                                          `حياك الله ${v.name}، اشتقنا لتواجدك! نود إهدائك خصم خاص للاستمتاع بطلباتك القادمة.`,
                                          `عزيزنا ${v.name}، لقد مر وقت طويل! نود أن نرحب بعودتك بهدية بسيطة من طرفنا.`,
                                          `هلا ${v.name}! كأحد نخبة عملائنا، جهزنا لك مفاجأة حصرية لتذوق جديدنا.`,
                                        ];
                                        const randomMsg =
                                          messages[
                                            Math.floor(
                                              Math.random() * messages.length,
                                            )
                                          ];
                                        const msg =
                                          encodeURIComponent(randomMsg);
                                        window.open(
                                          `https://wa.me/965${v.phone}?text=${msg}`,
                                          "_blank",
                                        );
                                      }}
                                      className="flex-1 bg-amber-500 text-white py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors"
                                    >
                                      إرسال مكافأة <Heart size={14} />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        const messages = [
                                          `أهلاً ${v.name}! اشتقنا لك، استعمل كود الخصم RETURN15 للعودة والاستمتاع بوجباتك المفضلة.`,
                                          `حياك الله ${v.name}. هل كل شيء بخير؟ نود رؤيتك مجدداً ويسعدنا تقديم خصم لعودتك.`,
                                          `عزيزنا ${v.name}، نعتز بصداقتك! ننتظر زيارتك القادمة ومعك خصم خاص جاهز للتفعيل.`,
                                          `مرحباً ${v.name}! مطبخنا يفتقدك. نأمل أن نراك قريباً، استعمل كود"WELCOMEBACK" للخصم.`,
                                        ];
                                        const randomMsg =
                                          messages[
                                            Math.floor(
                                              Math.random() * messages.length,
                                            )
                                          ];
                                        const msg =
                                          encodeURIComponent(randomMsg);
                                        window.open(
                                          `https://wa.me/965${v.phone}?text=${msg}`,
                                          "_blank",
                                        );
                                      }}
                                      className="flex-1 bg-emerald-500 text-white py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors"
                                    >
                                      خطة الاستعادة <MessageSquare size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                          <button
                            onClick={() => setShowLoyaltyResult(false)}
                            className="w-full text-[10px] font-bold text-slate-500 mt-2 underline"
                          >
                            تحليل جديد
                          </button>
                        </motion.div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-5 md:py-10 relative z-10">
                          <Users size={64} className="text-rose-100 mb-4" />
                          <p className="text-xs font-bold text-slate-500 text-center mb-6">
                            اكتشف العملاء VIP الغائبين لعودتهم مرة أخرى.
                          </p>
                          <button
                            onClick={handleLoyaltyAnalyze}
                            className="bg-rose-500 hover:bg-rose-600 text-white px-5 md:px-10 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-rose-500/20 active:scale-95 transition-all"
                          >
                            بدء تحليل الولاء 🔍
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={bentoCardStyle}>
                      <h3 className="font-bold text-xl text-[#4a3f35] mb-6 flex items-center gap-2 justify-end">
                        نجوم التراث (الأكثر مبيعاً){" "}
                        <Sparkles className="text-amber-500" />
                      </h3>
                      <div className="space-y-4">
                        {(topProducts || [])
                          .filter((p) => p.sold > 0)
                          .slice(0, 3)
                          .map((p, i) => (
                            <div
                              key={p.id}
                              className="flex justify-between items-center bg-white p-3 rounded-3xl border border-[#f0e6d2] hover:border-amber-400 transition-colors flex-row-reverse"
                            >
                              <div className="flex items-center gap-3 flex-row-reverse">
                                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm">
                                  #{i + 1}
                                </div>
                                <div className="font-bold text-slate-800 text-sm">
                                  {p.name}
                                </div>
                              </div>
                              <div className="bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-bold px-3 py-1.5 rounded-full">
                                {p.sold} طلب
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      glassCardStyle,
                      "bg-slate-900 border-indigo-500/30 text-white overflow-visible",
                    )}
                  >
                    <div className="flex justify-between items-start mb-8 flex-row-reverse relative z-10">
                      <div className="text-right">
                        <h3 className="text-2xl font-bold flex items-center justify-end gap-3 mb-2">
                          توصيات ذكية من الذكاء الاصطناعي{" "}
                          <Cpu className="text-indigo-400" size={24} />
                        </h3>
                      </div>
                    </div>

                    <div className="flex flex-col w-full ">
                      {!allInsights || allInsights.length === 0 ? (
                        <div className="col-span-1 md:col-span-3 text-center p-3 md:p-4 bg-white/5 rounded-3xl border border-white/10">
                          <p className="font-bold text-indigo-300">
                            لا توجد بيانات كافية للتحليل الاستراتيجي.
                          </p>
                          <p className="text-[10px] text-white/50 mt-2 font-bold">
                            يرجى تسجيل حركة مبيعات وملاحظات ليتسنى للذكاء
                            الاصطناعي قراءة الأنماط.
                          </p>
                        </div>
                      ) : (
                        allInsights.slice(0, 3).map((insight, i) => (
                          <div
                            key={i}
                            className="bg-white/5 border border-white/10 p-3 md:p-4 rounded-3xl flex flex-col gap-4 hover:bg-white/10 transition-all group"
                          >
                            <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform">
                              <Sparkles size={24} />
                            </div>
                            <p className="text-sm font-bold leading-loose text-right text-indigo-100">
                              {insight.title}
                            </p>
                            <p className="text-[10px] text-indigo-300/80 leading-relaxed text-right mb-2">
                              {insight.cause}
                            </p>
                            {insight.actionPayload?.productNames &&
                              insight.actionPayload.productNames.length > 0 && (
                                <div className="relative group/prod-names self-end">
                                  <div className="text-[10px] text-indigo-400 font-bold bg-indigo-400/10 px-3 py-1.5 rounded-xl border border-indigo-400/20 hover:bg-indigo-400/20 transition-all cursor-pointer flex items-center gap-2 direction-rtl active:scale-95 shadow-sm overflow-hidden relative">
                                    <span className="relative z-10">
                                      رؤية الأصناف (
                                      {
                                        insight.actionPayload.productNames
                                          .length
                                      }
                                      )
                                    </span>
                                    <Package
                                      size={12}
                                      className="relative z-10"
                                    />
                                    <div className="absolute inset-0 bg-indigo-400/10 animate-pulse" />
                                  </div>

                                  <div className="absolute bottom-full left-0 mb-4 invisible group-hover/prod-names:visible opacity-0 group-hover/prod-names:opacity-100 transition-all transform translate-y-4 group-hover/prod-names:translate-y-0 bg-[#0f172a]/95 backdrop-blur-2xl border border-indigo-500/40 p-3 md:p-3 rounded-2xl shadow-[0_30px_60px_rgba(79,70,229,0.4)] z-[500] min-w-[260px] max-w-[320px] text-right">
                                    <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3 flex-row-reverse">
                                      <p className="text-[11px] font-bold text-indigo-300">
                                        الأصناف قيد التحليل
                                      </p>
                                      <Sparkles
                                        size={12}
                                        className="text-indigo-400 animate-spin-slow"
                                      />
                                    </div>
                                    <div className="flex flex-wrap gap-2 justify-end">
                                      {insight.actionPayload.productNames.map(
                                        (name: string, pIdx: number) => (
                                          <span
                                            key={pIdx}
                                            className="text-[10px] bg-white/5 text-indigo-50 px-3 py-1.5 rounded-xl border border-white/5 whitespace-normal text-right hover:bg-indigo-500/20 transition-all"
                                          >
                                            {name}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                    <div className="absolute -bottom-2 left-8 w-4 h-4 bg-[#0f172a]/95 border-l border-b border-indigo-500/40 -rotate-45 backdrop-blur-2xl"></div>
                                  </div>
                                </div>
                              )}
                            <button
                              onClick={() => {
                                if (
                                  insight.actionText &&
                                  insight.actionText.includes("حملة")
                                ) {
                                  if (setDeepLinkData) {
                                    setDeepLinkData({
                                      exactId: "growth",
                                      scrollTarget: "smart-campaigns",
                                    });
                                  }
                                  onNavigate("dashboard");
                                } else if (
                                  insight.actionPayload?.actionType ===
                                  "redirect_to_products"
                                ) {
                                  onNavigate("products");
                                } else if (insight.type === "risk")
                                  onNavigate("suppliers");
                                else if (insight.type === "opportunity")
                                  onNavigate("customers");
                                else onNavigate("what-if");
                              }}
                              className="w-full py-2 mt-4 bg-indigo-600 rounded-xl text-[10px] font-bold uppercase hover:bg-indigo-500 transition-colors"
                            >
                              {insight.actionText || "تفعيل الآن"}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col w-full ">
                    <div className="bg-white rounded-2xl p-3 md:p-4 border border-[#f0e6d2] shadow-sm flex flex-col gap-3 md:p-4 md:gap-4 md:p-3">
                      <div className="flex flex-col justify-between items-center gap-4 flex-row-reverse text-center sm:text-right">
                        <h3 className="font-bold text-lg md:text-xl text-slate-800">
                          تحليل نبض العملاء 🛰️
                        </h3>
                        <div className="text-[10px] md:text-[11px] font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 w-full w-full">
                          محلل الذكاء الاصطناعي مفعّل ✅
                        </div>
                      </div>

                      <div className="flex flex-col w-full ">
                        <div className="space-y-6">
                          <div className="bg-[#fdfbf7] p-3 md:p-4 rounded-2xl md:rounded-2xl border border-[#f0e6d2] shadow-inner">
                            <textarea
                              value={reviewInput}
                              onChange={(e) => setReviewInput(e.target.value)}
                              className="w-full bg-transparent border-0 resize-none outline-none text-right font-bold text-slate-700 placeholder:text-slate-300 text-sm md:text-base min-h-[120px]"
                              placeholder="أدخل ملاحظة عشوائية أو تعليقاً للتحليل السريع..."
                              rows={4}
                            />
                            <div className="flex flex-col gap-3 mt-4 md:mt-6">
                              <button
                                onClick={handleAddReview}
                                disabled={!reviewInput.trim() || isAnalyzing}
                                className="w-full bg-[#4a3f35] text-white px-6 md:px-8 py-4 rounded-xl md:rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 min-h-[44px]"
                              >
                                {isAnalyzing ? (
                                  <RefreshCw
                                    size={18}
                                    className="animate-spin"
                                  />
                                ) : (
                                  "تحليل النبض الفوري 🔍"
                                )}
                              </button>
                              <button
                                onClick={async () => {
                                  const pulseComments = (
                                    data?.pulseReviews || []
                                  )
                                    .map((r: any) => r.text)
                                    .filter(Boolean);
                                  const testimonialComments = (
                                    data?.testimonials || []
                                  )
                                    .map((t: any) => t.content)
                                    .filter(Boolean);
                                  const allComments = [
                                    ...pulseComments,
                                    ...testimonialComments,
                                  ];

                                  if (allComments.length === 0) {
                                    toast.info("لا توجد تعليقات مسجلة", {
                                      description:
                                        "لا يوجد أرشيف تعليقات مخزن لتحليله.",
                                    });
                                    return;
                                  }

                                  setIsPulseAnalyzing(true);
                                  // Allow UI to update before blocking the thread
                                  await new Promise((r) => setTimeout(r, 100));
                                  try {
                                    const analysis =
                                      await generatePulseArchiveAnalysis(
                                        allComments,
                                      );
                                    const newRecord: PulseAnalysisRecord = {
                                      ...analysis,
                                      id: Date.now().toString(),
                                      date: new Date().toLocaleString("en-GB", {
                                        timeZone: "Asia/Kuwait"
                                      }),
                                      commentsSnapshot: allComments,
                                    };

                                    setPulseArchiveAnalysis(analysis);
                                    const updatedHistory = [
                                      newRecord,
                                      ...(data?.pulseAnalysisHistory || []),
                                    ].slice(0, 10);
                                    setPulseAnalysisHistory(updatedHistory);

                                    onUpdateData({
                                      ...data,
                                      pulseArchiveAnalysis: analysis,
                                      pulseAnalysisHistory: updatedHistory,
                                    });
                                    toast.success(
                                      "تم الانتهاء من التحليل وحفظه",
                                      {
                                        description:
                                          "تم توليد التحليل الشامل وحفظه في سجل التحليلات للرجوع له لاحقاً.",
                                      },
                                    );
                                  } catch (error) {
                                    toast.error("فشل التحليل", {
                                      description:
                                        "حدث خطأ أثناء تحليل البيانات. تأكد من إعدادات الذكاء الاصطناعي.",
                                    });
                                  } finally {
                                    setIsPulseAnalyzing(false);
                                  }
                                }}
                                className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 py-4 rounded-xl transition-all flex items-center justify-center gap-2 border-2 border-indigo-50 bg-white min-h-[44px]"
                              >
                                <RefreshCw
                                  size={14}
                                  className={
                                    isPulseAnalyzing ? "animate-spin" : ""
                                  }
                                />
                                تحليل الأرشيف بالكامل
                              </button>

                              {pulseAnalysisHistory.length > 0 && (
                                <button
                                  onClick={() =>
                                    setShowPulseHistory(!showPulseHistory)
                                  }
                                  className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 py-3 rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-100 bg-slate-50/50"
                                >
                                  <History size={14} />
                                  {showPulseHistory
                                    ? "إخفاء سجل التحليلات"
                                    : `عرض سجل التحليلات (${pulseAnalysisHistory.length})`}
                                </button>
                              )}
                            </div>
                          </div>

                          {showPulseHistory && (
                            <div className="bg-white border-2 border-indigo-50 rounded-2xl p-3 md:p-3 shadow-sm space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                              <h4 className="text-xs font-bold text-indigo-600 text-right mb-4 flex items-center justify-end gap-2">
                                سجل التقارير السابقة <History size={14} />
                              </h4>
                              {pulseAnalysisHistory.map((record) => (
                                <div
                                  key={record.id}
                                  onClick={() => {
                                    setPulseArchiveAnalysis(record);
                                    setShowPulseHistory(false);
                                    toast.info("تم استرجاع التقرير", {
                                      description: `تم عرض نتائج تحليل تاريخ ${record.date}`,
                                    });
                                  }}
                                  className="p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:border-indigo-200 cursor-pointer transition-all text-right group"
                                >
                                  <div className="flex justify-between items-center flex-row-reverse mb-1">
                                    <span className="text-[10px] font-bold text-slate-700">
                                      {record.date}
                                    </span>
                                    <ChevronLeft
                                      size={12}
                                      className="text-slate-300 group-hover:text-indigo-500 transition-colors"
                                    />
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-bold line-clamp-1">
                                    {record.summary}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-4 max-h-[400px] md:max-h-[450px] overflow-y-auto custom-scrollbar pr-0 md:pr-4 border-r-0 md:border-r border-[#f0e6d2]">
                          <div className="sticky top-0 bg-white/90 backdrop-blur-sm p-2 mb-2 text-right border-b border-slate-100 z-10 flex items-center justify-end gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              نتائج التحليل اللحظية
                            </span>
                          </div>
                          {(reviews || []).map((r) => (
                            <div
                              key={r.id}
                              className="bg-slate-50 border border-slate-100 p-3 md:p-4 rounded-2xl flex flex-col group text-right hover:border-indigo-200 transition-all shadow-sm"
                            >
                              <div className="flex justify-between items-start flex-row-reverse w-full mb-1">
                                <div className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                                  {r.date || "منذ وقت"}
                                </div>
                              </div>
                              <div className="flex justify-between items-start flex-row-reverse w-full">
                                <div className="flex-1 pr-4">
                                  <p className="font-bold text-xs md:text-sm text-slate-700 leading-relaxed mb-3 whitespace-pre-wrap break-words">
                                    {r.text}
                                  </p>
                                  <div className="flex flex-wrap gap-2 justify-end">
                                    {r.topics && (
                                      <span className="text-[10px] md:text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold px-3 py-1.5 rounded-full inline-block whitespace-normal max-w-full">
                                        {r.topics}
                                      </span>
                                    )}
                                    <span
                                      className={cn(
                                        "text-[10px] md:text-[11px] font-bold px-3 py-1.5 rounded-full inline-block border whitespace-normal",
                                        (r.sentiment || "").includes("إيجابي")
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                          : (r.sentiment || "").includes("سلبي")
                                            ? "bg-rose-50 text-rose-700 border-rose-100"
                                            : "bg-amber-50 text-amber-700 border-amber-100",
                                      )}
                                    >
                                      {r.sentiment}
                                    </span>
                                  </div>

                                  {(r.level1 === 'إيجابي' || (r.sentiment && r.sentiment.includes("إيجابي"))) && (
                                    <div className="mt-3 px-3 py-2.5 rounded-xl text-right text-[10px] font-bold border shadow-sm bg-emerald-50 border-emerald-100 text-emerald-700 w-full">
                                      <span className="font-bold mb-1 text-xs flex items-center justify-end gap-1">
                                        {r.sentimentLabel || analyzeKuwaitiSentiment(r.text).label}
                                        <span className="relative flex h-2 w-2">
                                          <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping bg-emerald-400"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                      </span>
                                      <span className="block mt-1 opacity-90">{r.sentimentAlert || analyzeKuwaitiSentiment(r.text).alert}</span>
                                    </div>
                                  )}
                                  
                                  {(r.level1 === 'سلبي' || (r.sentiment && r.sentiment.includes("سلبي"))) && (
                                    <div className="mt-3 px-3 py-2.5 rounded-xl text-right text-[10px] font-bold border shadow-sm bg-rose-50 border-rose-100 text-rose-700 w-full">
                                      <span className="font-bold mb-1 text-xs flex items-center justify-end gap-1">
                                        {r.sentimentLabel || analyzeKuwaitiSentiment(r.text).label}
                                        <span className="relative flex h-2 w-2">
                                          <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping bg-rose-400"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                        </span>
                                      </span>
                                      <span className="block mt-1 opacity-90">{r.sentimentAlert || analyzeKuwaitiSentiment(r.text).alert}</span>
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteReview(r.id);
                                  }}
                                  className="text-rose-500 hover:text-rose-700 active:scale-90 transition-all p-3 md:p-2 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200/50 flex items-center justify-center shrink-0 self-start mt-1 shadow-sm"
                                  title="حذف التعليق"
                                >
                                  <Trash2 size={18} className="md:w-4 md:h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT PANEL FOR RESULTS */}
                    <div className="bg-white rounded-2xl p-3 md:p-4 border border-[#f0e6d2] shadow-sm flex flex-col">
                      <div className="text-right mb-6 border-b border-slate-100 pb-4">
                        <h3 className="font-bold text-xl text-slate-800 flex items-center justify-end gap-3">
                          <Sparkles className="text-amber-500" size={20} />{" "}
                          تقرير التحليل الشامل
                        </h3>
                        <p className="text-[11px] text-slate-500 font-bold mt-2 pr-8 leading-relaxed">
                          يعتمد هذا التقرير على تحليل الذكاء الاصطناعي لكافة
                          التقييمات والتعليقات التاريخية في الأرشيف.
                        </p>
                      </div>

                      {isPulseAnalyzing ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-3 md:p-3 text-center bg-slate-50/50 rounded-2xl border border-slate-100/50">
                          <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 mb-4 mx-auto !animate-pulse">
                            <RefreshCw size={28} className="animate-spin" />
                          </div>
                          <h4 className="font-bold text-slate-700 text-lg">
                            جاري تحليل الأرشيف...
                          </h4>
                          <p className="text-xs text-slate-500 font-bold mt-2">
                            يتم الآن قراءة التعليقات وفهم الانطباعات.
                          </p>
                        </div>
                      ) : pulseArchiveAnalysis ? (
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6 text-right">
                          {/* Summary */}
                          <div className="bg-indigo-50/50 border border-indigo-100/50 p-3 md:p-3 rounded-2xl">
                            <h4 className="text-[11px] font-bold text-indigo-600 mb-2 uppercase">
                              ملخص عام
                            </h4>
                            <p className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                              {pulseArchiveAnalysis?.summary ||
                                "جاري توليد الملخص..."}
                            </p>
                          </div>

                          {/* Sentiment Bar */}
                          <div className="space-y-3">
                            <h4 className="text-[11px] font-bold text-slate-500 uppercase">
                              تحليل المشاعر الإجمالي
                            </h4>
                            <div className="h-4 flex rounded-full overflow-hidden shadow-inner">
                              <div
                                className="bg-emerald-500"
                                style={{
                                  width: `${pulseArchiveAnalysis.sentiment?.positive || 0}%`,
                                }}
                                title={`إيجابي ${pulseArchiveAnalysis.sentiment?.positive || 0}%`}
                              />
                              <div
                                className="bg-amber-400"
                                style={{
                                  width: `${pulseArchiveAnalysis.sentiment?.neutral || 0}%`,
                                }}
                                title={`محايد ${pulseArchiveAnalysis.sentiment?.neutral || 0}%`}
                              />
                              <div
                                className="bg-rose-500"
                                style={{
                                  width: `${pulseArchiveAnalysis.sentiment?.negative || 0}%`,
                                }}
                                title={`سلبي ${pulseArchiveAnalysis.sentiment?.negative || 0}%`}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 px-1">
                              <span className="text-rose-500">
                                {pulseArchiveAnalysis.sentiment?.negative || 0}%
                                سلبي
                              </span>
                              <span className="text-amber-500">
                                {pulseArchiveAnalysis.sentiment?.neutral || 0}%
                                محايد
                              </span>
                              <span className="text-emerald-500">
                                {pulseArchiveAnalysis.sentiment?.positive || 0}%
                                إيجابي
                              </span>
                            </div>
                          </div>

                          {/* Top Keywords */}
                          <div className="space-y-3">
                            <h4 className="text-[11px] font-bold text-slate-500 uppercase">
                              أكثر الكلمات تكراراً
                            </h4>
                            <div className="flex flex-wrap gap-2 justify-end">
                              {(pulseArchiveAnalysis?.topKeywords || []).map(
                                (word: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="bg-white border border-slate-200/60 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 shadow-sm"
                                  >
                                    {word}
                                  </span>
                                ),
                              )}
                            </div>
                          </div>

                          {/* Strengths & Weaknesses */}
                          <div className="flex flex-col w-full ">
                            <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-2xl">
                              <h4 className="text-[11px] font-bold text-emerald-600 mb-3 flex items-center justify-end gap-2">
                                <TrendingUp size={14} /> أهم نقاط القوة
                              </h4>
                              <ul className="space-y-2 text-right text-xs font-bold text-slate-700">
                                {(pulseArchiveAnalysis?.strengths || []).map(
                                  (s: string, idx: number) => (
                                    <li key={idx}>• {s}</li>
                                  ),
                                )}
                              </ul>
                            </div>
                            <div className="bg-rose-50/50 border border-rose-100 p-3 rounded-2xl">
                              <h4 className="text-[11px] font-bold text-rose-600 mb-3 flex items-center justify-end gap-2">
                                <TrendingDown size={14} /> أبرز المشاكل
                              </h4>
                              <ul className="space-y-2 text-right text-xs font-bold text-slate-700">
                                {(pulseArchiveAnalysis?.weaknesses || []).map(
                                  (w: string, idx: number) => (
                                    <li key={idx}>• {w}</li>
                                  ),
                                )}
                              </ul>
                            </div>
                          </div>

                          {/* Recommendations */}
                          <div className="bg-[#fcfaf7] border border-[#f0e6d2] p-3 md:p-3 rounded-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-1 h-full bg-amber-500" />
                            <h4 className="text-[11px] font-bold text-amber-600 mb-3 flex items-center justify-end gap-2">
                              <CheckCircle2 size={14} /> توصيات واضحة للتحسين
                            </h4>
                            <div className="space-y-3">
                              {(
                                pulseArchiveAnalysis?.recommendations || []
                              ).map((rec: string, idx: number) => (
                                <div
                                  key={idx}
                                  className="text-sm font-bold text-slate-800 bg-white p-3 rounded-xl border border-slate-100 shadow-sm leading-relaxed"
                                >
                                  {rec}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-3 md:p-3 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/60">
                          <Cpu
                            className="text-slate-300 mb-4 opacity-50"
                            size={48}
                          />
                          <h4 className="font-bold text-slate-500 text-sm">
                            لم يتم تشغيل تحليل الأرشيف بعد
                          </h4>
                          <p className="text-xs text-slate-500 font-bold mt-2">
                            اضغط على زر (تحليل الأرشيف بالكامل) للحصول على تقرير
                            مفصل.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "growth" && (
              <div className="space-y-12">
                <React.Suspense
                  fallback={
                    <div className="h-64 animate-pulse bg-slate-100 rounded-2xl" />
                  }
                >
                  <GoalManager data={data} onUpdateData={onUpdateData} />
                </React.Suspense>
                <React.Suspense
                  fallback={
                    <div className="h-64 animate-pulse bg-slate-100 rounded-2xl" />
                  }
                >
                  <KuwaitSeasonalCalendar data={data} />
                </React.Suspense>
                <React.Suspense
                  fallback={
                    <div className="h-64 animate-pulse bg-slate-100 rounded-2xl" />
                  }
                >
                  <div id="smart-campaigns">
                    <MarketingLab data={data} />
                  </div>
                </React.Suspense>
              </div>
            )}
          </motion.div>
            )}
        </AnimatePresence>
      </div>

        {/* Anticipatory Intelligence: Smart Assistant */}
        <AnimatePresence>
          {showContextualAssist && !isExecutiveMode && false && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-24 left-4 md:left-8 z-40 bg-white border border-slate-100 p-4 md:pl-6 rounded-2xl md:rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.12)] flex flex-col md:flex-row items-start md:items-center gap-4 max-w-[90vw] md:max-w-none"
              dir="rtl"
            >
              <div className="flex items-center gap-3 w-full md:w-auto">
                 <div className="relative flex-shrink-0 w-10 h-10 flex items-center justify-center bg-indigo-50 rounded-full">
                   <div className="absolute inset-0 border border-indigo-200 rounded-full animate-ping opacity-50" />
                   <Sparkles size={20} className="text-indigo-600 relative z-10" />
                 </div>
                 <div className="flex flex-col">
                   <p className="text-slate-900 font-bold text-[13px] md:text-sm">حركة نشطة اليوم!</p>
                   <p className="text-slate-500 text-[11px] md:text-xs font-bold leading-relaxed">
                     تم تسجيل {totals.orders} طلبات، هل أقوم بتصدير قائمة التجهيز للمطبخ؟
                   </p>
                 </div>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t border-slate-100 md:border-t-0 md:mr-4">
                <button 
                  onClick={() => {
                    toast.success("تم إرسال القائمة بتنسيق فوري للمطبخ!", {
                      icon: <CheckCircle className="text-emerald-500" />
                    });
                    setShowContextualAssist(false);
                  }}
                  className="flex-1 md:flex-none bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold text-[13px] shadow-lg shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all"
                >
                  نعم، تصدير
                </button>
                <button 
                  onClick={() => setShowContextualAssist(false)}
                  className="px-4 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-600 transition-colors rounded-full font-bold text-[13px]"
                >
                  تجاهل
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Anticipatory Intelligence: EOM Report */}
        <AnimatePresence>
          {isMonthEnd() && !isExecutiveMode && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 200, delay: 1 }}
              className="fixed bottom-24 left-8 z-50 flex items-center gap-4 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 pl-6 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
              dir="rtl"
            >
              <div className="relative">
                <Sparkles size={24} className="text-amber-400 absolute inset-0 animate-ping opacity-50" />
                <Sparkles size={24} className="text-amber-400 relative z-10" />
              </div>
              <div className="flex flex-col">
                <p className="text-white font-bold text-sm">شارف الشهر على الانتهاء</p>
                <p className="text-slate-300 text-xs font-medium">هل نُعدّ تقرير الإقفال المالي الذكي؟</p>
              </div>
              <button 
                onClick={() => {
                  toast.success("جاري إعداد تقرير الإقفال المالي الشامل...", {
                    icon: <CheckCircle className="text-emerald-500" />
                  });
                  setTimeout(() => window.print(), 1000);
                }}
                className="ml-2 mr-6 bg-white text-slate-900 px-5 py-2.5 rounded-full font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                إعداد التقرير
              </button>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Time Slider (Minimalist) */}
        {!isExecutiveMode && (
          <div className="fixed bottom-3 left-0 right-0 z-[90] p-4 flex justify-center pointer-events-none fade-in animate-in slide-in-from-bottom-10 duration-700 delay-500">
            <div className="bg-white/70 backdrop-blur-3xl rounded-[2rem] py-3.5 px-6 flex flex-col items-center gap-2.5 shadow-2xl pointer-events-auto w-[90%] max-w-[340px] border border-white/50 ring-1 ring-slate-900/5 transition-all hover:bg-white/80">
              <input 
                type="range"
                min="0"
                max="4"
                value={["all", "year", "month", "week", "day"].indexOf(dateFilter)}
                onChange={(e) => {
                  const map = ["all", "year", "month", "week", "day"];
                  startTransition(() => setDateFilter(map[parseInt(e.target.value)] as any));
                }}
                className="w-full h-1 bg-slate-200/80 rounded-full appearance-none cursor-grab active:cursor-grabbing outline-none transition-all duration-300
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                [&::-webkit-slider-thumb]:bg-slate-800 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
                style={{ direction: 'ltr' }}
              />
              
              <div className="flex justify-between w-full text-[10px] font-sans font-extrabold text-slate-400 px-0.5" style={{ direction: 'ltr' }}>
                <span onClick={() => startTransition(() => setDateFilter("all"))} className={cn("cursor-pointer transition-all duration-200 flex-1 text-left", dateFilter === "all" ? "text-slate-800 scale-110" : "hover:text-slate-600")}>الكل</span>
                <span onClick={() => startTransition(() => setDateFilter("year"))} className={cn("cursor-pointer transition-all duration-200 flex-1 text-center", dateFilter === "year" ? "text-slate-800 scale-110" : "hover:text-slate-600")}>سنة</span>
                <span onClick={() => startTransition(() => setDateFilter("month"))} className={cn("cursor-pointer transition-all duration-200 flex-1 text-center", dateFilter === "month" ? "text-slate-800 scale-110" : "hover:text-slate-600")}>شهر</span>
                <span onClick={() => startTransition(() => setDateFilter("week"))} className={cn("cursor-pointer transition-all duration-200 flex-1 text-center", dateFilter === "week" ? "text-slate-800 scale-110" : "hover:text-slate-600")}>أسبوع</span>
                <span onClick={() => startTransition(() => setDateFilter("day"))} className={cn("cursor-pointer transition-all duration-200 flex-1 text-right", dateFilter === "day" ? "text-slate-800 scale-110" : "hover:text-slate-600")}>اليوم</span>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  },
);

export default Dashboard;
