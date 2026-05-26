const isSuccessfulPayerForDisplay = (payer: any) => {
  const status = String(
    payer?.status || payer?.paymentStatus || payer?.state || "",
  ).toLowerCase();
  if (
    [
      "failed",
      "declined",
      "cancelled",
      "canceled",
      "pending",
      "unpaid",
      "لم يدفع",
      "فشل",
    ].some((x) => status.includes(x))
  )
    return false;
  return (
    payer?.paid === true ||
    payer?.isPaid === true ||
    status.includes("paid") ||
    status.includes("success") ||
    status.includes("captured") ||
    Number(payer?.amount || payer?.paidAmount || 0) > 0
  );
};

import { getUnifiedInvoices, normalizeArabicNumerals, normalizeArabic } from "../lib/utils";
import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  RefreshCw,
  Printer,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Package,
  User,
  CreditCard,
  Clock,
  CheckCircle2,
  X,
  TrendingUp,
  Plus,
  MessageSquare,
  Users,
  Dices,
  XCircle,
  AlertCircle,
  AlertTriangle,
  ClipboardList,
  Puzzle,
} from "lucide-react";
import { AppState, Invoice } from "../types";
import { DEFAULT_GLOBAL_LOGO } from "../constants";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import ConfirmModal from "./ui/ConfirmModal";
import { toast } from "sonner";
import { recalculateStateBalances } from "../lib/business-logic";
import {
  isPaidStatus,
  isPendingStatus,
  isFailedStatus,
  isCancelledStatus,
} from "../lib/status-utils";
import {
  computeInvoiceTotal,
  computeInvoiceCost,
  computeInvoiceProfit,
  computeInvoiceAddonsTotal,
  computeInvoiceItemBasePrice,
  computeInvoiceItemTotal,
  computeInvoiceSubtotal,
} from "../lib/invoice-calculations";
import OrderPage from "./OrderPage";

const getInvoiceAddress = (inv: any, customerObj?: any): string => {
  if (inv.fullAddress) return inv.fullAddress;
  if (inv.deliveryAddressSnapshot?.fullAddress) return inv.deliveryAddressSnapshot.fullAddress;
  
  const addr = inv.address || customerObj?.address || customerObj?.detailedAddress;
  if (addr && addr !== "غير محدد") {
    if (typeof addr === "object") {
      const parts = [
        addr.region || addr.area || "",
        addr.block ? `قطعة ${addr.block}` : "",
        addr.street ? `شارع ${addr.street}` : "",
        addr.jaddah || addr.avenue ? `جادة ${addr.jaddah || addr.avenue}` : "",
        addr.building || addr.house ? `منزل/قسيمة ${addr.building || addr.house}` : "",
        addr.floor ? `دور ${addr.floor}` : "",
        addr.apartment ? `شقة ${addr.apartment}` : ""
      ];
      return parts.filter(Boolean).join(" - ");
    }
    return String(addr);
  }
  return "";
};

interface ReportsPageProps {
  data: AppState;
  setData: React.Dispatch<React.SetStateAction<AppState>>;
  defaultTab?: "invoices" | "tax" | "pnl" | "orders";
  onEditInvoice?: (id: string) => void;
  deepLinkData?: {
    search?: string;
    exactId?: string;
    supplierId?: string;
    openModal?: boolean;
  };
  onClearDeepLink?: () => void;
  setCurrentPage?: (page: string) => void;
  setDeepLinkData?: (data: any) => void;
  isPartner?: boolean;
}

