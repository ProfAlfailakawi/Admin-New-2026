import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, Sparkles, Download, Check, Save, Upload, X, Loader2, MousePointerSquareDashed, Zap, ChevronLeft, Layout, Edit3, Brain, Library, Star } from 'lucide-react';
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
import { REAL_RESTAURANT_BACKGROUNDS, STUDIO_REALITY_MODES, STUDIO_REALITY_NEGATIVE_PROMPT, type StudioBackgroundPresetId, type StudioRealityMode } from '../lib/studioReality';
import { buildStudioTastePrompt, loadStudioBackgroundLibrary, markStudioBackgroundUsed, recordStudioTasteChoice, saveStudioBackgroundToLibrary, type StudioBackgroundLibraryItem } from '../lib/studioLearning';
import { KUWAIT_CONTENT_GOALS, KUWAIT_PLACES, KUWAIT_PULSE_PACKS, buildKuwaitCaptionFallback, buildKuwaitStudioTheme, getKuwaitPulsePack, type KuwaitContentGoal, type KuwaitOrderPlace } from '../lib/kuwaitContentPulse';

interface SmartContentStudioProps {
  data: any;
  setData: (data: any) => void;
  onNavigate: (page: string) => void;
}

type RealityAuditResult = {
  score?: number;
  verdict?: string;
  notes?: string[];
  fixHint?: string;
};

class StudioErrorBoundary extends React.Component<{ title: string; children: React.ReactNode }, { hasError: boolean; message: string }> {
  declare props: Readonly<{ title: string; children: React.ReactNode }>;
  declare state: Readonly<{ hasError: boolean; message: string }>;

  constructor(props: { title: string; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: error?.message || 'حدث خطأ غير متوقع' };
  }

  componentDidCatch(error: any) {
    console.error('Smart studio tab crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl border border-rose-100 bg-rose-50/80 p-8 text-right shadow-sm">
          <h3 className="text-lg font-black text-rose-700 mb-2">تعذر فتح {this.props.title}</h3>
          <p className="text-sm font-bold text-rose-600/80 leading-7">تم منع الشاشة البيضاء. حدّث الصفحة أو جرّب مرة ثانية، وإذا تكرر الخطأ راجع بيانات هذا القسم.</p>
          {this.state.message && <p className="mt-3 text-xs text-rose-500 bg-white/70 rounded-2xl p-3 direction-ltr text-left">{this.state.message}</p>}
        </div>
      );
    }
    return this.props.children;
  }
}

