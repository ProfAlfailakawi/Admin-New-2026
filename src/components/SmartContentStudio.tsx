import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Sparkles, Download, Check, Save, Upload, X, Loader2, MousePointerSquareDashed, Zap, ChevronLeft, Layout, Edit3 } from 'lucide-react';
import { AUTHORIZED_EMAILS, AUTHORIZED_PARTNERS, AUTHORIZED_UIDS, AUTHORIZED_PARTNER_UIDS, DEFAULT_GLOBAL_LOGO } from '../constants';
import { toast } from 'sonner';
import { Product } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { RealtimeRadar } from './RealtimeRadar';
import { ReviewToPoster } from './ReviewToPoster';
import { AdaptiveBranding } from './AdaptiveBranding';
import { applyLogoBranding } from '../lib/brandingUtils';
import { BrandingControls } from './BrandingControls';

interface SmartContentStudioProps {
  data: any;
  setData: (data: any) => void;
  onNavigate: (page: string) => void;
}

export const SmartContentStudio: React.FC<SmartContentStudioProps> = ({ data, setData, onNavigate }) => {
  const [studioTab, setStudioTab] = useState<'product' | 'radar' | 'review' | 'branding'>('product');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('1:1');
  const [selectedTheme, setSelectedTheme] = useState('تراثي');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<{ original: number; compressed: number } | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [aiCaption, setAiCaption] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formats = [
    { id: '1:1', label: 'Instagram Post', sub: '1:1', icon: <ImageIcon size={16} /> },
    { id: '9:16', label: 'Story / TikTok', sub: '9:16', icon: <ImageIcon size={16} className="h-5" /> },
    { id: '4:3', label: 'إعلان بسيط', sub: '4:3', icon: <ImageIcon size={16} className="w-5" /> }
  ];

  const themes = [
    { id: 'تراثي', label: 'تراثي كويتي', desc: 'سدو، بيوت طين فخمة، بدون دلة قهوة', icon: '🏛️', color: 'bg-amber-100 text-amber-700' },
    { id: 'مودرن كافيه', label: 'كافيه كويتي', desc: 'رخام مودرن، نباتات، إضاءة نهارية', icon: '☕', color: 'bg-stone-100 text-stone-700' },
    { id: 'بحر', label: 'بحر الكويت', desc: 'واجهة بحرية، شاطئ المسيلة، غروب', icon: '🌊', color: 'bg-blue-100 text-blue-700' },
    { id: 'فاخر', label: 'مطعم أفنيوز', desc: 'إضاءة راقية، ديكور مخملي عالمي', icon: '💎', color: 'bg-indigo-100 text-indigo-700' },
    { id: 'بسيط', label: 'تصوير ستوديو', desc: 'خلفية نظيفة، تركيز فني عالي', icon: '🍽️', color: 'bg-slate-100 text-slate-700' },
    { id: 'رمضان', label: 'رمضانيات', desc: 'فوانيس، ليالي رمضان الكويتية', icon: '🌙', color: 'bg-emerald-100 text-emerald-700' },
    { id: 'سينمائي', label: 'بورتريه سينمائي', desc: 'خلفية ضبابية عازلة للطبق', icon: '🎬', color: 'bg-rose-100 text-rose-700' },
    { id: 'تنظيف', label: 'تحسين فقط', desc: 'تحسين الألوان والإضاءة الأصلية', icon: '✨', color: 'bg-blue-100 text-blue-700' }
  ];

  const moods = [
    { id: 'دافئ', label: 'شمس دافئة', icon: '☀️' },
    { id: 'بارد', label: 'إضاءة باردة', icon: '❄️' },
    { id: 'غروب', label: 'وقت الغروب', icon: '🌇' },
    { id: 'ناعم', label: 'إضاءة استوديو', icon: '☁️' }
  ];

  const [customThemeQuery, setCustomThemeQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState('دافئ');
  const [showInstagramPreview, setShowInstagramPreview] = useState(false);
  const [useBranding, setUseBranding] = useState(true);
  const [brandingStyle, setBrandingStyle] = useState<'smooth' | 'elegant' | 'classic' | 'polaroid' | 'heritage'>('smooth');
  const [logoOpacity, setLogoOpacity] = useState(0.7);
  const [logoPosition, setLogoPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');
  const [customText, setCustomText] = useState('');
  const [textPosition, setTextPosition] = useState<'bottom' | 'top' | 'center' | 'hidden'>('bottom');
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [history, setHistory] = useState<{url: string, caption: string | null, date: Date}[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('smart_studio_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        setHistory(parsed.map((item: any) => ({ ...item, date: new Date(item.date) })));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      const lightHistory = history.map((item) => ({
        ...item,
        // لا نخزن صور base64 كبيرة داخل المتصفح حتى لا تظهر شاشة بيضاء بسبب امتلاء التخزين.
        url: String(item.url || '').startsWith('data:') ? '' : item.url
      })).filter((item) => item.url);
      if (lightHistory.length > 0) localStorage.setItem('smart_studio_history', JSON.stringify(lightHistory));
    } catch (err) {
      console.warn('Smart studio history storage skipped:', err);
      try { localStorage.removeItem('smart_studio_history'); } catch {}
    }
  }, [history]);

  useEffect(() => {
    if (aiImage) {
      applyBranding(aiImage).then(setGeneratedImage);
    }
  }, [useBranding, logoOpacity, logoPosition, brandingStyle, customText, textPosition, aiImage]);

  const addToHistory = (url: string, caption: string | null) => {
    setHistory(prev => {
      const nextItem = { url, caption, date: new Date() };
      const newHistory = [nextItem, ...prev.filter(item => item.url !== url)].slice(0, 12);
      // التخزين يتم في useEffect بنسخة خفيفة، حتى تبقى الصورة الحالية ظاهرة بدون كسر المتصفح.
      return newHistory;
    });
  };

  const applyBranding = async (sourceImage: string): Promise<string> => {
    const storeName = data.settings?.storeName || '';
    const logoUrl = data.settings?.companyLogo || DEFAULT_GLOBAL_LOGO;
    return await applyLogoBranding(sourceImage, logoUrl, storeName, {
      useBranding,
      brandingStyle,
      logoOpacity,
      logoPosition,
      customText,
      textPosition,
    });
  };

  const compressImage = (base64Str: string, maxWidth = 854): Promise<{base64: string, size: number, originalSize: number}> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Optimized for social media (1080px is recommended for high quality socials)
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Output as jpeg with a balanced 0.8 quality for social media excellence
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        const originalSize = Math.round((base64Str.length * 3) / 4);
        const compressedSize = Math.round((compressedBase64.length * 3) / 4);
        
        resolve({
          base64: compressedBase64,
          size: compressedSize,
          originalSize: originalSize
        });
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        setOriginalImage(base64);
        
        // Compress automatically
        const result = await compressImage(base64);
        setCompressedImage(result.base64);
        if (result.size > 5 * 1024 * 1024) {
          alert('الصورة ما زالت كبيرة بعد الضغط. يرجى اختيار صورة أصغر أو قصّها قبل الرفع.');
          return;
        }
        setSelectedImage(result.base64);
        setCompressionStats({ original: result.originalSize, compressed: result.size });
        setGeneratedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateContent = async () => {
    if (!selectedImage) return;

    setIsGenerating(true);
    setGeneratedImage(null);

    // Call backend API to process the realistic AI image
    try {
      const response = await fetch('/api/smart-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageContent: selectedImage.split(',')[1],
          mimeType: selectedImage.split(';')[0].split(':')[1],
          format: selectedFormat,
          theme: `${selectedTheme === 'مخصص' ? customThemeQuery : selectedTheme}. ممنوع منعاً باتاً ظهور دلة قهوة أو دلال قهوة أو coffee dallah أو coffee pot في الصورة.`,
          mood: selectedMood,
          speedTier: 'turbo' // Signal for faster generation logic if available
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.needsKey) {
          throw new Error('KEY_REQUIRED');
        }
        throw new Error(errorData.error || 'فشل توليد الصورة');
      }

      const resData = await response.json();
      let imageResult = resData.imageUrl || resData.image || resData.url || resData.dataUrl || resData.base64 || resData.imageBase64 || resData.data?.imageUrl || resData.data?.url || resData.data?.base64;
      if (imageResult && typeof imageResult === 'string' && !imageResult.startsWith('http') && !imageResult.startsWith('data:')) {
        imageResult = `data:image/png;base64,${imageResult}`;
      }
      if (imageResult) {
        setAiImage(imageResult);
        const branded = await applyBranding(imageResult).catch(() => imageResult);
        setGeneratedImage(branded);
        addToHistory(branded, null);
      } else {
        toast.error("تم التوليد لكن لم يصل رابط الصورة بشكل مفهوم");
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'KEY_REQUIRED') {
        alert("تتطلب هذه الخاصية (توليد الصور) مفتاح API مدفوع. يرجى تفعيل مفتاح Gemini في الإعدادات.");
      } else {
        alert("حدث خطأ أثناء الإنشاء: " + err.message + ". تأكد من إعدادات المفتاح وللاتصال بالإنترنت.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage && !aiImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `smart-studio-${selectedTheme}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('تم تحميل الصورة بنجاح!');
  };

  const generateCaption = async () => {
    if (!generatedImage) return;
    setIsCapturing(true);
    try {
      // Resize image for text generation to reduce payload size safely
      const safeBase64 = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800; // max dimension 800px is very safe and enough for captioning
          let width = img.width;
          let height = img.height;
          
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
             ctx.drawImage(img, 0, 0, width, height);
             // Generate low quality jpeg for quick and small API payload
             resolve(canvas.toDataURL('image/jpeg', 0.6));
          } else {
             resolve(generatedImage || aiImage || "");
          }
        };
        img.onerror = () => resolve(generatedImage || aiImage || "");
        img.src = generatedImage || aiImage || "";
      });

      const response = await fetch('/api/smart-studio/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: safeBase64,
          theme: `${selectedTheme}. لا تذكر دلة قهوة أو دلال القهوة نهائياً`
        })
      });
      let res: any = null;
      let isHtml = false;
      try {
        res = await response.json();
      } catch (e) {
        isHtml = true;
      }
      
      if (!response.ok) {
        throw new Error(isHtml ? 'عذراً، حجم الصورة كبير جداً لمعالجتها (تجاوز الحد المسموح)' : (res?.error || 'Failed to generate caption'));
      }

      const caption = res?.caption || `صورة تسويقية جاهزة بأسلوب ${selectedTheme}.`;
      setAiCaption(caption);
      if (generatedImage) {
        setHistory(prev => prev.map(item => item.url === generatedImage ? {...item, caption} : item));
      }
    } catch (e: any) {
      console.error(e);
      const fallbackCaption = `صورة تسويقية جاهزة بأسلوب ${selectedTheme}.`;
      setAiCaption(fallbackCaption);
      if (generatedImage) {
        setHistory(prev => prev.map(item => item.url === generatedImage ? {...item, caption: fallbackCaption} : item));
      }
      toast.info('تم إنشاء نص مبدئي، وتعذر الاتصال بخدمة النص الذكي حالياً');
    } finally {
      setIsCapturing(false);
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const handleSaveToProduct = async () => {
    if (!generatedImage || !selectedProductId) return;
    setIsSaving(true);
    try {
      const product = data.products.find((p: Product) => p.id === selectedProductId);
      if (product) {
        // Here we could ideally upload the base64 to Firebase Storage. 
        // For simplicity the user would typically update standard metadata, but since it's a social asset:
        const updatedProducts = data.products.map((p: Product) => {
          if (p.id === selectedProductId) {
            const mktg = (p as any).marketingImages || [];
            return {
              ...p,
              marketingImages: [...mktg, generatedImage]
            };
          }
          return p;
        });
        await setData({ ...data, products: updatedProducts });
        alert('تم حفظ الصورة ضمن الأصول التسويقية للمنتج بنجاح!');
      }
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-500 pb-32">
      
      <div className="mb-8 p-6 bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-3xl shadow-xl border border-indigo-700/50 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Sparkles className="w-64 h-64" />
        </div>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Camera className="w-8 h-8 text-indigo-300" />
              استوديو المحتوى الذكي
            </h1>
            <p className="text-indigo-200 mt-2 max-w-xl text-sm leading-relaxed">
              ارفع صورة منتجاتك الحقيقية، وسنحولها إلى صور تسويقية احترافية للسوشيال ميديا مع الحفاظ الكامل على واقعية وشكل الطبق الأصلي دون أي تزييف.
            </p>
          </div>
          {originalImage && studioTab === 'product' && (
            <button 
              onClick={() => { setSelectedImage(null); setOriginalImage(null); setGeneratedImage(null); }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur transition-all text-sm font-bold flex items-center gap-2"
            >
              <Upload size={16} /> رفع صورة أخرى
            </button>
          )}
        </div>
        
        <div className="relative z-10 flex gap-2 mt-6 overflow-x-auto pb-2 scrollbar-none">
          <button onClick={() => setStudioTab('product')} className={cn("px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors", studioTab === 'product' ? "bg-indigo-500 text-white" : "bg-indigo-900/50 text-indigo-100 hover:bg-indigo-800")}>تحويل صور المنتجات</button>
          <button onClick={() => setStudioTab('radar')} className={cn("px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors", studioTab === 'radar' ? "bg-indigo-500 text-white" : "bg-indigo-900/50 text-indigo-100 hover:bg-indigo-800")}>رادار التريندات</button>
          <button onClick={() => setStudioTab('review')} className={cn("px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors", studioTab === 'review' ? "bg-indigo-500 text-white" : "bg-indigo-900/50 text-indigo-100 hover:bg-indigo-800")}>مدح سينمائي</button>
          <button onClick={() => setStudioTab('branding')} className={cn("px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors", studioTab === 'branding' ? "bg-indigo-500 text-white" : "bg-indigo-900/50 text-indigo-100 hover:bg-indigo-800")}>الهوية المتغيرة</button>
        </div>
      </div>

      {studioTab === 'radar' && <RealtimeRadar data={data} setData={setData} />}
      {studioTab === 'review' && <ReviewToPoster data={data} setData={setData} />}
      {studioTab === 'branding' && <AdaptiveBranding data={data} setData={setData} />}

      {studioTab === 'product' && (
        <>
          {!originalImage ? (
            <div className="space-y-6">
              {history.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-slate-800 flex items-center gap-2"><ImageIcon size={18} className="text-indigo-500" /> أرشيف الصور السابقة</h3>
                    <span className="text-[10px] font-bold text-slate-400">اضغط على أي صورة لفتحها</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {history.filter(item => item.url).slice(0, 8).map((item, idx) => (
                      <button key={idx} onClick={() => { setOriginalImage(item.url); setSelectedImage(item.url); setAiImage(item.url); setGeneratedImage(item.url); setAiCaption(item.caption); }} className="group rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm hover:shadow-md transition-all text-right">
                        <img src={item.url} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform" />
                        <div className="p-2 text-[10px] font-bold text-slate-500 truncate">{item.caption || 'صورة سابقة'}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full mt-10 h-80 border-4 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all group"
            >
          <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-6 group-hover:scale-110 shadow-sm transition-transform">
            <Camera className="w-10 h-10 text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">اضغط لرفع صورة الطبق</h3>
          <p className="text-slate-500 text-sm">JPG, PNG (جودة عالية مفضلة)</p>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
        </div>
        </div>
      ) : (
        <div className="flex flex-col-reverse lg:flex-row gap-8 items-start">
          
          <div className="w-full lg:w-[45%] space-y-6">
            <div className="bg-slate-50 p-5 rounded-2xl shadow-sm border border-slate-200/50 italic mb-4">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                   <Zap size={16} className="text-amber-500" />
                   تحسين الصورة (تلقائي)
                 </h3>
                 <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-tighter">Smart Core</span>
               </div>
               {compressionStats ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-400">الحجم الأصلي:</span>
                    <span className="text-slate-600">{(compressionStats.original / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-400">الحجم المحسّن:</span>
                    <span className="text-emerald-600">{(compressionStats.compressed / 1024).toFixed(0)} KB</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                      style={{ width: `${Math.max(10, (compressionStats.compressed / compressionStats.original) * 100)}%` }} 
                    />
                  </div>
                  <p className="text-[10px] text-emerald-600 font-black text-center mt-2">
                    تم توفير {Math.round((1 - compressionStats.compressed / compressionStats.original) * 100)}% من المساحة (مثالي للسوشيال ميديا)
                  </p>
                </div>
               ) : (
                <p className="text-[10px] text-slate-400">جاري انتظار رفع الصورة...</p>
               )}
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
                <MousePointerSquareDashed size={16} className="text-indigo-600" />
                1. اختر المقاس والتنسيق
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {formats.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFormat(f.id)}
                    className={cn(
                      "p-3 rounded-xl border flex flex-col items-center gap-2 transition-all",
                      selectedFormat === f.id ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {f.icon}
                    <div className="text-center">
                      <div className="text-xs font-bold">{f.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{f.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
                <Sparkles size={16} className="text-purple-600" />
                2. اختر الثيم (خلفية المشهد)
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {themes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTheme(t.id); setCustomThemeQuery(''); }}
                    className={cn(
                      "p-3 rounded-2xl border-2 text-right flex flex-col gap-1 transition-all h-28 relative overflow-hidden group",
                      selectedTheme === t.id ? "border-purple-500 bg-purple-50/30 shadow-md ring-4 ring-purple-500/10" : "bg-white border-slate-100 hover:border-purple-200 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1 relative z-10">
                      <div className={cn("p-2 rounded-xl transition-transform group-hover:scale-110", t.color)}>
                        <span className="text-xl">{t.icon}</span>
                      </div>
                      {selectedTheme === t.id && (
                        <div className="bg-purple-500 text-white p-0.5 rounded-full">
                          <Check size={12} />
                        </div>
                      )}
                    </div>
                    <div className={cn("text-xs font-bold relative z-10", selectedTheme === t.id ? "text-purple-900" : "text-slate-800")}>{t.label}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-1 relative z-10">{t.desc}</div>
                    
                    {/* Background decoration */}
                    <div className={cn("absolute -bottom-4 -left-4 w-12 h-12 rounded-full opacity-10 group-hover:opacity-20 transition-opacity", t.color.split(' ')[0])} />
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Edit3 size={14} /> اكتب وانت تولد (ثيم مخصص)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="اكتب وصفاً مفصلاً للخلفية (مثال: قهوة على شاطئ البحر وقت الشروق)"
                    value={customThemeQuery}
                    onChange={(e) => {
                      setCustomThemeQuery(e.target.value);
                      if (e.target.value) {
                         setSelectedTheme('مخصص');
                      } else {
                         setSelectedTheme('تراثي');
                      }
                    }}
                    className={cn("w-full p-3 rounded-xl border-2 text-sm text-right focus:outline-none transition-all pr-10", selectedTheme === 'مخصص' ? "border-purple-500 bg-purple-50 focus:ring-4 focus:ring-purple-500/20" : "border-slate-200 bg-white focus:border-slate-400")}
                  />
                  <div className={cn("absolute right-3 top-1/2 -translate-y-1/2", selectedTheme === 'مخصص' ? "text-purple-500" : "text-slate-400")}>
                    <Sparkles size={16} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
                <Zap size={16} className="text-amber-500" />
                3. المود الفني
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {moods.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMood(m.id)}
                    className={cn(
                      "p-2 rounded-xl border flex flex-col items-center gap-1 transition-all",
                      selectedMood === m.id ? "bg-amber-50 border-amber-500 text-amber-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span className="text-sm">{m.icon}</span>
                    <span className="text-[10px] font-bold">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
              <BrandingControls
                useBranding={useBranding}
                setUseBranding={setUseBranding}
                brandingStyle={brandingStyle}
                setBrandingStyle={setBrandingStyle}
                logoPosition={logoPosition}
                setLogoPosition={setLogoPosition}
                logoOpacity={logoOpacity}
                setLogoOpacity={setLogoOpacity}
                customText={customText}
                setCustomText={setCustomText}
                textPosition={textPosition}
                setTextPosition={setTextPosition}
                colorClass="indigo"
                title="4. هوية العلامة (Logo)"
              />
            </div>

            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200">
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                <b className="block mb-1">💡 قاعدة حماية الهوية:</b>
                النظام مصمم ليغير فقط الإضاءة، المشهد الخلفي، واقتصاص الصورة بدون المساس أو تغيير شكل ومكونات الطبق الأصلي نهائياً.
              </p>
            </div>

            <button
              onClick={generateContent}
              disabled={isGenerating}
              className="w-full p-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  جاري تصميم الصورة...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  انشئ المشهد
                </>
              )}
            </button>
          </div>

          <div className="w-full lg:w-[55%] space-y-6 sticky top-4 z-40">
            <div className="bg-white p-2 rounded-3xl shadow-sm border border-slate-100 min-h-[250px] md:min-h-[500px] flex items-center justify-center bg-slate-50 relative overflow-hidden">
              
              {!generatedImage && !isGenerating && (
                <div className="text-center w-full max-w-lg mx-auto p-4 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">الأصل</p>
                      <div className="w-full aspect-square bg-white rounded-2xl border shadow-sm p-2 relative overflow-hidden group">
                        <img src={originalImage || null} alt="Original" className="w-full h-full object-cover rounded-xl opacity-60 grayscale-[0.5]" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest text-center">النسخة المحسنة للويب</p>
                      <div className="w-full aspect-square bg-white rounded-2xl border-2 border-emerald-400 shadow-xl p-2 relative overflow-hidden">
                        <img src={compressedImage || selectedImage || null} alt="Compressed" className="w-full h-full object-cover rounded-xl" />
                        <div className="absolute top-4 left-4 bg-emerald-500 text-white text-[10px] px-2 py-1 rounded-md font-bold shadow-md">
                          WebP 80% Optimal
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                    <p className="text-sm text-indigo-900 font-bold">الصورة جاهزة للإنشاء الذكي بمقاسات السوشيال ميديا.</p>
                    <p className="text-xs text-indigo-500 mt-1">اضغط "انشئ المشهد" لإضافة اللمسات الاحترافية.</p>
                  </div>
                </div>
              )}

              {isGenerating && (
                <div className="text-center px-6 py-12">
                  <div className="w-24 h-24 rounded-3xl bg-indigo-600 flex items-center justify-center mx-auto mb-8 shadow-indigo-500/30 shadow-2xl relative">
                     <motion.div 
                        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="relative z-10"
                     >
                        <Sparkles className="w-12 h-12 text-white" />
                     </motion.div>
                     <motion.div 
                        animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute inset-0 bg-indigo-500 rounded-3xl"
                     />
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-800 mb-6">جاري الإبداع الهندسي...</h3>
                  
                  <div className="max-w-xs mx-auto space-y-4">
                    {[
                      "تحليل بصمة الطبق الأصلية...",
                      "تصميم خلفية إبداعية مذهلة...",
                      "ضبط الإضاءة والمود الفني...",
                      "دمج العناصر بواقعية مطلقة..."
                    ].map((step, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 2 }}
                        className="flex items-center gap-3 text-right"
                      >
                         <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                            <motion.div 
                               initial={{ scale: 0 }}
                               animate={{ scale: 1 }}
                               transition={{ delay: idx * 2 + 0.5 }}
                            >
                               <Check size={12} className="text-emerald-600" />
                            </motion.div>
                         </div>
                         <span className="text-sm font-bold text-slate-600">{step}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {generatedImage && !isGenerating && (
                <div className="w-full h-full flex flex-col md:flex-row gap-6 p-4">
                  <div className="flex-1 flex flex-col items-center">
                    <p className="text-xs font-bold text-slate-400 mb-3 text-center">الصورة قبل</p>
                    <div className="w-full max-w-[200px] aspect-square bg-white rounded-2xl border shadow-sm p-1 inline-block">
                      <img src={originalImage || ""} alt="Original" className="w-full h-full object-cover rounded-xl" />
                    </div>
                  </div>

                  <div className="flex-[3] flex flex-col">
                    <div className="flex items-center justify-between mb-3 text-right">
                      <p className="text-sm font-bold text-indigo-600">النتيجة النهائية (جاهزة للنشر)</p>
                    </div>
                    
                    <div className="flex-1 bg-white rounded-3xl border shadow-2xl p-2 relative flex items-stretch h-[350px] md:h-[500px] overflow-hidden group">
                      <div className="relative flex-1 w-full h-full rounded-2xl overflow-hidden">
                        <img 
                          src={generatedImage || ""} 
                          alt="Generated" 
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                      </div>

                      <AnimatePresence>
                        {showInstagramPreview && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-white pointer-events-none z-20 flex flex-col"
                          >
                            <div className="p-3 border-b flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200" />
                              <span className="text-xs font-bold text-slate-900">preview_mode</span>
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <img src={generatedImage || ""} alt="Preview" className="w-full h-full object-contain" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {history.length > 0 && (
                      <div className="mt-8 pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-black text-slate-400 mb-4 text-right">الأعمال الأخيرة</h4>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {history.map((item, idx) => (
                            <button 
                              key={idx}
                              onClick={() => { setGeneratedImage(item.url); setAiCaption(item.caption); setAiImage(item.url); }}
                              className="w-12 h-12 rounded-lg border flex-shrink-0 overflow-hidden"
                            >
                              <img src={item.url} alt="hist" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-2 justify-center">
                      <button onClick={handleDownload} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2">
                        <Download size={18} /> تحميل
                      </button>
                      <button type="button" onClick={generateCaption} disabled={isCapturing || !generatedImage} className="px-6 py-3 bg-white border border-indigo-200 text-indigo-600 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isCapturing ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                        توليد نص ذكي
                      </button>
                    </div>

                    <div className="mt-8 pt-4 border-t border-slate-100 w-full flex flex-col items-center gap-3">
                      <p className="text-xs font-bold text-slate-500">حفظ الصورة في أصول المنتج</p>
                      <div className="flex gap-2 w-full max-w-sm">
                        <select 
                          className="flex-1 p-3 border rounded-xl bg-slate-50 text-slate-800 text-sm focus:border-indigo-500 outline-none text-right"
                          value={selectedProductId}
                          onChange={(e) => setSelectedProductId(e.target.value)}
                        >
                          <option value="">-- اختر المنتج --</option>
                          {data?.products?.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleSaveToProduct}
                          disabled={!selectedProductId || isSaving}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          حفظ
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};
