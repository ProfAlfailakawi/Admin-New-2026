function enforceEnglishNumbers(val: string) {
  if (!val) return val;
  return String(val).replace(/[٠-٩]/g, (d) =>
    "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString(),
  );
}

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Search,
  User,
  CreditCard,
  CheckCircle2,
  Package,
  X,
  PlusCircle,
  Truck,
  Printer,
  MessageCircle,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  History,
  Tag,
  Percent,
  MessageSquare,
  MapPin,
  Clock,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { playTing } from "../lib/sounds";
import { DEFAULT_GLOBAL_LOGO } from "../constants";
import {
  AppState,
  Product,
  InvoiceItem,
  Invoice,
  Customer,
  DeliveryType,
  PromoCode,
  PaymentMethod,
} from "../types";
import {
  cn,
  normalizeArabic,
  normalizeArabicNumerals,
  robustNormalize,
  normalizePhoneDigits,
  normalizeAddressNumber,
  phonesMatch,
  formatFullAddress,
  getKuwaitDateInputValue,
  mergeKuwaitDateWithTime,
  resolveInvoiceDisplayDate,
} from "../lib/utils";
import {
  computeInvoiceTotal,
  computeInvoiceCost,
  computeInvoiceProfit,
  computeInvoiceAddonsTotal,
  computeInvoiceItemBasePrice,
  computeInvoiceItemTotal,
  computeInvoiceSubtotal,
  computeAddonQuantity,
  computeAddonRevenue,
  computeDeliveryBreakdown,
  getInvoiceBaseItemsTotal,
} from "../lib/invoice-calculations";
import { NumericInput } from "./ui/NumericInput";
import { MagneticButton } from "./ui/MagneticButton";
import { getPublicUrl, getWebhookUrl } from "../lib/urlUtils";
import {
  recalculateStateBalances,
  generateNextInvoiceId,
} from "../lib/business-logic";
import { isPaidStatus } from "../lib/status-utils";
import { toast } from "sonner";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

// Default product categories shown in the invoice form.  The categories
// "المشويات" and "المشروبات" were removed based on new requirements.  If
// additional categories are needed in the future they can be added via the
// admin interface without editing this list directly.
const DEFAULT_PRODUCT_CATEGORIES = ["الولائم", "اللحوم", "الدجاج", "البحري", "المقبلات"];

const normalizeCategoryName = (value?: string) => String(value || "عام").trim() || "عام";

const getSharedProductCategories = (source: any, productList: any[] = []) => {
  const configured =
    source?.productCategories ||
    source?.menuCategories ||
    source?.settings?.productCategories ||
    source?.settings?.menuCategories ||
    [];
  const configuredNames = Array.isArray(configured)
    ? configured.map((cat: any) => normalizeCategoryName(typeof cat === "string" ? cat : cat?.name || cat?.title)).filter(Boolean)
    : [];
  const productNames = productList.map((p: any) => normalizeCategoryName(p?.category)).filter(Boolean);
  return Array.from(new Set([...configuredNames, ...DEFAULT_PRODUCT_CATEGORIES, ...productNames]));
};

interface InvoicePageProps {
  data: AppState;
  setData: React.Dispatch<React.SetStateAction<AppState>>;
  editingInvoiceId?: string | null;
  onFinished?: () => void;
  isPartner?: boolean;
}