export const SmartContentStudio: React.FC<SmartContentStudioProps> = ({ data, setData, onNavigate }) => {
  const [studioTab, setStudioTab] = useState<'quick' | 'whatsapp' | 'occasions' | 'product' | 'library' | 'advanced'>('quick');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('1:1');
  const [selectedTheme, setSelectedTheme] = useState('نبض الكويت');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<{ original: number; compressed: number } | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [aiCaption, setAiCaption] = useState<string | null>(null);
  const [previousAiCaption, setPreviousAiCaption] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewAspectClass = selectedFormat === '9:16' ? 'aspect-[9/16] max-h-[680px]' : selectedFormat === '4:3' ? 'aspect-[4/3]' : 'aspect-square';

  const formats = [
    { id: '1:1', label: 'Instagram Post', sub: '1:1', icon: <ImageIcon size={16} /> },
    { id: '9:16', label: 'Story / TikTok', sub: '9:16', icon: <ImageIcon size={16} className="h-5" /> },
    { id: '4:3', label: 'إعلان بسيط', sub: '4:3', icon: <ImageIcon size={16} className="w-5" /> }
  ];

  const themes = [
    { id: 'نبض الكويت', label: 'نبض الكويت', desc: 'مناسبة + مكان + هدف، بأبسط طريق للموظف', icon: '🇰🇼', color: 'bg-rose-100 text-rose-700' },
    { id: 'بيت', label: 'سفرة بيتية', desc: 'طلب منزلي مرتب وواقعي', icon: '🏠', color: 'bg-amber-100 text-amber-700' },
    { id: 'ديوانية', label: 'ديوانية', desc: 'يمعة ربع وطلب جماعي', icon: '🛋️', color: 'bg-slate-100 text-slate-700' },
    { id: 'شاليه', label: 'شاليه', desc: 'طلعة وويكند بدون زحمة', icon: '🌊', color: 'bg-blue-100 text-blue-700' },
    { id: 'مزرعة', label: 'مزرعة', desc: 'سفرة خارجية واقعية', icon: '🌴', color: 'bg-emerald-100 text-emerald-700' },
    { id: 'جاخور', label: 'جاخور', desc: 'طلب ربع عملي ومرتب', icon: '🐪', color: 'bg-orange-100 text-orange-700' },
    { id: 'زوارة', label: 'زوارة / عزيمة', desc: 'لمة أهل وطلب يبيض الوجه', icon: '👨‍👩‍👧‍👦', color: 'bg-purple-100 text-purple-700' },
    { id: 'تنظيف', label: 'تحسين فقط', desc: 'تحسين الألوان والإضاءة الأصلية دون تغيير المشهد', icon: '✨', color: 'bg-indigo-100 text-indigo-700' }
  ];

  const moods = [
    { id: 'دافئ', label: 'شمس دافئة', icon: '☀️' },
    { id: 'بارد', label: 'إضاءة باردة', icon: '❄️' },
    { id: 'غروب', label: 'وقت الغروب', icon: '🌇' },
    { id: 'ناعم', label: 'إضاءة استوديو', icon: '☁️' }
  ];



  const FORBIDDEN_STUDIO_WORDS = ['دلة', 'دلال', 'مبخر', 'مباخر', 'بخور', 'عود', 'سدو', 'فانوس', 'فوانيس', 'قهوة', 'قهوت', 'بن', 'فنجان', 'فناجين'];
  const hasForbiddenStudioWord = (value: string) =>
    FORBIDDEN_STUDIO_WORDS.some((word) => String(value || '').includes(word));
  const STUDIO_NEGATIVE_PROMPT = STUDIO_REALITY_NEGATIVE_PROMPT;

  const [customThemeQuery, setCustomThemeQuery] = useState('');
  const [selectedPulseId, setSelectedPulseId] = useState<string>('quick-kuwait');
  const [selectedOrderPlace, setSelectedOrderPlace] = useState<KuwaitOrderPlace>('delivery');
  const [selectedContentGoal, setSelectedContentGoal] = useState<KuwaitContentGoal>('whatsapp');
  const [showAdvancedStudio, setShowAdvancedStudio] = useState(false);
  const [selectedMood, setSelectedMood] = useState('دافئ');
  const [realityMode, setRealityMode] = useState<StudioRealityMode>('restaurant');
  const [backgroundPreset, setBackgroundPreset] = useState<StudioBackgroundPresetId>('wood-table');
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [realityVariants, setRealityVariants] = useState<{ label: string; url: string; mode: StudioRealityMode; background: StudioBackgroundPresetId }[]>([]);
  const [strictPlateLock, setStrictPlateLock] = useState(true);
  const [realityBoost, setRealityBoost] = useState(true);
  const [isAuditingReality, setIsAuditingReality] = useState(false);
  const [realityAudit, setRealityAudit] = useState<RealityAuditResult | null>(null);
  const [backgroundLibrary, setBackgroundLibrary] = useState<StudioBackgroundLibraryItem[]>([]);
  const [isSavingBackground, setIsSavingBackground] = useState(false);
  const [tasteMemoryPrompt, setTasteMemoryPrompt] = useState('');
  const [showInstagramPreview, setShowInstagramPreview] = useState(false);
  const [useBranding, setUseBranding] = useState(true);
  const [brandingStyle, setBrandingStyle] = useState<'smooth' | 'elegant' | 'classic' | 'polaroid' | 'heritage'>('smooth');
  const [logoOpacity, setLogoOpacity] = useState(0.7);
  const [logoPosition, setLogoPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'>('top-right');
  const [customText, setCustomText] = useState('');
  const [textPosition, setTextPosition] = useState<'bottom' | 'top' | 'center' | 'hidden'>('bottom');
  const [aiImage, setAiImage] = useState<string | null>(null);
  const [history, setHistory] = useState<{url: string, caption: string | null, date: Date, mode?: StudioRealityMode, background?: StudioBackgroundPresetId, theme?: string, format?: string}[]>([]);


  const refreshStudioLearning = async () => {
    setTasteMemoryPrompt(buildStudioTastePrompt());
    const library = await loadStudioBackgroundLibrary();
    setBackgroundLibrary(library);
  };

  useEffect(() => {
    refreshStudioLearning();
  }, []);

  const activePulsePack = getKuwaitPulsePack(selectedPulseId);

  useEffect(() => {
    const pack = getKuwaitPulsePack(selectedPulseId);
    setRealityMode(pack.mode);
    setBackgroundPreset(pack.background);
    if (!selectedOrderPlace) setSelectedOrderPlace(pack.defaultPlace);
  }, [selectedPulseId]);

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

  const addToHistory = (url: string, caption: string | null, meta?: { mode?: StudioRealityMode; background?: StudioBackgroundPresetId; theme?: string; format?: string }) => {
    setHistory(prev => {
      const nextItem = { url, caption, date: new Date(), ...meta };
      const newHistory = [nextItem, ...prev.filter(item => item.url !== url)].slice(0, 12);
      // التخزين يتم في useEffect بنسخة خفيفة، حتى تبقى الصورة الحالية ظاهرة بدون كسر المتصفح.
      return newHistory;
    });
  };

  const getDataImagePayload = (dataUrl: string) => {
    const [header, data] = String(dataUrl || '').split(',');
    return {
      imageContent: data || dataUrl,
      mimeType: header?.includes(':') ? header.split(';')[0].split(':')[1] : 'image/jpeg'
    };
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

  const compressImage = (base64Str: string, maxWidth = 1080): Promise<{base64: string, size: number, originalSize: number}> => {
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
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.88);
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
        setRealityAudit(null);
        setRealityVariants([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateContent = async (variantOverride?: { mode?: StudioRealityMode; background?: StudioBackgroundPresetId; label?: string }) => {
    if (!selectedImage) return;
    const themeText = buildKuwaitStudioTheme({
      packId: selectedPulseId,
      place: selectedOrderPlace || activePulsePack.defaultPlace,
      goal: selectedContentGoal,
      customText: selectedTheme === 'مخصص' ? customThemeQuery : `${selectedTheme}. ${customThemeQuery}`
    });
    if (hasForbiddenStudioWord(themeText)) {
      toast.error('هذا الوصف يحتوي عناصر محظورة للتوليد. احذف القهوة/البخور/الدلة/السدو/الفوانيس وجرب مرة ثانية.');
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);
    setRealityAudit(null);

    // Call backend API to process the realistic AI image
    try {
      const response = await fetch('/api/smart-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageContent: selectedImage.split(',')[1],
          mimeType: selectedImage.split(';')[0].split(':')[1],
          format: selectedFormat,
          theme: `${themeText}. ${STUDIO_NEGATIVE_PROMPT}`,
          mood: selectedMood,
          realityMode: variantOverride?.mode || realityMode,
          backgroundPreset: variantOverride?.background || backgroundPreset,
          strictPlateLock,
          realityBoost,
          correctionHint: variantOverride?.label?.includes('أصدق') ? 'أعد بناء الخلفية لتكون أبسط وأكثر بشرية وكويتية: ظلال تلامس صحيحة، سفرة/طلب عادي، إضاءة أقل مثالية، بدون لمعان أو عمق مبالغ، وبدون إيحاء مطعم.' : undefined,
          tasteProfile: buildStudioTastePrompt(),
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
        const usedMode = variantOverride?.mode || realityMode;
        const usedBackground = variantOverride?.background || backgroundPreset;
        const themeUsed = themeText;
        addToHistory(branded, null, { mode: usedMode, background: usedBackground, theme: themeUsed, format: selectedFormat });
        recordStudioTasteChoice({ mode: usedMode, background: usedBackground, theme: themeUsed, format: selectedFormat, label: variantOverride?.label || STUDIO_REALITY_MODES[usedMode].label, source: 'generated-image' });
        refreshStudioLearning();
        if (variantOverride?.label) {
          setRealityVariants(prev => [...prev, {
            label: variantOverride.label || STUDIO_REALITY_MODES[variantOverride.mode || realityMode].label,
            url: branded,
            mode: variantOverride.mode || realityMode,
            background: variantOverride.background || backgroundPreset
          }].slice(-4));
        }
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



  const generateKuwaitNoProduct = async () => {
    const themeText = buildKuwaitStudioTheme({
      packId: selectedPulseId,
      place: selectedOrderPlace || activePulsePack.defaultPlace,
      goal: selectedContentGoal,
      customText: customThemeQuery || activePulsePack.label
    });
    if (hasForbiddenStudioWord(themeText)) {
      toast.error('هذا الوصف يحتوي عناصر محظورة للتوليد. احذف القهوة/البخور/الدلة/السدو/الفوانيس وجرب مرة ثانية.');
      return;
    }
    setIsGenerating(true);
    setGeneratedImage(null);
    setRealityAudit(null);
    try {
      const prompt = `${themeText}\nGenerate a believable Kuwaiti occasion / delivery / gathering image without requiring a product upload. Make it look like a real photographed Kuwaiti order moment, suitable for WhatsApp first. No readable text inside the image. ${STUDIO_NEGATIVE_PROMPT}`;
      const imgRes = await fetch('/api/smart-studio/generate-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, format: selectedFormat, realityBoost: true, tasteProfile: buildStudioTastePrompt() })
      });
      const imgData = await imgRes.json().catch(() => ({}));
      if (!imgRes.ok) throw new Error(imgData?.error || 'فشل توليد صورة المناسبة');
      let imageResult = imgData.imageUrl || imgData.image || imgData.url || imgData.base64 || imgData.data?.imageUrl || imgData.data?.url;
      if (imageResult && typeof imageResult === 'string' && !imageResult.startsWith('http') && !imageResult.startsWith('data:')) imageResult = `data:image/png;base64,${imageResult}`;
      if (!imageResult) throw new Error('تم التوليد لكن لم يصل رابط الصورة بشكل مفهوم');
      setAiImage(imageResult);
      const branded = await applyBranding(imageResult).catch(() => imageResult);
      setGeneratedImage(branded);
      const caption = buildKuwaitCaptionFallback({ packId: selectedPulseId, place: selectedOrderPlace || activePulsePack.defaultPlace, goal: selectedContentGoal });
      setPreviousAiCaption(aiCaption);
      setAiCaption(caption);
      addToHistory(branded, caption, { mode: realityMode, background: backgroundPreset, theme: themeText, format: selectedFormat });
      recordStudioTasteChoice({ mode: realityMode, background: backgroundPreset, theme: themeText, format: selectedFormat, label: 'kuwait-no-product', source: 'quick-no-product' });
      refreshStudioLearning();
      toast.success('تم تجهيز صورة ورسالة كويتية بدون رفع منتج');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'تعذر توليد المناسبة');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCaption = async () => {
    if (!aiCaption) return;
    try {
      await navigator.clipboard.writeText(aiCaption);
      toast.success('تم نسخ رسالة الواتساب');
    } catch {
      toast.info('انسخ الرسالة يدويًا من المعاينة');
    }
  };

  const generateFourRealityOptions = async () => {
    if (!selectedImage || isGenerating || isGeneratingVariants) return;
    setIsGeneratingVariants(true);
    setRealityVariants([]);
    const variantPlan: { label: string; mode: StudioRealityMode; background: StudioBackgroundPresetId }[] = [
      { label: 'بشري / آيفون', mode: 'human', background: 'wood-table' },
      { label: 'طلب كويتي واقعي', mode: 'restaurant', background: 'home-table' },
      { label: 'منيو احترافي', mode: 'menu', background: 'neutral-menu' },
      { label: 'Final Boss كويتي', mode: 'finalBoss', background: 'diwaniya-table' },
    ];
    try {
      for (const variant of variantPlan) {
        await generateContent(variant);
      }
      toast.success('تم توليد 4 خيارات واقعية — اختر الأنسب للنشر');
    } finally {
      setIsGeneratingVariants(false);
    }
  };

  const auditReality = async () => {
    const source = aiImage || generatedImage;
    if (!source || isAuditingReality) return;
    setIsAuditingReality(true);
    try {
      const payload = getDataImagePayload(source);
      const response = await fetch('/api/smart-studio/reality-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('فشل تقييم الواقعية');
      const result = await response.json();
      setRealityAudit(result);
      toast.success(`تقييم الواقعية: ${Math.round(Number(result.score || 0))}%`);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تقييم الواقعية');
    } finally {
      setIsAuditingReality(false);
    }
  };

  const makeMoreHuman = async () => {
    if (!selectedImage || isGenerating || isGeneratingVariants) return;
    setRealityMode('finalBoss');
    const hint = realityAudit?.fixHint || 'خل الخلفية أبسط وأكثر بشرية وكويتية: طلب بيت/ديوانية/شاليه عادي، ظلال صحيحة، إضاءة أقل مثالية، لا لمعان زائد، لا عمق مبالغ، لا ديكور وهمي.';
    await generateContent({ mode: 'finalBoss', background: backgroundPreset || 'wood-table', label: `أصدق بصرياً: ${hint}` });
  };


  const rememberCurrentChoice = (label = 'اختيار يدوي') => {
    recordStudioTasteChoice({
      mode: realityMode,
      background: backgroundPreset,
      theme: selectedTheme === 'مخصص' ? customThemeQuery : selectedTheme,
      format: selectedFormat,
      label,
      source: 'manual-choice'
    });
    refreshStudioLearning();
    toast.success('تم حفظ ذوقك لهذا الأسلوب — الاستوديو راح يفضله لاحقاً');
  };

  const saveCurrentBackground = async () => {
    const source = aiImage || generatedImage;
    if (!source || isSavingBackground) return;
    setIsSavingBackground(true);
    try {
      const saved = await saveStudioBackgroundToLibrary({
        url: source,
        caption: aiCaption,
        mode: realityMode,
        background: backgroundPreset,
        theme: selectedTheme === 'مخصص' ? customThemeQuery : selectedTheme,
        format: selectedFormat,
        label: STUDIO_REALITY_MODES[realityMode]?.label || 'لقطة واقعية',
        auditScore: realityAudit?.score ?? null,
        source: 'product-studio'
      });
      setBackgroundLibrary(prev => [saved, ...prev.filter(item => item.id !== saved.id)].slice(0, 24));
      setTasteMemoryPrompt(buildStudioTastePrompt());
      toast.success('تم حفظ اللقطة في مكتبة الخلفيات — وجرى تعلّم ذوقك');
    } catch (err: any) {
      toast.error(err?.message || 'تعذر حفظ الخلفية');
    } finally {
      setIsSavingBackground(false);
    }
  };

  const useLibraryBackground = (item: StudioBackgroundLibraryItem) => {
    setAiImage(item.url);
    setGeneratedImage(item.url);
    setAiCaption(item.caption || null);
    if (item.mode) setRealityMode(item.mode);
    if (item.background) setBackgroundPreset(item.background);
    markStudioBackgroundUsed(item);
    refreshStudioLearning();
    toast.success('تم اختيار لقطة من مكتبتك — النظام تعلم هذا الذوق');
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
          theme: `${buildKuwaitStudioTheme({ packId: selectedPulseId, place: selectedOrderPlace || activePulsePack.defaultPlace, goal: selectedContentGoal, customText: customThemeQuery || selectedTheme })}. ${STUDIO_NEGATIVE_PROMPT}`
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
      setPreviousAiCaption(aiCaption);
      setAiCaption(caption);
      toast.success('تم توليد التعليق الذكي على الصورة');
      if (generatedImage) {
        setHistory(prev => prev.map(item => item.url === generatedImage ? {...item, caption} : item));
      }
    } catch (e: any) {
      console.error(e);
      const fallbackCaption = `صورة تسويقية جاهزة بأسلوب ${selectedTheme}.`;
      setPreviousAiCaption(aiCaption);
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
              استوديو المحتوى الكويتي
            </h1>
            <p className="text-indigo-200 mt-2 max-w-xl text-sm leading-relaxed">
              مناسبة أو واتساب أو صورة منتج — المنتج اختياري. واجهة بسيطة للموظف والشريك، والوضع الاحترافي مخفي للأدمن، مع الحفاظ على الواقعية الحالية بدون لمس محرك الذكاء.
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
          {[
            ['quick', 'إنشاء سريع'],
            ['whatsapp', 'واتساب'],
            ['occasions', 'المناسبات'],
            ['product', 'صور المنتجات'],
            ['library', 'مكتبة المحتوى'],
            ['advanced', 'الوضع الاحترافي']
          ].map(([id, label]) => (
            <button key={id} onClick={() => setStudioTab(id as any)} className={cn("px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors", studioTab === id ? "bg-indigo-500 text-white" : "bg-indigo-900/50 text-indigo-100 hover:bg-indigo-800")}>{label}</button>
          ))}
        </div>
      </div>

      {studioTab === 'advanced' && (
        <div className="grid gap-6">
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-5 text-right">
            <h2 className="text-xl font-black text-slate-900">الوضع الاحترافي</h2>
            <p className="text-sm font-bold text-slate-500 mt-2">كل الأدوات القوية موجودة هنا للإدارة والمتقدمين، بعيد عن واجهة الموظف اليومية.</p>
          </div>
          <StudioErrorBoundary title="رادار الترند الكويتي"><RealtimeRadar data={data} setData={setData} /></StudioErrorBoundary>
          <StudioErrorBoundary title="مدح العملاء"><ReviewToPoster data={data} setData={setData} /></StudioErrorBoundary>
          <StudioErrorBoundary title="الهوية المتغيرة"><AdaptiveBranding data={data} setData={setData} /></StudioErrorBoundary>
        </div>
      )}

      {studioTab === 'library' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-right">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><Library size={20} className="text-indigo-500" /> مكتبة المحتوى</h2>
            <span className="text-xs font-black text-slate-400">صور ورسائل تم توليدها سابقاً</span>
          </div>
          {history.filter(item => item.url).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {history.filter(item => item.url).map((item, idx) => (
                <button key={idx} onClick={() => { setGeneratedImage(item.url); setAiImage(item.url); setAiCaption(item.caption); setStudioTab('quick'); }} className="group rounded-3xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm hover:shadow-md transition-all text-right">
                  <img src={item.url} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform" />
                  <div className="p-3 text-[11px] font-bold text-slate-500 line-clamp-2">{item.caption || 'محتوى محفوظ'}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl bg-slate-50 border border-dashed border-slate-200 p-12 text-center text-slate-500 font-bold">بعد أول توليد، تظهر الصور والرسائل هنا لإعادة الاستخدام.</div>
          )}
        </div>
      )}

      {(studioTab === 'quick' || studioTab === 'whatsapp' || studioTab === 'occasions') && (
        <div className="grid lg:grid-cols-[0.92fr_1.08fr] gap-8 items-start">
          <div className="space-y-5">
            <div className="rounded-[2rem] border border-rose-100 bg-white shadow-sm p-6 text-right">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-black text-rose-500 mb-1">واجهة الموظف اليومية</p>
                  <h2 className="text-2xl font-black text-slate-900">شنو نجهز لك اليوم؟</h2>
                  <p className="text-sm font-bold text-slate-500 mt-2 leading-7">المنتج اختياري. اختر المناسبة والمكان، واكتب فكرتك لو تبي. الخلفية معقدة وذكية، والواجهة بسيطة.</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-indigo-600 text-white flex items-center justify-center text-2xl shadow-lg">🇰🇼</div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-5">
                {KUWAIT_PULSE_PACKS.map(pack => (
                  <button key={pack.id} type="button" onClick={() => { setSelectedPulseId(pack.id); setSelectedOrderPlace(pack.defaultPlace); setBackgroundPreset(pack.background); setRealityMode(pack.mode); }} className={cn("p-3 rounded-2xl border text-right min-h-[92px] transition-all", selectedPulseId === pack.id ? "bg-rose-50 border-rose-400 ring-4 ring-rose-500/10 shadow-sm" : "bg-white border-slate-100 hover:bg-slate-50 hover:border-rose-200")}>
                    <div className="flex items-center justify-between mb-2"><span className="text-xl">{pack.icon}</span><span className="text-[9px] font-black text-rose-600 bg-white/80 border border-rose-100 rounded-full px-2 py-0.5">{pack.badge}</span></div>
                    <div className="text-xs font-black text-slate-900">{pack.label}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-1 line-clamp-1">{pack.tone}</div>
                  </button>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="text-[11px] font-black text-slate-500 mb-2 block">وين رايح الطلب؟</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(KUWAIT_PLACES) as [KuwaitOrderPlace, typeof KUWAIT_PLACES[KuwaitOrderPlace]][]).map(([id, place]) => (
                      <button key={id} type="button" onClick={() => { setSelectedOrderPlace(id); setBackgroundPreset(place.background); }} className={cn("px-3 py-2 rounded-xl border text-[11px] font-black transition-all flex items-center justify-between", selectedOrderPlace === id ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white")}><span>{place.label}</span><span>{place.icon}</span></button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 mb-2 block">شنو تبي تطلع؟</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(KUWAIT_CONTENT_GOALS) as [KuwaitContentGoal, typeof KUWAIT_CONTENT_GOALS[KuwaitContentGoal]][]).filter(([id]) => studioTab === 'whatsapp' ? id === 'whatsapp' : id !== 'post').map(([id, goal]) => (
                      <button key={id} type="button" onClick={() => setSelectedContentGoal(id)} className={cn("px-3 py-2 rounded-xl border text-[11px] font-black transition-all flex items-center justify-between", selectedContentGoal === id ? "bg-indigo-600 text-white border-indigo-600" : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-white")}><span>{goal.label}</span><span>{goal.icon}</span></button>
                    ))}
                  </div>
                </div>
              </div>

              <label className="text-xs font-bold text-slate-600 flex items-center gap-1 mb-2"><Edit3 size={14} /> اكتب فكرتك — اختياري</label>
              <input value={customThemeQuery} onChange={(e) => setCustomThemeQuery(e.target.value)} placeholder="مثال: عيد الأضحى، العيد الوطني، فوز المنتخب، زوارة أهل، ديوانية اليوم..." className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-white text-sm text-right focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10" />

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button onClick={generateKuwaitNoProduct} disabled={isGenerating} className="col-span-2 p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">{isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />} ولّعها بدون رفع منتج</button>
                <button onClick={() => setStudioTab('product')} className="p-3 rounded-2xl bg-white border border-indigo-200 text-indigo-700 font-black hover:bg-indigo-50">عندي صورة منتج</button>
                <button onClick={() => { setSelectedContentGoal('whatsapp'); setStudioTab('whatsapp'); }} className="p-3 rounded-2xl bg-white border border-emerald-200 text-emerald-700 font-black hover:bg-emerald-50">واتساب فقط</button>
              </div>
            </div>
          </div>

          <div className="sticky top-4 z-30 rounded-[2rem] border border-slate-100 bg-white shadow-sm p-5 min-h-[520px] flex flex-col items-center justify-center">
            {!generatedImage && !isGenerating && (
              <div className="text-center max-w-md"><div className="text-6xl mb-5">{activePulsePack.icon}</div><h3 className="text-2xl font-black text-slate-900 mb-3">جاهز يطلع محتوى يصرخ كويت</h3><p className="text-sm font-bold text-slate-500 leading-7">{activePulsePack.label} ← {KUWAIT_PLACES[selectedOrderPlace]?.label} ← {KUWAIT_CONTENT_GOALS[selectedContentGoal]?.label}</p></div>
            )}
            {isGenerating && <div className="text-center"><Loader2 className="w-14 h-14 animate-spin mx-auto text-indigo-600 mb-4" /><p className="font-black text-slate-800">جاري تجهيز المشهد والرسالة...</p></div>}
            {generatedImage && (
              <div className="w-full space-y-4 text-right">
                <img src={generatedImage} className="w-full max-h-[520px] object-contain rounded-3xl bg-slate-50 border border-slate-100" />
                {aiCaption && <div className="rounded-3xl bg-slate-900 text-white p-4 shadow-lg"><p className="text-sm font-extrabold leading-7 whitespace-pre-wrap">{aiCaption}</p></div>}
                <div className="grid grid-cols-2 gap-2"><button onClick={copyCaption} disabled={!aiCaption} className="p-3 rounded-2xl bg-emerald-600 text-white font-black disabled:opacity-40">نسخ الرسالة</button><button onClick={handleDownload} className="p-3 rounded-2xl bg-indigo-600 text-white font-black">تحميل الصورة</button><button onClick={saveCurrentBackground} disabled={isSavingBackground} className="col-span-2 p-3 rounded-2xl bg-white border border-amber-200 text-amber-700 font-black">حفظ للمكتبة</button></div>
              </div>
            )}
          </div>
        </div>
      )}

      {studioTab === 'product' && (
        <>
          {!originalImage ? (
            <div className="space-y-6">
              {history.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-slate-800 flex items-center gap-2"><ImageIcon size={18} className="text-indigo-500" /> مكتبة الصور السابقة</h3>
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
          <h3 className="text-xl font-bold text-slate-800 mb-2">اضغط لرفع صورة المنتج</h3>
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
                   تحسين الصورة (تلقائي — لا نلمس الطبق)
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
                    تم توفير {Math.round((1 - compressionStats.compressed / compressionStats.original) * 100)}% من المساحة
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

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-rose-100">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Sparkles size={16} className="text-rose-600" />
                    2. نبض الكويت — اختار ولا تزحم نفسك
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400 mt-1">مناسبة + مكان + نوع محتوى. والباقي يضبطه الاستوديو بنفس الواقعية الحالية.</p>
                </div>
                <span className="text-[10px] font-black bg-rose-50 text-rose-700 px-3 py-1 rounded-full border border-rose-100">كويتي 100%</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                {KUWAIT_PULSE_PACKS.slice(0, 9).map(pack => (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => {
                      setSelectedPulseId(pack.id);
                      setSelectedOrderPlace(pack.defaultPlace);
                      setBackgroundPreset(pack.background);
                      setRealityMode(pack.mode);
                      setSelectedTheme('نبض الكويت');
                    }}
                    className={cn(
                      "p-3 rounded-2xl border text-right transition-all min-h-[92px]",
                      selectedPulseId === pack.id ? "bg-rose-50 border-rose-400 shadow-sm ring-4 ring-rose-500/10" : "bg-white border-slate-100 hover:border-rose-200 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl">{pack.icon}</span>
                      <span className="text-[9px] font-black text-rose-600 bg-white/80 border border-rose-100 rounded-full px-2 py-0.5">{pack.badge}</span>
                    </div>
                    <div className="text-xs font-black text-slate-900">{pack.label}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-1 line-clamp-1">{pack.tone}</div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[11px] font-black text-slate-500 mb-2 block">وين رايح الطلب؟</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(KUWAIT_PLACES) as [KuwaitOrderPlace, typeof KUWAIT_PLACES[KuwaitOrderPlace]][]).map(([id, place]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => { setSelectedOrderPlace(id); setBackgroundPreset(place.background); }}
                        className={cn("px-3 py-2 rounded-xl border text-[11px] font-black transition-all flex items-center justify-between", selectedOrderPlace === id ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white")}
                      >
                        <span>{place.label}</span><span>{place.icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 mb-2 block">شنو تبي تطلع؟</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(KUWAIT_CONTENT_GOALS) as [KuwaitContentGoal, typeof KUWAIT_CONTENT_GOALS[KuwaitContentGoal]][]).map(([id, goal]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedContentGoal(id)}
                        className={cn("px-3 py-2 rounded-xl border text-[11px] font-black transition-all flex items-center justify-between", selectedContentGoal === id ? "bg-indigo-600 text-white border-indigo-600" : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-white")}
                      >
                        <span>{goal.label}</span><span>{goal.icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 mb-4 text-right">
                <div className="text-[11px] font-black text-slate-500 mb-1">المسار المختار</div>
                <div className="text-sm font-black text-slate-900">{activePulsePack.icon} {activePulsePack.label} ← {KUWAIT_PLACES[selectedOrderPlace]?.label} ← {KUWAIT_CONTENT_GOALS[selectedContentGoal]?.label}</div>
                <p className="text-[11px] font-bold text-slate-400 mt-1">النظام لا يذكر مطعم جلوس، ولا يضيف دلة/بخور/سدو/فوانيس، ويحافظ على الطبق والواقعية.</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Edit3 size={14} /> اكتب فكرتك — اختياري
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="مثال: فوز المنتخب، العيد الوطني، زوارة أهل، عرض ديوانية، طلب شاليه..."
                    value={customThemeQuery}
                    onChange={(e) => {
                      setCustomThemeQuery(e.target.value);
                      setSelectedTheme(e.target.value ? 'مخصص' : 'نبض الكويت');
                    }}
                    className={cn("w-full p-3 rounded-xl border-2 text-sm text-right focus:outline-none transition-all pr-10", customThemeQuery ? "border-rose-500 bg-rose-50 focus:ring-4 focus:ring-rose-500/20" : "border-slate-200 bg-white focus:border-slate-400")}
                  />
                  <div className={cn("absolute right-3 top-1/2 -translate-y-1/2", customThemeQuery ? "text-rose-500" : "text-slate-400")}>
                    <Sparkles size={16} />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvancedStudio(v => !v)}
                className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                {showAdvancedStudio ? 'إخفاء الخيارات الاحترافية' : 'خيارات احترافية اختيارية'}
              </button>

              {showAdvancedStudio && (
                <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-[11px] font-black text-slate-500 mb-3">ثيمات إضافية — لا تحتاجها غالباً</p>
                  <div className="grid grid-cols-2 gap-2">
                    {themes.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setSelectedTheme(t.id); if (t.id !== 'نبض الكويت') setCustomThemeQuery(''); }}
                        className={cn("p-2 rounded-xl border text-right flex items-center gap-2 transition-all", selectedTheme === t.id ? "border-purple-500 bg-purple-50 text-purple-900" : "bg-white border-slate-100 text-slate-700")}
                      >
                        <span>{t.icon}</span>
                        <span className="text-[11px] font-black">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {showAdvancedStudio && (<>
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
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Camera size={16} className="text-emerald-500" />
                4. الوضع الاحترافي للواقعية
              </h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(Object.entries(STUDIO_REALITY_MODES) as [StudioRealityMode, typeof STUDIO_REALITY_MODES[StudioRealityMode]][]).map(([id, item]) => (
                  <button
                    key={id}
                    onClick={() => setRealityMode(id)}
                    className={cn(
                      "p-3 rounded-xl border text-right transition-all",
                      realityMode === id ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span className="block text-xs font-black">{item.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] font-bold text-slate-400 mb-2">مكتبة مشاهد كويتية واقعية</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(REAL_RESTAURANT_BACKGROUNDS) as [StudioBackgroundPresetId, typeof REAL_RESTAURANT_BACKGROUNDS[StudioBackgroundPresetId]][]).map(([id, item]) => (
                  <button
                    key={id}
                    onClick={() => setBackgroundPreset(id)}
                    className={cn(
                      "px-3 py-2 rounded-xl border text-[11px] font-bold text-right transition-all",
                      backgroundPreset === id ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-emerald-100">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="text-right">
                  <h3 className="font-black text-slate-800 flex items-center gap-2"><Brain size={16} className="text-emerald-500" /> ذاكرة الذوق الذكية</h3>
                  <p className="text-[11px] font-bold text-slate-400 mt-1">كل اختيار أو حفظ لصورة بعد ظهورها يعلّم الاستوديو نوع الخلفية والعدسة اللي تفضلها.</p>
                </div>
                <button type="button" onClick={() => rememberCurrentChoice('preferred-controls')} disabled={!generatedImage && !aiImage} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-50" title={!generatedImage && !aiImage ? 'يتفعل بعد ظهور صورة مولدة أو مختارة' : 'احفظ هذا الأسلوب في ذاكرة الذوق'}>
                  احفظ ذوقي الحالي
                </button>
              </div>
              {tasteMemoryPrompt ? (
                <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100 p-3 text-[11px] font-bold text-emerald-800 leading-6">
                  الذاكرة مفعلة: الاستوديو سيكرر الخلفيات والأوضاع التي تختارها أكثر.
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-[11px] font-bold text-slate-500 leading-6">
                  بعد أول اختيار/حفظ، يبدأ النظام يتعلم ذوقك بدون تغيير منطق الذكاء الأساسي.
                </div>
              )}
            </div>

            {backgroundLibrary.length > 0 && (
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2"><Library size={16} className="text-indigo-500" /> مكتبة الخلفيات المحفوظة</h3>
                <div className="grid grid-cols-3 gap-2">
                  {backgroundLibrary.slice(0, 6).map((item) => (
                    <button key={item.id} type="button" onClick={() => useLibraryBackground(item)} className="group rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm hover:shadow-md transition-all text-right">
                      <img src={item.url} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform" />
                      <div className="p-2 text-[10px] font-bold text-slate-500 truncate">{item.label || item.background || 'خلفية محفوظة'}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-800 text-white">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-right">
                  <h3 className="font-black text-white text-sm">Reality Final Boss</h3>
                  <p className="text-[11px] text-slate-300 mt-1">أقوى وضع: الخلفية بشرية، كويتية، عادية، مقنعة، وتخفي أي إحساس AI.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRealityBoost((v) => !v)}
                  className={cn("px-3 py-2 rounded-xl text-xs font-black border transition-all", realityBoost ? "bg-emerald-400 border-emerald-300 text-slate-950" : "bg-slate-800 border-slate-700 text-slate-300")}
                >
                  {realityBoost ? 'مفعل' : 'متوقف'}
                </button>
              </div>
              <div
                className={cn("w-full p-3 rounded-2xl border text-right", strictPlateLock ? "bg-white/10 border-emerald-400/40" : "bg-white/5 border-slate-700")}
              >
                <span className="block text-sm font-black">قفل الصحن والطبق 100%</span>
                <span className="block text-[11px] text-slate-300 mt-1">{strictPlateLock ? 'ممنوع تبديل الصحن أو المكونات — الخلفية فقط تتغير.' : 'القفل مخفف، غير مفضل للواقعية الدقيقة.'}</span>
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
                title="5. هوية العلامة (Logo)"
              />
            </div>

            </>)}

            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200">
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                <b className="block mb-1">💡 قاعدة حماية الهوية:</b>
                النظام مصمم ليغير فقط الإضاءة، المشهد الخلفي، واقتصاص الصورة بدون المساس أو تغيير شكل ومكونات الطبق الأصلي نهائياً.
              </p>
            </div>

            <button
              onClick={() => generateContent()}
              disabled={isGenerating || isGeneratingVariants}
              className="w-full p-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  جاري توليد المشهد الكويتي...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  ولّعها
                </>
              )}
            </button>

            <button
              type="button"
              onClick={generateFourRealityOptions}
              disabled={isGenerating || isGeneratingVariants || !selectedImage}
              className="w-full p-4 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl font-black flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              {isGeneratingVariants ? <Loader2 className="animate-spin" size={20} /> : <Layout size={20} />}
              ولّد 4 خيارات واقعية (اختياري)
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
                    <p className="text-xs text-indigo-500 mt-1">اضغط "ولّعها" لإضافة اللمسات الاحترافية.</p>
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
                      "اختيار مشهد كويتي واقعي...",
                      "مطابقة الظلال والعدسة البشرية...",
                      "منع أي مظهر CGI أو ديكور وهمي..."
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
                    
                    <div className={cn("w-full bg-slate-50 rounded-3xl border shadow-2xl p-2 relative flex items-stretch overflow-hidden group mx-auto", previewAspectClass)}>
                      <div className="relative flex-1 w-full h-full rounded-2xl overflow-hidden">
                        <img 
                          src={generatedImage || ""} 
                          alt="Generated" 
                          className="absolute inset-0 w-full h-full object-contain bg-slate-50"
                        />
                        {aiCaption && (
                          <div className="absolute left-4 right-4 bottom-4 z-10 rounded-2xl bg-black/55 backdrop-blur-md text-white p-3 shadow-2xl border border-white/20">
                            <p className="text-sm md:text-base font-extrabold leading-7 text-center whitespace-pre-wrap">{aiCaption}</p>
                          </div>
                        )}
                      </div>

                      <AnimatePresence>
                        {showInstagramPreview && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-50 pointer-events-none z-20 flex flex-col"
                          >
                            <div className="p-3 border-b flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200" />
                              <span className="text-xs font-bold text-slate-900">preview_mode</span>
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <img src={generatedImage || ""} alt="Preview" className="w-full h-full object-contain bg-slate-50" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {history.length > 0 && (
                      <div className="mt-8 pt-4 border-t border-slate-100">
                        
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {history.map((item, idx) => (
                            <button 
                              key={idx}
                              onClick={() => { setGeneratedImage(item.url); setAiCaption(item.caption); setAiImage(item.url); recordStudioTasteChoice({ mode: item.mode, background: item.background, theme: item.theme || selectedTheme, format: item.format || selectedFormat, label: 'history-picked', source: 'history' }); refreshStudioLearning(); }}
                              className="w-12 h-12 rounded-lg border flex-shrink-0 overflow-hidden"
                            >
                              <img src={item.url} alt="hist" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {realityVariants.length > 0 && (
                      <div className="mt-6 w-full rounded-3xl border border-emerald-100 bg-emerald-50/50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black text-emerald-600">اختيارات واقعية اختيارية</span>
                          <p className="text-sm font-black text-slate-800">٤ لقطات بشرية</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {realityVariants.map((item, idx) => (
                            <button key={`${item.label}-${idx}`} onClick={() => { setGeneratedImage(item.url); setAiImage(item.url); recordStudioTasteChoice({ mode: item.mode, background: item.background, theme: selectedTheme, format: selectedFormat, label: item.label, source: 'variant-picked' }); refreshStudioLearning(); }} className="group bg-white rounded-2xl border border-emerald-100 overflow-hidden text-right shadow-sm hover:shadow-md transition-all">
                              <img src={item.url} alt={item.label} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform" />
                              <div className="p-2 text-[10px] font-black text-slate-600 truncate">{item.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {realityAudit && (
                      <div className="mt-6 rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm text-right">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <span className="text-3xl font-black text-emerald-600">{Math.round(Number(realityAudit.score || 0))}%</span>
                          <div>
                            <p className="text-sm font-black text-slate-800">تقييم الواقعية البشرية</p>
                            <p className="text-xs font-bold text-emerald-700">{realityAudit.verdict || 'الصورة واقعية وجاهزة للنشر'}</p>
                          </div>
                        </div>
                        {Array.isArray(realityAudit.notes) && realityAudit.notes.length > 0 && (
                          <div className="grid gap-2">
                            {realityAudit.notes.slice(0, 3).map((note, idx) => (
                              <div key={idx} className="text-xs font-bold text-slate-600 bg-slate-50 rounded-2xl p-3">{note}</div>
                            ))}
                          </div>
                        )}
                        {realityAudit.fixHint && <p className="mt-3 text-[11px] font-bold text-slate-400">تحسين مقترح: {realityAudit.fixHint}</p>}
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-2 justify-center">
                      <button onClick={handleDownload} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2">
                        <Download size={18} /> تحميل
                      </button>
                      <button type="button" onClick={auditReality} disabled={isAuditingReality || !generatedImage} className="px-6 py-3 bg-white border border-emerald-200 text-emerald-700 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isAuditingReality ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                        قيّم الواقعية
                      </button>
                      <button type="button" onClick={saveCurrentBackground} disabled={isSavingBackground || !generatedImage} className="px-6 py-3 bg-white border border-amber-200 text-amber-700 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSavingBackground ? <Loader2 className="animate-spin" size={18} /> : <Star size={18} />}
                        احفظ الخلفية للمكتبة
                      </button>
                      <button type="button" onClick={makeMoreHuman} disabled={isGenerating || !selectedImage} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Sparkles size={18} />
                        خلها أصدق بصرياً
                      </button>
                      <button type="button" onClick={generateCaption} disabled={isCapturing || !generatedImage} className="px-6 py-3 bg-white border border-indigo-200 text-indigo-600 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isCapturing ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                        توليد نص ذكي
                      </button>
                      {aiCaption && (
                        <button
                          type="button"
                          onClick={() => {
                            setAiCaption(previousAiCaption);
                            setPreviousAiCaption(null);
                            toast.info('تم التراجع عن آخر نص ذكي');
                          }}
                          className="px-5 py-3 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-100 transition-all"
                        >
                          تراجع
                        </button>
                      )}
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