const ReportsPage: React.FC<ReportsPageProps> = React.memo(
  ({
    data,
    setData,
    defaultTab = "invoices",
    onEditInvoice,
    deepLinkData,
    onClearDeepLink,
    setCurrentPage,
    setDeepLinkData,
    isPartner = false,
  }) => {
    const [activeTab, setActiveTab] = useState<
      "invoices" | "tax" | "pnl" | "orders"
    >(defaultTab as any);
    const [search, setSearch] = useState("");

    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    )
      .toISOString()
      .split("T")[0];
    const [customDateRange, setCustomDateRange] = useState({
      start: startOfToday,
      end: startOfToday,
    });

    // ADMINFIX_REPORTS_READ_URL_ORDER_INVOICE
    useEffect(() => {
      const params = new URLSearchParams(window.location.search);

      let targetId =
        params.get("invoice") ||
        params.get("order") ||
        params.get("tracked_order") ||
        params.get("requested_order_id") ||
        params.get("order_id") ||
        "";

      if (!targetId) {
        try {
          const saved = sessionStorage.getItem("adminPushDeepLink");
          if (saved) {
            const parsed = JSON.parse(saved);
            targetId = parsed?.search || parsed?.fullId || "";
          }
        } catch {}
      }

      if (!targetId) return;

      setActiveTab("invoices");
      setSearch(String(targetId));

      try {
        sessionStorage.removeItem("adminPushDeepLink");
        window.history.replaceState({}, "", "/");
      } catch {}
    }, []);

    // REPORTS_PAGE_DIRECT_URL_DEEPLINK
    useEffect(() => {
      const params = new URLSearchParams(window.location.search);

      let targetId =
        params.get("invoice") ||
        params.get("order") ||
        params.get("tracked_order") ||
        params.get("requested_order_id") ||
        params.get("order_id") ||
        "";

      if (!targetId) {
        try {
          const saved = sessionStorage.getItem("adminPushDeepLink");
          if (saved) {
            const parsed = JSON.parse(saved);
            targetId = parsed?.search || parsed?.fullId || "";
          }
        } catch {}
      }

      if (!targetId && !deepLinkData?.search) return;

      const finalSearch = String(targetId || deepLinkData?.search || "");

      setActiveTab("invoices");
      setSearch(finalSearch);

      try {
        sessionStorage.removeItem("adminPushDeepLink");
        window.history.replaceState({}, "", "/");
      } catch {}

      if (typeof onClearDeepLink === "function") {
        setTimeout(() => onClearDeepLink(), 300);
      }
    }, [deepLinkData?.search]);

    // reportsPushDeepLinkHandled
    // Push/PWA click deep links open ReportsPage -> invoices tab -> full ID search.
    useEffect(() => {
      if (!deepLinkData?.search) return;

      const searchValue = String(deepLinkData.search || "");

      setActiveTab("invoices");
      setSearch(searchValue);

      if (typeof onClearDeepLink === "function") {
        setTimeout(() => onClearDeepLink(), 300);
      }
    }, [deepLinkData?.search, (deepLinkData as any)?.tab]);

    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [shakingId, setShakingId] = useState<string | null>(null);

    useEffect(() => {
      if (deepLinkData?.search) {
        setSearch(deepLinkData.search);
        setTimeout(() => {
          const input = document.getElementById(
            "search-input",
          ) as HTMLInputElement;
          if (input) input.focus();
        }, 100);
        if (onClearDeepLink) onClearDeepLink();
      }
    }, [deepLinkData, onClearDeepLink]);

    const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(
      null,
    );
    const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
    const [timeFilter, setTimeFilter] = useState<
      "all" | "today" | "week" | "month" | "custom"
    >("all");
    const [startDate, setStartDate] = useState(
      new Date().toISOString().split("T")[0],
    );
    const [endDate, setEndDate] = useState(
      new Date().toISOString().split("T")[0],
    );

    const cancelledOrderInvoiceIds = new Set(
      (data?.orders || [])
        .filter(
          (o) =>
            o.status === "cancelled" &&
            o.isConvertedToInvoice &&
            o.linkedInvoiceId,
        )
        .map((o) => o.linkedInvoiceId as string),
    );
    const activeInvoices = getUnifiedInvoices(data).filter(
      (inv) => !inv.isDeleted && !cancelledOrderInvoiceIds.has(inv.id),
    );

    const filteredInvoices = activeInvoices
      .filter((inv) => {
        const customer = (data?.customers || []).find(
          (c) => c.id === inv.customerId,
        );
        const noteValue =
          inv.notes ||
          (inv as any).customerNotes ||
          (inv as any).instruction ||
          (inv as any).note ||
          (inv as any).comments;
        const noteStr =
          typeof noteValue === "string"
            ? noteValue
            : noteValue
              ? JSON.stringify(noteValue)
              : "";

        const productNames = (inv.items || [])
          .map((item: any) => {
            const p = (data?.products || []).find(
              (prod: any) => prod.id === item.productId,
            );
            return (p?.name || "").toLowerCase();
          })
          .join(" ");

        const normSearch = normalizeArabic(search);
        const matchesSearch =
          (inv.id || "").toLowerCase().includes(search.toLowerCase()) ||
          normalizeArabic(customer?.name || "").includes(normSearch) ||
          (customer?.phone || "").includes(search) ||
          normalizeArabic((inv as any).customerName || "")
            .includes(normSearch) ||
          ((inv as any).customerPhone || "").includes(search) ||
          normalizeArabic(productNames).includes(normSearch) ||
          normalizeArabic(noteStr).includes(normSearch);

        if (timeFilter === "all") return matchesSearch;
        const invDate = new Date(inv.date);
        const now = new Date();
        if (timeFilter === "today")
          return matchesSearch && invDate.toDateString() === now.toDateString();
        if (timeFilter === "week") {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return matchesSearch && invDate >= weekAgo;
        }
        if (timeFilter === "month") {
          const monthAgo = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            now.getDate(),
          );
          return matchesSearch && invDate >= monthAgo;
        }
        if (timeFilter === "custom") {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return matchesSearch && invDate >= start && invDate <= end;
        }
        return matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return b.id.localeCompare(a.id);
      });

    const handleDeleteInvoice = (id: string) => {
      if (id.startsWith("ORD-")) {
        import("sonner").then((m) =>
          m.toast.error(
            "طلبات التطبيق ما تنحذف من سجل الفواتير. عدلها من قسم الطلبات.",
          ),
        );
        return;
      }
      const invoiceToDeleteObj = getUnifiedInvoices(data).find(
        (inv) => inv.id === id,
      );
      if (!invoiceToDeleteObj) return;

      if (isPaidStatus(invoiceToDeleteObj.paymentStatus)) {
        import("sonner").then((m) =>
          m.toast.error(
            "هذه الفاتورة مدفوعة ولا يمكن حذفها نهائياً! 🚫",
          ),
        );
        return;
      }

      setData((prev) => {
        const updatedInvoices = (prev?.invoices || []).map((inv) =>
          inv.id === id ? { ...inv, isDeleted: true } : inv,
        );
        const updatedProducts = (prev?.products || []).map((p) => {
          const item = invoiceToDeleteObj.items.find(
            (it) => it.productId === p.id,
          );
          if (item) {
            return { ...p, stock: (p.stock || 0) + item.quantity };
          }
          return p;
        });
        const nextState = {
          ...prev,
          invoices: updatedInvoices,
          products: updatedProducts,
        };
        return recalculateStateBalances(nextState);
      });
      toast.info("تم حذف الفاتورة", {
        description: `تم إخفاء الفاتورة #${id} واستعادة المخزون وتحديث الحسابات بنجاح.`,
        position: "bottom-right",
      });
      setInvoiceToDelete(null);
    };

    const handlePrint = (invoice: Invoice) => {
      import("../lib/printUtils").then(({ generateInvoiceHTML }) => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;
        const htmlContent = generateInvoiceHTML(invoice, data);
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      });
    };

    const handleEditInvoice = (invoice: Invoice) => {
      if (invoice.id.startsWith("ORD-")) {
        import("sonner").then((m) =>
          m.toast.error(
            "ما يصير نعدل طلبات التطبيق من سجل الفواتير. عدلها من قسم الطلبات.",
          ),
        );
        return;
      }
      if (isPaidStatus(invoice.paymentStatus)) {
        import("sonner").then((m) =>
          m.toast.error(
            "هذه الفاتورة مدفوعة ولا يمكن تعديل بياناتها! 🚫",
          ),
        );
        return;
      }
      if (onEditInvoice) {
        onEditInvoice(invoice.id);
      } else {
        alert("ميزة تعديل الفاتورة ستكون متوفرة من خلال الصفحة الرئيسية.");
      }
    };

    const handleTogglePaymentStatus = (
      invoiceId: string,
      currentStatus: string | undefined,
    ) => {
      setData((prev) => {
        const newStatus = currentStatus === "paid" ? "pending" : "paid";
        const newInvoices = prev.invoices.map((inv) =>
          inv.id === invoiceId
            ? {
                ...inv,
                paymentStatus: newStatus as any,
                status: newStatus === "paid" ? "مدفوعة" : "بانتظار الدفع",
              }
            : inv,
        );
        const newOrders = (prev.orders || []).map((order) =>
          order.linkedInvoiceId === invoiceId || order.id === invoiceId
            ? {
                ...order,
                status:
                  newStatus === "paid"
                    ? "تم الدفع وجاري التوصيل"
                    : "بانتظار الدفع",
                paymentStatus: newStatus as any,
              }
            : order,
        );
        const newState = { ...prev, invoices: newInvoices, orders: newOrders };
        return recalculateStateBalances(newState as AppState);
      });
      toast.success(
        currentStatus === "paid"
          ? "تم تغيير حالة الدفع إلى معلق"
          : "تمت عملية الدفع بنجاح 💸",
      );
    };

    const handleRegeneratePayment = async (invoice: Invoice) => {
      const customer = (data.customers || []).find(
        (c) => c.id === invoice.customerId,
      );
      const invoiceId = invoice.id;
      const loadingToast = toast.loading("نجهز رابط دفع جديد...");
      try {
        const response = await fetch("/api/create-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(Number(invoice.totalAmount).toFixed(3)),
            isAdmin: true,
            customerName: customer?.name || "Customer",
            customerEmail: customer?.email || "no-email@example.com",
            customerMobile: customer?.phone || "+96500000000",
            orderId: invoiceId,
            description: `Invoice ${invoiceId} (Regenerated)`,
            returnUrl: `https://alturathkw.shop/api/payment-return/${invoiceId}`,
            cancelUrl: `https://alturathkw.shop/api/payment-return/${invoiceId}`,
            notificationUrl: `https://admin.alturathkw.shop/api/webhook/upayments`,
          }),
        });
        const paymentData = await response.json();
        if (response.ok) {
          const createdLink =
            paymentData.paymentLink ||
            paymentData.payment_url ||
            paymentData.paymentURL ||
            paymentData.paymentUrl ||
            paymentData.url ||
            paymentData.link ||
            paymentData.data?.paymentLink ||
            paymentData.data?.payment_url ||
            paymentData.data?.paymentURL ||
            paymentData.data?.paymentUrl ||
            paymentData.data?.url ||
            paymentData.data?.link ||
            (typeof paymentData.data === "string" && /^https?:\/\//i.test(paymentData.data) ? paymentData.data : "") ||
            "";
          const createdPaymentId =
            paymentData.paymentId ||
            paymentData.payment_id ||
            paymentData.session_id ||
            paymentData.data?.paymentId ||
            paymentData.data?.payment_id ||
            paymentData.data?.session_id ||
            "";
          if (createdLink) {
            setData((prev) => {
              const newInvoices = (prev?.invoices || []).map((inv) =>
                inv.id === invoiceId
                  ? {
                      ...inv,
                      paymentLink: createdLink,
                      paymentId: createdPaymentId,
                      paymentStatus: "pending",
                      status: "بانتظار الدفع",
                    }
                  : inv,
              );
              const newOrders = (prev?.orders || []).map((o) =>
                o.linkedInvoiceId === invoiceId || o.id === invoiceId
                  ? {
                      ...o,
                      paymentLink: createdLink,
                      paymentId: createdPaymentId,
                      paymentStatus: "pending",
                      status: "بانتظار الدفع",
                    }
                  : o,
              );
              return { ...prev, invoices: newInvoices, orders: newOrders };
            });
            toast.dismiss(loadingToast);
            toast.success("تم إنشاء رابط الدفع الجديد بنجاح!");
            setTimeout(() => {
              const waLink = getWhatsAppLink({
                ...invoice,
                paymentLink: createdLink,
              });
              if (waLink && waLink !== "#")
                window.open(waLink, "_blank", "noopener,noreferrer");
            }, 500);
          } else {
            toast.dismiss(loadingToast);
            toast.error("ما وصلنا الرابط من الرد");
          }
        } else {
          toast.dismiss(loadingToast);
          toast.error("خطأ: " + (paymentData.message || "ما قدرنا ننشئ الرابط"));
        }
      } catch (error) {
        console.error("Regenerate Error:", error);
        toast.dismiss(loadingToast);
        toast.error("الاتصال بخادم الدفع تعطل");
      }
    };

    const getWhatsAppLink = (invoice: Invoice) => {
      const customer = (data?.customers || []).find(
        (c) => c.id === invoice.customerId,
      );
      const order = (data?.orders || []).find(
        (o) =>
          o.linkedInvoiceId === invoice.id ||
          o.id === (invoice as any).linkedOrderId,
      );

      let phone =
        customer?.phone ||
        (order as any)?.customerPhone ||
        (invoice as any).customerPhone ||
        (invoice as any).phone ||
        "";
      let cleanPhone = phone.replace(/[^0-9]/g, "");
      if (cleanPhone.length === 8) {
        cleanPhone = "965" + cleanPhone;
      }

      if (!cleanPhone) {
        return "#";
      }

      let productsSubtotal = 0;
      let addonsSubtotal = 0;

      const items = (invoice?.items || [])
        .map((item) => {
          const p = (data?.products || []).find(
            (prod) => prod.id === item.productId,
          );
          const price = computeInvoiceItemBasePrice(item, data?.products || []);
          const itemProductTotal = price * (item.quantity || 1);
          productsSubtotal += itemProductTotal;

          let addonsLines: string[] = [];
          if (Array.isArray(item.addons) && item.addons.length > 0) {
            item.addons.forEach((addon: any) => {
              let addonQty = 0;
              if (addon.calculationType === "fixed") addonQty = 1;
              else if (addon.calculationType === "per_x_items")
                addonQty = Math.ceil(
                  (item.quantity || 1) / (addon.xItemsThreshold || 1),
                );
              else addonQty = item.quantity || 1;
              addonQty = Math.max(
                addon.minQuantity || 0,
                Math.min(addonQty, addon.maxQuantity || addonQty),
              );

              if (addonQty > 0) {
                const aTotal =
                  Number(addon.price || 0) *
                  Math.max(0, addonQty - (addon.freeQuantity || 0));
                addonsSubtotal += aTotal;
                addonsLines.push(
                  `   - ${addon.name}${addonQty > 1 ? ` x ${addonQty}` : ""}: ${aTotal.toFixed(3)} د.ك`,
                );
              }
            });
          }

          return `${p?.name || "منتج غير معروف"}\n   الكمية: ${item.quantity || 1}\n   السعر الفردي: ${price.toFixed(3)} د.ك\n   إجمالي المنتج: ${itemProductTotal.toFixed(3)} د.ك${addonsLines.length > 0 ? "\n\n   الإضافات:\n" + addonsLines.join("\n") : ""}`;
        })
        .join("\n");

      let total = Number((invoice as any).totalAmount || (invoice as any).total || 0);
      try { total = computeInvoiceTotal(invoice, data?.products || []); } catch {}
      const paymentLink =
        invoice.paymentLink ||
        (invoice as any).paymentUrl ||
        (invoice as any).payment_url ||
        (invoice as any).url ||
        (invoice as any).link ||
        (invoice as any).splitLink ||
        (invoice as any).split_link ||
        (invoice as any).split_url;

      const isPaidNow =
        isPaidStatus(invoice.paymentStatus) &&
        !(
          String(invoice.status).includes("تجميع القطية") ||
          invoice.status === "split_pending"
        );
      const invoiceEmoji = "\u2728";
      const linkEmoji = "\u2705";
      const trackingUrl = `https://alturathkw.shop/track?tracked_order=${encodeURIComponent(String(invoice.id))}`;
      const paymentSection =
        paymentLink && paymentLink.trim() !== "" && !isPaidNow
          ? `
${linkEmoji} رابط الدفع:
${paymentLink}
`
          : "";

      const promoCodeName = invoice.appliedPromoCodeName;
      const discount = Number(invoice.discount) || 0;
      const promoLine =
        discount > 0
          ? `الخصم${promoCodeName ? ` (${promoCodeName})` : ""}: ${Number(discount).toFixed(3)} د.ك
`
          : "";

      const addressText =
        invoice.address && invoice.address !== "غير محدد"
          ? `${typeof invoice.address === "object" ? [
              invoice.address.region || "",
              invoice.address.block ? `قطعة ${invoice.address.block}` : "",
              invoice.address.street ? `شارع ${invoice.address.street}` : "",
              invoice.address.building ? `منزل ${invoice.address.building}` : "",
            ].filter(Boolean).join(" - ") : invoice.address}`
          : invoice.deliveryInfo?.zoneName || "غير محدد";

      const customerName = customer?.name || "عميلنا العزيز";
      const message = `${invoiceEmoji} فاتورة طلبكم من مطبخ التراث الكويتي

مرحباً ${customerName}،
تم تجهيز فاتورتكم للطلب رقم: ${invoice.id}

الإجمالي المستحق: ${Number(total).toFixed(3)} د.ك

لتتبع الطلب:
${trackingUrl}
${paymentSection}
شكراً لثقتكم
Alturath.kw`;

      let finalMessage = message;
      if (
        (invoice as any).splitType === "traditional" &&
        Array.isArray((invoice as any).splitPayments)
      ) {
        const splitText =
          `\n\n*المشاركين بالقطية:*\n` +
          (invoice as any).splitPayments
            .map(
              (sp: any) =>
                `- ${sp.name || "مشارك"} (${sp.phone || "بدون رقم"}) - ${Number(sp.amount || 0).toFixed(3)} د.ك`,
            )
            .join("\n");
        finalMessage = message.replace(
          "شكراً لثقتكم",
          splitText + "\n\nشكراً لتعاملكم",
        );
      } else if (
        (invoice as any).splitType === "roulette" &&
        Array.isArray((invoice as any).splitParticipants)
      ) {
        const participants = (invoice as any).splitParticipants
          .map((p: any) =>
            typeof p === "object"
              ? `${p.name || ""} ${p.phone ? `(${p.phone})` : ""}`.trim()
              : p,
          )
          .join("، ");
        const splitText = `\n\n*الروليت*\nالمشاركون: ${participants}\n*بطل الليلة اللي دفعها:* ${(invoice as any).rouletteLoser || "غير معروف"}`;
        finalMessage = message.replace(
          "شكراً لثقتكم",
          splitText + "\n\nشكراً لتعاملكم",
        );
      }

      const sanitizeWhatsAppText = (text: string) =>
        String(text || "").replace(/[\u{1F000}-\u{1FAFF}]/gu, "").replace(/\uFFFD/g, "");
      return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(sanitizeWhatsAppText(finalMessage))}`;
    };

    return (
      <div className="space-y-6">
        {/* Tab Selector */}
        <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-2xl w-fit self-end shadow-inner">
          <button
            onClick={() => setActiveTab("invoices")}
            className={cn(
              "px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2",
              activeTab === "invoices"
                ? "bg-white text-slate-900 shadow-md scale-105"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            <FileText size={16} />
            <span>الفواتير</span>
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={cn(
              "px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 relative",
              activeTab === "orders"
                ? "bg-white text-slate-900 shadow-md scale-105"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            <ClipboardList size={16} />
            <span>الطلبات</span>
            {(data.orders || []).filter(
              (o) => !o.isConvertedToInvoice && o.status !== "cancelled",
            ).length > 0 && (
              <span className="absolute -top-1 -left-1 bg-amber-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm animate-pulse">
                {
                  (data.orders || []).filter(
                    (o) => !o.isConvertedToInvoice && o.status !== "cancelled",
                  ).length
                }
              </span>
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "orders" ? (
            <motion.div
              key="orders-tab"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <OrderPage
                data={data}
                setData={setData}
                setCurrentPage={setCurrentPage || (() => {})}
                setDeepLinkData={setDeepLinkData}
                isPartner={false}
              />
            </motion.div>
          ) : (
            <motion.div
              key="invoices-tab"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-3 md:mb-0">
                <div className="bg-white p-2.5 md:p-4 rounded-[14px] md:rounded-2xl border border-slate-200/60 shadow-sm text-right flex flex-col justify-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-0.5 md:mb-1">
                    عدد الفواتير
                  </div>
                  <div className="text-xl md:text-3xl font-bold text-slate-900 tracking-tighter">
                    {filteredInvoices.length}
                  </div>
                </div>
                <div className="bg-white p-2.5 md:p-4 rounded-[14px] md:rounded-2xl border border-slate-200/60 shadow-sm text-right flex flex-col justify-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-0.5 md:mb-1">
                    إجمالي المبيعات
                  </div>
                  <div className="text-xl md:text-3xl font-bold text-primary tracking-tighter truncate">
                    {Math.max(
                      0,
                      filteredInvoices
                        .filter(
                          (inv) =>
                            (isPaidStatus(inv.paymentStatus) ||
                              (inv.paymentStatus === undefined &&
                                !isCancelledStatus((inv as any).status) &&
                                !isFailedStatus((inv as any).status))) &&
                            !String(inv.status).includes("تجميع القطية") &&
                            inv.paymentStatus !== "split_pending" &&
                            inv.status !== "split_pending",
                        )
                        .reduce(
                          (a, b) => a + Math.max(0, Number(b.totalAmount || 0)),
                          0,
                        ),
                    ).toFixed(3)}
                    <span className="text-sm font-bold mr-1">د.ك</span>
                  </div>
                </div>
                <div className="bg-white p-2.5 md:p-4 rounded-[14px] md:rounded-2xl border border-slate-200/60 shadow-sm text-right flex flex-col justify-center col-span-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase mb-0.5 md:mb-1">
                    إجمالي الربح
                  </div>
                  <div className="text-xl md:text-3xl font-bold text-emerald-600 tracking-tighter truncate">
                    {Math.max(
                      0,
                      filteredInvoices
                        .filter(
                          (inv) =>
                            (isPaidStatus(inv.paymentStatus) ||
                              (inv.paymentStatus === undefined &&
                                !isCancelledStatus((inv as any).status) &&
                                !isFailedStatus((inv as any).status))) &&
                            !String(inv.status).includes("تجميع القطية") &&
                            inv.paymentStatus !== "split_pending" &&
                            inv.status !== "split_pending",
                        )
                        .reduce(
                          (a, b) =>
                            a +
                            Math.max(
                              0,
                              computeInvoiceProfit(b, data?.products || []),
                            ),
                          0,
                        ),
                    ).toFixed(3)}
                    <span className="text-sm font-bold mr-1">د.ك</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-3 md:p-3 border border-slate-200/60 shadow-sm text-right">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
                  <div className="relative flex-1">
                    <Search
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                      size={18}
                    />
                    <input
                      id="search-input"
                      type="text"
                      placeholder="ابحث برقم الفاتورة أو اسم العميل..."
                      value={search}
                      onChange={(e) => {
                        let val = normalizeArabicNumerals(e.target.value);
                        if (/^[0-9]*$/.test(val)) {
                          val = val.slice(0, 8);
                        }
                        setSearch(val);
                      }}
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-right"
                    />
                  </div>
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    {["all", "today", "week", "month", "custom"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setTimeFilter(f as any)}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all",
                          timeFilter === f
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-600",
                        )}
                      >
                        {f === "all"
                          ? "الكل"
                          : f === "today"
                            ? "اليوم"
                            : f === "week"
                              ? "أسبوع"
                              : f === "month"
                                ? "شهر"
                                : "مخصص"}
                      </button>
                    ))}
                  </div>
                </div>

                {timeFilter === "custom" && (
                  <div className="flex items-center gap-4 mb-8 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                    <div className="flex-1 text-right">
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        من
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-200/60 outline-none"
                      />
                    </div>
                    <div className="flex-1 text-right">
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        إلى
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full p-2 rounded-lg border border-slate-200/60 outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-right min-w-[900px]" dir="rtl">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500 text-[10px] uppercase text-right">
                        <th className="p-3 md:p-3">رقم الفاتورة</th>
                        <th className="p-3 md:p-3">العميل</th>
                        <th className="p-3 md:p-3">التاريخ</th>
                        <th className="p-3 md:p-3">طريقة الدفع</th>
                        <th className="p-3 md:p-3">المستحق</th>
                        <th className="p-3 md:p-3 text-left pr-10">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(filteredInvoices || []).length === 0 ? (
                        <tr key="empty-state">
                          <td colSpan={6} className="py-20 px-4 text-center">
                            <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                              <div className="w-24 h-24 mb-6 rounded-3xl bg-primary/5 flex items-center justify-center text-primary/40 relative">
                                <div className="absolute inset-0 bg-primary/10 rounded-3xl animate-ping opacity-20" />
                                <TrendingUp size={48} />
                              </div>
                              <h3 className="text-xl md:text-3xl font-bold text-slate-800 mb-3 tracking-tight">
                                ماكو فواتير!
                              </h3>
                              <p className="text-slate-500 font-bold mb-8 leading-relaxed">
                                لم تقم بإصدار أي فاتورة حتى الآن. الذكاء
                                الاصطناعي بانتظار أول عملية بيع ليرسم لك
                                استراتيجية النمو.
                              </p>
                              {!isPartner && (
                                <button
                                  onClick={() => {
                                    if (onEditInvoice) onEditInvoice("new");
                                  }}
                                  className="bg-primary text-white hover:bg-primary/90 px-4 md:px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all active:scale-95 hover:rotate-1 mx-auto"
                                >
                                  <Plus size={24} />
                                  <span>ابدأ رحلتك وضيف أول فاتورة الآن!</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        (filteredInvoices || []).map((inv) => {
                          const customer = (data?.customers || []).find(
                            (c) => c.id === inv.customerId,
                          );
                          const isExpanded = expandedInvoiceId === inv.id;
                          return (
                            <React.Fragment key={inv.id}>
                              <motion.tr
                                key={inv.id}
                                animate={
                                  shakingId === inv.id
                                    ? {
                                        x: [0, -10, 10, -10, 10, 0],
                                        backgroundColor: [
                                          "rgba(255,255,255,1)",
                                          "rgba(239,68,68,0.1)",
                                          "rgba(239,68,68,0.1)",
                                          "rgba(255,255,255,1)",
                                        ],
                                      }
                                    : {}
                                }
                                transition={
                                  shakingId === inv.id ? { duration: 0.5 } : {}
                                }
                                onClick={() =>
                                  setExpandedInvoiceId(
                                    isExpanded ? null : inv.id,
                                  )
                                }
                                className={cn(
                                  "hover:bg-slate-50 transition-colors cursor-pointer group",
                                  isExpanded && "bg-slate-50/50",
                                  shakingId === inv.id && "bg-red-50/50",
                                )}
                              >
                                <td className="p-3 md:p-3 font-bold text-primary flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronUp size={14} />
                                  ) : (
                                    <ChevronDown size={14} />
                                  )}
                                  #{inv.id}
                                </td>
                                <td className="p-3 md:p-3">
                                  <div className="font-bold text-slate-800">
                                    {customer?.name ||
                                      (inv as any).customerName ||
                                      (inv.customerId
                                        ? `عميل #${inv.customerId.slice(-4)}`
                                        : "عميل عام (غير مسجل)")}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-medium">
                                    {customer?.phone ||
                                      (inv as any).customerPhone}
                                   </div>
                                   {(() => {
                                     const addrStr = getInvoiceAddress(inv, customer);
                                     return addrStr ? (
                                       <div className="text-[9px] text-slate-400 font-light mt-1 max-w-[260px] leading-relaxed break-words border-t border-slate-100/50 pt-1" dir="rtl">
                                         📍 {addrStr}
                                       </div>
                                     ) : null;
                                   })()}
                                 </td>
                                 <td style={{ display: 'none' }}>
                                   <div>
                                  </div>
                                </td>
                                <td className="p-3 md:p-3 text-slate-500 text-xs font-bold">
                                  <div className="flex flex-col gap-1 items-start">
                                    <span>
                                      {new Date(inv.date).toLocaleDateString(
                                        "en-GB",
                                      )}
                                    </span>
                                    <span
                                      dir="ltr"
                                      className="text-[10px] font-medium text-slate-500 m-0 p-0 leading-none inline-block text-left"
                                    >
                                      {new Date(inv.date).toLocaleTimeString(
                                        "en-GB",
                                        {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          hour12: true,
                                        },
                                      )}
                                    </span>
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 rounded-md font-bold text-[10px] uppercase",
                                        inv.deliveryType === "standard"
                                          ? "bg-emerald-50 text-emerald-500"
                                          : inv.deliveryType === "special"
                                            ? "bg-purple-50 text-purple-500"
                                            : inv.deliveryType === "free"
                                              ? "bg-amber-50 text-amber-500"
                                              : "bg-blue-50 text-blue-500",
                                      )}
                                    >
                                      {inv.deliveryType === "standard"
                                        ? "ربح"
                                        : inv.deliveryType === "special"
                                          ? "خاص"
                                          : inv.deliveryType === "free"
                                            ? "مجاني"
                                            : "شركة"}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3 md:p-3">
                                  <div className="flex flex-col gap-2 items-start">
                                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase">
                                      {inv.paymentMethod}
                                    </span>
                                    <div
                                      className={cn(
                                        "px-3 py-1 text-[10px] font-bold rounded-lg transition-all w-fit",
                                        isPaidStatus(
                                          inv.paymentStatus as string,
                                        ) || isPaidStatus((inv as any).status)
                                          ? "bg-emerald-100 text-emerald-700"
                                          : isCancelledStatus(
                                                inv.paymentStatus as string,
                                              ) ||
                                              isCancelledStatus(
                                                (inv as any).status,
                                              )
                                            ? "bg-rose-100 text-rose-700"
                                            : isFailedStatus(
                                                  inv.paymentStatus as string,
                                                ) ||
                                                isFailedStatus(
                                                  (inv as any).status,
                                                )
                                              ? "bg-amber-100 text-amber-700"
                                              : String(
                                                    (inv as any).status,
                                                  ).includes("تجميع القطية") ||
                                                  String(
                                                    inv.paymentStatus,
                                                  ).includes("تجميع القطية")
                                                ? "bg-purple-100 text-purple-700"
                                                : "bg-violet-100 text-violet-700",
                                      )}
                                    >
                                      {isPaidStatus(
                                        inv.paymentStatus as string,
                                      ) || isPaidStatus((inv as any).status)
                                        ? "مدفوع ✓"
                                        : isCancelledStatus(
                                              inv.paymentStatus as string,
                                            ) ||
                                            isCancelledStatus(
                                              (inv as any).status,
                                            )
                                          ? (inv as any).status ===
                                              "انتهى وقت القطية" ||
                                            (inv as any).status ===
                                              "ملغي - انتهى وقت القطية"
                                            ? "ملغي - انتهى وقت القطية 🚫"
                                            : "ملغي 🚫"
                                          : isFailedStatus(
                                                inv.paymentStatus as string,
                                              ) ||
                                              isFailedStatus(
                                                (inv as any).status,
                                              )
                                            ? "فشلت عملية الدفع ❌"
                                            : String(
                                                  (inv as any).status,
                                                ).includes("تجميع القطية") ||
                                                String(
                                                  inv.paymentStatus,
                                                ).includes("تجميع القطية")
                                              ? "قيد تجميع القطية 🔄"
                                              : "في إنتظار الدفع ! ⏳"}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3 md:p-3 font-bold text-slate-900 group-hover:text-primary transition-colors">
                                  <div className="flex flex-col items-start gap-1">
                                    <span>
                                      {(() => { try { return computeInvoiceTotal(inv, data.products || []).toFixed(3); } catch { return Number((inv as any).totalAmount || (inv as any).total || 0).toFixed(3); } })()}{" "}
                                      د.ك
                                    </span>
                                    {(inv.discount || 0) > 0 && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-500 whitespace-nowrap">
                                        خصم مفعّل{" "}
                                        {inv.appliedPromoCodeName
                                          ? `(${inv.appliedPromoCodeName})`
                                          : ""}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 md:p-3 text-left">
                                  <div className="flex items-center gap-2 justify-end">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const paymentLink =
                                          inv.paymentLink ||
                                          (inv as any).paymentUrl ||
                                          (inv as any).payment_url ||
                                          (inv as any).url ||
                                          (inv as any).link ||
                                          (inv as any).splitLink ||
                                          (inv as any).split_link ||
                                          (inv as any).split_url;
                                        const isPaidNow =
                                          isPaidStatus(inv.paymentStatus) ||
                                          isPaidStatus((inv as any).status);

                                        if (
                                          (!paymentLink ||
                                            paymentLink.trim() === "") &&
                                          !isPaidNow &&
                                          !isCancelledStatus(
                                            inv.status as string,
                                          )
                                        ) {
                                          handleRegeneratePayment(inv);
                                        } else {
                                          const waLink = getWhatsAppLink(inv);
                                          if (waLink && waLink !== "#") {
                                            window.open(
                                              waLink,
                                              "_blank",
                                              "noopener,noreferrer",
                                            );
                                          } else {
                                            import("sonner").then((m) =>
                                              m.toast.error(
                                                "ما نقدر نفتح واتساب لأن رقم العميل مو موجود",
                                              ),
                                            );
                                          }
                                        }
                                      }}
                                      className="p-2 hover:bg-emerald-50 rounded-lg text-slate-500 hover:text-emerald-500 transition-colors"
                                      title="إرسال الفاتورة عبر واتساب"
                                    >
                                      <MessageSquare size={16} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePrint(inv);
                                      }}
                                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-600 transition-colors"
                                      title="طباعة"
                                    >
                                      <Printer size={16} />
                                    </button>
                                    {!isPartner && (
                                      <>
                                        {!isPaidStatus(inv.paymentStatus) && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditInvoice(inv);
                                            }}
                                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-600 transition-colors"
                                            title="تعديل"
                                          >
                                            <Edit2 size={16} />
                                          </button>
                                        )}
                                        {!isPaidStatus(inv.paymentStatus) && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setInvoiceToDelete(inv.id);
                                            }}
                                            className="p-2 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-colors"
                                            title="حذف"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>
                              </motion.tr>
                              <AnimatePresence>
                                {isExpanded && (
                                  <tr key={`details-${inv.id}`}>
                                    <td colSpan={6} className="p-0">
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="bg-slate-50/80 px-4 py-4 md:px-8 md:py-6 border-b border-slate-100"
                                      >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-4 md:p-3 mt-4">
                                          <div>
                                            <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                                              <Package size={12} /> محتويات
                                              الطلب (المنتجات)
                                            </h4>
                                            <div className="space-y-2">
                                              {(Array.isArray(inv.items) ? inv.items : []).map(
                                                (item, idx) => {
                                                  const product = (
                                                    data?.products || []
                                                  ).find(
                                                    (p) =>
                                                      p.id === item.productId,
                                                  );
                                                  const price =
                                                    computeInvoiceItemBasePrice(
                                                      item,
                                                      data?.products || [],
                                                    );
                                                  return (
                                                    <div
                                                      key={idx}
                                                      className="bg-white p-3 rounded-xl border border-slate-100 flex flex-col gap-2"
                                                    >
                                                      <div className="flex justify-between items-start">
                                                        <div className="flex flex-col">
                                                          <span className="font-bold text-sm">
                                                            {product?.name ||
                                                              "منتج غير معروف"}
                                                          </span>
                                                          {product?.supplierId && (
                                                            <span className="text-[10px] font-extralight text-slate-400 block -mt-0.5 opacity-70 tracking-tight">
                                                              {(data.suppliers || []).find(s => s.id === product.supplierId)?.name}
                                                            </span>
                                                          )}
                                                          {item.itemNotes && (
                                                            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block w-fit">
                                                              ملاحظة:{" "}
                                                              {item.itemNotes}
                                                            </span>
                                                          )}
                                                        </div>
                                                        <div className="flex flex-col text-[10px] md:text-xs font-bold items-end text-left justify-end">
                                                          <div className="text-slate-500">
                                                            <div>
                                                              الكمية:{" "}
                                                              {item.quantity ||
                                                                1}{" "}
                                                              ×{" "}
                                                              {Number(
                                                                price,
                                                              ).toFixed(3)}
                                                            </div>
                                                          </div>
                                                          <div className="text-slate-800 font-bold text-sm">
                                                            {(
                                                              Number(price) *
                                                              (item.quantity ||
                                                                1)
                                                            ).toFixed(3)}{" "}
                                                            د.ك
                                                          </div>
                                                        </div>
                                                      </div>
                                                      {Array.isArray(
                                                        item.addons,
                                                      ) &&
                                                        item.addons.length >
                                                          0 && (
                                                          <div className="flex flex-col gap-1 mt-1 border-t border-slate-50 pt-2">
                                                            <div className="text-[9px] font-bold text-slate-400 mb-1">
                                                              تفاصيل الإضافات:
                                                            </div>
                                                            {(Array.isArray(item.addons) ? item.addons : []).map(
                                                              (
                                                                a: any,
                                                                i: number,
                                                              ) => {
                                                                let addonQty = 0;
                                                                if (
                                                                  a.calculationType ===
                                                                  "fixed"
                                                                )
                                                                  addonQty = 1;
                                                                else if (
                                                                  a.calculationType ===
                                                                  "per_x_items"
                                                                )
                                                                  addonQty =
                                                                    Math.ceil(
                                                                      (item.quantity ||
                                                                        1) /
                                                                        (a.xItemsThreshold ||
                                                                          1),
                                                                    );
                                                                else
                                                                  addonQty =
                                                                    item.quantity ||
                                                                    1;
                                                                addonQty =
                                                                  Math.max(
                                                                    a.minQuantity ||
                                                                      0,
                                                                    Math.min(
                                                                      addonQty,
                                                                      a.maxQuantity ||
                                                                        addonQty,
                                                                    ),
                                                                  );
                                                                if (
                                                                  addonQty === 0
                                                                )
                                                                  return null;

                                                                let aTotal =
                                                                  Number(
                                                                    a.price ||
                                                                      0,
                                                                  ) *
                                                                  Math.max(
                                                                    0,
                                                                    addonQty -
                                                                      (a.freeQuantity ||
                                                                        0),
                                                                  );
                                                                return (
                                                                  <div
                                                                    key={i}
                                                                    className="flex justify-between text-xs text-slate-600"
                                                                  >
                                                                    <div className="flex items-center gap-1 font-bold">
                                                                      <Puzzle
                                                                        size={
                                                                          10
                                                                        }
                                                                        className="text-amber-500"
                                                                      />{" "}
                                                                      {a.name}{" "}
                                                                      {addonQty >
                                                                        1 && (
                                                                        <span className="text-[10px] text-slate-400">
                                                                          (
                                                                          {
                                                                            addonQty
                                                                          }
                                                                          x)
                                                                        </span>
                                                                      )}
                                                                    </div>
                                                                    <div
                                                                      className={
                                                                        aTotal >
                                                                        0
                                                                          ? "font-bold text-amber-600"
                                                                          : "font-bold text-emerald-600"
                                                                      }
                                                                    >
                                                                      {aTotal >
                                                                      0
                                                                        ? `+${aTotal.toFixed(3)} د.ك`
                                                                        : "مجاني"}
                                                                    </div>
                                                                  </div>
                                                                );
                                                              },
                                                            )}
                                                          </div>
                                                        )}
                                                    </div>
                                                  );
                                                },
                                              )}
                                            </div>

                                            {Array.isArray((inv as any).splitParticipants) &&
                                              (inv as any).splitParticipants.length > 0 && (
                                              <div className="mt-6 space-y-2">
                                                <div className="text-[10px] font-bold text-purple-600 mb-2">
                                                  المشاركون باللعب:
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                  {(
                                                    (inv as any)
                                                      .splitParticipants || []
                                                  ).map(
                                                    (
                                                      pName: any,
                                                      idx: number,
                                                    ) => {
                                                      const pVal =
                                                        typeof pName ===
                                                        "object"
                                                          ? `${pName.name || "مجهول"} ${pName.phone ? `(${pName.phone})` : ""}`
                                                          : pName;
                                                      return (
                                                        <span
                                                          key={idx}
                                                          className="bg-white/60 text-purple-800 text-[10px] font-bold px-2 py-1 rounded-md border border-purple-200"
                                                        >
                                                          {pVal}
                                                        </span>
                                                      );
                                                    },
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>

                                          <div className="flex flex-col justify-start gap-4">
                                            <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-4 shadow-sm">
                                              <h4 className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-2 border-b border-slate-50 pb-2">
                                                <TrendingUp size={12} /> ملخص
                                                الحساب
                                              </h4>

                                              <div className="space-y-2">
                                                {(() => {
                                                  let pTotal = 0;
                                                  let aTotalSum = 0;
                                                  (Array.isArray(inv.items) ? inv.items : []).forEach(
                                                    (item: any) => {
                                                      const price =
                                                        computeInvoiceItemBasePrice(
                                                          item,
                                                          data?.products || [],
                                                        );
                                                      pTotal +=
                                                        price *
                                                        (item.quantity || 1);
                                                      (Array.isArray(
                                                        item.addons,
                                                      )
                                                        ? item.addons
                                                        : []
                                                      ).forEach((a: any) => {
                                                        let aQty = 0;
                                                        if (
                                                          a.calculationType ===
                                                          "fixed"
                                                        )
                                                          aQty = 1;
                                                        else if (
                                                          a.calculationType ===
                                                          "per_x_items"
                                                        )
                                                          aQty = Math.ceil(
                                                            (item.quantity ||
                                                              1) /
                                                              (a.xItemsThreshold ||
                                                                1),
                                                          );
                                                        else
                                                          aQty =
                                                            item.quantity || 1;
                                                        aQty = Math.max(
                                                          a.minQuantity || 0,
                                                          Math.min(
                                                            aQty,
                                                            a.maxQuantity ||
                                                              aQty,
                                                          ),
                                                        );
                                                        aTotalSum +=
                                                          Number(a.price || 0) *
                                                          Math.max(
                                                            0,
                                                            aQty -
                                                              (a.freeQuantity ||
                                                                0),
                                                          );
                                                      });
                                                    },
                                                  );

                                                  return (
                                                    <>
                                                      <div className="flex justify-between text-xs font-bold">
                                                        <span className="text-slate-500">
                                                          مجموع المنتجات:
                                                        </span>
                                                        <span className="text-slate-800">
                                                          {pTotal.toFixed(3)}{" "}
                                                          د.ك
                                                        </span>
                                                      </div>
                                                      {(inv.discount || 0) >
                                                        0 && (
                                                        <div className="flex justify-between text-xs font-bold text-rose-600">
                                                          <span className="text-rose-400">
                                                            الخصم{" "}
                                                            {inv.appliedPromoCodeName
                                                              ? `(${inv.appliedPromoCodeName})`
                                                              : ""}
                                                            :
                                                          </span>
                                                          <span>
                                                            -
                                                            {Number(
                                                              inv.discount,
                                                            ).toFixed(3)}{" "}
                                                            د.ك
                                                          </span>
                                                        </div>
                                                      )}
                                                      <div className="flex justify-between text-xs font-bold">
                                                        <span className="text-slate-500">
                                                          رسوم التوصيل:
                                                          {inv.deliveryInfo
                                                            ?.zoneName
                                                            ? ` (${inv.deliveryInfo.zoneName})`
                                                            : ""}
                                                        </span>
                                                        <span className="text-slate-800">
                                                          {Number(
                                                            inv.deliveryFee ||
                                                              0,
                                                          ).toFixed(3)}{" "}
                                                          د.ك
                                                        </span>
                                                      </div>
                                                      <div className="flex justify-between text-lg font-black border-t border-slate-100 pt-3 mt-2 text-slate-900 bg-slate-50 -mx-4 px-4 py-2">
                                                        <span>
                                                          الإجمالي النهائي:
                                                        </span>
                                                        <span className="text-primary">
                                                          {(() => { try { return computeInvoiceTotal(inv, data.products || []).toFixed(3); } catch { return Number((inv as any).totalAmount || (inv as any).total || 0).toFixed(3); } })()}{" "}
                                                          د.ك
                                                        </span>
                                                      </div>
                                                    </>
                                                  );
                                                })()}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </motion.div>
                                    </td>
                                  </tr>
                                )}
                              </AnimatePresence>
                            </React.Fragment>
                          );
                        })
                      )}
                      {filteredInvoices.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-3 md:p-4 text-center text-slate-500 font-bold italic"
                          >
                            ماكو فواتير مطابقة للبحث.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {invoiceToDelete && (
                <ConfirmModal
                  title="تأكيد الحذف"
                  message="هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذه الخطوة."
                  onConfirm={() => handleDeleteInvoice(invoiceToDelete)}
                  onCancel={() => setInvoiceToDelete(null)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

export default ReportsPage;
