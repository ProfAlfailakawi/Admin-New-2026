import React, { useState, useMemo, useEffect } from "react";
import {
  Package,
  Slash,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Truck,
  Tag,
  BarChart3,
  Clock,
  PlusCircle,
  Sparkles,
  Layers,
  Camera,
  Gift,
  Copy,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
  PackageX,
  PackageCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AppState, Product } from "../types";
import { DEFAULT_GLOBAL_LOGO } from "../constants";
import { NumericInput } from "./ui/NumericInput";
import { StatCardComponent } from "./StatCard";
import { cn, normalizeArabic, robustNormalize } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import ConfirmModal from "./ui/ConfirmModal";
import { SmartOfferModal } from "./SmartOfferModal";
import { findBestProductMatch } from "../lib/name-matching";
import { storage, auth } from "../firebase";
import {
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
} from "firebase/storage";

// import { getDeduplicatedProducts } from '../lib/deduplication';

interface ProductPageProps {
  data: AppState;
  setData: React.Dispatch<React.SetStateAction<AppState>>;
  deepLinkData?: { search?: string; exactId?: string };
  onClearDeepLink?: () => void;
}

const ProductPage: React.FC<ProductPageProps> = ({
  data,
  setData,
  deepLinkData,
  onClearDeepLink,
}) => {
  const [search, setSearch] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");

  useEffect(() => {
    if (deepLinkData?.search) {
      setSearch(deepLinkData.search);
      if (onClearDeepLink) onClearDeepLink();
    }
  }, [deepLinkData, onClearDeepLink]);

  const [filterType, setFilterType] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [productForm, setProductForm] = useState({
    name: "",
    price: 0,
    cost: 0,
    category: "عام",
    supplierId: "",
    imageUrl: "",
    isActive: true,
    isOutOfStock: false,
  });
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [showProfitWarning, setShowProfitWarning] = useState(false);

  // Smart Name Matching Logic
  useEffect(() => {
    if (!productForm.name || editingId) {
      setSuggestion(null);
      return;
    }

    const timer = setTimeout(() => {
      const match = findBestProductMatch(
        productForm.name,
        data.products || [],
        data.nameMatchMemory || {},
      );

      // Don't suggest if it's the exact same as current input (already matched)
      if (match && match !== productForm.name) {
        setSuggestion(match);
      } else {
        setSuggestion(null);
      }
    }, 400); // Debounce to prevent heavy calc on every keystroke

    return () => clearTimeout(timer);
  }, [productForm.name, data.products, data.nameMatchMemory, editingId]);

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [showMarketingModal, setShowMarketingModal] = useState<Product | null>(
    null,
  );
  const [smartOfferTarget, setSmartOfferTarget] = useState<Product | null>(
    null,
  );
  const [marketingContent, setMarketingContent] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  const activeInvoices = (data?.invoices || []).filter((inv) => !inv.isDeleted);

  const getProductStats = (productId: string) => {
    const items = (activeInvoices || [])
      .flatMap((inv) => inv.items || [])
      .filter((item) => item.productId === productId);
    const sales = items.reduce((acc, item) => acc + (item.quantity || 0), 0);
    const revenue = items.reduce(
      (acc, item) => acc + (item.priceAtTime || 0) * (item.quantity || 0),
      0,
    );
    const profit = items.reduce(
      (acc, item) =>
        acc +
        ((item.priceAtTime || 0) - (item.costAtTime || 0)) *
          (item.quantity || 0),
      0,
    );

    const lastSale = (activeInvoices || [])
      .filter((inv) =>
        (inv.items || []).some((item) => item.productId === productId),
      )
      .sort(
        (a, b) =>
          new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime(),
      )[0]?.date;

    return { sales, revenue, profit, lastSale };
  };

  const bestProducts = useMemo(() => {
    return [...(data?.products || [])]
      .filter((p) => {
        const stats = getProductStats(p.id);
        return stats.sales > 0; // Exclude products with no sales
      })
      .sort((a, b) => {
        const marginA = (a.price || 0) > 0 ? (a.price - a.cost) / a.price : 0;
        const marginB = (b.price || 0) > 0 ? (b.price - b.cost) / b.price : 0;
        return marginB - marginA; // Sort by profit margin percentage
      })
      .slice(0, 3);
  }, [data?.products, data?.invoices]);

  const filteredProducts = useMemo(() => {
    // Reverted to simple products list
    const deduplicated = data?.products || [];

    const pStats = deduplicated.map((p) => ({
      p,
      stats: getProductStats(p.id),
    }));
    const normalizedSearch = normalizeArabic(search);

    return pStats
      .filter(({ p, stats }) => {
        const matchesSearch = normalizeArabic(p.name || "").includes(
          normalizedSearch,
        );
        const matchesSupplier =
          selectedSupplierId === "all" || p.supplierId === selectedSupplierId;

        let matchesPerformance = true;
        if (filterType !== "all") {
          const { sales } = stats;
          if (filterType === "star") matchesPerformance = sales > 10;
          if (filterType === "slow")
            matchesPerformance = sales > 0 && sales < 3;
          if (filterType === "new") matchesPerformance = sales === 0;
        }

        return matchesSearch && matchesPerformance && matchesSupplier;
      })
      .map((pStat) => pStat.p)
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
  }, [data?.products, data?.invoices, search, filterType, selectedSupplierId]);

  const highestMargin = (data?.products || []).reduce((max, p) => {
    const stats = getProductStats(p.id);
    if (stats.sales === 0) return max; // Skip products with no sales
    const marginPercent =
      (p.price || 0) > 0
        ? (((p.price || 0) - (p.cost || 0)) / (p.price || 1)) * 100
        : 0;
    return marginPercent > max ? marginPercent : max;
  }, 0);

  const totalSalesVolume = (activeInvoices || [])
    .flatMap((inv) => inv.items || [])
    .reduce((acc, item) => acc + (item.quantity || 0), 0);
  const totalProductProfits = (activeInvoices || []).reduce(
    (acc, inv) => acc + (inv.profit || 0),
    0,
  );
  const totalProductCost = (activeInvoices || []).reduce(
    (acc, inv) => acc + (inv.totalCost || 0),
    0,
  );

  const handleDeleteProduct = (product: Product) => {
    // Check only ACTIVE invoices
    const isUsedInActiveInvoices = activeInvoices.some((inv) =>
      inv.items.some((item) => item.productId === product.id),
    );

    if (isUsedInActiveInvoices) {
      const errorMsg = `لا يمكن حذف المنتج"${product.name}" لآنه مسجل في فواتير مبيعات نشطة.`;
      setDeleteError(errorMsg);
      setShakingId(product.id);

      // Global visible feedback
      toast.error("تنبيه الحماية", {
        description: errorMsg,
        duration: 6000,
        position: "bottom-right",
      });

      setProductToDelete(null);
      setTimeout(() => {
        setDeleteError(null);
        setShakingId(null);
      }, 5000);
      return;
    }

    setData((prev) => ({
      ...prev,
      products: (prev?.products || []).filter((p) => p.id !== product.id),
    }));
    setProductToDelete(null);
  };

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
        supplier: (data?.suppliers || []).find((s) => s.id === best.supplierId)
          ?.name,
      };
    }
    return null;
  };

  // Removed inner imports

  const handleFileChange = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        toast.error("حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)");
        return;
      }

      setUploading(true);

      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            try {
              // Enhanced scaling for better performance and mobile visibility
              const max_size = 400; 
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

              const canvas = document.createElement("canvas");
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              
              // Use better image smoothing
              if (ctx) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
              }

              // Compress more aggressively for cloud storage efficiency
              const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
              setProductForm((prev) => ({ ...prev, imageUrl: dataUrl }));
              toast.success("تم رفع الصورة وضبط حجمها تلقائياً ✅");
              setUploading(false);
            } catch (err: any) {
              console.error("Process error:", err);
              toast.error("خطأ في معالجة أبعاد الصورة");
              setUploading(false);
            }
          };
          img.onerror = () => {
            setUploading(false);
            toast.error("الملف المختار ليس صورة صالحة");
          };
          img.src = event.target?.result as string;
        };
        reader.onerror = () => {
          setUploading(false);
          toast.error("فشل قراءة الملف من الجهاز");
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setUploading(false);
        toast.error("خطأ تقني في مشغل الصور");
      }
    },
    [],
  );

  const handleSaveProduct = React.useCallback(
    (force = false) => {
      if (!productForm.name || !productForm.supplierId || isSaving) return;

      const parsedPrice = parseFloat(productForm.price as any) || 0;
      const parsedCost = parseFloat(productForm.cost as any) || 0;

      if (parsedPrice <= parsedCost) {
        setPriceError(
          "لا يمكن أن يكون سعر البيع أقل من أو يساوي تكلفة المنتج.",
        );
        return;
      }

      // Low profit warning for NEW products if profit < 1 KD
      const profit = parsedPrice - parsedCost;
      if (!editingId && profit < 1.0 && !force) {
        setShowProfitWarning(true);
        return;
      }

      setPriceError(null);
      setShowProfitWarning(false);

      // 1. Pre-normalize input for precise comparison
      const normalizedInput = robustNormalize(productForm.name || "");
      if (!normalizedInput) return;

      // 2. Comprehensive duplicate check
      const allProducts = data.products || [];
      
      const duplicateProduct = allProducts.find((p) => {
        // Skip current item if editing
        if (editingId && p.id === editingId) return false;

        // Robust name comparison and supplier validation
        const normalizedExistingName = robustNormalize(p.name || "");
        const isNameMatch = normalizedExistingName === normalizedInput;
        const isSupplierMatch = p.supplierId === productForm.supplierId;
        
        return isNameMatch && isSupplierMatch;
      });

      if (duplicateProduct) {
        toast.error("تنبيه الحماية من التكرار 🛡️", {
          description: `الاسم "${productForm.name}" مسجل مسبقاً لهذا المورد. يرجى استخدام اسم مختلف لتمييز الصنف.`,
          duration: 6000,
        });
        return;
      }

      setIsSaving(true);
      try {
        const finalProductData = {
          ...productForm,
          price: parsedPrice,
          cost: parsedCost,
        };

        // record this mapping so we can suggest it faster/better next time.
        const normalizedInput = normalizeArabic(productForm.name);
        const existingProduct = (data.products || []).find(
          (p) => p.name === productForm.name,
        );

        // update state with mapping memory
        const updatedMemory = { ...(data.nameMatchMemory || {}) };
        if (existingProduct) {
          updatedMemory[normalizedInput] = existingProduct.name;
        }

        if (editingId) {
          setData((prev) => ({
            ...prev,
            products: (prev?.products || []).map((p) =>
              p.id === editingId ? { ...p, ...finalProductData } : p,
            ),
            nameMatchMemory: updatedMemory,
          }));
        } else {
          const id = Math.random().toString(36).substr(2, 9);
          const createdAt = new Date().toISOString();
          setData((prev) => ({
            ...prev,
            products: [
              ...(prev?.products || []),
              { ...finalProductData, id, createdAt },
            ],
            nameMatchMemory: updatedMemory,
          }));
        }
        closeModal();
      } catch (error) {
        console.error("Error saving product:", error);
        toast.error("حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.");
      } finally {
        setIsSaving(false);
      }
    },
    [productForm, editingId, data, setData, isSaving],
  );

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncToCustomerApp = async () => {
    setIsSyncing(true);
    const toastId = toast.loading("جاري مزامنة المنتجات مع تطبيق العميل...");

    try {
      const { seedClientDatabase } = await import("../scripts/seed-client-db");
      await seedClientDatabase(data);

      toast.success("تمت المزامنة بنجاح 🚀", {
        description: "تم توحيد المنتجات المكررة ونشرها لتطبيق العميل بنجاح.",
        id: toastId,
      });
    } catch (error) {
      console.error("Sync Error:", error);
      toast.error("فشل المزامنة مع تطبيق العميل", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setPriceError(null);
    setProductForm({
      name: "",
      price: 0,
      cost: 0,
      category: "عام",
      supplierId: "",
      imageUrl: "",
      isActive: true,
      isOutOfStock: false,
    });
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.id);
    setPriceError(null);
    setProductForm({
      name: product.name,
      price: product.price,
      cost: product.cost,
      category: product.category || "عام",
      supplierId: product.supplierId,
      imageUrl: product.imageUrl || "",
      isActive: product.isActive !== false,
      isOutOfStock: !!product.isOutOfStock,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setPriceError(null);
    setShowProfitWarning(false);
  };

  const generateMarketing = (product: Product) => {
    const descText = product.description
      ? `\nتفاصيل: ${product.description}`
      : "";
    const caloriesText = product.calories
      ? `\nالسعرات: ${product.calories} كالوري`
      : "";

    const invoices = (data?.invoices || []).filter((i) => !i.isDeleted);
    const soldCount = invoices
      .flatMap((inv) => inv.items || [])
      .filter((item) => item.productId === product.id)
      .reduce((sum, item) => sum + (item.quantity || 0), 0);

    let newContent = "";

    if (soldCount > 0) {
      newContent = `تحليل البيانات: إجمالي المبيعات المؤكدة للمنتج"${product.name}" بلغ ${soldCount} طلب.\n\nالنتيجة: الصنف يحظى بطلب فعلي ومثبت، مما يعزز ثقة العميل الجديد لتجربته.\n\nمحتوى الحملة المقترح:"المنتج المفضل والموثوق لدى عملائنا! طبق (${product.name}) متوفر بسعر ${product.price} د.ك.${descText}${caloriesText}\nاطلبه الآن وكن جزءاً من تجربة الطعم الكويتي."`;
    } else {
      newContent = `تحليل البيانات: لا يوجد مبيعات سابقة مسجلة للمنتج"${product.name}" في النظام.\n\nالنتيجة: هذا المنتج يحتاج إلى حملة تعريفية للترويج لأول مرة لاختبار استجابة السوق.\n\nمحتوى الحملة المقترح:"منتج جديد ينضم لقائمتنا: (${product.name}).\nسعر الطرح: ${product.price} د.ك.${descText}${caloriesText}\nكن أول من يجربه الآن!"`;
    }

    setMarketingContent(newContent);
    if (!showMarketingModal) setShowMarketingModal(product);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-right">
        <div className="order-2 md:order-1 flex-1">
          <h1 className="text-xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-2 justify-end leading-tight">
            إدارة المنتجات والأصناف
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
              <Package className="text-white" />
            </div>
          </h1>
          <p className="text-slate-500 font-medium font-bold italic">
            قائمة الطعام والتكاليف التشغيلية لكل صنف
          </p>
        </div>
      </div>

      {bestProducts.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-2xl p-3 md:p-3 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-row-reverse">
            <h3 className="font-bold text-lg text-amber-800 flex items-center gap-2">
              أعلى هامش ربح (الأكثر مبيعاً) <TrendingUp size={20} />
            </h3>
            <span className="text-xs font-black text-amber-600 bg-amber-100/50 px-3 py-1 rounded-lg border border-amber-200/50">
              أفضل 3 أصناف
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {bestProducts.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-amber-100/50 p-3 rounded-2xl flex items-center justify-between text-right shadow-sm hover:-translate-y-1 transition-all"
              >
                 <div className="flex flex-col gap-1 w-full pl-2">
                  <h4 className="font-bold text-slate-800 text-[13px] sm:text-[14px] leading-tight text-right line-clamp-1">{p.name}</h4>
                  <div className="flex items-center gap-1 flex-row-reverse text-slate-500">
                     <Truck size={10} />
                     <span className="text-[10px] font-bold">
                       {data.suppliers?.find((s) => s.id === p.supplierId)?.name || "مورد"}
                     </span>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center shrink-0 pr-3 border-r border-amber-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">هامش الربح</span>
                  <span className="text-[14px] font-black text-emerald-600">%{(
                    (((p.price || 0) - (p.cost || 0)) / (p.price || 1)) * 100
                  ).toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 gap-2 md:p-2">
        <StatCardComponent
          label="إجمالي المنتجات"
          value={(data?.products || []).length}
          icon={<Package size={18} />}
          color="blue"
          description="عدد الأصناف المسجلة"
        />
        <StatCardComponent
          label="أرباح المبيعات"
          value={Number(totalProductProfits || 0).toFixed(3)}
          icon={<TrendingUp size={18} />}
          color="emerald"
          description="صافي الربح"
        />
        <StatCardComponent
          label="إجمالي التكلفة"
          value={Number(totalProductCost || 0).toFixed(3)}
          icon={<DollarSign size={18} />}
          color="red"
          description="تكلفة المبيعات"
        />
        <StatCardComponent
          label="مبيعات الوحدات"
          value={totalSalesVolume}
          icon={<ShoppingBag size={18} />}
          color="amber"
          description="الكمية المباعة"
        />
        <StatCardComponent
          label="أعلى هامش ربح"
          value={`${(highestMargin || 0).toFixed(1)}%`}
          icon={<BarChart3 size={18} />}
          color="blue"
          description="كفاءة التسعير"
        />
      </div>

      <AnimatePresence>
        {deleteError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-red-50 border border-red-200 p-3 rounded-2xl flex items-center gap-2 text-red-600 font-bold shadow-sm"
          >
            <AlertCircle />
            <span>{deleteError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-[32px] p-3 md:p-3 border border-slate-200 shadow-sm text-right">
        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="ابحث عن اسم المنتج..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-right"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openAddModal}
              className="bg-slate-900 text-white px-4 md:px-8 py-3.5 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl active:scale-95"
            >
              <Plus size={20} />
              <span>إضافة منتج جديد</span>
            </button>
          </div>
        </div>

        {/* Smart Filters Bar */}
        <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center justify-end gap-2 mb-10 pb-6 border-b border-slate-100 md:flex-row-reverse">
          <div className="bg-slate-50 p-2 rounded-2xl flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase mr-2 text-right">
              المورد:
            </span>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 font-black text-xs text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-right"
            >
              <option value="all">الكل</option>
              {(data?.suppliers || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex overflow-x-auto hide-scrollbar bg-slate-100 p-1.5 rounded-2xl gap-1 shrink-0 flex-row-reverse w-full md:w-auto">
            {[
              { id: "all", label: "الكل", icon: <Package size={14} /> },
              { id: "star", label: "نار 🔥", icon: <Sparkles size={14} /> },
              { id: "slow", label: "بطيء ⚠️", icon: <AlertCircle size={14} /> },
              { id: "new", label: "جديد ✨", icon: <Clock size={14} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-[11px] font-black transition-all whitespace-nowrap",
                  filterType === tab.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                <span>{tab.label}</span>
                {tab.icon}
              </button>
            ))}
          </div>

          <div className="h-8 w-[1px] bg-slate-200 hidden md:block" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-4 md:gap-5 md:p-2">
          {(filteredProducts || []).length === 0 ? (
            <div className="col-span-full py-20 px-4 flex flex-col items-center justify-center text-center bg-white/50 backdrop-blur-sm border border-slate-100 border-dashed rounded-3xl md:rounded-2xl">
              <div className="w-24 h-24 mb-6 rounded-3xl bg-primary/5 flex items-center justify-center text-primary/40 relative">
                <div className="absolute inset-0 bg-primary/10 rounded-3xl animate-ping opacity-20" />
                <Package size={48} />
              </div>
              <h3 className="text-xl md:text-3xl font-black text-slate-800 mb-3 tracking-tight">
                لا توجد منتجات حالياً!
              </h3>
              <p className="text-slate-500 font-bold max-w-sm mb-8 leading-relaxed">
                قائمتك فارغة تماماً. أضف أول صنف وابدأ في رحلة الأرباح وتحليل
                التكاليف.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-primary text-white hover:bg-primary/90 px-4 md:px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all active:scale-95 hover:rotate-1"
              >
                <Plus size={24} />
                <span>ابدأ رحلتك وضيف أول منتج الآن!</span>
              </button>
            </div>
          ) : (
            (filteredProducts || []).map((product) => {
              const margin = (product.price || 0) - (product.cost || 0);
              const marginPercent = (margin / (product.price || 1)) * 100;
              const { sales, revenue, lastSale, profit } = getProductStats(
                product.id,
              );
              const supplier = (data?.suppliers || []).find(
                (s) => s.id === product.supplierId,
              );
              const isSlow = sales > 0 && sales < 3;

              return (
                <motion.div
                  key={product.id}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  animate={
                    shakingId === product.id
                      ? {
                          x: [0, -5, 5, -5, 5, 0],
                          borderColor: [
                            "rgba(241,245,249,1)",
                            "rgba(239,68,68,1)",
                            "rgba(239,68,68,1)",
                            "rgba(241,245,249,1)",
                          ],
                        }
                      : {}
                  }
                  transition={shakingId === product.id ? { duration: 0.5 } : {}}
                  className={cn(
                    "bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm hover:shadow-xl transition-all relative text-right flex flex-col z-10 group",
                    product.isActive === false
                      ? "opacity-80 grayscale-[0.3]"
                      : "hover:border-primary/40",
                    shakingId === product.id &&
                      "ring-4 ring-red-500 ring-offset-2",
                  )}
                >
                  {/* FULLY CLIPPED IMAGE CONTAINER */}
                  <div 
                    className="w-full h-[140px] overflow-hidden relative bg-slate-50 border-b border-slate-100 group/img isolate"
                    style={{ borderRadius: '24px 24px 0 0' }}
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover block transition-transform duration-700 group-hover/img:scale-110 pointer-events-none"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white pointer-events-none">
                        <img
                          src={data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO}
                          alt="Logo"
                          className="w-20 h-20 object-contain opacity-40 grayscale"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    
                    {/* Modern Status Badge (Top-Left) */}
                    <div className="absolute top-2.5 left-2.5 z-30 flex flex-row gap-2">
                       <button 
                         title={product.isOutOfStock ? 'إتاحة المنتج للبيع' : 'إيقاف البيع (نفدت الكمية)'}
                         onClick={(e) => {
                           e.stopPropagation();
                           setData((prev) => ({
                             ...prev,
                             products: (prev.products || []).map((p) =>
                               p.id === product.id ? { ...p, isOutOfStock: !p.isOutOfStock } : p
                             ),
                           }));
                           toast.info(product.isOutOfStock ? '✅ المادة متوفرة الآن' : '🚫 سجلت كنفدت الكمية');
                         }}
                         className={cn(
                           "flex items-center justify-center p-2 rounded-xl shadow-lg backdrop-blur-md border transition-all hover:scale-110 active:scale-90 text-[10px] font-black w-8 h-8",
                           product.isOutOfStock ? "bg-rose-500 hover:bg-rose-600 border-rose-400 text-white" : "bg-emerald-500 hover:bg-emerald-600 border-emerald-400 text-white"
                         )}
                       >
                         {product.isOutOfStock ? <PackageCheck size={16} /> : <PackageX size={16} />}
                       </button>

                       <button 
                         title={product.isActive !== false ? 'إخفاء المنتج من القائمة' : 'إظهار المنتج في القائمة'}
                         onClick={(e) => {
                           e.stopPropagation();
                           setData((prev) => ({
                             ...prev,
                             products: (prev.products || []).map((p) =>
                               p.id === product.id ? { ...p, isActive: p.isActive === false } : p
                             ),
                           }));
                           toast.info(product.isActive !== false ? '👁️ تم إخفاء المنتج' : '👁️ تم إظهار المنتج');
                         }}
                         className={cn(
                           "flex items-center justify-center p-2 rounded-xl shadow-lg backdrop-blur-md border transition-all hover:scale-110 active:scale-90 text-[10px] font-black w-8 h-8",
                           product.isActive !== false ? "bg-slate-700 hover:bg-slate-800 border-slate-600 text-white" : "bg-amber-500 hover:bg-amber-600 border-amber-400 text-white"
                         )}
                       >
                         {product.isActive !== false ? <EyeOff size={16} /> : <Eye size={16} />}
                       </button>
                    </div>

                    {/* Price Tag Overlay */}
                    <div className="absolute bottom-2.5 right-2.5 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-[12px] shadow-xl border border-white/5 z-20 pointer-events-none">
                      <span className="text-[14px] font-black text-white tracking-widest leading-none">
                        {Number(product.price || 0).toFixed(3)}
                      </span>
                    </div>

                    {/* Marketing Badges (Top Right) */}
                    <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 items-end z-10">
                      {isSlow && (
                        <span 
                          title="هذا المنتج حركته بطيئة مقارنة بباقي المنتجات"
                          className="bg-rose-500/80 backdrop-blur-sm text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white/10 uppercase cursor-help pointer-events-auto">
                          بطيء الحركة
                        </span>
                      )}
                      {sales > 10 && (
                        <span className="bg-emerald-500/80 backdrop-blur-sm text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white/10 uppercase pointer-events-auto">
                          Hot
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 flex flex-col flex-1 gap-4">
                    <div className="space-y-0.5 sm:space-y-1">
                      <h3 className="font-black text-slate-800 text-[13px] sm:text-lg leading-[1.4] mb-0.5 sm:mb-1 line-clamp-2 min-h-[36px] sm:min-h-[50px] text-right">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-1 sm:gap-1.5 flex-row-reverse justify-end text-slate-400 group-hover:text-primary transition-colors">
                        <Truck size={10} className="sm:size-[12px] shrink-0" />
                        <span className="text-[9px] sm:text-xs font-bold leading-tight">
                          {supplier?.name || "مورد مجهول"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 sm:gap-1.5 bg-slate-50/50 p-1 sm:p-1.5 rounded-[16px] sm:rounded-[24px] border border-slate-100 shadow-inner">
                      <div className="bg-white rounded-[12px] sm:rounded-[18px] p-1.5 sm:p-3 shadow-sm border border-slate-100 flex flex-col items-center justify-center">
                        <span className="text-[7px] sm:text-[10px] font-black text-slate-400 uppercase mb-0.5">
                          البيع
                        </span>
                        <span className="text-[10px] sm:text-base font-black text-slate-900 tracking-tight">
                          {Number(product.price || 0).toFixed(3)}
                        </span>
                      </div>
                      <div className="bg-white rounded-[12px] sm:rounded-[18px] p-1.5 sm:p-3 shadow-sm border border-slate-100 flex flex-col items-center justify-center">
                        <span className="text-[7px] sm:text-[10px] font-black text-slate-400 uppercase mb-0.5">
                          التكلفة
                        </span>
                        <span className="text-[10px] sm:text-base font-black text-slate-500 tracking-tight">
                          {Number(product.cost || 0).toFixed(3)}
                        </span>
                      </div>
                      <div className="col-span-2 bg-emerald-500/10 rounded-[12px] sm:rounded-[18px] p-1.5 sm:p-3 border border-emerald-500/20 flex items-center justify-between px-2 sm:px-6">
                        <span className="text-[8px] sm:text-xs font-black text-emerald-600 uppercase">
                          هامش الربح
                        </span>
                        <span className="text-[11px] sm:text-lg font-black text-emerald-600 tracking-tighter">
                          %{Number(marginPercent || 0).toFixed(0)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto flex flex-col gap-2 pt-2 sm:pt-3 border-t border-slate-100/50">
                      {/* Marketing / Edit / Delete */}
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          onClick={() => generateMarketing(product)}
                          className="h-10 sm:h-12 bg-pink-50 text-pink-500 border border-pink-100 rounded-xl flex items-center justify-center hover:bg-pink-500 hover:text-white transition-all shadow-sm active:scale-95 group/btn"
                          title="تسويق"
                        >
                          <Camera
                            size={16}
                            className="sm:size-[20px] group-hover/btn:scale-110 transition-transform"
                          />
                        </button>
                        <button
                          onClick={() => setSmartOfferTarget(product)}
                          className="h-10 sm:h-12 bg-indigo-50 text-indigo-500 border border-indigo-100 rounded-xl flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all shadow-sm active:scale-95 group/btn"
                          title="خصومات"
                        >
                          <Tag
                            size={16}
                            className="sm:size-[20px] group-hover/btn:scale-110 transition-transform"
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(product);
                          }}
                          className="h-10 sm:h-12 flex items-center justify-center bg-white border border-slate-200 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 rounded-xl transition-all shadow-sm active:scale-95 group/btn"
                          title="تعديل البيانات"
                        >
                          <Edit2 size={16} className="sm:size-[20px] group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductToDelete(product);
                          }}
                          className="h-10 sm:h-12 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 rounded-xl transition-all shadow-sm active:scale-95 group/btn"
                          title="حذف المنتج"
                        >
                          <Trash2 size={16} className="sm:size-[20px] group-hover/btn:scale-110 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[40px] w-[95%] max-w-lg shadow-2xl p-0 border border-slate-100 text-right flex flex-col max-h-[90dvh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Fixed */}
              <div className="p-3 md:p-3 pb-0 shrink-0">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 justify-end leading-tight">
                  {editingId ? "تعديل بيانات المنتج" : "إضافة منتج جديد كلياً"}
                  <PlusCircle className="text-primary" />
                </h2>
              </div>

              <div className="overflow-y-auto custom-scrollbar flex-1 p-3 md:p-3 pt-6 min-h-0">
                {priceError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-100 flex items-center gap-2 text-sm font-bold text-right mb-6">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{priceError}</span>
                  </div>
                )}

                <div className="space-y-6">
                  <AnimatePresence>
                    {suggestion && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-4"
                      >
                        <div
                          className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between gap-2 group/suggestion cursor-pointer hover:bg-indigo-100 transition-all active:scale-95"
                          onClick={() => {
                            setProductForm({
                              ...productForm,
                              name: suggestion,
                            });
                            setSuggestion(null);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-indigo-500 shadow-sm">
                              <Sparkles size={16} />
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-indigo-400 uppercase">
                                توجيه الذكاء: هل تقصد هذا المنتج؟
                              </p>
                              <p className="text-sm font-black text-indigo-900">
                                {suggestion}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs font-black text-indigo-600 bg-white px-3 py-1 rounded-full border border-indigo-200">
                            اختيار الاسم الموحد
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase mr-1 block">
                      اسم المنتج بالكامل
                    </label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) =>
                        setProductForm({ ...productForm, name: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-black text-slate-800 text-right text-lg"
                      placeholder="مثال: مجبوس دجاج عائلي..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase mr-1 block text-right">
                      صورة المنتج
                    </label>
                    <label className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 cursor-pointer hover:border-primary transition-all">
                      <span
                        className={cn(
                          "font-bold",
                          productForm.imageUrl
                            ? "text-primary"
                            : "text-slate-400",
                        )}
                      >
                        {uploading
                          ? "جاري الرفع..."
                          : productForm.imageUrl
                            ? "تغيير الصورة"
                            : "اختر صورة من جهازك"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={uploading}
                      />
                      <Camera
                        className={cn(
                          productForm.imageUrl
                            ? "text-primary"
                            : "text-slate-400",
                        )}
                      />
                    </label>
                    {productForm.imageUrl && (
                      <div className="relative w-20 md:w-24 h-20 md:h-24 mt-2">
                        <img
                          src={productForm.imageUrl}
                          alt="Product"
                          className="w-full h-full object-contain bg-slate-50 border border-slate-100 p-1 rounded-xl"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductForm((prev) => ({
                              ...prev,
                              imageUrl: "",
                            }));
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid flex-col md:grid md:grid-cols-2 gap-2 md:p-3">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase mr-1 block text-right">
                      سعر البيع للعميل
                    </label>
                    <NumericInput
                      value={productForm.price || ""}
                      onChange={(val) =>
                        setProductForm({ ...productForm, price: val as any })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-black text-slate-800 text-right"
                      placeholder="0.000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase mr-1 block text-right">
                      تكلفة المواد
                    </label>
                    <NumericInput
                      value={productForm.cost || ""}
                      onChange={(val) =>
                        setProductForm({ ...productForm, cost: val as any })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-black text-slate-800 text-right"
                      placeholder="0.000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 md:p-3">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase mr-1 block text-right">
                      المورد المعتمد
                    </label>
                    <select
                      value={productForm.supplierId}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          supplierId: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-black text-slate-800 text-right"
                    >
                      <option value="">— اختر مورد —</option>
                      {(data?.suppliers || []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 p-3 md:p-3 shrink-0 mt-auto border-t border-slate-100">
                <button
                  onClick={closeModal}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-2xl transition-all"
                >
                  إلغاء
                </button>
                <button
                  disabled={uploading || isSaving}
                  onClick={() => handleSaveProduct(false)}
                  className={cn(
                    "flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl transition-all shadow-lg shadow-slate-900/20 active:scale-95",
                    (uploading || isSaving) && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {uploading ? "جاري رفع الصورة..." : isSaving ? "جاري الحفظ..." : "اصدار المنتج"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfitWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ConfirmModal
              title="تحذير: هامش ربح منخفض"
              message={`ربح المنتج الحالي هو ${((parseFloat(productForm.price as any) || 0) - (parseFloat(productForm.cost as any) || 0)).toFixed(3)} د.ك، وهو أقل من الحد الأدنى الموصى به (1.000 د.ك). هل تريد المتابعة؟`}
              confirmText="نعم، المتابعة"
              cancelText="تعديل السعر"
              variant="warning"
              onConfirm={() => handleSaveProduct(true)}
              onCancel={() => setShowProfitWarning(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {productToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ConfirmModal
              title="تأكيد الحذف"
              message="هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذه الخطوة."
              onConfirm={() => handleDeleteProduct(productToDelete)}
              onCancel={() => setProductToDelete(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMarketingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3"
            onClick={() => setShowMarketingModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className="bg-white rounded-[40px] w-[min(96vw,720px)] shadow-2xl p-0 border border-slate-100 text-right relative flex flex-col max-h-[90dvh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 left-0 h-40 bg-gradient-to-br from-pink-500/10 to-indigo-500/10 -z-10" />

              <button
                onClick={() => setShowMarketingModal(null)}
                className="absolute top-2 left-4 p-2 bg-white/80 backdrop-blur-sm rounded-full text-slate-400 hover:text-slate-600 hover:bg-white transition-all z-20 shadow-sm border border-slate-100"
              >
                <X size={18} />
              </button>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-3 pt-10 min-h-0">
                <div className="flex items-center gap-2 mb-6 justify-end">
                  <div className="text-right">
                    <h3 className="text-2xl font-black text-slate-800">
                      المسوق التراثي الذكي 📸
                    </h3>
                    <p className="text-xs text-slate-400 font-bold">
                      محتوى جاهز للنشر في إنستقرام
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-500 shadow-lg shadow-pink-500/10 shrink-0">
                    <Sparkles size={28} />
                  </div>
                </div>

                <div
                  className="bg-slate-50 border border-slate-100 rounded-2xl p-3 md:p-3 mb-4 text-right font-bold text-slate-700 leading-loose whitespace-pre-wrap text-sm relative group w-full"
                  dir="rtl"
                >
                  {marketingContent}
                </div>
              </div>

              <div className="p-3 md:p-3 mt-auto border-t border-slate-50 shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(marketingContent);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2000);
                  }}
                  className={cn(
                    "w-full py-4 px-6 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95",
                    copySuccess
                      ? "bg-emerald-500 text-white shadow-emerald-500/20"
                      : "bg-pink-500 text-white shadow-pink-500/20 hover:bg-pink-600",
                  )}
                >
                  {copySuccess ? <Check size={18} /> : <Copy size={18} />}
                  <span>
                    {copySuccess ? "تم النسخ بنجاح" : "نسخ المحتوى للنشر"}
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SmartOfferModal
        product={smartOfferTarget}
        isOpen={!!smartOfferTarget}
        onClose={() => setSmartOfferTarget(null)}
      />
    </div>
  );
};

export default ProductPage;
