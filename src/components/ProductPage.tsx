import React, { useState, useMemo, useEffect } from "react";
import {
  Package,
  Slash,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  Trash,
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
  ChevronDown,
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

const DEFAULT_PRODUCT_CATEGORIES = ["الولائم", "اللحوم", "الدجاج", "البحري", "المقبلات"];
const normalizeCategoryName = (value?: string) => String(value || "عام").trim() || "عام";
const getProductCategories = (data: any) => {
  const configuredSource = Array.isArray(data?.productCategories)
    ? data.productCategories
    : Array.isArray(data?.settings?.productCategories)
      ? data.settings.productCategories
      : null;
  const configuredNames = Array.isArray(configuredSource)
    ? configuredSource.map((cat: any) => normalizeCategoryName(typeof cat === "string" ? cat : cat?.name || cat?.title)).filter(Boolean)
    : DEFAULT_PRODUCT_CATEGORIES;
  const productNames = (data?.products || []).map((p: any) => normalizeCategoryName(p?.category)).filter(Boolean);
  return Array.from(new Set([...configuredNames, ...productNames, "عام"]));
};

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
    preparationInstructions: "",
    addons: [],
  });
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [showProfitWarning, setShowProfitWarning] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState("");
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [openProductListCategory, setOpenProductListCategory] = useState<string | null>(null);

  const productCategories = useMemo(() => getProductCategories(data), [data]);
  // Management list keeps the saved order; only the product list view uses RTL visual reversal.
  const productCategoriesVisual = useMemo(() => [...productCategories], [productCategories]);
  const productCategoryOrder = useMemo(() => {
    const order = new Map<string, number>();
    productCategories.forEach((category, index) => {
      order.set(normalizeCategoryName(category), index);
    });
    return order;
  }, [productCategories]);

  const saveProductCategories = (categories: string[]) => {
    const cleaned = Array.from(new Set(categories.map(normalizeCategoryName).filter(Boolean))).filter((cat) => cat !== "عام");
    setData((prev: any) => ({
      ...prev,
      productCategories: cleaned,
      settings: { ...(prev.settings || {}), productCategories: cleaned },
    }));
  };

  const addProductCategory = () => {
    const name = normalizeCategoryName(newCategoryName);
    if (!name || name === "عام") {
      toast.error("اكتب اسم تصنيف واضح");
      return;
    }
    if (productCategories.includes(name)) {
      toast.info("التصنيف موجود مسبقاً");
      return;
    }
    saveProductCategories([...productCategories, name]);
    setNewCategoryName("");
    toast.success("تمت إضافة التصنيف");
  };

  const deleteProductCategory = (category: string) => {
    const name = normalizeCategoryName(category);
    if (name === "عام") {
      toast.error("ما يصير نحذف التصنيف العام الأساسي للنظام.");
      return;
    }
    const usedProducts = (data?.products || []).filter((p: any) => normalizeCategoryName(p?.category) === name);
    if (usedProducts.length > 0) {
      toast.error(`ما يصير نحذف التصنيف لأن فيه ${usedProducts.length} منتج. انقل المنتجات أول وبعدها احذفه.`);
      return;
    }

    const nextCategories = productCategories.filter((cat) => normalizeCategoryName(cat) !== name);
    setData((prev: any) => ({
      ...prev,
      productCategories: nextCategories,
      settings: { ...(prev.settings || {}), productCategories: nextCategories },
    }));
    if (editingCategoryName === name) {
      setEditingCategoryName(null);
      setEditingCategoryValue("");
    }
    if (openProductListCategory === name) setOpenProductListCategory(null);
    toast.success("تم حذف التصنيف");
  };

  const startEditProductCategory = (category: string) => {
    const name = normalizeCategoryName(category);
    setEditingCategoryName(name);
    setEditingCategoryValue(name);
  };

  const cancelEditProductCategory = () => {
    setEditingCategoryName(null);
    setEditingCategoryValue("");
  };

  const saveEditedProductCategory = () => {
    const oldName = normalizeCategoryName(editingCategoryName || "");
    const newName = normalizeCategoryName(editingCategoryValue);
    if (oldName === "عام") {
      toast.error("ما يصير نعدل اسم التصنيف العام الأساسي للنظام.");
      return;
    }
    if (!oldName || !newName || newName === "عام") {
      toast.error("اكتب اسم تصنيف واضح");
      return;
    }
    if (oldName !== newName && productCategories.includes(newName)) {
      toast.error("يوجد تصنيف بنفس الاسم");
      return;
    }

    const renamedCategories = productCategories.map((cat) =>
      normalizeCategoryName(cat) === oldName ? newName : cat,
    );

    setData((prev: any) => ({
      ...prev,
      productCategories: renamedCategories,
      settings: { ...(prev.settings || {}), productCategories: renamedCategories },
      products: (prev.products || []).map((product: any) =>
        normalizeCategoryName(product?.category) === oldName
          ? { ...product, category: newName }
          : product,
      ),
    }));

    setEditingCategoryName(null);
    setEditingCategoryValue("");
    toast.success("تم تعديل اسم التصنيف وتحديث منتجاته");
  };

  const moveProductCategory = (category: string, direction: -1 | 1) => {
    const name = normalizeCategoryName(category);
    const index = productCategories.findIndex((cat) => normalizeCategoryName(cat) === name);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= productCategories.length) return;
    const nextCategories = [...productCategories];
    [nextCategories[index], nextCategories[nextIndex]] = [nextCategories[nextIndex], nextCategories[index]];
    saveProductCategories(nextCategories);
    toast.success("تم تحديث ترتيب التصنيفات");
  };

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
      .sort((a: any, b: any) => {
        const categoryA = normalizeCategoryName(a?.category);
        const categoryB = normalizeCategoryName(b?.category);
        const orderA = productCategoryOrder.get(categoryA) ?? 9999;
        const orderB = productCategoryOrder.get(categoryB) ?? 9999;
        if (orderA !== orderB) return orderA - orderB;
        return String(a?.name || "").localeCompare(String(b?.name || ""), "ar");
      });
  }, [data?.products, data?.invoices, search, filterType, selectedSupplierId, productCategoryOrder]);

  const productListCategories = useMemo(() => {
    const filteredNames = new Set((filteredProducts || []).map((p: any) => normalizeCategoryName(p?.category)));
    return productCategories.filter((cat) => filteredNames.has(normalizeCategoryName(cat)));
  }, [filteredProducts, productCategories]);

  const visibleProducts = useMemo(() => {
    const hasSearch = search.trim().length > 0;
    if (hasSearch || !openProductListCategory) return filteredProducts || [];
    return (filteredProducts || []).filter((p: any) => normalizeCategoryName(p?.category) === normalizeCategoryName(openProductListCategory));
  }, [filteredProducts, openProductListCategory, search]);

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
      const errorMsg = `ما يصير نحذف المنتج "${product.name}" لأنه مسجل في فواتير مبيعات نشطة.`;
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
              toast.error("تعطلت معالجة أبعاد الصورة");
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
          toast.error("ما قدرنا نقرأ الملف من الجهاز");
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setUploading(false);
        toast.error("صار خلل تقني في مشغل الصور");
      }
    },
    [],
  );

  const handleSaveProduct = React.useCallback(
    (force = false) => {
      if (!productForm.name || !productForm.supplierId || isSaving) return;

      const parsedPrice = parseFloat(productForm.price as any) || 0;
      const parsedCost = parseFloat(productForm.cost as any) || 0;

      const emptyAddonIndex = (Array.isArray((productForm as any)?.addons) ? (productForm as any).addons : []).findIndex((addon: any) => !String(addon?.name || '').trim());
      if (emptyAddonIndex !== -1) {
        toast.error(`اسم الإضافة رقم ${emptyAddonIndex + 1} مطلوب، ما يصير تخليه فاضي`);
        return;
      }

      if (parsedPrice <= parsedCost) {
        setPriceError(
          "ما يصير سعر البيع يكون أقل من أو يساوي تكلفة المنتج.",
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
            description: `الاسم "${productForm.name}" مسجل من قبل لهذا المورد. استخدم اسم مختلف عشان تميّز الصنف.`,
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
        toast.error("تعطل الحفظ. جرّب مرة ثانية.");
      } finally {
        setIsSaving(false);
      }
    },
    [productForm, editingId, data, setData, isSaving],
  );

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncToCustomerApp = async () => {
    setIsSyncing(true);
    const toastId = toast.loading("نزامن المنتجات مع برنامج العميل...");

    try {
      const { seedClientDatabase } = await import("../scripts/seed-client-db");
      await seedClientDatabase(data);

      toast.success("تمت المزامنة بنجاح 🚀", {
        description: "تم توحيد المنتجات المكررة ونشرها لتطبيق العميل بنجاح.",
        id: toastId,
      });
    } catch (error) {
      console.error("Sync Error:", error);
      toast.error("ما ضبطت المزامنة مع برنامج العميل", { id: toastId });
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
      category: productCategories[0] || "الولائم",
      supplierId: "",
      imageUrl: "",
      isActive: true,
      isOutOfStock: false,
      preparationInstructions: "",
    addons: [],
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
      preparationInstructions: product.preparationInstructions || "",
      addons: Array.isArray(product.addons) ? product.addons : [],
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
            <span className="text-xs font-bold text-amber-600 bg-amber-100/50 px-3 py-1 rounded-lg border border-amber-200/50">
              أفضل 3 أصناف
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {bestProducts.map((p) => (
              <div
                key={p.id}
                className="bg-white border border-amber-100/50 p-3 rounded-2xl flex items-center justify-between text-right shadow-sm hover:-translate-y-1 transition-all"
              >
                  <div className="flex flex-col gap-1 w-full pl-2 items-end">
                   <h4 className="font-bold text-slate-800 text-[13px] sm:text-[14px] leading-tight text-right line-clamp-1">{p.name}</h4>
                   {p.preparationInstructions && (
                      <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 font-medium px-1.5 py-0.5 rounded flex items-center gap-1 flex-row-reverse w-fit text-right shadow-sm mt-0.5">
                        <AlertCircle size={8} className="shrink-0" /> <span className="line-clamp-1">{p.preparationInstructions}</span>
                      </span>
                   )}
                   <div className="flex items-center gap-1 flex-row-reverse text-slate-500">
                     <Truck size={10} />
                     <span className="text-[10px] font-bold">
                       {data.suppliers?.find((s) => s.id === p.supplierId)?.name || "مورد"}
                     </span>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center shrink-0 pr-3 border-r border-amber-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">هامش الربح</span>
                  <span className="text-[14px] font-bold text-emerald-600">%{(
                    (((p.price || 0) - (p.cost || 0)) / (p.price || 1)) * 100
                  ).toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3 md:p-3 mb-2 md:mb-0">
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

      <div className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200/60 shadow-sm text-right">
        <button
          type="button"
          onClick={() => setIsCategoryManagerOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-4 text-right"
        >
          <ChevronDown
            size={20}
            className={cn(
              "text-slate-400 transition-transform",
              isCategoryManagerOpen && "rotate-180",
            )}
          />
          <div className="flex-1">
            <h3 className="text-lg font-black text-slate-900 flex items-center justify-end gap-2">
              تصنيفات المنتجات
              <Layers size={18} className="text-primary" />
            </h3>
            <p className="text-xs font-bold text-slate-400 mt-1">اضغط لفتح إدارة التصنيفات. الترتيب يظهر في فاتورة جديدة وبرنامج العميل.</p>
          </div>
        </button>
        <AnimatePresence initial={false}>
          {isCategoryManagerOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 mt-4 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-400">ما يصير حذف تصنيف فيه منتجات.</div>
                <div className="flex flex-col sm:flex-row gap-2 lg:w-[420px]">
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addProductCategory(); }}
                    placeholder="أضف تصنيف جديد..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold text-right"
                  />
                  <button
                    type="button"
                    onClick={addProductCategory}
                    className="bg-primary text-white px-5 py-3 rounded-2xl font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> إضافة
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4 justify-end">
          {productCategoriesVisual.map((category, visualIndex) => {
            const index = productCategories.findIndex((cat) => normalizeCategoryName(cat) === normalizeCategoryName(category));
            const normalized = normalizeCategoryName(category);
            const usedCount = (data?.products || []).filter((p: any) => normalizeCategoryName(p?.category) === normalized).length;
            const isEditing = editingCategoryName === normalized;
            return (
              <div key={category} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2 shadow-sm">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveProductCategory(category, -1)}
                    disabled={index === 0}
                    title="حرّك التصنيف لليمين / قبل"
                    className="w-6 h-6 rounded-full flex items-center justify-center text-slate-500 hover:bg-white hover:text-primary disabled:text-slate-300 disabled:cursor-not-allowed"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => moveProductCategory(category, 1)}
                    disabled={index === productCategories.length - 1}
                    title="حرّك التصنيف لليسار / بعد"
                    className="w-6 h-6 rounded-full flex items-center justify-center text-slate-500 hover:bg-white hover:text-primary disabled:text-slate-300 disabled:cursor-not-allowed"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditProductCategory(category)}
                    title="تعديل اسم التصنيف"
                    className="w-6 h-6 rounded-full flex items-center justify-center text-indigo-500 hover:bg-indigo-50"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteProductCategory(category)}
                    title={usedCount > 0 ? `لا يمكن الحذف: يحتوي على ${usedCount} منتج` : "حذف التصنيف"}
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                      usedCount > 0
                        ? "text-slate-300 hover:bg-slate-100"
                        : "text-rose-500 hover:bg-rose-50",
                    )}
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="text-right min-w-[120px]">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={saveEditedProductCategory}
                        className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"
                        title="حفظ الاسم"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditProductCategory}
                        className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
                        title="إلغاء"
                      >
                        <X size={13} />
                      </button>
                      <input
                        value={editingCategoryValue}
                        onChange={(e) => setEditingCategoryValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEditedProductCategory();
                          if (e.key === "Escape") cancelEditProductCategory();
                        }}
                        className="w-28 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs font-black text-right outline-none focus:ring-2 focus:ring-primary/20"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <>
                      <div className="text-xs font-black text-slate-800">{category}</div>
                      <div className="text-[9px] font-bold text-slate-400">{usedCount} منتج</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white rounded-3xl p-3 md:p-3 border border-slate-200/60 shadow-sm text-right">
        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
            <input
              type="text"
              placeholder="ابحث عن اسم المنتج..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-right"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openAddModal}
              className="bg-slate-900 text-white px-4 md:px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl active:scale-95"
            >
              <Plus size={20} />
              <span>إضافة منتج جديد</span>
            </button>
          </div>
        </div>

        {/* Smart Filters Bar */}
        <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center justify-end gap-2 mb-10 pb-6 border-b border-slate-100 md:flex-row-reverse">
          <div className="bg-slate-50 p-2 rounded-2xl flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase mr-2 text-right">
              المورد:
            </span>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="bg-white border border-slate-200/60 rounded-xl px-4 py-2 font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-right"
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
                  "flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap",
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

        {!search.trim() && productListCategories.length > 0 && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-end gap-2 mb-2">
              <span className="text-xs font-black text-slate-400">اختر تصنيف لعرض منتجاته</span>
              <Layers size={16} className="text-primary" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {productListCategories.map((category) => {
                const normalized = normalizeCategoryName(category);
                const count = (filteredProducts || []).filter((p: any) => normalizeCategoryName(p?.category) === normalized).length;
                const isOpen = !!openProductListCategory && normalizeCategoryName(openProductListCategory) === normalized;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setOpenProductListCategory(isOpen ? null : normalized)}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all text-right ceramic-glint relative overflow-hidden",
                      isOpen
                        ? "bg-slate-900 text-amber-400 border-slate-950 shadow-lg shadow-slate-900/20"
                        : "bg-slate-50 text-slate-700 border-slate-100/80 hover:border-primary/30 hover:bg-white",
                    )}
                  >
                    <ChevronDown size={16} className={cn("transition-transform", isOpen ? "rotate-180 text-amber-400" : "text-slate-400")} />
                    <div className="flex-1">
                      <div className="font-extrabold text-xs sm:text-sm title-premium">{category}</div>
                      <div className={cn("text-[10px] font-bold flex items-center justify-end gap-1 flex-row-reverse", isOpen ? "text-amber-400/70" : "text-slate-400")}>
                        <span className="num-premium">{count}</span>
                        <span className="title-premium">منتجات</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!search.trim() && !openProductListCategory && (filteredProducts || []).length > 0 ? (
          <div className="py-16 px-4 flex flex-col items-center justify-center text-center bg-slate-50/70 border border-slate-100 border-dashed rounded-3xl">
            <Layers size={44} className="text-primary/30 mb-3" />
            <h3 className="text-xl font-black text-slate-800 mb-2">القائمة مرتبة حسب التصنيفات</h3>
            <p className="text-sm font-bold text-slate-400">افتح تصنيف واحد لعرض منتجاته. فتح تصنيف جديد يقفل السابق تلقائياً.</p>
          </div>
        ) : (
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div 
            key={`${openProductListCategory || "all"}_${filterType}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-4 md:gap-5 md:p-2 w-full col-span-full"
          >
          {(visibleProducts || []).length === 0 ? (
            <div className="col-span-full py-20 px-4 flex flex-col items-center justify-center text-center bg-white/50 backdrop-blur-sm border border-slate-100 border-dashed rounded-3xl md:rounded-2xl">
              <div className="w-24 h-24 mb-6 rounded-3xl bg-primary/5 flex items-center justify-center text-primary/40 relative">
                <div className="absolute inset-0 bg-primary/10 rounded-3xl animate-ping opacity-20" />
                <Package size={48} />
              </div>
              <h3 className="text-xl md:text-3xl font-bold text-slate-800 mb-3 tracking-tight">
                ماكو منتجات حالياً!
              </h3>
              <p className="text-slate-500 font-bold max-w-sm mb-8 leading-relaxed">
                قائمتك فارغة تماماً. أضف أول صنف وابدأ في رحلة الأرباح وتحليل
                التكاليف.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-primary text-white hover:bg-primary/90 px-4 md:px-8 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all active:scale-95 hover:rotate-1"
              >
                <Plus size={24} />
                <span>ابدأ رحلتك وضيف أول منتج الآن!</span>
              </button>
            </div>
          ) : (
            (visibleProducts || []).map((product) => {
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
                  whileHover={{ y: -6, scale: 1.015, transition: { type: "spring", stiffness: 300, damping: 20 } }}
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
                    "bg-white border border-slate-200/60 rounded-[24px] overflow-hidden shadow-sm hover:shadow-xl transition-all relative text-right flex flex-col z-10 group ceramic-glint",
                    product.isActive === false
                      ? "opacity-80 grayscale-[0.3]"
                      : "hover:border-primary/40",
                    shakingId === product.id &&
                      "ring-4 ring-red-500 ring-offset-2",
                  )}
                >
                  {/* FULLY CLIPPED IMAGE CONTAINER WITH SPOTLIGHT LUXURY CONTRAST OVERLAYS */}
                  <div 
                    className="w-full h-[140px] overflow-hidden relative bg-slate-950 border-b border-slate-800 group/img isolate"
                    style={{ borderRadius: '24px 24px 0 0' }}
                  >
                    {/* Cinematic dark linear & radial gradient spotlight highlights */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 z-10 pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)] z-10 pointer-events-none" />

                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover block transition-transform duration-700 group-hover/img:scale-110 pointer-events-none"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-950 pointer-events-none relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0%,transparent_70%)]" />
                        <img
                          src={data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO}
                          alt="Logo"
                          className="w-18 h-18 object-contain opacity-25 grayscale invert brightness-200"
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
                           "flex items-center justify-center p-2 rounded-xl shadow-lg backdrop-blur-md border transition-all hover:scale-110 active:scale-90 text-[10px] font-bold w-8 h-8",
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
                           "flex items-center justify-center p-2 rounded-xl shadow-lg backdrop-blur-md border transition-all hover:scale-110 active:scale-90 text-[10px] font-bold w-8 h-8",
                           product.isActive !== false ? "bg-slate-700 hover:bg-slate-800 border-slate-600 text-white" : "bg-amber-500 hover:bg-amber-600 border-amber-400 text-white"
                         )}
                       >
                         {product.isActive !== false ? <EyeOff size={16} /> : <Eye size={16} />}
                       </button>
                    </div>

                    {/* Price Tag Overlay - Upgraded gold visual style */}
                    <div className="absolute bottom-2.5 right-2.5 bg-gradient-to-r from-red-600 to-rose-700 backdrop-blur-md px-3 py-1.5 rounded-[12px] shadow-xl border border-white/10 z-20 pointer-events-none flex items-center gap-1">
                      <span className="text-[14px] font-extrabold text-white tracking-wider leading-none num-premium">
                        {Number(product.price || 0).toFixed(3)}
                      </span>
                      <span className="text-[9px] font-bold text-rose-100 title-premium">د.ك</span>
                    </div>

                    {/* Marketing Badges (Top Right) */}
                    <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 items-end z-10">
                      {isSlow && (
                        <span 
                          title="هذا المنتج حركته بطيئة مقارنة بباقي المنتجات"
                          className="bg-rose-500/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-white/10 uppercase cursor-help pointer-events-auto title-premium">
                          بطيء الحركة
                        </span>
                      )}
                      {sales > 10 && (
                        <span className="bg-emerald-500/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-white/10 uppercase pointer-events-auto title-premium font-black">
                          رائج 🔥
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 flex flex-col flex-1 gap-4">
                    <div className="space-y-0.5 sm:space-y-1">
                      <h3 className="font-extrabold text-slate-900 text-[13px] sm:text-base leading-[1.4] mb-0.5 sm:mb-1 line-clamp-2 min-h-[36px] sm:min-h-[50px] text-right title-premium">
                        {product.name}
                      </h3>
                      {product.preparationInstructions && (
                        <div className="flex justify-end mt-1">
                          <span className="text-[10px] md:text-[11px] bg-amber-50 border border-amber-200/60 text-amber-700 font-medium px-2 py-0.5 rounded-md flex items-center gap-1 w-fit flex-row-reverse shadow-sm text-right">
                            <AlertCircle size={10} className="text-amber-500 shrink-0" />
                            <span className="line-clamp-2 leading-snug title-premium">{product.preparationInstructions}</span>
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col gap-1 items-end">
                        <div className="flex items-center gap-1 sm:gap-1.5 flex-row-reverse justify-end text-slate-500 group-hover:text-primary transition-colors">
                          <Truck size={10} className="sm:size-[12px] shrink-0" />
                          <span className="text-[10px] sm:text-xs font-bold leading-tight title-premium text-slate-400">
                            {supplier?.name || "مورد مجهول"}
                          </span>
                        </div>
                        {(() => {
                           const bestPrice = getBestPriceInfo(product);
                           if (bestPrice) {
                             return (
                               <div 
                                  className="relative group/badge outline-none"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  <div className="bg-rose-50 border border-rose-100 text-rose-600 p-1.5 rounded-full cursor-pointer shadow-sm">
                                    <AlertCircle size={14} className="shrink-0 animate-pulse" />
                                  </div>
                                  <div className="absolute bottom-full mb-2 right-1/2 translate-x-[75%] sm:translate-x-[60%] hidden group-hover/badge:flex group-focus/badge:flex focus-within:flex flex-col bg-white text-slate-700 text-[10px] sm:text-[10px] w-[140px] p-2 rounded-xl z-[100] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] font-bold border border-slate-200/60 pointer-events-none items-center gap-1.5 text-center">
                                    <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded-lg leading-relaxed w-full break-words whitespace-normal text-[9px] title-premium">{bestPrice.supplier}</span>
                                    <span className="w-full text-[9px] title-premium">يوفره بسعر أقل !</span>
                                    <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded-lg leading-none w-full num-premium text-xs">{Number(bestPrice.cost || 0).toFixed(3)} د.ك</span>
                                  </div>
                                </div>
                             );
                           }
                           return null;
                        })()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 sm:gap-1.5 bg-slate-100/40 p-1.5 rounded-[18px] sm:rounded-[24px] border border-slate-200/40 shadow-inner">
                      <div className="bg-white rounded-[12px] sm:rounded-[18px] p-1.5 sm:p-3 shadow-sm border border-slate-100 flex flex-col items-center justify-center">
                        <span className="text-[7px] sm:text-[10px] font-bold text-slate-400 uppercase mb-0.5 title-premium">
                          البيع
                        </span>
                        <span className="text-[10px] sm:text-sm font-black text-slate-900 tracking-wider num-premium">
                          {Number(product.price || 0).toFixed(3)}
                        </span>
                      </div>
                      <div className="bg-white rounded-[12px] sm:rounded-[18px] p-1.5 sm:p-3 shadow-sm border border-slate-100 flex flex-col items-center justify-center">
                        <span className="text-[7px] sm:text-[10px] font-bold text-slate-400 uppercase mb-0.5 title-premium">
                          التكلفة
                        </span>
                        <span className="text-[10px] sm:text-sm font-bold text-slate-500 tracking-wider num-premium">
                          {Number(product.cost || 0).toFixed(3)}
                        </span>
                      </div>
                      <div className="col-span-2 bg-gradient-to-r from-emerald-500/5 to-emerald-500/10 rounded-[12px] sm:rounded-[18px] p-1.5 sm:p-3 border border-emerald-500/20 flex items-center justify-between px-2 sm:px-6">
                        <span className="text-[10px] sm:text-xs font-black text-emerald-600 uppercase title-premium">
                          هامش الربح
                        </span>
                        <span className="text-[11px] sm:text-lg font-bold text-emerald-600 tracking-wide num-premium">
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
                          className="h-10 sm:h-12 flex items-center justify-center bg-white border border-slate-200/60 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 rounded-xl transition-all shadow-sm active:scale-95 group/btn"
                          title="تعديل البيانات"
                        >
                          <Edit2 size={16} className="sm:size-[20px] group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductToDelete(product);
                          }}
                          className="h-10 sm:h-12 flex items-center justify-center bg-white border border-slate-200/60 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 rounded-xl transition-all shadow-sm active:scale-95 group/btn"
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
          </motion.div>
        </AnimatePresence>
        )}
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
              className="bg-white rounded-2xl md:rounded-3xl w-full max-w-lg shadow-xl p-0 border border-slate-100 text-right flex flex-col max-h-[85vh] md:max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Fixed */}
              <div className="p-3 md:p-3 pb-0 shrink-0">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 justify-end leading-tight">
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
                              <p className="text-[10px] font-bold text-indigo-400 uppercase">
                                توجيه الذكاء: هل تقصد هذا المنتج؟
                              </p>
                              <p className="text-sm font-bold text-indigo-900">
                                {suggestion}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs font-bold text-indigo-600 bg-white px-3 py-1 rounded-full border border-indigo-200">
                            اختيار الاسم الموحد
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase mr-1 block">
                      اسم المنتج بالكامل
                    </label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) =>
                        setProductForm({ ...productForm, name: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-4 px-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right text-lg"
                      placeholder="مثال: مجبوس دجاج عائلي..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase mr-1 block text-right">
                      تصنيف المنتج
                    </label>
                    <select
                      value={productForm.category || productCategories[0] || "الولائم"}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-4 px-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right"
                    >
                      {productCategories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <p className="text-[10px] font-bold text-slate-400 text-right">تقدر تضيف أو تحذف التصنيفات من لوحة التصنيفات أعلى قائمة المنتجات.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase mr-1 block text-right">
                      صورة المنتج
                    </label>
                    <label className="flex items-center justify-between bg-slate-50 border border-slate-200/60 rounded-2xl py-4 px-4 cursor-pointer hover:border-primary transition-all">
                      <span
                        className={cn(
                          "font-bold",
                          productForm.imageUrl
                            ? "text-primary"
                            : "text-slate-500",
                        )}
                      >
                        {uploading
                          ? "نرفع الصورة..."
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
                            : "text-slate-500",
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:p-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase mr-1 block text-right">
                      سعر البيع للعميل
                    </label>
                    <NumericInput
                      value={productForm.price || ""}
                      onChange={(val) =>
                        setProductForm({ ...productForm, price: val as any })
                      }
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right"
                      placeholder="0.000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase mr-1 block text-right">
                      تكلفة المواد
                    </label>
                    <NumericInput
                      value={productForm.cost || ""}
                      onChange={(val) =>
                        setProductForm({ ...productForm, cost: val as any })
                      }
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right"
                      placeholder="0.000"
                    />
                  </div>
                </div>

                  <div className="grid grid-cols-1 gap-2 md:p-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase mr-1 block text-right">
                      إرشادات التحضير (اختياري)
                    </label>
                    <textarea
                      value={(productForm as any).preparationInstructions || ""}
                      onChange={(e) =>
                        setProductForm({ ...productForm, preparationInstructions: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right min-h-[60px]"
                      placeholder="مثال: يطلب قبلها بيوم، يحتاج ساعتين للتجهيز..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase mr-1 block text-right">
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
                      className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right"
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

              {/* Addons Section */}
              <div className="space-y-3 mt-6 border-t pt-6 border-slate-100 px-3 md:px-3 pb-4">
                <div className="flex flex-col-reverse md:flex-row justify-between items-center bg-slate-50 p-3 rounded-2xl gap-3">

                  <label className="text-sm font-bold text-slate-700">الإضافات على المنتج</label>
                </div>
                
                {((productForm as any)?.addons && Array.isArray((productForm as any)?.addons) ? Array.from((productForm as any).addons) : ((productForm as any)?.addons && typeof (productForm as any)?.addons === 'object' ? Object.values((productForm as any)?.addons) : [])).map((addon: any, index: number) => (
                  <div key={addon.id} className="bg-white border text-right border-slate-200 p-3 rounded-2xl relative shadow-sm">
                    <button
                      onClick={() => {
                        setProductForm(prev => ({
                          ...prev,
                          addons: (prev as any).addons.filter((_: any, i: number) => i !== index)
                        }));
                      }}
                      className="absolute top-3 left-3 text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                    >
                      <Trash size={16} />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">اسم الإضافة</label>
                        <input
                          type="text"
                          id={`addon-name-${addon.id}`}
                          value={addon.name}
                          onChange={e => {
                            const newAddons = [...(productForm as any).addons];
                            newAddons[index].name = e.target.value;
                            setProductForm(prev => ({ ...prev, addons: newAddons }));
                          }}
                          placeholder="مثال: حشو ربيان"
                          required
                          className={cn(
                            "w-full bg-slate-50 border rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold text-right",
                            String(addon.name || '').trim() ? "border-slate-200/60" : "border-rose-300 bg-rose-50/40"
                          )}
                        />
                        {!String(addon.name || '').trim() && (
                          <p className="text-[10px] font-bold text-rose-500 mt-1">اسم الإضافة إلزامي</p>
                        )}
                      </div>

                      <div className="md:col-span-2 space-y-3 mt-2 mb-1 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          طريقة الحساب
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                          {/* Calculation Type Selection */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                const newAddons = [...(productForm as any).addons];
                                newAddons[index].calculationType = 'per_item';
                                setProductForm(prev => ({ ...prev, addons: newAddons }));
                              }}
                              className={cn("flex flex-col items-center text-center p-3 rounded-xl border transition-all", addon.calculationType === 'per_item' ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 shadow-sm" : "bg-white border-slate-200 hover:border-indigo-200")}
                            >
                              <div className={cn("font-bold text-sm mb-1", addon.calculationType === 'per_item' ? "text-indigo-900" : "text-slate-700")}>لكل طبق</div>
                              <div className="text-[10px] text-slate-500">يزيد مع الكمية</div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const newAddons = [...(productForm as any).addons];
                                newAddons[index].calculationType = 'per_x_items';
                                setProductForm(prev => ({ ...prev, addons: newAddons }));
                              }}
                              className={cn("flex flex-col items-center text-center p-3 rounded-xl border transition-all", addon.calculationType === 'per_x_items' ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 shadow-sm" : "bg-white border-slate-200 hover:border-indigo-200")}
                            >
                              <div className={cn("font-bold text-sm mb-1", addon.calculationType === 'per_x_items' ? "text-indigo-900" : "text-slate-700")}>كل عدد معين</div>
                              <div className="text-[10px] text-slate-500">مثلا كل 3 أطباق</div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const newAddons = [...(productForm as any).addons];
                                newAddons[index].calculationType = 'fixed';
                                setProductForm(prev => ({ ...prev, addons: newAddons }));
                              }}
                              className={cn("flex flex-col items-center text-center p-3 rounded-xl border transition-all", addon.calculationType === 'fixed' ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 shadow-sm" : "bg-white border-slate-200 hover:border-indigo-200")}
                            >
                              <div className={cn("font-bold text-sm mb-1", addon.calculationType === 'fixed' ? "text-indigo-900" : "text-slate-700")}>مرة واحدة</div>
                              <div className="text-[10px] text-slate-500">للطلب كامل</div>
                            </button>
                          </div>
                        </div>
                      </div>

                      {addon.calculationType === 'per_x_items' && (
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">كل كم طبق؟</label>
                          <input
                            type="number"
                            value={addon.xItemsThreshold || 1}
                            onChange={e => {
                              const newAddons = [...(productForm as any).addons];
                              newAddons[index].xItemsThreshold = parseInt(e.target.value) || 1;
                              setProductForm(prev => ({ ...prev, addons: newAddons }));
                            }}
                            min={1}
                            className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold text-right"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">سعر الإضافة</label>
                          <input
                            type="number"
                            value={addon.price === 0 ? '' : addon.price}
                            onChange={e => {
                              const newAddons = [...(productForm as any).addons];
                              newAddons[index].price = parseFloat(e.target.value) || 0;
                              setProductForm(prev => ({ ...prev, addons: newAddons }));
                            }}
                            className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold text-right"
                            placeholder="0.000"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">تكلفة الإضافة</label>
                          <input
                            type="number"
                            value={addon.cost === 0 ? '' : addon.cost}
                            onChange={e => {
                              const newAddons = [...(productForm as any).addons];
                              newAddons[index].cost = parseFloat(e.target.value) || 0;
                              setProductForm(prev => ({ ...prev, addons: newAddons }));
                            }}
                            className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold text-right"
                            placeholder="0.000"
                          />
                        </div>
                      </div>

                      <div className="flex flex-row items-center justify-between md:justify-end col-span-1 md:col-span-2 mt-2 gap-2 bg-slate-50 p-3 rounded-xl">
                        <label className="text-[11px] md:text-xs font-bold text-slate-600 cursor-pointer flex-1 text-right max-w-[90%]">دمج السعر مع سعر المنتج في الفاتورة</label>
                        <input
                          type="checkbox"
                          checked={addon.isHiddenPrice}
                          onChange={e => {
                            const newAddons = [...(productForm as any).addons];
                            newAddons[index].isHiddenPrice = e.target.checked;
                            setProductForm(prev => ({ ...prev, addons: newAddons }));
                          }}
                          className="w-4 h-4 text-primary rounded focus:ring-primary"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 col-span-1 md:col-span-2 mt-3 pt-3 border-t border-slate-100">
                        {/* Constraints */}
                        <div className="space-y-3 p-3 bg-indigo-50/30 rounded-2xl border border-indigo-50">
                          <h4 className="font-bold text-indigo-900 flex items-center gap-2 text-sm">
                            الاختيار والحدود
                          </h4>
                          <div className="flex flex-row items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-100 text-sm">
                            <label className="font-bold text-slate-700 cursor-pointer flex-1 text-right">إضافة إلزامية</label>
                            <input
                              type="checkbox"
                              checked={addon.isRequired || false}
                              onChange={e => {
                                const newAddons = [...(productForm as any).addons];
                                newAddons[index].isRequired = e.target.checked;
                                setProductForm(prev => ({ ...prev, addons: newAddons }));
                              }}
                              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500">أقل عدد</label>
                              <input
                                type="number"
                                min={0}
                                value={addon.minQuantity !== undefined ? addon.minQuantity : (addon.isRequired ? 1 : 0)}
                                onChange={e => {
                                  const newAddons = [...(productForm as any).addons];
                                  newAddons[index].minQuantity = parseInt(e.target.value) || 0;
                                  setProductForm(prev => ({ ...prev, addons: newAddons }));
                                }}
                                className="w-full bg-white border border-slate-200/60 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold text-center"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500">أكبر عدد</label>
                              <input
                                type="number"
                                min={1}
                                value={addon.maxQuantity || ''}
                                placeholder="لا يوجد"
                                onChange={e => {
                                  const newAddons = [...(productForm as any).addons];
                                  newAddons[index].maxQuantity = e.target.value ? parseInt(e.target.value) : undefined;
                                  setProductForm(prev => ({ ...prev, addons: newAddons }));
                                }}
                                className="w-full bg-white border border-slate-200/60 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold text-center"
                              />
                            </div>
                          </div>

                          <div className="mt-3 p-3 bg-white rounded-2xl border border-indigo-100 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <label className="font-bold text-slate-700 text-xs cursor-pointer flex-1 text-right">تظهر حسب كمية المنتج</label>
                              <input
                                type="checkbox"
                                checked={!!addon.quantityRule?.enabled}
                                onChange={e => {
                                  const newAddons = [...(productForm as any).addons];
                                  newAddons[index].quantityRule = {
                                    enabled: e.target.checked,
                                    minProductQty: Number(newAddons[index].quantityRule?.minProductQty || 2),
                                    maxProductQtyPerAddon: Number(newAddons[index].quantityRule?.maxProductQtyPerAddon || 6),
                                    mode: newAddons[index].quantityRule?.mode || 'manual'
                                  };
                                  setProductForm(prev => ({ ...prev, addons: newAddons }));
                                }}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                              />
                            </div>
                            {!!addon.quantityRule?.enabled && (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500">تبدأ من كمية</label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={addon.quantityRule?.minProductQty || 2}
                                      onChange={e => {
                                        const newAddons = [...(productForm as any).addons];
                                        newAddons[index].quantityRule = { ...(newAddons[index].quantityRule || {}), enabled: true, minProductQty: parseInt(e.target.value) || 1 };
                                        setProductForm(prev => ({ ...prev, addons: newAddons }));
                                      }}
                                      className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold text-center"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500">الإضافة تكفي</label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={addon.quantityRule?.maxProductQtyPerAddon || 6}
                                      onChange={e => {
                                        const newAddons = [...(productForm as any).addons];
                                        newAddons[index].quantityRule = { ...(newAddons[index].quantityRule || {}), enabled: true, maxProductQtyPerAddon: parseInt(e.target.value) || 1 };
                                        setProductForm(prev => ({ ...prev, addons: newAddons }));
                                      }}
                                      className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold text-center"
                                    />
                                  </div>
                                </div>
                                <select
                                  value={addon.quantityRule?.mode || 'manual'}
                                  onChange={e => {
                                    const newAddons = [...(productForm as any).addons];
                                    newAddons[index].quantityRule = { ...(newAddons[index].quantityRule || {}), enabled: true, mode: e.target.value };
                                    setProductForm(prev => ({ ...prev, addons: newAddons }));
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-bold text-right"
                                >
                                  <option value="manual">يدوي</option>
                                  <option value="auto">اقتراح تلقائي</option>
                                  <option value="required">إجباري</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Offers & Stock */}
                        <div className="space-y-3">
                          <div className="p-3 bg-emerald-50/30 rounded-2xl border border-emerald-50 space-y-3">
                            <h4 className="font-bold text-emerald-900 flex items-center gap-2 text-sm">
                              المجاني
                            </h4>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500">أول كم حبة مجانا؟</label>
                              <input
                                type="number"
                                min={0}
                                value={addon.freeQuantity || 0}
                                onChange={e => {
                                  const newAddons = [...(productForm as any).addons];
                                  newAddons[index].freeQuantity = parseInt(e.target.value) || 0;
                                  setProductForm(prev => ({ ...prev, addons: newAddons }));
                                }}
                                className="w-full bg-white border border-slate-200/60 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold text-center"
                              />
                              {(addon.freeQuantity || 0) > 0 && (
                                <p className="text-[10px] text-emerald-600 font-bold mt-1 text-right">أول {addon.freeQuantity} مجانا</p>
                              )}
                            </div>
                          </div>

                          <div className="hidden p-4 bg-amber-50/30 rounded-2xl border border-amber-50 space-y-3">
                            <h4 className="font-bold text-amber-900 flex items-center gap-2 text-sm justify-between">
                              <span className="flex items-center gap-2"><span className="text-lg">📦</span> تتبع المخزون</span>
                              <input
                                type="checkbox"
                                checked={addon.trackStock || false}
                                onChange={e => {
                                  const newAddons = [...(productForm as any).addons];
                                  newAddons[index].trackStock = e.target.checked;
                                  setProductForm(prev => ({ ...prev, addons: newAddons }));
                                }}
                                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                              />
                            </h4>
                            {addon.trackStock && (
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">الكمية المتوفرة</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={addon.stock || 0}
                                  onChange={e => {
                                    const newAddons = [...(productForm as any).addons];
                                    newAddons[index].stock = parseInt(e.target.value) || 0;
                                    setProductForm(prev => ({ ...prev, addons: newAddons }));
                                  }}
                                  className="w-full bg-white border border-slate-200/60 rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-amber-500/20 text-sm font-bold text-center"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => {
                      const newAddon = {
                        id: Math.random().toString(36).substr(2, 9),
                        name: '',
                        price: 0,
                        cost: 0,
                        calculationType: 'per_item',
                        xItemsThreshold: 1,
                        isHiddenPrice: false,
                        quantityRule: {
                          enabled: false,
                          minProductQty: 2,
                          maxProductQtyPerAddon: 6,
                          mode: 'manual',
                        },
                      };
                      // Append the new addon to the list
                      setProductForm((prev: any) => ({
                        ...prev,
                        addons: [
                          ...((Array.isArray(prev?.addons) ? prev.addons : []) as any[]),
                          newAddon,
                        ],
                      }));
                      // After state update, scroll into view and focus the new addon name input
                      setTimeout(() => {
                        const input = document.getElementById(`addon-name-${newAddon.id}`);
                        if (input) {
                          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          (input as HTMLInputElement).focus();
                        }
                      }, 50);
                    }}
                    className="w-full md:w-auto justify-center bg-primary text-white hover:opacity-90 px-5 py-3 rounded-2xl transition-all font-black flex items-center gap-2 text-sm shadow-sm active:scale-95"
                  >
                    <PlusCircle size={16} /> إضافة جديدة
                  </button>
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
                  {uploading ? "نرفع الصورة..." : isSaving ? "نحفظ..." : "اصدار المنتج"}
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
              className="bg-white rounded-3xl md:rounded-3xl w-full max-w-[95%] md:w-full md:max-w-2xl shadow-xl p-0 border border-slate-100 text-right relative flex flex-col max-h-[90dvh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 left-0 h-40 bg-gradient-to-br from-pink-500/10 to-indigo-500/10 -z-10" />

              <button
                onClick={() => setShowMarketingModal(null)}
                className="absolute top-2 left-4 p-2 bg-white/80 backdrop-blur-sm rounded-full text-slate-500 hover:text-slate-600 hover:bg-white transition-all z-20 shadow-sm border border-slate-100"
              >
                <X size={18} />
              </button>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-3 pt-10 min-h-0">
                <div className="flex items-center gap-2 mb-6 justify-end">
                  <div className="text-right">
                    <h3 className="text-2xl font-bold text-slate-800">
                      المسوق التراثي الذكي 📸
                    </h3>
                    <p className="text-xs text-slate-500 font-bold">
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
                    "w-full py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95",
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