const InvoicePage: React.FC<InvoicePageProps> = React.memo(
  ({ data, setData, editingInvoiceId, onFinished, isPartner = false }) => {
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [customerSearch, setCustomerSearch] = useState("");
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [loading, setLoading] = useState(false);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [customerPhone, setCustomerPhone] = useState("");
    const customerPickerRef = useRef<HTMLDivElement>(null);

    const customers = useMemo<Customer[]>(
      () => (Array.isArray(data?.customers) ? data.customers.filter(Boolean) : []),
      [data?.customers],
    );

    const normalizedCustomerSearch = useMemo(
      () => normalizeArabic(String(customerSearch || "").trim()),
      [customerSearch],
    );
    const normalizedCustomerSearchPhone = useMemo(
      () => normalizePhoneDigits(customerSearch),
      [customerSearch],
    );

    const matchingCustomers = useMemo(() => {
      const rows = customers.filter((customer) => {
        const name = normalizeArabic(String(customer?.name || ""));
        const phone = normalizePhoneDigits(customer?.phone);
        if (!customerSearch.trim()) return true;
        return name.includes(normalizedCustomerSearch) ||
          (normalizedCustomerSearchPhone.length > 0 && phone.includes(normalizedCustomerSearchPhone));
      });
      return rows
        .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || ""), "ar"))
        .slice(0, 20);
    }, [customers, customerSearch, normalizedCustomerSearch, normalizedCustomerSearchPhone]);

    const exactCustomerSearchMatch = useMemo(() => {
      const raw = customerSearch.trim();
      if (!raw) return null;
      return customers.find((customer) =>
        phonesMatch(customer?.phone, raw) ||
        normalizeArabic(String(customer?.name || "")) === normalizedCustomerSearch,
      ) || null;
    }, [customers, customerSearch, normalizedCustomerSearch]);

    const duplicateNewCustomer = useMemo(() => {
      const phone = normalizePhoneDigits(customerPhone);
      if (!isNewCustomer || phone.length !== 8) return null;
      return customers.find((customer) => phonesMatch(customer?.phone, phone)) || null;
    }, [customers, customerPhone, isNewCustomer]);

    const selectExistingCustomer = (customer: Customer) => {
      setSelectedCustomerId(String(customer.id || ""));
      setCustomerSearch(String(customer.name || customer.phone || "عميل مسجل"));
      setCustomerPhone(normalizePhoneDigits(customer.phone));
      setNewCustomerName("");
      setIsNewCustomer(false);
      setShowCustomerDropdown(false);
      setAddressModified(false);
      toast.success(`تم اختيار ${customer.name || "العميل المسجل"}`);
    };

    useEffect(() => {
      const closePicker = (event: PointerEvent) => {
        if (customerPickerRef.current && !customerPickerRef.current.contains(event.target as Node)) {
          setShowCustomerDropdown(false);
        }
      };
      document.addEventListener("pointerdown", closePicker);
      return () => document.removeEventListener("pointerdown", closePicker);
    }, []);

    // Delivery Fields
    const [deliveryCompany, setDeliveryCompany] = useState("");
    const [deliverySettlementTarget, setDeliverySettlementTarget] = useState<"heritage" | "supplier" | "delivery_company">("heritage");
    const [deliverySettlementSupplierId, setDeliverySettlementSupplierId] = useState("");
    const [selectedZoneId, setSelectedZoneId] = useState<string>("");
    const [deliveryCost, setDeliveryCost] = useState(0);
    const [deliveryProfit, setDeliveryProfit] = useState(0);
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [deliveryType, setDeliveryType] = useState<DeliveryType>("company");
    const [isManualDelivery, setIsManualDelivery] = useState(false);
    const [supplierFilter, setSupplierFilter] = useState<string>("all");
    const [activeInvoiceCategory, setActiveInvoiceCategory] = useState<string | null>(null);
    const [promoCodeInput, setPromoCodeInput] = useState("");
    const activeZones = useMemo(() => (data.zones || []).filter((z: any) => z?.isActive !== false), [data.zones]);

    const [appliedPromoCode, setAppliedPromoCode] = useState<PromoCode | null>(
      null,
    );

    const [cart, setCart] = useState<
      Record<
        string,
        {
          quantity: number;
          priceAtTime: number;
          costAtTime: number;
          itemNotes?: string;
          addons?: any[];
        }
      >
    >({});
    const [invoiceDate, setInvoiceDate] = useState(() => getKuwaitDateInputValue());
    const [deliveryTime, setDeliveryTime] = useState("");
    const [openCheaperHintId, setOpenCheaperHintId] = useState<string | null>(null);
    const getBestPriceInfo = (product: Product) => {
      const others = (data?.products || []).filter(
        (p) => p.name === product.name && p.id !== product.id,
      );
      const best = others.reduce(
        (min, cur) => (cur.cost < min.cost ? cur : min),
        product,
      );
      if (best.cost < product.cost) {
        return {
          cost: best.cost,
          supplier: (data?.suppliers || []).find(
            (s) => s.id === best.supplierId,
          )?.name,
        };
      }
      return null;
    };

    const [searchQuery, setSearchQuery] = useState("");

    const isDeliveryCompanyEntity = (supplier: any) => supplier?.supplierType === 'delivery';
    const isFoodSupplierDelivering = (supplier: any) => supplier?.supplierType !== 'delivery' && supplier?.deliverySettlement === 'supplier';
    const getEligibleDeliveryEntities = () => (data?.suppliers || []).filter((s: any) => isDeliveryCompanyEntity(s) || isFoodSupplierDelivering(s));
    const getDeliveryEntityLabel = (supplier: any) => isDeliveryCompanyEntity(supplier) ? 'شركة توصيل' : 'مورد يوصل طلباته';


    const applyDeliverySettlementFromSupplier = (supplier: any) => {
      if (!supplier) return;
      const supplierDelivers = isFoodSupplierDelivering(supplier);
      if (supplierDelivers || isDeliveryCompanyEntity(supplier)) {
        setDeliveryType('company');
        setDeliveryCompany(supplier.name || '');
        setDeliverySettlementSupplierId(String(supplier.id || ''));
        setDeliverySettlementTarget(isDeliveryCompanyEntity(supplier) ? 'delivery_company' : 'supplier');
        return;
      }

      if (!deliverySettlementSupplierId || String(deliverySettlementSupplierId) === String(supplier.id || '')) {
        setDeliveryCompany('');
        setDeliverySettlementSupplierId('');
        setDeliverySettlementTarget('delivery_company');
      }
    };

    const pickDeliverySettlementEntity = (supplierId: string) => {
      const supplier = (data.suppliers || []).find((s: any) => String(s.id) === String(supplierId));
      if (!supplier) {
        setDeliveryCompany('');
        setDeliverySettlementTarget('heritage');
        setDeliverySettlementSupplierId('');
        return;
      }
      if (!isDeliveryCompanyEntity(supplier) && !isFoodSupplierDelivering(supplier)) {
        toast.warning('هذا المورد لا يوصل', { description: 'اختر شركة توصيل أو مورداً مفعلاً له خيار التوصيل.' });
        setDeliveryCompany('');
        setDeliverySettlementSupplierId('');
        setDeliverySettlementTarget('delivery_company');
        return;
      }
      setDeliveryType('company');
      setDeliveryCompany(supplier.name || '');
      setDeliverySettlementSupplierId(String(supplier.id || ''));
      setDeliverySettlementTarget(isDeliveryCompanyEntity(supplier) ? 'delivery_company' : 'supplier');
    };

    const syncDeliveryCompanyFromCart = (nextCart: Record<string, any>) => {
      const nextProductIds = Object.keys(nextCart || {}).filter((id) => Number(nextCart[id]?.quantity || 0) > 0);
      const nextProducts = nextProductIds
        .map((id) => (data.products || []).find((p: any) => String(p.id) === String(id)))
        .filter(Boolean);
      const uniqueSupplierIds = Array.from(new Set(nextProducts.map((p: any) => String(p.supplierId || '')).filter(Boolean)));
      if (uniqueSupplierIds.length !== 1) return;
      const supplier = (data.suppliers || []).find((s: any) => String(s.id) === String(uniqueSupplierIds[0]));
      if (supplier) applyDeliverySettlementFromSupplier(supplier);
    };


    // Discount Fields
    const [discountType, setDiscountType] = useState<"amount" | "percentage">(
      "amount",
    );
    const [discountValue, setDiscountValue] = useState(0);

    // Address and Notes
    const [addressDetails, setAddressDetails] = useState({
      block: "",
      street: "",
      jaddah: "",
      building: "",
      floor: "",
      apartment: "",
    });
    const [addressModified, setAddressModified] = useState(false);
    const [notesText, setNotesText] = useState("");
    const [isZenMode, setIsZenMode] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("KNet");

    const getWhatsAppLink = (invoice: Invoice) => {
      const customer = (data?.customers || []).find(
        (c) => c.id === invoice.customerId,
      );
      const order = (data?.orders || []).find(
        (o) =>
          o.linkedInvoiceId === invoice.id ||
          o.id === (invoice as any).linkedOrderId,
      );
      const phone = customer?.phone || (order as any)?.customerPhone || "";

      if (!phone) return "#";

      const processedFixedAddons = new Set<string>();

      const items = (invoice?.items || [])
        .map((item, index) => {
          const p = (data?.products || []).find(
            (prod) => prod.id === item.productId,
          );
          const price =
            item.priceAtTime !== undefined
              ? item.priceAtTime
              : (item as any).price !== undefined
                ? (item as any).price
                : p?.price || 0;
          let displayPrice = Number(price);
          let addonsLines: string[] = [];

          if (Array.isArray(item.addons) && item.addons.length > 0) {
            item.addons.forEach((addon: any) => {
              const userQty = addon.quantity !== undefined ? Number(addon.quantity) : (addon.qty !== undefined ? Number(addon.qty) : 1);
              if (userQty === 0) return;
              if (addon.selected === false || addon.isSelected === false || addon.enabled === false) return;
              
              const addonQty = computeAddonQuantity(addon, item);

              if (addonQty > 0) {
                let isDuplicateFixed = false;
                if (addon.calculationType === "fixed") {
                  const key = `${addon.id}-${addon.name}`;
                  if (!processedFixedAddons.has(key)) {
                    processedFixedAddons.add(key);
                  } else {
                    isDuplicateFixed = true;
                  }
                }

                const mult = userQty;

                if (!isDuplicateFixed) {
                  if (addon.isHiddenPrice) {
                    const rowTotal = computeAddonRevenue(addon, item);
                    displayPrice += rowTotal / Math.max(1, item.quantity || 1);
                    addonsLines.push(
                      `   - ${addon.name}${mult > 1 ? ` x ${mult}` : ""}`,
                    );
                  } else {
                    const rowTotal = computeAddonRevenue(addon, item);
                    if (rowTotal > 0) {
                      addonsLines.push(
                        `   - ${addon.name}${mult > 1 ? ` x ${mult}` : ""}: ${rowTotal.toFixed(3)} د.ك`,
                      );
                    } else {
                      addonsLines.push(
                        `   - ${addon.name}${mult > 1 ? ` x ${mult}` : ""}: مجاناً`,
                      );
                    }
                  }
                }
              }
            });
          }

          return `${index + 1}) ${p?.name || "منتج غير معروف"}\n   الكمية: ${item.quantity || 1}\n   السعر الفردي: ${Number(displayPrice).toFixed(3)} د.ك\n   إجمالي المنتج: ${(Number(displayPrice) * Number(item.quantity || 1)).toFixed(3)} د.ك${addonsLines.length > 0 ? "\n\n   الإضافات:\n" + addonsLines.join("\n") : ""}`;
        })
        .join("\n");

      const subtotal = computeInvoiceSubtotal(invoice, data.products);
      const addonsTotalWA = computeInvoiceAddonsTotal(invoice);
      const totalAmountVal = computeInvoiceTotal(invoice, data.products);

      const pLink =
        invoice.paymentLink ||
        (invoice as any).paymentUrl ||
        (invoice as any).payment_url ||
        (invoice as any).url ||
        (invoice as any).link ||
        (invoice as any).splitLink ||
        (invoice as any).split_link ||
        (invoice as any).split_url ||
        (order as any)?.paymentLink ||
        (order as any)?.splitLink ||
        (order as any)?.split_link;

      const isPaidNow = isPaidStatus(invoice.paymentStatus);
      const paymentLinkLine =
        pLink && pLink.trim() !== "" && !isPaidNow
          ? `\nرابط الدفع: ${pLink}`
          : "";

      const promoLabel = invoice.appliedPromoCodeName
        ? `قيمة الخصم (${invoice.appliedPromoCodeName})`
        : "قيمة الخصم";
      const promoLine =
        (Number(invoice.discount) || 0) > 0
          ? `*${promoLabel}*: ${Number(invoice.discount).toFixed(3)} د.ك\n`
          : "";

      const addressText = invoice.address && invoice.address !== "غير محدد"
        ? (typeof invoice.address === "object"
            ? [
                invoice.address.region || "",
                invoice.address.block ? `قطعة ${invoice.address.block}` : "",
                invoice.address.street ? `شارع ${invoice.address.street}` : "",
                invoice.address.building ? `منزل ${invoice.address.building}` : "",
              ].filter(Boolean).join(" - ")
            : invoice.address)
        : invoice.deliveryInfo?.zoneName || "غير محدد";

      const invoiceEmoji = "\u2728";
      const linkEmoji = "\u2705";
      const trackingUrl = `https://alturathkw.shop/track?tracked_order=${encodeURIComponent(String(invoice.id))}`;
      const customerName = customer?.name || "عميلنا العزيز";
      const paymentSection = paymentLinkLine
        ? `
${linkEmoji} رابط الدفع:
${pLink}

`
        : "";

      const message = `${invoiceEmoji} فاتورة طلبكم من مطبخ التراث الكويتي

مرحباً ${customerName}،
تم تجهيز فاتورتكم للطلب رقم: ${invoice.id}

الإجمالي المستحق: ${Number(totalAmountVal).toFixed(3)} د.ك

لتتبع الطلب:
${trackingUrl}
${paymentSection}
شكراً لثقتكم
Alturath.kw`;

      let digits = phone.replace(/[^0-9]/g, "");
      if (digits.length === 8) digits = `965${digits}`;
      const sanitizeWhatsAppText = (text: string) =>
        String(text || "").replace(/[\u{1F000}-\u{1FAFF}]/gu, "").replace(/\uFFFD/g, "");
      return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(sanitizeWhatsAppText(message))}`;
    };

    useEffect(() => {
      if (editingInvoiceId) {
        const inv = (data.invoices || []).find(
          (i) => i.id === editingInvoiceId,
        );
        if (inv) {
          setSelectedCustomerId(String(inv.customerId || ""));
          setDeliveryFee(inv.deliveryFee);
          setDeliveryType(inv.deliveryType || "company");
          if (inv.deliveryInfo) {
            setDeliveryCompany(inv.deliveryInfo.company || "");
            setDeliverySettlementTarget((inv.deliveryInfo as any).settlementTarget || (inv as any).deliverySettlementTarget || "heritage");
            setDeliverySettlementSupplierId((inv.deliveryInfo as any).settlementSupplierId || (inv as any).deliverySettlementSupplierId || "");
            const matchedZone = activeZones.find(
              (z) => z.name === inv.deliveryInfo?.zoneName,
            );
            if (matchedZone) {
              setSelectedZoneId(matchedZone.id);
              setIsManualDelivery(false);
            } else {
              setIsManualDelivery(true);
              setDeliveryCompany(inv.deliveryInfo.zoneName || "");
            }
            setDeliveryCost(inv.deliveryInfo.cost || 0);
            setDeliveryProfit(inv.deliveryInfo.profit || 0);
          }
          const newCart: Record<
            string,
            {
              quantity: number;
              priceAtTime: number;
              costAtTime: number;
              itemNotes?: string;
              addons?: any[];
            }
          > = {};
          (inv.items || []).forEach((item) => {
            const p = (data.products || []).find(
              (prod) => prod.id === item.productId,
            );
            newCart[item.productId] = {
              quantity: item.quantity || 1,
              priceAtTime:
                item.priceAtTime !== undefined
                  ? item.priceAtTime
                  : p?.price || 0,
              costAtTime:
                item.costAtTime !== undefined ? item.costAtTime : p?.cost || 0,
              itemNotes: item.itemNotes || "",
              addons: Array.isArray((item as any).addons)
                ? (item as any).addons
                : [],
            };
          });
          setCart(newCart);
          setInvoiceDate((inv as any).deliveryDate || (inv as any).invoiceDateKey || getKuwaitDateInputValue(resolveInvoiceDisplayDate(inv)));
          setDeliveryTime((inv as any).deliveryTime || "");
          setDiscountValue(inv.discount || 0);
          setPaymentMethod(inv.paymentMethod || "KNet");
          
          const customer = customers.find((c) => String(c.id) === String(inv.customerId));
          if (customer) {
            setCustomerSearch(String(customer.name || customer.phone || ""));
          } else if ((inv as any).customerName) {
            setCustomerSearch((inv as any).customerName);
          }

          if (inv.address && typeof inv.address === "object") {
            setAddressDetails({
              block: inv.address.block || "",
              street: inv.address.street || "",
              jaddah: inv.address.jaddah || "",
              building: inv.address.building || "",
              floor: inv.address.floor || "",
              apartment: inv.address.apartment || "",
            });
          }
          setNotesText(inv.notes || "");
        }
      }
    }, [editingInvoiceId, data.invoices, data.products, customers, activeZones]);

    const handleZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setIsManualDelivery(false);
      setSelectedZoneId(val);
      const zone = activeZones.find((z) => z.id === val);

      if (zone) {
        const breakdown = computeDeliveryBreakdown(zone, deliveryType);
        setDeliveryCost(breakdown.deliveryCost);
        setDeliveryProfit(breakdown.deliveryProfit);
        setDeliveryFee(breakdown.deliveryFee);
      }
    };

    useEffect(() => {
      const zone = activeZones.find((z) => z.id === selectedZoneId);
      if (zone) {
        const breakdown = computeDeliveryBreakdown(zone, deliveryType);
        setDeliveryCost(breakdown.deliveryCost);
        setDeliveryProfit(breakdown.deliveryProfit);
        setDeliveryFee(breakdown.deliveryFee);
      }
    }, [deliveryType, selectedZoneId, activeZones]);
    // ADMIN_PARTNER_FORCE_COMPANY_DELIVERY
    // الشريك لا يختار طريقة التوصيل؛ التوصيل يكون شركة افتراضيًا بدون تغيير منطق الفاتورة.
    useEffect(() => {
      if (isPartner && deliveryType !== "company") {
        setDeliveryType("company");
      }
    }, [isPartner, deliveryType]);


    useEffect(() => {
      if (selectedCustomerId) {
        const customer = customers.find(
          (c) => String(c.id) === String(selectedCustomerId),
        );
        if (customer && !addressModified) {
          setCustomerPhone(normalizePhoneDigits(customer.phone));
          if (customer.address && typeof customer.address === "object") {
            const addr = customer.address as any;
            setAddressDetails({
              block: addr.block || "",
              street: addr.street || "",
              jaddah: addr.jaddah || "",
              building: addr.building || "",
              floor: addr.floor || "",
              apartment: addr.apartment || "",
            });
            const matchedZone = activeZones.find(
              (z) => z.name === addr.region,
            );
            if (matchedZone) setSelectedZoneId(matchedZone.id);
          }
        }
      }
    }, [selectedCustomerId, customers, addressModified, activeZones]);

    const filteredProducts = React.useMemo(() => {
      const normalizedSearch = normalizeArabic(searchQuery.trim());
      return data.products
        .filter((p) => {
          // Keep hidden products (p.isActive === false) visible in the new invoice screen as requested
          const matchesSearch =
            normalizeArabic(p.name || "").includes(normalizedSearch) ||
            normalizeArabic((p as any).category || "").includes(
              normalizedSearch,
            );
          const matchesSupplier =
            supplierFilter === "all" || p.supplierId === supplierFilter;
          return matchesSearch && matchesSupplier;
        })
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
    }, [data.products, searchQuery, supplierFilter]);


    const normalizeAddonArray = (addons: any): any[] => {
      if (!addons) return [];
      if (Array.isArray(addons)) return addons.filter(Boolean);
      if (typeof addons === "object") return Object.values(addons).filter(Boolean);
      return [];
    };

    const getAddonKey = (addon: any) =>
      String(addon?.id || addon?.addonId || addon?.name || "");

    const isCoverageRangeAddon = (addon: any) => addon?.calculationType === 'coverage' || (addon?.calculationType === 'per_x_items' && addon?.perXMode === 'coverage_range');

    const getCoverageUnits = (addon: any, productQty: number) => {
      const rule = addon?.quantityRule || {};
      const minProductQty = Math.max(1, Number(rule.minProductQty || addon?.minProductQty || 1));
      const coverToQty = Math.max(minProductQty, Number(rule.maxProductQtyPerAddon || addon?.maxProductQtyPerAddon || addon?.xItemsThreshold || minProductQty));
      const qty = Math.max(0, Number(productQty || 0));
      if (qty < minProductQty) return 0;
      const span = Math.max(1, coverToQty - minProductQty + 1);
      return Math.max(1, Math.ceil((qty - minProductQty + 1) / span));
    };

    const getAddonRuleLimits = (addon: any, productQty: number) => {
      const baseMin = addon?.isRequired ? Math.max(1, Number(addon?.minQuantity || 1)) : Number(addon?.minQuantity || 0);
      const baseMax = addon?.maxQuantity !== undefined && addon?.maxQuantity !== null && addon?.maxQuantity !== '' ? Number(addon.maxQuantity) : 999;
      const rule = addon?.quantityRule || {};
      if (!rule?.enabled) {
        return { available: true, min: baseMin, max: Math.max(baseMin, baseMax), suggested: Math.max(baseMin, addon?.calculationType === 'fixed' ? 1 : baseMin), minProductQty: 1 };
      }
      const minProductQty = Math.max(1, Number(rule.minProductQty || 1));
      const perAddon = Math.max(1, Number(rule.maxProductQtyPerAddon || 1));
      if (Number(productQty || 0) < minProductQty) {
        return { available: false, min: 0, max: 0, suggested: 0, minProductQty };
      }
      const isCoverage = isCoverageRangeAddon(addon);
      const suggested = isCoverage
        ? getCoverageUnits(addon, Number(productQty || 0))
        : Math.max(1, Math.ceil(Number(productQty || 0) / perAddon));
      const min = isCoverage
        ? suggested
        : (rule.mode === 'required' ? Math.max(baseMin, suggested) : baseMin);
      const max = isCoverage ? Math.max(min, baseMax, suggested) : Math.max(min, baseMax);
      return { available: true, min, max, suggested: Math.min(max, Math.max(min, suggested)), minProductQty };
    };

    const getInitialAddonQuantity = (addon: any, productQty: number) => {
      const limits = getAddonRuleLimits(addon, productQty);
      if (!limits.available) return 0;
      if (addon?.isRequired || addon?.quantityRule?.mode === 'required') return Math.max(limits.min, limits.suggested || 1);
      if (addon?.quantityRule?.mode === 'auto') return limits.suggested;
      if (isCoverageRangeAddon(addon)) return 0;
      return 0;
    };

    const reconcileCartAddons = (product: Product, productQty: number, currentAddons: any[] = []) => {
      const currentByKey = new Map(
        normalizeAddonArray(currentAddons).map((addon: any) => [getAddonKey(addon), addon]),
      );

      return normalizeAddonArray((product as any).addons).map((catalogAddon: any) => {
        const key = getAddonKey(catalogAddon);
        const existing = currentByKey.get(key) || {};
        const merged = { ...catalogAddon, ...existing, id: catalogAddon.id || existing.id };
        const limits = getAddonRuleLimits(merged, productQty);

        if (!limits.available) {
          return { ...merged, quantity: 0 };
        }

        const currentQty = Number(merged.quantity || 0);
        const initialQty = getInitialAddonQuantity(merged, productQty);
        const requiredQty = Math.max(limits.min, initialQty);
        let nextQty = currentQty;

        if (currentQty <= 0) nextQty = initialQty;
        if (merged?.isRequired || merged?.quantityRule?.mode === "required") {
          nextQty = Math.max(nextQty, requiredQty);
        }
        if (merged?.quantityRule?.mode === "auto" && currentQty <= 0) {
          nextQty = Math.max(nextQty, limits.suggested);
        }

        const isSelectedOrRequired = merged?.isRequired || merged?.quantityRule?.mode === "required" || nextQty > 0;
        const minVal = isSelectedOrRequired ? limits.min : 0;
        nextQty = Math.max(minVal, Math.min(limits.max, nextQty));
        return { ...merged, quantity: nextQty };
      });
    };

    const validateCartAddons = () => {
      for (const item of cartItems) {
        const product = item.product!;
        for (const addon of normalizeAddonArray(item.addons)) {
          const limits = getAddonRuleLimits(addon, item.qty || 1);
          const qty = Number(addon.quantity || 0);
          if (!limits.available && qty > 0) {
            toast.error(`الإضافة "${addon.name}" غير متاحة لكمية ${product.name} الحالية`);
            return false;
          }
          const isForcedAddon = addon?.isRequired || addon?.quantityRule?.mode === "required" || addon?.quantityRule?.mode === "auto";
          if (limits.available && qty <= 0 && !isForcedAddon) {
            continue;
          }
          if (limits.available && qty < limits.min) {
            toast.error(`الإضافة "${addon.name}" تحتاج حد أدنى ${limits.min}`);
            return false;
          }
          if (limits.available && qty > limits.max) {
            toast.error(`الإضافة "${addon.name}" تجاوزت الحد الأقصى ${limits.max}`);
            return false;
          }
        }
      }
      return true;
    };

    const addToCart = (productId: string) => {
      // FORCING VITE CACHE INVALIDATION
      const product = (data.products || []).find((p) => p.id === productId);
      if (!product) return;

      // Automatically set delivery company from product's supplier
      const supplier = (data.suppliers || []).find((s) => s.id === product.supplierId);
      if (supplier) {
        setDeliveryCompany(supplier.name);
        applyDeliverySettlementFromSupplier(supplier);
      }

      if (product.isActive === false) {
        toast.warning(`⚠️ تنبيه: هذا المنتج [${product.name}] مخفي حالياً في قائمة المنتجات!`, {
          duration: 5000,
        });
      } else {
        toast.success(`تم إضافة ${product.name} للسلة`);
      }
      
      setCart((prev) => {
        const existing = prev[productId];
        const nextQuantity = existing ? existing.quantity + 1 : Math.max(1, product.minOrderQty || 1);
        return {
          ...prev,
          [productId]: {
            quantity: nextQuantity,
            priceAtTime: product.price,
            costAtTime: product.cost,
            addons: reconcileCartAddons(product, nextQuantity, existing?.addons || []),
          },
        };
      });
    };

    const removeFromCart = (productId: string) => {
      setCart((prev) => {
        const existing = prev[productId];
        if (!existing) return prev;
        const product = (data.products || []).find((p) => p.id === productId);
        const minAllowed = product ? Math.max(1, product.minOrderQty || 1) : 1;
        
        if (existing.quantity > minAllowed) {
          const nextQuantity = existing.quantity - 1;
          return {
            ...prev,
            [productId]: {
              ...existing,
              quantity: nextQuantity,
              addons: product ? reconcileCartAddons(product, nextQuantity, existing.addons || []) : existing.addons,
            },
          };
        } else {
          toast.info(
            `الحد الأدنى للكمية هو ${minAllowed}. استخدم علامة (X) لحذف المنتج نهائياً.`
          );
          return prev;
        }
      });
    };

    const deleteFromCart = (productId: string) => {
      setCart((prev) => {
        const newCart = { ...prev };
        delete newCart[productId];
        syncDeliveryCompanyFromCart(newCart);
        return newCart;
      });
    };

    const updateAddonQuantity = (
      productId: string,
      addonId: string,
      delta: number,
    ) => {
      setCart((prev) => {
        const item = prev[productId];
        if (!item?.addons) return prev;
        const baseArray = normalizeAddonArray(item.addons);
        
        const newAddons = baseArray.map((a) => {
          if (getAddonKey(a) === addonId) {
            const cur = Number(a.quantity || 0);
            const limits = getAddonRuleLimits(a, item.quantity || 1);
            if (!limits.available) return { ...a, quantity: 0 };
            const min = limits.min;
            const max = limits.max;
            const isForcedAddon = a?.isRequired || a?.quantityRule?.mode === "required" || a?.quantityRule?.mode === "auto";
            const rawNext = isCoverageRangeAddon(a) && cur <= 0 && delta > 0 ? limits.suggested : cur + delta;
            let next = Math.max(min, Math.min(max, rawNext));
            if (!isForcedAddon && delta < 0 && cur <= min) {
              next = 0;
            }
            if (!isForcedAddon && rawNext <= 0) {
              next = 0;
            }
            return { ...a, quantity: next };
          }
          return a;
        });
        return { ...prev, [productId]: { ...item, addons: newAddons } };
      });
    };

    const cartItems = Object.entries(cart)
      .map(([id, dataItem]: [string, any]) => {
        const product = (data.products || []).find((p) => p.id === id);
        return {
          product,
          qty: dataItem.quantity,
          priceAtTime: dataItem.priceAtTime,
          costAtTime: dataItem.costAtTime,
          itemNotes: dataItem.itemNotes,
          addons: Array.isArray(dataItem.addons) ? dataItem.addons : [],
        };
      })
      .filter((it) => it.product);

    const mockInv = {
      items: cartItems.map((it) => ({
        productId: it.product!.id,
        quantity: it.qty,
        priceAtTime: it.priceAtTime,
        costAtTime: it.costAtTime,
        addons: it.addons,
      })),
      deliveryFee,
      discount: discountValue,
      gatewayFee: data.settings.gatewayFeeAmount || 0,
    };

    const subtotal = computeInvoiceSubtotal(mockInv, data.products);
    const discountAmount =
      discountType === "percentage"
        ? subtotal * (discountValue / 100)
        : discountValue;
    const totalValue = Math.max(0, subtotal + deliveryFee - discountAmount);
    const handleCreateInvoice = async () => {
      const normalizedNewCustomerPhone = normalizePhoneDigits(customerPhone);
      if (isNewCustomer && normalizedNewCustomerPhone.length !== 8) {
        toast.error("رقم التلفون لازم يكون 8 أرقام");
        return;
      }
      if (isNewCustomer && duplicateNewCustomer) {
        toast.error("هذا العميل موجود مسبقاً", {
          description: `الرقم مسجل باسم ${duplicateNewCustomer.name || "عميل مسجل"}. اختر العميل الموجود ولن يتم إنشاء سجل مكرر.`,
          duration: 6000,
        });
        setShowCustomerDropdown(false);
        return;
      }
      let targetId = selectedCustomerId;
      let newCustomerObj: Customer | null = null;

      if (isNewCustomer) {
        if (!newCustomerName.trim() || !normalizedNewCustomerPhone)
          return toast.error("اكتب اسم ورقم تلفون العميل الجديد");
        targetId = `cust-${Date.now()}`;
        newCustomerObj = {
          id: targetId,
          name: newCustomerName.trim(),
          phone: normalizedNewCustomerPhone,
          status: "active",
          totalOrders: 0,
          totalSpent: 0,
        };
      }

      if (cartItems.length === 0) {
        return toast.error("يجب اختيار منتجات أولاً قبل إصدار الفاتورة أو الدفع والاجمالي!");
      }
      if (!targetId) {
        return toast.error("يرجى اختيار عميل أولاً!");
      }
      if (
        !addressDetails.block ||
        !addressDetails.street ||
        !addressDetails.building
      )
        return toast.error("كمل تفاصيل العنوان");
      if (!validateCartAddons()) return;

      // Safari only allows a popup while the click that triggered it is still "active".
      // Opening WhatsApp after the invoice save (several awaits later) fell outside that
      // window, so Safari silently blocked it and the user landed on the invoice ledger
      // instead — intermittently, depending on how fast the save finished. Claiming the
      // tab here, inside the gesture, and pointing it at WhatsApp once the link exists
      // makes it deterministic. Nothing about saving, payment or notifications changes.
      let waWindow: Window | null = null;
      try {
        waWindow = window.open("", "_blank");
      } catch {
        waWindow = null;
      }
      // Any early return past this point must not leave a blank tab behind.
      const closeWaWindowIfUnused = () => { try { waWindow?.close(); } catch { /* already gone */ } };

      setLoading(true);
      const invoiceId =
        editingInvoiceId || generateNextInvoiceId(data.invoices);
      const zone = activeZones.find((z) => z.id === selectedZoneId);
      const regionName = zone ? zone.name : "غير محدد";
      const customer = newCustomerObj || customers.find((c) => String(c.id) === String(targetId));

      const existingInvoice = editingInvoiceId ? data.invoices.find((i) => i.id === editingInvoiceId) : null;

      // PRE-CREATE PAYMENT LINK ONLY IF NEW OR PRICE CHANGED OR EMPTY
      let createdLink = existingInvoice?.paymentLink || "";
      let createdPaymentId = existingInvoice?.paymentId || "";
      let createdTrackId = (existingInvoice as any)?.paymentTrackId || (existingInvoice as any)?.trackId || (existingInvoice as any)?.track_id || "";
      let createdGatewayOrderId = (existingInvoice as any)?.gatewayOrderId || (existingInvoice as any)?.gateway_order_id || "";

      const priceChanged = existingInvoice ? Math.abs(existingInvoice.totalAmount - totalValue) > 0.005 : true;
      const needsNewPayment = !createdLink || priceChanged;

      if (needsNewPayment) {
        try {
          const response = await fetch("/api/create-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: Number(totalValue.toFixed(3)),
              isAdmin: true,
              customerName: customer?.name || newCustomerName || "Customer",
              customerEmail: customer?.email || "no-email@example.com",
              customerMobile: customer?.phone || customerPhone || "+96500000000",
              orderId: invoiceId,
              description: `Invoice ${invoiceId}`,
              returnUrl: `https://alturathkw.shop/api/payment-return/${invoiceId}`,
              cancelUrl: `https://alturathkw.shop/api/payment-return/${invoiceId}`,
              notificationUrl: `https://admin.alturathkw.shop/api/webhook/upayments`,
            }),
          });
          const paymentData = await response.json();
          if (response.ok) {
            createdLink =
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
            createdPaymentId =
              paymentData.paymentId ||
              paymentData.payment_id ||
              paymentData.session_id ||
              paymentData.data?.paymentId ||
              paymentData.data?.payment_id ||
              paymentData.data?.session_id ||
              paymentData.data?.transaction?.payment_id ||
              "";
            createdTrackId =
              paymentData.paymentTrackId ||
              paymentData.trackId ||
              paymentData.track_id ||
              paymentData.data?.paymentTrackId ||
              paymentData.data?.trackId ||
              paymentData.data?.track_id ||
              paymentData.data?.transaction?.track_id ||
              "";
            createdGatewayOrderId =
              paymentData.gatewayOrderId ||
              paymentData.gateway_order_id ||
              paymentData.data?.gatewayOrderId ||
              paymentData.data?.gateway_order_id ||
              paymentData.data?.order_id ||
              paymentData.data?.transaction?.order_id ||
              "";
          } else {
            const detailMsg = paymentData.message || paymentData.error || "خطأ غير معروف";
            console.warn(
              "Payment creation failed:",
              detailMsg,
            );
            setLoading(false);
            closeWaWindowIfUnused();
            return toast.error(`لم يتم إنشاء رابط الدفع: ${detailMsg}`);
          }
        } catch (err: any) {
          console.error("Payment API Error:", err);
          setLoading(false);
          closeWaWindowIfUnused();
          return toast.error(`ما قدرنا نوصل لخدمة الدفع: ${err?.message || String(err)}`);
        }

        if (!createdLink) {
          setLoading(false);
          closeWaWindowIfUnused();
          return toast.error("لم يتم إنشاء رابط الدفع، لن يتم فتح الواتساب بدون الرابط");
        }
      }

      // Use the Kuwait calendar day, not UTC. This keeps invoices created after
      // midnight on the correct date and preserves the original Kuwait clock when edited.
      const finalInvoiceDate = (() => {
        if (existingInvoice) {
          const existingKuwaitDay = (existingInvoice as any).invoiceDateKey || getKuwaitDateInputValue(existingInvoice.date);
          if (existingKuwaitDay === invoiceDate) return existingInvoice.date;
          return mergeKuwaitDateWithTime(invoiceDate, existingInvoice.date);
        }
        return mergeKuwaitDateWithTime(invoiceDate);
      })();

      const fullAddressValue = [
        regionName ? `المنطقة: ${regionName}` : "",
        addressDetails.block ? `القطعة: ${addressDetails.block}` : "",
        addressDetails.street ? `الشارع: ${addressDetails.street}` : "",
        addressDetails.jaddah ? `الجادة: ${addressDetails.jaddah}` : "",
        addressDetails.building ? `المنزل: ${addressDetails.building}` : "",
        addressDetails.floor ? `الدور: ${addressDetails.floor}` : "",
        addressDetails.apartment ? `الشقة: ${addressDetails.apartment}` : ""
      ].filter(Boolean).join(" - ");

      const deliveryAddressSnapshotValue = {
        area: regionName || "",
        block: addressDetails.block || "",
        street: addressDetails.street || "",
        avenue: addressDetails.jaddah || "",
        house: addressDetails.building || "",
        floor: addressDetails.floor || "",
        apartment: addressDetails.apartment || "",
        fullAddress: fullAddressValue
      };

      const newInvoice: Invoice = {
        ...(existingInvoice || {}),
        id: invoiceId,
        createdAt: (existingInvoice as any)?.createdAt || finalInvoiceDate,
        issuedAt: (existingInvoice as any)?.issuedAt || new Date().toISOString(),
        invoiceDateKey: invoiceDate,
        deliveryDate: invoiceDate,
        deliveryTime: deliveryTime,
        updatedAt: new Date().toISOString(),
        ledgerVisible: true,
        customerId: targetId,
        customerName: customer?.name || newCustomerName || "",
        customerPhone: customer?.phone || customerPhone || "",
        address: { ...(existingInvoice?.address || {}), region: regionName, ...addressDetails },
        area: regionName,
        block: addressDetails.block,
        street: addressDetails.street,
        avenue: addressDetails.jaddah,
        house: addressDetails.building,
        floor: addressDetails.floor,
        apartment: addressDetails.apartment,
        fullAddress: fullAddressValue,
        deliveryAddressSnapshot: deliveryAddressSnapshotValue,
        items: cartItems.map((it) => ({
          ...it,
          productId: it.product!.id,
          name: it.product!.name,
          productName: it.product!.name,
          quantity: it.qty,
        })),
        deliveryFee,
        deliveryType,
        deliveryInfo: {
          company: deliveryCompany,
          regionName: regionName, // Keep original
          zoneName: regionName,
          cost: deliveryCost,
          profit: deliveryProfit,
          finalPrice: deliveryFee,
          settlementTarget: deliverySettlementTarget,
          settlementSupplierId: deliverySettlementSupplierId,
          settlementSupplierName: (data.suppliers || []).find((s: any) => String(s.id) === String(deliverySettlementSupplierId))?.name || deliveryCompany,
        } as any,
        deliverySettlementTarget,
        deliverySettlementSupplierId,
        date: finalInvoiceDate,
        totalAmount: totalValue,
        totalCost: computeInvoiceCost(mockInv, data.products),
        profit: computeInvoiceProfit(mockInv, data.products),
        discount: discountAmount,
        status: existingInvoice?.status || (paymentMethod === "Cash" || paymentMethod === "BankTransfer" ? "تم الدفع" : "بانتظار الدفع"),
        paymentStatus: existingInvoice?.paymentStatus || (paymentMethod === "Cash" || paymentMethod === "BankTransfer" ? "paid" : "pending"),
        paymentMethod: paymentMethod,
        paymentLink: createdLink,
        paymentId: createdPaymentId || createdTrackId,
        payment_id: createdPaymentId || createdTrackId,
        paymentTrackId: createdTrackId || createdPaymentId,
        trackId: createdTrackId || createdPaymentId,
        track_id: createdTrackId || createdPaymentId,
        gatewayOrderId: createdGatewayOrderId,
        gateway_order_id: createdGatewayOrderId,
        gatewayFee: data.settings.gatewayFeeAmount || 0,
        notes: notesText || "---",
      } as any;

      setData((prev) => {
        let baseCustomers = [...(prev.customers || [])];
        if (newCustomerObj) {
          if (!baseCustomers.some((c) => c.id === newCustomerObj!.id)) {
            baseCustomers.push(newCustomerObj);
          }
        }
        const nextState = {
          ...prev,
          invoices: editingInvoiceId
            ? prev.invoices.map((i) =>
                i.id === editingInvoiceId ? newInvoice : i,
              )
            : [...prev.invoices, newInvoice],
          customers: baseCustomers.map((c) =>
            c.id === targetId
              ? {
                  ...c,
                  area: regionName,
                  address: { region: regionName, ...addressDetails },
                }
              : c,
          ),
        };
        return recalculateStateBalances(nextState);
      });

      // Durable ledger mirror: keep newly sent admin/partner invoices visible in the ledger
      // while the main sharded cloud save catches up. This does not alter payment, webhook,
      // notification, or WhatsApp logic; it only mirrors the same invoice object to the
      // lightweight invoices collection so pending invoices cannot vanish from the UI.
      try {
        const firestoreInvoice = JSON.parse(JSON.stringify({
          ...newInvoice,
          updatedAt: new Date().toISOString(),
          ledgerVisible: true,
          source: (newInvoice as any).source || (isPartner ? "partner_invoice" : "admin_invoice"),
        }));
        setDoc(doc(db, "invoices", String(invoiceId)), {
          ...firestoreInvoice,
          updatedAtServer: serverTimestamp(),
        }, { merge: true }).catch((err) => {
          console.warn("Invoice ledger mirror save failed:", err);
        });
      } catch (mirrorErr) {
        console.warn("Invoice ledger mirror payload failed:", mirrorErr);
      }

      // Safe notification nudge for new admin invoices (INV-...).
      // This uses the existing push endpoint and does not change notification delivery logic.
      if (!editingInvoiceId && String(invoiceId).startsWith("INV-")) {
        fetch("/api/push/order-created-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: invoiceId,
            orderNumber: invoiceId,
            total: Number(totalValue.toFixed(3)),
            source: "admin_invoice",
          }),
        }).catch((err) =>
          console.warn("Invoice push alert nudge failed:", err),
        );
      }

      setCart({});
      setLoading(false);

      toast.success("تم الحفظ وإرسال الفاتورة");

      const waLink = getWhatsAppLink(newInvoice);
      if (waLink && waLink !== "#") {
        // Point the tab we already claimed during the click; fall back to a fresh
        // open if the browser never gave us one.
        if (waWindow && !waWindow.closed) waWindow.location.href = waLink;
        else window.open(waLink, "_blank");
      } else {
        closeWaWindowIfUnused();
      }

      if (onFinished) onFinished();
    };

    const renderProductsCatalog = (isMobile: boolean = false) => {
      return (
        <div className={cn(
          "bg-white overflow-hidden text-right",
          isMobile ? "rounded-3xl p-4 border border-slate-200 shadow-sm" : "rounded-3xl p-4 md:p-6 shadow-sm border border-slate-200"
        )} dir="rtl">
          {isMobile && (
            <div className="text-sm font-black text-slate-700 text-right mb-4 flex items-center justify-between border-b pb-3 border-slate-100">
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-full font-black">📋</span>
              <span>تصفح واختيار قائمة الأصناف كاملة</span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="ابحث عن منتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(normalizeArabicNumerals(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold text-slate-700 placeholder:text-slate-400"
              />
            </div>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none font-bold text-xs"
            >
              <option value="all">كل الموردين</option>
              {data.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          {(() => {
            const invoiceCategories = getSharedProductCategories(data, filteredProducts);
            const groupedProducts = invoiceCategories
              .map((category) => ({
                category,
                items: filteredProducts.filter((p: any) => normalizeCategoryName(p?.category) === category),
              }))
              .filter((group) => group.items.length > 0);
            const isSearching = searchQuery.trim().length > 0;
            const renderProductCard = (p: Product) => {
              const supplier = (data.suppliers || []).find((s) => s.id === p.supplierId);
              const supplierName = supplier?.name || "مورد غير معروف";
              
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setOpenCheaperHintId(null);
                    addToCart(p.id);
                  }}
                  className={cn(
                    "invoice-product-card bg-white border p-4 rounded-2xl text-right hover:border-primary transition-all group flex flex-col gap-2 relative ceramic-glint overflow-hidden shadow-sm hover:shadow-xl min-w-0",
                    p.isActive === false
                      ? "border-dashed border-amber-400/60 bg-amber-50/10 hover:border-amber-400"
                      : "border-slate-200"
                  )}
                >
                  {p.isActive === false && (
                    <div className="absolute top-2 right-2 text-amber-700 bg-gradient-to-br from-amber-500/10 to-amber-600/15 border border-amber-500/30 px-2 py-0.5 rounded-lg shadow-sm font-black text-[10px] flex items-center gap-1 z-10 select-none animate-pulse">
                      <span>مخفي 👁️✖️</span>
                    </div>
                  )}
                  {p.isOutOfStock && (
                    <div className="absolute top-2 left-2 text-rose-500 z-10 flex items-center gap-1 bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded-lg border border-rose-100 shadow-sm">
                      <AlertCircle size={14} />
                      <span className="text-[10px] font-bold title-premium">نفد</span>
                    </div>
                  )}
                  {(() => {
                    const bestPrice = getBestPriceInfo(p);
                    if (bestPrice) {
                      return (
                        <span
                          className={cn(
                            "invoice-product-price-hint absolute top-2 left-2 text-amber-500 z-20 p-1 group/cheaper",
                            openCheaperHintId === p.id && "is-open",
                          )}
                          role="button"
                          tabIndex={0}
                          aria-label="معلومة سعر المورد"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setOpenCheaperHintId((current) =>
                              current === p.id ? null : p.id,
                            );
                          }}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onTouchStart={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              setOpenCheaperHintId((current) =>
                                current === p.id ? null : p.id,
                              );
                            }
                          }}
                        >
                          <span className="invoice-price-alert-icon">
                            <AlertTriangle size={16} className="animate-pulse" />
                          </span>
                          <span className="invoice-product-price-popover">
                            <strong>{bestPrice.supplier || "مورد آخر"}</strong>
                            <span>يوفره بسعر أقل!</span>
                            <b>
                              <span className="num-premium">
                                {bestPrice.cost.toFixed(3)}
                              </span>{" "}
                              د.ك
                            </b>
                          </span>
                        </span>
                      );
                    }
                    return null;
                  })()}
                  <h3
                    className={cn(
                      "invoice-product-card-title font-extrabold text-slate-800 title-premium text-[13px] leading-snug min-w-0 mb-1",
                      p.isOutOfStock && "opacity-50",
                    )}
                  >
                    {p.name}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-1.5 mt-auto mb-3">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-400 text-[9px] font-bold border border-slate-100 uppercase tracking-wider">
                      {normalizeCategoryName((p as any).category)}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-primary/5 text-primary/40 text-[8px] font-extralight border border-primary/10 tracking-tighter">
                      {supplierName}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50/50 -mx-4 -mb-4 p-3 border-t border-slate-100/50">
                    <div className="flex items-center gap-0.5">
                      <span className="text-primary font-black num-premium text-base">
                        {p.price.toFixed(3)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 title-premium">
                        د.ك
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all shadow-sm">
                      <Plus size={18} />
                    </div>
                  </div>
                </button>
              );
            };

            if (isSearching) {
              return (
                <div className="invoice-products-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3 overflow-y-auto overflow-x-hidden max-h-[70vh] pr-2 pb-2">
                  {filteredProducts.map(renderProductCard)}
                </div>
              );
            }

            return (
              <div className="space-y-3 overflow-y-auto max-h-[70vh] pr-2">
                {groupedProducts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-bold border border-dashed rounded-2xl">ماكو منتجات</div>
                ) : groupedProducts.map((group) => {
                  const isOpen = activeInvoiceCategory === group.category;
                  return (
                    <div key={group.category} className="border border-slate-100 rounded-3xl overflow-hidden bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => setActiveInvoiceCategory(isOpen ? null : group.category)}
                        className="w-full p-4 flex items-center justify-between text-right hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <div className="font-black text-slate-800">{group.category}</div>
                          <div className="text-[10px] font-bold text-slate-400 mt-1">{group.items.length} منتج</div>
                        </div>
                        <div className={cn("w-9 h-9 rounded-2xl flex items-center justify-center transition-all", isOpen ? "bg-primary text-white rotate-180" : "bg-slate-50 text-primary")}>⌄</div>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="invoice-products-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3 p-4 pt-0 overflow-x-hidden">
                              {group.items.map(renderProductCard)}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      );
    };

    return (
      <div className="invoice-new-page invoice-mobile-flow p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 bg-slate-50 min-h-screen overflow-x-hidden">
        {/* Product Selection (Visible on Desktop only) */}
        <div className="hidden lg:block lg:col-span-2 space-y-4 lg:space-y-6 order-1 invoice-mobile-products">
          {renderProductsCatalog(false)}
        </div>

        {/* Cart Sidebar */}
        <div className="lg:col-span-1 space-y-4 lg:space-y-6 order-2 invoice-mobile-cart">
          <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-200 lg:sticky lg:top-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              السلة <ShoppingCart size={20} className="text-primary" />
            </h2>

            <div className="space-y-4 mb-6">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-900 font-black text-xs">
                  <Clock size={15} className="text-amber-600" />
                  <span>موعد التوصيل المطلوب للعميل</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">تاريخ التوصيل</label>
                    <input
                      type="date"
                      lang="en-GB" dir="ltr"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="invoice-date-input w-full bg-white border border-amber-200/90 rounded-xl px-2 py-2 text-center font-bold text-xs outline-none transition-all focus:ring-2 focus:ring-amber-500/30 [color-scheme:light]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">وقت التوصيل</label>
                    <input
                      type="time"
                      lang="en-GB" dir="ltr"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      className="w-full bg-white border border-amber-200/90 rounded-xl px-2 py-2 text-center font-bold text-xs outline-none transition-all focus:ring-2 focus:ring-amber-500/30 [color-scheme:light]"
                    />
                  </div>
                </div>
              </div>

              <div ref={customerPickerRef} className="relative">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    let val = normalizeArabicNumerals(e.target.value);
                    if (/^[0-9+\s-]*$/.test(val)) val = normalizePhoneDigits(val);
                    setCustomerSearch(val);
                    setSelectedCustomerId("");
                    setIsNewCustomer(false);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="ابحث بالاسم أو التلفون..."
                  className="w-full bg-slate-50 border rounded-2xl p-4 pr-11 text-right font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <Search
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />

                {showCustomerDropdown && (
                  <div className="absolute top-full right-0 left-0 bg-white border border-slate-200 rounded-2xl mt-1 shadow-2xl z-[250] max-h-72 overflow-y-auto">
                    {customerSearch.trim().length > 0 && !exactCustomerSearchMatch && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId("");
                          setIsNewCustomer(true);
                          setNewCustomerName(/^[0-9]+$/.test(customerSearch) ? "" : customerSearch.trim());
                          setCustomerPhone(normalizePhoneDigits(customerSearch));
                          setShowCustomerDropdown(false);
                          toast.info("اخترت إنشاء عميل جديد");
                        }}
                        className="w-full p-4 hover:bg-primary/5 cursor-pointer text-right border-b border-slate-100 flex items-center justify-between group"
                      >
                        <PlusCircle size={16} className="text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-primary">إضافة عميل جديد: {customerSearch}</span>
                          <span className="text-[10px] text-slate-400">سيتم التحقق من رقم الهاتف قبل الحفظ</span>
                        </div>
                      </button>
                    )}

                    {matchingCustomers.map((customer) => (
                      <button
                        type="button"
                        key={String(customer.id || customer.phone)}
                        onClick={() => selectExistingCustomer(customer)}
                        className="w-full p-4 hover:bg-slate-50 cursor-pointer text-right border-b border-slate-100 font-bold flex flex-col items-end"
                      >
                        <span>{customer.name || "عميل بدون اسم"}</span>
                        <span dir="ltr" className="text-xs text-slate-400">{normalizePhoneDigits(customer.phone) || customer.phone}</span>
                        {(customer.area || customer.address) && (
                          <span className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                            {[customer.area, formatFullAddress(customer.address)].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </button>
                    ))}

                    {matchingCustomers.length === 0 && customerSearch.trim().length === 0 && (
                      <div className="p-4 text-center text-xs font-bold text-slate-400">لا توجد بيانات عملاء متاحة</div>
                    )}
                  </div>
                )}
              </div>

              {isNewCustomer && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-3"
                >
                  <div className="text-[10px] font-bold text-primary uppercase">
                    بيانات العميل الجديد
                  </div>
                  <input
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="اسم العميل"
                    className="w-full bg-white border rounded-xl p-2 text-right text-sm"
                  />
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(normalizePhoneDigits(e.target.value))}
                    placeholder="رقم التلفون"
                    inputMode="numeric"
                    maxLength={8}
                    className={cn(
                      "w-full bg-white border rounded-xl p-2 text-right text-sm outline-none",
                      duplicateNewCustomer ? "border-rose-400 ring-2 ring-rose-100" : "border-slate-200",
                    )}
                  />
                  {duplicateNewCustomer && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-right">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-600" />
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-rose-700">هذا الرقم مسجل مسبقاً</div>
                          <div className="mt-1 font-bold text-slate-800">{duplicateNewCustomer.name || "عميل مسجل"}</div>
                          <div dir="ltr" className="text-xs font-bold text-slate-500">{normalizePhoneDigits(duplicateNewCustomer.phone)}</div>
                          {(duplicateNewCustomer.area || duplicateNewCustomer.address) && (
                            <div className="mt-1 text-[11px] font-bold text-slate-500">
                              {[duplicateNewCustomer.area, formatFullAddress(duplicateNewCustomer.address)].filter(Boolean).join(" · ")}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => selectExistingCustomer(duplicateNewCustomer)}
                            className="mt-3 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800"
                          >
                            استخدام العميل الموجود
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

            <select
              value={selectedZoneId}
              onChange={handleZoneChange}
              className="w-full bg-slate-50 border rounded-2xl p-4 text-right font-bold appearance-none outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            >
              <option value="">-- اختر المنطقة --</option>
              {activeZones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>

              {/* فاتورة جديدة: إدارة التوصيل والمستحقات الداخلية */}
              {!isPartner && (
              <div className="space-y-3">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[10px] font-bold text-slate-500 text-right">طريقة التوصيل</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: "company",
                      label: "توصيل شركة",
                      cls: "bg-blue-500 border-blue-500 text-white shadow-blue-100",
                    },
                    {
                      id: "standard",
                      label: "توصيل بربح",
                      cls: "bg-emerald-500 border-emerald-500 text-white shadow-emerald-100",
                    },
                    {
                      id: "free",
                      label: "توصيل مجاني",
                      cls: "bg-amber-500 border-amber-500 text-white shadow-amber-100",
                    },
                    {
                      id: "special",
                      label: "توصيل خاص",
                      cls: "bg-purple-500 border-purple-500 text-white shadow-purple-100",
                    },
                  ].map((t: any) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDeliveryType(t.id)}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-xs font-bold transition-all shadow-sm",
                        deliveryType === t.id
                          ? t.cls
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300",
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <div className="text-[9px] font-bold text-slate-400 text-right mb-1">
                    جهة التوصيل
                  </div>
                  <select
                    value={deliverySettlementSupplierId}
                    onChange={(e) => pickDeliverySettlementEntity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-right text-xs font-bold focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                  >
                    <option value="">تحديد تلقائي / اختر جهة توصيل</option>
                    {getEligibleDeliveryEntities().map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              )}


              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-[10px] font-bold text-slate-500">
                  <span>القطعة</span>
                  <input
                    value={addressDetails.block}
                    onChange={(e) =>
                      setAddressDetails((p) => ({
                        ...p,
                        block: normalizeAddressNumber(e.target.value),
                      }))
                    }
                    placeholder="رقم القطعة"
                    className="bg-slate-50 border rounded-xl p-3 text-right text-sm font-semibold"
                    inputMode="numeric"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[10px] font-bold text-slate-500">
                  <span>الشارع</span>
                  <input
                    value={addressDetails.street}
                    onChange={(e) =>
                      setAddressDetails((p) => ({
                        ...p,
                        street: normalizeAddressNumber(e.target.value),
                      }))
                    }
                    placeholder="رقم الشارع"
                    className="bg-slate-50 border rounded-xl p-3 text-right text-sm font-semibold"
                    inputMode="numeric"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[10px] font-bold text-slate-500">
                  <span>المنزل</span>
                  <input
                    value={addressDetails.building}
                    onChange={(e) =>
                      setAddressDetails((p) => ({
                        ...p,
                        building: normalizeAddressNumber(e.target.value),
                      }))
                    }
                    placeholder="رقم المنزل"
                    className="bg-slate-50 border rounded-xl p-3 text-right text-sm font-semibold"
                    inputMode="numeric"
                  />
                </label>
              </div>

              {/* Mobile embedded products catalog: placed under Address fields and above list of products in cart */}
              <div className="block lg:hidden border-t border-slate-200/60 pt-4 my-4 invoice-mobile-embedded-products">
                {renderProductsCatalog(true)}
              </div>

              {/* Products List (المنتجات) list inside the sidebar - Moved here under the address */}
              <div className="border-t border-b border-indigo-50/50 py-4 my-4">
                <div className="text-sm font-black text-slate-800 text-right mb-3 flex items-center justify-between">
                  <span>المنتجات في السلة</span>
                  <span className="text-xs bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full">{cartItems.length} أصناف</span>
                </div>
                
                {cartItems.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 font-bold border border-dashed rounded-2xl text-xs bg-slate-50/50">
                    السلة فارغة. يرجى اختيار منتجات لإضافتها.
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                    {cartItems.map((it) => (
                      <div
                        key={it.product!.id}
                        className="p-3 border rounded-2xl bg-white space-y-2 hover:shadow-sm transition-all shadow-sm"
                      >
                        <div className="flex justify-between items-start">
                          <button
                            type="button"
                            onClick={() => deleteFromCart(it.product!.id)}
                            className="text-slate-300 hover:text-rose-500 p-1 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <X size={14} />
                          </button>
                          <div className="text-right font-bold text-sm w-40">
                            <div className="truncate">{it.product!.name}</div>
                            {it.product!.isActive === false && (
                              <div className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mt-0.5 select-none hover:bg-amber-100/50 transition-colors">
                                <span>👁️ منتج مخفي بالمنيو</span>
                              </div>
                            )}
                            <div className="text-[9px] font-extralight text-slate-400 opacity-60 mt-0.5 tracking-tighter">
                              {(data.suppliers || []).find(s => s.id === it.product!.supplierId)?.name}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
                            <button
                              type="button"
                              onClick={() => removeFromCart(it.product!.id)}
                              className="p-1.5 hover:bg-white text-slate-600 rounded"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="font-bold text-xs px-1 min-w-[14px] text-center">{it.qty}</span>
                            <button
                              type="button"
                              onClick={() => addToCart(it.product!.id)}
                              className="p-1.5 hover:bg-white text-slate-600 rounded"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <div className="text-left leading-4">
                            <div className="font-bold text-slate-500 text-[10px]">
                              {Number(
                                it.priceAtTime || it.product!.price || 0,
                              ).toFixed(3)}{" "}
                              د.ك للحبة
                            </div>
                            <div className="font-bold text-primary text-xs">
                              الإجمالي:{" "}
                              {(
                                Number(it.priceAtTime || it.product!.price || 0) *
                                Number(it.qty || 1)
                              ).toFixed(3)}{" "}
                              د.ك
                            </div>
                          </div>
                        </div>

                        {Array.isArray(it.product!.addons) &&
                          it.product!.addons.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-50">
                              <div className="text-[10px] font-bold text-slate-400 mb-1">
                                إضافات الوجبة:
                              </div>
                              <div className="grid grid-cols-1 gap-1.5">
                                {normalizeAddonArray(it.product!.addons).map((a: any) => {
                                  const cartAddon = (
                                    Array.isArray(it.addons) ? it.addons : []
                                  ).find((ca) => getAddonKey(ca) === getAddonKey(a));
                                  const effectiveAddon = { ...a, ...(cartAddon || {}) };
                                  const limits = getAddonRuleLimits(effectiveAddon, it.qty || 1);
                                  const currentQty = cartAddon
                                    ? cartAddon.quantity
                                    : 0;
                                  return (
                                    <div
                                      key={getAddonKey(a)}
                                      className={cn(
                                        "flex justify-between items-center p-1.5 rounded-lg",
                                        limits.available ? "bg-slate-100/50" : "bg-slate-50 opacity-60",
                                      )}
                                    >
                                      <div className="flex items-center gap-1.5 bg-white rounded-md p-0.5 border border-slate-200">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateAddonQuantity(
                                              it.product!.id,
                                              getAddonKey(a),
                                              -1,
                                            )
                                          }
                                          className="w-6 h-6 flex items-center justify-center hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
                                          disabled={
                                            !limits.available || currentQty <= 0 || ((a.isRequired || a.quantityRule?.mode === "required" || a.quantityRule?.mode === "auto") && currentQty <= limits.min)
                                          }
                                        >
                                          <Minus size={11} />
                                        </button>
                                        <span className="text-[10px] font-black min-w-5 text-center">
                                          {currentQty}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateAddonQuantity(
                                              it.product!.id,
                                              getAddonKey(a),
                                              1,
                                            )
                                          }
                                          className="w-6 h-6 flex items-center justify-center hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
                                          disabled={
                                            !limits.available || currentQty >= limits.max
                                          }
                                        >
                                          <Plus size={11} />
                                        </button>
                                      </div>
                                      <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-slate-700">
                                          {a.name}
                                        </span>
                                        {a.isHiddenPrice ? null : (
                                          <span className="text-[8px] text-slate-400">
                                            {Number(a.price || 0).toFixed(3)} د.ك
                                          </span>
                                        )}
                                        {Number(a.freeQuantity || 0) > 0 && (
                                          <span className="text-[8px] text-emerald-600 font-bold">
                                            أول {a.freeQuantity} مجاناً
                                          </span>
                                        )}
                                        {(a.isRequired || Number(a.minQuantity || 0) > 0 || a.quantityRule?.mode === "required") && (
                                          <span className="text-[8px] text-indigo-500 font-bold">
                                            إلزامي
                                          </span>
                                        )}
                                        {!limits.available && (
                                          <span className="text-[8px] text-rose-600 font-bold">
                                            متاحة من كمية {limits.minProductQty}+
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* خيارات الخصم (رقم ونسبة) - Moved directly under list of products */}
              <div className="space-y-1.5 border-t border-b border-dashed border-slate-200/80 py-4 my-3" dir="rtl">
                <div className="text-[10px] font-bold text-slate-500 text-right uppercase">
                  خصم إضافي (رقم ونسبة)
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 min-w-0">
                    <input
                      type="number"
                      step={discountType === "amount" ? "0.050" : "1"}
                      min="0"
                      value={discountValue || ""}
                      onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder={discountType === "amount" ? "مثال: 1.500 د.ك" : "مثال: 10%"}
                      className="w-full min-w-0 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-right font-bold focus:ring-2 focus:ring-primary/20 transition-all text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-2xl shrink-0 w-full sm:w-44">
                    <button
                      type="button"
                      onClick={() => setDiscountType("amount")}
                      className={cn(
                        "rounded-xl text-[11px] font-black transition-all py-1.5",
                        discountType === "amount"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
                      )}
                    >
                      مبلغ (د.ك)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("percentage")}
                      className={cn(
                        "rounded-xl text-[11px] font-black transition-all py-1.5",
                        discountType === "percentage"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
                      )}
                    >
                      نسبة (%)
                    </button>
                  </div>
                </div>
              </div>
            </div>



            <div className="space-y-2 border-t pt-4 invoice-mobile-total">
              <div className="flex justify-between text-xs text-slate-500 font-bold">
                <span>المنتجات</span>{" "}
                <span>
                  {getInvoiceBaseItemsTotal(mockInv, data.products).toFixed(3)}{" "}
                  د.ك
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-bold">
                <span>الإضافات</span>{" "}
                <span>
                  {computeInvoiceAddonsTotal(mockInv, data.products).toFixed(3)}{" "}
                  د.ك
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-bold">
                <span>المجموع</span> <span>{subtotal.toFixed(3)} د.ك</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-bold">
                <span>توصيل</span> <span>{deliveryFee.toFixed(3)} د.ك</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-rose-500 font-bold">
                  <span>خصم</span> <span>-{discountAmount.toFixed(3)} د.ك</span>
                </div>
              )}
              <div className="flex justify-between items-center gap-3 text-base sm:text-lg font-bold text-rose-600 bg-rose-50 p-3 rounded-xl mt-2 border border-rose-100">
                <span>الإجمالي</span> <span className="mobile-money">{totalValue.toFixed(3)} د.ك</span>
              </div>
            </div>

            <button
              disabled={loading}
              onClick={handleCreateInvoice}
              className="invoice-mobile-submit w-full mt-4 sm:mt-6 bg-rose-600 text-white py-3.5 sm:py-4 rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all hover:-translate-y-1 active:scale-95"
            >
              إصدار الفاتورة
            </button>
          </div>
        </div>
      </div>
    );
  },
);

export default InvoicePage;
